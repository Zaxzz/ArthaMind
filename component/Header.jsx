// components/Header.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  X,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuClass = (path) =>
    (pathname === path || pathname.startsWith(`${path}/`))
      ? "px-4 py-2 rounded-2xl bg-zinc-900 text-white text-sm inline-flex items-center gap-2"
      : "px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2";

  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      href: "/hutang-piutang",
      icon: HandCoins,
      label: "Hutang Piutang",
    },
    {
      href: "/transaksi",
      icon: PlusCircle,
      label: "Transaksi",
    },
  ];

  async function handleLogout() {
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-20 h-20 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="inline-block shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight cursor-pointer">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={menuClass(item.href)}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition"
          aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-zinc-100 bg-white/95 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={menuClass(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2 justify-center"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
