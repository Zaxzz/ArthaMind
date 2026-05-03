"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Loader2,
  Mic,
  PlusCircle,
  ScanLine,
  Square,
  Trash2,
} from "lucide-react";
import Tesseract from "tesseract.js";
import { supabase } from "@/utils/supabase";
import { formatRupiah } from "@/utils/transactionUtils";
import Header from "../../component/Header";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

const REMINDER_THRESHOLD_DAYS = 1;
const METHODS = [
  { key: "manual", label: "Manual" },
  { key: "ocr", label: "Dokumen" },
  { key: "voice", label: "Suara" },
];
const MIN_VOICE_DURATION_MS = 6000;
const MIN_VOICE_WORDS = 4;

function toDateKey(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match?.[1]) return match[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStorageKey(userId) {
  return `arthamind:hutang-piutang:${userId}`;
}

function getReminderKey(userId) {
  return `arthamind:hutang-piutang:reminder:${userId}`;
}

function getDaysUntilDue(dateKey) {
  if (!dateKey) return null;

  const due = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

function sortByDueDate(items = []) {
  return [...items].sort((first, second) => {
    const firstDue = first?.jatuhTempo || "9999-12-31";
    const secondDue = second?.jatuhTempo || "9999-12-31";

    if (firstDue === secondDue) {
      const firstCreated = first?.createdAt
        ? new Date(first.createdAt).getTime()
        : 0;
      const secondCreated = second?.createdAt
        ? new Date(second.createdAt).getTime()
        : 0;
      return secondCreated - firstCreated;
    }

    return firstDue.localeCompare(secondDue);
  });
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `hp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toUserFriendlyError(message, fallbackMessage) {
  const text = String(message || "").toLowerCase();

  if (
    text.includes("network") ||
    text.includes("failed to fetch") ||
    text.includes("internet")
  ) {
    return "Koneksi internet terputus. Coba lagi setelah koneksi stabil.";
  }

  if (text.includes("login") || text.includes("akses ditolak")) {
    return "Sesi login kamu sudah habis. Silakan login ulang dulu.";
  }

  return fallbackMessage;
}

export default function HutangPiutangPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [ownerName, setOwnerName] = useState("Pemilik Usaha");
  const [userId, setUserId] = useState("");
  const [records, setRecords] = useState([]);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [method, setMethod] = useState("manual");
  const [inputLoading, setInputLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      (Boolean(window.SpeechRecognition) ||
        Boolean(window.webkitSpeechRecognition)),
  );
  const recognitionRef = useRef(null);
  const voiceFinalTextRef = useRef("");
  const voiceStartedAtRef = useRef(0);
  const stopRequestedRef = useRef(false);

  const [form, setForm] = useState({
    jenis: "hutang",
    pihak: "",
    nominal: "",
    jatuhTempo: toDateKey(new Date()) || "",
    catatan: "",
  });

  const [filters, setFilters] = useState({
    jenis: "all",
    status: "all",
    keyword: "",
    tempo: "all",
  });

  useEffect(() => {
    let mounted = true;

    async function bootstrapPage() {
      setLoading(true);
      setStatus("");

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!mounted) return;

        setOwnerName(
          user.user_metadata?.nama_pemilik ||
            user.email?.split("@")?.[0] ||
            "Pemilik Usaha",
        );
        setUserId(user.id);

        const cachedRaw = window.localStorage.getItem(getStorageKey(user.id));
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);

          if (!Array.isArray(parsed)) {
            throw new Error("Data hutang & piutang tidak valid.");
          }

          setRecords(sortByDueDate(parsed));
        } else {
          setRecords([]);
        }

        if ("Notification" in window) {
          setNotificationPermission(Notification.permission);
        }
      } catch (bootstrapError) {
        if (mounted) {
          setStatus(
            bootstrapError.message || "Gagal memuat data hutang & piutang.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrapPage();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    try {
      window.localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify(records),
      );
    } catch (storageError) {
      console.error(
        storageError?.message || "Gagal menyimpan data lokal hutang/piutang.",
      );
    }
  }, [records, userId]);

  const pushDueNotifications = useCallback(
    (entries) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (!userId || Notification.permission !== "granted") return;

      const reminderRaw = window.localStorage.getItem(getReminderKey(userId));
      const reminderMap = reminderRaw ? JSON.parse(reminderRaw) : {};

      if (typeof reminderMap !== "object" || reminderMap === null) {
        throw new Error("Data pengingat notifikasi tidak valid.");
      }

      const todayKey = toDateKey(new Date()) || "";
      let changed = false;

      for (const item of entries) {
        if (item.status === "lunas") continue;

        const daysUntilDue = getDaysUntilDue(item.jatuhTempo);
        if (daysUntilDue === null || daysUntilDue > REMINDER_THRESHOLD_DAYS) {
          continue;
        }

        if (reminderMap[item.id] === todayKey) {
          continue;
        }

        const tempoText =
          daysUntilDue < 0
            ? `terlambat ${Math.abs(daysUntilDue)} hari`
            : daysUntilDue === 0
              ? "jatuh tempo hari ini"
              : `jatuh tempo ${daysUntilDue} hari lagi`;

        new Notification(
          item.jenis === "hutang" ? "Pengingat Hutang" : "Pengingat Piutang",
          {
            body: `${item.pihak} • ${formatRupiah(item.nominal)} • ${tempoText}`,
            tag: `hutang-piutang-${item.id}`,
          },
        );

        reminderMap[item.id] = todayKey;
        changed = true;
      }

      if (changed) {
        window.localStorage.setItem(
          getReminderKey(userId),
          JSON.stringify(reminderMap),
        );
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId || notificationPermission !== "granted") return;

    try {
      pushDueNotifications(records);
    } catch (reminderError) {
      console.error(
        reminderError?.message || "Gagal menjalankan reminder browser.",
      );
    }

    const interval = window.setInterval(() => {
      try {
        pushDueNotifications(records);
      } catch (reminderError) {
        console.error(
          reminderError?.message || "Gagal menjalankan reminder browser.",
        );
      }
    }, 45000);

    return () => {
      window.clearInterval(interval);
    };
  }, [records, notificationPermission, pushDueNotifications, userId]);

  const summary = useMemo(() => {
    let totalHutang = 0;
    let totalPiutang = 0;
    let dueSoon = 0;
    let overdue = 0;

    for (const record of records) {
      if (record.status === "lunas") continue;

      const nominal = Number(record.nominal || 0);
      const daysUntil = getDaysUntilDue(record.jatuhTempo);

      if (record.jenis === "hutang") totalHutang += nominal;
      else totalPiutang += nominal;

      if (daysUntil !== null && daysUntil <= 3) dueSoon += 1;
      if (daysUntil !== null && daysUntil < 0) overdue += 1;
    }

    return {
      totalHutang,
      totalPiutang,
      dueSoon,
      overdue,
      totalData: records.length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const keyword = filters.keyword.toLowerCase().trim();

    return sortByDueDate(records).filter((record) => {
      if (filters.jenis !== "all" && record.jenis !== filters.jenis)
        return false;
      if (filters.status !== "all" && record.status !== filters.status)
        return false;

      const daysUntil = getDaysUntilDue(record.jatuhTempo);
      if (filters.tempo === "today" && daysUntil !== 0) return false;
      if (filters.tempo === "soon" && (daysUntil === null || daysUntil > 3)) {
        return false;
      }
      if (
        filters.tempo === "overdue" &&
        (daysUntil === null || daysUntil >= 0)
      ) {
        return false;
      }

      if (!keyword) return true;
      const searchableText =
        `${record.pihak} ${record.catatan || ""}`.toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [filters, records]);

  async function handleEnableNotification() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("Browser ini belum mendukung notifikasi.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      try {
        pushDueNotifications(records);
        setStatus(
          "Notifikasi browser aktif. Reminder jatuh tempo siap digunakan.",
        );
      } catch (reminderError) {
        setStatus(
          reminderError.message ||
            "Notifikasi aktif, tetapi reminder gagal dijalankan.",
        );
      }
      return;
    }

    setStatus("Izin notifikasi belum diberikan.");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (method !== "manual") return;

    const nominal = Number(form.nominal);

    if (!form.pihak.trim()) {
      setStatus("Nama pihak wajib diisi.");
      return;
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      setStatus("Nominal harus lebih dari 0.");
      return;
    }

    if (!form.jatuhTempo) {
      setStatus("Tanggal jatuh tempo wajib diisi.");
      return;
    }

    const newRecord = {
      id: createId(),
      jenis: form.jenis,
      pihak: form.pihak.trim(),
      nominal,
      jatuhTempo: form.jatuhTempo,
      catatan: form.catatan.trim(),
      status: "belum_lunas",
      createdAt: new Date().toISOString(),
    };

    setRecords((previous) => sortByDueDate([newRecord, ...previous]));
    setForm((previous) => ({
      ...previous,
      pihak: "",
      nominal: "",
      catatan: "",
    }));
    setStatus("Data hutang/piutang berhasil ditambahkan.");
  }

  async function processWithAi(rawText, source) {
    if (!rawText.trim()) {
      setStatus("Input masih kosong.");
      return;
    }

    setInputLoading(true);
    setStatus(`Memproses input ${source}...`);

    try {
      const response = await fetch("/api/hutang-piutang/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          source,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses input.");
      }

      const parsed = result.parsed || {};
      const nominal = Number(parsed.nominal);

      if (!Number.isFinite(nominal) || nominal <= 0) {
        throw new Error(
          "Nominal dari hasil parsing belum valid. Coba lengkapi teks input.",
        );
      }

      const newRecord = {
        id: createId(),
        jenis: parsed.jenis === "piutang" ? "piutang" : "hutang",
        pihak: String(parsed.pihak || "Pihak belum terdeteksi").trim(),
        nominal,
        jatuhTempo: toDateKey(parsed.jatuhTempo) || toDateKey(new Date()) || "",
        catatan: String(parsed.catatan || "").trim(),
        status: "belum_lunas",
        metodeInput: source,
        createdAt: new Date().toISOString(),
      };

      setRecords((previous) => sortByDueDate([newRecord, ...previous]));
      setStatus("Data hutang/piutang berhasil diproses dan ditambahkan.");
    } catch (error) {
      setStatus(
        toUserFriendlyError(
          error?.message,
          "Input belum bisa diproses. Coba lagi sebentar lagi.",
        ),
      );
    } finally {
      setInputLoading(false);
    }
  }

  async function runOcr() {
    if (!ocrFile) {
      setStatus("Pilih file dokumen/foto terlebih dahulu.");
      return;
    }

    setOcrLoading(true);
    setStatus(
      "Membaca teks dari dokumen (contoh: akta pengakuan hutang / surat perjanjian)...",
    );

    try {
      const result = await Tesseract.recognize(ocrFile, "ind+eng");
      const extractedText = String(result.data.text || "").trim();
      setOcrText(extractedText);

      if (!extractedText) {
        setStatus("OCR selesai, tapi teks belum terbaca.");
        return;
      }

      await processWithAi(extractedText, "ocr");
    } catch (error) {
      setStatus(
        toUserFriendlyError(
          error?.message,
          "Dokumen belum bisa diproses. Coba foto/scan yang lebih jelas.",
        ),
      );
    } finally {
      setOcrLoading(false);
    }
  }

  function startListening() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Web Speech API tidak didukung browser ini.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;
    voiceFinalTextRef.current = "";
    voiceStartedAtRef.current = Date.now();
    stopRequestedRef.current = false;

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        finalTranscript += event.results[i][0].transcript;
      }

      const cleanedTranscript = finalTranscript.trim();
      voiceFinalTextRef.current = cleanedTranscript;
      setVoiceText(cleanedTranscript);
    };

    recognition.onerror = (event) => {
      const isNoSpeech = event.error === "no-speech";
      setStatus(
        isNoSpeech
          ? "Suara belum terdengar. Coba bicara lebih jelas atau lebih dekat ke mikrofon."
          : "Rekaman suara gagal diproses. Coba rekam ulang.",
      );
      setListening(false);
    };

    recognition.onend = async () => {
      setListening(false);
      const finalText = voiceFinalTextRef.current.trim();
      const duration = Date.now() - voiceStartedAtRef.current;
      const totalWords = finalText.split(/\s+/).filter(Boolean).length;

      if (!finalText) {
        setStatus("Belum ada suara yang terbaca. Coba rekam ulang.");
        return;
      }

      if (
        !stopRequestedRef.current &&
        (duration < MIN_VOICE_DURATION_MS || totalWords < MIN_VOICE_WORDS)
      ) {
        setStatus(
          "Rekaman terlalu singkat. Lanjutkan bicara lebih lengkap, lalu tekan Stop saat selesai.",
        );
        return;
      }

      await processWithAi(finalText, "voice");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus(
      "Sedang merekam... Ceritakan pihak, nominal, jatuh tempo, dan jenis hutang/piutang.",
    );
  }

  function stopListening() {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  }

  function toggleLunas(recordId) {
    let nextStatus = "belum_lunas";

    setRecords((previous) =>
      sortByDueDate(
        previous.map((record) => {
          if (record.id !== recordId) return record;

          nextStatus = record.status === "lunas" ? "belum_lunas" : "lunas";
          return {
            ...record,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          };
        }),
      ),
    );

    setStatus(
      nextStatus === "lunas"
        ? "Item berhasil ditandai lunas."
        : "Status item dikembalikan ke belum lunas.",
    );
  }

  function removeRecord(recordId) {
    setRecords((previous) =>
      previous.filter((record) => record.id !== recordId),
    );
    setStatus("Item hutang/piutang berhasil dihapus.");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <Header />

      <section className="pt-28 px-6 lg:px-20 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            <motion.div
              variants={fadeUp}
              className="lg:col-span-2 rounded-[32px] bg-zinc-900 text-white p-7 shadow-2xl"
            >
              <p className="text-zinc-300 text-sm">Hutang & Piutang</p>
              <h2 className="text-3xl md:text-4xl font-semibold mt-2 leading-tight">
                Halo, {ownerName}
              </h2>
               <p className="text-zinc-300 mt-3 max-w-2xl">
                 Tambah catatan lewat input manual, OCR dokumen, atau suara;
                 tandai lunas; dan aktifkan pengingat jatuh tempo via
                 notifikasi browser.
               </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleEnableNotification}
                  className="px-5 py-3 rounded-2xl bg-white text-zinc-900 font-medium hover:scale-[1.02] transition inline-flex items-center gap-2"
                >
                  <Bell size={18} />
                  {notificationPermission === "granted"
                    ? "Notifikasi Aktif"
                    : "Aktifkan Notifikasi"}
                </button>
                <div className="px-5 py-3 rounded-2xl bg-white/15 border border-white/20 text-sm inline-flex items-center gap-2">
                  <CalendarClock size={17} />
                  Reminder {REMINDER_THRESHOLD_DAYS} hari sebelum jatuh tempo
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 space-y-4"
            >
              <h3 className="font-semibold text-lg">Ringkasan Cepat</h3>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-sm text-rose-700">
                  Total Hutang Belum Lunas
                </p>
                <p className="text-xl font-semibold text-rose-800">
                  {formatRupiah(summary.totalHutang)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm text-emerald-700">
                  Total Piutang Belum Lunas
                </p>
                <p className="text-xl font-semibold text-emerald-800">
                  {formatRupiah(summary.totalPiutang)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-100">
                  <p className="text-xs text-zinc-500">Jatuh Tempo ≤ 3 Hari</p>
                  <p className="text-lg font-semibold">{summary.dueSoon}</p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-100">
                  <p className="text-xs text-zinc-500">Terlambat</p>
                  <p className="text-lg font-semibold">{summary.overdue}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid xl:grid-cols-3 gap-6">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <HandCoins size={18} />
                <h3 className="font-semibold text-lg">Tambah Catatan</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethod(item.key)}
                    className={`px-3 py-2 rounded-xl border text-sm transition ${
                      method === item.key
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {method === "manual" && (
                <div className="space-y-4">
                  <select
                    value={form.jenis}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        jenis: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                  >
                    <option value="hutang">Hutang</option>
                    <option value="piutang">Piutang</option>
                  </select>

                  <input
                    type="text"
                    value={form.pihak}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        pihak: event.target.value,
                      }))
                    }
                    placeholder="Nama pihak (contoh: Supplier Berkah)"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                  />

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.nominal}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          nominal: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                    />
                  </div>

                  <input
                    type="date"
                    value={form.jatuhTempo}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        jatuhTempo: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                  />

                  <textarea
                    rows={4}
                    value={form.catatan}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        catatan: event.target.value,
                      }))
                    }
                    placeholder="Catatan (opsional)"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                  />

                  <button
                    type="submit"
                    disabled={inputLoading}
                    className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-[1.02] transition inline-flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    <PlusCircle size={18} />
                    Simpan Catatan
                  </button>
                </div>
              )}

              {method === "ocr" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600">
                    Upload foto/scan dokumen seperti akta pengakuan hutang atau
                    surat perjanjian hutang piutang.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setOcrFile(event.target.files?.[0] || null)
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200"
                  />

                  <button
                    type="button"
                    disabled={ocrLoading || inputLoading}
                    onClick={runOcr}
                    className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-[1.02] transition inline-flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {ocrLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ScanLine size={18} />
                    )}
                    Jalankan OCR & Simpan
                  </button>

                  <textarea
                    rows={6}
                    placeholder="Hasil OCR akan muncul di sini"
                    value={ocrText}
                    onChange={(event) => setOcrText(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                  />
                </div>
              )}

              {method === "voice" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600">
                    Ucapkan detail seperti jenis (hutang/piutang), pihak,
                    nominal, jatuh tempo, dan catatan.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={startListening}
                      disabled={listening || !speechSupported}
                      className="px-5 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-[1.02] transition inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <Mic size={18} />
                      Mulai Rekam
                    </button>
                    <button
                      type="button"
                      onClick={stopListening}
                      disabled={!listening}
                      className="px-5 py-3 rounded-2xl border border-zinc-300 hover:bg-zinc-100 transition inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <Square size={18} />
                      Stop
                    </button>
                  </div>

                  {!speechSupported && (
                    <p className="text-sm text-rose-600">
                      Browser ini belum mendukung Web Speech API.
                    </p>
                  )}

                  <textarea
                    rows={6}
                    placeholder='Contoh: "Saya punya piutang ke Toko Maju 2 juta jatuh tempo 20 Mei 2026 untuk pembayaran barang."'
                    value={voiceText}
                    onChange={(event) => setVoiceText(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                  />

                  <button
                    type="button"
                    disabled={inputLoading}
                    onClick={() => processWithAi(voiceText, "voice")}
                    className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-[1.02] transition inline-flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    Simpan dari Suara
                  </button>
                </div>
              )}
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="xl:col-span-2 rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    List Hutang & Piutang
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Total data: {summary.totalData} • Menampilkan{" "}
                    {filteredRecords.length} item
                  </p>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                <select
                  value={filters.jenis}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      jenis: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="hutang">Hutang</option>
                  <option value="piutang">Piutang</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="belum_lunas">Belum Lunas</option>
                  <option value="lunas">Lunas</option>
                </select>

                <select
                  value={filters.tempo}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      tempo: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                >
                  <option value="all">Semua Tempo</option>
                  <option value="today">Jatuh Tempo Hari Ini</option>
                  <option value="soon">Jatuh Tempo ≤ 3 Hari</option>
                  <option value="overdue">Terlambat</option>
                </select>

                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      keyword: event.target.value,
                    }))
                  }
                  placeholder="Cari pihak/catatan..."
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="text-zinc-500">Memuat data...</p>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-zinc-500">
                    Belum ada data yang sesuai filter. Tambahkan dari form di
                    samping.
                  </p>
                ) : (
                  filteredRecords.map((item) => {
                    const daysUntilDue = getDaysUntilDue(item.jatuhTempo);

                    const dueLabel =
                      daysUntilDue === null
                        ? "Tanggal tidak valid"
                        : daysUntilDue < 0
                          ? `Terlambat ${Math.abs(daysUntilDue)} hari`
                          : daysUntilDue === 0
                            ? "Jatuh tempo hari ini"
                            : `${daysUntilDue} hari lagi`;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.jenis === "hutang"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {item.jenis}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === "lunas"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {item.status === "lunas"
                                ? "Lunas"
                                : "Belum Lunas"}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                daysUntilDue !== null && daysUntilDue < 0
                                  ? "bg-rose-100 text-rose-700"
                                  : daysUntilDue !== null && daysUntilDue <= 1
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {dueLabel}
                            </span>
                          </div>

                          <p className="font-semibold text-lg">{item.pihak}</p>
                          <p className="text-sm text-zinc-500">
                            Jatuh tempo: {item.jatuhTempo || "-"}
                          </p>
                          {item.catatan ? (
                            <p className="text-sm text-zinc-600">
                              {item.catatan}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col sm:items-end gap-3">
                          <p className="text-xl font-semibold">
                            {formatRupiah(item.nominal)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleLunas(item.id)}
                              className={`px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2 transition ${
                                item.status === "lunas"
                                  ? "border border-zinc-300 hover:bg-zinc-100"
                                  : "bg-zinc-900 text-white hover:scale-[1.02]"
                              }`}
                            >
                              <CheckCircle2 size={15} />
                              {item.status === "lunas"
                                ? "Batal Lunas"
                                : "Tandai Lunas"}
                            </button>
                            <button
                              onClick={() => removeRecord(item.id)}
                              className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm inline-flex items-center gap-2 hover:bg-rose-50 transition"
                            >
                              <Trash2 size={15} />
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          {status ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 p-4 text-sm">
              {status}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
