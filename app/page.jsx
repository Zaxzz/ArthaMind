"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  Mic,
  Smartphone,
  Sparkles,
  Wallet,
  CheckCircle2,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const floatAnim = {
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const pulseAnim = {
  scale: [1, 1.03, 1],
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const features = [
  // {
  //   icon: Smartphone,
  //   title: "Login Super Mudah",
  //   desc: "Masuk dengan nomor HP + OTP atau Google secara cepat dan aman.",
  // },
  {
    icon: Wallet,
    title: "Input Transaksi Instan",
    desc: "Manual form, voice input, hingga bulk paste dari WhatsApp atau Excel.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Real-time",
    desc: "Pantau saldo, profit, cashflow, dan performa usaha kapan saja.",
  },
  {
    icon: Bot,
    title: "AI Advisor",
    desc: "Tanya soal profit, stok, pinjaman, dan strategi usaha berbasis datamu.",
  },
  {
    icon: FileText,
    title: "Laporan Otomatis",
    desc: "Unduh laporan PDF harian, mingguan, dan bulanan siap pakai.",
  },
  // {
  //   icon: Sparkles,
  //   title: "Literasi & Reward",
  //   desc: "Belajar lewat video singkat, quiz, badge, dan sistem poin.",
  // },
];

export default function Page() {
  return (
    <main className="bg-white text-zinc-900 overflow-hidden">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>

          <button className="px-5 py-2.5 rounded-2xl bg-zinc-900 text-white hover:scale-105 transition">
            Login
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="min-h-screen flex items-center px-6 lg:px-20 pt-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center w-full">
          {/* LEFT */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.15 }}
            className="space-y-8"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border text-sm"
            >
              <Sparkles size={16} />
              Smart Finance for UMKM
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl lg:text-7xl font-semibold tracking-tight leading-tight"
            >
              Kelola Usaha
              <span className="block text-zinc-400">Lebih Cerdas</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg text-zinc-600 max-w-xl leading-relaxed"
            >
              ArthaMind membantu UMKM mencatat transaksi, memantau cashflow,
              mendapatkan saran AI, dan membuat laporan otomatis dalam satu
              platform modern.
            </motion.p>

            <motion.div variants={fadeUp}>
              <button className="px-7 py-4 rounded-2xl bg-zinc-900 text-white inline-flex items-center gap-2 hover:scale-105 transition">
                Login Sekarang <ArrowRight size={18} />
              </button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex gap-6 text-sm text-zinc-500 pt-2"
            >
              <span>✓ Mudah Digunakan</span>
              <span>✓ Mobile Friendly</span>
              <span>✓ AI Advisor</span>
            </motion.div>
          </motion.div>

          {/* MOCKUP DASHBOARD */}
          <motion.div animate={floatAnim}>
            <div className="rounded-[32px] border border-zinc-200 bg-white shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Dashboard Hari Ini</h3>

                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-sm text-emerald-500 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  animate={pulseAnim}
                  className="p-5 rounded-2xl bg-zinc-900 text-white"
                >
                  <p className="text-sm opacity-70">Saldo</p>
                  <h2 className="text-2xl font-semibold">Rp12.4jt</h2>
                </motion.div>

                <motion.div
                  animate={pulseAnim}
                  transition={{ delay: 0.3 }}
                  className="p-5 rounded-2xl bg-zinc-100"
                >
                  <p className="text-sm text-zinc-500">Profit</p>
                  <h2 className="text-2xl font-semibold">+Rp3.2jt</h2>
                </motion.div>
              </div>

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 rgba(0,0,0,0)",
                    "0 0 25px rgba(0,0,0,0.08)",
                    "0 0 0 rgba(0,0,0,0)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="p-5 rounded-2xl bg-zinc-50 border"
              >
                <p className="text-sm text-zinc-500 mb-2">AI Advisor</p>
                <p className="font-medium">
                  Produk terlaris: Baju Premium. Naikkan harga 5% untuk margin
                  lebih baik.
                </p>
              </motion.div>

              <motion.button
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-2xl bg-zinc-900 text-white py-3 flex justify-center items-center gap-2"
              >
                <Mic size={18} />
                Input Voice
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 lg:px-20 py-28">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-semibold tracking-tight">
              Semua yang Dibutuhkan UMKM
            </h2>
            <p className="text-zinc-600 mt-4">
              Sederhana digunakan, kuat untuk berkembang.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            {features.map((item, i) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="p-6 rounded-3xl border border-zinc-200 bg-white hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
                    <Icon size={22} />
                  </div>

                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-zinc-600 mt-2">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="px-6 lg:px-20 pb-28">
        <div className="max-w-7xl mx-auto rounded-[40px] bg-zinc-900 text-white p-10 lg:p-16 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-zinc-400 mb-3">Kenapa ArthaMind?</p>
            <h2 className="text-4xl font-semibold leading-tight">
              Solusi Modern untuk Naik Kelas
            </h2>
          </div>

          <div className="space-y-5">
            {[
              "Catatan keuangan lebih rapi.",
              "AI membantu ambil keputusan usaha.",
              "Laporan siap untuk bank & investor.",
              "Dirancang khusus untuk UMKM Indonesia.",
            ].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3"
              >
                <CheckCircle2 size={18} className="mt-1" />
                <p className="text-zinc-300">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-20 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight">
            Saatnya UMKM Go Digital
          </h2>

          <p className="text-zinc-600 mt-5 max-w-2xl mx-auto">
            Mulai kelola bisnis lebih rapi, cepat, dan cerdas bersama ArthaMind.
          </p>

          <button className="mt-8 px-7 py-4 rounded-2xl bg-zinc-900 text-white inline-flex items-center gap-2 hover:scale-105 transition">
            Login Sekarang <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 py-10 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 justify-between items-center">
          <h2 className="text-xl font-semibold">
            Artha<span className="text-zinc-400">Mind</span>
          </h2>

          <p className="text-sm text-zinc-500 text-center">
            © 2026 ArthaMind. Empowering UMKM Indonesia with Smart Finance.
          </p>

          <div className="flex gap-5 text-sm text-zinc-500">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
