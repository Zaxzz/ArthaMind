create table aset (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  nama_aset text not null,
  kategori text,
  nilai_perolehan numeric not null,
  akumulasi_penyusutan numeric default 0,
  tanggal_perolehan date
);

-- Nilai buku bisa dihitung langsung saat query:
-- select *, (nilai_perolehan - akumulasi_penyusutan) as nilai_buku from aset;
