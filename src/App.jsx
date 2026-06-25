import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toPng } from "html-to-image";
import { AuthScreen } from "./AuthScreen";
import { DialogSystem } from "./core/components/SharedUI";
import { supabase } from "./core/supabaseClient";
import logoTuban from "./Tubankab.png";

/*
  ========================================
  1. GLOBAL STYLE & THEME - SIRAPI EDITION
  ========================================
*/
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    
    * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
    body { background-color: #f8fafc; color: #0f172a; -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width: 0px; } 
    
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .slide-up { animation: slideUp 0.4s cubic-bezier(.17,.67,.21,1); }
    .pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    
    /* MODERNISED NAV-BAR */
    .nav-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(250, 246, 236, 0.95); backdrop-filter: blur(16px); border-top: 1px solid #e8dfc8; display: flex; justify-content: space-around; padding: 12px 0 max(12px, env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 32px rgba(0,0,0,0.06); }
    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #94a3b8; font-weight: 800; gap: 6px; transition: all 0.3s ease; width: 20%; }
    .nav-item.active { color: #15803d; }

    .nav-icon { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
    .nav-item.active .nav-icon { transform: translateY(-3px) scale(1.1); filter: drop-shadow(0 4px 6px rgba(21,128,61,0.3)); }

    .timeline-line { width: 2px; background: #f1f5f9; position: absolute; top: 14px; bottom: 10px; left: 3px; }
    .timeline-item:last-child .timeline-line { display: none; }
    
    .timeline-main-line { position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: #f1f5f9; z-index: 0; }
    .timeline-main-item { position: relative; padding-left: 56px; padding-bottom: 24px; z-index: 10; }
    .timeline-main-icon { position: absolute; left: 10px; top: 0; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; z-index: 20; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    
    select, input, textarea { appearance: none; -webkit-appearance: none; transition: all 0.2s; }
    select:focus, input:focus, textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

    .splash-container { position: fixed; inset: 0; background: linear-gradient(160deg, #15803d 0%, #064e3b 100%); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.6s ease; overflow: hidden; }
    .splash-logo-wrap { animation: splashLogoIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .splash-title { animation: splashFadeUp 0.6s ease-out 0.35s both; }
    .splash-subtitle { animation: splashFadeUp 0.6s ease-out 0.5s both; }
    .splash-loader { width: 36px; height: 3px; border-radius: 999px; background: rgba(255,255,255,0.15); overflow: hidden; position: relative; animation: splashFadeUp 0.6s ease-out 0.7s both; }
    .splash-loader::after { content: ''; position: absolute; inset: 0; width: 40%; background: #ffffff; border-radius: 999px; animation: splashLoaderSlide 1.1s ease-in-out infinite; }

    @keyframes splashLogoIn { from { opacity: 0; transform: scale(0.7) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes splashFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes splashLoaderSlide { 0% { left: -40%; } 100% { left: 100%; } }

    .highlight-blink {
      animation: highlight-blink-anim 1.5s ease-out 3;
      border-color: #10b981 !important;
    }

    @keyframes highlight-blink-anim {
      0%, 100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
      50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.4); }
    }
  `}</style>
);

/*
  ========================================
  2. CONSTANTS & HELPERS
  ========================================
*/
const todayStr = () => new Date().toISOString().split("T")[0];
const daysDiff = (a, b = new Date()) => Math.floor((new Date(b) - new Date(a)) / 86400000);
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }); } 
  catch(e) { return "-"; }
};

const getAge = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const m = Math.floor(daysDiff(dateStr) / 30);
    if (isNaN(m)) return "-";
    const y = Math.floor(m / 12);
    const remM = m % 12;
    if (y > 0) return `${y} Thn ${remM} Bln`;
    return `${m} Bln`;
  } catch(e) { return "-"; }
};

const COLOR = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  orange: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  blue: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  violet: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  rose: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  slate: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" }
};

// Satu sumber kebenaran warna hex, sejajar dengan key COLOR di atas — dipakai
// di tempat yang butuh nilai hex mentah (misal Recharts), bukan class Tailwind.
const COLOR_HEX = {
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b"
};

// Ikon SVG kustom (bukan emoji) — dipakai di SmartEstrusCalendar & ActionModal.
// Emoji dihindari karena tampilannya berbeda-beda di tiap perangkat/OS dan
// beberapa konsep (sapi bunting, pedet) tidak punya emoji yang pas secara makna.
const ICON_TAG = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"></circle></svg>;
const ICON_HEART_FILLED = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>;
const ICON_HEART_OUTLINE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const ICON_ALERT_TRIANGLE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const ICON_REFRESH = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const ICON_SEARCH = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ICON_PIN = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>;

// UI COMPONENT BARU: IN-APP TOAST NOTIFICATION (PENGGANTI ALERT)
function ToastNotification({ message, type = "error", onClose }) {
  if (!message) return null;
  const bg = type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800";
  const icon = type === "error" ? "⚠️" : "✅";
  
  useEffect(() => {
    const timer = setTimeout(() => { onClose(); }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[9999] pop-in">
      <div className={`p-4 rounded-xl border font-bold text-sm shadow-lg flex items-start gap-3 ${bg}`}>
        <span>{icon}</span>
        <p className="flex-1 leading-snug pt-0.5">{message}</p>
        <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100">×</button>
      </div>
    </div>
  );
}

// UI COMPONENT BARU: IN-APP CONFIRMATION MODAL (PENGGANTI window.confirm)
function CustomConfirm({ open, title, message, onConfirm, onCancel, confirmText = "Ya", cancelText = "Batal", isDestructive = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 pop-in">
      <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl text-center">
        <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">{cancelText}</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className={`flex-1 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md ${isDestructive ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

/*
  ========================================
  3. LOGIC ENGINE KESEHATAN & REPRODUKSI
  ========================================
*/
function analyzeCattle(item) {
  if (!item) return { color: "slate", statusLabel: "ERROR", advice: "Data tidak valid", isUrgent: false, adviceColor: "text-slate-600 bg-slate-50" };

  try {
    const today = new Date();
    let res = { color: "slate", statusLabel: "", advice: "", isUrgent: false, adviceColor: "text-slate-600 bg-slate-50" };

    const birthDate = item.tanggal_lahir || item.birthDate;
    const gender = item.jenis_kelamin || item.gender;
    const phase = item.status_reproduksi || item.phase;

    const umurHari = birthDate ? daysDiff(birthDate) : 0;
    const isJantan = gender === "JANTAN";

    const activeIllness = (item.healthLog || []).find(h => h.status !== "SEMBUH");
    if (activeIllness) {
       res.isUrgent = true;
       if (activeIllness.status === "MENUNGGU_DOKTER") {
           res.statusLabel = "MENUNGGU DOKTER"; res.color = "orange";
           res.advice = `Gejala yang dilaporkan: ${activeIllness.gejala}. Segera hubungi tenaga medis untuk pemeriksaan lebih lanjut.`;
           res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm";
           res.needsVet = true;
       } else if (activeIllness.status === "DIRAWAT") {
           res.statusLabel = "DALAM PERAWATAN"; res.color = "rose";
           res.advice = `Diagnosa dokter: ${activeIllness.diagnosa}. Tindakan yang diberikan: ${activeIllness.tindakan}.`;
           res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm";
       }
       return res; 
    }

    if (isJantan) {
        if (umurHari < 180) { res.statusLabel = "PEDET JANTAN"; res.color = "violet"; res.advice = "Fokus pemberian susu dan pakan pemula (starter). Jaga kebersihan kandang untuk mencegah diare (scours)."; }
        else if (umurHari < 730) { res.statusLabel = "JANTAN BAKALAN"; res.color = "blue"; res.advice = "Fase penggemukan (feedlot). Tingkatkan porsi pakan konsentrat berenergi tinggi."; }
        else { res.statusLabel = "PEJANTAN DEWASA"; res.color = "emerald"; res.advice = "Bobot badan telah mencapai usia panen optimal. Siap dipasarkan atau dipertahankan sebagai pejantan pemacek."; }
        return res;
    }

    const daysOpen = item.calvingDate ? daysDiff(item.calvingDate) : 0;
    
    const logIBDates = [...(item.ibLog || [])].map(entry => {
        return typeof entry === 'object' ? entry.date : entry;
    }).sort((a,b) => new Date(a) - new Date(b));

    const lastIB = logIBDates.length > 0 ? logIBDates[logIBDates.length - 1] : null;
    const daysSinceLastIB = lastIB ? daysDiff(lastIB) : 0;

    let cycles = 1;
    let suspectSistaGap = 0;

    if (logIBDates.length > 1) {
      let tempLast = new Date(logIBDates[0]);
      for (let i = 1; i < logIBDates.length; i++) {
        const diff = Math.floor((new Date(logIBDates[i]) - tempLast) / 86400000);
        if (diff > 0 && diff < 18 && suspectSistaGap === 0) suspectSistaGap = diff;
        if (diff >= 18) cycles++;
        tempLast = new Date(logIBDates[i]);
      }
    }

    let hasIbAfterCalving = lastIB && (!item.calvingDate || new Date(lastIB) > new Date(item.calvingDate));

    if (phase === "ABORTUS_PENDING") {
      res.statusLabel = "LAPOR PETUGAS"; 
      res.color = "rose"; res.isUrgent = true; res.needsVet = true;
      res.advice = `Kondisi darurat: sapi mengalami keguguran (abortus). Segera laporkan ke petugas medis untuk penanganan dan pembersihan rahim guna mencegah Endometritis pasca-abortus.`;
      res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-black shadow-sm"; 
    }
    else if (phase === "CALF") {
      if (!item.calvingDate && umurHari > 1095) { res.statusLabel = "Gangguan Reproduksi: Belum Pernah Birahi"; res.color = "rose"; res.isUrgent = true; res.needsVet = true; res.advice = `Sapi dara berusia lebih dari 3 tahun belum pernah menunjukkan tanda birahi maupun menerima IB. Ini baru indikasi awal (suspect), diduga Anestrus akibat Hipoplasia Ovarium, gangguan hormonal, atau kekurangan nutrisi kronis — namun penyebab pasti belum dapat dipastikan tanpa pemeriksaan. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan ginekologi mendalam terhadap fungsi ovarium.`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (umurHari > 730) { res.statusLabel = "AWAS: DARA TERLAMBAT IB"; res.color = "orange"; res.isUrgent = true; res.advice = `Sapi dara berusia lebih dari 2 tahun belum pernah menerima IB. Usia ideal IB pertama adalah 18-24 bulan (Noakes et al., 2019). Amati tanda birahi secara rutin pagi dan sore. Jika belum pernah menunjukkan tanda birahi, laporkan ke petugas agar dilakukan pemeriksaan lebih lanjut terhadap fungsi ovarium.`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; }
      else if (umurHari >= 540) { res.statusLabel = "DARA SIAP KAWIN"; res.color = "emerald"; res.advice = `Usia ${Math.floor(umurHari/30)} bulan — usia ideal untuk IB pertama (18-24 bulan). Amati tanda birahi: gelisah, sering menaiki sapi lain, vulva membengkak dan kemerahan, serta keluar lendir bening dari vulva. Lakukan IB saat sapi menunjukkan birahi aktif.`; }
      else if (umurHari >= 365) { res.statusLabel = "DARA PRA-BIRAHI"; res.color = "violet"; res.advice = `Usia ${Math.floor(umurHari/30)} bulan. Pubertas pada sapi betina umumnya terjadi pada usia 6-12 bulan, namun IB pertama disarankan pada usia 18-24 bulan agar pertumbuhan tubuh optimal. Fokuskan pada pencapaian bobot badan ideal.`; }
      else { res.statusLabel = "DARA PERTUMBUHAN"; res.color = "blue"; res.advice = `Usia ${Math.floor(umurHari/30)} bulan. Masa pra-pubertas. Berikan pakan lengkap (hijauan dan konsentrat) untuk mencapai target pertumbuhan bobot badan ideal sebelum IB pertama.`; }
    } 
    else if (phase === "OPEN") {
      const daysSinceAbortus = item.abortusDate ? daysDiff(item.abortusDate) : 999;
      if (item.abortusDate && daysSinceAbortus <= 45) {
        res.statusLabel = "PEMULIHAN ABORTUS"; res.color = "rose"; res.isUrgent = true;
        res.advice = `Hari ke-${daysSinceAbortus} masa pemulihan rahim pasca keguguran. IB tidak boleh dilakukan sebelum rahim pulih sepenuhnya (kurang lebih 45 hari). Amati bila ada keputihan abnormal atau demam, lalu segera laporkan ke petugas — gejala tersebut dapat mengindikasikan Endometritis pasca-abortus yang perlu pemeriksaan lebih lanjut.`;
        res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm";
      }
      else if (item.calvingDate && daysOpen > 150 && !hasIbAfterCalving) { res.statusLabel = "Gangguan Reproduksi: Rahim Bermasalah"; res.color = "rose"; res.isUrgent = true; res.needsVet = true; res.advice = `Sapi kosong selama ${daysOpen} hari pasca melahirkan tanpa pernah menerima IB. Ini baru indikasi awal (suspect), kemungkinan Pyometra (penumpukan nanah dalam rahim akibat korpus luteum persisten) atau Anestrus berkepanjangan — bukan diagnosa pasti. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan rahim dan ovarium secara mendalam.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (item.calvingDate && daysOpen > 120) { res.statusLabel = "AWAS: KOSONG > 120 HARI"; res.color = "rose"; res.isUrgent = true; res.advice = `Sapi kosong selama ${daysOpen} hari pasca melahirkan. Idealnya jarak antar kelahiran (calving interval) tidak lebih dari 12-13 bulan. Segera laporkan ke petugas untuk evaluasi status nutrisi, kondisi tubuh, dan fungsi ovarium sapi secara mendalam.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (item.calvingDate && daysOpen > 60 && !hasIbAfterCalving) { res.statusLabel = "WASPADA: BIRAHI TERTUNDA"; res.color = "orange"; res.isUrgent = true; res.advice = `Sudah ${daysOpen} hari pasca melahirkan namun belum ada IB tercatat. Sapi normal menunjukkan birahi kembali dalam 3-6 minggu (21-42 hari) setelah melahirkan (Noakes et al., 2019). Kemungkinan penyebab (belum pasti, perlu pemeriksaan petugas): (1) Anestrus Postpartum — ovarium belum aktif kembali, atau (2) Birahi Senyap (Silent Heat) — ovarium sebenarnya sudah berovulasi normal namun tanda birahi belum teramati. Tetap amati pagi dan sore, namun segera laporkan ke petugas agar dilakukan pemeriksaan ovarium lebih lanjut untuk memastikan kondisi sebenarnya.`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; }
      else { res.statusLabel = "SIAP IB"; res.color = "amber"; res.advice = "Fase kosong, sapi siap menerima IB. Amati tanda birahi (3A: Abang, Abuh, Anget) disertai kegelisahan dan kecenderungan menaiki sapi lain. Lakukan IB tepat saat sapi menunjukkan birahi aktif."; }
    } 
    else if (phase === "BRED") {
      if (cycles >= 4) { res.color = "rose"; res.statusLabel = "Gangguan Reproduksi: Gagal Bunting Berulang"; res.isUrgent = true; res.needsVet = true; res.advice = `Sapi telah menjalani ${cycles - 1} kali IB dengan siklus birahi normal (jarak 18-24 hari) namun gagal bunting, dan kini memasuki IB ke-${cycles}. Status sementara: Repeat Breeder. Kemungkinan penyebab (belum pasti): gangguan ovarium, endometritis subklinis, ketidaktepatan waktu IB, atau kualitas semen/teknik IB — penyebab sebenarnya hanya bisa dipastikan lewat pemeriksaan. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan mendalam sebelum IB berikutnya.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (suspectSistaGap > 0) { res.color = "rose"; res.statusLabel = "Gangguan Reproduksi: Birahi Tidak Normal"; res.isUrgent = true; res.needsVet = true; res.advice = `Ditemukan jarak antar IB hanya ${suspectSistaGap} hari, padahal siklus birahi normal sapi adalah 18-24 hari. Pola birahi yang terlalu sering dan pendek seperti ini diduga mengarah pada Sista Folikuler (Nymphomania) — namun ini baru indikasi awal, bukan diagnosa pasti. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan per-rektal/USG ovarium secara mendalam.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (daysSinceLastIB < 60) {
        const sisaHariPkb = 60 - daysSinceLastIB;
        res.color = "slate"; res.statusLabel = "SUSPECT BUNTING";
        if (daysSinceLastIB < 18) {
          res.advice = `Hari ke-${daysSinceLastIB} pasca IB. Pantau kemungkinan birahi kembali pada hari ke-18 sampai ke-24 (siklus birahi normal). Jika sapi tidak menunjukkan birahi pada periode tersebut, kemungkinan bunting cukup besar. Pemeriksaan kebuntingan hanya boleh dilakukan oleh petugas/dokter hewan yang berkompeten — jangan diperiksa sendiri.`;
        } else {
          res.advice = `Hari ke-${daysSinceLastIB} pasca IB. Sapi tidak menunjukkan birahi kembali, indikasi bunting cukup baik. Pemeriksaan kebuntingan oleh petugas/dokter hewan dapat dilakukan mulai hari ke-60. Tersisa ${sisaHariPkb} hari menuju jadwal pemeriksaan kebuntingan.`;
        }
      }
      else { res.color = "orange"; res.statusLabel = "Waktunya Pemeriksaan Kebuntingan"; res.isUrgent = true; res.advice = `Hari ke-${daysSinceLastIB} pasca IB. Jadwal pemeriksaan kebuntingan telah tiba. Segera hubungi petugas/dokter hewan untuk melakukan pemeriksaan kebuntingan (hanya boleh dilakukan oleh tenaga terlatih), lalu laporkan hasilnya melalui menu Reproduksi.`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; }
    }
    else if (phase === "PREGNANT") {
      if (!item.conceptionDate) {
         res.color = "orange"; res.statusLabel = "Bunting (Belum Diperiksa)"; res.isUrgent = true;
         res.advice = (item.asal_usul_sapi || item.origin) === 'PASAR' ? `Sapi diduga bunting (asal pengadaan pasar) — belum dikonfirmasi. Segera minta petugas/dokter hewan melakukan pemeriksaan kebuntingan untuk konfirmasi dan estimasi usia kebuntingan.` : `Sapi diduga bunting (hasil breeding kandang sendiri) — belum dikonfirmasi. Segera minta petugas/dokter hewan melakukan pemeriksaan kebuntingan untuk konfirmasi.`;
         res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-semibold shadow-sm";
      }
      else {
         const hpl = new Date(item.conceptionDate);
         if (isNaN(hpl.getTime())) throw new Error("Invalid date");
         hpl.setMonth(hpl.getMonth() + 9); hpl.setDate(hpl.getDate() + 10);
         const l = Math.ceil((hpl - today) / 86400000); const pregDays = daysDiff(item.conceptionDate);
         let txtHPL = `Perkiraan tanggal lahir: ${fmtDate(hpl.toISOString().split("T")[0])} (±${l} hari).`;

         let nutrisi = "";
         if (pregDays <= 94) nutrisi = "Nutrisi Trimester 1: Fokus pemberian hijauan berkualitas tinggi dan mineral mix. Jaga kondisi tubuh ideal, hindari pakan berjamur.";
         else if (pregDays <= 189) nutrisi = "Nutrisi Trimester 2: Tambahkan konsentrat berenergi tinggi. Suplementasi Kalsium (Ca) dan Fosfor (P) penting untuk pertumbuhan tulang janin.";
         else nutrisi = "Nutrisi Trimester 3: Fase krusial pertumbuhan janin. Berikan pakan penguat dan lakukan kering kandang bila sapi masih diperah.";

         if (pregDays >= 285) { res.color = "rose"; res.statusLabel = "ANCAMAN DISTOKIA"; res.isUrgent = true; res.advice = `Usia kebuntingan sudah lanjut (hari ke-${pregDays}), mendekati waktu kelahiran. Siapkan kontak tenaga medis untuk antisipasi kesulitan melahirkan (distokia). ${nutrisi}`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
         else if (l <= 60 && l > 21) { res.color = "amber"; res.statusLabel = "KERING KANDANG"; res.isUrgent = true; res.advice = `${txtHPL} Hentikan pemerahan susu segera (kering kandang) agar kelenjar susu pulih sebelum melahirkan. ${nutrisi}`; res.adviceColor = "text-amber-900 bg-amber-50 border border-amber-200 font-semibold shadow-sm"; }
         else { res.color = "emerald"; res.statusLabel = "BUNTING AKTIF"; res.advice = `${txtHPL} ${nutrisi}`; }
      }
    } 
    else if (phase === "POSTPARTUM") {
      const d = daysDiff(item.calvingDate);
      if (d <= 21) { res.statusLabel = "PUERPERIUM (NIFAS)"; res.color = "rose"; res.isUrgent = true; res.advice = `Hari ke-${d} pasca melahirkan. Masa nifas normal berlangsung 2-3 minggu. Amati tanda bahaya berikut dan segera laporkan ke petugas/dokter hewan bila ditemukan — bukan untuk didiagnosa sendiri: (1) Lokia berbau busuk (kemungkinan Metritis/Endometritis); (2) Plasenta belum lepas lebih dari 24 jam (kemungkinan Retensio Plasenta); (3) Demam tinggi atau nafsu makan menurun. Diagnosa pasti memerlukan pemeriksaan oleh petugas.`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-semibold shadow-sm"; }
      else if (d <= 45) { res.statusLabel = "INVOLUSI UTERUS"; res.color = "blue"; res.advice = `Hari ke-${d} pasca melahirkan. Rahim sedang dalam proses involusi (pemulihan), berlangsung sekitar 4-6 minggu. IB tidak boleh dilakukan pada periode ini. Amati tanda birahi pertama — sapi normal kembali birahi 3-6 minggu setelah melahirkan.`; }
      else { res.statusLabel = "BREEDING WINDOW"; res.color = "emerald"; res.advice = `Hari ke-${d} pasca melahirkan. Sapi telah siap menerima IB kembali. Lakukan IB segera saat tanda birahi muncul (3A: Abang, Abuh, Anget). Jangan menunda agar calving interval tetap ideal (12-13 bulan).`; }
    }
    return res;
  } catch (error) {
    return { color: "rose", statusLabel: "DATA ERROR", advice: "Format tanggal atau riwayat sapi ini tidak valid.", isUrgent: true, adviceColor: "text-rose-900 bg-rose-50" };
  }
}

/*
  ========================================
  4. UI COMPONENTS (CORE)
  ========================================
*/
const FF = ({ label, children }) => (<div className="mb-4"><p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{label}</p>{children}</div>);

function TimelineItem({ log, isLast }) {
  return (
    <div className="timeline-item flex gap-4 relative pb-5">
      {!isLast && <div className="timeline-line"></div>}
      <div className="relative z-10 mt-1"><div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${log.colorDot || "bg-slate-300"}`}></div></div>
      <div className="flex-1">
        <div className="flex justify-between items-start"><p className="text-xs font-bold text-slate-800">{log.label}</p><p className="text-[10px] font-medium text-slate-400">{fmtDate(log.date)}</p></div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{log.desc}</p>
      </div>
    </div>
  );
}

function buildHistory(item) { 
  let history = []; 
  try {
    const birthDate = item.tanggal_lahir || item.birthDate;
    const origin = item.asal_usul_sapi || item.origin;

    const sortedIb = [...(item.ibLog || [])].sort((a,b) => {
      const da = typeof a === 'object' ? a.date : a;
      const db = typeof b === 'object' ? b.date : b;
      return new Date(da) - new Date(db);
    });

    let prevIbDate = null;

    sortedIb.forEach((entry, i) => {
      const d = typeof entry === 'object' ? entry.date : entry;
      let isSuspect = typeof entry === 'object' ? entry.isSuspect : false;

      if (prevIbDate) {
         const diff = Math.floor((new Date(d) - new Date(prevIbDate)) / 86400000);
         if (diff > 0 && diff < 18) {
             isSuspect = true;
         }
      }
      prevIbDate = d;

      history.push({
        type: 'ibLog', originalIndex: i, date: d,
        label: `Inseminasi Buatan (IB) ke-${i + 1} ${isSuspect ? "⚠️ (SUSPECT)" : ""}`,
        desc: isSuspect
          ? "Jarak antar IB kurang dari 18 hari, padahal siklus birahi normal sapi 18-24 hari. Pola ini diduga mengarah pada Sista Folikuler (Nymphomania), namun ini baru indikasi awal — perlu pemeriksaan mendalam oleh petugas/dokter hewan untuk konfirmasi."
          : "Tindakan memasukkan semen beku ke dalam saluran reproduksi sapi. Amati kemungkinan birahi kembali dalam 18-24 hari ke depan.",
        colorDot: isSuspect ? "bg-orange-600" : "bg-blue-500", 
        rawDate: new Date(d) 
      }); 
    });

    (item.pkbLog || []).forEach((log, i) => history.push({ 
      type: 'pkbLog', originalIndex: i, date: log.date, label: `Pemeriksaan Kebuntingan`,
      desc: log.result === "POSITIVE"
        ? "Hasil positif (bunting). Pertahankan asupan nutrisi protein dan energi untuk mendukung pertumbuhan janin secara optimal."
        : "Hasil negatif (tidak bunting). Segera laporkan ke petugas/dokter hewan untuk evaluasi pakan dan kondisi hormonal sapi secara mendalam.",
      colorDot: log.result === "POSITIVE" ? "bg-emerald-500" : "bg-rose-500", rawDate: new Date(log.date) 
    })); 

    (item.calvingLog || []).forEach((d, i) => history.push({ 
      type: 'calvingLog', originalIndex: i, date: d, label: "Laporan Kelahiran (Partus)", 
      desc: "Sapi telah melahirkan. Pastikan pedet mendapat kolostrum dalam 2 jam pertama kehidupan.", 
      colorDot: "bg-violet-500", rawDate: new Date(d) 
    }));

    (item.therapyLog || []).forEach((d, i) => history.push({ 
      type: 'therapyLog', originalIndex: i, date: d, label: "Tindakan Terapi Repro ✅", 
      desc: "Sapi telah mendapatkan penanganan/terapi medis. Status reproduksi direset menjadi Kosong (OPEN) untuk masa pemulihan/tunggu siklus baru.", 
      colorDot: "bg-emerald-500", rawDate: new Date(d) 
    }));

    (item.abortusLog || []).forEach((d, i) => history.push({ 
      type: 'abortusLog', originalIndex: i, date: d, label: "Laporan Keguguran (Abortus) 🚨", 
      desc: "Sapi mengalami keguguran. Sedang menunggu kedatangan petugas medis untuk penanganan.", 
      colorDot: "bg-rose-600", rawDate: new Date(d) 
    }));

    (item.healthLog || []).forEach((l, i) => {
      history.push({ type: 'healthLog', originalIndex: i, date: l.date, label: "Panggilan Medis (Lapor Gejala)", desc: `Keluhan: ${l.gejala}`, colorDot: "bg-orange-400", rawDate: new Date(l.date) });

      if (l.diagnosa) {
          history.push({ type: 'healthLog', originalIndex: i, date: l.tanggalDiperiksa || l.date, label: "Hasil Pemeriksaan Dokter", desc: `Diagnosa: ${l.diagnosa}. Tindakan Medis: ${l.tindakan}`, colorDot: "bg-rose-500", rawDate: new Date(l.tanggalDiperiksa || l.date) });
      }

      if (l.status === "SEMBUH" && l.tanggalSembuh) {
          history.push({ type: 'healthLog', originalIndex: i, date: l.tanggalSembuh, label: "Konfirmasi Kesembuhan", desc: `Sapi dinyatakan sembuh total dari penyakit (${l.diagnosa || l.gejala}).`, colorDot: "bg-emerald-500", rawDate: new Date(l.tanggalSembuh) });
      }
    });

    if (birthDate) history.push({ 
      type: 'birthDate', originalIndex: 0, date: birthDate, label: "Pencatatan Aset Awal", 
      desc: origin === "KANDANG" ? "Ternak hasil breeding mandiri." : "Ternak masuk dari pengadaan pasar luar.", 
      colorDot: "bg-slate-300", rawDate: new Date(birthDate) 
    }); 

    const analysis = analyzeCattle(item);
    if (analysis && analysis.advice && analysis.statusLabel !== "ERROR" && analysis.statusLabel !== "DATA ERROR") {
      history.push({
        type: 'systemAlert', 
        date: todayStr(),
        label: analysis.statusLabel,
        desc: analysis.advice,
        colorDot: `bg-${analysis.color}-500`,
        rawDate: new Date(new Date().getTime() + 9999999) 
      });
    }

    return history.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0)); 
  } catch(e) { return []; }
}

function AdviceCard({ item, analysis, onClick, ownerName }) {
  if (!item || !analysis) return null;

  const history = buildHistory(item);
  const latestLog = history.length > 0 ? history[0] : null;

  const mainText = latestLog ? latestLog.desc : analysis.advice;
  const titleText = latestLog ? latestLog.label : analysis.statusLabel;

  const colorBg = latestLog && latestLog.colorDot
    ? latestLog.colorDot.replace('500', '100').replace('600', '100').replace('400', '100')
    : (COLOR[analysis.color] ? COLOR[analysis.color].bg : "bg-slate-100");

  const icon = analysis.isUrgent ? '⚠️' : '💡';

  if (!mainText || mainText.trim() === '') return null;

  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(`Halo Petugas, saya ${ownerName || "Peternak"}. Tolong periksa sapi saya (Kode: ${item.code || item.id}). Kasus: ${analysis.statusLabel} - Butuh Penanganan Darurat.`)}`;

  return (
    <div onClick={() => onClick(item)} className="bg-white p-4 rounded-2xl shadow-sm flex items-start gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors border border-slate-100 hover:border-slate-200">
      <div className={`w-9 h-9 rounded-xl ${colorBg} flex-shrink-0 flex items-center justify-center mt-0.5`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex-1 w-full overflow-hidden">
        <div className="flex justify-between items-center mb-1">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sapi {item.code || item.id || "N/A"}</p>
           {analysis.isUrgent && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span></span>}
        </div>

        <h4 className="font-black text-sm text-slate-800 mb-1 leading-snug">
          {titleText.replace(/⚠️|🚨|💡|✅/g, '').trim()}
        </h4>
        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          {mainText}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
           <div className="flex items-center gap-1.5 min-w-0">
             <div className={`w-2 h-2 rounded-full shrink-0 ${latestLog ? latestLog.colorDot : 'bg-slate-300'}`}></div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
               {latestLog ? `Status Terkini • ${fmtDate(latestLog.date)}` : 'Saran Otomatis Sistem'}
             </p>
           </div>
           {analysis.needsVet && (
             <a
               href={waLink}
               target="_blank"
               rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               className="flex items-center gap-1 bg-[#25D366] text-white text-[9px] font-bold px-2.5 py-1.5 rounded-full shrink-0 hover:bg-[#1ea952] transition-colors shadow-sm"
             >
               📞 Petugas
             </a>
           )}
        </div>
      </div>
    </div>
  );
}

// KOMPONEN BARU: SMART ESTRUS CALENDAR (3 Bulan Sekaligus & UI Premium)
// KOMPONEN BARU: SMART ESTRUS CALENDAR (Legenda Konsisten)
// KOMPONEN BARU: SMART ESTRUS CALENDAR (Sistem Blok, Sinkron Warna & Interaktif)
function SmartEstrusCalendar({ item }) {
  const today = new Date();
  today.setHours(0,0,0,0);

  const [offset, setOffset] = useState(0);
  const [activeInfo, setActiveInfo] = useState(null); // State untuk Popup Keterangan

  useEffect(() => {
    setOffset(0);
    setActiveInfo(null);
  }, [item?.id, item?.phase, item?.status_reproduksi]);

  const isJantan = item.jenis_kelamin === "JANTAN" || item.gender === "JANTAN";
  if (isJantan) return null;

  let anchor = null;
  const phase = item.status_reproduksi || item.phase;
  
  let targetBlocks = []; // Format baru: Array of Blocks { start, end, bg, text, label }
  let title = "Kalender Pintar"; 
  let subtitle = "Pemantauan Siklus";
  let anchorColorClass = "bg-slate-500";

  let displayMonthDate = new Date(today);
  displayMonthDate.setDate(1); 
  
  let isPregnant = false;
  let conceptionDate = null;
  let hplDate = null;

  // 1. LOGIKA SISTEM BLOK RANGE WAKTU & SINKRONISASI WARNA
  if (phase === "BRED") {
    const sorted = [...(item.ibLog || [])].sort((a,b) => new Date(a.date || a) - new Date(b.date || b));
    if (sorted.length > 0) anchor = new Date(sorted[sorted.length - 1].date || sorted[sorted.length - 1]);
    
    if (anchor) {
      // Blok Masa Pantau 1 (H+19 s/d H+22)
      const t1Start = new Date(anchor); t1Start.setDate(t1Start.getDate() + 19);
      const t1End = new Date(anchor); t1End.setDate(t1End.getDate() + 22);
      targetBlocks.push({ start: t1Start, end: t1End, bg: "bg-amber-500", text: "text-white font-bold", label: "Masa Evaluasi Birahi (Siklus 1). Pantau vulva!" });

      // Blok Masa Pantau 2 (H+40 s/d H+43)
      const t2Start = new Date(anchor); t2Start.setDate(t2Start.getDate() + 40);
      const t2End = new Date(anchor); t2End.setDate(t2End.getDate() + 43);
      targetBlocks.push({ start: t2Start, end: t2End, bg: "bg-amber-200", text: "text-amber-900 font-bold", label: "Masa Evaluasi Birahi (Siklus 2)" });

      title = "Evaluasi IB"; subtitle = "Masa Pantau Birahi";
      anchorColorClass = "bg-blue-500"; // Sinkron dengan warna IB di Kronologis
      displayMonthDate = new Date(anchor);
      displayMonthDate.setDate(1);
    }
  } 
  else if (phase === "PREGNANT") {
    isPregnant = true;
    if (item.conceptionDate) {
      conceptionDate = new Date(item.conceptionDate); conceptionDate.setHours(0,0,0,0);
      anchor = conceptionDate;
      hplDate = new Date(anchor); hplDate.setMonth(hplDate.getMonth() + 9); hplDate.setDate(hplDate.getDate() + 10);
      
      // Range HPL: 7 Hari (H-3 sampai H+3)
      const hplStart = new Date(hplDate); hplStart.setDate(hplStart.getDate() - 3);
      const hplEnd = new Date(hplDate); hplEnd.setDate(hplEnd.getDate() + 3);
      targetBlocks.push({ start: hplStart, end: hplEnd, bg: "bg-violet-500", text: "text-white font-bold", label: "RANGE HPL (Perkiraan Lahir). Siapkan Kandang!" });

      title = "Kebuntingan"; subtitle = "Pantauan Trimester & HPL";
      anchorColorClass = "bg-blue-500";
    } else {
      title = "Kebuntingan"; subtitle = "Belum Diperiksa Presisi";
    }
  }
  else if (phase === "CALF") {
    const bd = item.tanggal_lahir || item.birthDate;
    if (bd) {
      anchor = new Date(bd);
      const kawinStart = new Date(anchor); kawinStart.setDate(kawinStart.getDate() + 540);
      const kawinEnd = new Date(kawinStart); kawinEnd.setDate(kawinEnd.getDate() + 7); // Range 1 minggu
      
      targetBlocks.push({ start: kawinStart, end: kawinEnd, bg: "bg-emerald-500", text: "text-white font-bold", label: "Fase Awal Dara Siap Kawin (Usia 18 Bulan)" });
      
      title = "Pertumbuhan"; subtitle = "Target Siap Kawin";
      anchorColorClass = "bg-slate-300";
      const diffKawin = Math.floor((kawinStart - today)/86400000);
      displayMonthDate = diffKawin <= 90 ? new Date(kawinStart) : new Date(today);
      displayMonthDate.setDate(1);
    }
  }
  else if (phase === "ABORTUS_PENDING") {
    if (item.abortusDate) anchor = new Date(item.abortusDate);
    title = "Kondisi Darurat"; subtitle = "Menunggu Penanganan";
    anchorColorClass = "bg-rose-600"; 
    displayMonthDate = new Date(today); displayMonthDate.setDate(1);
  }
  else {
    // OPEN / POSTPARTUM
    if (phase === "POSTPARTUM" && item.calvingDate) {
       anchor = new Date(item.calvingDate);
       anchorColorClass = "bg-violet-500"; 
    }
    else if (phase === "OPEN") {
       let dates = [];
       if (item.calvingDate) dates.push({ d: item.calvingDate, c: "bg-violet-500", l: "Melahirkan" });
       (item.therapyLog || []).forEach(d => dates.push({ d, c: "bg-emerald-500", l: "Terapi Medis" }));
       (item.pkbLog || []).filter(l => l.result === "NEGATIVE").forEach(l => dates.push({ d: l.date, c: "bg-rose-500", l: "Pemeriksaan Kebuntingan Negatif" }));
       (item.ibLog || []).forEach(l => dates.push({ d: l.date || l, c: "bg-blue-500", l: "Inseminasi Buatan" }));
       if (item.abortusDate) dates.push({ d: item.abortusDate, c: "bg-rose-600", l: "Keguguran" });
       
       if (dates.length > 0) {
          dates.sort((a,b) => new Date(a.d) - new Date(b.d));
          const lastEvent = dates[dates.length - 1];
          anchor = new Date(lastEvent.d);
          anchorColorClass = lastEvent.c; 
       }
    }
    
    if (anchor) {
      anchor.setHours(0,0,0,0);
      let minDaysWait = phase === "POSTPARTUM" ? 60 : (item.abortusDate && daysDiff(item.abortusDate, anchor) >= 0 ? 45 : 21);
      let daysSinceAnchor = Math.floor((today - anchor) / 86400000);
      let cycles = 1;
      while ((cycles * 21) < minDaysWait || (cycles * 21) < daysSinceAnchor) cycles++;
      
      const nextCycleStart = new Date(anchor); nextCycleStart.setDate(nextCycleStart.getDate() + (cycles * 21) - 1);
      const nextCycleEnd = new Date(nextCycleStart); nextCycleEnd.setDate(nextCycleEnd.getDate() + 2); // 3 Hari Range
      
      targetBlocks.push({ start: nextCycleStart, end: nextCycleEnd, bg: "bg-emerald-500", text: "text-white font-bold", label: "Prediksi Masa Subur (Siklus Birahi)" });
      
      title = "Siklus Birahi"; subtitle = "Saran Jadwal IB Optimal";
    } else {
      title = "Fase Kosong"; subtitle = "Pantau Birahi";
    }
  }

  // 2. RINGKASAN TANGGAL PENTING (teks, agar informasi tetap jelas tanpa harus memindai kalender)
  let summaryItems = []; // { icon, label, dateText, dot, desc }
  if (isPregnant && conceptionDate && hplDate) {
    const t1End = new Date(conceptionDate); t1End.setDate(t1End.getDate() + 94);
    const t2Start = new Date(t1End); t2Start.setDate(t2Start.getDate() + 1);
    const t2End = new Date(conceptionDate); t2End.setDate(t2End.getDate() + 189);
    const t3Start = new Date(t2End); t3Start.setDate(t3Start.getDate() + 1);
    summaryItems.push({ icon: "💉", label: "Tanggal Konsepsi (IB Berhasil)", dateText: fmtDate(conceptionDate.toISOString().split("T")[0]), dot: "bg-blue-500", desc: "Tanggal pembuahan yang dipakai sebagai dasar perhitungan usia kebuntingan dan perkiraan tanggal lahir (HPL)." });
    summaryItems.push({ icon: "🌱", label: "Trimester 1", dateText: `${fmtDate(conceptionDate.toISOString().split("T")[0])} – ${fmtDate(t1End.toISOString().split("T")[0])}`, dot: "bg-blue-300", desc: "Hari ke-0 s/d ke-94 kebuntingan. Fokus hijauan berkualitas dan jaga kondisi tubuh." });
    summaryItems.push({ icon: "🌿", label: "Trimester 2", dateText: `${fmtDate(t2Start.toISOString().split("T")[0])} – ${fmtDate(t2End.toISOString().split("T")[0])}`, dot: "bg-amber-300", desc: "Hari ke-95 s/d ke-189 kebuntingan. Tambahkan konsentrat dan suplemen Kalsium/Fosfor untuk tulang janin." });
    summaryItems.push({ icon: "🌾", label: "Trimester 3", dateText: `${fmtDate(t3Start.toISOString().split("T")[0])} – ${fmtDate(hplDate.toISOString().split("T")[0])}`, dot: "bg-rose-300", desc: "Hari ke-190 hingga perkiraan lahir. Fase krusial — siapkan pakan penguat dan rencana kering kandang." });
    summaryItems.push({ icon: ICON_TAG, label: "Perkiraan Lahir (HPL)", dateText: fmtDate(hplDate.toISOString().split("T")[0]), dot: "bg-violet-600", desc: "Estimasi tanggal kelahiran (kebuntingan normal ±283 hari). Siapkan kandang beranak menjelang tanggal ini." });
  } else {
    if (anchor) {
      let anchorLabel = "Kejadian Terakhir";
      let anchorDesc = "Tanggal tindakan/peristiwa terakhir yang tercatat untuk sapi ini — dipakai sistem sebagai acuan menghitung prediksi siklus berikutnya.";
      if (phase === "CALF") { anchorLabel = "Tanggal Lahir"; anchorDesc = "Tanggal lahir sapi, dipakai untuk menghitung target usia siap kawin (18-24 bulan)."; }
      else if (phase === "ABORTUS_PENDING") { anchorLabel = "Tanggal Keguguran"; anchorDesc = "Tanggal sapi mengalami keguguran (abortus). Status darurat, menunggu penanganan petugas medis."; }
      else if (phase === "BRED") { anchorDesc = "Tanggal Inseminasi Buatan (IB) terakhir yang tercatat — acuan menghitung jadwal evaluasi birahi berikutnya."; }
      else if (phase === "POSTPARTUM" || phase === "OPEN") { anchorDesc = "Tanggal kejadian terakhir (bisa berupa melahirkan, IB, hasil pemeriksaan kebuntingan negatif, atau terapi medis) — acuan memprediksi jadwal birahi berikutnya."; }
      summaryItems.push({
        icon: phase === "ABORTUS_PENDING" ? ICON_ALERT_TRIANGLE : phase === "CALF" ? ICON_TAG : ICON_PIN,
        label: anchorLabel,
        dateText: fmtDate(anchor.toISOString().split("T")[0]),
        dot: anchorColorClass.split(' ')[0],
        desc: anchorDesc
      });
    }
    targetBlocks.forEach(b => {
      const cleanLabel = b.label.split('.')[0].trim();
      let desc = "Rentang tanggal penting yang diprediksi sistem berdasarkan siklus reproduksi sapi.";
      if (cleanLabel.includes("Siklus 1")) desc = "Jendela hari ke-19 s/d ke-22 pasca IB. Jika sapi TIDAK menunjukkan birahi di periode ini, kemungkinan besar bunting. Jika BIRAHI muncul kembali, berarti IB sebelumnya gagal — perlu IB ulang.";
      else if (cleanLabel.includes("Siklus 2")) desc = "Jendela hari ke-40 s/d ke-43 pasca IB (siklus birahi kedua). Pemantauan tambahan untuk memastikan kebuntingan benar-benar terjadi.";
      else if (cleanLabel.includes("RANGE HPL")) desc = "Rentang ±3 hari dari perkiraan tanggal lahir. Siapkan kandang beranak dan amati tanda-tanda akan melahirkan.";
      else if (cleanLabel.includes("Prediksi Masa Subur")) desc = "Perkiraan jendela waktu sapi akan menunjukkan birahi kembali (siklus normal 18-24 hari). Amati tanda birahi pada periode ini untuk menentukan waktu IB yang tepat.";
      else if (cleanLabel.includes("Dara Siap Kawin")) desc = "Target usia ideal sapi dara untuk menerima IB pertama kali (18-24 bulan).";
      summaryItems.push({
        icon: "🎯",
        label: cleanLabel,
        dateText: `${fmtDate(b.start.toISOString().split("T")[0])} – ${fmtDate(b.end.toISOString().split("T")[0])}`,
        dot: b.bg.split(' ')[0],
        desc
      });
    });
  }

  // 3. KARTU COUNTDOWN — event terdekat yang paling relevan, ditampilkan paling atas
  let keyEvent = null;
  if (targetBlocks.length > 0) {
    const upcoming = targetBlocks.filter(b => b.end >= today).sort((a, b) => a.start - b.start);
    const chosen = upcoming.length > 0 ? upcoming[0] : targetBlocks[targetBlocks.length - 1];
    const isOngoing = today >= chosen.start && today <= chosen.end;
    const isPast = chosen.end < today;
    const daysUntilStart = Math.floor((chosen.start - today) / 86400000);
    keyEvent = { block: chosen, isOngoing, isPast, daysUntilStart };
  }

  const phaseIcon = phase === "BRED" ? ICON_SEARCH : phase === "PREGNANT" ? ICON_HEART_FILLED : phase === "CALF" ? ICON_TAG : phase === "ABORTUS_PENDING" ? ICON_ALERT_TRIANGLE : ICON_REFRESH;

  // Fungsi untuk mengekstrak info hari saat diklik
  const getDayInfo = (date) => {
    let info = { bg: "text-slate-500 hover:bg-slate-100 rounded-md", text: "font-semibold text-[11px]", border: "", label: "" };
    const isAnchor = anchor && date.getTime() === anchor.getTime();
    const isToday = date.getTime() === today.getTime();

    // Trimester Check (Base layer)
    if (isPregnant && conceptionDate && hplDate && date >= conceptionDate && date <= hplDate) {
       const daysPreg = Math.floor((date - conceptionDate) / 86400000);
       if (daysPreg <= 94) { info.bg = "bg-blue-100 text-blue-700 rounded-md"; info.text = "font-bold text-[11px]"; info.label = "Masa Kebuntingan Trimester 1"; }
       else if (daysPreg <= 189) { info.bg = "bg-amber-100 text-amber-700 rounded-md"; info.text = "font-bold text-[11px]"; info.label = "Masa Kebuntingan Trimester 2"; }
       else { info.bg = "bg-rose-100 text-rose-700 rounded-md"; info.text = "font-bold text-[11px]"; info.label = "Masa Kebuntingan Trimester 3"; }
    }

    // Target Block Check (Menimpa trimester)
    for (let block of targetBlocks) {
      if (date >= block.start && date <= block.end) {
         info.bg = block.bg + " rounded-md";
         info.text = block.text + " text-[11px]";
         info.label = block.label;
      }
    }

    // Anchor Check (Menimpa target)
    if (isAnchor) {
       info.bg = anchorColorClass.includes("slate-300") ? `${anchorColorClass} text-slate-800 rounded-md` : `${anchorColorClass} text-white rounded-md`;
       info.text = "font-bold text-[11px]";
       info.label = "Tanggal Kejadian / Tindakan Terakhir";
    }

    if (isToday && !info.label) {
       info.label = "Hari Ini";
    }

    if (isToday && !isAnchor && !targetBlocks.some(b => date >= b.start && date <= b.end)) {
       info.border = "border border-emerald-400 bg-white text-emerald-700 rounded-md";
       info.text = "font-black text-[11px]";
    }

    return info;
  };

  const handleDayClick = (date, info) => {
    if (info.label) {
      setActiveInfo({ date, label: info.label });
    } else {
      setActiveInfo({ date, label: "Tidak ada aktivitas khusus di tanggal ini." });
    }
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const viewDate = new Date(displayMonthDate);
  viewDate.setMonth(viewDate.getMonth() + offset);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthDays = [];
  for (let i = 0; i < firstDay; i++) monthDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(new Date(viewYear, viewMonth, i));
  const isAtReferenceMonth = offset === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 pop-in overflow-hidden w-full">
      {/* HEADER */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm shrink-0">{phaseIcon}</div>
        <div>
          <h4 className="font-black text-slate-800 text-sm tracking-tight leading-none">{title}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* BLOK KALENDER UTAMA: countdown + navigasi + grid + info ketuk, satu kesatuan visual */}
      <div className="bg-slate-50 mx-3 rounded-xl p-2.5">

        {keyEvent && (
          <div className={`rounded-lg px-2.5 py-2 mb-2.5 flex items-center gap-2 ${keyEvent.isOngoing ? "bg-amber-50" : keyEvent.isPast ? "bg-white" : "bg-emerald-50"}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${keyEvent.isOngoing ? "bg-amber-400" : keyEvent.isPast ? "bg-slate-300" : "bg-emerald-500"}`}>
              <span>{keyEvent.isOngoing ? "⏳" : keyEvent.isPast ? "⌛" : "🎯"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-widest ${keyEvent.isOngoing ? "text-amber-600" : keyEvent.isPast ? "text-slate-400" : "text-emerald-600"}`}>
                {keyEvent.isOngoing ? "Sedang Berlangsung" : keyEvent.isPast ? "Sudah Terlewat" : `${keyEvent.daysUntilStart} Hari Lagi`}
              </p>
              <p className="text-[11px] font-bold text-slate-800 leading-snug mt-0.5 truncate">{keyEvent.block.label.split('.')[0]}</p>
            </div>
          </div>
        )}

        {/* NAVIGASI BULAN */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={(e) => { e.stopPropagation(); setOffset(o => o - 1); }} className="w-6 h-6 rounded-md bg-white text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm">‹</button>
          <div className="text-center">
            <p className="text-[11px] font-black text-slate-700 tracking-tight">{monthNames[viewMonth]} {viewYear}</p>
            {!isAtReferenceMonth && (
              <button onClick={(e) => { e.stopPropagation(); setOffset(0); }} className="text-[8px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700">↺ Bulan Acuan</button>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setOffset(o => o + 1); }} className="w-6 h-6 rounded-md bg-white text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm">›</button>
        </div>

        {/* GRID KALENDER */}
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
            <div key={d} className={`text-[8.5px] font-black uppercase tracking-wide py-0.5 ${i === 0 ? "text-rose-400" : "text-slate-400"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {monthDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="h-7"></div>;
            const info = getDayInfo(date);
            const isPlainSunday = date.getDay() === 0 && info.bg.includes("text-slate-500");
            return (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); handleDayClick(date, info); }}
                className={`flex justify-center items-center h-7 transition-colors cursor-pointer ${info.bg} ${info.border} ${isPlainSunday ? "bg-rose-50" : ""}`}
              >
                <span className={info.text}>{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* INFO TANGGAL TERKETUK */}
        {activeInfo ? (
          <div className="bg-slate-800 text-white text-[10px] px-3 py-2.5 rounded-lg pop-in w-full shadow-sm font-medium leading-snug text-center mt-2">
            <span className="font-black text-emerald-400 block mb-0.5 tracking-wide">
              {activeInfo.date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {activeInfo.label}
          </div>
        ) : (
          <p className="text-center text-[9px] font-semibold text-slate-400 mt-2">👆 Ketuk tanggal berwarna untuk lihat keterangan</p>
        )}
      </div>

      {/* RINGKASAN & KETERANGAN ISTILAH — keterangan permanen, tidak hanya saat diketuk */}
      {summaryItems.length > 0 && (
        <div className="px-4 py-3 mt-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tanggal Penting &amp; Keterangan</p>
          <div>
            {summaryItems.map((s, idx) => (
              <div key={idx} className="py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}></div>
                  <span className="text-xs shrink-0">{s.icon}</span>
                  <p className="flex-1 min-w-0 text-[10.5px] font-bold text-slate-700 leading-tight">{s.label}</p>
                  <p className="text-[10px] font-semibold text-slate-400 shrink-0 ml-2">{s.dateText}</p>
                </div>
                {s.desc && <p className="text-[10px] font-medium text-slate-500 leading-snug mt-0.5 pl-6">{s.desc}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// KOMPONEN TAB BARU: KALENDER REPRODUKSI (Daftar Sapi Betina + Kalender per-Ekor)
function CalendarView({ dbCattle }) {
  const femaleCattle = (dbCattle || []).filter(c => c && (c.jenis_kelamin || c.gender) !== "JANTAN");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (femaleCattle.length === 0) { setSelectedId(null); return; }
    if (!femaleCattle.some(c => c.id === selectedId)) {
      const sorted = [...femaleCattle].sort((a, b) => {
        const aUrgent = analyzeCattle(a).isUrgent ? 1 : 0;
        const bUrgent = analyzeCattle(b).isUrgent ? 1 : 0;
        return bUrgent - aUrgent;
      });
      setSelectedId(sorted[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCattle]);

  const selected = femaleCattle.find(c => c.id === selectedId) || null;
  const selectedAnalysis = selected ? analyzeCattle(selected) : null;

  return (
    <div className="pb-28 fade-in bg-cream min-h-screen">
      <div className="px-5 pt-7 pb-5 bg-white rounded-b-[28px] shadow-sm mb-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Kalender Reproduksi</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Pantau siklus birahi, IB &amp; estimasi kelahiran</p>
      </div>

      {femaleCattle.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 text-center mt-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-black text-slate-700 text-sm">Belum Ada Data Sapi Betina</p>
          <p className="text-xs font-medium text-slate-400 mt-1.5 max-w-xs">Tambahkan data ternak betina di tab Populasi untuk mulai memantau kalender siklus reproduksi.</p>
        </div>
      ) : (
        <>
          <div className="px-5 mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pilih Sapi ({femaleCattle.length} Ekor)</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {femaleCattle.map(c => {
                const a = analyzeCattle(c);
                const isActive = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`shrink-0 flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-2xl border transition-all ${isActive ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >
                    {a.isUrgent && <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-rose-500"} animate-pulse`}></span>}
                    <span className="text-xs font-black whitespace-nowrap">{c.code || c.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 mt-3">
            {selected && selectedAnalysis && (
              <div className={`rounded-2xl p-3.5 mb-4 flex items-center gap-3 border ${COLOR[selectedAnalysis.color]?.border || "border-slate-200"} ${COLOR[selectedAnalysis.color]?.bg || "bg-slate-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sapi {selected.code || selected.id}</p>
                  <p className={`text-sm font-black mt-0.5 ${COLOR[selectedAnalysis.color]?.text || "text-slate-700"}`}>{selectedAnalysis.statusLabel}</p>
                </div>
                {selectedAnalysis.isUrgent && <span className="text-lg shrink-0">⚠️</span>}
              </div>
            )}
            {selected && <SmartEstrusCalendar item={selected} />}
          </div>
        </>
      )}
    </div>
  );
}

function DetailModal({ item, onClose, onDeleteLog, setAppToast, setAppConfirm }) {
  if (!item) return null;
  const history = buildHistory(item);
  const itemGender = item.jenis_kelamin || item.gender;

  const analysis = analyzeCattle(item);
  const profileStr = localStorage.getItem('srtt_user_profile');
  const profile = profileStr ? JSON.parse(profileStr) : null;
  const ownerName = profile?.name || "Peternak";
  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(`Halo Petugas, saya ${ownerName}. Tolong periksa sapi saya (Kode: ${item.code || item.id}). Kasus: ${analysis.statusLabel} - Butuh Penanganan Darurat.`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full rounded-t-[32px] slide-up h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-3xl text-slate-900 tracking-tight">{item.code || item.id}</h3>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">{itemGender} • {item.ras || item.jenis_ras} • {item.status_reproduksi || item.phase}</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 mb-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usia Ternak</p>
                <p className="text-sm font-black text-slate-800">{getAge(item.tanggal_lahir || item.birthDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Terakhir</p>
                <p className="text-sm font-black text-emerald-600 uppercase">{item.status_reproduksi || item.phase || "OPEN"}</p>
              </div>
          </div>

          {analysis.needsVet && (
             <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] text-white font-black py-4 rounded-2xl text-center text-sm shadow-lg animate-pulse mb-6 border-2 border-emerald-400">
               🚨 HUBUNGI PETUGAS MEDIS (WA)
             </a>
          )}

          <SmartEstrusCalendar item={item} />

          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 ml-2">Recording Kronologis Lengkap</h4>
          <div className="relative">
            <div className="timeline-main-line"></div>
            {history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10 font-medium">Belum ada catatan.</p>
            ) : (
              history.map((log, index) => (
                <div key={index} className="timeline-main-item">
                  <div className={`timeline-main-icon ${log.colorDot}`} style={{left: "10px", width: "30px", height: "30px"}}></div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="font-extrabold text-sm text-slate-800">{log.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400">{fmtDate(log.date)}</p>
                        
                        {log.type !== 'birthDate' && log.type !== 'systemAlert' && onDeleteLog && (
                          <button onClick={(e) => { 
                            e.stopPropagation(); 
                            setAppConfirm({
                              open: true,
                              title: "Hapus Riwayat?",
                              message: "Riwayat medis/aksi ini akan dihapus secara permanen.",
                              isDestructive: true,
                              onConfirm: () => {
                                onDeleteLog(item.id, log.type, log.originalIndex);
                                setAppToast({ message: "Riwayat berhasil dihapus.", type: "success" });
                              }
                            });
                          }} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">{log.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetRecordCard({ item, onEdit, onOpenAction, onOpenDetail, onDelete, highlightedId, setHighlightedId }) {
  if (!item) return null;
  const analysis = analyzeCattle(item);
  const c = COLOR[analysis.color] || COLOR.slate;
  const history = buildHistory(item);
  const recentHistory = history.slice(0, 2);
  const cardRef = React.useRef(null);
  const isHighlighted = highlightedId === item.id;
  const _status = String(item.status_reproduksi || item.phase || '').toUpperCase().trim();
  const isPregnant = _status === 'PREGNANT';
  
  const needsPKBWarning = isPregnant && !item.conceptionDate;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        if (setHighlightedId) setHighlightedId(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, setHighlightedId]);

  return (
    <div ref={cardRef} className={`bg-white rounded-3xl border shadow-sm overflow-hidden mb-4 hover:shadow-md transition-shadow cursor-pointer ${isHighlighted ? 'highlight-blink' : 'border-slate-100'}`} onClick={() => onOpenDetail && onOpenDetail(item)}>
      <div className="p-5 border-b border-slate-50 bg-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{item.code || item.id || "?"}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest">
                {item.jenis_kelamin === "JANTAN" ? "♂️ JANTAN" : "♀️ BETINA"}
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest">
                {item.jenis_ras || "N/A"}
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-600 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest">
                {item.asal_usul_sapi === "KANDANG" ? "🏠 Kandang" : "🛒 Pasar"}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl ${c.bg} ${c.text} uppercase tracking-widest text-center leading-tight whitespace-nowrap ml-2`}>{analysis.statusLabel}</span>
        </div>
        <div className="space-y-1.5 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-800">Tanggal Lahir:</span> {(item.tanggal_lahir || item.birthDate) ? new Date(item.tanggal_lahir || item.birthDate).toLocaleDateString('id-ID') : 'Tidak ada'}</p>
          <p><span className="font-semibold text-slate-800">Usia:</span> {getAge(item.tanggal_lahir || item.birthDate)}</p>
          {item.status_reproduksi && item.status_reproduksi !== "N/A" && (
            <p><span className="font-semibold text-slate-800">Status Reproduksi:</span> {item.status_reproduksi}</p>
          )}
          
          {needsPKBWarning && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg pop-in">
              <p className="text-[11px] text-orange-800 font-semibold leading-relaxed">
                <strong>⚠️ {item.asal_usul_sapi === 'PASAR' ? 'Sapi bunting pasar.' : 'Sapi bunting kandang.'}</strong> Wajib lapor hasil pemeriksaan kebuntingan ke dokter.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="p-5 pb-3">
        <div className="pl-1">
          {recentHistory.length === 0 ? <p className="text-xs text-slate-400 italic">Belum ada rekam medis/aksi.</p> : recentHistory.map((log, i) => <TimelineItem key={i} log={log} isLast={i === recentHistory.length - 1} />)}
        </div>
      </div>
      <div className="bg-slate-50/50 px-5 py-4 flex gap-3 border-t border-slate-100">
        <button onClick={(e) => { e.stopPropagation(); if(onOpenAction) onOpenAction(item); }} className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-800 shadow-sm transition-colors">Lapor Aksi Terpadu</button>
        {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-colors">Edit</button>}
        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-100 shadow-sm transition-colors">Hapus</button>}
      </div>
    </div>
  );
}

function ActionModal({ open, item, onClose, onSaveRepro, onSaveHealth, setAppToast }) {
  const [tab, setTab] = useState("KESEHATAN");
  const [resRepro, setResRepro] = useState("NONE");
  const [dRepro, setDRepro] = useState(todayStr());
  const [pregMonth, setPregMonth] = useState("");
  const [dHealth, setDHealth] = useState(todayStr());
  const [kondisi, setKondisi] = useState("");
  const [medicalWarning, setMedicalWarning] = useState(null);

  const profileStr = localStorage.getItem('srtt_user_profile');
  const profile = profileStr ? JSON.parse(profileStr) : null;
  const ownerName = profile?.name || "Peternak";
  const itemGender = item?.jenis_kelamin || item?.gender;
  const isJantan = itemGender === "JANTAN";

  const activeHealth = (item?.healthLog || []).find(h => h.status !== "SEMBUH");

  useEffect(() => {
    if(open) {
      setTab(isJantan ? "KESEHATAN" : "REPRO");
      setResRepro("NONE"); setDRepro(todayStr()); setPregMonth("");
      setDHealth(todayStr()); setKondisi("");
      setMedicalWarning(null);
    }
  }, [open, item?.id, isJantan]);

  useEffect(() => {
    if (resRepro === "IB" && dRepro) {
      const sortedIB = [...(item?.ibLog || [])].sort((a, b) => {
        const da = typeof a === 'object' ? a.date : a; const db = typeof b === 'object' ? b.date : b;
        return new Date(da) - new Date(db);
      });
      if (sortedIB.length > 0) {
        const lastIBDate = typeof sortedIB[sortedIB.length - 1] === 'object' ? sortedIB[sortedIB.length - 1].date : sortedIB[sortedIB.length - 1];
        const diff = Math.floor((new Date(dRepro) - new Date(lastIBDate)) / 86400000);
        if (diff > 0 && diff < 18) {
          const recentCount = sortedIB.filter(ib => daysDiff(typeof ib === 'object' ? ib.date : ib, dRepro) < 18).length;
          if (recentCount >= 2) {
            setMedicalWarning(`⚠️ Gangguan Reproduksi: Birahi Tidak Normal. Sapi minta kawin >2 kali dalam satu siklus. SEGERA HUBUNGI PETUGAS!`);
          } else {
            setMedicalWarning(`⚠️ WARNING: Berisiko Birahi Panjang (Delayed Ovulation). Sapi masih bisa di-IB, namun wajib dipantau intensif kondisi lendirnya.`);
          }
        } else if (diff <= 0) {
          setMedicalWarning(`❌ TANGGAL TIDAK VALID: Harus setelah tanggal ${fmtDate(lastIBDate)}`);
        } else setMedicalWarning(null);
      }
    } 
    else if (resRepro === "CALVED" && dRepro) {
      if (item?.conceptionDate) {
        const diffDays = Math.floor((new Date(dRepro) - new Date(item.conceptionDate)) / 86400000);
        if (diffDays < 265) {
          setMedicalWarning(`❌ KELAHIRAN MUSTAHIL: Usia kandungan baru ${diffDays} hari! Sapi normal melahirkan di kisaran 265-295 hari. Jika sapi mengalami keguguran, silakan ubah 'Jenis Aksi' menjadi Keguguran (Abortus).`);
        } else if (diffDays > 300) {
          setMedicalWarning(`⚠️ WARNING: Usia kandungan mencapai ${diffDays} hari (Melebihi batas normal). Waspada distokia.`);
        } else {
          setMedicalWarning(null);
        }
      } else {
        setMedicalWarning(null);
      }
    }
    else if (resRepro === "ABORTUS" && dRepro) {
       if (item?.conceptionDate) {
          const diffDays = Math.floor((new Date(dRepro) - new Date(item.conceptionDate)) / 86400000);
          setMedicalWarning(`⚠️ INFO PENTING: Sapi akan dicatat mengalami keguguran di usia kandungan ${diffDays} hari. Sistem akan menyalakan alarm darurat Lapor Petugas.`);
       } else {
          setMedicalWarning(`⚠️ INFO PENTING: Sapi akan dicatat mengalami keguguran. Sistem akan menyalakan alarm darurat Lapor Petugas.`);
       }
    }
    else {
      setMedicalWarning(null);
    }
  }, [dRepro, resRepro, item]);

  if (!open || !item) return null;

  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(`Halo Petugas, saya ${ownerName}. Sapi ${item.code || item.id} terdeteksi Nymphomania (3x IB jarak dekat). Mohon bantuannya.`)}`;

  const handleSaveRepro = () => {
    if (resRepro === "NONE") return setAppToast({ message: "Silakan pilih jenis aksi terlebih dahulu", type: "error" });
    if (medicalWarning?.includes("❌")) return setAppToast({ message: "Tanggal tidak valid", type: "error" });
    if (resRepro !== 'POSITIVE' && resRepro !== 'NEGATIVE' && !dRepro) return setAppToast({ message: "Tanggal tindakan/kejadian wajib diisi", type: "error" });

    if (resRepro === "POSITIVE") {
      const sortedIB = [...(item?.ibLog || [])];
      const hasIB = sortedIB.length > 0;
      if (!hasIB) {
        const monthNum = Number(pregMonth);
        if (!pregMonth || isNaN(monthNum) || monthNum <= 0 || monthNum > 9) {
          return setAppToast({ message: "Perkiraan umur kebuntingan harus diisi (1-9 bulan)", type: "error" });
        }
      }
    }

    onSaveRepro(resRepro, pregMonth, dRepro);
    onClose();
  };

  const submitHealth = (type) => {
    if (type === 'LAPOR' && !kondisi.trim()) return setAppToast({ message: "Harap isi keluhan/gejala sapi", type: "error" });
    onSaveHealth({ type, date: dHealth, gejala: kondisi });
    onClose();
  };

  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 bg-slate-50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-5">
          <div><p className="font-black text-xl text-slate-900">Lapor Aksi</p><p className="text-[10px] font-bold text-slate-500 uppercase">ID: {item.code || item.id}</p></div>
          <button onClick={onClose} className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center font-bold">✕</button>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button onClick={() => setTab("KESEHATAN")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 ${tab === "KESEHATAN" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> Medis</button>
          <button onClick={() => { if(activeHealth) setAppToast({message: "Sapi dalam perawatan. Selesaikan di tab Medis.", type: "error"}); else if(isJantan) setAppToast({message: "Menu Reproduksi khusus sapi betina", type: "error"}); else setTab("REPRO"); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 ${tab === "REPRO" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"} ${activeHealth || isJantan ? "opacity-50" : ""}`}>{ICON_HEART_OUTLINE} Reproduksi</button>
        </div>

        {tab === "REPRO" && !activeHealth && (
          <div className="space-y-4 fade-in">
            
            <FF label="Jenis Aksi">
              <select className={`${inp} bg-white`} value={resRepro} onChange={e => setResRepro(e.target.value)}>
                <option value="NONE">-- Pilih Aksi --</option>
                {(item?.status_reproduksi || item?.phase) === "ABORTUS_PENDING" ? (
                  <option value="TERAPI">✅ Sudah Mendapatkan Terapi Medis</option>
                ) : (
                  <>
                    <option value="IB">Inseminasi Buatan (IB)</option>
                    <option value="NEGATIVE">Pemeriksaan Kebuntingan: Negatif (-)</option>
                    <option value="POSITIVE">Pemeriksaan Kebuntingan: Positif (+)</option>
                    <option value="CALVED">Kelahiran Normal (Partus)</option>
                    <option value="ABORTUS">Keguguran (Abortus)</option>
                    <option value="TERAPI">Terapi Hormon / Medis Repro</option>
                  </>
                )}
              </select>
            </FF>

            {resRepro !== 'POSITIVE' && resRepro !== 'NEGATIVE' && (
              <div className="pop-in mt-2">
                <FF label="Tanggal Tindakan / Kejadian">
                  <input type="date" className={`${inp} bg-white`} value={dRepro} onChange={e => setDRepro(e.target.value)} />
                </FF>
              </div>
            )}

            {resRepro === "POSITIVE" && (
              <div className="pop-in p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-2 mt-2">
                {(() => {
                  const sortedIB = [...(item?.ibLog || [])].sort((a, b) => {
                    const da = typeof a === 'object' ? a.date : a;
                    const db = typeof b === 'object' ? b.date : b;
                    return new Date(da) - new Date(db);
                  });
                  const hasIB = sortedIB.length > 0;
                  const lastIBDate = hasIB ? (typeof sortedIB[sortedIB.length - 1] === 'object' ? sortedIB[sortedIB.length - 1].date : sortedIB[sortedIB.length - 1]) : null;

                  if (hasIB) {
                    return (
                      <div>
                        <p className="text-[11px] font-black text-emerald-900 mb-1.5 uppercase tracking-widest">✅ Data Kawin Ditemukan</p>
                        <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                          Sistem akan menghitung HPL presisi berdasarkan tanggal IB/Kawin terakhir.
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <>
                        <FF label="Perkiraan Umur Kebuntingan (Bulan)">
                          <input type="number" className={`${inp} bg-white`} value={pregMonth} onChange={e => setPregMonth(e.target.value)} placeholder="Contoh: 3" autoFocus />
                        </FF>
                        <p className="text-[10px] text-emerald-800 leading-relaxed font-semibold mt-1">
                          💡 Masukkan bulan kebuntingan hasil rabaan pemeriksaan dokter.
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
            )}

            {resRepro === "NEGATIVE" && (
              <div className="pop-in p-4 bg-rose-50 rounded-xl border border-rose-100 mb-2 mt-2">
                <p className="text-[10px] text-rose-800 leading-relaxed font-semibold">
                  💡 Status sapi akan dikembalikan menjadi Kosong (OPEN). Sistem mencatat waktu pemeriksaan otomatis pada hari ini.
                </p>
              </div>
            )}

            {resRepro === "TERAPI" && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 pop-in mb-1 mt-2">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">✅ Konfirmasi Terapi</p>
                <p className="text-xs font-bold text-emerald-700 leading-relaxed">
                  {(item?.status_reproduksi || item?.phase) === "ABORTUS_PENDING"
                    ? "Sapi telah ditangani petugas. Peringatan darurat dicabut dan sapi masuk masa PEMULIHAN (±45 Hari) sebelum boleh di-IB kembali."
                    : "Sapi telah diterapi medis. Peringatan merah dihapus dan status direset menjadi Kosong (OPEN)."
                  }
                </p>
              </div>
            )}

            {medicalWarning && (
              <div className="space-y-3 pop-in">
                <div className={`p-4 rounded-xl border font-bold text-[11px] ${medicalWarning.includes('❌') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                  {medicalWarning}
                </div>
                {medicalWarning.includes("Birahi Tidak Normal") && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] text-white font-black py-4 rounded-xl text-center text-sm shadow-md animate-pulse">
                    🚨 HUBUNGI PETUGAS (WA)
                  </a>
                )}
              </div>
            )}
            <button onClick={handleSaveRepro} disabled={medicalWarning?.includes('❌')} className={`w-full font-bold py-4 rounded-xl text-sm ${medicalWarning?.includes('❌') ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Simpan Aksi</button>
          </div>
        )}

        {tab === "KESEHATAN" && (
          <div className="space-y-4 fade-in">
            {activeHealth ? (
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
                <div className="mb-4">
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Status Perawatan</p>
                  <p className="text-xs font-bold text-emerald-700 leading-relaxed">
                    💡 INSTRUKSI: Wajib pantau lendir vulva setiap hari. Jika sudah diobati & lendir bening elastis, klik konfirmasi di bawah untuk membuka akses IB kembali.
                  </p>
                </div>
                <button onClick={() => submitHealth('SEMBUH')} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-sm shadow-lg hover:bg-emerald-700">✅ KONFIRMASI SEMBUH</button>
              </div>
            ) : (
              <>
                <FF label="Tanggal Gejala"><input type="date" className={`${inp} bg-white`} value={dHealth} onChange={e => setDHealth(e.target.value)} /></FF>
                <FF label="Keluhan"><textarea className={`${inp} bg-white h-20`} value={kondisi} onChange={e => setKondisi(e.target.value)} placeholder="Tulis gejala..." /></FF>
                <button onClick={() => submitHealth('LAPOR')} className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl text-sm hover:bg-orange-700">Lapor Petugas</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShareSummaryModal({ open, onClose, stats, profile, dbCattle, setAppToast }) {
  const cardRef = React.useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!open) return null;
  const ownerName = profile?.name || "Peternak";
  const address = profile?.alamat || profile?.desa || "Tuban";

  const safeDbForChart = Array.isArray(dbCattle) ? dbCattle : [];
  const femaleForChart = safeDbForChart.filter(i => i && (i.jenis_kelamin || i.gender) !== "JANTAN");
  const totalFemale = femaleForChart.length;
  const pregnantN = femaleForChart.filter(i => (i.status_reproduksi || i.phase) === "PREGNANT").length;
  const belumBuntingN = femaleForChart.filter(i => (i.status_reproduksi || i.phase) === "BRED").length;
  const tidakBuntingN = totalFemale - pregnantN - belumBuntingN;

  const shareChartData = [
    { name: "Bunting", value: pregnantN, color: COLOR_HEX.emerald },
    { name: "Belum Bunting", value: belumBuntingN, color: COLOR_HEX.amber },
    { name: "Tidak Bunting", value: tidakBuntingN, color: COLOR_HEX.slate }
  ];

  const handleShareImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#0f172a' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `sirapi-laporan-${todayStr()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Laporan Populasi ${ownerName}`,
          text: `Laporan populasi ternak ${ownerName} dari Aplikasi SIRAPI Tuban.`
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `sirapi-laporan-${todayStr()}.png`;
        link.click();
        setAppToast({ message: "Gambar berhasil diunduh! Silakan bagikan manual ke platform pilihan Anda.", type: "success" });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setAppToast({ message: "Gagal membuat/membagikan gambar laporan. Coba lagi.", type: "error" });
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 pop-in" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div ref={cardRef} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-7 text-white shadow-2xl relative overflow-hidden border border-slate-700">
          <div className="relative z-10">
            <h2 className="text-2xl font-black leading-tight">Laporan Populasi Ternak</h2>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-1">{ownerName} • {address}</p>
            <p className="text-slate-500 text-[9px] font-semibold mb-5">{fmtDate(new Date())}</p>

            {totalFemale > 0 && (
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 mb-4">
                <div className="relative shrink-0" style={{ width: 90, height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={shareChartData} dataKey="value" innerRadius={26} outerRadius={42} paddingAngle={3}>
                        {shareChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-lg font-black text-white leading-none">{totalFemale}</p>
                    <p className="text-[6px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Ekor</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {shareChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                      <span className="font-semibold text-slate-300 flex-1 truncate">{entry.name}</span>
                      <span className="font-black text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-white/5 p-3 rounded-xl text-center"><p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">Total</p><p className="text-xl font-black">{stats.total}</p></div>
              <div className="bg-white/5 p-3 rounded-xl text-center"><p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">Indukan</p><p className="text-xl font-black">{stats.betina}</p></div>
              <div className="bg-white/5 p-3 rounded-xl text-center"><p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">Pejantan</p><p className="text-xl font-black">{stats.jantan}</p></div>
            </div>

            <p className="text-center text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-4">Dibuat dari Aplikasi SIRAPI Tuban</p>
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleShareImage} disabled={isGenerating} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-colors">
            {isGenerating ? 'Membuat Gambar...' : '📤 Bagikan sebagai Gambar'}
          </button>
          <p className="text-center text-white/50 text-[10px] font-semibold mt-3 mb-4">Bisa dibagikan langsung ke WhatsApp, Instagram, Facebook, dan platform lain</p>
          <button onClick={onClose} className="w-full bg-white/10 text-white border border-white/20 py-3 rounded-2xl font-bold text-sm hover:bg-white/20 transition-colors">Tutup</button>
        </div>
      </div>
    </div>
  );
}

function ReproStatusChart({ dbCattle }) {
  const [kandangInfoOpen, setKandangInfoOpen] = useState(false);
  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const femaleCattle = safeDb.filter(item => item && (item.jenis_kelamin || item.gender) !== "JANTAN");
  const total = femaleCattle.length;

  if (total === 0) {
    return (
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 text-center">
        <p className="text-xs font-bold text-slate-400">Belum ada data sapi betina untuk ditampilkan.</p>
      </div>
    );
  }

  const counts = {};
  const detailCounts = {}; // { statusLabel: { count, color, isUrgent } }
  femaleCattle.forEach(item => {
    const status = item.status_reproduksi || item.phase || "OPEN";
    counts[status] = (counts[status] || 0) + 1;

    let analysis = null;
    try { analysis = analyzeCattle(item); } catch (e) { analysis = null; }
    const detailLabel = (analysis?.statusLabel || status).replace(/⚠️|🚨/g, '').trim();
    if (!detailCounts[detailLabel]) {
      detailCounts[detailLabel] = { count: 0, color: COLOR_HEX[analysis?.color] || COLOR_HEX.slate, isUrgent: !!analysis?.isUrgent };
    }
    detailCounts[detailLabel].count += 1;
    if (analysis?.isUrgent) detailCounts[detailLabel].isUrgent = true;
  });

  const pregnantCount = counts["PREGNANT"] || 0; // sudah diperiksa petugas, hasil positif
  const belumBuntingCount = counts["BRED"] || 0; // sudah IB, belum diperiksa petugas
  const tidakBuntingCount = total - pregnantCount - belumBuntingCount; // belum bunting (kosong/pedet/pasca melahirkan/dll)

  const chartData = [
    { name: "PREGNANT", label: "Bunting", value: pregnantCount, color: COLOR_HEX.emerald },
    { name: "BRED", label: "Belum Bunting", value: belumBuntingCount, color: COLOR_HEX.amber },
    { name: "OTHER", label: "Tidak Bunting", value: tidakBuntingCount, color: COLOR_HEX.slate }
  ]; // sengaja tidak difilter value > 0 — tabel di bawah harus tetap menampilkan ketiga kategori meski jumlahnya 0

  const detailRows = Object.entries(detailCounts)
    .map(([label, info]) => ({ label, ...info }))
    .sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0) || b.count - a.count);

  const urgentCount = detailRows.filter(r => r.isUrgent).reduce((sum, r) => sum + r.count, 0);
  const urgentPct = total > 0 ? (urgentCount / total) * 100 : 0;

  let kandangLabel = "Kondisi Baik";
  let kandangBg = "bg-emerald-100";
  let kandangColor = "text-emerald-700";
  let kandangIcon = <polyline points="20 6 9 17 4 12"></polyline>;
  if (urgentPct > 30) {
    kandangLabel = "Kritis"; kandangBg = "bg-rose-100"; kandangColor = "text-rose-700";
    kandangIcon = <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></>;
  } else if (urgentPct > 10) {
    kandangLabel = "Waspada"; kandangBg = "bg-amber-100"; kandangColor = "text-amber-700";
    kandangIcon = <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></>;
  } else if (urgentPct > 0) {
    kandangLabel = "Cukup Baik"; kandangBg = "bg-blue-100"; kandangColor = "text-blue-700";
    kandangIcon = <polyline points="20 6 9 17 4 12"></polyline>;
  }

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-800 text-base mb-1">Distribusi Status Reproduksi</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Populasi Betina Aktif</p>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setKandangInfoOpen(!kandangInfoOpen)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${kandangBg}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={kandangColor}>{kandangIcon}</svg>
            <span className={`text-[9px] font-black uppercase tracking-wide whitespace-nowrap ${kandangColor}`}>{kandangLabel}</span>
          </button>
          {kandangInfoOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 text-white text-[10px] font-medium leading-relaxed rounded-xl p-3 shadow-xl z-20">
Menunjukkan seberapa banyak sapi yang butuh penanganan mendesak dari petugas. Semakin tinggi tingkatnya — dari <strong>Kondisi Baik</strong>, <strong>Cukup Baik</strong>, <strong>Waspada</strong>, hingga <strong>Kritis</strong> — semakin banyak sapi yang perlu segera diperiksa.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={40} outerRadius={60} paddingAngle={3}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xl font-black text-slate-800 leading-none">{total}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ekor Betina</p>
          </div>
        </div>

        <table className="flex-1 min-w-0 text-left">
          <tbody>
            {chartData.map((entry, index) => {
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <tr key={index} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-[10.5px] font-semibold text-slate-600 truncate">{entry.label}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right text-[11px] font-black text-slate-800 whitespace-nowrap">{entry.value}</td>
                  <td className="py-1.5 pl-2 text-right text-[10px] font-bold text-slate-400 whitespace-nowrap">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] font-medium text-slate-400 leading-relaxed mt-3 bg-slate-50 rounded-lg px-3 py-2 space-y-1">
        <p>💡 Persentase dihitung dari total <strong className="text-slate-600">{total} ekor</strong> sapi betina:</p>
        <p>• <strong className="text-emerald-600">Bunting</strong> — sudah diperiksa petugas/dokter hewan dan hasilnya positif.</p>
        <p>• <strong className="text-amber-600">Belum Bunting</strong> — sudah di-IB, tapi belum diperiksa kebuntingannya oleh petugas.</p>
        <p>• <strong className="text-slate-600">Tidak Bunting</strong> — kategori sapi yang saat ini belum bunting (pedet/dara, kosong, pasca melahirkan, dll). Lihat rincian lengkapnya di bawah.</p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rincian Kondisi Detail</p>
        <div className="space-y-1.5">
          {detailRows.map((row, idx) => (
            <div key={idx} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${row.isUrgent ? "bg-rose-50" : "bg-slate-50"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }}></div>
                <span className={`text-[10.5px] font-semibold truncate ${row.isUrgent ? "text-rose-700" : "text-slate-600"}`}>{row.label}</span>
              </div>
              <span className={`text-[11px] font-black shrink-0 ${row.isUrgent ? "text-rose-700" : "text-slate-800"}`}>{row.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ dbCattle, profile, onAdviceClick, setAppToast }) {
 const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const total = safeDb.length;
  const jantan = safeDb.filter(i => i && (i.jenis_kelamin === "JANTAN" || i.gender === "JANTAN")).length;
  const betina = safeDb.filter(i => i && (i.jenis_kelamin === "BETINA" || i.gender === "BETINA")).length;
  const pregnant = safeDb.filter(i => i && (i.status_reproduksi === "PREGNANT" || i.phase === "PREGNANT")).length;
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const itemsWithAdvice = safeDb.map(item => {
    if (!item) return null;
    try { 
      const analysis = analyzeCattle(item); 
      return analysis.isUrgent ? { item, analysis } : null; 
    } 
    catch (e) { return null; }
  }).filter(Boolean).sort((a, b) => {
    if (a.analysis.isUrgent && !b.analysis.isUrgent) return -1;
    if (!a.analysis.isUrgent && b.analysis.isUrgent) return 1;
    return 0;
  });

  return (
    <div className="fade-in pb-28 pt-2">
      <div className="px-5 space-y-6">
        <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
           <div className="flex justify-between items-start relative z-10">
             <div>
               <p className="text-xs font-semibold text-slate-400">Selamat Datang,</p>
               <h2 className="text-xl font-black mt-0.5">{profile?.name || "Peternak"}</h2>
             </div>
             <button onClick={() => setShareModalOpen(true)} className="bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/20 transition-colors">Bagikan</button>
           </div>
           <div className="mt-5 flex gap-4 border-t border-white/10 pt-4">
              <div className="flex-1"><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Aset</p><p className="font-black text-2xl">{total} <span className="text-base font-medium">Ekor</span></p></div>
              <div className="flex-1"><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Indukan Bunting</p><p className="font-black text-2xl text-emerald-400">{pregnant} <span className="text-base font-medium">Ekor</span></p></div>
           </div>
        </div>

        <ReproStatusChart dbCattle={safeDb} />

        <div>
          <button onClick={() => setAdviceOpen(o => !o)} className="flex items-center justify-between w-full mb-4 ml-1">
             <div className="flex items-center">
               <h3 className="font-black text-slate-800 text-base">Saran & Peringatan</h3>
               {itemsWithAdvice.length > 0 && <span className="ml-2 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md text-[10px] font-bold">{itemsWithAdvice.length}</span>}
             </div>
             <svg className={`text-slate-400 transition-transform duration-300 ${adviceOpen ? "rotate-180" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          {adviceOpen && (
            itemsWithAdvice.length === 0 ? (
              <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-200 text-center"><p className="text-xs text-emerald-800 font-bold">✨ Semua populasi kandang dalam kondisi prima.</p></div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
                {itemsWithAdvice.map(({ item, analysis }) => (<AdviceCard key={item.id} item={item} analysis={analysis} onClick={onAdviceClick} ownerName={profile?.name} />))}
              </div>
            )
          )}
        </div>
      </div>
      <ShareSummaryModal open={shareModalOpen} onClose={() => setShareModalOpen(false)} stats={{total, jantan, betina, pregnant}} profile={profile} dbCattle={safeDb} setAppToast={setAppToast} />
    </div>
  );
}

function AcademyView() {
  const handleJoinZoom = () => {
    const zoomLink = "https://zoom.us/j/1234567890"; 
    window.open(zoomLink, '_blank');
  };

  return (
    <div className="pb-32 fade-in bg-cream min-h-screen">
      <div className="bg-white px-5 pt-8 pb-8 border-b border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akademi SIRAPI</h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Peternak Wajib Pintar</p>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="bg-emerald-700 rounded-[24px] p-6 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-emerald-900/50 text-emerald-50 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase inline-block">E-Book Edukasi</span>
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase animate-pulse">Segera Hadir</span>
            </div>
            <h3 className="text-xl font-black mb-2 leading-snug text-white">Panduan Mencegah Kegagalan Kebuntingan pada Sapi</h3>
            <p className="text-xs font-medium text-emerald-100 mb-6 leading-relaxed">
              Disusun oleh dokter hewan dan ahli reproduksi ternak, berisi panduan teknis untuk membantu peternak meningkatkan keberhasilan program inseminasi buatan.
            </p>
            <button disabled className="w-full bg-emerald-800/50 text-emerald-200 font-black py-3.5 rounded-xl text-sm transition-colors cursor-not-allowed border border-emerald-600">
              Segera Hadir...
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 ml-2">Jadwal Live Edukasi</h3>
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              </div>
              <div className="w-full">
                <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Via Zoom</span>
                <h4 className="font-black text-sm text-slate-800 mt-1.5 mb-1">Konsultasi Peternak Cerdas</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Tanya jawab langsung seputar reproduksi & penanganan sapi majir.</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rutin Tiap Minggu</p>
                <p className="font-black text-blue-700 text-sm">Selasa Malam</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pukul</p>
                <p className="font-black text-slate-700 text-sm">19.30 WIB</p>
              </div>
            </div>

            <button onClick={handleJoinZoom} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-4 px-4 rounded-xl shadow-sm transition-colors w-full">
              Gabung Zoom Meeting
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 ml-2">Materi Pembelajaran</h3>
          <div className="p-6 bg-white rounded-[24px] border border-slate-100 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📚</span>
            </div>
            <p className="text-sm font-bold text-slate-700">Modul sedang disiapkan</p>
            <p className="text-xs text-slate-500 mt-1">Materi edukasi akan segera hadir di sini.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function AddModal({ open, onClose, onSave, editItem, setAppToast }) {
  const [id, setId] = useState(""); 
  const [ras, setRas] = useState("SIMENTAL SPSI"); 
  const [gender, setGender] = useState("BETINA"); 
  const [phase, setPhase] = useState("CALF"); 
  const [birthDate, setBirthDate] = useState(""); 
  const [origin, setOrigin] = useState("KANDANG");
  const [ageInMonths, setAgeInMonths] = useState("");
  const [parity, setParity] = useState("0"); 
  const [lastMatingDate, setLastMatingDate] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);

  let currentAgeMonths = 0;
  if (origin === 'PASAR') {
     currentAgeMonths = Number(ageInMonths);
  } else if (birthDate) {
     currentAgeMonths = Math.floor((new Date() - new Date(birthDate)) / (86400000 * 30));
  }
  const isUnderage = currentAgeMonths !== 0 && currentAgeMonths < 18;

  useEffect(() => {
    if (open) {
      setIsSaving(false);
      if (editItem) {
        setId(editItem.code || editItem.id || "");
        setRas(editItem.jenis_ras || "SIMENTAL SPSI");
        setGender(editItem.jenis_kelamin || editItem.gender || "BETINA");
        setOrigin(editItem.asal_usul_sapi || "KANDANG");
        if (editItem.asal_usul_sapi === 'KANDANG' && editItem.tanggal_lahir) {
          setBirthDate(editItem.tanggal_lahir);
        } else if (editItem.asal_usul_sapi === 'PASAR' && editItem.tanggal_lahir) {
          const ageMonths = Math.floor((new Date() - new Date(editItem.tanggal_lahir)) / (86400000 * 30));
          const ageOptions = [12, 24, 36, 48, 60];
          const closest = ageOptions.reduce((prev, curr) => Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev, ageOptions[0]);
          setAgeInMonths(String(closest));
        }

        let editPhase = editItem.status_reproduksi || editItem.phase;
        if (editPhase === "N/A" || !editPhase) editPhase = "CALF";
        setPhase(editPhase);
        setParity(editItem.jumlah_beranak || "0");
        
        if ((editPhase === "BRED" || (editPhase === "PREGNANT" && editItem.asal_usul_sapi === 'KANDANG')) && editItem.ibLog && editItem.ibLog.length > 0) {
           const lastIb = editItem.ibLog[editItem.ibLog.length - 1];
           setLastMatingDate(typeof lastIb === 'object' ? lastIb.date : lastIb);
        } else if (editPhase === "PREGNANT" && editItem.conceptionDate) {
           setLastMatingDate(editItem.conceptionDate); 
        } else {
           setLastMatingDate("");
        }
      } else {
        setId("");
        setRas("SIMENTAL SPSI");
        setGender("BETINA");
        setPhase("CALF");
        setBirthDate("");
        setOrigin("KANDANG");
        setAgeInMonths("");
        setParity("0");
        setLastMatingDate("");
      }
    }
  }, [open, editItem]);

  useEffect(() => {
    if (gender === 'BETINA') {
      if (isUnderage) {
        if (phase !== 'CALF') setPhase('CALF');
      } else if (currentAgeMonths >= 18 && phase === 'CALF') {
        setPhase('OPEN'); 
      }
    }
  }, [isUnderage, currentAgeMonths, gender, phase]); 

  useEffect(() => {
    if (phase === 'CALF' || gender === 'JANTAN') {
      setParity("0");
    }
  }, [phase, gender]);

  const save = async () => { 
    if (!id.trim()) return setAppToast({message: "Isi Kode/Tag Sapi!", type: "error"}); 

    let calculatedBirthDate;
    if (origin === 'PASAR') {
      if (!ageInMonths) return setAppToast({message: "Perkiraan Umur (Gigi Poel) wajib diisi untuk sapi dari pasar!", type: "error"});
      const birth = new Date();
      birth.setMonth(birth.getMonth() - Number(ageInMonths));
      calculatedBirthDate = birth.toISOString().split("T")[0];
    } else {
      if (!birthDate) return setAppToast({message: "Tanggal Lahir wajib diisi untuk sapi dari kandang!", type: "error"});
      calculatedBirthDate = birthDate;
    }
    
    const requiresMatingDate = phase === 'BRED' || (phase === 'PREGNANT' && origin === 'KANDANG');
    if (requiresMatingDate && !lastMatingDate) {
      return setAppToast({message: "Tanggal Kawin Terakhir wajib diisi!", type: "error"});
    }

    const parityNum = Number(parity);
    if (gender === 'BETINA' && (isNaN(parityNum) || parityNum < 0)) {
      return setAppToast({message: "Jumlah beranak (paritas) tidak boleh negatif!", type: "error"});
    }

    const profileStr = localStorage.getItem('srtt_user_profile');
    const profile = profileStr ? JSON.parse(profileStr) : null;
    
    if (!profile || !profile.id) return setAppToast({message: "Sesi profil tidak ditemukan, harap login ulang.", type: "error"});

    setIsSaving(true);
    try {
      const { profileService } = await import('./core/profileService');
      const { cattleService } = await import('./core/cattleService');
      
      const farmResult = await profileService.getFarm(profile.id);
      let farmId;
      
      if (farmResult.success && farmResult.farm) {
        farmId = farmResult.farm.id;
      } else {
        const autoFarmName = "Kandang " + (profile.name || "Peternak");
        const autoAddress = profile.alamat || profile.desa || "Tuban";
        const createResult = await profileService.createFarm(profile.id, autoFarmName, autoAddress);
        
        if (!createResult.success) {
          setIsSaving(false);
          return setAppToast({message: "Gagal sinkronisasi data pendaftaran: " + createResult.error, type: "error"});
        }
        farmId = createResult.farm.id; 
      }

      const cattleData = {
        code: id.trim().toUpperCase(),
        jenis_kelamin: gender,
        jenis_ras: ras,
        asal_usul_sapi: origin,
        tanggal_lahir: calculatedBirthDate,
        status_reproduksi: gender === "JANTAN" ? "N/A" : phase,
        jumlah_beranak: gender === 'BETINA' ? Number(parity) : 0,
        ibLog: requiresMatingDate && lastMatingDate ? [{ date: lastMatingDate, isSuspect: false }] : []
      };

      if (phase === 'PREGNANT' && origin === 'KANDANG' && lastMatingDate) {
        cattleData.conceptionDate = lastMatingDate;
      }

      if (editItem) {
        const result = await cattleService.updateCattle(editItem.id, cattleData);
        if (!result.success) {
          setIsSaving(false);
          return setAppToast({message: "Gagal update sapi: " + result.error, type: "error"});
        }
        setAppToast({message: "Data sapi berhasil diupdate!", type: "success"});
      } else {
        const result = await cattleService.createCattle(farmId, profile.id, cattleData);
        if (!result.success) {
           setIsSaving(false);
           return setAppToast({message: "Gagal tambah sapi: " + result.error, type: "error"});
        }
        setAppToast({message: "Sapi baru berhasil ditambahkan!", type: "success"});
      }

      if (onSave) onSave(); 
      if (onClose) onClose(); 
    } catch (e) {
      setIsSaving(false);
      setAppToast({message: "Terjadi kesalahan sistem.", type: "error"});
    }
  };
  
  if (!open) return null; 
  
  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all";
  
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 sm:items-center">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[32px] sm:rounded-[32px] p-6 slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6"><p className="font-black text-2xl text-slate-900 tracking-tight">{editItem ? "Edit Aset" : "Input Sapi Baru"}</p><button onClick={onClose} className="bg-slate-100 w-9 h-9 rounded-full flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200">✕</button></div>
        <div className="space-y-2">
          <FF label="Kode Sapi / Tag"><input className={inp} value={id} onChange={e => setId(e.target.value)} placeholder="Cth: L-01" /></FF>
          <div className="flex gap-4 mb-4"><div className="flex-1"><FF label="Jenis Kelamin"><select className={inp} value={gender} onChange={e => setGender(e.target.value)}><option value="BETINA">Betina</option><option value="JANTAN">Jantan</option></select></FF></div><div className="flex-1"><FF label="Jenis Ras"><select className={inp} value={ras} onChange={e => setRas(e.target.value)}><option>SIMENTAL SPSI</option><option>Limosin SPLI</option><option>PO SPPO</option><option>Brahman</option></select></FF></div></div>
          <FF label="Asal Usul Sapi"><select className={inp} value={origin} onChange={e => setOrigin(e.target.value)}><option value="KANDANG">Lahir di Kandang (Breeding)</option><option value="PASAR">Beli dari Luar (Pasar)</option></select></FF>
          
          {origin === 'KANDANG' ? (
            <div className="pop-in"><FF label="Tanggal Lahir (Wajib)"><input type="date" className={inp} value={birthDate} onChange={e => setBirthDate(e.target.value)} /></FF></div>
          ) : (
            <div className="pop-in">
              <FF label="Perkiraan Umur (Cek Gigi Poel)">
                <select className={`${inp} bg-white`} value={ageInMonths} onChange={e => setAgeInMonths(e.target.value)}>
                  <option value="">-- Pilih Kondisi Gigi Seri Bawah --</option>
                  <option value="12">Belum Poel / Gigi Susu Utuh (&lt; 1.5 Tahun)</option>
                  <option value="24">Poel 1 Pasang / 2 Gigi Tetap (± 2 - 2.5 Tahun)</option>
                  <option value="36">Poel 2 Pasang / 4 Gigi Tetap (± 3 Tahun)</option>
                  <option value="48">Poel 3 Pasang / 6 Gigi Tetap (± 4 Tahun)</option>
                  <option value="60">Poel 4 Pasang / Penuh (Lebih dari 4.5 Tahun)</option>
                </select>
              </FF>
              <p className="text-[10px] text-slate-500 -mt-2 px-2 font-medium">💡 Sistem akan mengestimasi tanggal lahir otomatis dari data poel.</p>
            </div>
          )}

          {/* 👇 PERBAIKAN: Kunci ganda agar kolom Paritas lenyap total untuk pedet/isUnderage */}
          {gender === 'BETINA' && !isUnderage && phase !== 'CALF' && (
            <div className="pop-in mt-2 mb-2">
              <FF label="Sudah Berapa Kali Beranak? (Paritas)">
                <input type="number" className={inp} value={parity} onChange={e => setParity(e.target.value)} placeholder="Contoh: 2 (Isi 0 jika belum pernah)" min="0" />
              </FF>
              <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg -mt-2 font-medium leading-relaxed">
                💡 <strong>Tips Lapangan:</strong> Jika sapi dari pasar (bertanduk), hitung jumlah ruas/cincin pada pangkal tanduk untuk memperkirakan sudah berapa kali ia beranak.
              </p>
            </div>
          )}

          {gender === "BETINA" && (
            <FF label="Status Reproduksi Saat Ini">
              <select className={inp} value={phase} onChange={e => { 
                setPhase(e.target.value);
                
                if (origin === 'PASAR' && !isUnderage && (e.target.value === 'OPEN' || e.target.value === 'PREGNANT')) {
                  setAppToast({ 
                    message: "🚨 Sapi Pasar Dewasa WAJIB diperiksa Dokter Hewan!", 
                    type: "error" 
                  });
                }
              }} disabled={isUnderage}>
                
                {!(origin === 'PASAR' && !isUnderage) && (
                  <option value="CALF">Pedet / Dara Belum Kawin</option>
                )}
                
                {!isUnderage && (
                  <option value="OPEN">Kosong (Siap Kawin)</option>
                )}
                
                {!isUnderage && origin === 'KANDANG' && (
                  <option value="BRED">Sudah Kawin (Belum Diperiksa)</option>
                )}
                
                {!isUnderage && origin === 'PASAR' && (
                  <option value="PREGNANT">Bunting (Dari Pasar)</option>
                )}
                
                {!isUnderage && origin === 'KANDANG' && (
                  <option value="PREGNANT">Bunting</option>
                )}
              </select>

              {(phase === 'BRED' || (phase === 'PREGNANT' && origin === 'KANDANG')) && (
                <div className="pop-in mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-800 mb-1.5 uppercase tracking-widest">Tanggal Kawin Terakhir</p>
                  <input 
                    type="date" 
                    className={`${inp} bg-white`} 
                    value={lastMatingDate} 
                    onChange={e => setLastMatingDate(e.target.value)} 
                  />
                </div>
              )}

              {origin === 'PASAR' && !isUnderage && (phase === 'OPEN' || phase === 'PREGNANT') && (
                <div className="pop-in mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl shadow-sm">
                  <p className="text-[10px] font-black text-rose-800 mb-1.5 uppercase tracking-widest flex items-center gap-1">🚨 Wajib Pemeriksaan Medis</p>
                  <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                    Peternak tidak bisa memastikan sapi pasar kosong atau bunting hanya dari fisik. <strong>Wajib laporkan ke petugas medis/dokter hewan</strong> untuk dilakukan pemeriksaan kebuntingan agar tidak salah penanganan!
                  </p>
                </div>
              )}

              {origin === 'KANDANG' && (phase === 'OPEN' || phase === 'PREGNANT') && (
                <div className="pop-in mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
                    <strong>💡 Rekomendasi:</strong> Sangat disarankan untuk dilakukan pemeriksaan oleh petugas/dokter hewan untuk memastikan status reproduksi dan kesehatan rahim secara akurat.
                  </p>
                </div>
              )}
            </FF>
          )}
        </div>
        <button onClick={save} disabled={isSaving} className={`w-full font-bold py-4 rounded-xl mt-6 text-sm shadow-lg transition-colors ${isSaving ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
          {isSaving ? 'Menyimpan...' : 'Simpan Data Ternak'}
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({ open, onClose, onSave, currentProfile, setAppToast }) {
  const [name, setName] = useState(currentProfile?.name || '');
  const [nik, setNik] = useState(currentProfile?.nik || '');
  const [address, setAddress] = useState(currentProfile?.alamat || currentProfile?.desa || '');
  const [photo, setPhoto] = useState(currentProfile?.photo || '');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (open && currentProfile) {
      setName(currentProfile.name || '');
      setNik(currentProfile.nik || '');
      setAddress(currentProfile.alamat || currentProfile.desa || '');
      setPhoto(currentProfile.photo || '');
    }
  }, [open, currentProfile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setAppToast({message: "Harap pilih file gambar (JPG, PNG, dll)", type: "error"});

    setIsLoading(true);
    try {
       const { profileService } = await import('./core/profileService');
       const result = await profileService.uploadProfilePhoto(currentProfile.id, file);
       
       if (result.success) { setPhoto(result.url); setAppToast({message: "Foto berhasil diupload!", type: "success"}); } 
       else setAppToast({message: "Gagal upload foto: " + result.error, type: "error"});
    } catch(e) {
       setAppToast({message: "Terjadi kesalahan server", type: "error"});
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return setAppToast({message: "Nama Pemilik wajib diisi!", type: "error"});
    if (!nik.trim()) return setAppToast({message: "NIK wajib diisi untuk keperluan pendataan Dinas!", type: "error"});
    if (!/^\d{16}$/.test(nik.trim())) return setAppToast({message: "NIK harus terdiri dari 16 digit angka sesuai KTP!", type: "error"});
    if (!address.trim()) return setAppToast({message: "Alamat wajib diisi!", type: "error"});

    setIsLoading(true);
    try {
      const { profileService } = await import('./core/profileService');

      // Update user profile
      const updateResult = await profileService.updateUserProfile(currentProfile.id, {
        name: name.trim(), nik: nik.trim(), photo: photo || null, alamat: address.trim()
      });

      if (!updateResult.success) {
        setIsLoading(false);
        return setAppToast({message: "Gagal update profil: " + updateResult.error, type: "error"});
      }

      // SINKRONISASI DATABASE KANDANG SECARA OTOMATIS
      const autoFarmName = "Kandang " + name.trim();
      const farmResult = await profileService.getFarm(currentProfile.id);
      
      if (farmResult.success && farmResult.farm) {
        await profileService.updateFarm(farmResult.farm.id, autoFarmName, address.trim());
      } else {
        await profileService.createFarm(currentProfile.id, autoFarmName, address.trim());
      }

      onSave({ ...updateResult.user, alamat: address.trim() });
      setAppToast({message: "Profil berhasil diperbarui!", type: "success"});
      onClose();
    } catch(e) {
      setAppToast({message: "Terjadi kesalahan sistem", type: "error"});
    }
    setIsLoading(false);
  };

  if (!open) return null;
  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-sm rounded-[24px] p-6 pop-in shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-black text-xl text-slate-900 mb-5 tracking-tight">Edit Profil</h3>
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-400 mb-3 shadow-inner overflow-hidden border-4 border-white">
            {photo ? <img src={photo} alt="Profil" className="w-full h-full object-cover" /> : <span>{name ? name.charAt(0).toUpperCase() : "U"}</span>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" disabled={isLoading} />
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50" disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Ganti Foto'}
          </button>
        </div>
        <div className="space-y-4">
          <FF label="Nama Lengkap (Sesuai KTP)">
            <input className={inp} value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
          </FF>
          <FF label="NIK (Sesuai KTP)">
            <input
              type="text"
              inputMode="numeric"
              className={inp}
              value={nik}
              onChange={e => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="16 digit NIK KTP"
              maxLength={16}
              disabled={isLoading}
            />
          </FF>
          <FF label="Alamat Lengkap">
            <textarea className={inp + " h-24 resize-none"} value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} />
          </FF>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={isLoading}>Batal</button>
          <button onClick={handleSave} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Profil'}</button>
        </div>
      </div>
    </div>
  );
}

const ICON_HOME = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3z"></path></svg>;
const ICON_COW = <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor"><path d="M85.9,46.1c-1.9-2.2-4.1-4-6.5-5.3c0,0-11-6-11.4-6.3c-0.1,0-0.1-0.1-0.2-0.1c-1.3-1-3.1-1.3-4.7-0.7 c-0.7,0.3-1.4,0.7-1.9,1.3c-2.3,2.4-5.3,4.6-8.3,4.6c-2.6,0-5.1-1.6-7-4.1c-1.7-2.3-3.6-3.8-5.6-4.6c-0.1,0-0.2-0.1-0.3-0.1 C38,30.3,36.1,30.7,34.8,32c-0.1,0.1-0.1,0.1-0.2,0.1C33,33.5,22,41.4,22,41.4c-2.2,1.6-3.7,3.9-4,6.4c-0.3,2.5,0.7,5,2.6,6.6 c0.1,0.1,0.1,0.1,0.2,0.1c0.1,0,0.1,0,0.2,0.1c2.1,1.5,4.7,2.1,7.2,1.7c1.3-0.2,2.5-0.7,3.6-1.5c0.1-0.1,0.2-0.1,0.3-0.2 c2-1.9,4.5-2.8,7.1-2.8c2.9,0,5.6,1.2,7.4,3.1c1.8,1.9,4.1,3,6.6,3c2,0,3.9-0.8,5.3-2.2c0.1-0.1,0.1-0.1,0.2-0.1 c1.8-2,4.6-3,7.3-2.6c1.1,0.2,2.2,0.6,3.2,1.2c0.1,0.1,0.1,0.1,0.2,0.1c1.9,1.1,4.1,1.4,6.1,0.8c2-0.6,3.8-2,5-3.8 C86.7,50,86.9,48,85.9,46.1z M52.5,41.4c0,2.1-1.7,3.8-3.8,3.8c-2.1,0-3.8-1.7-3.8-3.8c0-2.1,1.7-3.8,3.8-3.8C50.8,37.6,52.5,39.3,52.5,41.4 z"></path></svg>;
const ICON_CALENDAR = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"></path></svg>;
const ICON_PHONE = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const ICON_PLUS = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ICON_PROFILE_CARD = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M5 17c0-1.7 1.8-3 4-3s4 1.3 4 3"></path><line x1="14" y1="8" x2="18" y2="8"></line><line x1="14" y1="12" x2="18" y2="12"></line></svg>;
const ICON_PULSE = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>;
const ICON_SHARE = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>;
const ICON_BOOK = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path></svg>;
const ICON_CHART = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9"></path><path d="M21 12a9 9 0 0 0-9-9v9z"></path></svg>;

function OnboardingTutorial({ open, onClose }) {
  const [step, setStep] = useState(0);

  useEffect(() => { if (open) setStep(0); }, [open]);

  const slides = [
    { icon: ICON_HOME, title: "Selamat Datang di SIRAPI", desc: "Aplikasi ini membantu Anda mencatat dan memantau kondisi reproduksi sapi — mulai dari kawin, bunting, melahirkan, hingga kesehatan — semua dalam satu tempat. Mari pelajari fitur-fiturnya langkah demi langkah." },
    { icon: ICON_COW, title: "Tab Populasi: Daftar Sapi Anda", desc: "Tab kedua di menu bawah. Semua sapi yang Anda miliki tercatat di sini, lengkap dengan kode dan status terkininya.", steps: ["Gunakan kolom pencarian untuk mencari sapi berdasarkan kode", "Gunakan filter jenis kelamin untuk melihat jantan/betina saja", "Ketuk salah satu kartu sapi untuk membuka detail lengkapnya"] },
    { icon: ICON_PLUS, title: "Menambah Sapi Baru", desc: "Di tab Populasi, ketuk tombol tambah untuk mendaftarkan sapi baru.", steps: ["Isi kode/nama sapi, jenis kelamin, dan jenis ras", "Pilih asal usul sapi (lahir di kandang sendiri atau dibeli dari pasar)", "Isi tanggal lahir (atau perkiraan umur jika dari pasar)", "Ketuk Simpan — sapi langsung muncul di daftar Populasi"] },
    { icon: ICON_HEART_OUTLINE, title: "Melapor Kawin (Inseminasi Buatan)", desc: "Buka detail sapi betina, lalu pilih tab Reproduksi.", steps: ["Pilih jenis aksi 'Kawin (IB)'", "Isi tanggal pelaksanaan IB", "Ketuk Simpan — status sapi otomatis berubah menjadi 'Sudah Kawin'"] },
    { icon: ICON_SEARCH, title: "Melapor Pemeriksaan Kebuntingan", desc: "Sekitar 60 hari setelah kawin, petugas akan memeriksa kebuntingan sapi Anda.", steps: ["Buka kembali tab Reproduksi pada sapi tersebut", "Pilih hasil pemeriksaan: Bunting atau Tidak Bunting", "Jika Bunting, sistem otomatis menghitung perkiraan tanggal lahir (HPL)"] },
    { icon: ICON_TAG, title: "Melapor Kelahiran", desc: "Saat sapi melahirkan, catat segera agar data tetap akurat.", steps: ["Buka tab Reproduksi sapi yang bunting", "Pilih aksi 'Lapor Melahirkan'", "Isi tanggal kelahiran — anak sapi bisa langsung didaftarkan sebagai pedet baru"] },
    { icon: ICON_PULSE, title: "Melapor Sapi Sakit", desc: "Buka detail sapi, lalu pilih tab Medis (di sebelah tab Reproduksi).", steps: ["Ketuk 'Lapor Gejala' dan jelaskan kondisi sapi", "Status berubah menjadi 'Menunggu Dokter'", "Petugas akan menindaklanjuti dan mencatat diagnosa serta tindakan"] },
    { icon: ICON_CALENDAR, title: "Tab Kalender: Prediksi Birahi", desc: "Tab ketiga di menu bawah. Pilih salah satu sapi betina untuk melihat kalender prediksinya.", steps: ["Sistem otomatis menghitung jadwal birahi berikutnya", "Jadwal pemeriksaan kebuntingan juga ditampilkan", "Perkiraan tanggal lahir (HPL) muncul untuk sapi yang sedang bunting", "Setiap istilah pada kalender disertai keterangan singkat di bawahnya"] },
    { icon: ICON_CHART, title: "Tab Beranda: Grafik Distribusi", desc: "Tab pertama di menu bawah. Grafik donat menunjukkan populasi sapi betina dalam 3 kategori.", steps: ["Bunting — sudah diperiksa petugas, hasil positif", "Belum Bunting — sudah di-IB, belum diperiksa", "Tidak Bunting — pedet, kosong, atau pasca melahirkan", "Ketuk badge kondisi di pojok kanan atas untuk lihat keterangannya"] },
    { icon: ICON_PHONE, title: "Saran & Hubungi Petugas", desc: "Masih di tab Beranda, gulir ke bawah untuk melihat kartu Saran & Peringatan.", steps: ["Setiap sapi yang butuh perhatian akan muncul di sini dengan saran otomatis", "Sapi yang butuh penanganan medis akan menampilkan tombol 'Hubungi Petugas'", "Ketuk tombol tersebut untuk langsung membuka percakapan WhatsApp"] },
    { icon: ICON_SHARE, title: "Membagikan Laporan", desc: "Di tab Beranda, ketuk tombol Bagikan untuk membuat ringkasan bergambar.", steps: ["Sistem membuat gambar grafik ringkasan populasi sapi Anda", "Ketuk 'Bagikan sebagai Gambar' untuk mengirim ke WhatsApp atau platform lain"] },
    { icon: ICON_BOOK, title: "Tab Akademi", desc: "Tab keempat di menu bawah. Berisi materi edukasi seputar reproduksi dan kesehatan sapi, serta jadwal live konsultasi dengan petugas." },
    { icon: ICON_PROFILE_CARD, title: "Tab Profil", desc: "Tab terakhir di menu bawah. Kelola data diri Anda di sini.", steps: ["Edit Profil — ubah data diri dan NIK", "Keamanan & Password — ganti password akun Anda", "Bantuan — buka kembali Cara Pakai Aplikasi atau tutorial ini kapan saja"] },
  ];

  if (!open) return null;
  const isLast = step === slides.length - 1;
  const current = slides[step];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="relative bg-white w-full max-w-sm rounded-[28px] shadow-2xl pop-in max-h-[88vh] flex flex-col overflow-hidden">
        <button onClick={onClose} className="absolute top-5 right-5 z-10 text-slate-300 hover:text-slate-500 text-[11px] font-bold">Lewati</button>

        <div className="overflow-y-auto p-7 pb-4 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-600">{current.icon}</div>
          <h3 className="font-black text-lg text-slate-900 mb-2">{current.title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{current.desc}</p>

          {current.steps && (
            <ol className="text-left space-y-2.5 mt-5 bg-slate-50 rounded-2xl p-4">
              {current.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-xs text-slate-600 font-medium leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-7 pb-7 pt-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Langkah {step + 1} dari {slides.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 mb-4 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${((step + 1) / slides.length) * 100}%` }}></div>
          </div>
          <div className="flex gap-3">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Kembali</button>}
            <button onClick={() => isLast ? onClose() : setStep(step + 1)} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all">{isLast ? "Mulai Pakai" : "Lanjut"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpGuideScreen({ open, onClose }) {
  const [openSection, setOpenSection] = useState(0);

  const sections = [
    { title: "Menambah Data Sapi Baru", body: "Buka tab Populasi, lalu ketuk tombol tambah. Isi data sapi (kode, jenis kelamin, ras, asal usul, tanggal lahir/masuk), lalu simpan." },
    { title: "Melaporkan Kawin (Inseminasi Buatan)", body: "Ketuk salah satu sapi betina di tab Populasi, pilih tab Reproduksi, lalu pilih aksi 'Kawin (IB)' dan isi tanggalnya. Status sapi otomatis berubah menjadi sudah kawin." },
    { title: "Melaporkan Pemeriksaan Kebuntingan", body: "Sekitar 60 hari setelah kawin, petugas akan memeriksa kebuntingan. Catat hasilnya lewat tab Reproduksi pada sapi tersebut — pilih hasil Bunting atau Tidak Bunting." },
    { title: "Melaporkan Kelahiran", body: "Saat sapi melahirkan, buka tab Reproduksi sapi tersebut, pilih aksi 'Lapor Melahirkan', lalu isi tanggal kelahirannya." },
    { title: "Melaporkan Sapi Sakit", body: "Buka detail sapi, pilih tab Medis, lalu catat gejala yang muncul. Petugas akan menindaklanjuti laporan tersebut." },
    { title: "Membaca Kalender Birahi", body: "Tab Kalender menunjukkan perkiraan jadwal birahi, jadwal pemeriksaan kebuntingan, dan perkiraan tanggal lahir untuk setiap sapi betina, dihitung otomatis dari data yang Anda masukkan." },
    { title: "Memahami Tab Beranda", body: "Tab Beranda menampilkan ringkasan status reproduksi seluruh sapi dan daftar sapi yang butuh perhatian segera, lengkap dengan tombol hubungi petugas." },
    { title: "Menghubungi Petugas", body: "Setiap saran yang membutuhkan tindak lanjut akan menampilkan tombol 'Hubungi Petugas' — ketuk untuk langsung membuka percakapan WhatsApp dengan petugas." },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-cream overflow-y-auto">
      <div className="bg-white px-5 pt-8 pb-6 border-b border-slate-200 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Cara Pakai Aplikasi</h2>
      </div>
      <div className="p-5 space-y-3 pb-12">
        {sections.map((s, i) => (
          <div key={i} className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={() => setOpenSection(openSection === i ? -1 : i)} className="w-full flex items-center justify-between p-4 text-left">
              <span className="font-bold text-sm text-slate-700 pr-2">{i + 1}. {s.title}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 shrink-0 transition-transform ${openSection === i ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {openSection === i && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordModal({ open, onClose, currentProfile, setAppToast }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowOld(false); setShowNew(false); setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!oldPassword) return setAppToast({ message: "Password lama wajib diisi!", type: "error" });
    if (!newPassword) return setAppToast({ message: "Password baru wajib diisi!", type: "error" });
    if (newPassword.length < 6) return setAppToast({ message: "Password baru minimal 6 karakter!", type: "error" });
    if (newPassword !== confirmPassword) return setAppToast({ message: "Konfirmasi password baru tidak cocok!", type: "error" });
    if (newPassword === oldPassword) return setAppToast({ message: "Password baru tidak boleh sama dengan password lama!", type: "error" });

    setIsLoading(true);
    try {
      const { authService } = await import('./core/authService');
      const result = await authService.changePassword(currentProfile.id, oldPassword, newPassword);
      if (!result.success) {
        setIsLoading(false);
        return setAppToast({ message: result.error || "Gagal mengubah password.", type: "error" });
      }
      setAppToast({ message: "Password berhasil diubah!", type: "success" });
      onClose();
    } catch (e) {
      setAppToast({ message: "Terjadi kesalahan sistem.", type: "error" });
    }
    setIsLoading(false);
  };

  if (!open) return null;
  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-sm rounded-[24px] p-6 pop-in shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-black text-xl text-slate-900 mb-5 tracking-tight">Ganti Password</h3>
        <div className="space-y-4">
          <FF label="Password Lama">
            <div className="relative">
              <input type={showOld ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={oldPassword} onChange={e => setOldPassword(e.target.value)} disabled={isLoading} placeholder="Masukkan password lama" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">{showOld ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Password Baru">
            <div className="relative">
              <input type={showNew ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isLoading} placeholder="Minimal 6 karakter" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">{showNew ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Konfirmasi Password Baru">
            <input type={showNew ? "text" : "password"} className={inp} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} placeholder="Ulangi password baru" />
          </FF>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={isLoading}>Batal</button>
          <button onClick={handleSubmit} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Password'}</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onDone, setAppToast }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return setAppToast({ message: "Password baru wajib diisi!", type: "error" });
    if (newPassword.length < 6) return setAppToast({ message: "Password baru minimal 6 karakter!", type: "error" });
    if (newPassword !== confirmPassword) return setAppToast({ message: "Konfirmasi password tidak cocok!", type: "error" });

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setIsLoading(false);
      return setAppToast({ message: error.message || "Gagal menyimpan password baru.", type: "error" });
    }

    setAppToast({ message: "Password berhasil diperbarui! Silakan masuk kembali.", type: "success" });
    await supabase.auth.signOut();
    onDone();
  };

  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-cream px-4">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-sm rounded-[24px] p-7 shadow-2xl">
        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Buat Password Baru</h2>
        <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">Tautan reset terverifikasi. Masukkan password baru untuk akun Anda.</p>
        <div className="space-y-4">
          <FF label="Password Baru">
            <div className="relative">
              <input type={showPw ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isLoading} placeholder="Minimal 6 karakter" autoFocus />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">{showPw ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Konfirmasi Password Baru">
            <input type={showPw ? "text" : "password"} className={inp} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} placeholder="Ulangi password baru" />
          </FF>
        </div>
        <button type="submit" disabled={isLoading} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-emerald-500/30 transition-all">{isLoading ? "Menyimpan..." : "Simpan Password Baru"}</button>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('App Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontSize: '18px', color: 'red', fontFamily: 'monospace' }}>
          <h1>❌ Error in App:</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [dbCattle, setDbCattle] = useState([]);
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("srtt_user_profile")) || null; } 
    catch (e) { return null; }
  });
  
  const [appToast, setAppToast] = useState(null); 
  const [appConfirm, setAppConfirm] = useState({ open: false }); 
  
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(profile !== null);
  const [nav, setNav] = useState("dashboard"); 
  const [addOpen, setAddOpen] = useState(false); 
  const [editItem, setEditItem] = useState(null); 
  const [actionItem, setActionItem] = useState(null); 
  const [hideSplashDOM, setHideSplashDOM] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [highlightedId, setHighlightedId] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile && !localStorage.getItem("srtt_tutorial_seen")) setTutorialOpen(true);
  }, [profile]);

  useEffect(() => { setTimeout(() => setHideSplashDOM(true), 2500); }, []);
  useEffect(() => { try { if (profile) localStorage.setItem("srtt_user_profile", JSON.stringify(profile)); } catch(e) {} }, [profile]);

  useEffect(() => {
    const loadCattleData = async () => {
      if (!profile || !profile.id) return;

      try {
        const { profileService } = await import('./core/profileService');
        const farmResult = await profileService.getFarm(profile.id);
        
        if (farmResult.success && farmResult.farm) {
          const { cattleService } = await import('./core/cattleService');
          const result = await cattleService.getCattleByFarm(farmResult.farm.id);
          if (result.success) {
            setDbCattle(result.cattle);
          }
        }
      } catch (error) {
        console.error('Failed to load cattle data:', error);
      }
    };

    loadCattleData();
  }, [profile?.id]); 
  
  const handleSaveAdd = async () => {
    if (!profile || !profile.id) return;

    try {
      const { profileService } = await import('./core/profileService');
      const farmResult = await profileService.getFarm(profile.id);

      if (farmResult.success && farmResult.farm) {
        const { cattleService } = await import('./core/cattleService');
        const result = await cattleService.getCattleByFarm(farmResult.farm.id);
        if (result.success) {
          setDbCattle(result.cattle);
        }
      }
    } catch (error) {
      setAppToast({ message: "Data tersimpan, namun gagal memuat ulang daftar. Silakan refresh halaman.", type: "error" });
    }
  };

  const handleDeleteLog = (itemId, logType, index) => {
    const updateItemWithDeletedLog = (item) => {
      if (item.id !== itemId) return item;
      const newItem = { ...item };
      const logArray = [...(newItem[logType] || [])];
      if (logArray.length > index) {
        logArray.splice(index, 1);
        newItem[logType] = logArray;
      }
      return newItem;
    };
    
    const updatedDb = dbCattle.map(updateItemWithDeletedLog);
    setDbCattle(updatedDb);
    setDetailItem(prev => (prev ? updateItemWithDeletedLog(prev) : null));
    
    const updatedItem = updatedDb.find(i => i.id === itemId);
    if(updatedItem) {
        import('./core/cattleService').then(({cattleService}) => {
            cattleService.updateCattle(itemId, updatedItem).then(result => {
                if (!result.success) setAppToast({ message: "Gagal menghapus riwayat di server: " + result.error, type: "error" });
            });
        }).catch(() => setAppToast({ message: "Gagal terhubung ke server.", type: "error" }));
    }
  };

  const handleDeleteRequest = (id) => {
    setAppConfirm({
      open: true,
      title: "Hapus Sapi?",
      message: `Anda yakin ingin menghapus sapi kode "${id}"? Data yang dihapus tidak dapat dikembalikan.`,
      isDestructive: true,
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id) => {
    const { cattleService } = await import('./core/cattleService');
    const result = await cattleService.deleteCattle(id);
    if (result.success) {
      setDbCattle(p => p.filter(x => x.id !== id));
      setDetailItem(null);
      setAppToast({ message: "Data sapi berhasil dihapus", type: "success" });
    } else {
      setAppToast({ message: "Gagal menghapus sapi: " + result.error, type: "error" });
    }
  };

  const handleAdviceClick = (item) => {
    setNav("assets");
    setHighlightedId(item.id);
  };

  const handleSaveRepro = async (res, pregMonth, d) => {
    const idx = dbCattle.findIndex(b => b.id === actionItem.id);
    if (idx === -1) return;
    let current = { ...dbCattle[idx] };

    if (res === "NEGATIVE") {
      current.phase = "OPEN"; current.status_reproduksi = "OPEN";
      current.pkbLog = [...(current.pkbLog || []), { date: d, result: "NEGATIVE" }];
    }
    else if (res === "IB") {
      current.phase = "BRED"; current.status_reproduksi = "BRED";
      current.ibLog = [...(current.ibLog || []), { date: d, isSuspect: false }];
    } 
    else if (res === "POSITIVE") { 
      let calculatedConception = todayStr();
      
      const sortedIB = [...(current.ibLog || [])].sort((a, b) => {
         const dateA = typeof a === 'object' ? a.date : a;
         const dateB = typeof b === 'object' ? b.date : b;
         return new Date(dateA) - new Date(dateB);
      }); 
      
      const hasIB = sortedIB.length > 0;

      if (hasIB) {
        const lastIBEntry = sortedIB[sortedIB.length - 1];
        calculatedConception = typeof lastIBEntry === 'object' ? lastIBEntry.date : lastIBEntry;
      } else if (pregMonth) { 
        const dt = new Date(d); 
        dt.setMonth(dt.getMonth() - Number(pregMonth)); 
        calculatedConception = dt.toISOString().split("T")[0]; 
      } 

      current.phase = "PREGNANT"; 
      current.status_reproduksi = "PREGNANT"; 
      current.conceptionDate = calculatedConception; 
      current.pkbLog = [...(current.pkbLog || []), { date: d, result: "POSITIVE" }]; 
    }
    else if (res === "CALVED") { 
      current.phase = "POSTPARTUM"; current.status_reproduksi = "POSTPARTUM"; 
      current.calvingDate = d; current.calvingLog = [...(current.calvingLog || []), d]; 
      current.conceptionDate = null; 
    }
    else if (res === "ABORTUS") {
      current.phase = "ABORTUS_PENDING";
      current.status_reproduksi = "ABORTUS_PENDING";
      current.abortusDate = d;
      current.abortusLog = [...(current.abortusLog || []), d]; 
      current.conceptionDate = null; 
    }
    else if (res === "TERAPI") {
      current.phase = "OPEN"; 
      current.status_reproduksi = "OPEN"; 
      current.therapyLog = [...(current.therapyLog || []), d]; 
    }

    const up = [...dbCattle]; up[idx] = current; setDbCattle(up);

    try {
      const { cattleService } = await import('./core/cattleService');
      const updateResult = await cattleService.updateCattle(current.id, current);
      if (!updateResult.success) {
        setAppToast({ message: "Gagal menyimpan ke server: " + updateResult.error, type: "error" });
        return;
      }
      setAppToast({ message: "Laporan reproduksi berhasil disimpan", type: "success" });
    } catch (error) {
      setAppToast({ message: "Gagal terhubung ke server. Periksa koneksi internet.", type: "error" });
    }
  };

  const handleSaveHealth = async ({ type, date, gejala }) => {
    if (!actionItem) return;
    const idx = dbCattle.findIndex(b => b.id === actionItem.id);
    if (idx === -1) return;

    let current = { ...dbCattle[idx] };

    if (type === 'LAPOR') {
      current.healthLog = [...(current.healthLog || []), {
        date,
        gejala,
        status: "MENUNGGU_DOKTER"
      }];
    } else if (type === 'SEMBUH') {
      const activeIdx = (current.healthLog || []).findIndex(h => h.status !== "SEMBUH");
      if (activeIdx !== -1) {
        const updatedLog = [...(current.healthLog || [])];
        updatedLog[activeIdx] = { ...updatedLog[activeIdx], status: "SEMBUH", tanggalSembuh: date };
        current.healthLog = updatedLog;
      }
    }

    const up = [...dbCattle];
    up[idx] = current;
    setDbCattle(up);

    try {
      const { cattleService } = await import('./core/cattleService');
      const updateResult = await cattleService.updateCattle(current.id, current);
      if (!updateResult.success) {
        setAppToast({ message: "Gagal menyimpan ke server: " + updateResult.error, type: "error" });
        return;
      }
      setAppToast({ message: type === 'SEMBUH' ? "Sapi dinyatakan sembuh!" : "Laporan gejala berhasil disimpan", type: "success" });
    } catch (error) {
      setAppToast({ message: "Gagal terhubung ke server. Periksa koneksi internet.", type: "error" });
    }
  };

  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const filteredCattle = safeDb.filter(item => {
    if (!item || !item.id) return false;
    const searchMatch = (item.code || item.id).toLowerCase().includes(searchQuery.toLowerCase());
    const itemGender = item.jenis_kelamin || item.gender;
    const genderMatch = genderFilter === "ALL" || itemGender === genderFilter;
    return searchMatch && genderMatch;
  }).sort((a, b) => (a.code || a.id).localeCompare(b.code || b.id, undefined, { numeric: true }));

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-cream font-sans text-slate-800 relative flex flex-col">
        <GlobalStyle />
        <ToastNotification message={appToast?.message} type={appToast?.type} onClose={() => setAppToast(null)} />
        <ResetPasswordScreen onDone={() => setRecoveryMode(false)} setAppToast={setAppToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-sans text-slate-800 pb-20 relative flex flex-col">
      <GlobalStyle />
      
      <DialogSystem />
      <ToastNotification message={appToast?.message} type={appToast?.type} onClose={() => setAppToast(null)} />
      <CustomConfirm {...appConfirm} onCancel={() => setAppConfirm({ open: false })} />
      
      {!hideSplashDOM && (
        <div className="splash-container">
          <div className="splash-logo-wrap bg-white rounded-[28px] p-4 shadow-2xl">
            <img src={logoTuban} alt="Logo Tuban" className="w-16 h-auto object-contain" />
          </div>
          <h1 className="splash-title text-5xl font-black text-white tracking-tighter mt-6">SIRAPI</h1>
          <p className="splash-subtitle text-[10px] font-bold text-emerald-200 uppercase tracking-widest mt-2 text-center px-10">Sistem Informasi Reproduksi Sapi</p>
          <div className="splash-loader mt-9"></div>
        </div>
      )}

      {hideSplashDOM && !hasStarted && !profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 px-4 slide-up">
           <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 text-center">
             <div className="flex justify-center mb-5"><img src={logoTuban} alt="Logo Tuban" className="w-20 h-auto object-contain drop-shadow-sm" /></div>
             <p className="text-[8.5px] font-black text-emerald-600 uppercase tracking-widest mb-6 leading-snug">Dinas Ketahanan Pangan, Pertanian, dan Perikanan<br/>Kabupaten Tuban</p>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">SIRAPI</h1>
             <p className="text-[10px] font-bold text-slate-500 mb-8 leading-relaxed">(Sistem Informasi Reproduksi Sapi)</p>
             <button onClick={() => { setHasStarted(true); setShowAuthScreen(true); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-emerald-500/30 transition-all">Mulai Sistem Pendataan</button>
           </div>
        </div>
      )}

      {hideSplashDOM && hasStarted && !profile && (
        <AuthScreen setProfile={(userData) => { setProfile(userData); setShowAuthScreen(false); setAppToast({message: "Berhasil Login!", type: "success"}) }} />
      )}

      {hideSplashDOM && hasStarted && profile && (
        <>
          <div className="bg-white px-2 sm:px-5 pt-3 pb-3 sm:pt-4 sm:pb-4 border-b border-slate-200 shadow-sm mb-3 z-40 relative">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center justify-start gap-2 sm:gap-3">
                <img src={logoTuban} alt="Logo Tuban" className="w-7 sm:w-9 h-auto object-contain drop-shadow-sm shrink-0" />
                <p className="text-[7px] sm:text-[8.5px] font-black text-slate-900 uppercase tracking-widest leading-tight">DINAS KETAHANAN PANGAN,<br/>PERTANIAN DAN PERIKANAN<br/>KABUPATEN TUBAN</p>
              </div>
              <div className="flex items-center">
                <div className="bg-slate-900 px-3 py-1.5 shadow-sm">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">SIRAPI</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {nav === "dashboard" && <DashboardView dbCattle={safeDb} onAdviceClick={handleAdviceClick} profile={profile} setAppToast={setAppToast} />}
            {nav === "assets" && (
              <div className="pb-28 fade-in bg-cream">
                <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md px-5 py-4 border-b border-slate-200">
                   <div className="flex justify-between items-center">
                    <div><h2 className="font-black text-xl text-slate-900">Database Aset</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredCattle.length} dari {safeDb.length} Ekor</p></div>
                   <button onClick={() => { setEditItem(null); setAddOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-colors">+ Ternak Baru</button>
                   </div>
                   <div className="mt-4 relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                     </span>
                     <input type="text" placeholder="Cari Kode Sapi..." className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-white transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                   </div>
                   <div className="mt-3 p-1 bg-slate-200 rounded-xl flex gap-1">
                      <button onClick={() => setGenderFilter("ALL")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${genderFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
                      <button onClick={() => setGenderFilter("BETINA")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${genderFilter === 'BETINA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Betina</button>
                      <button onClick={() => setGenderFilter("JANTAN")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${genderFilter === 'JANTAN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Jantan</button>
                   </div>
                </div>
                <div className="p-5 space-y-4 mt-2">
                  {filteredCattle.map((item) => item ? <AssetRecordCard key={item.id || Math.random()} item={item} onEdit={(i) => {setEditItem(i); setAddOpen(true);}} onOpenAction={setActionItem} onDelete={handleDeleteRequest} onOpenDetail={setDetailItem} highlightedId={highlightedId} setHighlightedId={setHighlightedId} /> : null)}
                  {searchQuery && filteredCattle.length === 0 && <p className="text-center text-slate-500 font-medium pt-10">Sapi dengan kode "{searchQuery}" tidak ditemukan.</p>}
                </div>
              </div>
            )}
            {nav === "calendar" && <CalendarView dbCattle={safeDb} />}
            {nav === "academy" && <AcademyView />}
            {nav === "profile" && (
              <div className="pb-32 fade-in bg-cream min-h-screen">
                <div className="bg-white px-5 pt-8 pb-8 border-b border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-black text-slate-400 mb-3 shadow-inner overflow-hidden border-4 border-white">
                    {profile.photo ? <img src={profile.photo} alt="Profil" className="w-full h-full object-cover" /> : <span>{profile.name ? profile.name.charAt(0).toUpperCase() : "U"}</span>}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{profile.alamat || profile.desa || "Tuban"} Area</p>
                  {profile.nik && <p className="text-[10px] font-semibold text-slate-400 mt-1">NIK: {profile.nik}</p>}
                  <button onClick={() => setEditProfileOpen(true)} className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-full hover:bg-slate-200 transition-colors">Edit Profil</button>
                </div>

                <div className="px-5 mt-6 space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Pengaturan Akun</h3>
                    <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
                      <div onClick={() => setChangePasswordOpen(true)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                           <span className="font-bold text-sm text-slate-700">Keamanan & Password</span>
                         </div>
                         <span className="text-slate-300 font-bold">❯</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Bantuan</h3>
                    <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <div onClick={() => setHelpGuideOpen(true)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
                           <span className="font-bold text-sm text-slate-700">Cara Pakai Aplikasi</span>
                         </div>
                         <span className="text-slate-300 font-bold">❯</span>
                      </div>
                      <div onClick={() => setTutorialOpen(true)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                           <span className="font-bold text-sm text-slate-700">Tutorial Interaktif</span>
                         </div>
                         <span className="text-slate-300 font-bold">❯</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { 
                    setAppConfirm({
                      open: true,
                      title: "Keluar Aplikasi?",
                      message: "Sesi Anda akan diakhiri. Pastikan semua data ternak Anda sudah tersimpan.",
                      isDestructive: true,
                      confirmText: "Ya, Keluar",
                      onConfirm: () => {
                        setDbCattle([]);
                        localStorage.removeItem("srtt_user_profile");
                        setProfile(null);
                        setNav("dashboard");
                        setSearchQuery("");
                        setGenderFilter("ALL");
                        setDetailItem(null);
                        setActionItem(null);
                        setEditItem(null);
                        setAddOpen(false);
                        setHighlightedId(null);
                      }
                    });
                  }} className="w-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold py-4 rounded-[20px] text-sm transition-colors shadow-sm mt-4">
                    Keluar Akun (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="nav-bar">
            <button onClick={() => setNav("dashboard")} className={`nav-item ${nav === "dashboard" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3z"/></svg></span><span>Beranda</span></button>
            <button onClick={() => setNav("assets")} className={`nav-item ${nav === "assets" ? "active" : ""}`}><span className="nav-icon"><svg viewBox="0 0 100 100" className="w-6 h-6 fill-current"><path d="M85.9,46.1c-1.9-2.2-4.1-4-6.5-5.3c0,0-11-6-11.4-6.3c-0.1,0-0.1-0.1-0.2-0.1c-1.3-1-3.1-1.3-4.7-0.7 c-0.7,0.3-1.4,0.7-1.9,1.3c-2.3,2.4-5.3,4.6-8.3,4.6c-2.6,0-5.1-1.6-7-4.1c-1.7-2.3-3.6-3.8-5.6-4.6c-0.1,0-0.2-0.1-0.3-0.1 C38,30.3,36.1,30.7,34.8,32c-0.1,0.1-0.1,0.1-0.2,0.1C33,33.5,22,41.4,22,41.4c-2.2,1.6-3.7,3.9-4,6.4c-0.3,2.5,0.7,5,2.6,6.6 c0.1,0.1,0.1,0.1,0.2,0.1c0.1,0,0.1,0,0.2,0.1c2.1,1.5,4.7,2.1,7.2,1.7c1.3-0.2,2.5-0.7,3.6-1.5c0.1-0.1,0.2-0.1,0.3-0.2 c2-1.9,4.5-2.8,7.1-2.8c2.9,0,5.6,1.2,7.4,3.1c1.8,1.9,4.1,3,6.6,3c2,0,3.9-0.8,5.3-2.2c0.1-0.1,0.1-0.1,0.2-0.1 c1.8-2,4.6-3,7.3-2.6c1.1,0.2,2.2,0.6,3.2,1.2c0.1,0.1,0.1,0.1,0.2,0.1c1.9,1.1,4.1,1.4,6.1,0.8c2-0.6,3.8-2,5-3.8 C86.7,50,86.9,48,85.9,46.1z M52.5,41.4c0,2.1-1.7,3.8-3.8,3.8c-2.1,0-3.8-1.7-3.8-3.8c0-2.1,1.7-3.8,3.8-3.8C50.8,37.6,52.5,39.3,52.5,41.4 z"/></svg></span><span>Populasi</span></button>
            <button onClick={() => setNav("calendar")} className={`nav-item ${nav === "calendar" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg></span><span>Kalender</span></button>
            <button onClick={() => setNav("academy")} className={`nav-item ${nav === "academy" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg></span><span>Akademi</span></button>
            <button onClick={() => setNav("profile")} className={`nav-item ${nav === "profile" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span><span>Profil</span></button>
          </div>
          
          <AddModal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null); }} onSave={handleSaveAdd} editItem={editItem} setAppToast={setAppToast} />
          <ActionModal open={!!actionItem} item={actionItem} onClose={() => setActionItem(null)} onSaveRepro={handleSaveRepro} onSaveHealth={handleSaveHealth} setAppToast={setAppToast} />
          <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onDeleteLog={handleDeleteLog} setAppToast={setAppToast} setAppConfirm={setAppConfirm} />
          <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSave={setProfile} currentProfile={profile} setAppToast={setAppToast} />
          <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} currentProfile={profile} setAppToast={setAppToast} />
          <OnboardingTutorial open={tutorialOpen} onClose={() => { setTutorialOpen(false); localStorage.setItem("srtt_tutorial_seen", "1"); }} />
          <HelpGuideScreen open={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} />
        </>
      )}
    </div>
  );
}