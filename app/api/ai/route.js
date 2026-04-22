// app/api/ai/route.js

import { askAI } from "@/utils/askAI";
import { getFinanceData } from "@/utils/getFinanceData";

export async function POST(req) {
  try {
    const { message, userId, mode } = await req.json();

    const finance = await getFinanceData(userId);

    const hutangCount = finance?.hutang?.length || 0;
    const asetCount = finance?.aset?.length || 0;
    const saldo = finance?.saldo || 0;
    const income = finance?.income || 0;
    const expense = finance?.expense || 0;
    const laba = income - expense;

    let prompt = "";

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
    } else {
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
