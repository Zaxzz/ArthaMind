// app/api/ai/route.js

import { askAI } from "@/utils/askAI";
import { getFinanceData } from "@/utils/getFinanceData";

function normalizeDebtType(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function normalizeDebtStatus(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function buildInsightPrompt({ context, financeSnapshot }) {
  const {
    saldo,
    income,
    expense,
    laba,
    hutangCount,
    asetCount,
    transaksiCount,
    hutangOutstanding,
    piutangOutstanding,
    asetBookValue,
  } = financeSnapshot;

  const contextMap = {
    dashboard:
      "Beri insight ringkas untuk halaman Dashboard (kondisi umum, risiko cepat, dan aksi paling penting hari ini).",
    cashbook:
      "Beri insight ringkas untuk halaman Buku Kas (kualitas arus kas, efisiensi beban, dan tindakan pencatatan yang perlu diprioritaskan).",
    report:
      "Beri insight ringkas untuk halaman Laporan SAK EMKM (kesehatan posisi keuangan, laba rugi, dan area yang perlu dijelaskan di catatan laporan).",
  };

  const contextInstruction =
    contextMap[context] ||
    "Beri insight ringkas kondisi keuangan UMKM berbasis data yang tersedia.";

  return `
Kamu adalah analis keuangan UMKM Indonesia bernama ArthaMind.

${contextInstruction}

Data usaha:
- Saldo: Rp${saldo}
- Pemasukan: Rp${income}
- Pengeluaran: Rp${expense}
- Laba Bersih: Rp${laba}
- Jumlah Transaksi: ${transaksiCount}
- Total Hutang Belum Lunas: Rp${hutangOutstanding}
- Total Piutang Belum Lunas: Rp${piutangOutstanding}
- Nilai Buku Aset: Rp${asetBookValue}
- Jumlah Item Hutang/Piutang: ${hutangCount}
- Jumlah Item Aset: ${asetCount}

Aturan jawaban:
1. Maksimal 3 poin.
2. Setiap poin 1 kalimat pendek, praktis, langsung bisa ditindak.
3. Jangan beri disclaimer panjang dan jangan keluar dari konteks data keuangan.
`;
}

export async function POST(req) {
  try {
    const { message, userId, mode, context } = await req.json();

    if (!userId) {
      return Response.json({
        success: false,
        reply: "User tidak valid.",
      });
    }

    const finance = await getFinanceData(userId);

    const hutangCount = finance?.hutang?.length || 0;
    const asetCount = finance?.aset?.length || 0;
    const saldo = finance?.saldo || 0;
    const income = finance?.income || 0;
    const expense = finance?.expense || 0;
    const laba = income - expense;
    const transaksiCount = finance?.transaksi?.length || 0;
    const hutangOutstanding = (finance?.hutang || []).reduce((acc, item) => {
      const status = normalizeDebtStatus(item?.status);
      const tipe = normalizeDebtType(item?.tipe);
      const jumlah = Number(item?.jumlah || 0);

      if (status !== "lunas" && tipe === "hutang") return acc + jumlah;
      return acc;
    }, 0);
    const piutangOutstanding = (finance?.hutang || []).reduce((acc, item) => {
      const status = normalizeDebtStatus(item?.status);
      const tipe = normalizeDebtType(item?.tipe);
      const jumlah = Number(item?.jumlah || 0);

      if (status !== "lunas" && tipe === "piutang") return acc + jumlah;
      return acc;
    }, 0);
    const asetBookValue = (finance?.aset || []).reduce((acc, item) => {
      const nilaiPerolehan = Number(item?.nilai_perolehan || 0);
      const akumulasiPenyusutan = Number(item?.akumulasi_penyusutan || 0);
      return acc + Math.max(0, nilaiPerolehan - akumulasiPenyusutan);
    }, 0);

    let prompt = "";

    if (mode === "page_insight") {
      prompt = buildInsightPrompt({
        context,
        financeSnapshot: {
          saldo,
          income,
          expense,
          laba,
          hutangCount,
          asetCount,
          transaksiCount,
          hutangOutstanding,
          piutangOutstanding,
          asetBookValue,
        },
      });
    }

    // ======================
    // MODE LAPORAN AI
    // ======================
    if (mode === "report") {
      prompt = `
Kamu adalah analis keuangan UMKM Indonesia bernama ArthaMind.

Data usaha:
Saldo: Rp${saldo}
Pemasukan: Rp${income}
Pengeluaran: Rp${expense}
Laba Bersih: Rp${laba}
Jumlah Hutang/Piutang: ${hutangCount}
Jumlah Aset: ${asetCount}

Tugas:
1. Analisa kondisi usaha saat ini
2. Berikan insight penting
3. Berikan saran singkat

Jawab maksimal 3 kalimat.
Profesional, jelas, mudah dipahami.
`;
    } else if (mode !== "page_insight") {
      // ======================
      // MODE CHAT AI
      // ======================
      prompt = `
Kamu adalah AI Advisor UMKM Indonesia bernama ArthaMind.

Fokus hanya membahas:
- Keuangan usaha
- Cashflow
- Profit / rugi
- Hutang piutang
- Aset usaha
- Penjualan
- Efisiensi bisnis
- Strategi UMKM

Jika user bertanya di luar konteks, jawab:

"Maaf, saya fokus membantu keuangan dan pengembangan usaha UMKM."

Data user:
Saldo: Rp${saldo}
Pemasukan: Rp${income}
Pengeluaran: Rp${expense}
Jumlah Hutang/Piutang: ${hutangCount}
Jumlah Aset: ${asetCount}

Pertanyaan user:
${message}

Jawab singkat, profesional, berguna.
`;
    }

    const reply = await askAI(prompt);

    return Response.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.log("API ERROR:", error);

    return Response.json({
      success: false,
      reply: "Server error",
    });
  }
}
