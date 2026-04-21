"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  ScanLine,
  Square,
  Wallet,
} from "lucide-react";
import Tesseract from "tesseract.js";
import { supabase } from "@/utils/supabase";
import {
  TRANSACTION_CATEGORIES,
  getCategoriesByJenis,
  getDefaultCategory,
} from "@/utils/transactionCategories";

const METHODS = [
  { key: "manual", label: "Manual" },
  { key: "ocr", label: "Foto Struk" },
  { key: "voice", label: "Suara" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

const COLUMN_ERROR_PATTERN =
  /column|schema cache|does not exist|Could not find the '.*' column/i;

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
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
  const [speechSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      (Boolean(window.SpeechRecognition) ||
        Boolean(window.webkitSpeechRecognition)),
  );
  const recognitionRef = useRef(null);

  const manualCategoryOptions = useMemo(
    () => getCategoriesByJenis(manualForm.jenis),
    [manualForm.jenis],
  );

  const handleManualSave = async () => {
    const nominal = Number(manualForm.jumlah);

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
      setStatus(error.message || "Gagal menyimpan transaksi manual.");
    } finally {
      setLoading(false);
    }
  };

  const processWithGrokAndSave = async (rawText, source) => {
    if (!rawText.trim()) {
      setStatus("Input masih kosong.");
      return;
    }

    setLoading(true);
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
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses transaksi.");
      }

      setStatus(
        `Berhasil disimpan: ${result.parsed.jenis} (${result.parsed.kategori}) Rp${Number(
          result.parsed.jumlah,
        ).toLocaleString("id-ID")}.`,
      );
    } catch (error) {
      setStatus(error.message || "Terjadi error saat memproses transaksi.");
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
      setOcrText(result.data.text || "");
      setStatus("OCR selesai. Cek hasil teks lalu simpan.");
    } catch (error) {
      setStatus(error.message || "OCR gagal dijalankan.");
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
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        finalTranscript += event.results[i][0].transcript;
      }

      setVoiceText(finalTranscript.trim());
    };

    recognition.onerror = (event) => {
      setStatus(`Input suara gagal: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus("Sedang mendengarkan...");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition"
            >
              <ArrowLeft size={18} />
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">
              Artha<span className="text-zinc-400">Mind</span>
            </h1>
          </div>

          <div className="px-5 py-2.5 rounded-2xl bg-zinc-900 text-white flex items-center gap-2">
            <Wallet size={18} />
            Input Transaksi
          </div>
        </div>
      </header>

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
            className="lg:col-span-2 rounded-[32px]  border border-zinc-200 bg-white shadow-2xl p-6 md:p-8"
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

                <input
                  type="number"
                  min="0"
                  placeholder="Nominal (contoh: 50000)"
                  value={manualForm.jumlah}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      jumlah: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />

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
                  disabled={ocrLoading}
                  onClick={runOcr}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {ocrLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ScanLine size={18} />
                  )}
                  Jalankan OCR
                </button>

                <textarea
                  rows={8}
                  placeholder="Hasil OCR akan muncul di sini"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
                />

                <button
                  disabled={loading}
                  onClick={() => processWithGrokAndSave(ocrText, "ocr")}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition disabled:opacity-60"
                >
                 Simpan
                </button>
              </div>
            )}

            {method === "voice" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  Input Suara 
                </h2>

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
                  placeholder='Contoh: "Tadi beli bahan baku 250 ribu di pasar"'
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
