"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { supabaseClient } from "../../utils/supabase";
import AppShellHeader from "@/app/components/AppShellHeader";

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
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (user) {
        router.replace("/dashboard");
      }
    }

    checkSession();
  }, [router]);

  async function signIn() {
    if (!email || !password) {
      setStatus("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setStatus("Memproses login...");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setStatus("Login berhasil, mengarahkan ke dashboard...");
      router.push("/dashboard");
    } catch (error) {
      setStatus(error.message || "Login gagal. Cek kembali akun kamu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <AppShellHeader currentPath="/login" />

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
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-zinc-900 text-white flex justify-center items-center gap-2 hover:scale-[1.02] transition cursor-pointer disabled:opacity-60"
                onClick={() => signIn()}
              >
                {loading ? "Memproses..." : "Login"} <ArrowRight size={18} />
              </button>

              <p className="text-center text-sm text-zinc-500">
                Lupa password?{" "}
                <span className="text-zinc-900 cursor-pointer hover:underline">
                  Reset
                </span>
              </p>

              {status && (
                <div className="rounded-2xl bg-zinc-100 border border-zinc-200 p-3 text-sm text-zinc-700">
                  {status}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
