import { createBrowserClient } from "@supabase/ssr";

// Mengambil URL dan Key dari file .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Membuat alat komunikasi Supabase khusus untuk Browser yang otomatis menyimpan ke Cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
