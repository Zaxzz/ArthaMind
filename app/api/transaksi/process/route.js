import { createClient } from "@supabase/supabase-js";
import { parseTransactionInput } from "@/utils/parseTransactionInput";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const COLUMN_ERROR_PATTERN =
  /column|schema cache|does not exist|Could not find the '.*' column/i;

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

async function insertTransaction(payload) {
  const normalizedPayload = cleanPayload(payload);

  const candidates = [
    normalizedPayload,
    cleanPayload({
      user_id: payload.user_id,
      jenis: payload.jenis,
      kategori: payload.kategori,
      jumlah: payload.jumlah,
      tanggal: payload.tanggal,
      deskripsi: payload.deskripsi,
    }),
    cleanPayload({
      user_id: payload.user_id,
      jenis: payload.jenis,
      kategori: payload.kategori,
      jumlah: payload.jumlah,
    }),
  ];

  let lastError = null;

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("transaksi")
      .insert(candidate)
      .select()
      .single();

    if (!error) {
      return { data, usedPayload: candidate, error: null };
    }

    lastError = error;

    if (!COLUMN_ERROR_PATTERN.test(error.message || "")) {
      break;
    }
  }

  return { data: null, usedPayload: null, error: lastError };
}

export async function POST(request) {
  try {
    const { rawText, userId, source } = await request.json();

    if (!rawText || !userId) {
      return Response.json(
        { success: false, message: "rawText dan userId wajib diisi." },
        { status: 400 },
      );
    }

    const parsed = await parseTransactionInput(rawText, source);

    const payload = {
      user_id: userId,
      jenis: parsed.jenis,
      kategori: parsed.kategori,
      jumlah: parsed.jumlah,
      deskripsi: parsed.deskripsi,
      tanggal: parsed.tanggal,
      tanggal_transaksi: parsed.tanggal,
      metode_input: source,
      sumber_input: source,
      raw_input: rawText,
    };

    const { data, error, usedPayload } = await insertTransaction(payload);

    if (error) {
      return Response.json(
        {
          success: false,
          message: error.message || "Gagal simpan transaksi.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      parsed,
      transaksi: data,
      usedPayload,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error?.message || "Terjadi error pada server.",
      },
      { status: 500 },
    );
  }
}
