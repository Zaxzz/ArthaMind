"use client";

import { BellRing } from "lucide-react";

export default function ToastNotice({ message }) {
  if (!message) return null;

  const isError =
    /(gagal|belum|wajib|harus|tidak|terputus|habis|ulang|error)/i.test(
      message,
    );

  return (
    <div className="fixed top-24 right-4 sm:right-6 z-[120] pointer-events-none">
      <div
        className={`max-w-sm rounded-2xl border-2 px-4 py-3 text-sm shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-sm ${
          isError
            ? "border-rose-300 bg-rose-50/95 text-rose-900"
            : "border-emerald-300 bg-emerald-50/95 text-emerald-900"
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              isError ? "bg-rose-200 text-rose-700" : "bg-emerald-200 text-emerald-700"
            }`}
          >
            <BellRing size={14} />
          </span>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}
