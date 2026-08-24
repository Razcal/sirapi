-- Fondasi sistem peran (peternak/petugas/admin) + validasi pendaftaran.
-- Jalankan sekali di Supabase Dashboard > SQL Editor > New query > Run.
-- Aman dijalankan berkali-kali (IF NOT EXISTS).

-- role: menentukan jenis akun. Baru dipakai aktif oleh aplikasi peternak
-- sekarang (semua default 'peternak') — akun petugas/admin akan dibuat
-- lewat panel admin di fase berikutnya, bukan lewat form daftar biasa
-- (supaya orang tidak bisa daftar sebagai admin sendiri).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'peternak';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('peternak', 'petugas', 'admin'));

-- status: default 'approved' supaya (a) SEMUA akun yang sudah ada sekarang
-- otomatis dianggap disetujui — tidak ada yang tiba-tiba terkunci, dan
-- (b) akun yang dibuat admin lewat panel nanti (petugas/admin) langsung
-- aktif tanpa perlu approve diri sendiri. Kode aplikasi yang secara
-- eksplisit mengisi 'pending' saat peternak mendaftar sendiri.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
