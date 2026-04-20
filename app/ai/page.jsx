"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  ArrowLeft,
  Wallet,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

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
    getFinance();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const getFinance = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("transaksi")
      .select("*")
      .eq("user_id", user.id);

    let income = 0;
    let expense = 0;

    data?.forEach((item) => {
      if (item.jenis === "pemasukan") income += Number(item.jumlah);
      if (item.jenis === "pengeluaran") expense += Number(item.jumlah);
    });

    setFinance({
      income,
      expense,
      saldo: income - expense,
    });
  };

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
    } catch (error) {
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
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition"
            >
              <ArrowLeft size={18} />
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">
              Artha<span className="text-zinc-400">Mind</span>
            </h1>
          </div>

          <div className="px-5 py-2.5 rounded-2xl bg-zinc-900 text-white flex items-center gap-2">
            <Bot size={18} />
            AI Advisor
          </div>
        </div>
      </header>

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
            className="lg:col-span-2 rounded-[32px] border border-zinc-200 bg-white shadow-2xl flex flex-col h-[78vh]"
          >
            {/* TOP */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">ArthaMind Assistant</h2>
                <p className="text-sm text-zinc-500">
                  AI berbasis data keuangan usahamu
                </p>
              </div>

              <div className="text-emerald-500 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live
              </div>
            </div>

            {/* CHAT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[80%] rounded-3xl px-5 py-4 ${
                    item.role === "user"
                      ? "ml-auto bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">
                    {item.text}
                  </p>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-[220px] rounded-3xl px-5 py-4 bg-zinc-100"
                >
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-200" />
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div className="p-5 border-t border-zinc-100">
              <div className="flex gap-3">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Tanya sesuatu tentang bisnismu..."
                  className="flex-1 px-5 py-4 rounded-2xl border border-zinc-200 outline-none focus:border-zinc-400"
                />

                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="px-6 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition flex items-center gap-2"
                >
                  <Send size={18} />
                  Kirim
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-3">
                <AlertCircle size={14} />
                Saran AI bersifat rekomendasi, tetap sesuaikan keputusan
                bisnismu.
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
