import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname; // Mengambil alamat URL saat ini

  // 1. DAFTAR HALAMAN YANG DIGEMBOK (Silakan tambah sesuai kebutuhan)
  const protectedRoutes = ["/dashboard", "/transaksi", "/buku-kas", "/ai-asisten"];

  // 2. Mengecek apakah URL saat ini ada di dalam daftar gembok
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  // 3. Mengecek apakah URL saat ini adalah halaman login/register
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");

  // 4. Jika mencoba masuk area gembok TAPI belum login -> Tendang ke Login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 5. Jika SUDAH login TAPI iseng buka halaman login/register -> Arahkan ke Dashboard
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Biarkan matcher ini menyapu bersih (mengecek semua halaman)
  // KECUALI file statis sistem Next.js dan gambar agar loading tetap ngebut
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
