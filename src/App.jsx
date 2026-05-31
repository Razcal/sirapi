import React, { useState, useEffect } from "react";
import { AuthScreen } from "./AuthScreen";
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
    .nav-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px); border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0 max(12px, env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 32px rgba(0,0,0,0.06); }
    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #94a3b8; font-weight: 800; gap: 6px; transition: all 0.3s ease; width: 25%; }
    .nav-item.active { color: #10b981; }
    
    .nav-icon { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
    .nav-item.active .nav-icon { transform: translateY(-3px) scale(1.1); filter: drop-shadow(0 4px 6px rgba(16,185,129,0.3)); }

    .timeline-line { width: 2px; background: #f1f5f9; position: absolute; top: 14px; bottom: 10px; left: 3px; }
    .timeline-item:last-child .timeline-line { display: none; }
    
    .timeline-main-line { position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: #f1f5f9; z-index: 0; }
    .timeline-main-item { position: relative; padding-left: 56px; padding-bottom: 24px; z-index: 10; }
    .timeline-main-icon { position: absolute; left: 10px; top: 0; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; z-index: 20; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    
    select, input, textarea { appearance: none; -webkit-appearance: none; transition: all 0.2s; }
    select:focus, input:focus, textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

    .splash-container { position: fixed; inset: 0; background: #000; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.8s ease; overflow: hidden; }

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
           res.advice = `Gejala/Keluhan: ${activeIllness.gejala}. Segera panggil tenaga medis!`;
           res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm";
           res.needsVet = true;
       } else if (activeIllness.status === "DIRAWAT") {
           res.statusLabel = "DALAM PERAWATAN"; res.color = "rose";
           res.advice = `Diagnosa: ${activeIllness.diagnosa}. (Tindakan: ${activeIllness.tindakan}).`;
           res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm";
       }
       return res; 
    }

    if (isJantan) {
        if (umurHari < 180) { res.statusLabel = "PEDET JANTAN"; res.color = "violet"; res.advice = "Fokus susu & pakan pemula. Jaga kebersihan kandang dari diare/scours."; } 
        else if (umurHari < 730) { res.statusLabel = "JANTAN BAKALAN"; res.color = "blue"; res.advice = "Fase penggemukan (Feedlot). Tingkatkan pakan konsentrat energi tinggi."; } 
        else { res.statusLabel = "PEJANTAN DEWASA"; res.color = "emerald"; res.advice = "Bobot panen optimal. Siap untuk dipasarkan atau dijadikan pejantan pemacek."; }
        return res;
    }

    const daysOpen = item.calvingDate ? daysDiff(item.calvingDate) : 0;
    
    const logIBDates = [...(item.ibLog || [])].map(entry => {
        return typeof entry === 'object' ? entry.date : entry;
    }).sort((a,b) => new Date(a) - new Date(b));

    const lastIB = logIBDates.length > 0 ? logIBDates[logIBDates.length - 1] : null;
    const prevIB = logIBDates.length > 1 ? logIBDates[logIBDates.length - 2] : null;
    const daysSinceLastIB = lastIB ? daysDiff(lastIB) : 0;

    let cycles = 1; let diffPrevLast = 0;
    if (prevIB && lastIB) diffPrevLast = Math.floor((new Date(lastIB) - new Date(prevIB))/86400000);
    
    if (logIBDates.length > 1) {
      let tempLast = new Date(logIBDates[0]);
      for (let i = 1; i < logIBDates.length; i++) {
         let diff = Math.floor((new Date(logIBDates[i]) - tempLast) / 86400000);
         if (diff >= 15) cycles++; 
         tempLast = new Date(logIBDates[i]);
      }
    }

    let hasIbAfterCalving = lastIB && (!item.calvingDate || new Date(lastIB) > new Date(item.calvingDate));

    if (phase === "ABORTUS_PENDING") {
      res.statusLabel = "LAPOR PETUGAS"; 
      res.color = "rose"; res.isUrgent = true; res.needsVet = true;
      res.advice = `KONDISI DARURAT: Sapi mengalami keguguran. Segera lapor petugas medis untuk penanganan dan pembersihan rahim.`; 
      res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-black shadow-sm"; 
    }
    else if (phase === "CALF") {
      if (!item.calvingDate && umurHari > 1095) { res.statusLabel = "AWAS: KEMAJIRAN ABSOLUT"; res.color = "rose"; res.isUrgent = true; res.advice = `Sapi Dara > 3 tahun belum birahi. Suspect Hipoplasia Ovarium akut.`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
      else if (umurHari > 730) { res.statusLabel = "AWAS: DARA TERLAMBAT KAWIN"; res.color = "orange"; res.isUrgent = true; res.advice = `Umur > 2 tahun belum di-IB. Panggil dokter.`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; } 
      else if (umurHari >= 540) { res.statusLabel = "DARA SIAP KAWIN"; res.color = "emerald"; res.advice = "Usia ideal IB (18-24 bulan). Pantau birahi."; } 
      else { res.statusLabel = "DARA PERTUMBUHAN"; res.color = "blue"; res.advice = "Masa Pra-pubertas. Kejar bobot harian ideal."; }
    } 
    else if (phase === "OPEN") {
      const daysSinceAbortus = item.abortusDate ? daysDiff(item.abortusDate) : 999;
      if (item.abortusDate && daysSinceAbortus <= 45) { 
        res.statusLabel = "PEMULIHAN ABORTUS"; res.color = "rose"; res.isUrgent = true; 
        res.advice = `Masa pemulihan rahim pasca keguguran (Hari ke-${daysSinceAbortus}). DILARANG suntik IB sebelum rahim pulih total (±45 hari).`; 
        res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; 
      }
      else if (item.calvingDate && daysOpen > 150 && !hasIbAfterCalving) { res.statusLabel = "AWAS: SUSPECT PYOMETRA"; res.color = "rose"; res.isUrgent = true; res.advice = `Kosong > 5 bulan. Waspada penumpukan nanah rahim.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
      else if (item.calvingDate && daysOpen > 120) { res.statusLabel = "AWAS: KOSONG > 120 HARI"; res.color = "rose"; res.isUrgent = true; res.advice = `Kosong ${daysOpen} hari pasca melahirkan.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
      else { res.statusLabel = "SIAP IB"; res.color = "amber"; res.advice = "Fase Kosong. Pantau tanda 3A (Abang, Abuh, Anget)."; }
    } 
    else if (phase === "BRED") {
      if (cycles >= 3) { res.color = "rose"; res.statusLabel = "REPEAT BREEDER"; res.isUrgent = true; res.advice = `Gagal pada ${cycles} siklus. Butuh terapi medis.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
      else if (diffPrevLast > 0 && diffPrevLast < 15) { res.color = "rose"; res.statusLabel = "⚠️ SUSPECT SISTA OVARIUM"; res.isUrgent = true; res.advice = `PERINGATAN MEDIS: Jarak antar IB sangat tidak normal (< 15 hari). Terdeteksi indikasi gangguan siklus birahi (Suspect Sista Ovarium).`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
      else if (daysSinceLastIB < 60) { res.color = "slate"; res.statusLabel = "SUSPECT BUNTING"; res.advice = `H+${daysSinceLastIB} pasca IB. Jangan dirogoh manual!`; } 
      else { res.color = "orange"; res.statusLabel = "WAKTUNYA PKB"; res.isUrgent = true; res.advice = `JADWAL PKB! Lapor hasil via menu Reproduksi.`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; }
    } 
    else if (phase === "PREGNANT") {
      if (!item.conceptionDate) { 
         res.color = "orange"; res.statusLabel = "BUNTING (BELUM PKB)"; res.isUrgent = true; 
         res.advice = (item.asal_usul_sapi || item.origin) === 'PASAR' ? `Sapi bunting pasar. Wajib lapor hasil PKB Dokter.` : `Sapi bunting kandang. Wajib lapor hasil PKB Dokter.`; 
         res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-semibold shadow-sm"; 
      } 
      else {
         const hpl = new Date(item.conceptionDate); 
         if (isNaN(hpl.getTime())) throw new Error("Invalid date"); 
         hpl.setMonth(hpl.getMonth() + 9); hpl.setDate(hpl.getDate() + 10);
         const l = Math.ceil((hpl - today) / 86400000); const pregDays = daysDiff(item.conceptionDate);
         let txtHPL = `HPL: ${fmtDate(hpl.toISOString().split("T")[0])} (±${l} hr).`;

         let nutrisi = "";
         if (pregDays <= 94) nutrisi = "Nutrisi Trim 1: Fokus hijauan kualitas tinggi & mineral mix. Jaga kondisi tubuh, hindari pakan berjamur.";
         else if (pregDays <= 189) nutrisi = "Nutrisi Trim 2: Tambah konsentrat energi. Suplemen Kalsium (Ca) & Fosfor (P) sangat penting untuk tulang janin.";
         else nutrisi = "Nutrisi Trim 3: Fase krusial! Berikan pakan penguat. Kering-kandangkan sapi jika masih diperah.";

         if (pregDays >= 285) { res.color = "rose"; res.statusLabel = "ANCAMAN DISTOKIA"; res.isUrgent = true; res.advice = `KANDUNGAN TUA! Siagakan tenaga medis. ${nutrisi}`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; } 
         else if (l <= 60 && l > 21) { res.color = "amber"; res.statusLabel = "KERING KANDANG"; res.isUrgent = true; res.advice = `${txtHPL} Segera hentikan perah susu! ${nutrisi}`; res.adviceColor = "text-amber-900 bg-amber-50 border border-amber-200 font-semibold shadow-sm"; } 
         else { res.color = "emerald"; res.statusLabel = "BUNTING AKTIF"; res.advice = `${txtHPL} ${nutrisi}`; }
      }
    } 
    else if (phase === "POSTPARTUM") {
      const d = daysDiff(item.calvingDate);
      if (d <= 14) { res.statusLabel = "PUERPERIUM (NIFAS)"; res.color = "rose"; res.isUrgent = true; res.advice = `Waspada Lokia bau busuk / Retensio Secundinarum.`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-semibold shadow-sm"; } 
      else if (d <= 45) { res.statusLabel = "INVOLUSI UTERUS"; res.color = "blue"; res.advice = `Rahim sedang pemulihan. DILARANG suntik IB.`; } 
      else { res.statusLabel = "BREEDING WINDOW"; res.color = "emerald"; res.advice = `Sapi siap di-IB kembali.`; }
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
         if (diff > 0 && diff < 15) {
             isSuspect = true; 
         }
      }
      prevIbDate = d;

      history.push({ 
        type: 'ibLog', originalIndex: i, date: d, 
        label: `Inseminasi Buatan (IB) ke-${i + 1} ${isSuspect ? "⚠️ (SUSPECT)" : ""}`, 
        desc: isSuspect 
          ? "PERINGATAN MEDIS: Jarak antar IB sangat tidak normal (< 15 hari). Terdeteksi indikasi gangguan siklus birahi (Suspect Sista Ovarium)." 
          : "Tindakan memasukkan semen beku ke dalam saluran reproduksi. Pantau birahi kembali dalam 18-21 hari ke depan.", 
        colorDot: isSuspect ? "bg-orange-600" : "bg-blue-500", 
        rawDate: new Date(d) 
      }); 
    });

    (item.pkbLog || []).forEach((log, i) => history.push({ 
      type: 'pkbLog', originalIndex: i, date: log.date, label: `Pemeriksaan Kebuntingan (PKB)`, 
      desc: log.result === "POSITIVE" 
        ? "HASIL POSITIF. Jaga asupan nutrisi protein dan energi untuk pertumbuhan janin yang optimal." 
        : "HASIL NEGATIF. Sapi tidak bunting, segera lakukan evaluasi pakan dan hormon oleh petugas.", 
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
      history.push({ type: 'healthLog', date: l.date, label: "Panggilan Medis (Lapor Gejala)", desc: `Keluhan: ${l.gejala}`, colorDot: "bg-orange-400", rawDate: new Date(l.date) });
      
      if (l.diagnosa) {
          history.push({ type: 'healthLog', date: l.tanggalDiperiksa || l.date, label: "Hasil Pemeriksaan Dokter", desc: `Diagnosa: ${l.diagnosa}. Tindakan Medis: ${l.tindakan}`, colorDot: "bg-rose-500", rawDate: new Date(l.tanggalDiperiksa || l.date) });
      }

      if (l.status === "SEMBUH" && l.tanggalSembuh) {
          history.push({ type: 'healthLog', date: l.tanggalSembuh, label: "Konfirmasi Kesembuhan", desc: `Sapi dinyatakan sembuh total dari penyakit (${l.diagnosa || l.gejala}).`, colorDot: "bg-emerald-500", rawDate: new Date(l.tanggalSembuh) });
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

function AdviceCard({ item, analysis, onClick }) {
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
        
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2">
           <div className={`w-2 h-2 rounded-full ${latestLog ? latestLog.colorDot : 'bg-slate-300'}`}></div>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
             {latestLog ? `Status Terkini • ${fmtDate(latestLog.date)}` : 'Saran Otomatis Sistem'}
           </p>
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
  let legendTargetColor = "bg-emerald-500"; // Default
  
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
      targetBlocks.push({ start: t1Start, end: t1End, bg: "bg-orange-500 shadow-md", text: "text-white font-black", label: "Masa Evaluasi Birahi (Siklus 1). Pantau vulva!" });

      // Blok Masa Pantau 2 (H+40 s/d H+43)
      const t2Start = new Date(anchor); t2Start.setDate(t2Start.getDate() + 40);
      const t2End = new Date(anchor); t2End.setDate(t2End.getDate() + 43);
      targetBlocks.push({ start: t2Start, end: t2End, bg: "bg-orange-400 shadow-sm", text: "text-white font-bold", label: "Masa Evaluasi Birahi (Siklus 2)" });

      title = "Evaluasi IB"; subtitle = "Masa Pantau Birahi";
      anchorColorClass = "bg-blue-500"; // Sinkron dengan warna IB di Kronologis
      legendTargetColor = "bg-orange-500"; 
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
      targetBlocks.push({ start: hplStart, end: hplEnd, bg: "bg-violet-600 animate-pulse shadow-lg shadow-violet-500/30", text: "text-white font-black", label: "RANGE HPL (Perkiraan Lahir). Siapkan Kandang!" });

      title = "Kebuntingan"; subtitle = "Pantauan Trimester & HPL";
      anchorColorClass = "bg-blue-500"; 
      legendTargetColor = "bg-violet-600";
    } else {
      title = "Kebuntingan"; subtitle = "Belum PKB Presisi";
    }
  }
  else if (phase === "CALF") {
    const bd = item.tanggal_lahir || item.birthDate;
    if (bd) {
      anchor = new Date(bd);
      const kawinStart = new Date(anchor); kawinStart.setDate(kawinStart.getDate() + 540);
      const kawinEnd = new Date(kawinStart); kawinEnd.setDate(kawinEnd.getDate() + 7); // Range 1 minggu
      
      targetBlocks.push({ start: kawinStart, end: kawinEnd, bg: "bg-emerald-500 shadow-md", text: "text-white font-bold", label: "Fase Awal Dara Siap Kawin (Usia 18 Bulan)" });
      
      title = "Pertumbuhan"; subtitle = "Target Siap Kawin";
      anchorColorClass = "bg-slate-300"; 
      legendTargetColor = "bg-emerald-500";
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
       (item.pkbLog || []).filter(l => l.result === "NEGATIVE").forEach(l => dates.push({ d: l.date, c: "bg-rose-500", l: "PKB Negatif" }));
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
      
      targetBlocks.push({ start: nextCycleStart, end: nextCycleEnd, bg: "bg-emerald-500 shadow-md", text: "text-white font-bold", label: "Prediksi Masa Subur (Siklus Birahi)" });
      
      title = "Siklus Birahi"; subtitle = "Saran Jadwal IB Optimal";
      legendTargetColor = "bg-emerald-500";
    } else {
      title = "Fase Kosong"; subtitle = "Pantau Birahi";
    }
  }

  // Fungsi untuk mengekstrak info hari saat di klik
  const getDayInfo = (date) => {
    let info = { bg: "text-slate-600 hover:bg-slate-50 rounded-md", text: "font-medium text-[10.5px]", border: "", label: "" };
    const isAnchor = anchor && date.getTime() === anchor.getTime();
    const isToday = date.getTime() === today.getTime();
    
    // Trimester Check (Base layer)
    if (isPregnant && conceptionDate && hplDate && date >= conceptionDate && date <= hplDate) {
       const daysPreg = Math.floor((date - conceptionDate) / 86400000);
       if (daysPreg <= 94) { info.bg = "bg-blue-50 text-blue-700 rounded-md"; info.text = "font-bold text-[10.5px]"; info.label = "Masa Kebuntingan Trimester 1"; } 
       else if (daysPreg <= 189) { info.bg = "bg-amber-50 text-amber-700 rounded-md"; info.text = "font-bold text-[10.5px]"; info.label = "Masa Kebuntingan Trimester 2"; } 
       else { info.bg = "bg-rose-50 text-rose-700 rounded-md"; info.text = "font-bold text-[10.5px]"; info.label = "Masa Kebuntingan Trimester 3"; } 
    }

    // Target Block Check (Menimpa trimester)
    for (let block of targetBlocks) {
      if (date >= block.start && date <= block.end) {
         info.bg = block.bg + " rounded-md";
         info.text = block.text + " text-[10.5px]";
         info.label = block.label;
      }
    }

    // Anchor Check (Menimpa target)
    if (isAnchor) {
       info.bg = anchorColorClass.includes("slate-300") ? `${anchorColorClass} text-slate-800 shadow-sm rounded-md` : `${anchorColorClass} text-white shadow-sm rounded-md`; 
       info.text = "font-bold text-[10.5px]";
       info.label = "Tanggal Kejadian / Tindakan Terakhir";
    }
    
    if (isToday && !info.label) {
       info.label = "Hari Ini";
    }

    if (isToday && !isAnchor && !targetBlocks.some(b => date >= b.start && date <= b.end)) {
       info.border = "border-2 border-emerald-400 bg-white text-emerald-700 rounded-md shadow-sm";
       info.text = "font-black text-[10.5px]";
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

  const renderMonthGrid = (mOffset) => {
    const renderDate = new Date(displayMonthDate);
    renderDate.setMonth(renderDate.getMonth() + mOffset);
    const year = renderDate.getFullYear();
    const month = renderDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    return (
      <div key={mOffset} className="min-w-[210px] flex-1 bg-white border border-slate-200/60 rounded-2xl p-3.5 shadow-sm snap-center shrink-0">
         <p className="text-center text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3.5">{monthNames[month]} {year}</p>
         <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {['Mg','Sn','Sl','Rb','Km','Jm','Sb'].map(d => <div key={d} className="text-[8px] font-black text-slate-400 uppercase">{d}</div>)}
         </div>
         <div className="grid grid-cols-7 gap-1">
           {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="aspect-square"></div>;
              
              const info = getDayInfo(date);
              
              return (
                <div key={i} onClick={(e) => { e.stopPropagation(); handleDayClick(date, info); }} className={`flex justify-center items-center aspect-square transition-all cursor-pointer hover:scale-110 active:scale-95 ${info.bg} ${info.border}`}>
                  <span className={info.text}>{date.getDate()}</span>
                </div>
              );
           })}
         </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100 rounded-3xl border border-slate-200/80 p-4 shadow-inner mb-6 pop-in overflow-hidden w-full">
      <div className="flex justify-between items-end mb-4 px-1">
         <div>
           <h4 className="font-black text-slate-800 text-sm tracking-tight leading-none">{title}</h4>
           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{subtitle}</p>
         </div>
         <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button onClick={(e) => { e.stopPropagation(); setOffset(o => o - 1); }} className="w-7 h-7 rounded-md bg-slate-50 text-slate-600 flex items-center justify-center text-sm font-bold hover:bg-slate-100 transition-colors">‹</button>
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest px-1.5">Geser</span>
            <button onClick={(e) => { e.stopPropagation(); setOffset(o => o + 1); }} className="w-7 h-7 rounded-md bg-slate-50 text-slate-600 flex items-center justify-center text-sm font-bold hover:bg-slate-100 transition-colors">›</button>
         </div>
      </div>
      
      <div className="flex gap-3 overflow-x-auto snap-x pb-3 pt-1 -mx-2 px-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
         {renderMonthGrid(offset)}
         {renderMonthGrid(offset + 1)}
         {renderMonthGrid(offset + 2)}
      </div>

      {/* TAMPILAN POPUP KETERANGAN INTERAKTIF SAAT TANGGAL DIKLIK */}
      <div className="h-14 mt-1 px-1 flex items-center justify-center transition-all duration-300">
         {activeInfo ? (
            <div className="bg-slate-800 text-white text-[10px] px-4 py-2.5 rounded-xl pop-in w-full shadow-lg font-medium leading-tight text-center">
               <span className="font-black text-emerald-400 block mb-0.5 tracking-wider uppercase">{activeInfo.date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
               {activeInfo.label}
            </div>
         ) : (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9.5px] px-4 py-3.5 rounded-xl text-center w-full font-bold">
               👆 Klik warna pada tanggal untuk melihat keterangan
            </div>
         )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap gap-x-3 gap-y-2 justify-center px-1">
         {isPregnant && conceptionDate ? (
           <>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-200"></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Trim 1</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-200"></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Trim 2</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-200"></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Trim 3</span></div>
             {/* Warna Legenda HPL sinkron otomatis dengan sistem blok */}
             <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-sm ${legendTargetColor} animate-pulse`}></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">HPL</span></div>
           </>
         ) : (
           <>
             {anchor && <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-sm ${anchorColorClass}`}></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Kejadian</span></div>}
             
             {/* 👇 PERBAIKAN: Warna "Target" Legend Sekarang 100% Sinkron dengan blok */}
             {targetBlocks.length > 0 && <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-sm ${legendTargetColor.split(' ')[0]} animate-pulse`}></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Target</span></div>}
           </>
         )}
         
         {/* HARI INI DIPAKU PERMANEN DI LEGENDA BAWAH */}
         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm border-2 border-emerald-400 bg-white"></div><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Hari Ini</span></div>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose, onDeleteLog, setAppToast, setAppConfirm }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
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
  const isPregnant = _status === 'PREGNANT' || _status.includes('BUNTING');
  
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
          <p><span className="font-semibold text-slate-800">Tanggal Lahir:</span> {item.tanggal_lahir ? new Date(item.tanggal_lahir).toLocaleDateString('id-ID') : 'Tidak ada'}</p>
          <p><span className="font-semibold text-slate-800">Usia:</span> {getAge(item.tanggal_lahir || item.birthDate)}</p>
          {item.status_reproduksi && item.status_reproduksi !== "N/A" && (
            <p><span className="font-semibold text-slate-800">Status Reproduksi:</span> {item.status_reproduksi}</p>
          )}
          
          {needsPKBWarning && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg pop-in">
              <p className="text-[11px] text-orange-800 font-semibold leading-relaxed">
                <strong>⚠️ {item.asal_usul_sapi === 'PASAR' ? 'Sapi bunting pasar.' : 'Sapi bunting kandang.'}</strong> Wajib lapor hasil PKB Dokter.
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
  const [isUSG, setIsUSG] = useState(false);
  const [pregMonth, setPregMonth] = useState("");
  const [dHealth, setDHealth] = useState(todayStr());
  const [kondisi, setKondisi] = useState("");
  const [diagnosa, setDiagnosa] = useState("");
  const [tindakan, setTindakan] = useState("");
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
      setResRepro("NONE"); setDRepro(todayStr()); setIsUSG(false); setPregMonth("");
      setDHealth(todayStr()); setKondisi(""); setDiagnosa(""); setTindakan("");
      setMedicalWarning(null);
    }
  }, [open, item, isJantan]);

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
            setMedicalWarning(`⚠️ PERINGATAN MEDIS: Indikasi Nymphomania (Sista). Sapi minta kawin >2 kali dalam satu siklus. SEGERA HUBUNGI PETUGAS!`);
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
    
    onSaveRepro(resRepro, pregMonth, dRepro, isUSG);
    onClose();
  };

  const submitHealth = (type) => {
    if (type === 'LAPOR' && !kondisi.trim()) return setAppToast({ message: "Harap isi keluhan/gejala sapi", type: "error" });
    onSaveHealth({ type, date: dHealth, gejala: kondisi, diagnosa, tindakan });
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
          <button onClick={() => setTab("KESEHATAN")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${tab === "KESEHATAN" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>🩺 Medis</button>
          <button onClick={() => { if(activeHealth) setAppToast({message: "Sapi dalam perawatan. Selesaikan di tab Medis.", type: "error"}); else if(isJantan) setAppToast({message: "Menu Reproduksi khusus sapi betina", type: "error"}); else setTab("REPRO"); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${tab === "REPRO" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"} ${activeHealth || isJantan ? "opacity-50" : ""}`}>🧬 Reproduksi</button>
        </div>

        {tab === "REPRO" && !activeHealth && (
          <div className="space-y-4 fade-in">
            
            <FF label="Jenis Aksi">
              <select className={`${inp} bg-white`} value={resRepro} onChange={e => setResRepro(e.target.value)}>
                <option value="NONE">-- Pilih Aksi --</option>
                {item?.phase === "ABORTUS_PENDING" ? (
                  <option value="TERAPI">✅ Sudah Mendapatkan Terapi Medis</option>
                ) : (
                  <>
                    <option value="IB">Inseminasi Buatan (IB)</option>
                    <option value="NEGATIVE">PKB: Negatif (-)</option>
                    <option value="POSITIVE">PKB: Positif (+)</option>
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
                          💡 Masukkan bulan kebuntingan hasil rabaan PKB.
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
                  {item?.phase === "ABORTUS_PENDING" 
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
                {medicalWarning.includes("Nymphomania") && (
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

function ShareSummaryModal({ open, onClose, stats, profile, setAppToast }) {
  if (!open) return null;
  const ownerName = profile?.name || "Peternak";
  const address = profile?.alamat || profile?.desa || "Tuban";
  const txt = `*LAPORAN POPULASI TERNAK - SIRAPI*\n\n🧑‍🌾 Pemilik: ${ownerName}\n📍 Alamat: ${address}\n📊 Total Aset: ${stats.total} Ekor\n🐄 Indukan Produktif: ${stats.betina} Ekor (Bunting: ${stats.pregnant})\n🐂 Pejantan/Bakalan: ${stats.jantan} Ekor\n\n~ Dibagikan dari Aplikasi SIRAPI Tuban`;
  
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  const shareFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://sirapi.vercel.app')}&quote=${encodeURIComponent(txt)}`, '_blank');
  const shareOther = async () => { 
    if (navigator.share) { 
      try { await navigator.share({ title: `Laporan Populasi ${ownerName}`, text: txt }); } catch (e) {} 
    } else { 
      setAppToast({ message: "Perangkat Anda tidak mendukung fitur berbagi ini", type: "error" }); 
    } 
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 pop-in" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden aspect-[9/16] flex flex-col justify-between border border-slate-700">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-1 leading-tight">Laporan<br/>Aset Ternak</h2>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-8">{fmtDate(new Date())}</p>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center"><span className="text-sm font-semibold">Total Populasi</span><span className="text-3xl font-black">{stats.total}</span></div>
              <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center"><span className="text-sm font-semibold">Indukan</span><span className="text-2xl font-black">{stats.betina}</span></div>
              <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center"><span className="text-sm font-semibold">Pejantan</span><span className="text-2xl font-black">{stats.jantan}</span></div>
              <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 flex justify-between items-center mt-2"><span className="text-sm font-semibold text-emerald-300">Bunting Aktif</span><span className="text-2xl font-black text-emerald-400">{stats.pregnant}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-center text-white/90 text-[11px] font-bold mb-3">Bagikan langsung ke sosial media:</p>
          <div className="flex gap-2.5 mb-4">
            <button onClick={shareWA} className="flex-1 bg-[#25D366] text-white py-3 rounded-2xl font-bold">WA</button>
            <button onClick={shareFB} className="flex-1 bg-[#1877F2] text-white py-3 rounded-2xl font-bold">FB</button>
            <button onClick={shareOther} className="flex-1 bg-[#ee2a7b] text-white py-3 rounded-2xl font-bold">Share</button>
          </div>
          <button onClick={onClose} className="w-full bg-white/10 text-white border border-white/20 py-3 rounded-2xl font-bold text-sm hover:bg-white/20 transition-colors">Tutup</button>
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

        <div>
          <div className="flex items-center mb-4 ml-1">
             <h3 className="font-black text-slate-800 text-base">Saran & Peringatan</h3>
             {itemsWithAdvice.length > 0 && <span className="ml-2 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md text-[10px] font-bold">{itemsWithAdvice.length}</span>}
          </div>
          <div className="space-y-3">
            {itemsWithAdvice.length === 0 ? 
              <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-200 text-center"><p className="text-xs text-emerald-800 font-bold">✨ Semua populasi kandang dalam kondisi prima.</p></div> : 
              itemsWithAdvice.map(({ item, analysis }) => (<AdviceCard key={item.id} item={item} analysis={analysis} onClick={onAdviceClick} />))
            }
          </div>
        </div>
      </div>
      <ShareSummaryModal open={shareModalOpen} onClose={() => setShareModalOpen(false)} stats={{total, jantan, betina, pregnant}} profile={profile} setAppToast={setAppToast} />
    </div>
  );
}

function AcademyView() {
  const handleJoinZoom = () => {
    const zoomLink = "https://zoom.us/j/1234567890"; 
    window.open(zoomLink, '_blank');
  };

  return (
    <div className="pb-32 fade-in bg-slate-50 min-h-screen">
      <div className="bg-white px-5 pt-8 pb-8 border-b border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akademi SIRAPI</h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Peternak Wajib Pintar</p>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="bg-emerald-700 rounded-[24px] p-6 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-emerald-900/50 text-emerald-50 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase inline-block">E-Book Eksklusif</span>
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase animate-pulse">Coming Soon</span>
            </div>
            <h3 className="text-xl font-black mb-2 leading-snug text-white">3 Kesalahan Fatal Peternak yang Bikin Sapi Gagal Bunting!</h3>
            <p className="text-xs font-medium text-emerald-100 mb-6 leading-relaxed">
              Oleh Dokter Hewan & Pakar S2 Biologi Reproduksi. Pelajari mitos lapangan dan solusi berbasis data agar breeding sukses.
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
        if (editItem.asal_usul_sapi === 'KANDANG' && editItem.tanggal_lahir) setBirthDate(editItem.tanggal_lahir);
        
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
                  <option value="BRED">Sudah Kawin (Belum PKB)</option>
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
                    Peternak tidak bisa memastikan sapi pasar kosong atau bunting hanya dari fisik. <strong>Wajib laporkan ke petugas medis/dokter hewan</strong> untuk dilakukan PKB (Periksa Kebuntingan) agar tidak salah penanganan!
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
  const [address, setAddress] = useState(currentProfile?.alamat || currentProfile?.desa || '');
  const [photo, setPhoto] = useState(currentProfile?.photo || '');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (open && currentProfile) {
      setName(currentProfile.name || '');
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
    if (!address.trim()) return setAppToast({message: "Alamat wajib diisi!", type: "error"});

    setIsLoading(true);
    try {
      const { profileService } = await import('./core/profileService');

      // Update user profile
      const updateResult = await profileService.updateUserProfile(currentProfile.id, {
        name: name.trim(), photo: photo || null, alamat: address.trim()
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
    
    const { profileService } = await import('./core/profileService');
    const farmResult = await profileService.getFarm(profile.id);
    
    if (farmResult.success && farmResult.farm) {
      const { cattleService } = await import('./core/cattleService');
      const result = await cattleService.getCattleByFarm(farmResult.farm.id);
      if (result.success) {
        setDbCattle(result.cattle);
      }
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
            cattleService.updateCattle(itemId, updatedItem);
        });
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

  const handleSaveRepro = async (res, pregMonth, d, isUSG, isSuspect) => {
    const idx = dbCattle.findIndex(b => b.id === actionItem.id); 
    if (idx === -1) return;
    let current = { ...dbCattle[idx] }; 

    if (res === "NEGATIVE") { 
      current.phase = "OPEN"; current.status_reproduksi = "OPEN"; 
      current.pkbLog = [...(current.pkbLog || []), { date: d, result: "NEGATIVE" }]; 
    } 
    else if (res === "IB") { 
      current.phase = "BRED"; current.status_reproduksi = "BRED"; 
      current.ibLog = [...(current.ibLog || []), { date: d, isSuspect: isSuspect || false }]; 
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
      current.status_reproduksi = "ABORTUS (BUTUH TERAPI)";
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
    setAppToast({ message: "Laporan reproduksi berhasil disimpan", type: "success" });

    try {
      const { cattleService } = await import('./core/cattleService');
      const updateResult = await cattleService.updateCattle(current.id, current);
      if (!updateResult.success) {
        console.error("Gagal menyimpan riwayat repro ke database server.");
      }
    } catch (error) {
      console.error("Gagal integrasi database:", error);
    }
  };

  const handleSaveHealth = async (d, kondisi) => {
    if (!actionItem) return;
    const idx = dbCattle.findIndex(b => b.id === actionItem.id); 
    if (idx === -1) return;
    
    let current = { ...dbCattle[idx] }; 
    current.healthReports = current.healthReports || [];
    current.healthReports.push({ tanggalLaporan: d, gejalaKeluhan: kondisi, createdAt: new Date().toISOString() });
    
    const up = [...dbCattle]; 
    up[idx] = current; 
    setDbCattle(up);
    setAppToast({ message: "Laporan kesehatan berhasil disimpan", type: "success" });

    try {
      const { cattleService } = await import('./core/cattleService');
      await cattleService.updateCattle(current.id, current);
    } catch (error) {
      console.error("Gagal menyimpan riwayat kesehatan ke database:", error);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 relative flex flex-col">
      <GlobalStyle />
      
      <ToastNotification message={appToast?.message} type={appToast?.type} onClose={() => setAppToast(null)} />
      <CustomConfirm {...appConfirm} onCancel={() => setAppConfirm({ open: false })} />
      
      {!hideSplashDOM && (
        <div className="splash-container">
          <div className="fade-in bg-white px-8 py-4 rounded-2xl shadow-2xl shadow-white/10 text-center">
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Sarapi</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">BIDANG KESEHATAN HEWAN</p>
          </div>
        </div>
      )}

      {hideSplashDOM && !hasStarted && !profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 px-4 slide-up">
           <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 text-center">
             <div className="flex justify-center mb-5"><img src={logoTuban} alt="Logo Tuban" className="w-20 h-auto object-contain drop-shadow-sm" /></div>
             <p className="text-[8.5px] font-black text-emerald-600 uppercase tracking-widest mb-6 leading-snug">Dinas Ketahanan Pangan, Pertanian, dan Perikanan<br/>Kabupaten Tuban</p>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">SIRAPI</h1>
             <p className="text-[10px] font-bold text-slate-500 mb-8 leading-relaxed whitespace-nowrap overflow-x-auto">(Portofolio Recording Observasi Veteriner, Reproduksi, dan Ternak Integrasi)</p>
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
              <div className="pb-28 fade-in bg-slate-50">
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
            {nav === "academy" && <AcademyView />}
            {nav === "profile" && (
              <div className="pb-32 fade-in bg-slate-50 min-h-screen">
                <div className="bg-white px-5 pt-8 pb-8 border-b border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-black text-slate-400 mb-3 shadow-inner overflow-hidden border-4 border-white">
                    {profile.photo ? <img src={profile.photo} alt="Profil" className="w-full h-full object-cover" /> : <span>{profile.name ? profile.name.charAt(0).toUpperCase() : "U"}</span>}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{profile.alamat || profile.desa || "Tuban"} Area</p>
                  <button onClick={() => setEditProfileOpen(true)} className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-full hover:bg-slate-200 transition-colors">Edit Profil</button>
                </div>

                <div className="px-5 mt-6 space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Pengaturan Akun</h3>
                    <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                           <span className="font-bold text-sm text-slate-700">Keamanan & Password</span>
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
            <button onClick={() => setNav("academy")} className={`nav-item ${nav === "academy" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg></span><span>Akademi</span></button>
            <button onClick={() => setNav("profile")} className={`nav-item ${nav === "profile" ? "active" : ""}`}><span className="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span><span>Profil</span></button>
          </div>
          
          <AddModal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null); }} onSave={handleSaveAdd} editItem={editItem} setAppToast={setAppToast} />
          <ActionModal open={!!actionItem} item={actionItem} onClose={() => setActionItem(null)} onSaveRepro={handleSaveRepro} onSaveHealth={handleSaveHealth} setAppToast={setAppToast} />
          <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onDeleteLog={handleDeleteLog} setAppToast={setAppToast} setAppConfirm={setAppConfirm} />
          <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSave={setProfile} currentProfile={profile} setAppToast={setAppToast} />
        </>
      )}
    </div>
  );
}