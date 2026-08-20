# Aktifkan notifikasi push di APK (Firebase Cloud Messaging)

## Kenapa perlu ini
Notifikasi yang sudah ada sebelumnya (Web Push/VAPID) **tidak berfungsi sama
sekali di APK** — sudah dites langsung: di dalam WebView Capacitor,
`PushManager` dan `Notification` tidak tersedia di browser embednya. Ini
bukan bug yang bisa diperbaiki dari sisi kode SIRAPI — WebView memang tidak
mendukung Web Push API, titik. Satu-satunya cara notifikasi jalan di APK
adalah lewat FCM (Firebase Cloud Messaging), sistem notifikasi native
Android.

Kode untuk ini **sudah lengkap** (plugin terpasang, wiring token, backend
siap kirim ke FCM). Yang tersisa murni konfigurasi akun Firebase — 3
langkah, ~10 menit.

## 1. Buat project Firebase (pakai project Google Cloud yang sudah ada!)
1. Buka https://console.firebase.google.com/
2. Klik **Add project**
3. Di langkah "Enter your project name", pilih opsi **"or add Firebase to
   an existing Google Cloud project"** kalau muncul, lalu pilih project
   **SIRAPI** yang sudah dibuat untuk Google Sign-In — supaya tidak
   berceceran jadi 2 project terpisah. Kalau opsi itu tidak muncul, buat
   project Firebase baru dengan nama bebas juga tidak masalah.
4. Lanjutkan sampai selesai (Google Analytics boleh dimatikan, tidak perlu).

## 2. Daftarkan app Android + download google-services.json
1. Di dashboard Firebase project itu, klik ikon **Android** (＋Add app)
2. **Android package name**: `com.sirapi.tuban` (harus persis sama)
3. App nickname: bebas ("SIRAPI")
4. SHA-1: boleh dikosongkan (tidak wajib untuk FCM, beda dengan Google Sign-In)
5. Klik **Register app**
6. **Download `google-services.json`**
7. Taruh file itu persis di: `android/app/google-services.json`
   (folder yang sama isi `build.gradle`-nya `android/app/`)
8. Lewati langkah "Add Firebase SDK" dan sisanya di wizard — sudah tercakup
   di kode, klik **Next** terus sampai **Continue to console**.

## 3. Buat Service Account key (untuk backend kirim notifikasi)
1. Di Firebase Console, klik ⚙️ (Project settings) → tab **Service accounts**
2. Klik **Generate new private key** → **Generate key** → sebuah file JSON
   otomatis terunduh
3. Buka file JSON itu, **copy seluruh isinya** (satu baris/blok JSON utuh)
4. Simpan sebagai environment variable di Vercel (tempat `api/` di-deploy):
   - Buka project di vercel.com → Settings → Environment Variables
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: tempel seluruh isi JSON tadi
   - Save, lalu **redeploy** project (env var baru cuma berlaku setelah deploy ulang)

## 4. Migrasi database (sekali saja)
Jalankan `SUPABASE_PUSH_NOTIFICATIONS_MIGRATION.sql` di Supabase Dashboard >
SQL Editor (file-nya sudah ada di root project ini, tinggal copy-paste isinya
dan klik Run).

## 5. Build ulang APK
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease   # atau assembleDebug untuk testing
```
(`google-services.json` di langkah 2 baru benar-benar dipakai saat build APK
ini — build web/`npm run dev` tidak terpengaruh sama sekali.)

## Setelah semua langkah di atas
- Buka APK → Profil → nyalakan **Notifikasi harian** → izinkan notifikasi.
- Cron harian (jam 09:00 WIB, lihat `vercel.json`) akan otomatis kirim ke
  token FCM yang tersimpan, sekaligus tetap mengirim ke pengguna web/PWA
  lewat jalur Web Push seperti biasa — dua-duanya jalan bersamaan, saling
  tidak mengganggu.
- Test manual (tanpa nunggu jam 09:00): panggil endpoint-nya langsung
  dengan header `Authorization: Bearer <CRON_SECRET>`, misalnya lewat
  `curl -H "Authorization: Bearer <isi CRON_SECRET dari Vercel>" https://<domain-vercel-kamu>/api/send-daily-notifications`

## Kalau belum sempat setup ini
Aplikasi tetap jalan normal tanpanya — toggle "Notifikasi harian" di APK
akan menampilkan pesan error yang jelas ("belum dikonfigurasi admin") kalau
dicoba sebelum langkah di atas selesai, bukan crash. Pengguna web/PWA tetap
dapat notifikasi seperti biasa tanpa terpengaruh sama sekali.
