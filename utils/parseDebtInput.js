import Groq from "groq-sdk";

function parseNominal(value) {
  if (typeof value === "number") return Math.abs(value);
  if (!value) return 0;

  const digitsOnly = String(value).replace(/[^\d]/g, "");
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeJenis(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (text.includes("piutang")) return "piutang";
  return "hutang";
}

function normalizeDate(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString().slice(0, 10);
}

export async function parseDebtInput(rawText, source = "ocr") {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY belum diatur di environment.");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
Kamu adalah parser data hutang/piutang UMKM Indonesia.
Ekstrak informasi dari input mentah (bisa dari OCR dokumen seperti akta pengakuan hutang/surat perjanjian hutang piutang, atau dari voice note).

Kembalikan JSON object valid dengan kunci:
- jenis: "hutang" atau "piutang"
- pihak: nama pihak lawan transaksi (kreditur/debitur, vendor, pelanggan, individu, dll)
- nominal: angka tanpa format mata uang
- jatuh_tempo: format YYYY-MM-DD, atau null jika tidak ditemukan
- catatan: ringkasan singkat 1 kalimat

Aturan:
1) Jangan keluarkan teks selain JSON.
2) Jika nominal tidak ada, isi 0.
3) Jika jenis tidak jelas, pilih yang paling masuk akal dari konteks.
4) Jika nama pihak tidak ada, isi string kosong.

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

  return {
    jenis: normalizeJenis(parsed.jenis),
    pihak: String(parsed.pihak || "").trim(),
    nominal: parseNominal(parsed.nominal),
    jatuhTempo: normalizeDate(parsed.jatuh_tempo),
    catatan: String(parsed.catatan || "").trim(),
  };
}
