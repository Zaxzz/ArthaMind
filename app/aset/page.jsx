"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Landmark, PlusCircle, Trash2 } from "lucide-react";
import Header from "../../component/Header";
import { supabase } from "@/utils/supabase";
import { formatRupiah } from "@/utils/transactionUtils";
import ToastNotice from "@/app/components/ToastNotice";

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

function parseMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateBookValue(asset) {
  return Math.max(
    0,
    parseMoney(asset?.nilai_perolehan) - parseMoney(asset?.akumulasi_penyusutan),
  );
}

async function ensureProfileId(user) {
  const payload = {
    id: user.id,
    nama_pemilik: user.user_metadata?.nama_pemilik || null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export default function AsetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [profileId, setProfileId] = useState("");
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    namaAset: "",
    kategori: "Peralatan",
    nilaiPerolehan: "",
    akumulasiPenyusutan: "",
    tanggalPerolehan: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!status) return undefined;

    const timeoutId = window.setTimeout(() => {
      setStatus("");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setStatus("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.replace("/login");
          return;
        }

        const resolvedProfileId = await ensureProfileId(user);

        const { data, error: asetError } = await supabase
          .from("aset")
          .select(
            "id, user_id, nama_aset, kategori, nilai_perolehan, akumulasi_penyusutan, tanggal_perolehan",
          )
          .eq("user_id", resolvedProfileId)
          .order("tanggal_perolehan", { ascending: false });

        if (asetError) throw asetError;
        if (!mounted) return;

        setProfileId(resolvedProfileId);
        setRecords(data || []);
      } catch (error) {
        if (mounted) {
          setStatus(
            error?.message ||
              "Gagal memuat data aset. Pastikan tabel aset sudah dibuat.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [router]);

  const summary = useMemo(() => {
    let totalPerolehan = 0;
    let totalPenyusutan = 0;
    let totalNilaiBuku = 0;

    for (const item of records) {
      const perolehan = parseMoney(item.nilai_perolehan);
      const penyusutan = parseMoney(item.akumulasi_penyusutan);
      totalPerolehan += perolehan;
      totalPenyusutan += penyusutan;
      totalNilaiBuku += Math.max(0, perolehan - penyusutan);
    }

    return {
      totalPerolehan,
      totalPenyusutan,
      totalNilaiBuku,
      totalData: records.length,
    };
  }, [records]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!profileId) {
      setStatus("Profil belum siap. Coba muat ulang halaman.");
      return;
    }

    const nilaiPerolehan = parseMoney(form.nilaiPerolehan);
    const akumulasiPenyusutan = parseMoney(form.akumulasiPenyusutan || 0);

    if (!form.namaAset.trim()) {
      setStatus("Nama aset wajib diisi.");
      return;
    }

    if (nilaiPerolehan <= 0) {
      setStatus("Nilai perolehan harus lebih dari 0.");
      return;
    }

    if (akumulasiPenyusutan < 0) {
      setStatus("Akumulasi penyusutan tidak boleh negatif.");
      return;
    }

    setSaving(true);
    setStatus("Menyimpan data aset...");

    try {
      const payload = {
        user_id: profileId,
        nama_aset: form.namaAset.trim(),
        kategori: form.kategori || null,
        nilai_perolehan: nilaiPerolehan,
        akumulasi_penyusutan: akumulasiPenyusutan,
        tanggal_perolehan: form.tanggalPerolehan || null,
      };

      const { data, error } = await supabase
        .from("aset")
        .insert(payload)
        .select(
          "id, user_id, nama_aset, kategori, nilai_perolehan, akumulasi_penyusutan, tanggal_perolehan",
        )
        .single();

      if (error) throw error;

      setRecords((previous) => [data, ...previous]);
      setForm((previous) => ({
        ...previous,
        namaAset: "",
        nilaiPerolehan: "",
        akumulasiPenyusutan: "",
      }));
      setStatus("Aset berhasil ditambahkan.");
    } catch (error) {
      setStatus(error?.message || "Aset belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const { error } = await supabase.from("aset").delete().eq("id", id);
      if (error) throw error;

      setRecords((previous) => previous.filter((item) => item.id !== id));
      setStatus("Aset berhasil dihapus.");
    } catch (error) {
      setStatus(error?.message || "Aset belum bisa dihapus.");
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 overflow-hidden">
      <Header />

      <section className="pt-28 px-6 lg:px-20 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            <motion.div
              variants={fadeUp}
              className="lg:col-span-2 rounded-[32px] bg-zinc-900 text-white p-7 shadow-2xl"
            >
              <p className="text-zinc-300 text-sm">Aset Tidak Lancar</p>
              <h2 className="text-3xl md:text-4xl font-semibold mt-2 leading-tight">
                Pencatatan Aset UMKM
              </h2>
              <p className="text-zinc-300 mt-3 max-w-2xl">
                Catat peralatan, kendaraan, atau mesin. SAK-EMKM mewajibkan
                pencatatan nilai perolehan dan penyusutan secara sederhana.
                Nilai buku dihitung dengan rumus: nilai perolehan - akumulasi
                penyusutan.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 space-y-4"
            >
              <h3 className="font-semibold text-lg">Ringkasan Aset</h3>
              <div className="p-4 rounded-2xl bg-zinc-100">
                <p className="text-sm text-zinc-500">Total Nilai Perolehan</p>
                <p className="text-xl font-semibold">
                  {formatRupiah(summary.totalPerolehan)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-100">
                <p className="text-sm text-zinc-500">Akumulasi Penyusutan</p>
                <p className="text-xl font-semibold">
                  {formatRupiah(summary.totalPenyusutan)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm text-emerald-700">Total Nilai Buku</p>
                <p className="text-xl font-semibold text-emerald-800">
                  {formatRupiah(summary.totalNilaiBuku)}
                </p>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid xl:grid-cols-3 gap-6">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Landmark size={18} />
                <h3 className="font-semibold text-lg">Tambah Aset</h3>
              </div>

              <input
                type="text"
                value={form.namaAset}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    namaAset: event.target.value,
                  }))
                }
                placeholder="Nama aset (contoh: Mesin Produksi)"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
              />

              <select
                value={form.kategori}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    kategori: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none"
              >
                <option value="Peralatan">Peralatan</option>
                <option value="Kendaraan">Kendaraan</option>
                <option value="Mesin">Mesin</option>
                <option value="Lainnya">Lainnya</option>
              </select>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.nilaiPerolehan}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      nilaiPerolehan: event.target.value,
                    }))
                  }
                  placeholder="Nilai perolehan"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.akumulasiPenyusutan}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      akumulasiPenyusutan: event.target.value,
                    }))
                  }
                  placeholder="Akumulasi penyusutan"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none"
                />
              </div>

              <input
                type="date"
                value={form.tanggalPerolehan}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    tanggalPerolehan: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white hover:scale-[1.02] transition inline-flex justify-center items-center gap-2 disabled:opacity-60"
              >
                <PlusCircle size={18} />
                Simpan Aset
              </button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="xl:col-span-2 rounded-[32px] border border-zinc-200 bg-white shadow-xl p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">Daftar Aset</h3>
                  <p className="text-sm text-zinc-500">
                    Total data: {summary.totalData}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="text-zinc-500">Memuat data aset...</p>
                ) : records.length === 0 ? (
                  <p className="text-zinc-500">
                    Belum ada data aset. Tambahkan aset pertama dari form di
                    samping.
                  </p>
                ) : (
                  records.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                            {item.kategori || "Tanpa kategori"}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                            {item.tanggal_perolehan || "-"}
                          </span>
                        </div>
                        <p className="font-semibold text-lg">{item.nama_aset}</p>
                        <p className="text-sm text-zinc-500">
                          Nilai Perolehan: {formatRupiah(item.nilai_perolehan)} •
                          Akumulasi Penyusutan:{" "}
                          {formatRupiah(item.akumulasi_penyusutan)}
                        </p>
                        <p className="text-sm font-medium text-emerald-700">
                          Nilai Buku: {formatRupiah(calculateBookValue(item))}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm inline-flex items-center gap-2 hover:bg-rose-50 transition"
                      >
                        <Trash2 size={15} />
                        Hapus
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          <ToastNotice message={status} />
        </div>
      </section>
    </main>
  );
}
