"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Sparkles,
  Wallet,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import Header from "../../component/Header";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

export default function Page() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Halo 👋 Saya ArthaMind AI Advisor. Tanyakan profit, cashflow, hutang, atau strategi bisnismu.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [finance, setFinance] = useState({
    saldo: 0,
    income: 0,
    expense: 0,
  });

  const bottomRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadFinance() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) return;

        const { data, error } = await supabase
          .from("transaksi")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;

        let income = 0;
        let expense = 0;

        (data || []).forEach((item) => {
          const jenis = String(item?.jenis || "")
            .toLowerCase()
            .trim();

          const jumlah = Number(
            item?.jumlah ?? item?.nominal ?? item?.amount ?? item?.total ?? 0,
          );

          if (
            jenis === "pemasukan" ||
            jenis === "masuk" ||
            jenis === "income"
          ) {
            income += jumlah;
          } else if (
            jenis === "pengeluaran" ||
            jenis === "keluar" ||
            jenis === "expense"
          ) {
            expense += jumlah;
          }
        });

        if (!mounted) return;

        setFinance({
          income,
          expense,
          saldo: income - expense,
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text:
              `Saya sudah membaca data keuangan usaha kamu 📊\n\n` +
              `Saldo: Rp${(income - expense).toLocaleString("id-ID")}\n` +
              `Pemasukan: Rp${income.toLocaleString("id-ID")}\n` +
              `Pengeluaran: Rp${expense.toLocaleString("id-ID")}\n\n` +
              `Silakan tanya analisis usaha kamu.`,
          },
        ]);
      } catch (err) {
        console.log("Load finance error:", err.message);
      }
    }

    loadFinance();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message;

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setMessage("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          message: userText,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Maaf, terjadi kesalahan.",
        },
      ]);
    }

    setLoading(false);
  };

  const quickQuestions = [
    "Bagaimana kondisi usaha saya?",
    "Cara menaikkan profit?",
    "Apakah cashflow saya sehat?",
    "Apakah aman ambil pinjaman?",
  ];

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <Header />

      {/* CONTENT */}
      <section className="pt-28 px-6 lg:px-20 pb-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 p-6 shadow-xl bg-white"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                  <Sparkles size={20} />
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Smart Assistant</p>
                  <h2 className="font-semibold text-lg">Business Insight</h2>
                </div>
              </div>

              <h3 className="text-3xl font-semibold tracking-tight leading-tight">
                Kelola Usaha
                <span className="block text-zinc-400">Lebih Cerdas</span>
              </h3>

              <p className="text-zinc-600 mt-4 leading-relaxed">
                Tanya profit, cashflow, hutang, strategi penjualan, hingga
                efisiensi usaha berdasarkan data bisnismu.
              </p>
            </motion.div>

            {/* KEUANGAN */}
            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 p-6 bg-white shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <Wallet size={18} />
                <h3 className="font-semibold">Keuangan Saat Ini</h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-900 text-white">
                  <p className="text-sm opacity-70">Saldo</p>
                  <h2 className="text-2xl font-semibold">
                    Rp{finance.saldo.toLocaleString("id-ID")}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-100">
                    <p className="text-sm text-zinc-500">Masuk</p>
                    <h2 className="font-semibold">
                      Rp{finance.income.toLocaleString("id-ID")}
                    </h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-100">
                    <p className="text-sm text-zinc-500">Keluar</p>
                    <h2 className="font-semibold">
                      Rp{finance.expense.toLocaleString("id-ID")}
                    </h2>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* QUICK ASK */}
            <motion.div
              variants={fadeUp}
              className="rounded-[32px] bg-zinc-900 text-white p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp size={18} />
                <h3 className="font-semibold">Quick Ask</h3>
              </div>

              <div className="space-y-3">
                {quickQuestions.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(item)}
                    className="w-full text-left p-3 rounded-2xl bg-white/10 hover:bg-white/15 transition"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-[32px] border border-zinc-200 bg-white shadow-2xl flex flex-col h-[78vh] overflow-hidden"
          >
            {/* HEADER */}
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">ArthaMind Assistant</h2>
                  <p className="text-sm text-zinc-500">
                    AI berbasis data keuangan usahamu
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </div>
              </div>
            </div>

            {/* CHAT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white-50">
              {messages.map((item, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] rounded-3xl px-5 py-4 ${
                    item.role === "user"
                      ? "ml-auto bg-zinc-900 text-white"
                      : "bg-white border border-zinc-200 text-zinc-900"
                  }`}
                >
                  <p className="whitespace-pre-line">{item.text}</p>
                </div>
              ))}

              {loading && (
                <div className="rounded-3xl px-5 py-4 bg-white border border-zinc-200 w-fit">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-200" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div className="p-5 border-t border-zinc-100 bg-white">
              <div className="flex gap-3">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Tanya sesuatu tentang bisnismu..."
                  className="flex-1 px-5 py-4 rounded-2xl border border-zinc-200 outline-none focus:border-zinc-400"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  className="px-6 rounded-2xl bg-zinc-900 text-white flex items-center gap-2 hover:scale-105 transition"
                >
                  <Send size={18} />
                  Kirim
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-3">
                <AlertCircle size={14} />
                Saran AI bersifat rekomendasi berdasarkan data usaha.
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
