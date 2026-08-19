# SIRAPI — Paket Redesain + Laporan

Isi paket ini adalah berkas yang **berubah atau baru** dari proyek SIRAPI Anda.
Berkas lain (`src/core/analyzeCattle.js`, `authService.js`, `cattleService.js`,
`profileService.js`, `pushService.js`, `supabaseClient.js`, `constants.js`,
`helpers.js`, `api/`, `android/`) **tidak disentuh sama sekali** — logika
reproduksi, autentikasi, dan koneksi Supabase persis seperti sebelumnya.

## Cara memasang

```bash
cd /Users/SIRAPI
git checkout -b redesain          # cadangan, supaya gampang dibatalkan
# salin isi paket ini menimpa proyek, lalu:
npm install @capacitor/app        # untuk tombol kembali Android
npm uninstall recharts @reduxjs/toolkit react-redux
npm run dev
```

Uji perhitungan laporan (tidak butuh browser):

```bash
node src/core/analytics.test.mjs   # 42 pemeriksaan
```

## Berkas baru

| Berkas | Isi |
|---|---|
| `src/styles/design-system.css` | Token warna, tipografi, spasi, komponen, latar aurora, gaya Laporan & Rewind. |
| `src/core/analytics.js` | Mesin analitik: ekstraksi kejadian, S/C, angka keberhasilan IB, jarak antar kelahiran, hari aktif, rentetan, deret grafik. |
| `src/core/analytics.test.mjs` | 42 pemeriksaan untuk mesin analitik. Jalankan dengan `node`, tanpa framework. |
| `src/core/components/Charts.jsx` | Grafik SVG murni: batang, area, peta panas, meter, daftar batang. Tanpa pustaka grafik. |
| `src/core/components/Laporan.jsx` | Layar Laporan: mingguan, bulanan, tahunan, sepanjang waktu. |
| `src/core/components/Rewind.jsx` | Rangkuman tahunan berupa kartu yang di-swipe. |
| `src/core/components/Hero.jsx` | Latar aurora untuk splash, sambutan, masuk, dan kartu sapaan. |
| `src/core/components/Icons.jsx` | Satu set ikon garis konsisten. |
| `src/core/components/Donut.jsx` | Donat SVG murni, menggantikan Recharts. |

## Berkas yang berubah

`src/App.jsx`, `src/AuthScreen.jsx`, `src/index.css`, `index.html`,
`vite.config.js`, `public/manifest.json`, `public/icons/*`,
`src/assets/logo-tuban.png`, `package.json`.

## Perubahan navigasi

Tab **Akademi** diganti **Laporan**. Isi Akademi (jadwal kelas daring dan
materi) tidak dihapus — pindah ke **Profil > Bantuan > Kelas & materi**.
Alasannya: Akademi masih sepenuhnya placeholder, sedangkan Laporan dipakai
tiap minggu.

## Cara membaca angka laporannya

| Metrik | Artinya | Ideal |
|---|---|---|
| **Service per Conception (S/C)** | Rata-rata berapa kali IB sampai satu sapi bunting | 1,5–2,0× |
| **Angka keberhasilan IB** | Persen pemeriksaan kebuntingan yang positif | minimal 60% |
| **Jarak antar kelahiran** | Rata-rata jarak dari satu kelahiran ke kelahiran berikutnya pada ekor yang sama | 365–400 hari |
| **Hari aktif** | Berapa hari berbeda yang ada catatannya | makin banyak makin baik |
| **Rentetan** | Minggu berturut-turut yang ada catatannya | — |

Angka ideal mengacu pada rujukan yang sama dengan mesin analisa yang sudah ada
(Noakes et al., 2019).

**Penting:** kalau datanya belum cukup, angkanya ditampilkan sebagai tanda strip
dengan label "Data kurang" — bukan angka nol. Ini disengaja: nol yang terlihat
pasti lebih berbahaya daripada tanda strip yang jujur.

## Angka bundel (diukur dengan kode asli)

| | Sebelum redesain | Sesudah, dengan Laporan |
|---|---|---|
| Unduhan sebelum layar pertama | 215 KB gzip | **190 KB gzip** |
| Jumlah potongan | 1 | 6 (bisa di-cache terpisah) |

Seluruh fitur laporan — mesin analitik, lima jenis grafik, dan Rewind —
menambah sekitar **9,5 KB gzip**, karena grafiknya digambar sendiri dengan SVG
alih-alih memakai pustaka grafik.

## Dua tempat yang perlu Anda isi sendiri

1. **`src/App.jsx` → `KELAS_DARING`** — tautan Zoom masih kosong dan tombolnya
   sengaja dinonaktifkan. Isi `tautan` lalu ubah `aktif: true`.
2. **`src/App.jsx` → `PETUGAS_WA`** — nomor WhatsApp petugas, sekarang cuma di
   satu tempat.

## Yang masih perlu dikerjakan di luar tampilan

- Cek kebijakan RLS tabel `users` di Supabase (lihat laporan tinjauan pertama).
- Verifikasi kata sandi sebaiknya pindah ke sisi server.
