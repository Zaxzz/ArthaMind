export const TRANSACTION_CATEGORIES = {
  pemasukan: [
    {
      value: "penjualan",
      label: "Penjualan",
      description:
        "Uang masuk dari jualan utama usaha, misalnya jual makanan, baju, atau jasa.",
    },
    {
      value: "pendapatan_lain",
      label: "Pendapatan Lain",
      description:
        "Uang masuk di luar jualan utama, misalnya jual kardus bekas atau bunga tabungan.",
    },
    {
      value: "modal_masuk",
      label: "Modal Masuk",
      description:
        "Dana dari pemilik yang dimasukkan ke kas usaha untuk menambah modal.",
    },
    {
      value: "penerimaan_piutang",
      label: "Penerimaan Piutang",
      description:
        "Uang yang dibayar pelanggan untuk melunasi hutang atau kasbon sebelumnya.",
    },
  ],
  pengeluaran: [
    {
      value: "hpp",
      label: "HPP",
      description:
        "Belanja modal langsung barang dagangan, seperti bahan baku atau barang grosir untuk dijual lagi.",
    },
    {
      value: "beban_gaji",
      label: "Beban Gaji",
      description:
        "Biaya untuk gaji, upah harian, lembur, atau bonus karyawan.",
    },
    {
      value: "beban_sewa",
      label: "Beban Sewa",
      description:
        "Biaya sewa tempat usaha, lapak, ruko, atau alat kerja yang disewa.",
    },
    {
      value: "beban_utilitas",
      label: "Beban Utilitas",
      description:
        "Tagihan rutin operasional seperti listrik, air, internet, dan telepon.",
    },
    {
      value: "beban_pajak",
      label: "Beban Pajak",
      description: "Pembayaran pajak yang terkait dengan usaha.",
    },
    {
      value: "beban_lain",
      label: "Beban Lain",
      description:
        "Biaya operasional lain yang tidak masuk kategori di atas, misalnya bensin atau ATK.",
    },
    {
      value: "pembelian_aset",
      label: "Pembelian Aset",
      description:
        "Pembelian barang bernilai besar dan tahan lama, seperti mesin, etalase, atau motor operasional.",
    },
    {
      value: "pembayaran_hutang",
      label: "Pembayaran Hutang",
      description:
        "Uang keluar untuk membayar cicilan pinjaman atau hutang ke supplier.",
    },
    {
      value: "prive",
      label: "Prive",
      description:
        "Uang kas usaha yang diambil pemilik untuk kebutuhan pribadi.",
    },
  ],
};

const CATEGORY_ALIAS_MAP = {
  hpp: "hpp",
  harga_pokok_penjualan: "hpp",
  bahan_baku: "hpp",
  penjualan: "penjualan",
  pendapatan_lain: "pendapatan_lain",
  modal_masuk: "modal_masuk",
  penerimaan_piutang: "penerimaan_piutang",
  beban_gaji: "beban_gaji",
  gaji: "beban_gaji",
  beban_sewa: "beban_sewa",
  sewa: "beban_sewa",
  beban_utilitas: "beban_utilitas",
  utilitas: "beban_utilitas",
  beban_pajak: "beban_pajak",
  pajak: "beban_pajak",
  beban_lain: "beban_lain",
  pembelian_aset: "pembelian_aset",
  aset: "pembelian_aset",
  pembayaran_hutang: "pembayaran_hutang",
  bayar_hutang: "pembayaran_hutang",
  prive: "prive",
};

function sanitize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getCategoriesByJenis(jenis) {
  return TRANSACTION_CATEGORIES[jenis] || [];
}

export function getDefaultCategory(jenis) {
  return getCategoriesByJenis(jenis)?.[0]?.value || "";
}

export function normalizeCategory(jenis, kategoriRaw) {
  const cleaned = sanitize(kategoriRaw);
  const mapped = CATEGORY_ALIAS_MAP[cleaned] || cleaned;
  const allowed = new Set(getCategoriesByJenis(jenis).map((item) => item.value));

  if (allowed.has(mapped)) {
    return mapped;
  }

  return getDefaultCategory(jenis);
}
