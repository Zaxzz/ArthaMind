import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { parseTransactionInput } from "@/utils/parseTransactionInput";

// Fungsi untuk membuang data yang kosong/undefined agar database tidak protes
function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

function formatDbError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");

  if (code === "23514" || message.includes("check constraint")) {
    return "Data transaksi belum sesuai aturan. Cek lagi jenis, kategori, nominal, dan tanggalnya.";
  }

  if (code === "23502" || message.includes("null value")) {
    return "Data transaksi belum lengkap. Mohon lengkapi kolom wajib lalu coba lagi.";
  }

  if (
    code === "23503" ||
    message.includes("foreign key") ||
    message.includes("violates row-level security")
  ) {
    return "Akses simpan transaksi ditolak. Silakan login ulang lalu coba lagi.";
  }

  if (message.includes("invalid input syntax for type date")) {
    return "Format tanggal belum sesuai. Gunakan format tanggal yang valid.";
  }

  if (message.includes("invalid input syntax for type numeric")) {
    return "Nominal transaksi belum valid. Gunakan angka tanpa huruf.";
  }

  return "Transaksi belum bisa disimpan. Silakan cek lagi datanya lalu coba ulang.";
}

function pickBusinessName(profile, user) {
  return (
    profile?.nama_usaha ||
    profile?.nama_toko ||
    profile?.business_name ||
    profile?.nama_business ||
    user?.user_metadata?.nama_usaha ||
    user?.user_metadata?.nama_toko ||
    user?.user_metadata?.nama_pemilik ||
    ""
  );
}

export async function POST(request) {
  try {
    // 1. Ambil data dari frontend (TIDAK PERLU ambil userId dari body lagi demi keamanan)
    const { rawText, source, jenisOverride } = await request.json();

    if (!rawText) {
      return NextResponse.json(
        { success: false, message: "Teks (rawText) wajib diisi." },
        { status: 400 },
      );
    }

    // 3. Buat koneksi Supabase khusus Server yang PAHAM identitas user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      },
    );

    // 4. BACA IDENTITAS SECARA AMAN (Cegat jika token palsu/kosong)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login kembali." },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 5. Kirim teks ke Grok untuk diolah
    const parsed = await parseTransactionInput(rawText, source, {
      jenisOverride,
      businessName: pickBusinessName(profile, user),
    });

    // 6. Tangani jika Gemini bingung menentukan jenis transaksi
    if (parsed.requiresJenisConfirmation && !jenisOverride) {
      return NextResponse.json(
        {
          success: false,
          code: "NEEDS_JENIS_CONFIRMATION",
          message:
            "Model belum cukup yakin menentukan pemasukan/pengeluaran. Pilih jenis transaksi untuk melanjutkan.",
          draft: {
            suggestedJenis: parsed.suggestedJenis,
            confidenceJenis: parsed.confidenceJenis,
            detectedJenisByKeyword: parsed.detectedJenisByKeyword,
            merchantName: parsed.merchantName,
            jumlah: parsed.jumlah,
            kategori: parsed.kategori,
            deskripsi: parsed.deskripsi,
            tanggal: parsed.tanggal,
          },
        },
        { status: 422 },
      );
    }

    // 7. Siapkan paket data yang akan disimpan ke tabel transaksi
    const payload = cleanPayload({
      user_id: user.id, // AMAN: Menggunakan ID langsung dari verifikasi token, bukan dari request body
      jenis: parsed.jenis,
      kategori: parsed.kategori,
      jumlah: parsed.jumlah,
      deskripsi: parsed.deskripsi,
      tanggal: parsed.tanggal,
      metode_input: source,
    });

    console.log("Payload siap simpan:", payload);

    // 8. Eksekusi penyimpanan ke Supabase secara langsung tanpa looping rumit
    const { data, error } = await supabase
      .from("transaksi")
      .insert(payload)
      .select()
      .single();

    // 9. Jika satpam database (RLS / Check Constraint) menolak
    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: formatDbError(error),
        },
        { status: 500 },
      );
    }

    // 10. Jika sukses, kembalikan hasil ke layar frontend
    return NextResponse.json({
      success: true,
      parsed,
      transaksi: data,
      usedPayload: payload,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi error pada server.",
      },
      { status: 500 },
    );
  }
}
