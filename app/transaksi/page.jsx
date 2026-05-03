"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mic, ScanLine, Square } from "lucide-react";
import Tesseract from "tesseract.js";
import { supabase } from "@/utils/supabase";
import {
  TRANSACTION_CATEGORIES,
  getCategoriesByJenis,
  getDefaultCategory,
} from "@/utils/transactionCategories";
import Header from "../../component/Header";

const METHODS = [
  { key: "manual", label: "Manual" },
  { key: "ocr", label: "Foto Struk" },
  { key: "voice", label: "Suara" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

const MIN_VOICE_DURATION_MS = 6000;
const MIN_VOICE_WORDS = 4;

const COLUMN_ERROR_PATTERN =
  /column|schema cache|does not exist|Could not find the '.*' column/i;

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
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

  if (
    text.includes("check constraint") ||
    text.includes("invalid input") ||
    text.includes("null value")
  ) {
    return "Data transaksi belum valid. Cek jenis, kategori, nominal, dan tanggal lalu coba lagi.";
  }

  return fallbackMessage;
}

async function insertManualTransaction(payload) {
  const normalized = cleanPayload(payload);

  const candidates = [
    normalized,
    cleanPayload({
      user_id: payload.user_id,
      jenis: payload.jenis,
      kategori: payload.kategori,
      jumlah: payload.jumlah,
      tanggal: payload.tanggal,
      deskripsi: payload.deskripsi,
    }),
    cleanPayload({
      user_id: payload.user_id,
      jenis: payload.jenis,
      kategori: payload.kategori,
      jumlah: payload.jumlah,
    }),
  ];

  let lastError = null;

  for (const candidate of candidates) {
    const { error } = await supabase.from("transaksi").insert(candidate);

    if (!error) return;

    lastError = error;
    if (!COLUMN_ERROR_PATTERN.test(error.message || "")) {
      break;
    }
  }

  throw new Error(lastError?.message || "Gagal menyimpan transaksi manual.");
}

export default function TransactionInputPage() {
  const router = useRouter();
  const [method, setMethod] = useState("manual");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [manualForm, setManualForm] = useState({
    jenis: "pengeluaran",
    kategori: getDefaultCategory("pengeluaran"),
    jumlah: "",
    deskripsi: "",
    tanggal: new Date().toISOString().slice(0, 10),
  });

  const [ocrFile, setOcrFile] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  const [voiceText, setVoiceText] = useState("");
  const [listening, setListening] = useState(false);
  const [pendingJenisConfirmation, setPendingJenisConfirmation] =
    useState(null);
  const [selectedJenisConfirmation, setSelectedJenisConfirmation] =
    useState("pengeluaran");
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

  const manualCategoryOptions = useMemo(
    () => getCategoriesByJenis(manualForm.jenis),
    [manualForm.jenis],
  );

  const handleManualSave = async () => {
    const nominal = Number(manualForm.jumlah);
    console.log("saving manual transaction with data:", manualForm);

    if (!manualForm.kategori) {
      setStatus("Kategori wajib dipilih.");
      return;
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      setStatus("Nominal manual harus lebih dari 0.");
      return;
    }

    setLoading(true);
    setStatus("Menyimpan transaksi manual...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Current user:", user);

      if (!user) {
        throw new Error("User belum login.");
      }

      await insertManualTransaction({
        user_id: user.id,
        jenis: manualForm.jenis,
        kategori: manualForm.kategori,
        jumlah: nominal,
        deskripsi: manualForm.deskripsi,
        tanggal: manualForm.tanggal,
      });

      setStatus("Transaksi manual berhasil disimpan.");
      setManualForm((prev) => ({
        ...prev,
        jumlah: "",
        deskripsi: "",
      }));
    } catch (error) {
      console.log(error);
      setStatus(
        toUserFriendlyError(
          error?.message,
          "Transaksi manual belum bisa disimpan. Coba cek datanya lagi.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const processWithGrokAndSave = async (rawText, source, jenisOverride) => {
    if (!rawText.trim()) {
      setStatus("Input masih kosong.");
      return;
    }

    setLoading(true);
    if (jenisOverride) {
      setPendingJenisConfirmation(null);
    }
    setStatus(`Memproses ${source} via Grok dan menyimpan transaksi...`);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User belum login.");
      }

      const response = await fetch("/api/transaksi/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          userId: user.id,
          source,
          jenisOverride,
        }),
      });

      const result = await response.json();

      if (
        response.status === 422 &&
        result.code === "NEEDS_JENIS_CONFIRMATION"
      ) {
        const suggestedJenis = result?.draft?.suggestedJenis || "pengeluaran";
        setPendingJenisConfirmation({
          rawText,
          source,
          draft: result.draft || null,
        });
        setSelectedJenisConfirmation(suggestedJenis);
        setStatus(result.message || "Pilih jenis transaksi untuk melanjutkan.");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses transaksi.");
      }

      setPendingJenisConfirmation(null);
      setStatus(
        `Berhasil disimpan: ${result.parsed.jenis} (${result.parsed.kategori}) Rp${Number(
          result.parsed.jumlah,
        ).toLocaleString("id-ID")}.`,
      );
    } catch (error) {
      setStatus(
        toUserFriendlyError(
          error?.message,
          "Transaksi belum bisa diproses. Coba lagi sebentar lagi.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const runOcr = async () => {
    if (!ocrFile) {
      setStatus("Pilih foto struk terlebih dahulu.");
      return;
    }

    setOcrLoading(true);
    setStatus("Membaca teks dari foto struk...");

    try {
      const result = await Tesseract.recognize(ocrFile, "ind+eng");
      const extractedText = String(result.data.text || "").trim();
      setOcrText(extractedText);

      if (!extractedText) {
        setStatus("OCR selesai, tapi teks tidak terbaca.");
        return;
      }

      await processWithGrokAndSave(extractedText, "ocr");
    } catch (error) {
      setStatus(
        toUserFriendlyError(
          error?.message,
          "Foto struk belum bisa diproses. Coba foto yang lebih jelas.",
        ),
      );
    } finally {
      setOcrLoading(false);
    }
  };

  const startListening = () => {
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

      await processWithGrokAndSave(finalText, "voice");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus(
      "Sedang merekam... Ceritakan transaksi dengan lengkap lalu tekan Stop.",
    );
  };

  const stopListening = () => {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <Header />

      <section className="pt-28 px-6 lg:px-20 pb-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 p-6 shadow-xl bg-white"
            >
              <h2 className="font-semibold text-lg mb-4">Metode Input</h2>
              <div className="space-y-3">
                {METHODS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMethod(item.key)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition ${
                      method === item.key
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 p-6 bg-white shadow-xl"
            >
              <h3 className="font-semibold mb-3">Panduan Kategori</h3>
              <div className="space-y-3 text-sm">
                <details className="rounded-2xl border border-zinc-200 p-3">
                  <summary className="cursor-pointer font-medium">
                    Kategori Pemasukan
                  </summary>
                  <div className="mt-3 space-y-3 text-zinc-600">
                    {TRANSACTION_CATEGORIES.pemasukan.map((item) => (
                      <div key={item.value}>
                        <p className="font-medium text-zinc-800">
                          {item.value} - {item.label}
                        </p>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="rounded-2xl border border-zinc-200 p-3">
                  <summary className="cursor-pointer font-medium">
                    Kategori Pengeluaran
                  </summary>
                  <div className="mt-3 space-y-3 text-zinc-600">
                    {TRANSACTION_CATEGORIES.pengeluaran.map((item) => (
                      <div key={item.value}>
                        <p className="font-medium text-zinc-800">
                          {item.value} - {item.label}
                        </p>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 lg:sticky lg:top-28 lg:self-start rounded-[32px] border border-zinc-200 bg-white shadow-2xl p-6 md:p-8"
          >
            {method === "manual" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Input Manual</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <select
                    value={manualForm.jenis}
                    onChange={(e) => {
                      const nextJenis = e.target.value;
                      setManualForm((prev) => ({
                        ...prev,
                        jenis: nextJenis,
                        kategori: getDefaultCategory(nextJenis),
                      }));
                    }}
                    className="px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                  >
                    <option value="pengeluaran">Pengeluaran</option>
                    <option value="pemasukan">Pemasukan</option>
                  </select>

                  <select
                    value={manualForm.kategori}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        kategori: e.target.value,
                      }))
                    }
                    className="px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                  >
                    {manualCategoryOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={manualForm.jumlah}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        jumlah: e.target.value,
                      }))
                    }
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                  />
                </div>

                <input
                  type="date"
                  value={manualForm.tanggal}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      tanggal: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />

                <textarea
                  rows={4}
                  placeholder="Deskripsi transaksi"
                  value={manualForm.deskripsi}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      deskripsi: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                />

                <button
                  disabled={loading}
                  onClick={handleManualSave}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60"
                >
                  Simpan Manual
                </button>
              </div>
            )}

            {method === "ocr" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Foto Struk</h2>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200"
                />

                <button
                  disabled={ocrLoading || loading}
                  onClick={runOcr}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {ocrLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ScanLine size={18} />
                  )}
                  Jalankan OCR & Simpan Otomatis
                </button>

                <textarea
                  rows={8}
                  placeholder="Hasil OCR akan muncul di sini"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                />

                {pendingJenisConfirmation?.source === "ocr" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm text-amber-800">
                      Jenis transaksi belum yakin. Pilih jenis untuk langkah
                      terakhir sebelum disimpan.
                    </p>
                    <select
                      value={selectedJenisConfirmation}
                      onChange={(event) =>
                        setSelectedJenisConfirmation(event.target.value)
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                    >
                      <option value="pengeluaran">Pengeluaran</option>
                      <option value="pemasukan">Pemasukan</option>
                    </select>
                    <button
                      disabled={loading}
                      onClick={() =>
                        processWithGrokAndSave(
                          pendingJenisConfirmation.rawText,
                          "ocr",
                          selectedJenisConfirmation,
                        )
                      }
                      className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60"
                    >
                      Lanjutkan Simpan
                    </button>
                  </div>
                )}
              </div>
            )}

            {method === "voice" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Input Suara</h2>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={startListening}
                    disabled={listening || !speechSupported}
                    className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <Mic size={18} />
                    Mulai Rekam
                  </button>

                  <button
                    onClick={stopListening}
                    disabled={!listening}
                    className="px-6 py-3 rounded-2xl border border-zinc-300 hover:bg-zinc-100 transition disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <Square size={18} />
                    Stop
                  </button>
                </div>

                {!speechSupported && (
                  <p className="text-sm text-red-500">
                    Browser ini belum mendukung Web Speech API.
                  </p>
                )}

                <textarea
                  rows={8}
                  placeholder='Template: "Jenis transaksi ..., tanggal ..., nominal ..., kategori ..., deskripsi ...". Contoh: "Pengeluaran hari ini 120 ribu untuk bahan baku sayur di Pasar Kosambi."'
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                />

                <button
                  disabled={loading}
                  onClick={() => processWithGrokAndSave(voiceText, "voice")}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60"
                >
                  Simpan
                </button>

                {pendingJenisConfirmation?.source === "voice" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm text-amber-800">
                      Jenis transaksi belum yakin. Pilih jenis untuk langkah
                      terakhir sebelum disimpan.
                    </p>
                    <select
                      value={selectedJenisConfirmation}
                      onChange={(event) =>
                        setSelectedJenisConfirmation(event.target.value)
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
                    >
                      <option value="pengeluaran">Pengeluaran</option>
                      <option value="pemasukan">Pemasukan</option>
                    </select>
                    <button
                      disabled={loading}
                      onClick={() =>
                        processWithGrokAndSave(
                          pendingJenisConfirmation.rawText,
                          "voice",
                          selectedJenisConfirmation,
                        )
                      }
                      className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60"
                    >
                      Lanjutkan Simpan
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 p-4 rounded-2xl bg-zinc-100 text-zinc-700 text-sm flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5" />
              <p>{status || "Siap menerima input transaksi."}</p>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
