import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function getFinanceData(userId) {
  const { data: transaksi } = await supabase
    .from("transaksi")
    .select("*")
    .eq("user_id", userId);

  const { data: hutang } = await supabase
    .from("hutang_piutang")
    .select("*")
    .eq("user_id", userId);

  const { data: aset } = await supabase
    .from("aset")
    .select("*")
    .eq("user_id", userId);

  let income = 0;
  let expense = 0;

  (transaksi || []).forEach((item) => {
    const jenis = String(item.jenis || "")
      .toLowerCase()
      .trim();

    const jumlah = Number(
      item.jumlah ?? item.nominal ?? item.amount ?? item.total ?? 0,
    );

    if (jenis === "pemasukan" || jenis === "masuk" || jenis === "income") {
      income += jumlah;
    }

    if (jenis === "pengeluaran" || jenis === "keluar" || jenis === "expense") {
      expense += jumlah;
    }
  });

  return {
    income,
    expense,
    saldo: income - expense,
    transaksi: transaksi || [],
    hutang: hutang || [],
    aset: aset || [],
  };
}
