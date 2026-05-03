import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { parseDebtInput } from "@/utils/parseDebtInput";

export async function POST(request) {
  try {
    const { rawText, source } = await request.json();

    if (!rawText) {
      return NextResponse.json(
        { success: false, message: "Teks input wajib diisi." },
        { status: 400 },
      );
    }

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

    const parsed = await parseDebtInput(rawText, source);

    return NextResponse.json({
      success: true,
      parsed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi error pada server.",
      },
      { status: 500 },
    );
  }
}
