# Aktifkan "Masuk dengan Google"

Kodenya sudah lengkap dan aman (tombol otomatis menampilkan pesan "Belum
Tersedia" kalau langkah di bawah ini belum dikerjakan — tidak akan crash).
Yang tersisa murni konfigurasi akun di luar kode, harus dikerjakan sendiri
karena butuh akses ke akun Google & Supabase kamu.

## 1. Google Cloud Console

1. Buka https://console.cloud.google.com/ → buat project baru (atau pakai yang sudah ada).
2. **APIs & Services → OAuth consent screen** — isi nama app "SIRAPI", email
   support, dst. Untuk penggunaan internal dinas, pilih User Type "Internal"
   kalau workspace-nya Google Workspace, atau "External" + tambahkan
   penguji kalau pakai Gmail biasa.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   buat **dua** client di project yang SAMA:

   **Client #1 — Web application**
   - Name: bebas, misal "SIRAPI Web"
   - Tidak perlu isi Authorized redirect URI untuk kebutuhan ini.
   - Setelah dibuat, copy **Client ID**-nya → ini yang dipakai sebagai
     `webClientId` (langkah 3 di bawah).

   **Client #2 — Android**
   - Package name: `com.sirapi.tuban`
   - SHA-1 certificate fingerprint — daftarkan **kedua-duanya** (device
     testing pakai debug, APK rilis pakai release):
     ```
     Debug   (emulator/HP saat development): DC:B4:CA:24:E6:74:DE:21:5A:92:04:45:F1:BB:80:D7:72:11:BB:35
     Release (APK final yang dibagikan):     CE:E6:67:4E:97:AD:69:56:40:3C:46:7D:A6:B3:98:FB:C1:D0:EB:0D
     ```
     (Kalau nanti keystore rilis diganti, generate ulang SHA-1-nya:
     `keytool -list -v -keystore android/app/sirapi-release.keystore -alias sirapi`)
   - Client Android ini tidak perlu di-copy Client ID-nya ke mana pun — Android
     OS otomatis mencocokkan berdasarkan package name + SHA-1 saat sign-in.

## 2. Supabase Dashboard

1. Project kamu → **Authentication → Providers → Google**.
2. Aktifkan (toggle ON).
3. Isi **Client ID** dan **Client Secret** — ambil dari Client #1 (Web
   application) di atas, bukan yang Android.
4. Save.

## 3. Tempel Client ID ke kode

Buka [src/core/constants.js](src/core/constants.js), ganti:
```js
export const GOOGLE_WEB_CLIENT_ID = "ISI_DENGAN_WEB_CLIENT_ID_DARI_GOOGLE_CLOUD_CONSOLE";
```
dengan Client ID dari Client #1 (Web application) — bentuknya seperti
`xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`.

## 4. Build ulang & tes

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```
Install ke HP/emulator yang punya akun Google login (plugin ini pakai
Android Credential Manager — device wajib punya minimal 1 akun Google
tertaut), lalu coba tombol "Masuk dengan Google" di layar login.

**Yang terjadi saat pertama kali dipakai:** karena Google tidak pernah
mengirim nomor HP/kecamatan/desa, pengguna baru akan diminta melengkapi
data itu sekali (layar "Lengkapi data peternak") sebelum masuk ke
dashboard. Setelahnya cukup tap "Masuk dengan Google" saja.
