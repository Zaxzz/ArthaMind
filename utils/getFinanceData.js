import { supabase } from "./supabase";

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

  transaksi?.forEach((item) => {
    if (item.jenis === "pemasukan") income += Number(item.jumlah);
    if (item.jenis === "pengeluaran") expense += Number(item.jumlah);
  });

  const saldo = income - expense;

  return {
    income,
    expense,
    saldo,
    transaksi,
    hutang,
    aset,
  };
}