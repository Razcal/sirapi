# Mulai di sini

Berkas ini ditulis saat pekerjaan dipindahkan dari sesi Claude ke VS Code.
Semua hasil redesain + fitur Laporan ada di folder `_paket-redesain/sirapi-redesign/`.
**Belum ada satu pun berkas asli Anda yang diubah.**

---

## 1. Lihat dulu hasilnya

Buka `_paket-redesain/_laporan-redesain.html` di browser — isinya perbandingan
sebelum/sesudah tiap layar, penjelasan design system, dan dua bab tentang
fitur Laporan & Rewind.

## 2. Sebelum menerapkan: rapikan git dulu

Ini yang paling penting untuk kerja di VS Code.

Saat ini **14.174 dari 14.277 berkas yang dilacak git adalah `node_modules/`** —
99,3% isi repo Anda. Akibatnya:

- tiap `npm install` memunculkan ribuan berkas berubah di panel Source Control;
- diff redesain ini bakal tenggelam di antara ribuan berkas dependensi;
- `.git` sudah 86 MB dan akan terus membengkak;
- pindah branch jadi lambat dan rawan konflik.

Perbaikannya sekali jalan (berkasnya **tetap ada di disk**, cuma berhenti dilacak):

```bash
cd /Users/SIRAPI

printf '\nnode_modules\ndist\n.DS_Store\n_paket-redesain\n' >> .gitignore

git rm -r --cached node_modules dist --quiet
git add .gitignore
git commit -m "Berhenti melacak node_modules dan dist"
```

Setelah ini, panel Source Control di VS Code cuma menampilkan berkas yang
benar-benar Anda tulis.

## 3. Menerapkan redesainnya

```bash
cd /Users/SIRAPI
git checkout -b redesain

cp -R _paket-redesain/sirapi-redesign/. .

npm install @capacitor/app
npm uninstall recharts @reduxjs/toolkit react-redux

npm run dev
```

Lalu di VS Code buka panel **Source Control** — diff-nya akan terlihat rapi
per berkas, dan Anda bisa menolak bagian yang tidak disukai sebelum commit.

Batalkan semuanya kapan saja dengan:

```bash
git checkout main && git branch -D redesain
```

## 4. Uji perhitungan laporan

Tidak butuh browser, tidak butuh framework:

```bash
node src/core/analytics.test.mjs     # 42 pemeriksaan
```

## 5. Dua tempat yang perlu Anda isi

| Di mana | Apa |
|---|---|
| `src/App.jsx` → `KELAS_DARING` | Tautan Zoom masih kosong; tombolnya sengaja dinonaktifkan sampai diisi. Isi `tautan`, lalu ubah `aktif: true`. |
| `src/App.jsx` → `PETUGAS_WA` | Nomor WhatsApp petugas. Sekarang cuma di satu tempat (dulu tersebar di tiga berkas). |

## 6. Satu hal yang belum tersentuh dan paling perlu dicek

**Kebijakan RLS tabel `users` di Supabase.**

`authService.login()` menjalankan `supabase.from("users").select("*")` dengan
anon key — menarik seluruh baris termasuk `password_hash` ke browser, lalu
membandingkannya dengan `bcrypt.compare()` di sisi klien.

Ada dua kemungkinan, dan keduanya perlu Anda periksa langsung di dashboard
Supabase:

1. Kalau RLS-nya seketat yang tertulis di `SUPABASE_SETUP.md` (baca hanya profil
   sendiri lewat `auth.uid()`), query itu **tidak mungkin berhasil** untuk
   pengunjung yang belum login — artinya jalur login cadangan itu sebenarnya patah.
2. Kalau ternyata berhasil, berarti RLS-nya terbuka: siapa pun yang punya anon key
   (yang memang tertanam di bundel JS) bisa menarik seluruh daftar email, nomor HP,
   dan hash password peternak.

Ini di luar cakupan redesain tampilan, tapi yang paling perlu dibereskan sebelum
aplikasi dipakai lebih luas. Minimal: ganti `select("*")` jadi kolom seperlunya,
dan jangan pernah menarik `password_hash` ke klien. Idealnya, verifikasi kata
sandi pindah ke sisi server.

---

## Ringkasan berkas

**Baru:**

```
src/core/analytics.js               mesin analitik laporan
src/core/analytics.test.mjs         42 pemeriksaan
src/core/components/Charts.jsx      grafik SVG (batang, area, peta panas, meter)
src/core/components/Laporan.jsx     layar Laporan
src/core/components/Rewind.jsx      Rewind tahunan
src/core/components/Hero.jsx        latar aurora
src/core/components/Icons.jsx       set ikon
src/core/components/Donut.jsx       donat SVG (pengganti Recharts)
src/styles/design-system.css        token & komponen
```

**Berubah:** `src/App.jsx`, `src/AuthScreen.jsx`, `src/index.css`, `index.html`,
`vite.config.js`, `public/manifest.json`, `public/icons/*`,
`src/assets/logo-tuban.png`, `package.json`.

**Tidak disentuh sama sekali:** `src/core/analyzeCattle.js`, `authService.js`,
`cattleService.js`, `profileService.js`, `pushService.js`, `supabaseClient.js`,
`constants.js`, `helpers.js`, `api/`, `android/`.
