-- PERBAIKAN BUG: peternak baru gagal menambah sapi baru.
--
-- Penyebab: kolom cattle.code (kode/tag sapi, misal "L-01") punya UNIQUE
-- constraint GLOBAL untuk seluruh kabupaten (cattle_code_key) — bukan unik
-- per peternak. Begitu ada DUA peternak berbeda yang sama-sama memakai kode
-- sederhana seperti "L-01", "SAPI-1", atau "01" (sangat umum, karena banyak
-- peternak menomori sapinya dengan pola serupa), peternak yang mendaftarkan
-- belakangan akan gagal simpan dengan error database mentah — di aplikasi
-- cuma terlihat seperti "tidak bisa tambah ternak", tanpa penjelasan.
--
-- Perbaikan: ganti jadi unik PER PETERNAK (kombinasi user_id + code), bukan
-- unik untuk semua orang. Peternak lain boleh pakai kode yang sama persis;
-- yang tetap dicegah cuma satu peternak mendaftarkan kode yang sama dua kali.
--
-- Cara pakai: buka Supabase → project SIRAPI → SQL Editor → tempel semua
-- isi berkas ini → Run. Aman dijalankan berkali-kali.

alter table cattle drop constraint if exists cattle_code_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cattle_user_code_key'
  ) then
    alter table cattle add constraint cattle_user_code_key unique (user_id, code);
  end if;
end $$;
