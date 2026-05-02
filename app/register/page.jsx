"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Mail,
  User,
} from "lucide-react";
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

export default function Register() {
  const [email, setEmail] = React.useState("");
  const [namaPemilik, setNamaPemilik] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function signUp() {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nama_pemilik: namaPemilik,
        },
      },
    });

    console.log(data, error);
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      {/* CONTENT */}
      <section className="min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          {/* LEFT SIDE */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.15 }}
            className="space-y-7"
          >
            {/* <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border text-sm"
            >
              <Sparkles size={16} />
              Create Account
            </motion.div> */}

            <motion.h1
              variants={fadeUp}
              className="text-5xl lg:text-6xl font-semibold tracking-tight leading-tight"
            >
              Daftar ke
              <span className="block text-zinc-400">ArthaMind</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-zinc-600 text-lg max-w-xl"
            >
              Mulai kelola keuangan UMKM dengan sistem modern, laporan otomatis,
              dan bantuan AI Advisor.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Link
                href="/login"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition"
              >
                Sudah punya akun? Login sekarang →
              </Link>
            </motion.div>
          </motion.div>

          {/* FORM */}
          <motion.div animate={floatAnim}>
            <div className="bg-white border border-zinc-200 shadow-2xl rounded-[32px] p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Register</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Isi data di bawah untuk membuat akun
                </p>
              </div>

              <div className="space-y-4">
                {/* Nama */}
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={namaPemilik}
                    onChange={(e) => setNamaPemilik(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-100 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                {/* Email */}
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

                {/* Password */}
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
                onClick={() => signUp()}
              >
                Register <ArrowRight size={18} />
              </button>

              <p className="text-center text-sm text-zinc-500">
                Dengan mendaftar, kamu setuju dengan Terms & Privacy
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
