import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Tidak pakai react-router — cuma satu percabangan sederhana, tidak perlu
// bawa library router ke aplikasi peternak yang sepenuhnya berbasis state
// (bukan URL). AdminApp di-lazy-load supaya jadi chunk terpisah — tidak
// ikut membengkakkan bundle APK peternak yang tidak pernah butuh kode ini
// (WebView Capacitor memuat dari aset lokal, tidak pernah ke path /admin).
const AdminApp = lazy(() => import('./AdminApp.jsx'));
const isAdminRoute = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute
      ? <Suspense fallback={null}><AdminApp /></Suspense>
      : <App />}
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
