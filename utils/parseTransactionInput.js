import Groq from "groq-sdk";
import {
  TRANSACTION_CATEGORIES,
  normalizeCategory,
} from "@/utils/transactionCategories";

const JENIS_KEYWORDS = {
  pemasukan: [
    "pemasukan",
    "pendapatan",
    "income",
    "omzet",
    "penjualan",
    "masuk",
    "dibayar pelanggan",
    "transfer masuk",
    "uang masuk",
  ],
  pengeluaran: [
    "pengeluaran",
    "biaya",
    "beban",
    "beli",
    "bayar",
    "transfer keluar",
    "uang keluar",
    "hutang",
    "gaji",
    "sewa",
    "pajak",
  ],
};

function parseNominal(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const normalized = String(value).replace(/[^\d,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeJenis(jenis) {
  const value = String(jenis || "")
    .toLowerCase()
    .trim();

  if (
    value.includes("masuk") ||
    value.includes("income") ||
    value.includes("pendapatan")
  ) {
    return "pemasukan";
  }

  return "pengeluaran";
}

function normalizeTanggal(tanggalRaw) {
  if (!tanggalRaw) return undefined;

  const date = new Date(tanggalRaw);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10);
}

function parseConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function detectJenisFromKeyword(rawText) {
  const text = String(rawText || "").toLowerCase();

  const pemasukanMatched = JENIS_KEYWORDS.pemasukan.some((keyword) =>
    text.includes(keyword),
  );
  const pengeluaranMatched = JENIS_KEYWORDS.pengeluaran.some((keyword) =>
    text.includes(keyword),
  );

  if (pemasukanMatched && !pengeluaranMatched) return "pemasukan";
  if (pengeluaranMatched && !pemasukanMatched) return "pengeluaran";
  return null;
}

function normalizeJenisOverride(jenisOverride) {
  if (!jenisOverride) return null;
  const normalized = normalizeJenis(jenisOverride);
  return normalized === "pemasukan" ? "pemasukan" : "pengeluaran";
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyDifferentName(first, second) {
  const nameA = normalizeName(first);
  const nameB = normalizeName(second);

  if (!nameA || !nameB) return false;
  if (nameA === nameB) return false;

  return !nameA.includes(nameB) && !nameB.includes(nameA);
}

export async function parseTransactionInput(rawText, source = "ocr", options = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY belum diatur di environment.");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
Kamu adalah parser transaksi UMKM Indonesia.
Ubah input mentah menjadi JSON valid.

Ketentuan:
1. Wajib keluarkan JSON object dengan kunci:
   - jenis: "pemasukan" atau "pengeluaran"
     - kategori: wajib salah satu kategori yang valid sesuai jenis
     - jumlah: angka (tanpa format Rp)
     - deskripsi: string singkat
     - tanggal: format YYYY-MM-DD atau null jika tidak ada
     - tingkat_keyakinan_jenis: angka 0 sampai 1
     - nama_toko: isi nama toko/merchant jika terdeteksi, null jika tidak ada
 2. Jika tidak yakin kategorinya, pilih kategori paling masuk akal sesuai jenis.
 3. Jika nominal tidak ditemukan, set jumlah: 0.
 4. Jangan keluarkan teks lain selain JSON.

Kategori valid:
- Untuk "pemasukan": ${TRANSACTION_CATEGORIES.pemasukan.map((item) => item.value).join(", ")}
- Untuk "pengeluaran": ${TRANSACTION_CATEGORIES.pengeluaran.map((item) => item.value).join(", ")}

Metode input: ${source}
Input mentah:
${rawText}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Grok tidak mengembalikan hasil parsing.");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Respons Grok bukan JSON valid.");
  }

  const jumlah = parseNominal(parsed.jumlah);

  if (!Number.isFinite(jumlah) || jumlah < 0) {
    throw new Error("Nominal hasil parsing tidak valid.");
  }

  const overrideJenis = normalizeJenisOverride(options.jenisOverride);
  const aiJenis = normalizeJenis(parsed.jenis);
  const keywordJenis = detectJenisFromKeyword(rawText);
  const confidenceJenis = parseConfidence(parsed.tingkat_keyakinan_jenis);
  const merchantName = String(parsed.nama_toko || "").trim();
  const profileBusinessName = String(options.businessName || "").trim();
  const forceExpenseByReceipt =
    source === "ocr" &&
    isLikelyDifferentName(profileBusinessName, merchantName) &&
    aiJenis !== "pengeluaran";

  const isJenisUncertain =
    !overrideJenis &&
    !forceExpenseByReceipt &&
    ((keywordJenis && keywordJenis !== aiJenis && confidenceJenis < 0.8) ||
      (!keywordJenis && confidenceJenis < 0.6));

  const finalJenis =
    overrideJenis || (forceExpenseByReceipt ? "pengeluaran" : aiJenis);

  return {
    jenis: finalJenis,
    kategori: normalizeCategory(finalJenis, parsed.kategori),
    jumlah,
    deskripsi: String(parsed.deskripsi || "Tanpa deskripsi"),
    tanggal: normalizeTanggal(parsed.tanggal),
    requiresJenisConfirmation: Boolean(isJenisUncertain),
    confidenceJenis,
    suggestedJenis: aiJenis,
    detectedJenisByKeyword: keywordJenis,
    merchantName,
    forcedByReceiptHeuristic: forceExpenseByReceipt,
  };
}
