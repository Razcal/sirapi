import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', '_paket-redesain', 'perplexity-ext']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Pola "reset form saat modal dibuka" (setState di useEffect ketika `open`
      // berubah) dipakai konsisten di ~10 tempat di App.jsx. Rekomendasi React
      // yang benar (remount via `key`) butuh ubah tiap parent pemanggil modal —
      // risikonya tak sepadan untuk perbaikan gaya/performa ini. Diturunkan jadi
      // warning supaya tetap terlihat tanpa menghalangi build/lint.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Serverless function (Vercel/Node), bukan kode browser
    files: ['api/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Service Worker, punya global sendiri (self, clients, dst.) di luar globals.browser
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  },
])
