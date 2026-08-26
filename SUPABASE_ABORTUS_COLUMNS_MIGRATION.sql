-- Menambah dua kolom yang sudah lama dipakai kode reproduksi
-- (analyzeCattle.js, App.jsx) tapi ternyata belum pernah benar-benar
-- dibuat di tabel `cattle` — ditemukan lewat error 42703 ("column
-- cattle.abortusLog does not exist") saat membangun grafik tren di
-- panel admin.
--
-- Dampak bug ini SEBELUM migrasi ini dijalankan: kalau peternak/petugas
-- mencatat kejadian keguguran (abortus) lewat aplikasi, penyimpanan ke
-- database kemungkinan besar GAGAL (kolom tak dikenal), meski tampilan
-- di HP sempat terlihat berhasil sesaat sebelum error.
--
-- Tipe kolom disamakan dengan pola kolom sejenis yang sudah ada:
--   abortusDate  seperti calvingDate/conceptionDate — tanggal disimpan
--                sebagai teks "YYYY-MM-DD" (bukan tipe date bawaan
--                Postgres), supaya tidak kena masalah pergeseran zona
--                waktu yang sudah pernah dibenahi di kode lain.
--   abortusLog   seperti calvingLog — daftar tanggal (jsonb array).
--
-- Cara pakai: Supabase → SQL Editor → tempel → Run.

alter table cattle
  add column if not exists "abortusDate" text,
  add column if not exists "abortusLog" jsonb not null default '[]'::jsonb;
