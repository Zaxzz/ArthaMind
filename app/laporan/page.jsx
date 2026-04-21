"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import Header from "../../component/Header";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [aiSummary, setAiSummary] = useState("Memuat analisis AI...");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("transaksi")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTransactions(data || []);

      // ambil AI Summary
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          mode: "report",
        }),
      });

      const result = await res.json();

      if (result.success) {
        setAiSummary(result.reply);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const report = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((item) => {
      const jumlah = Number(item.jumlah || 0);
      const jenis = String(item.jenis || "").toLowerCase();

      if (jenis === "pemasukan") income += jumlah;
      else expense += jumlah;
    });

    return {
      income,
      expense,
      laba: income - expense,
    };
  }, [transactions]);

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Laporan Keuangan ArthaMind", 14, 18);

    doc.setFontSize(11);
    doc.text(`Pemasukan : Rp${report.income.toLocaleString("id-ID")}`, 14, 32);
    doc.text(
      `Pengeluaran : Rp${report.expense.toLocaleString("id-ID")}`,
      14,
      40,
    );
    doc.text(`Laba Bersih : Rp${report.laba.toLocaleString("id-ID")}`, 14, 48);

    autoTable(doc, {
      startY: 58,
      head: [["Tanggal", "Jenis", "Kategori", "Jumlah"]],
      body: transactions.map((item) => [
        item.created_at?.slice(0, 10),
        item.jenis,
        item.kategori,
        `Rp${Number(item.jumlah).toLocaleString("id-ID")}`,
      ]),
    });

    doc.save("laporan-artha-mind.pdf");
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan");

    sheet.columns = [
      { header: "Tanggal", key: "tanggal", width: 18 },
      { header: "Jenis", key: "jenis", width: 18 },
      { header: "Kategori", key: "kategori", width: 25 },
      { header: "Jumlah", key: "jumlah", width: 18 },
    ];

    transactions.forEach((item) => {
      sheet.addRow({
        tanggal: item.created_at?.slice(0, 10),
        jenis: item.jenis,
        kategori: item.kategori,
        jumlah: Number(item.jumlah),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "laporan-artha-mind.xlsx");
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <Header />
      <section className="pt-28 px-6 lg:px-20 pb-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="space-y-6"
          >
            <motion.p variants={fadeUp} className="text-zinc-500">
              Export & Ringkasan Keuangan
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="text-zinc-600 text-lg max-w-xl"
            >
              Download laporan PDF & Excel otomatis berdasarkan transaksi usaha.
            </motion.p>

            <motion.div variants={fadeUp} className="flex gap-3">
              <button
                onClick={exportPDF}
                className="px-6 py-4 rounded-2xl bg-zinc-900 text-white inline-flex items-center gap-2"
              >
                <FileText size={18} />
                Export PDF
              </button>

              <button
                onClick={exportExcel}
                className="px-6 py-4 rounded-2xl border border-zinc-300 inline-flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Export Excel
              </button>
            </motion.div>
          </motion.div>

          <div className="rounded-[32px] border border-zinc-200 bg-white shadow-2xl p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900 text-white">
                <p className="text-sm opacity-70">Pemasukan</p>
                <h2 className="text-2xl font-semibold">
                  Rp{report.income.toLocaleString("id-ID")}
                </h2>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-100">
                <p className="text-sm text-zinc-500">Pengeluaran</p>
                <h2 className="text-2xl font-semibold">
                  Rp{report.expense.toLocaleString("id-ID")}
                </h2>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp size={18} />
                Laba Bersih
              </div>

              <h2 className="text-3xl font-semibold text-emerald-800 mt-2">
                Rp{report.laba.toLocaleString("id-ID")}
              </h2>
            </div>
          </div>
        </div>

        {/* AI BOX */}
        <div className="max-w-7xl mx-auto mt-8">
          <div className="rounded-[32px] bg-zinc-900 text-white p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles size={20} />
              <h2 className="text-xl font-semibold">Analisis AI ArthaMind</h2>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              {loading ? "Memuat..." : aiSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto rounded-[32px] border border-zinc-200 bg-white shadow-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Riwayat Transaksi</h2>
          </div>

          {loading ? (
            <div className="p-8 text-zinc-500">Memuat transaksi...</div>
          ) : (
            <div className="divide-y">
              {transactions.map((item, i) => (
                <div key={i} className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.kategori}</p>
                    <p className="text-sm text-zinc-500">
                      {item.created_at?.slice(0, 10)}
                    </p>
                  </div>

                  <p
                    className={`font-semibold ${
                      item.jenis === "pemasukan"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    Rp{Number(item.jumlah).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
