"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/buku-kas", label: "Buku Kas" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/ai-asisten", label: "AI Asisten" },
];

function isActive(currentPath, href) {
  if (!currentPath) return false;
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function AppShellHeader({ currentPath, onLogout }) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between gap-3">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Artha<span className="text-zinc-400">Mind</span>
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-block px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm whitespace-nowrap transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2"
            >
              <LogOut size={16} />
              Keluar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
