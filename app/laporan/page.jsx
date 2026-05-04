"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import Header from "../../component/Header";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function toDateLabel(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Page() {
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAI, setLoadingAI] = useState(true);
  const [reportType, setReportType] = useState("posisi");

  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [aiSummary, setAiSummary] = useState("Memuat analisis AI...");

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingData(false);
          setLoadingAI(false);
          return;
        }

        const [transactionResult, debtResult, assetResult] = await Promise.all([
          supabase
            .from("transaksi")
            .select("*")
            .eq("user_id", user.id)
            .order("tanggal", { ascending: false }),
          supabase
            .from("hutang_piutang")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("aset")
            .select("*")
            .eq("user_id", user.id)
            .order("tanggal_perolehan", { ascending: false }),
        ]);

        setTransactions(transactionResult.data || []);
        setDebts(debtResult.data || []);
        setAssets(assetResult.data || []);
        setLoadingData(false);

        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            mode: "page_insight",
            context: "report",
          }),
        })
          .then((res) => res.json())
          .then((result) => {
            if (result.success) setAiSummary(result.reply);
            else setAiSummary("AI gagal memberi analisis.");
          })
          .catch(() => setAiSummary("Terjadi kesalahan AI."))
          .finally(() => setLoadingAI(false));
      } catch (error) {
        setLoadingData(false);
        setLoadingAI(false);
        setAiSummary(error?.message || "Gagal memuat analisis AI.");
      }
    }

    loadData();
  }, []);

  const report = useMemo(() => {
    let pendapatan = 0;
    let beban = 0;

    transactions.forEach((item) => {
      const jumlah = Number(item.jumlah || 0);
      const jenis = String(item.jenis || "").toLowerCase().trim();

      if (jenis === "pemasukan") pendapatan += jumlah;
      if (jenis === "pengeluaran") beban += jumlah;
    });

    const labaBersih = pendapatan - beban;
    const kasSetaraKas = Math.max(0, labaBersih);
    const overdraft = Math.max(0, -labaBersih);

    const totalPiutang = debts.reduce((total, item) => {
      const tipe = String(item.tipe || "").toLowerCase().trim();
      const status = String(item.status || "").toLowerCase().trim();
      if (tipe === "piutang" && status !== "lunas") {
        return total + Number(item.jumlah || 0);
      }
      return total;
    }, 0);

    const totalHutang = debts.reduce((total, item) => {
      const tipe = String(item.tipe || "").toLowerCase().trim();
      const status = String(item.status || "").toLowerCase().trim();
      if (tipe === "hutang" && status !== "lunas") {
        return total + Number(item.jumlah || 0);
      }
      return total;
    }, 0);

    const asetTetap = assets.reduce((total, item) => {
      const nilaiPerolehan = Number(item.nilai_perolehan || 0);
      const akumulasiPenyusutan = Number(item.akumulasi_penyusutan || 0);
      return total + Math.max(0, nilaiPerolehan - akumulasiPenyusutan);
    }, 0);

    const totalAset = kasSetaraKas + totalPiutang + asetTetap;
    const totalLiabilitas = totalHutang + overdraft;
    const totalEkuitas = totalAset - totalLiabilitas;

    return {
      periode: toDateLabel(new Date()),
      pendapatan,
      beban,
      labaBersih,
      kasSetaraKas,
      totalPiutang,
      asetTetap,
      totalAset,
      totalHutang,
      overdraft,
      totalLiabilitas,
      totalEkuitas,
    };
  }, [assets, debts, transactions]);

  const catatanRows = useMemo(
    () => [
      [
        "1. Kepatuhan SAK EMKM",
        "Laporan keuangan disusun sesuai SAK EMKM dan disajikan untuk tujuan umum.",
      ],
      [
        "2. Dasar Penyusunan",
        "Dasar pengukuran menggunakan biaya historis dan satuan Rupiah.",
      ],
      [
        "3. Kebijakan Pendapatan/Beban",
        `Pendapatan diakui sebesar ${formatRupiah(report.pendapatan)} dan beban sebesar ${formatRupiah(report.beban)} selama periode berjalan.`,
      ],
      [
        "4. Rincian Aset dan Liabilitas",
        `Kas/setara kas ${formatRupiah(report.kasSetaraKas)}, piutang ${formatRupiah(report.totalPiutang)}, aset tetap ${formatRupiah(report.asetTetap)}, liabilitas ${formatRupiah(report.totalLiabilitas)}.`,
      ],
      [
        "5. Informasi Material",
        `Jumlah transaksi: ${transactions.length}, item hutang/piutang: ${debts.length}, item aset: ${assets.length}.`,
      ],
    ],
    [debts.length, report, transactions.length, assets.length],
  );

  const reportRows = useMemo(() => {
    if (reportType === "posisi") {
      return [
        ["ASET", ""],
        ["Kas dan Setara Kas", report.kasSetaraKas],
        ["Piutang Usaha", report.totalPiutang],
        ["Aset Tetap (Nilai Buku)", report.asetTetap],
        ["Total Aset", report.totalAset],
        ["", ""],
        ["LIABILITAS", ""],
        ["Utang Usaha", report.totalHutang],
        ["Overdraft/Defisit Kas", report.overdraft],
        ["Total Liabilitas", report.totalLiabilitas],
        ["", ""],
        ["EKUITAS", ""],
        ["Total Ekuitas", report.totalEkuitas],
      ];
    }

    if (reportType === "laba") {
      return [
        ["Pendapatan", report.pendapatan],
        ["Beban", report.beban],
        ["Laba Bersih", report.labaBersih],
      ];
    }

    return [];
  }, [report, reportType]);

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Laporan Keuangan SAK EMKM ", 14, 16);
    doc.setFontSize(11);
    doc.text(`Periode: ${report.periode}`, 14, 24);

    if (reportType === "catatan") {
      doc.setFontSize(12);
      doc.text("Catatan Atas Laporan Keuangan", 14, 34);
      let y = 42;

      catatanRows.forEach((row) => {
        const lines = doc.splitTextToSize(`${row[0]}: ${row[1]}`, 180);
        doc.text(lines, 14, y);
        y += lines.length * 6 + 2;
      });
    } else {
      const title =
        reportType === "posisi"
          ? "Laporan Posisi Keuangan"
          : "Laporan Laba Rugi";

      doc.setFontSize(12);
      doc.text(title, 14, 34);

      autoTable(doc, {
        startY: 40,
        head: [["Keterangan", "Jumlah"]],
        body: reportRows.map((row) => [
          row[0],
          row[0] && row[1] !== "" ? formatRupiah(row[1]) : row[1],
        ]),
      });
    }

    doc.save(`laporan-sak-emkm-${reportType}.pdf`);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan SAK EMKM");

    if (reportType === "catatan") {
      sheet.columns = [
        { header: "Bagian", key: "bagian", width: 36 },
        { header: "Penjelasan", key: "penjelasan", width: 96 },
      ];

      catatanRows.forEach((row) => {
        sheet.addRow({ bagian: row[0], penjelasan: row[1] });
      });
    } else {
      sheet.columns = [
        { header: "Keterangan", key: "ket", width: 36 },
        { header: "Jumlah", key: "jumlah", width: 24 },
      ];

      reportRows.forEach((row) => {
        sheet.addRow({
          ket: row[0],
          jumlah: row[1] === "" ? "" : Number(row[1] || 0),
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `laporan-sak-emkm-${reportType}.xlsx`);
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
              Laporan Keuangan UMKM
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="text-zinc-600 text-lg max-w-xl"
            >
              Format laporan disesuaikan dengan komponen inti SAK EMKM:
              Laporan Posisi Keuangan, Laporan Laba Rugi, dan Catatan Atas
              Laporan Keuangan.
            </motion.p>

            <motion.div variants={fadeUp}>
              <div className="relative max-w-sm">
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 pr-12 text-sm font-medium shadow-sm outline-none transition hover:border-zinc-400 focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="posisi">Laporan Posisi Keuangan</option>
                  <option value="laba">Laporan Laba Rugi</option>
                  <option value="catatan">
                    Catatan Atas Laporan Keuangan
                  </option>
                </select>

                <ChevronDown
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex gap-3 flex-wrap">
              <button
                onClick={exportPDF}
                className="px-6 py-4 rounded-2xl bg-zinc-900 text-white inline-flex items-center gap-2 hover:scale-105 transition"
              >
                <FileText size={18} />
                Export PDF
              </button>

              <button
                onClick={exportExcel}
                className="px-6 py-4 rounded-2xl border border-zinc-300 inline-flex items-center gap-2 hover:bg-zinc-100 transition"
              >
                <FileSpreadsheet size={18} />
                Export Excel
              </button>
            </motion.div>
          </motion.div>

          <div className="rounded-[32px] border border-zinc-200 bg-white shadow-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900 text-white">
                <p className="text-sm opacity-70">Total Aset</p>
                <h2 className="text-2xl font-semibold">
                  {formatRupiah(report.totalAset)}
                </h2>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-100">
                <p className="text-sm text-zinc-500">Total Liabilitas</p>
                <h2 className="text-2xl font-semibold">
                  {formatRupiah(report.totalLiabilitas)}
                </h2>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp size={18} />
                Ekuitas
              </div>

              <h2 className="text-3xl font-semibold text-emerald-800 mt-2">
                {formatRupiah(report.totalEkuitas)}
              </h2>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8">
          <div className="rounded-[32px] bg-zinc-900 text-white p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles size={20} />
              <h2 className="text-xl font-semibold">Insight AI Laporan</h2>
            </div>

            <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
              {loadingAI ? "Memuat analisis AI..." : aiSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">
              {reportType === "posisi"
                ? "Laporan Posisi Keuangan"
                : reportType === "laba"
                  ? "Laporan Laba Rugi"
                  : "Catatan Atas Laporan Keuangan"}
            </h3>

            <span className="text-sm text-zinc-500">
              Periode: {report.periode}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {loadingData ? (
              <div className="rounded-2xl border border-zinc-200 p-6 text-zinc-500">
                Memuat laporan...
              </div>
            ) : reportType === "catatan" ? (
              catatanRows.map((row) => (
                <div
                  key={row[0]}
                  className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50"
                >
                  <p className="font-medium text-zinc-900">{row[0]}</p>
                  <p className="text-sm text-zinc-600 mt-1">{row[1]}</p>
                </div>
              ))
            ) : (
              reportRows.map((row, index) => (
                <div
                  key={`${row[0]}-${index}`}
                  className={`p-4 rounded-2xl border border-zinc-200 flex items-center justify-between gap-4 ${
                    row[0] === "Total Aset" ||
                    row[0] === "Total Liabilitas" ||
                    row[0] === "Total Ekuitas" ||
                    row[0] === "Laba Bersih"
                      ? "bg-zinc-100"
                      : "bg-white"
                  }`}
                >
                  <p className="font-medium">{row[0]}</p>
                  <p className="font-semibold">
                    {row[1] === "" ? "" : formatRupiah(row[1])}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
