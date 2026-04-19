"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { supabase } from "../../utils/supabase";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
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



export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function signIn() {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log(data, error);
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition"
          >
            <ArrowLeft size={20} />
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>

          <div className="w-11" />
        </div>
      </header>

      {/* CONTENT */}
      <section className="min-h-screen flex items-center justify-center px-6 py-10 pt-28">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          {/* LEFT */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.15 }}
            className="space-y-7"
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl lg:text-6xl font-semibold tracking-tight leading-tight"
            >
              Login ke
              <span className="block text-zinc-400">ArthaMind</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-zinc-600 text-lg max-w-xl"
            >
              Kelola keuangan UMKM lebih mudah, pantau cashflow, dan gunakan AI
              Advisor dalam satu platform modern.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Link
                href="/register"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition"
              >
                Belum punya akun? Daftar sekarang →
              </Link>
            </motion.div>
          </motion.div>

          {/* FORM */}
          <motion.div animate={floatAnim}>
            <div className="bg-white border border-zinc-200 shadow-2xl rounded-[32px] p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Masuk</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Gunakan email dan password kamu
                </p>
              </div>

              <div className="space-y-4">
                {/* EMAIL */}
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-100 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-100 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
              </div>

              <button
                className="w-full py-4 rounded-2xl bg-zinc-900 text-white flex justify-center items-center gap-2 hover:scale-[1.02] transition cursor-pointer"
                onClick={() => signIn()}
              >
                Login <ArrowRight size={18} />
              </button>

              <p className="text-center text-sm text-zinc-500">
                Lupa password?{" "}
                <span className="text-zinc-900 cursor-pointer hover:underline">
                  Reset
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
