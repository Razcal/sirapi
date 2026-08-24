import type { CapacitorConfig } from '@capacitor/cli';

// APK terpisah untuk petugas lapangan (beda ikon/nama dari APK peternak,
// analog GoPartner vs Gojek). Sengaja TIDAK membundel dist/ secara offline
// seperti APK peternak — server.url membuat WebView memuat langsung dari
// web (https://proverti.vercel.app/petugas), supaya tidak perlu pipeline
// build Vite terpisah. Konsekuensinya: aplikasi ini wajib online untuk
// dibuka sama sekali (tidak ada shell offline) — trade-off yang wajar
// untuk alat kerja internal petugas, bukan aplikasi publik.
const config: CapacitorConfig = {
  appId: 'com.sirapi.petugas',
  appName: 'SIRAPI Petugas',
  webDir: '../dist',
  server: {
    url: 'https://proverti.vercel.app/petugas',
    cleartext: false,
  },
};

export default config;
