"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HandCoins,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  PlusCircle,
  X,
  User,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nama_usaha: "",
    nama_pemilik: "",
    jenis_usaha: "",
  });

  const [errors, setErrors] = useState({
    jenis_usaha: "",
  });

  useEffect(() => {
    if (profileMenuOpen) {
      fetchUserProfile();
    }
  }, [profileMenuOpen]);

  async function fetchUserProfile() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setUserProfile(data);
        setFormData({
          nama_usaha: data.nama_usaha || "",
          nama_pemilik: data.nama_pemilik || "",
          jenis_usaha: data.jenis_usaha || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setErrors((prev) => ({
      ...prev,
      [e.target.name]: "",
    }));
  }

  async function handleSave() {
    let hasError = false;
    let newErrors = {};

    if (!formData.jenis_usaha) {
      newErrors.jenis_usaha = "Jenis usaha wajib dipilih";
      hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const desktopMenuClass = (path) =>
    pathname === path || pathname.startsWith(`${path}/`)
      ? "px-4 py-2 rounded-2xl bg-zinc-900 text-white text-sm inline-flex items-center gap-2"
      : "px-4 py-2 rounded-2xl border border-zinc-300 text-sm hover:bg-zinc-100 transition inline-flex items-center gap-2";

  const mobileMenuClass = (path) =>
    pathname === path || pathname.startsWith(`${path}/`)
      ? "block w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-2 bg-zinc-900 text-white font-medium"
      : "block w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-2 hover:bg-zinc-100 transition";

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/hutang-piutang", icon: HandCoins, label: "Hutang Piutang" },
    { href: "/transaksi", icon: PlusCircle, label: "Transaksi" },
    { href: "/aset", icon: Landmark, label: "Aset" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-20 h-20 flex items-center justify-between">
        {/* LOGO */}
        <Link href="/dashboard">
          <h1 className="text-2xl font-semibold tracking-tight">
            Artha<span className="text-zinc-400">Mind</span>
          </h1>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={desktopMenuClass(item.href)}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="px-4 py-2 rounded-2xl border text-sm inline-flex items-center gap-2"
            >
              <User size={16} />
              Profil
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border shadow-lg">
                {loading ? (
                  <div className="p-4 text-center text-sm">Memuat...</div>
                ) : userProfile ? (
                  <div className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <Input
                          label="Nama Usaha"
                          name="nama_usaha"
                          value={formData.nama_usaha}
                          onChange={handleChange}
                        />
                        <Input
                          label="Nama Pemilik"
                          name="nama_pemilik"
                          value={formData.nama_pemilik}
                          onChange={handleChange}
                        />

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">
                            Jenis Usaha
                          </p>
                          <select
                            name="jenis_usaha"
                            value={formData.jenis_usaha}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              errors.jenis_usaha
                                ? "border-red-500"
                                : "border-zinc-300"
                            }`}
                          >
                            <option value="">Pilih jenis usaha</option>
                            <option value="dagang">Dagang</option>
                            <option value="jasa">Jasa</option>
                            <option value="manufaktur">Manufaktur</option>
                          </select>

                          {errors.jenis_usaha && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.jenis_usaha}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm"
                          >
                            {loading ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-zinc-100 py-2 rounded-lg text-sm"
                          >
                            Batal
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Display
                          label="Nama Usaha"
                          value={userProfile.nama_usaha}
                        />
                        <Display
                          label="Nama Pemilik"
                          value={userProfile.nama_pemilik}
                        />
                        <Display
                          label="Jenis Usaha"
                          value={userProfile.jenis_usaha}
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleLogout}
                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm"
                          >
                            Keluar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm">Tidak ada data</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE BURGER BUTTON */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 border rounded-lg hover:bg-zinc-100 transition"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-zinc-100 px-4 py-3 space-y-2 max-h-screen overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={mobileMenuClass(item.href)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <div className="border-t border-zinc-200 pt-3 mt-3 space-y-2">
            <button
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
              }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-2 hover:bg-zinc-100 transition"
            >
              <User size={18} />
              Profil
            </button>

            {profileMenuOpen && (
              <div className="mt-2 bg-white rounded-lg border px-3 py-3 space-y-3">
                {loading ? (
                  <div className="p-4 text-center text-sm">Memuat...</div>
                ) : userProfile ? (
                  <>
                    {isEditing ? (
                      <>
                        <Input
                          label="Nama Usaha"
                          name="nama_usaha"
                          value={formData.nama_usaha}
                          onChange={handleChange}
                        />
                        <Input
                          label="Nama Pemilik"
                          name="nama_pemilik"
                          value={formData.nama_pemilik}
                          onChange={handleChange}
                        />

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">
                            Jenis Usaha
                          </p>
                          <select
                            name="jenis_usaha"
                            value={formData.jenis_usaha}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              errors.jenis_usaha
                                ? "border-red-500"
                                : "border-zinc-300"
                            }`}
                          >
                            <option value="">Pilih jenis usaha</option>
                            <option value="dagang">Dagang</option>
                            <option value="jasa">Jasa</option>
                            <option value="manufaktur">Manufaktur</option>
                          </select>

                          {errors.jenis_usaha && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.jenis_usaha}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm"
                          >
                            {loading ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-zinc-100 py-2 rounded-lg text-sm"
                          >
                            Batal
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Display
                          label="Nama Usaha"
                          value={userProfile.nama_usaha}
                        />
                        <Display
                          label="Nama Pemilik"
                          value={userProfile.nama_pemilik}
                        />
                        <Display
                          label="Jenis Usaha"
                          value={userProfile.jenis_usaha}
                        />

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleLogout}
                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm"
                          >
                            Keluar
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-sm">Tidak ada data</div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 transition border-t border-zinc-200 mt-3"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      )}
    </header>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      {label && <p className="text-xs text-zinc-500 mb-1">{label}</p>}
      <input
        {...props}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </div>
  );
}

function Display({ label, value }) {
  return (
    <div className="pb-2 border-b">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}
