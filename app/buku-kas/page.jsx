"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  FilePenLine,
  Filter,
  LogOut,
  PlusCircle,
  Save,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import {
  getCategoriesByJenis,
  getDefaultCategory,
  TRANSACTION_CATEGORIES,
} from "@/utils/transactionCategories";
import {
  formatRupiah,
  getCategoryLabel,
  getTransactionAmount,
  getTransactionDateKey,
  getTransactionIdentity,
  normalizeJenis,
  sortTransactionsByDateDesc,
} from "@/utils/transactionUtils";

const COLUMN_ERROR_PATTERN =
  /column|schema cache|does not exist|Could not find the '.*' column/i;

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

function isSameTransaction(first, second) {
  const firstIdentity = getTransactionIdentity(first);
  const secondIdentity = getTransactionIdentity(second);

  if (!firstIdentity || !secondIdentity) return false;

  return (
    firstIdentity.field === secondIdentity.field &&
    String(firstIdentity.value) === String(secondIdentity.value)
  );
}

async function updateTransaction(transaction, payload) {
  const identity = getTransactionIdentity(transaction);

  if (!identity) {
    throw new Error("ID transaksi tidak ditemukan.");
  }

  const candidates = [
    cleanPayload({
      ...payload,
      tanggal_transaksi: payload.tanggal,
    }),
    cleanPayload(payload),
    cleanPayload({
      jenis: payload.jenis,
      kategori: payload.kategori,
      jumlah: payload.jumlah,
      tanggal: payload.tanggal,
    }),
  ];

  let lastError = null;

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("transaksi")
      .update(candidate)
      .eq(identity.field, identity.value)
      .select("*")
      .single();

    if (!error) return data;

    lastError = error;

    if (!COLUMN_ERROR_PATTERN.test(error.message || "")) {
      break;
    }
  }

  throw new Error(lastError?.message || "Gagal memperbarui transaksi.");
}

export default function BukuKasPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    kategori: "all",
    keyword: "",
  });

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    jenis: "pengeluaran",
    kategori: getDefaultCategory("pengeluaran"),
    jumlah: "",
    tanggal: "",
    deskripsi: "",
  });

  const editCategoryOptions = useMemo(
    () => getCategoriesByJenis(editForm.jenis),
    [editForm.jenis],
  );

  const categoryFilterOptions = useMemo(
    () => [
      ...TRANSACTION_CATEGORIES.pemasukan,
      ...TRANSACTION_CATEGORIES.pengeluaran,
    ],
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadTransactions() {
      setLoading(true);
      setStatus("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("transaksi")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;
        if (!mounted) return;

        setTransactions(sortTransactionsByDateDesc(data || []));
      } catch (loadError) {
        if (mounted) {
          setStatus(loadError.message || "Gagal memuat data buku kas.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredTransactions = useMemo(() => {
    const keyword = filters.keyword.toLowerCase().trim();

    return sortTransactionsByDateDesc(transactions).filter((transaction) => {
      const dateKey = getTransactionDateKey(transaction);

      if (filters.startDate && (!dateKey || dateKey < filters.startDate)) {
        return false;
      }

      if (filters.endDate && (!dateKey || dateKey > filters.endDate)) {
        return false;
      }

      if (
        filters.kategori !== "all" &&
        transaction.kategori !== filters.kategori
      ) {
        return false;
      }

      if (!keyword) return true;

      const text = [
        transaction.deskripsi,
        transaction.kategori,
        String(transaction.jumlah || ""),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [filters, transactions]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const transaction of filteredTransactions) {
      const amount = getTransactionAmount(transaction);
      const jenis = normalizeJenis(transaction.jenis);

      if (jenis === "pemasukan") income += amount;
      else expense += amount;
    }

    return {
      income,
      expense,
      saldo: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  function openEditModal(transaction) {
    setEditingTransaction(transaction);
    setEditForm({
      jenis: normalizeJenis(transaction.jenis),
      kategori:
        transaction.kategori ||
        getDefaultCategory(normalizeJenis(transaction.jenis)),
      jumlah: String(getTransactionAmount(transaction) || ""),
      tanggal: getTransactionDateKey(transaction) || "",
      deskripsi: transaction.deskripsi || "",
    });
    setStatus("");
  }

  async function handleSaveEdit() {
    if (!editingTransaction) return;

    const nominal = Number(editForm.jumlah);

    if (!editForm.kategori) {
      setStatus("Kategori wajib dipilih.");
      return;
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      setStatus("Nominal harus lebih dari 0.");
      return;
    }

    setSaving(true);
    setStatus("Menyimpan perubahan transaksi...");

    try {
      const updatedTransaction = await updateTransaction(editingTransaction, {
        jenis: editForm.jenis,
        kategori: editForm.kategori,
        jumlah: nominal,
        tanggal: editForm.tanggal,
        deskripsi: editForm.deskripsi,
      });

      setTransactions((previous) =>
        sortTransactionsByDateDesc(
          previous.map((item) =>
            isSameTransaction(item, editingTransaction)
              ? { ...item, ...updatedTransaction }
              : item,
          ),
        ),
      );

      setStatus("Transaksi berhasil diperbarui.");
      setEditingTransaction(null);
    } catch (error) {
      setStatus(error.message || "Gagal memperbarui transaksi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction) {
    const identity = getTransactionIdentity(transaction);

    if (!identity) {
      setStatus("Transaksi tidak memiliki ID yang valid.");
      return;
    }

    const confirmed = window.confirm(
      "Hapus transaksi ini dari buku kas? Tindakan ini tidak bisa dibatalkan.",
    );

    if (!confirmed) return;

    setStatus("Menghapus transaksi...");

    try {
      const { error } = await supabase
        .from("transaksi")
        .delete()
        .eq(identity.field, identity.value);

      if (error) throw error;

      setTransactions((previous) =>
        previous.filter(
          (item) =>
            !(
              getTransactionIdentity(item)?.field === identity.field &&
              String(getTransactionIdentity(item)?.value) ===
                String(identity.value)
            ),
        ),
      );
      setStatus("Transaksi berhasil dihapus.");
    } catch (error) {
      setStatus(error.message || "Gagal menghapus transaksi.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 h-20 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden md:inline-block px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/buku-kas"
              className="hidden md:inline-block px-4 py-2 rounded-2xl bg-zinc-900 text-white text-sm"
            >
              Buku Kas
            </Link>
            <Link
              href="/transaksi"
              className="px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Tambah
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

      <section className="pt-28 px-6 lg:px-20 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Saldo (Filter Aktif)</p>
              <p className="text-2xl font-semibold mt-1">
                {formatRupiah(summary.saldo)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-lg">
              <p className="text-sm text-emerald-700">Pemasukan</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-800">
                {formatRupiah(summary.income)}
              </p>
            </div>

            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-lg">
              <p className="text-sm text-rose-700">Pengeluaran</p>
              <p className="text-2xl font-semibold mt-1 text-rose-800">
                {formatRupiah(summary.expense)}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-900 text-white p-5 shadow-lg">
              <p className="text-sm text-zinc-300">Jumlah Transaksi</p>
              <p className="text-2xl font-semibold mt-1">{summary.count}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-5 md:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} />
              <h2 className="font-semibold text-lg">Filter Buku Kas</h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="relative xl:col-span-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      keyword: event.target.value,
                    }))
                  }
                  placeholder="Cari deskripsi / nominal..."
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />
              </div>

              <div className="relative">
                <CalendarRange
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />
              </div>

              <input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    endDate: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
              />

              <select
                value={filters.kategori}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    kategori: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
              >
                <option value="all">Semua Kategori</option>
                {categoryFilterOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <button
                onClick={() =>
                  setFilters({
                    startDate: "",
                    endDate: "",
                    kategori: "all",
                    keyword: "",
                  })
                }
                className="px-4 py-2 rounded-xl border border-zinc-300 text-sm hover:bg-zinc-100 transition"
              >
                Reset Filter
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-5 md:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} />
              <h2 className="font-semibold text-lg">List Transaksi Buku Kas</h2>
            </div>

            {loading ? (
              <p className="text-zinc-500">Memuat transaksi...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-zinc-500">
                Tidak ada transaksi untuk filter saat ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="text-left text-sm text-zinc-500 border-b border-zinc-200">
                      <th className="py-3 pr-3">Tanggal</th>
                      <th className="py-3 pr-3">Jenis</th>
                      <th className="py-3 pr-3">Kategori</th>
                      <th className="py-3 pr-3">Nominal</th>
                      <th className="py-3 pr-3">Deskripsi</th>
                      <th className="py-3 text-right">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((transaction) => {
                      const jenis = normalizeJenis(transaction.jenis);
                      const identity = getTransactionIdentity(transaction);

                      return (
                        <tr
                          key={`${identity?.field || "row"}-${identity?.value || getTransactionDateKey(transaction) || transaction.created_at || "tx"}`}
                          className="border-b border-zinc-100 text-sm"
                        >
                          <td className="py-4 pr-3">
                            {getTransactionDateKey(transaction) || "-"}
                          </td>
                          <td className="py-4 pr-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                jenis === "pemasukan"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {jenis}
                            </span>
                          </td>
                          <td className="py-4 pr-3">
                            {getCategoryLabel(transaction.kategori)}
                          </td>
                          <td
                            className={`py-4 pr-3 font-semibold ${
                              jenis === "pemasukan"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {jenis === "pemasukan" ? "+" : "-"}
                            {formatRupiah(getTransactionAmount(transaction)).replace(
                              "Rp",
                              "Rp ",
                            )}
                          </td>
                          <td className="py-4 pr-3 text-zinc-600 max-w-[280px]">
                            <p className="truncate">
                              {transaction.deskripsi || "Tanpa deskripsi"}
                            </p>
                          </td>
                          <td className="py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(transaction)}
                                className="px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 transition inline-flex items-center gap-1"
                              >
                                <FilePenLine size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(transaction)}
                                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition inline-flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {status && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 p-4 text-sm">
              {status}
            </div>
          )}
        </div>
      </section>

      {editingTransaction && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Edit Transaksi</h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={editForm.jenis}
                onChange={(event) => {
                  const nextJenis = event.target.value;
                  setEditForm((previous) => ({
                    ...previous,
                    jenis: nextJenis,
                    kategori: getDefaultCategory(nextJenis),
                  }));
                }}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
              >
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>

              <select
                value={editForm.kategori}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    kategori: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
              >
                {editCategoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="number"
              min="0"
              value={editForm.jumlah}
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  jumlah: event.target.value,
                }))
              }
              placeholder="Nominal"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
            />

            <input
              type="date"
              value={editForm.tanggal}
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  tanggal: event.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
            />

            <textarea
              rows={4}
              value={editForm.deskripsi}
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  deskripsi: event.target.value,
                }))
              }
              placeholder="Deskripsi transaksi"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 transition"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleSaveEdit}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:scale-[1.02] transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Save size={16} />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
