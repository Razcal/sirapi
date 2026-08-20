-- Migrasi untuk mendukung notifikasi push native (APK/FCM), bukan cuma Web Push.
-- Jalankan sekali di Supabase Dashboard > SQL Editor > New query > Run.
-- Aman dijalankan berkali-kali (IF NOT EXISTS).

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS fcm_token TEXT;
