import Groq from "groq-sdk";
import {
  TRANSACTION_CATEGORIES,
  normalizeCategory,
} from "@/utils/transactionCategories";

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

export async function parseTransactionInput(rawText, source = "ocr") {
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
2. Jika tidak yakin jenisnya, set "pengeluaran".
3. Jika tidak yakin kategorinya, pilih kategori paling masuk akal sesuai jenis.
4. Jika nominal tidak ditemukan, set jumlah: 0.
5. Jangan keluarkan teks lain selain JSON.

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

  const jenis = normalizeJenis(parsed.jenis);

  return {
    jenis,
    kategori: normalizeCategory(jenis, parsed.kategori),
    jumlah,
    deskripsi: String(parsed.deskripsi || "Tanpa deskripsi"),
    tanggal: normalizeTanggal(parsed.tanggal),
  };
}
