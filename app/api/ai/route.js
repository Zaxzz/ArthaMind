import { askAI } from "@/utils/askAI";
import { getFinanceData } from "@/utils/getFinanceData";

export async function POST(req) {
  try {
    const { message, userId } = await req.json();

    const finance = await getFinanceData(userId);

    const hutangCount = finance?.hutang?.length || 0;
    const asetCount = finance?.aset?.length || 0;
    const saldo = finance?.saldo || 0;
    const income = finance?.income || 0;
    const expense = finance?.expense || 0;

    const prompt = `
Kamu adalah AI Advisor UMKM Indonesia.

Data user:
Saldo: Rp${saldo}
Pemasukan: Rp${income}
Pengeluaran: Rp${expense}
Jumlah Hutang/Piutang: ${hutangCount}
Jumlah Aset: ${asetCount}

Jawab singkat, profesional, dan berguna.

Pertanyaan:
${message}
`;

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
