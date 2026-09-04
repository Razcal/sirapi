-- PERBAIKAN BUG: menyalakan notifikasi selalu gagal dengan pesan
-- "new row violates row-level security policy for table push_subscriptions".
--
-- Penyebab: kebijakan RLS tabel ini mensyaratkan auth.uid() = user_id —
-- itu cuma berlaku untuk sesi Supabase Auth ASLI. Tapi mayoritas akun
-- peternak di SIRAPI login lewat jalur cadangan (bcrypt, lihat catatan
-- di authService.js), BUKAN sesi Supabase Auth asli — jadi auth.uid()
-- selalu NULL untuk mereka, dan kebijakan INSERT/UPDATE/DELETE ini
-- selalu menolak siapa pun yang mencoba menyalakan notifikasi.
--
-- Perbaikan: matikan RLS di tabel ini, konsisten dengan tabel users dan
-- cattle yang juga sudah tidak dikunci ketat karena alasan arsitektur
-- yang sama (lihat catatan di adminService.js).
--
-- Cara pakai: buka Supabase → project SIRAPI → SQL Editor → tempel semua
-- isi berkas ini → Run. Aman dijalankan berkali-kali.

alter table push_subscriptions disable row level security;
