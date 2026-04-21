"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FileSpreadsheet, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Bot,
  CalendarDays,
  HandCoins,
  LogOut,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import {
  formatRupiah,
  getCategoryLabel,
  getTransactionAmount,
  getTransactionDateKey,
  normalizeJenis,
  sortTransactionsByDateDesc,
  toDateKey,
} from "@/utils/transactionUtils";
import Header from "../../component/Header";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

function getRecentWeekRange(today) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = toDateKey(date);

    return {
      key,
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState("Pemilik Usaha");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          router.replace("/login");
          return;
        }

        if (mounted) {
          setProfileName(
            user.user_metadata?.nama_pemilik ||
              user.email?.split("@")?.[0] ||
              "Pemilik Usaha",
          );
        }

        const { data, error: transactionError } = await supabase
          .from("transaksi")
          .select("*")
          .eq("user_id", user.id);

        if (transactionError) throw transactionError;
        if (!mounted) return;

        setTransactions(sortTransactionsByDateDesc(data || []));
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "Gagal memuat dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  const analytics = useMemo(() => {
    const today = new Date();
    const todayKey = toDateKey(today);
    const monthPrefix = todayKey?.slice(0, 7) || "";

    let todayIncome = 0;
    let todayExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    let runningBalance = 0;

    const perDay = {};

    for (const transaction of transactions) {
      const amount = getTransactionAmount(transaction);
      const jenis = normalizeJenis(transaction?.jenis);
      const dateKey = getTransactionDateKey(transaction);

      if (jenis === "pemasukan") {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      if (dateKey === todayKey) {
        if (jenis === "pemasukan") todayIncome += amount;
        else todayExpense += amount;
      }

      if (dateKey?.startsWith(monthPrefix)) {
        if (jenis === "pemasukan") monthIncome += amount;
        else monthExpense += amount;
      }

      if (!dateKey) continue;

      if (!perDay[dateKey]) {
        perDay[dateKey] = { income: 0, expense: 0 };
      }

      if (jenis === "pemasukan") {
        perDay[dateKey].income += amount;
      } else {
        perDay[dateKey].expense += amount;
      }
    }

    const weekly = getRecentWeekRange(today).map((day) => ({
      ...day,
      income: perDay[day.key]?.income || 0,
      expense: perDay[day.key]?.expense || 0,
    }));

    const maxBarValue = Math.max(
      1,
      ...weekly.map((item) => Math.max(item.income, item.expense)),
    );

    return {
      todaySaldo: todayIncome - todayExpense,
      monthIncome,
      monthExpense,
      runningBalance,
      weekly,
      maxBarValue,
      monthLabel: today.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [transactions]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 6),
    [transactions],
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <Header />

      <section className="pt-28 px-6 lg:px-20 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="grid xl:grid-cols-3 gap-6"
          >
            <motion.div
              variants={fadeUp}
              className="xl:col-span-2 rounded-[32px] p-8 bg-zinc-900 text-white shadow-2xl"
            >
              <p className="text-zinc-300 text-sm">Dashboard Utama</p>
              <h2 className="text-3xl md:text-4xl font-semibold mt-2 leading-tight">
                Halo, {profileName}
              </h2>
              <p className="text-zinc-300 mt-3 max-w-2xl">
                Pantau saldo hari ini, performa bulanan, dan ritme cashflow
                mingguan dalam satu tampilan.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/buku-kas"
                  className="px-5 py-3 rounded-2xl bg-white text-zinc-900 font-medium hover:scale-[1.02] transition inline-flex items-center gap-2"
                >
                  <BookOpenText size={18} />
                  Buka Buku Kas
                </Link>
                <Link
                  href="/ai"
                  className="px-5 py-3 rounded-2xl bg-white/15 text-white border border-white/20 hover:bg-white/20 transition inline-flex items-center gap-2"
                >
                  <Bot size={18} />
                  Tanya AI Advisor
                </Link>
                <Link
                  href="/laporan"
                  className="px-5 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition inline-flex items-center gap-2"
                >
                  <FileText size={18} />
                  Laporan SAK EMKM
                </Link>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6"
            >
              <p className="text-sm text-zinc-500">Periode Bulan Ini</p>
              <h3 className="font-semibold text-lg mt-1 capitalize">
                {analytics.monthLabel}
              </h3>

              <div className="mt-5 space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-sm text-emerald-700">Total Pemasukan</p>
                  <p className="text-xl font-semibold text-emerald-800">
                    {formatRupiah(analytics.monthIncome)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <p className="text-sm text-rose-700">Total Pengeluaran</p>
                  <p className="text-xl font-semibold text-rose-800">
                    {formatRupiah(analytics.monthExpense)}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {loading ? (
            <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-xl text-zinc-500">
              Memuat data dashboard...
            </div>
          ) : error ? (
            <div className="rounded-[32px] border border-red-200 bg-red-50 p-8 shadow-xl text-red-700">
              {error}
            </div>
          ) : (
            <div className="grid xl:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="xl:col-span-2 rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 md:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">
                      Grafik Cashflow 7 Hari
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Batang hijau = pemasukan, merah = pengeluaran
                    </p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-zinc-100 text-zinc-700 text-sm inline-flex items-center gap-2">
                    <CalendarDays size={16} />
                    Mingguan
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-7 gap-2 md:gap-3">
                  {analytics.weekly.map((item) => {
                    const incomeHeight = Math.max(
                      item.income > 0
                        ? (item.income / analytics.maxBarValue) * 100
                        : 0,
                      item.income > 0 ? 8 : 0,
                    );
                    const expenseHeight = Math.max(
                      item.expense > 0
                        ? (item.expense / analytics.maxBarValue) * 100
                        : 0,
                      item.expense > 0 ? 8 : 0,
                    );

                    return (
                      <div key={item.key} className="space-y-2">
                        <div className="h-40 md:h-48 rounded-2xl bg-zinc-100 p-2 flex items-end justify-center gap-1">
                          <div
                            className="w-2 md:w-3 rounded-xl bg-emerald-500 transition-all duration-500"
                            style={{ height: `${incomeHeight}%` }}
                            title={`Masuk: ${formatRupiah(item.income)}`}
                          />
                          <div
                            className="w-2 md:w-3 rounded-xl bg-rose-500 transition-all duration-500"
                            style={{ height: `${expenseHeight}%` }}
                            title={`Keluar: ${formatRupiah(item.expense)}`}
                          />
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-zinc-500">{item.label}</p>
                          <p className="text-[10px] text-zinc-400">
                            {item.key?.slice(8) || "--"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 space-y-4"
              >
                <div className="p-4 rounded-2xl bg-zinc-900 text-white">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Wallet size={16} />
                    Saldo Hari Ini
                  </div>
                  <p className="text-2xl font-semibold mt-2">
                    {formatRupiah(analytics.todaySaldo)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-100">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <HandCoins size={16} />
                    Saldo Berjalan
                  </div>
                  <p className="text-xl font-semibold mt-1">
                    {formatRupiah(analytics.runningBalance)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <BarChart3 size={16} />
                    Transaksi Tercatat
                  </div>
                  <p className="text-xl font-semibold mt-1">
                    {transactions.length} transaksi
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Transaksi Terbaru</h3>
                <Link
                  href="/buku-kas"
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  Lihat semua →
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {recentTransactions.length === 0 ? (
                  <p className="text-zinc-500">
                    Belum ada transaksi. Mulai input dari menu Transaksi.
                  </p>
                ) : (
                  recentTransactions.map((transaction, index) => {
                    const jenis = normalizeJenis(transaction.jenis);
                    const dateKey = getTransactionDateKey(transaction) || "-";
                    const amount = getTransactionAmount(transaction);

                    return (
                      <div
                        key={`${dateKey}-${transaction.id || transaction.created_at || index}`}
                        className="p-4 rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium">
                            {getCategoryLabel(transaction.kategori)}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {dateKey} •{" "}
                            {transaction.deskripsi || "Tanpa deskripsi"}
                          </p>
                        </div>

                        <p
                          className={`font-semibold ${
                            jenis === "pemasukan"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {jenis === "pemasukan" ? "+" : "-"}
                          {formatRupiah(amount).replace("Rp", "Rp ")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}
