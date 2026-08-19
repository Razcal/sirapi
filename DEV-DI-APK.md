# Develop langsung di APK (emulator/HP), bukan browser

## Sekali per sesi kerja
```bash
# 1. Nyalakan emulator (kalau belum jalan)
emulator -avd Pixel_7_Pro &

# 2. Jalankan dev server
npm run dev &

# 3. Deploy ke emulator dengan live-reload
npx cap run android -l --host localhost --port 5173 --forwardPorts 5173:5173
```

Setelah baris ke-3 jalan (muncul "App running with live reload..."),
biarkan terminal itu terbuka. Semua perubahan kode di `src/` langsung
kelihatan di emulator lewat Hot Module Replacement Vite — tidak perlu
`npm run build` atau reinstall APK berulang-ulang.

## Pakai HP fisik, bukan emulator
1. Aktifkan "USB debugging" di HP (Setelan > Opsi Pengembang).
2. Sambungkan lewat kabel USB, izinkan saat muncul prompt di HP.
3. Cek `adb devices` — HP harus muncul di daftar.
4. Jalankan langkah 2-3 di atas, tambahkan `--target <device-id>` kalau
   ada lebih dari satu device/emulator tersambung.

## Kalau mau build APK sungguhan (bukan mode dev)
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug     # untuk testing
cd android && ./gradlew assembleRelease   # APK final (perlu keystore.properties)
```
