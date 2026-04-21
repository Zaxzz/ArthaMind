// components/Header.jsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PlusCircle,
  Receipt,
  LogOut,
  LayoutDashboard,
  BookOpenText,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const menuClass = (path) =>
    pathname === path
      ? "px-4 py-2 rounded-2xl bg-zinc-900 text-white text-sm inline-flex items-center gap-2"
      : "px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block">
          <h1 className="text-2xl font-semibold tracking-tight cursor-pointer">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className={menuClass("/dashboard")}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <Link href="/buku-kas" className={menuClass("/buku-kas")}>
            <BookOpenText size={16} />
            Buku Kas
          </Link>

          <Link href="/transaksi" className={menuClass("/transaksi")}>
            <PlusCircle size={16} />
            Transaksi
          </Link>

          <Link href="/laporan" className={menuClass("/laporan")}>
            <Receipt size={16} />
            Laporan
          </Link>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
