import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Tidak pakai react-router — cuma percabangan sederhana, tidak perlu bawa
// library router ke aplikasi peternak yang sepenuhnya berbasis state
// (bukan URL). AdminApp/PetugasApp di-lazy-load supaya jadi chunk terpisah
// — tidak ikut membengkakkan bundle APK peternak yang tidak pernah butuh
// kode ini (WebView Capacitor memuat dari aset lokal, tidak pernah ke
// path /admin atau /petugas).
const AdminApp = lazy(() => import('./AdminApp.jsx'));
const PetugasApp = lazy(() => import('./PetugasApp.jsx'));
const path = window.location.pathname;

let RouteApp = App;
if (path.startsWith('/admin')) RouteApp = AdminApp;
else if (path.startsWith('/petugas')) RouteApp = PetugasApp;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {RouteApp === App
      ? <App />
      : <Suspense fallback={null}><RouteApp /></Suspense>}
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
