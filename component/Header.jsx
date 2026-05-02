// components/Header.jsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HandCoins,
  LayoutDashboard,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const menuClass = (path) =>
    (pathname === path || pathname.startsWith(`${path}/`))
      ? "px-4 py-2 rounded-2xl bg-zinc-900 text-white text-sm inline-flex items-center gap-2"
      : "px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="inline-block shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight cursor-pointer">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>
        </Link>

        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Link href="/dashboard" className={`${menuClass("/dashboard")} shrink-0`}>
              <LayoutDashboard size={16} />
              Dashboard
            </Link>

            <Link
              href="/hutang-piutang"
              className={`${menuClass("/hutang-piutang")} shrink-0`}
            >
              <HandCoins size={16} />
              Hutang Piutang
            </Link>

            <Link href="/transaksi" className={`${menuClass("/transaksi")} shrink-0`}>
              <PlusCircle size={16} />
              Transaksi
            </Link>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2 shrink-0"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
