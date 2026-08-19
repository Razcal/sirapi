import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Sebelumnya seluruh aplikasi keluar sebagai satu berkas 674 KB. Dipecah
    // supaya pustaka besar (chart, supabase, bcrypt) bisa di-cache browser dan
    // tidak ikut diunduh ulang tiap kali kode aplikasi berubah — penting untuk
    // pengguna di pedesaan dengan sinyal seadanya.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          crypto: ['bcryptjs'],
          image: ['html-to-image'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
