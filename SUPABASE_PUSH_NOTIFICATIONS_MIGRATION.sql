-- Migrasi untuk mendukung notifikasi push native (APK/FCM), bukan cuma Web Push.
-- Jalankan sekali di Supabase Dashboard > SQL Editor > New query > Run.
-- Aman dijalankan berkali-kali (IF NOT EXISTS / DROP POLICY IF EXISTS).

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Ditemukan lewat rekaman layar HP sungguhan: p256dh/auth wajib diisi
-- (NOT NULL) di skema asli — itu spesifik Web Push, baris dari APK/FCM
-- tidak pernah punya nilai itu. Jadikan nullable.
ALTER TABLE push_subscriptions ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN auth DROP NOT NULL;

-- Ditemukan saat testing: tabel push_subscriptions kosong sejak awal — RLS
-- aktif tapi sepertinya tidak ada policy INSERT yang benar, jadi baik web
-- push maupun native push SAMA-SAMA gagal disimpan untuk siapa pun selama
-- ini (error: "new row violates row-level security policy"). Pengguna
-- boleh kelola baris miliknya sendiri saja (dicocokkan lewat user_id).
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
