-- Menambah kolom laporanPetugasLog yang dipakai fitur "Sudah menghubungi
-- petugas" (analyzeCattle.js, App.jsx) — ditemukan lewat error 42703
-- ("column cattle.laporanPetugasLog does not exist") saat menguji fitur
-- ini langsung di HP, persis seperti kasus abortusLog sebelumnya.
--
-- Dampak SEBELUM migrasi ini dijalankan: begitu peternak menekan "Sudah
-- menghubungi petugas" dan mengisi keterangan, tampilan di HP sempat
-- terlihat berhasil (state lokal berubah duluan, warna kotak sempat
-- tampak turun ke kuning) tapi penyimpanan ke server GAGAL diam-diam —
-- begitu aplikasi dimuat ulang, laporannya hilang dan warnanya balik
-- merah lagi.
--
-- Tipe kolom: array tanggal+catatan (jsonb), sama pola dengan kolom log
-- lain yang sudah ada (healthLog, ibLog, dst).
--
-- Cara pakai: Supabase → SQL Editor → tempel → Run.

alter table cattle
  add column if not exists "laporanPetugasLog" jsonb not null default '[]'::jsonb;
