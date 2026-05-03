import { TRANSACTION_CATEGORIES } from "./transactionCategories";

const CATEGORY_LABEL_LOOKUP = [
  ...TRANSACTION_CATEGORIES.pemasukan,
  ...TRANSACTION_CATEGORIES.pengeluaran,
].reduce((accumulator, item) => {
  accumulator[item.value] = item.label;
  return accumulator;
}, {});

const TRANSACTION_ID_FIELDS = ["id", "transaksi_id", "uuid"];

export function normalizeJenis(jenisRaw) {
  const value = String(jenisRaw || "")
    .toLowerCase()
    .trim();

  if (
    value === "pemasukan" ||
    value.includes("masuk") ||
    value.includes("income") ||
    value.includes("pendapatan")
  ) {
    return "pemasukan";
  }

  return "pengeluaran";
}

export function toDateKey(rawDate) {
  if (!rawDate) return null;

  if (typeof rawDate === "string") {
    const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match?.[1]) return match[1];
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTransactionDateKey(transaction) {
  return toDateKey(
    transaction?.tanggal_transaksi ||
      transaction?.tanggal ||
      transaction?.created_at,
  );
}

export function getTransactionAmount(transaction) {
  const parsed = Number(transaction?.jumlah);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getCategoryLabel(categoryValue) {
  return CATEGORY_LABEL_LOOKUP[categoryValue] || categoryValue || "-";
}

export function getTransactionIdentity(transaction) {
  for (const field of TRANSACTION_ID_FIELDS) {
    const value = transaction?.[field];
    if (value !== undefined && value !== null && value !== "") {
      return { field, value };
    }
  }

  return null;
}

export function sortTransactionsByDateDesc(transactions = []) {
  return [...transactions].sort((first, second) => {
    const firstKey = getTransactionDateKey(first) || "";
    const secondKey = getTransactionDateKey(second) || "";

    if (firstKey === secondKey) {
      const firstCreated = first?.created_at
        ? new Date(first.created_at).getTime()
        : 0;
      const secondCreated = second?.created_at
        ? new Date(second.created_at).getTime()
        : 0;
      return secondCreated - firstCreated;
    }

    return secondKey.localeCompare(firstKey);
  });
}

export function formatRupiah(value) {
  const amount = Number(value) || 0;
  return `Rp${amount.toLocaleString("id-ID")}`;
}
