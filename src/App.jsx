import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { AuthScreen } from "./AuthScreen";
import { DialogSystem } from "./core/components/SharedUI";
import { TUBAN_DATA } from "./core/constants";
import { supabase } from "./core/supabaseClient";
import { authService } from "./core/authService";
import { daysDiff, fmtDate, analyzeCattle, ibSinceCalving } from "./core/analyzeCattle";
import { Icon } from "./core/components/Icons";
import Donut from "./core/components/Donut";
import { HeroScene } from "./core/components/Hero";
import LaporanView from "./core/components/Laporan";
import RewindView from "./core/components/Rewind";
import logoTuban from "./assets/logo-tuban.png";

/*
  ========================================
  1. GLOBAL STYLE & THEME - SIRAPI EDITION
  ========================================
*/
// Seluruh gaya kini hidup di src/styles/design-system.css.
// Komponen ini sengaja dipertahankan (mengembalikan null) supaya semua
// pemanggilan <GlobalStyle /> yang sudah tersebar tidak perlu diubah.
const GlobalStyle = () => null;

/*
  ========================================
  2. CONSTANTS & HELPERS
  ========================================
*/
// PENTING: jangan pakai toISOString() di sini. toISOString() memberi waktu UTC,
// sedangkan WIB adalah UTC+7 — antara tengah malam sampai pukul 07:00 pagi
// hasilnya mundur satu hari. Peternak mencatat IB/kelahiran saat subuh, dan
// tanggal IB yang meleset sehari langsung menggeser jadwal PKB & perkiraan lahir.
const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
  } catch { return "-"; }
};

// Peta warna hasil analisa -> token severity design system.
// Satu tingkat kegentingan = satu warna, dipakai konsisten di badge, dot,
// garis tepi kartu, dan chart. Tidak ada lagi "semua yang mendesak jadi merah".
const SEV = {
  rose:    "crit",
  orange:  "warn",
  amber:   "warn",
  blue:    "info",
  violet:  "info",
  emerald: "ok",
  slate:   "neut",
};

const SEV_HEX = {
  crit: "#D92D20",
  warn: "#F79009",
  info: "#2E90FA",
  ok:   "#12B76A",
  neut: "#98A2B3",
};

// Bobot untuk mengurutkan: yang paling genting naik ke atas.
const SEV_RANK = { crit: 0, warn: 1, info: 2, ok: 3, neut: 4 };

const sevOf = (analysis) => SEV[analysis?.color] || "neut";

// Dipertahankan supaya kode lama yang memakai COLOR[...] tetap jalan,
// tapi nilainya sekarang mengikuti design system.
const COLOR = {
  emerald: { bg: "bg-[var(--ok-bg)]",   text: "text-[var(--ok)]",      border: "border-[var(--ok-bd)]" },
  amber:   { bg: "bg-[var(--warn-bg)]", text: "text-[var(--warn)]",    border: "border-[var(--warn-bd)]" },
  orange:  { bg: "bg-[var(--warn-bg)]", text: "text-[var(--warn)]",    border: "border-[var(--warn-bd)]" },
  blue:    { bg: "bg-[var(--info-bg)]", text: "text-[var(--info)]",    border: "border-[var(--info-bd)]" },
  violet:  { bg: "bg-[var(--info-bg)]", text: "text-[var(--info)]",    border: "border-[var(--info-bd)]" },
  rose:    { bg: "bg-[var(--crit-bg)]", text: "text-[var(--crit)]",    border: "border-[var(--crit-bd)]" },
  slate:   { bg: "bg-[var(--neut-bg)]", text: "text-[var(--neutral)]", border: "border-[var(--neut-bd)]" }
};

const COLOR_HEX = {
  emerald: SEV_HEX.ok,
  amber:   SEV_HEX.warn,
  orange:  SEV_HEX.warn,
  blue:    SEV_HEX.info,
  violet:  SEV_HEX.info,
  rose:    SEV_HEX.crit,
  slate:   SEV_HEX.neut
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
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose(), 4200);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  const isError = type === "error";

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-icon" style={{ color: isError ? "var(--crit)" : "var(--ok)" }}>
        {isError ? <Icon.alertCircle size={20} stroke={2} /> : <Icon.checkCircle size={20} stroke={2} />}
      </span>
      <p className="toast-msg">{message}</p>
      <button onClick={onClose} className="icon-btn" style={{ width: 26, height: 26 }} aria-label="Tutup">
        <Icon.close size={14} stroke={2.2} />
      </button>
    </div>
  );
}

function CustomConfirm({ open, title, message, onConfirm, onCancel, confirmText = "Ya", cancelText = "Batal", isDestructive = false }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 9999 }} onClick={onCancel}>
      <div className="card pop-in" onClick={(e) => e.stopPropagation()}
           style={{ width: "100%", maxWidth: 380, padding: 22, boxShadow: "var(--sh-xl)" }}>
        <div className="row-icon" style={{
          width: 42, height: 42, marginBottom: 14,
          background: isDestructive ? "var(--crit-bg)" : "var(--brand-soft)",
          color: isDestructive ? "var(--crit)" : "var(--brand)",
        }}>
          {isDestructive ? <Icon.alert size={21} stroke={2} /> : <Icon.info size={21} stroke={2} />}
        </div>
        <h3 className="t-h2 c-1" style={{ margin: "0 0 6px" }}>{title}</h3>
        <p className="t-sm c-2" style={{ margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>{cancelText}</button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`btn ${isDestructive ? "btn-solid-danger" : "btn-primary"}`}
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
  ========================================
  4. UI COMPONENTS (CORE)
  ========================================
*/
const FF = ({ label, children, hint }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
    {hint ? <p className="field-hint">{hint}</p> : null}
  </div>
);

function TimelineItem({ log }) {
  return (
    <div className="tl-item">
      <span className="tl-dot" style={{ background: dotHex(log) }} />
      <div className="tl-head">
        <span className="tl-title">{tidyLabel(log.label)}</span>
        <span className="tl-date">{fmtDate(log.date)}</span>
      </div>
      <p className="tl-desc">{log.desc}</p>
    </div>
  );
}

// Riwayat masih menyimpan warna sebagai class Tailwind lama (mis. "bg-blue-500").
// Dipetakan ke hex design system supaya titik timeline sewarna dengan badge & chart.
const DOT_HEX = {
  "cal-info-solid": SEV_HEX.info,
  "cal-warn-solid": SEV_HEX.warn,
  "cal-ok-solid":   SEV_HEX.ok,
  "cal-crit-solid": SEV_HEX.crit,
  "cal-neut-solid": SEV_HEX.neut,
  "cal-neut-soft":  SEV_HEX.neut,
  "bg-blue-300":    SEV_HEX.info,
  "bg-amber-300":   SEV_HEX.warn,
  "bg-rose-300":    SEV_HEX.crit,
  "bg-violet-600":  SEV_HEX.info,
  "bg-blue-500":    SEV_HEX.info,
  "bg-orange-600":  SEV_HEX.warn,
  "bg-orange-400":  SEV_HEX.warn,
  "bg-emerald-500": SEV_HEX.ok,
  "bg-rose-500":    SEV_HEX.crit,
  "bg-rose-600":    SEV_HEX.crit,
  "bg-violet-500":  SEV_HEX.info,
  "bg-slate-300":   SEV_HEX.neut,
  "bg-slate-400":   SEV_HEX.neut,
};
const dotHex = (log) =>
  (log && log.sev && SEV_HEX[log.sev]) || DOT_HEX[log?.colorDot] || SEV_HEX.neut;

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
        label: `Inseminasi Buatan (IB) ke-${i + 1} ${isSuspect ? "⚠️ (Jarak Terlalu Dekat)" : ""}`,
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
      type: 'birthDate', originalIndex: 0, date: birthDate, label: "Pendaftaran Ternak",
      desc: origin === "KANDANG" ? "Ternak hasil breeding mandiri." : "Ternak masuk dari pengadaan pasar luar.", 
      colorDot: "bg-slate-300", rawDate: new Date(birthDate) 
    }); 

    const analysis = analyzeCattle(item);
    if (analysis && analysis.advice && analysis.statusLabel !== "DATA TIDAK VALID") {
      history.push({
        type: 'systemAlert', 
        date: todayStr(),
        label: analysis.statusLabel,
        desc: analysis.advice,
        colorDot: `bg-${analysis.color}-500`,
        sev: sevOf(analysis),
        rawDate: new Date(new Date().getTime() + 9999999) 
      });
    }

    return history.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0)); 
  } catch { return []; }
}

// Nomor petugas dikumpulkan di satu tempat. Sebelumnya ditulis ulang di tiga
// lokasi berbeda, sehingga pergantian petugas berarti edit tiga file lalu deploy.
export const PETUGAS_WA = "6281555863186";

const waPetugas = (pesan) => `https://wa.me/${PETUGAS_WA}?text=${encodeURIComponent(pesan)}`;

const SEV_ICON = {
  crit: Icon.alertCircle,
  warn: Icon.alert,
  info: Icon.clock,
  ok:   Icon.checkCircle,
  neut: Icon.info,
};

// Sebagian statusLabel dari mesin analisa ditulis KAPITAL SEMUA
// ("PUERPERIUM (NIFAS)", "AWAS: DARA TERLAMBAT IB"). Kapital penuh lebih lambat
// dibaca dan terkesan berteriak, jadi dirapikan jadi Sentence case di lapisan
// tampilan saja — datanya sendiri tidak diubah.
const tidyLabel = (raw) => {
  const t = String(raw || "").replace(/⚠️|🚨|💡|✅/g, "").trim();
  if (!t) return "";
  const isShouting = t === t.toUpperCase() && /[A-Z]{3}/.test(t);
  if (!isShouting) return t;
  const keep = new Set(["IB", "PKB", "SIRAPI", "WIB"]);
  return t
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      const bare = w.replace(/[^a-z]/gi, "").toUpperCase();
      if (keep.has(bare)) return w.toUpperCase();
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ")
    .replace(/^(\w)/, (m) => m.toUpperCase());
};

const SEV_LABEL = {
  crit: "Perlu petugas",
  warn: "Perlu tindakan",
  info: "Terjadwal",
  ok:   "Aman",
  neut: "Normal",
};

function AdviceCard({ item, analysis, onClick, ownerName }) {
  if (!item || !analysis) return null;

  const history = buildHistory(item);
  const latestLog = history.length > 0 ? history[0] : null;
  const lastReal = history.find((h) => h.type !== "systemAlert") || null;
  const mainText = latestLog ? latestLog.desc : analysis.advice;
  const titleText = (latestLog ? latestLog.label : analysis.statusLabel) || "";
  if (!mainText || mainText.trim() === "") return null;

  const sev = sevOf(analysis);
  const SevIcon = SEV_ICON[sev] || Icon.info;

  const link = waPetugas(
    `Halo Petugas, saya ${ownerName || "Peternak"}. Mohon bantuan untuk sapi kode ${item.code || item.id}. ` +
    `Kondisi terdeteksi: ${analysis.statusLabel}.`
  );

  return (
    <article
      onClick={() => onClick(item)}
      className={`card row-accent sev-${sev}`}
      style={{ overflow: "hidden", cursor: "pointer" }}
    >
      <div style={{ padding: "14px 16px 14px 18px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span className={`badge badge-${sev}`}>
            <SevIcon size={13} stroke={2} />
            {SEV_LABEL[sev]}
          </span>
          <span className="t-xs c-3 tabular" style={{ marginLeft: "auto", fontWeight: 600 }}>
            {lastReal ? `Terakhir ${fmtDate(lastReal.date)}` : "Sapi baru"}
          </span>
        </div>

        <div className="flex items-baseline gap-2" style={{ marginBottom: 3 }}>
          <span className="t-h3 c-1" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{item.code || item.id || "?"}</span>
          <span className="t-sm c-3" style={{ flexShrink: 0 }}>·</span>
          <span className="t-sm c-2 truncate-1" style={{ fontWeight: 600, minWidth: 0 }}>
            {tidyLabel(titleText)}
          </span>
        </div>

        <p className="t-sm c-2 truncate-2" style={{ margin: 0 }}>{mainText}</p>

        <div className="flex items-center gap-8" style={{ marginTop: 12 }}>
          {analysis.needsVet ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn btn-sm"
              style={{ background: "#25D366", color: "#fff", flex: "0 0 auto" }}
            >
              <Icon.phone size={15} stroke={2} /> Hubungi petugas
            </a>
          ) : null}
          <button
            onClick={(e) => { e.stopPropagation(); onClick(item); }}
            className="btn btn-sm btn-secondary"
            style={{ marginLeft: analysis.needsVet ? 8 : 0 }}
          >
            Lihat detail <Icon.chevronRight size={15} stroke={2} />
          </button>
        </div>
      </div>
    </article>
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
  let anchorColorClass = "cal-neut-solid";

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
      targetBlocks.push({ start: t1Start, end: t1End, bg: "cal-warn-solid", text: "cal-on-solid", label: "Masa Evaluasi Birahi (Siklus 1). Pantau vulva!" });

      // Blok Masa Pantau 2 (H+40 s/d H+43)
      const t2Start = new Date(anchor); t2Start.setDate(t2Start.getDate() + 40);
      const t2End = new Date(anchor); t2End.setDate(t2End.getDate() + 43);
      targetBlocks.push({ start: t2Start, end: t2End, bg: "cal-warn-soft", text: "cal-on-warn", label: "Masa Evaluasi Birahi (Siklus 2)" });

      title = "Evaluasi IB"; subtitle = "Masa Pantau Birahi";
      anchorColorClass = "cal-info-solid"; // Sinkron dengan warna IB di Kronologis
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
      targetBlocks.push({ start: hplStart, end: hplEnd, bg: "cal-info-solid", text: "cal-on-solid", label: "RANGE HPL (Perkiraan Lahir). Siapkan Kandang!" });

      title = "Kebuntingan"; subtitle = "Pantauan Trimester & HPL";
      anchorColorClass = "cal-info-solid";
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
      
      targetBlocks.push({ start: kawinStart, end: kawinEnd, bg: "cal-ok-solid", text: "cal-on-solid", label: "Fase Awal Dara Siap Kawin (Usia 18 Bulan)" });
      
      title = "Pertumbuhan"; subtitle = "Target Siap Kawin";
      anchorColorClass = "cal-neut-soft";
      const diffKawin = Math.floor((kawinStart - today)/86400000);
      displayMonthDate = diffKawin <= 90 ? new Date(kawinStart) : new Date(today);
      displayMonthDate.setDate(1);
    }
  }
  else if (phase === "ABORTUS_PENDING") {
    if (item.abortusDate) anchor = new Date(item.abortusDate);
    title = "Kondisi Darurat"; subtitle = "Menunggu Penanganan";
    anchorColorClass = "cal-crit-solid"; 
    displayMonthDate = new Date(today); displayMonthDate.setDate(1);
  }
  else {
    // OPEN / POSTPARTUM
    if (phase === "POSTPARTUM" && item.calvingDate) {
       anchor = new Date(item.calvingDate);
       anchorColorClass = "cal-info-solid"; 
    }
    else if (phase === "OPEN") {
       let dates = [];
       if (item.calvingDate) dates.push({ d: item.calvingDate, c: "cal-info-solid", l: "Melahirkan" });
       (item.therapyLog || []).forEach(d => dates.push({ d, c: "cal-ok-solid", l: "Terapi Medis" }));
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
      
      targetBlocks.push({ start: nextCycleStart, end: nextCycleEnd, bg: "cal-ok-solid", text: "cal-on-solid", label: "Prediksi Masa Subur (Siklus Birahi)" });
      
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
        dot: anchorColorClass,
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


  // Fungsi untuk mengekstrak info hari saat diklik
  const getDayInfo = (date) => {
    let info = { bg: "cal-plain", text: "", border: "", label: "" };
    const isAnchor = anchor && date.getTime() === anchor.getTime();
    const isToday = date.getTime() === today.getTime();

    // Trimester Check (Base layer)
    if (isPregnant && conceptionDate && hplDate && date >= conceptionDate && date <= hplDate) {
       const daysPreg = Math.floor((date - conceptionDate) / 86400000);
       if (daysPreg <= 94) { info.bg = "cal-info-soft"; info.text = "cal-on-info"; info.label = "Masa kebuntingan trimester 1"; }
       else if (daysPreg <= 189) { info.bg = "cal-warn-soft"; info.text = "cal-on-warn"; info.label = "Masa kebuntingan trimester 2"; }
       else { info.bg = "cal-crit-soft"; info.text = "cal-on-crit"; info.label = "Masa kebuntingan trimester 3"; }
    }

    // Target Block Check (Menimpa trimester)
    for (let block of targetBlocks) {
      if (date >= block.start && date <= block.end) {
         info.bg = block.bg;
         info.text = block.text;
         info.label = block.label;
      }
    }

    // Anchor Check (Menimpa target)
    if (isAnchor) {
       info.bg = anchorColorClass;
       info.text = anchorColorClass === "cal-neut-soft" ? "cal-on-neut" : "cal-on-solid";
       info.label = "Tanggal Kejadian / Tindakan Terakhir";
    }

    if (isToday && !info.label) {
       info.label = "Hari Ini";
    }

    if (isToday && !isAnchor && !targetBlocks.some(b => date >= b.start && date <= b.end)) {
       info.bg = "cal-today";
       info.text = "cal-on-today";
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
    <div className="card pop-in" style={{ overflow: "hidden" }}>
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          <p className="t-h3 c-1" style={{ margin: 0 }}>{title}</p>
          <p className="t-xs c-3" style={{ margin: "2px 0 0", fontWeight: 600 }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {keyEvent && (
          <div className={`callout ${keyEvent.isOngoing ? "callout-warn" : keyEvent.isPast ? "callout-neut" : "callout-ok"}`}
               style={{ marginBottom: 12, alignItems: "center" }}>
            {keyEvent.isOngoing ? <Icon.clock size={17} stroke={2} />
              : keyEvent.isPast ? <Icon.check size={17} stroke={2} />
              : <Icon.calendar size={17} stroke={2} />}
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: "block" }}>
                {keyEvent.isOngoing ? "Sedang berlangsung"
                  : keyEvent.isPast ? "Sudah lewat"
                  : `${keyEvent.daysUntilStart} hari lagi`}
              </strong>
              <span className="truncate-1" style={{ display: "block", color: "var(--text-2)", fontWeight: 500 }}>
                {keyEvent.block.label.split(".")[0]}
              </span>
            </span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={(e) => { e.stopPropagation(); setOffset((o) => o - 1); }}
                  className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Bulan sebelumnya">
            <Icon.chevronLeft size={16} stroke={2.2} />
          </button>
          <div style={{ textAlign: "center" }}>
            <p className="t-smstr c-1" style={{ margin: 0 }}>{monthNames[viewMonth]} {viewYear}</p>
            {!isAtReferenceMonth && (
              <button onClick={(e) => { e.stopPropagation(); setOffset(0); }}
                      className="t-xs" style={{ background: "none", border: 0, color: "var(--brand)", fontWeight: 700, cursor: "pointer", padding: "2px 0 0" }}>
                Kembali ke bulan acuan
              </button>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setOffset((o) => o + 1); }}
                  className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Bulan berikutnya">
            <Icon.chevronRight size={16} stroke={2.2} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d, i) => (
            <div key={d} className="t-xs" style={{ textAlign: "center", fontWeight: 700, padding: "3px 0",
                 color: i === 0 ? "var(--crit-dot)" : "var(--text-3)" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {monthDays.map((date, i) => {
            if (!date) return <div key={`e-${i}`} style={{ height: 34 }} />;
            const info = getDayInfo(date);
            const isPlainSunday = date.getDay() === 0 && !info.label;
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); handleDayClick(date, info); }}
                className={`${info.bg} ${info.border}`}
                style={{
                  height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--r-xs)", cursor: info.label ? "pointer" : "default",
                  border: 0, fontSize: 13.5, fontVariantNumeric: "tabular-nums",
                  color: isPlainSunday ? "var(--crit-dot)" : undefined,
                }}
              >
                <span className={info.text}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>

        {activeInfo ? (
          <div className="pop-in" style={{
            marginTop: 10, background: "var(--text)", color: "#fff", borderRadius: "var(--r-sm)",
            padding: "10px 13px", fontSize: 12.5, lineHeight: 1.5,
          }}>
            <strong style={{ display: "block", marginBottom: 2 }}>{fmtDate(activeInfo.date)}</strong>
            <span style={{ opacity: .82 }}>{activeInfo.label}</span>
          </div>
        ) : (
          <p className="t-xs c-3" style={{ textAlign: "center", marginTop: 10, fontWeight: 600 }}>
            Ketuk tanggal berwarna untuk melihat keterangannya
          </p>
        )}
      </div>

      {summaryItems.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
          <p className="t-over" style={{ marginBottom: 9 }}>Tanggal penting</p>
          {summaryItems.map((sItem, idx) => (
            <div key={idx} style={{ padding: "9px 0", borderBottom: idx === summaryItems.length - 1 ? 0 : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                               background: dotHex({ colorDot: sItem.dot }), transform: "translateY(-1px)" }} />
                <p className="t-smstr c-1" style={{ margin: 0, flex: 1, minWidth: 0 }}>{sItem.label}</p>
                <p className="t-xs c-3 tabular" style={{ margin: 0, flexShrink: 0, fontWeight: 600 }}>{sItem.dateText}</p>
              </div>
              {sItem.desc && <p className="t-xs c-2" style={{ margin: "3px 0 0", paddingLeft: 15 }}>{sItem.desc}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarView({ dbCattle, profile }) {
  const femaleCattle = (dbCattle || []).filter((c) => c && (c.jenis_kelamin || c.gender) !== "JANTAN");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (femaleCattle.length === 0) { setSelectedId(null); return; }
    if (!femaleCattle.some((c) => c.id === selectedId)) {
      const sorted = [...femaleCattle].sort(
        (a, b) => SEV_RANK[sevOf(analyzeCattle(a))] - SEV_RANK[sevOf(analyzeCattle(b))]
      );
      setSelectedId(sorted[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCattle]);

  const selected = femaleCattle.find((c) => c.id === selectedId) || null;
  const analysis = selected ? analyzeCattle(selected) : null;
  const sev = analysis ? sevOf(analysis) : "neut";
  const SevIcon = SEV_ICON[sev] || Icon.info;

  return (
    <div className="page fade-in">
      <div className="page-head">
        <h1 className="t-h1 c-1">Kalender</h1>
        <p className="t-sm c-3" style={{ marginTop: 2 }}>Perkiraan jadwal birahi, pemeriksaan, dan kelahiran</p>
      </div>

      {femaleCattle.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Icon.calendar size={24} /></div>
            <p className="empty-title">Belum ada sapi betina</p>
            <p className="empty-text" style={{ marginBottom: 0 }}>
              Kalender dihitung dari riwayat sapi betina. Tambahkan ternak betina dulu di tab Ternak.
            </p>
          </div>
        </div>
      ) : (
        <div className="stack-16">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Pilih sapi ({femaleCattle.length} ekor betina)</label>
            <select className="select" value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value)}>
              {femaleCattle.map((c) => {
                const a = analyzeCattle(c);
                return (
                  <option key={c.id} value={c.id}>
                    {c.code || c.id} — {tidyLabel(a.statusLabel)}
                  </option>
                );
              })}
            </select>
          </div>

          {selected && analysis && (
            <div className={`card row-accent sev-${sev}`} style={{ overflow: "hidden" }}>
              <div style={{ padding: "13px 16px 13px 18px", display: "flex", alignItems: "center", gap: 11 }}>
                <span className="row-icon" style={{
                  background: `var(--${sev === "neut" ? "neut" : sev}-bg)`,
                  color: `var(--${sev === "neut" ? "neutral" : sev})`,
                }}>
                  <SevIcon size={18} stroke={2} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="t-xs c-3" style={{ margin: 0, fontWeight: 600 }}>Sapi {selected.code || selected.id}</p>
                  <p className="t-bodystr c-1" style={{ margin: "1px 0 0" }}>{tidyLabel(analysis.statusLabel)}</p>
                </div>
              </div>
            </div>
          )}

          {selected && <SmartEstrusCalendar item={selected} />}

          {analysis?.needsVet && (
            <a
              href={waPetugas(
                `Halo Petugas, saya ${profile?.name || "Peternak"}. Mohon bantuan untuk sapi kode ` +
                `${selected.code || selected.id}. Kondisi terdeteksi: ${analysis.statusLabel}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-block"
              style={{ background: "#25D366", color: "#fff" }}
            >
              <Icon.phone size={17} /> Hubungi petugas
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function DetailModal({ item, onClose, onDeleteLog, setAppToast, setAppConfirm }) {
  if (!item) return null;
  const history = buildHistory(item);
  const isJantan = (item.jenis_kelamin || item.gender) === "JANTAN";
  const analysis = analyzeCattle(item);
  const sev = sevOf(analysis);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" style={{ height: "92dvh", display: "flex", flexDirection: "column" }}
           onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            <p className="t-h1 c-1" style={{ margin: 0 }}>{item.code || item.id}</p>
            <p className="t-xs c-3" style={{ margin: "3px 0 0", fontWeight: 600 }}>
              {isJantan ? "Jantan" : "Betina"} · {item.jenis_ras || item.ras || "Ras -"} · {getAge(item.tanggal_lahir || item.birthDate)}
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup"><Icon.close size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, background: "var(--bg)" }}>
          <div className={`card row-accent sev-${sev}`} style={{ overflow: "hidden", marginBottom: 18 }}>
            <div style={{ padding: "13px 16px 13px 18px" }}>
              <p className="t-over" style={{ marginBottom: 4 }}>Status saat ini</p>
              <p className="t-bodystr c-1" style={{ margin: 0 }}>{tidyLabel(analysis.statusLabel)}</p>
              <p className="t-sm c-2" style={{ margin: "6px 0 0" }}>{analysis.advice}</p>
            </div>
          </div>

          <p className="t-over" style={{ marginBottom: 10 }}>Riwayat lengkap ({history.length})</p>

          {history.length === 0 ? (
            <div className="card"><div className="empty" style={{ padding: "34px 20px" }}>
              <div className="empty-icon"><Icon.clock size={22} /></div>
              <p className="empty-title">Belum ada catatan</p>
              <p className="empty-text" style={{ marginBottom: 0 }}>Riwayat akan muncul setelah Anda mencatat kondisi sapi ini.</p>
            </div></div>
          ) : (
            <div className="card card-pad">
              <div className="tl">
                {history.map((log, index) => (
                  <div key={index} className="tl-item">
                    <span className="tl-dot" style={{ background: dotHex(log) }} />
                    <div className="tl-head">
                      <span className="tl-title">{tidyLabel(log.label)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span className="tl-date">{fmtDate(log.date)}</span>
                        {log.type !== "birthDate" && log.type !== "systemAlert" && onDeleteLog && (
                          <button
                            aria-label="Hapus riwayat"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppConfirm({
                                open: true,
                                title: "Hapus riwayat ini?",
                                message: "Catatan ini akan dihapus permanen dan analisa sapi akan dihitung ulang tanpanya.",
                                isDestructive: true,
                                confirmText: "Hapus",
                                onConfirm: () => {
                                  onDeleteLog(item.id, log.type, log.originalIndex);
                                  setAppToast({ message: "Riwayat dihapus.", type: "success" });
                                },
                              });
                            }}
                            style={{ background: "none", border: 0, cursor: "pointer",
                                     color: "var(--border-strong)", padding: 2, display: "flex" }}
                          >
                            <Icon.trash size={14} stroke={2} />
                          </button>
                        )}
                      </span>
                    </div>
                    <p className="tl-desc">{log.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sebelumnya tiap sapi ditampilkan sebagai kartu setinggi ~600px berisi seluruh
// riwayat. Dengan 50 ekor, peternak harus menggulir 30.000px hanya untuk mencari
// satu sapi. Sekarang: baris ringkas yang bisa dipindai cepat, detail lengkap
// tetap tersedia satu ketukan di bawahnya.
function AssetRecordCard({ item, onEdit, onOpenAction, onOpenDetail, onDelete, highlightedId, setHighlightedId }) {
  // Semua hook dipanggil lebih dulu, tanpa syarat. React mewajibkan urutan hook
  // sama di setiap render, jadi `if (!item) return null` tidak boleh mendahuluinya.
  const cardRef = React.useRef(null);
  const [open, setOpen] = useState(false);
  const isHighlighted = !!item && highlightedId === item.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setOpen(true);
      const timer = setTimeout(() => { if (setHighlightedId) setHighlightedId(null); }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, setHighlightedId]);

  if (!item) return null;

  const analysis = analyzeCattle(item);
  const sev = sevOf(analysis);
  const history = buildHistory(item);
  // history[0] selalu berupa "status hari ini" yang dihitung sistem, bukan
  // kejadian nyata — jadi tanggalnya selalu hari ini dan tidak informatif.
  const last = history.find((h) => h.type !== "systemAlert") || null;

  const _status = String(item.status_reproduksi || item.phase || "").toUpperCase().trim();
  const needsPKBWarning = _status === "PREGNANT" && !item.conceptionDate;
  const isJantan = (item.jenis_kelamin || item.gender) === "JANTAN";

  return (
    <div
      ref={cardRef}
      className={`card row-accent sev-${sev} ${isHighlighted ? "highlight-blink" : ""}`}
      style={{ overflow: "hidden" }}
    >
      {/* --- baris ringkas --- */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "13px 14px 13px 17px", background: "transparent", border: 0,
          cursor: "pointer", textAlign: "left",
        }}
        aria-expanded={open}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="t-h3 c-1" style={{ whiteSpace: "nowrap" }}>{item.code || item.id || "?"}</span>
            <span className={`badge badge-${sev}`} style={{ minWidth: 0 }}>
              <span className="truncate-1">{tidyLabel(analysis.statusLabel)}</span>
            </span>
          </div>
          <p className="t-xs c-3 truncate-1" style={{ margin: 0, fontWeight: 600 }}>
            {isJantan ? "Jantan" : "Betina"} · {item.jenis_ras || "Ras -"} · {getAge(item.tanggal_lahir || item.birthDate)}
            {last ? ` · terakhir ${fmtDate(last.date)}` : ""}
          </p>
        </div>
        <span className="row-chev" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s ease" }}>
          <Icon.chevronRight size={18} />
        </span>
      </button>

      {/* --- detail, dibuka saat diketuk --- */}
      {open && (
        <div className="fade-in" style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <span className="chip">{isJantan ? "Jantan" : "Betina"}</span>
              <span className="chip">{item.jenis_ras || "Ras tidak diisi"}</span>
              <span className="chip">
                {item.asal_usul_sapi === "PASAR" ? "Dari pasar" : "Lahir di kandang"}
              </span>
            </div>

            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 14px", margin: "0 0 14px" }}>
              <dt className="t-xs c-3" style={{ fontWeight: 600 }}>Tanggal lahir</dt>
              <dd className="t-xs c-1 tabular" style={{ margin: 0, fontWeight: 600 }}>
                {(item.tanggal_lahir || item.birthDate) ? fmtDate(item.tanggal_lahir || item.birthDate) : "Tidak ada"}
              </dd>
              <dt className="t-xs c-3" style={{ fontWeight: 600 }}>Usia</dt>
              <dd className="t-xs c-1 tabular" style={{ margin: 0, fontWeight: 600 }}>{getAge(item.tanggal_lahir || item.birthDate)}</dd>
              {!isJantan && (
                <>
                  <dt className="t-xs c-3" style={{ fontWeight: 600 }}>Jumlah beranak</dt>
                  <dd className="t-xs c-1 tabular" style={{ margin: 0, fontWeight: 600 }}>{item.jumlah_beranak ?? 0}×</dd>
                </>
              )}
            </dl>

            {needsPKBWarning && (
              <div className="callout callout-warn" style={{ marginBottom: 14 }}>
                <Icon.alert size={17} stroke={2} />
                <span>
                  Diduga bunting ({item.asal_usul_sapi === "PASAR" ? "asal pasar" : "dari kandang sendiri"}),
                  belum dikonfirmasi. Minta petugas melakukan pemeriksaan kebuntingan.
                </span>
              </div>
            )}

            <p className="t-over" style={{ marginBottom: 9 }}>Riwayat terakhir</p>
            <div className="tl">
              {history.length === 0 ? (
                <p className="t-xs c-3" style={{ margin: 0 }}>Belum ada catatan.</p>
              ) : (
                history.slice(0, 3).map((log, i) => (
                  <div key={i} className="tl-item">
                    <span className="tl-dot" style={{ background: dotHex(log) }} />
                    <div className="tl-head">
                      <span className="tl-title">{tidyLabel(log.label)}</span>
                      <span className="tl-date">{fmtDate(log.date)}</span>
                    </div>
                    <p className="tl-desc truncate-2">{log.desc}</p>
                  </div>
                ))
              )}
            </div>

            {history.length > 3 && (
              <button onClick={(e) => { e.stopPropagation(); onOpenDetail && onOpenDetail(item); }} className="btn btn-sm btn-ghost" style={{ marginTop: 6, paddingLeft: 0 }}>
                Lihat semua riwayat ({history.length}) <Icon.chevronRight size={15} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <button onClick={(e) => { e.stopPropagation(); onOpenAction && onOpenAction(item); }} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
              <Icon.plus size={15} stroke={2.2} /> Catat kondisi
            </button>
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="btn btn-sm btn-secondary" aria-label="Ubah data sapi">
                <Icon.edit size={15} />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="btn btn-sm btn-danger" aria-label="Hapus sapi">
                <Icon.trash size={15} />
              </button>
            )}
          </div>
        </div>
      )}
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
            setMedicalWarning(`⚠️ Perhatian: Jarak birahi lebih panjang dari biasanya. Sapi masih bisa di-IB, namun amati kondisi lendirnya lebih sering.`);
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
          setMedicalWarning(`❌ Tanggal Tidak Sesuai: Usia kandungan baru ${diffDays} hari, padahal sapi normal melahirkan di kisaran 265-295 hari. Jika sapi mengalami keguguran, silakan ubah 'Jenis Kondisi' menjadi Keguguran.`);
        } else if (diffDays > 300) {
          setMedicalWarning(`⚠️ Perhatian: Usia kandungan sudah ${diffDays} hari, melebihi batas normal. Waspada risiko kesulitan melahirkan (distokia).`);
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
          setMedicalWarning(`⚠️ Info: Sapi akan dicatat mengalami keguguran di usia kandungan ${diffDays} hari. Status akan berubah jadi darurat dan Anda akan diminta segera melapor ke petugas.`);
       } else {
          setMedicalWarning(`⚠️ Info: Sapi akan dicatat mengalami keguguran. Status akan berubah jadi darurat dan Anda akan diminta segera melapor ke petugas.`);
       }
    }
    else {
      setMedicalWarning(null);
    }
  }, [dRepro, resRepro, item]);

  if (!open || !item) return null;

  const handleSaveRepro = () => {
    if (resRepro === "NONE") return setAppToast({ message: "Silakan pilih jenis kondisi terlebih dahulu", type: "error" });
    if (medicalWarning?.includes("❌")) return setAppToast({ message: "Tanggal tidak valid", type: "error" });
    if (resRepro !== 'POSITIVE' && resRepro !== 'NEGATIVE' && !dRepro) return setAppToast({ message: "Tanggal tindakan/kejadian wajib diisi", type: "error" });

    if (resRepro === "POSITIVE") {
      const hasIB = ibSinceCalving(item).length > 0;
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

  // Pilihan kondisi disaring menurut fase sapi. Sebelumnya seekor dara yang belum
  // pernah di-IB tetap bisa memilih "Kelahiran Normal" atau "Pemeriksaan
  // Kebuntingan: Positif" — mustahil secara biologis, dan salah pilih akan
  // mengacaukan seluruh perhitungan kalender sapi itu.
  const phase = String(item?.status_reproduksi || item?.phase || "").toUpperCase();
  const punyaIB = ibSinceCalving(item).length > 0;

  const OPSI = [
    { v: "IB",       t: "Inseminasi buatan (IB)",             show: ["CALF", "OPEN", "BRED", "POSTPARTUM"] },
    { v: "POSITIVE", t: "Hasil periksa: bunting (+)",         show: ["BRED", "OPEN", "PREGNANT"], perlu: () => punyaIB || phase === "PREGNANT" },
    { v: "NEGATIVE", t: "Hasil periksa: tidak bunting (−)",   show: ["BRED", "PREGNANT"] },
    { v: "CALVED",   t: "Melahirkan",                          show: ["PREGNANT"] },
    { v: "ABORTUS",  t: "Keguguran",                           show: ["BRED", "PREGNANT"] },
    { v: "TERAPI",   t: "Sudah mendapat terapi medis",         show: ["OPEN", "BRED", "POSTPARTUM", "ABORTUS_PENDING"] },
  ];
  const opsiTampil = phase === "ABORTUS_PENDING"
    ? OPSI.filter((o) => o.v === "TERAPI")
    : OPSI.filter((o) => o.show.includes(phase) && (!o.perlu || o.perlu()));

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            <p className="t-h2 c-1" style={{ margin: 0 }}>Catat kondisi</p>
            <p className="t-xs c-3" style={{ margin: "2px 0 0", fontWeight: 600 }}>Sapi {item.code || item.id}</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup"><Icon.close size={18} /></button>
        </div>

        <div className="sheet-body">
          <div className="segmented" style={{ marginBottom: 18 }}>
            <button onClick={() => setTab("KESEHATAN")} className={tab === "KESEHATAN" ? "active" : ""}>
              <Icon.stethoscope size={16} /> Kesehatan
            </button>
            <button
              className={`${tab === "REPRO" ? "active" : ""}`}
              style={{ opacity: activeHealth || isJantan ? .45 : 1 }}
              onClick={() => {
                if (activeHealth) setAppToast({ message: "Sapi sedang dirawat. Selesaikan dulu di tab Kesehatan.", type: "error" });
                else if (isJantan) setAppToast({ message: "Menu reproduksi hanya untuk sapi betina.", type: "error" });
                else setTab("REPRO");
              }}
            >
              <Icon.heart size={16} /> Reproduksi
            </button>
          </div>

          {tab === "REPRO" && !activeHealth && (
            <div className="fade-in">
              <div className="field">
                <label className="field-label">Jenis kondisi</label>
                <select className="select" value={resRepro} onChange={(e) => setResRepro(e.target.value)}>
                  <option value="NONE">Pilih kondisi…</option>
                  {opsiTampil.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
                <p className="field-hint">
                  Pilihan menyesuaikan status sapi saat ini ({tidyLabel(analyzeCattle(item).statusLabel) || "-"}).
                </p>
              </div>

              {resRepro !== "POSITIVE" && resRepro !== "NEGATIVE" && (
                <div className="field pop-in">
                  <label className="field-label">Tanggal tindakan atau kejadian</label>
                  <input type="date" className="input" value={dRepro} max={todayStr()} onChange={(e) => setDRepro(e.target.value)} />
                </div>
              )}

              {resRepro === "POSITIVE" && (
                <div className="pop-in" style={{ marginBottom: 16 }}>
                  {(() => {
                    const sortedIB = ibSinceCalving(item);
                    const hasIB = sortedIB.length > 0;
                    const lastIBDate = hasIB
                      ? (typeof sortedIB[sortedIB.length - 1] === "object" ? sortedIB[sortedIB.length - 1].date : sortedIB[sortedIB.length - 1])
                      : null;
                    return hasIB ? (
                      <div className="callout callout-ok">
                        <Icon.checkCircle size={17} stroke={2} />
                        <span>
                          Usia kebuntingan dihitung otomatis dari IB terakhir ({fmtDate(lastIBDate)}).
                        </span>
                      </div>
                    ) : (
                      <div className="field">
                        <label className="field-label">Perkiraan usia kebuntingan menurut petugas</label>
                        <select className="select" value={pregMonth} onChange={(e) => setPregMonth(e.target.value)}>
                          <option value="">Pilih usia…</option>
                          {[1,2,3,4,5,6,7,8,9].map((m) => <option key={m} value={m}>{m} bulan</option>)}
                        </select>
                        <p className="field-hint">
                          Sapi ini belum punya catatan IB, jadi usia kebuntingan perlu diisi manual.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {medicalWarning && (
                <div className={`callout ${medicalWarning.includes("❌") ? "callout-crit" : "callout-warn"}`} style={{ marginBottom: 16 }}>
                  <Icon.alert size={17} stroke={2} />
                  <span>{medicalWarning.replace(/⚠️|❌/g, "").trim()}</span>
                </div>
              )}

              <button onClick={handleSaveRepro} className="btn btn-primary btn-block">Simpan catatan</button>
            </div>
          )}

          {tab === "KESEHATAN" && (
            <div className="fade-in">
              {activeHealth ? (
                <>
                  <div className="callout callout-warn" style={{ marginBottom: 14 }}>
                    <Icon.info size={17} stroke={2} />
                    <span>
                      Sapi ini sedang dalam penanganan. Pantau kondisinya setiap hari, dan tandai sembuh
                      hanya setelah petugas menyatakan sapi pulih.
                    </span>
                  </div>
                  <div className="card card-pad" style={{ marginBottom: 16 }}>
                    <p className="t-over" style={{ marginBottom: 6 }}>Keluhan yang dilaporkan</p>
                    <p className="t-sm c-1" style={{ margin: 0 }}>{activeHealth.gejala}</p>
                    <p className="t-xs c-3" style={{ margin: "8px 0 0", fontWeight: 600 }}>
                      Dilaporkan {fmtDate(activeHealth.date)}
                    </p>
                  </div>
                  <button onClick={() => submitHealth("SEMBUH")} className="btn btn-primary btn-block">
                    <Icon.checkCircle size={17} /> Tandai sudah sembuh
                  </button>
                </>
              ) : (
                <>
                  <div className="field">
                    <label className="field-label">Tanggal gejala muncul</label>
                    <input type="date" className="input" value={dHealth} max={todayStr()} onChange={(e) => setDHealth(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label">Apa yang Anda lihat pada sapi?</label>
                    <textarea
                      className="textarea"
                      value={kondisi}
                      onChange={(e) => setKondisi(e.target.value)}
                      placeholder="Contoh: nafsu makan turun, keluar lendir keruh dari vulva, badan terasa panas"
                    />
                    <p className="field-hint">
                      Tulis apa adanya. Petugas yang akan menentukan penyakitnya — Anda cukup melaporkan yang terlihat.
                    </p>
                  </div>
                  <button onClick={() => submitHealth("LAPOR")} className="btn btn-primary btn-block">
                    Kirim laporan ke petugas
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Menutup lapisan dengan tombol Esc untuk modal yang state-nya tidak hidup di
// AppContent, sehingga tetap ikut aturan "kembali menutup lapisan teratas".
function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [open, onClose]);
}

function ShareSummaryModal({ open, onClose, stats, profile, dbCattle, setAppToast }) {
  useEscape(open, onClose);
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
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 100 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} style={{
          background: "linear-gradient(160deg, #101828 0%, #1D2939 100%)",
          borderRadius: 20, padding: 24, color: "#fff", boxShadow: "var(--sh-xl)",
        }}>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>Laporan populasi ternak</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.55)", margin: "4px 0 0" }}>
            {ownerName} · {address}
          </p>
          <p style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.38)", margin: "1px 0 18px" }}>
            {fmtDate(new Date())}
          </p>

          {totalFemale > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.05)",
                          border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <Donut data={shareChartData} size={90} inner={26} outer={42} gap={2.5} track="rgba(255,255,255,.10)">
                <span style={{ fontSize: 19, fontWeight: 700, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{totalFemale}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.55)", marginTop: 2 }}>betina</span>
              </Donut>
              <div style={{ flex: 1, minWidth: 0 }}>
                {shareChartData.map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.62)",
                                   overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { l: "Total", v: stats.total },
              { l: "Betina", v: stats.betina },
              { l: "Jantan", v: stats.jantan },
            ].map((k) => (
              <div key={k.l} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                                      borderRadius: 12, padding: "12px 10px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", margin: 0 }}>{k.l}</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: "2px 0 0", letterSpacing: "-.02em",
                            fontVariantNumeric: "tabular-nums" }}>{k.v}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.32)", textAlign: "center", margin: "18px 0 0" }}>
            SIRAPI · Dinas Ketahanan Pangan, Pertanian dan Perikanan Kabupaten Tuban
          </p>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>Tutup</button>
          <button onClick={handleShareImage} disabled={isGenerating} className="btn btn-primary" style={{ flex: 1 }}>
            {isGenerating ? "Membuat gambar…" : <><Icon.download size={17} /> Simpan &amp; bagikan</>}
          </button>
        </div>
        <p style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.62)", textAlign: "center", margin: "12px 0 0" }}>
          Gambar bisa langsung dikirim lewat WhatsApp atau media sosial lain.
        </p>
      </div>
    </div>
  );
}

function ReproStatusChart({ dbCattle, onRowClick }) {
  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const femaleCattle = safeDb.filter((i) => i && (i.jenis_kelamin || i.gender) !== "JANTAN");
  const total = femaleCattle.length;

  if (total === 0) {
    return <p className="t-sm c-3" style={{ textAlign: "center", padding: "18px 0" }}>Belum ada sapi betina untuk ditampilkan.</p>;
  }

  const counts = {};
  const detailCounts = {};
  femaleCattle.forEach((item) => {
    const status = item.status_reproduksi || item.phase || "OPEN";
    counts[status] = (counts[status] || 0) + 1;
    let analysis = null;
    try { analysis = analyzeCattle(item); } catch { analysis = null; }
    const label = tidyLabel(analysis?.statusLabel || status);
    const sev = sevOf(analysis);
    if (!detailCounts[label]) detailCounts[label] = { count: 0, sev, ids: [] };
    detailCounts[label].count += 1;
    detailCounts[label].ids.push(item.id);
  });

  const pregnant = counts["PREGNANT"] || 0;
  const bred = counts["BRED"] || 0;
  const other = total - pregnant - bred;

  const chartData = [
    { key: "ok",   label: "Bunting terkonfirmasi", value: pregnant, color: SEV_HEX.ok,
      note: "Sudah diperiksa petugas, hasilnya positif" },
    { key: "warn", label: "Menunggu pemeriksaan",  value: bred,     color: SEV_HEX.warn,
      note: "Sudah di-IB, belum diperiksa petugas" },
    { key: "neut", label: "Belum bunting",         value: other,    color: SEV_HEX.neut,
      note: "Pedet, dara, kosong, atau pasca melahirkan" },
  ];

  const detailRows = Object.entries(detailCounts)
    .map(([label, info]) => ({ label, ...info }))
    .sort((a, b) => (SEV_RANK[a.sev] - SEV_RANK[b.sev]) || (b.count - a.count));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "4px 0 6px" }}>
        <Donut data={chartData} size={116} inner={40} outer={57}>
          <span className="tabular" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>{total}</span>
          <span className="t-xs c-3" style={{ fontWeight: 600, marginTop: 3 }}>betina</span>
        </Donut>

        <div style={{ flex: 1, minWidth: 0 }}>
          {chartData.map((e) => {
            const pct = total > 0 ? Math.round((e.value / total) * 100) : 0;
            return (
              <div key={e.key} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span className="t-xs c-2" style={{ fontWeight: 600, flex: 1, minWidth: 0, lineHeight: 1.3 }}>{e.label}</span>
                  <span className="t-smstr c-1 tabular">{e.value}</span>
                  <span className="t-xs c-3 tabular" style={{ width: 32, textAlign: "right", fontWeight: 600 }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary className="t-xs c-3" style={{ cursor: "pointer", fontWeight: 600, listStyle: "none", padding: "6px 0" }}>
          Apa arti ketiga kategori ini?
        </summary>
        <div className="callout callout-neut" style={{ marginTop: 6, flexDirection: "column", gap: 6 }}>
          {chartData.map((e) => (
            <p key={e.key} className="t-xs" style={{ margin: 0, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text)" }}>{e.label}</strong> — {e.note}.
            </p>
          ))}
        </div>
      </details>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <p className="t-over" style={{ marginBottom: 8 }}>Rincian per kondisi</p>
        <div className="stack-4">
          {detailRows.map((row, i) => (
            <button
              key={i}
              onClick={() => onRowClick && row.ids[0] && onRowClick({ id: row.ids[0] })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9,
                padding: "9px 11px", borderRadius: "var(--r-sm)", cursor: "pointer",
                background: "var(--surface-2)", border: "1px solid var(--border)", textAlign: "left",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_HEX[row.sev], flexShrink: 0 }} />
              <span className="t-xs c-2 truncate-1" style={{ flex: 1, fontWeight: 600 }}>{row.label}</span>
              <span className="t-smstr c-1 tabular">{row.count}</span>
              <Icon.chevronRight size={15} className="row-chev" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Greeting({ name, total, needAction, critCount, onAddNew }) {
  const h = new Date().getHours();
  const sapa = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  const tgl = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const depan = (name || "Peternak").split(" ")[0];

  let ringkas;
  if (total === 0) ringkas = "Belum ada ternak yang tercatat.";
  else if (needAction === 0) ringkas = `Semua ${total} ekor dalam kondisi baik hari ini.`;
  else if (critCount > 0) ringkas = `${needAction} ekor perlu tindakan, ${critCount} di antaranya perlu petugas.`;
  else ringkas = `${needAction} dari ${total} ekor perlu tindakan hari ini.`;

  return (
    <div className="hero-card">
      <HeroScene variant="card" />
      <div className="hero-card-in">
        <p className="hero-date">{tgl}</p>
        <h1 className="hero-greet">{sapa}, {depan}</h1>
        <p className="hero-sum">{ringkas}</p>
        {total > 0 && (
          <button onClick={onAddNew} className="hero-action">
            <Icon.plus size={15} stroke={2.2} /> Tambah ternak
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardView({ dbCattle, profile, onAdviceClick, setAppToast, onAddNew }) {
  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const total = safeDb.length;
  const jantan = safeDb.filter((i) => i && (i.jenis_kelamin === "JANTAN" || i.gender === "JANTAN")).length;
  const betina = total - jantan;
  const pregnant = safeDb.filter((i) => i && (i.status_reproduksi === "PREGNANT" || i.phase === "PREGNANT")).length;
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const analysed = safeDb.map((item) => {
    if (!item) return null;
    try { return { item, analysis: analyzeCattle(item) }; } catch { return null; }
  }).filter(Boolean);

  // Diurutkan menurut tingkat kegentingan sebenarnya, bukan sekadar flag
  // "mendesak" — supaya kasus yang butuh dokter hewan selalu di paling atas.
  const needAction = analysed
    .filter((x) => x.analysis.isUrgent)
    .sort((a, b) => SEV_RANK[sevOf(a.analysis)] - SEV_RANK[sevOf(b.analysis)]);

  const critCount = analysed.filter((x) => sevOf(x.analysis) === "crit").length;
  const aman = total - needAction.length;

  return (
    <div className="page fade-in">
      <Greeting name={profile?.name} total={total} needAction={needAction.length}
                critCount={critCount} onAddNew={onAddNew} />

      {total === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Icon.cow size={26} /></div>
            <p className="empty-title">Belum ada data sapi</p>
            <p className="empty-text">Daftarkan sapi pertama Anda untuk mulai memantau status reproduksinya.</p>
            <button onClick={onAddNew} className="btn btn-primary">
              <Icon.plus size={17} stroke={2.2} /> Tambah sapi pertama
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-20 stagger">
          {/* ---- Ringkasan angka ---- */}
          <section>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label"><Icon.cow size={14} /> Total ternak</span>
                <span className="stat-value">{total}</span>
                <span className="stat-meta">{betina} betina · {jantan} jantan</span>
              </div>
              <div className="stat">
                <span className="stat-label"><Icon.heart size={14} /> Bunting</span>
                <span className="stat-value">{pregnant}</span>
                <span className="stat-meta">terkonfirmasi petugas</span>
              </div>
              <div className={`stat ${needAction.length ? "is-crit" : "is-ok"}`}>
                <span className="stat-label"><Icon.alert size={14} /> Perlu tindakan</span>
                <span className="stat-value">{needAction.length}</span>
                <span className="stat-meta">{critCount > 0 ? `${critCount} perlu petugas` : "tidak ada yang darurat"}</span>
              </div>
              <div className="stat is-ok">
                <span className="stat-label"><Icon.checkCircle size={14} /> Aman</span>
                <span className="stat-value">{aman}</span>
                <span className="stat-meta">tidak perlu tindakan</span>
              </div>
            </div>
          </section>

          {/* ---- Yang perlu tindakan: sekarang di ATAS dan terbuka ---- */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 className="t-h2 c-1">Perlu tindakan</h2>
              {needAction.length > 0 && (
                <span className="t-xs c-3" style={{ fontWeight: 600 }}>{needAction.length} ekor</span>
              )}
            </div>

            {needAction.length === 0 ? (
              <div className="card">
                <div className="empty" style={{ padding: "30px 24px" }}>
                  <div className="empty-icon" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
                    <Icon.checkCircle size={26} />
                  </div>
                  <p className="empty-title">Semua sapi dalam kondisi baik</p>
                  <p className="empty-text" style={{ marginBottom: 0 }}>Tidak ada yang butuh tindakan hari ini.</p>
                </div>
              </div>
            ) : (
              <div className="stack-8">
                {needAction.map(({ item, analysis }) => (
                  <AdviceCard key={item.id} item={item} analysis={analysis} onClick={onAdviceClick} ownerName={profile?.name} />
                ))}
              </div>
            )}
          </section>

          {/* ---- Ringkasan kandang ---- */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 className="t-h2 c-1">Status reproduksi</h2>
              <button onClick={() => setShareModalOpen(true)} className="btn btn-sm btn-ghost">
                <Icon.share size={15} /> Bagikan
              </button>
            </div>
            <div className="card card-pad">
              <ReproStatusChart dbCattle={safeDb} onRowClick={onAdviceClick} />
            </div>
          </section>
        </div>
      )}

      <ShareSummaryModal open={shareModalOpen} onClose={() => setShareModalOpen(false)}
        stats={{ total, jantan, betina, pregnant }} profile={profile} dbCattle={safeDb} setAppToast={setAppToast} />

    </div>
  );
}

// Konfigurasi kelas daring dikumpulkan di satu tempat. Sebelumnya tautan Zoom
// masih berisi contoh (zoom.us/j/1234567890) padahal jadwalnya sudah pasti, jadi
// tombolnya membawa peternak ke ruang rapat kosong.
const KELAS_DARING = {
  aktif: false,                 // ubah ke true setelah tautan asli diisi
  judul: "Konsultasi Peternak Cerdas",
  ringkas: "Tanya jawab langsung seputar reproduksi dan penanganan sapi majir.",
  hari: "Selasa",
  jam: "19.30 WIB",
  tautan: "",                   // isi dengan tautan Zoom/Meet asli
};

function AcademyView({ open, onClose }) {
  const bukaKelas = () => {
    if (!KELAS_DARING.aktif || !KELAS_DARING.tautan) return;
    window.open(KELAS_DARING.tautan, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "var(--bg)",
                  overflowY: "auto", maxWidth: "var(--app-w)", margin: "0 auto",
                  boxShadow: "0 0 0 1px var(--border)" }}>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={onClose} className="icon-btn" aria-label="Kembali">
            <Icon.chevronLeft size={18} stroke={2.2} />
          </button>
          <p className="t-h3 c-1" style={{ margin: 0 }}>Kelas &amp; materi</p>
        </div>
      </div>

      <div className="page">

      <div className="stack-20 stagger">
        {/* --- Kelas daring --- */}
        <section>
          <p className="t-over" style={{ marginBottom: 9 }}>Kelas daring rutin</p>
          <div className="card card-pad">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="row-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                <Icon.video size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {!KELAS_DARING.aktif && (
                  <span className="badge badge-neut" style={{ marginBottom: 5 }}>Belum dibuka</span>
                )}
                <h3 className="t-h3 c-1" style={{ marginBottom: 3 }}>{KELAS_DARING.judul}</h3>
                <p className="t-sm c-2" style={{ margin: 0 }}>{KELAS_DARING.ringkas}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <div style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
                            borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                <p className="t-xs c-3" style={{ margin: 0, fontWeight: 600 }}>Setiap</p>
                <p className="t-bodystr c-1" style={{ margin: "1px 0 0" }}>{KELAS_DARING.hari}</p>
              </div>
              <div style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
                            borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                <p className="t-xs c-3" style={{ margin: 0, fontWeight: 600 }}>Pukul</p>
                <p className="t-bodystr c-1 tabular" style={{ margin: "1px 0 0" }}>{KELAS_DARING.jam}</p>
              </div>
            </div>

            <button onClick={bukaKelas} disabled={!KELAS_DARING.aktif}
                    className={`btn btn-block ${KELAS_DARING.aktif ? "btn-primary" : "btn-secondary"}`}
                    style={{ marginTop: 12 }}>
              {KELAS_DARING.aktif ? <><Icon.video size={17} /> Gabung kelas</> : "Tautan belum tersedia"}
            </button>
            {!KELAS_DARING.aktif && (
              <p className="t-xs c-3" style={{ marginTop: 8, textAlign: "center" }}>
                Petugas akan membagikan tautannya menjelang jadwal.
              </p>
            )}
          </div>
        </section>

        {/* --- Materi --- */}
        <section>
          <p className="t-over" style={{ marginBottom: 9 }}>Materi belajar</p>
          <div className="card">
            <div className="empty" style={{ padding: "34px 24px" }}>
              <div className="empty-icon"><Icon.book size={24} /></div>
              <p className="empty-title">Materi sedang disiapkan</p>
              <p className="empty-text" style={{ marginBottom: 0 }}>
                Panduan pencegahan kegagalan kebuntingan sedang disusun bersama dokter hewan
                dan ahli reproduksi ternak.
              </p>
            </div>
          </div>
        </section>

        {/* --- Sementara materi kosong, arahkan ke bantuan yang sudah ada --- */}
        <section>
          <p className="t-over" style={{ marginBottom: 9 }}>Sementara itu</p>
          <div className="rowlist">
            <button className="row" onClick={() => { onClose(); if (window.__openHelpGuide) window.__openHelpGuide(); }}>
              <span className="row-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <Icon.book size={18} />
              </span>
              <span className="row-main">
                <span className="row-title">Cara pakai aplikasi</span>
                <span className="row-sub">10 panduan singkat, dari mendaftar sapi sampai lapor sakit</span>
              </span>
              <Icon.chevronRight size={18} className="row-chev" />
            </button>
            <a className="row" href={waPetugas("Halo Petugas, saya ingin bertanya seputar reproduksi sapi.")}
               target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <span className="row-icon" style={{ background: "#E7F9EE", color: "#1DA851" }}>
                <Icon.phone size={18} />
              </span>
              <span className="row-main">
                <span className="row-title">Tanya petugas lewat WhatsApp</span>
                <span className="row-sub">Untuk pertanyaan yang tidak bisa menunggu jadwal kelas</span>
              </span>
              <Icon.chevronRight size={18} className="row-chev" />
            </a>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

// Ditampilkan menggantikan dashboard kalau akun peternak masih berstatus
// 'pending' — pendaftaran mandiri sekarang wajib disetujui admin dinas
// dulu (lihat SUPABASE_ROLES_MIGRATION.sql). Belum ada panel admin untuk
// menyetujui secara resmi (menyusul); untuk sekarang persetujuan
// dilakukan manual lewat Supabase Table Editor.
function PendingApprovalScreen({ profile, onLogout }) {
  return (
    <div className="app-shell fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex",
                 flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24,
                 background: "var(--bg)" }}>
      <div className="card card-pad" style={{ maxWidth: 360, textAlign: "center" }}>
        <div className="empty-icon" style={{ margin: "0 auto 16px", background: "var(--warn-bg)", color: "var(--warn)" }}>
          <Icon.clock size={26} />
        </div>
        <h2 className="t-h2 c-1" style={{ margin: "0 0 8px" }}>Menunggu persetujuan</h2>
        <p className="t-sm c-2" style={{ margin: "0 0 4px" }}>
          Halo {profile?.name || "Peternak"}, akun kamu sudah terdaftar dan sedang menunggu persetujuan admin Dinas Ketahanan Pangan, Pertanian dan Perikanan Tuban.
        </p>
        <p className="t-xs c-3" style={{ margin: "12px 0 20px" }}>
          Biasanya diproses dalam 1x24 jam kerja. Kalau sudah lebih dari itu, silakan hubungi petugas.
        </p>
        <a className="btn btn-secondary btn-block" style={{ marginBottom: 10 }}
           href={waPetugas(`Halo Petugas, saya ${profile?.name || "Peternak"}. Akun saya di SIRAPI belum disetujui, mohon bantuannya.`)}>
          <Icon.phone size={17} stroke={2} /> Hubungi petugas
        </a>
        <button onClick={onLogout} className="btn btn-ghost btn-block">Keluar akun</button>
      </div>
    </div>
  );
}

// Muncul saat pengguna yang masuk lewat Google (belum punya baris di tabel
// `users`) menekan "Tambah sapi" pertama kali. Google cuma kirim nama/email/
// foto — phone/kecamatan/desa (wajib di skema) diminta di sini, sekali saja.
// Begitu tersimpan, onComplete langsung membuka form tambah sapi.
function CompleteProfileModal({ open, googleUser, onClose, onComplete, setAppToast }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [kecamatan, setKecamatan] = useState("Tuban");
  const [desa, setDesa] = useState("Baturetno");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone("");
      setName(googleUser?.name || "");
      setKecamatan("Tuban");
      setDesa("Baturetno");
      setIsSaving(false);
    }
  }, [open, googleUser]);

  if (!open || !googleUser) return null;

  const handleKecamatanChange = (kec) => {
    setKecamatan(kec);
    setDesa(TUBAN_DATA[kec]?.[0] || "");
  };

  // Dusun/RT/RW sengaja tak ditanya di sini — nullable di skema, dan alur
  // Google ini justru dibuat supaya cepat. Bisa diisi belakangan lewat
  // Ubah Profil kalau peternak mau melengkapinya.
  const save = async () => {
    if (!phone.trim() || !name.trim()) {
      return setAppToast({ message: "Harap lengkapi semua kolom yang wajib!", type: "error" });
    }
    setIsSaving(true);
    const result = await authService.completeGoogleProfile(googleUser, {
      name: name.trim(), phone: phone.trim(), kecamatan, desa, dusun: "", rt: "", rw: "", photo: googleUser.photo,
    });
    setIsSaving(false);

    if (result.success) {
      onComplete(result.user);
    } else {
      setAppToast({ message: result.error || "Gagal menyimpan profil", type: "error" });
    }
  };

  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 110 }}>
      <div className="card pop-in" style={{ width: "100%", maxWidth: 420, padding: 22, boxShadow: "var(--sh-xl)", maxHeight: "88vh", overflowY: "auto" }}>
        <h3 className="t-h2 c-1" style={{ margin: "0 0 6px" }}>Lengkapi data peternak</h3>
        <p className="t-sm c-2" style={{ margin: "0 0 18px" }}>
          Masuk sebagai <strong>{googleUser.email}</strong>. Google tidak mengirim nomor HP dan alamat — isi sekali di sini sebelum menambah sapi pertama.
        </p>
        <div className="space-y-4">
          <FF label="Nomor HP (aktif WhatsApp)"><input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" autoFocus /></FF>
          <FF label="Nama lengkap"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" /></FF>
          <FF label="Kecamatan"><select className="select" value={kecamatan} onChange={e => handleKecamatanChange(e.target.value)}>{Object.keys(TUBAN_DATA).map(k => <option key={k} value={k}>{k}</option>)}</select></FF>
          <FF label="Desa atau kelurahan"><select className="select" value={desa} onChange={e => setDesa(e.target.value)}>{(TUBAN_DATA[kecamatan] || []).map(d => <option key={d} value={d}>{d}</option>)}</select></FF>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Nanti saja</button>
          <button type="button" onClick={save} disabled={isSaving} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">{isSaving ? "Menyimpan..." : "Simpan & lanjut"}</button>
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
        jumlah_beranak: gender === 'BETINA' ? Number(parity) : 0,
      };

      // Status reproduksi & riwayat kawin hanya disimpan saat MENDAFTARKAN sapi baru.
      // Saat edit data sapi yang sudah ada, status/riwayat sengaja TIDAK disertakan agar
      // tidak menimpa riwayat yang sudah tercatat — perubahan status wajib lewat "Catat Kondisi".
      if (!editItem) {
        cattleData.status_reproduksi = gender === "JANTAN" ? "N/A" : phase;
        cattleData.ibLog = requiresMatingDate && lastMatingDate ? [{ date: lastMatingDate, isSuspect: false }] : [];
        if (phase === 'PREGNANT' && origin === 'KANDANG' && lastMatingDate) {
          cattleData.conceptionDate = lastMatingDate;
        }
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
    } catch {
      setIsSaving(false);
      setAppToast({message: "Terjadi kesalahan sistem.", type: "error"});
    }
  };
  
  if (!open) return null; 
  
    
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div>
            <p className="t-h2 c-1" style={{ margin: 0 }}>{editItem ? "Ubah data sapi" : "Tambah sapi"}</p>
            <p className="t-xs c-3" style={{ margin: "2px 0 0", fontWeight: 600 }}>
              {editItem ? `Sapi ${editItem.code || editItem.id}` : "Isi identitas dasar ternak"}
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup"><Icon.close size={18} /></button>
        </div>

        <div className="sheet-body">
          <FF label="Kode sapi / tag" hint="Kode unik yang tertulis di eartag atau yang Anda pakai sehari-hari.">
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="Contoh: L-01" />
          </FF>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FF label="Jenis kelamin">
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="BETINA">Betina</option>
                <option value="JANTAN">Jantan</option>
              </select>
            </FF>
            <FF label="Ras">
              <select className="select" value={ras} onChange={(e) => setRas(e.target.value)}>
                <option>SIMENTAL SPSI</option>
                <option>Limosin SPLI</option>
                <option>PO SPPO</option>
                <option>Brahman</option>
              </select>
            </FF>
          </div>

          <FF label="Asal usul">
            <select className="select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="KANDANG">Lahir di kandang sendiri</option>
              <option value="PASAR">Dibeli dari pasar</option>
            </select>
          </FF>

          {origin === "KANDANG" ? (
            <div className="pop-in">
              <FF label="Tanggal lahir">
                <input type="date" className="input" value={birthDate} max={todayStr()} onChange={(e) => setBirthDate(e.target.value)} />
              </FF>
            </div>
          ) : (
            <div className="pop-in">
              <FF label="Perkiraan umur (cek gigi poel)"
                  hint="Sistem menghitung perkiraan tanggal lahir otomatis dari kondisi gigi.">
                <select className="select" value={ageInMonths} onChange={(e) => setAgeInMonths(e.target.value)}>
                  <option value="">Pilih kondisi gigi seri bawah…</option>
                  <option value="12">Belum poel, gigi susu utuh — di bawah 1,5 tahun</option>
                  <option value="24">Poel 1 pasang (2 gigi tetap) — sekitar 2–2,5 tahun</option>
                  <option value="36">Poel 2 pasang (4 gigi tetap) — sekitar 3 tahun</option>
                  <option value="48">Poel 3 pasang (6 gigi tetap) — sekitar 4 tahun</option>
                  <option value="60">Poel 4 pasang (penuh) — di atas 4,5 tahun</option>
                </select>
              </FF>
            </div>
          )}

          {gender === "BETINA" && !isUnderage && phase !== "CALF" && (
            <div className="pop-in">
              <FF label="Sudah berapa kali beranak?"
                  hint="Kalau sapi dari pasar dan bertanduk, hitung jumlah cincin di pangkal tanduk untuk memperkirakannya.">
                <input type="number" className="input" value={parity} min="0"
                       onChange={(e) => setParity(e.target.value)} placeholder="Isi 0 jika belum pernah" />
              </FF>
            </div>
          )}

          {gender === "BETINA" && editItem && (
            <div className="callout callout-neut" style={{ marginBottom: 16 }}>
              <Icon.info size={17} stroke={2} />
              <span>
                Status sekarang: <strong>{tidyLabel(analyzeCattle(editItem).statusLabel)}</strong>.
                Untuk mengubahnya (kawin, hasil periksa, melahirkan, sakit), pakai tombol
                <strong> Catat kondisi</strong> — halaman ini hanya untuk memperbaiki identitas sapi.
              </span>
            </div>
          )}

          {gender === "BETINA" && !editItem && (
            <>
              <FF label="Status reproduksi saat ini">
                <select
                  className="select"
                  value={phase}
                  disabled={isUnderage}
                  onChange={(e) => {
                    setPhase(e.target.value);
                    if (origin === "PASAR" && !isUnderage && (e.target.value === "OPEN" || e.target.value === "PREGNANT")) {
                      setAppToast({ message: "Sapi pasar dewasa wajib diperiksa petugas untuk memastikan statusnya.", type: "error" });
                    }
                  }}
                >
                  {!(origin === "PASAR" && !isUnderage) && <option value="CALF">Pedet / dara belum kawin</option>}
                  {!isUnderage && <option value="OPEN">Kosong, siap kawin</option>}
                  {!isUnderage && origin === "KANDANG" && <option value="BRED">Sudah kawin, belum diperiksa</option>}
                  {!isUnderage && <option value="PREGNANT">Bunting</option>}
                </select>
              </FF>

              {(phase === "BRED" || (phase === "PREGNANT" && origin === "KANDANG")) && (
                <div className="pop-in">
                  <FF label="Tanggal kawin terakhir">
                    <input type="date" className="input" value={lastMatingDate} max={todayStr()}
                           onChange={(e) => setLastMatingDate(e.target.value)} />
                  </FF>
                </div>
              )}

              {origin === "PASAR" && !isUnderage && (phase === "OPEN" || phase === "PREGNANT") && (
                <div className="callout callout-crit pop-in" style={{ marginBottom: 16 }}>
                  <Icon.alert size={17} stroke={2} />
                  <span>
                    Status sapi pasar tidak bisa dipastikan dari fisiknya saja.
                    Laporkan ke petugas untuk pemeriksaan kebuntingan sebelum diberi penanganan.
                  </span>
                </div>
              )}

              {origin === "KANDANG" && (phase === "OPEN" || phase === "PREGNANT") && (
                <div className="callout callout-info pop-in" style={{ marginBottom: 16 }}>
                  <Icon.info size={17} stroke={2} />
                  <span>Disarankan tetap minta petugas memastikan status reproduksi dan kondisi rahimnya.</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sheet-foot">
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>Batal</button>
          <button onClick={save} disabled={isSaving} className="btn btn-primary" style={{ flex: 1 }}>
            {isSaving ? "Menyimpan…" : editItem ? "Simpan perubahan" : "Simpan data ternak"}
          </button>
        </div>
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
    } catch {
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
    } catch {
      setAppToast({message: "Terjadi kesalahan sistem", type: "error"});
    }
    setIsLoading(false);
  };

  if (!open) return null;
  const inp = "input";

  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 60 }}>
      <div className="card pop-in" style={{ width: "100%", maxWidth: 400, padding: 22, maxHeight: "88dvh", overflowY: "auto", boxShadow: "var(--sh-xl)" }}>
        <h3 className="t-h2 c-1">Edit Profil</h3>
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-500 mb-3 shadow-inner overflow-hidden border-4 border-white">
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
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Profil'}</button>
        </div>
      </div>
    </div>
  );
}

const ICON_HOME = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3z"></path></svg>;
const ICON_COW = <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor"><path d="M85.9,46.1c-1.9-2.2-4.1-4-6.5-5.3c0,0-11-6-11.4-6.3c-0.1,0-0.1-0.1-0.2-0.1c-1.3-1-3.1-1.3-4.7-0.7 c-0.7,0.3-1.4,0.7-1.9,1.3c-2.3,2.4-5.3,4.6-8.3,4.6c-2.6,0-5.1-1.6-7-4.1c-1.7-2.3-3.6-3.8-5.6-4.6c-0.1,0-0.2-0.1-0.3-0.1 C38,30.3,36.1,30.7,34.8,32c-0.1,0.1-0.1,0.1-0.2,0.1C33,33.5,22,41.4,22,41.4c-2.2,1.6-3.7,3.9-4,6.4c-0.3,2.5,0.7,5,2.6,6.6 c0.1,0.1,0.1,0.1,0.2,0.1c0.1,0,0.1,0,0.2,0.1c2.1,1.5,4.7,2.1,7.2,1.7c1.3-0.2,2.5-0.7,3.6-1.5c0.1-0.1,0.2-0.1,0.3-0.2 c2-1.9,4.5-2.8,7.1-2.8c2.9,0,5.6,1.2,7.4,3.1c1.8,1.9,4.1,3,6.6,3c2,0,3.9-0.8,5.3-2.2c0.1-0.1,0.1-0.1,0.2-0.1 c1.8-2,4.6-3,7.3-2.6c1.1,0.2,2.2,0.6,3.2,1.2c0.1,0.1,0.1,0.1,0.2,0.1c1.9,1.1,4.1,1.4,6.1,0.8c2-0.6,3.8-2,5-3.8 C86.7,50,86.9,48,85.9,46.1z M52.5,41.4c0,2.1-1.7,3.8-3.8,3.8c-2.1,0-3.8-1.7-3.8-3.8c0-2.1,1.7-3.8,3.8-3.8C50.8,37.6,52.5,39.3,52.5,41.4 z"></path></svg>;
const ICON_CALENDAR = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"></path></svg>;
const ICON_BOOK = <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path></svg>;
const ICON_CHART = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9"></path><path d="M21 12a9 9 0 0 0-9-9v9z"></path></svg>;
const ICON_INFO = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const ICON_HONESTY = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;

function OnboardingTutorial({ open, onClose }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open]);

  const slides = [
    { icon: Icon.sparkle, title: "Selamat datang di SIRAPI",
      desc: "Aplikasi ini membantu Anda mencatat dan memantau kondisi reproduksi sapi — dari kawin, bunting, melahirkan, sampai kesehatan." },
    { icon: Icon.checkCircle, title: "Isi data apa adanya",
      desc: "Semua saran dan prediksi dihitung dari tanggal yang Anda masukkan. Makin akurat isinya, makin bisa dipercaya hasilnya." },
    { icon: Icon.home, title: "Beranda",
      desc: "Ringkasan kandang dan daftar sapi yang perlu tindakan hari ini, diurutkan dari yang paling genting." },
    { icon: Icon.cow, title: "Ternak",
      desc: "Daftar semua sapi Anda. Ketuk satu baris untuk melihat riwayatnya, lalu Catat kondisi untuk melapor kawin, hasil periksa, kelahiran, atau sakit." },
    { icon: Icon.calendar, title: "Kalender",
      desc: "Perkiraan jadwal birahi, jadwal pemeriksaan kebuntingan, dan tanggal lahir — dihitung otomatis untuk tiap sapi betina." },
    { icon: Icon.book, title: "Akademi dan Profil",
      desc: "Akademi berisi materi belajar dan jadwal kelas. Profil untuk data diri, notifikasi harian, dan panduan lengkap." },
    { icon: Icon.help, title: "Butuh panduan lebih detail?",
      desc: "Buka Profil → Cara pakai aplikasi. Isinya panduan langkah demi langkah, bisa dibaca ulang kapan saja." },
  ];

  if (!open) return null;
  const isLast = step === slides.length - 1;
  const s = slides[step];
  const SlideIcon = s.icon;

  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 150 }}>
      <div className="card pop-in" style={{ width: "100%", maxWidth: 380, overflow: "hidden", boxShadow: "var(--sh-xl)" }}>
        <div style={{ padding: "26px 24px 20px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} className="t-xs"
                  style={{ position: "absolute", top: 14, right: 16, background: "none", border: 0,
                           color: "var(--text-3)", fontWeight: 700, cursor: "pointer" }}>
            Lewati
          </button>
          <div className="empty-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)", marginBottom: 16 }}>
            <SlideIcon size={24} />
          </div>
          <h3 className="t-h2 c-1" style={{ margin: "0 0 7px" }}>{s.title}</h3>
          <p className="t-sm c-2" style={{ margin: 0 }}>{s.desc}</p>
        </div>

        <div style={{ padding: "16px 24px 22px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
            {slides.map((_, i) => (
              <span key={i} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: i <= step ? "var(--brand)" : "var(--border)",
                transition: "background .25s ease",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn btn-secondary" style={{ flex: 1 }}>Kembali</button>
            )}
            <button onClick={() => (isLast ? onClose() : setStep(step + 1))} className="btn btn-primary" style={{ flex: 1 }}>
              {isLast ? "Mulai pakai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpGuideScreen({ open, onClose }) {
  const [openSection, setOpenSection] = useState(0);

  // Panduan disusun mengikuti urutan yang benar-benar dialami peternak,
  // dan memakai nama menu yang sama persis dengan yang ada di layar.
  const sections = [
    { t: "Kenapa data harus diisi apa adanya",
      b: "Semua analisa, prediksi kalender, dan saran dihitung dari tanggal yang Anda masukkan. Kalau tanggal kawin atau kelahiran diisi asal, jadwal pemeriksaan kebuntingan dan perkiraan tanggal lahir ikut meleset." },
    { t: "Menambah sapi baru",
      b: "Di tab Beranda atau Ternak, ketuk tombol + di pojok kanan bawah. Isi kode sapi, jenis kelamin, ras, asal usul, dan tanggal lahir. Kalau sapi dibeli dari pasar dan tanggal lahirnya tidak diketahui, pilih perkiraan umur lewat kondisi gigi poel." },
    { t: "Melaporkan kawin (inseminasi buatan)",
      b: "Buka tab Ternak, ketuk sapinya, lalu Catat kondisi → Reproduksi → Inseminasi buatan (IB). Isi tanggal IB-nya. Status sapi berubah otomatis." },
    { t: "Melaporkan hasil pemeriksaan kebuntingan",
      b: "Sekitar 60 hari setelah IB, petugas akan memeriksa. Catat hasilnya lewat Catat kondisi → Reproduksi → Hasil periksa: bunting atau tidak bunting." },
    { t: "Melaporkan kelahiran",
      b: "Catat kondisi → Reproduksi → Melahirkan, lalu isi tanggalnya. Pilihan ini hanya muncul untuk sapi yang statusnya bunting." },
    { t: "Melaporkan sapi sakit",
      b: "Catat kondisi → Kesehatan. Tulis apa yang Anda lihat pada sapi, apa adanya. Anda tidak perlu menebak penyakitnya — petugas yang akan menentukan." },
    { t: "Membaca kalender",
      b: "Tab Kalender menampilkan perkiraan jadwal birahi, pemeriksaan kebuntingan, dan tanggal lahir. Pilih sapi lewat menu di atas, dan ketuk tanggal berwarna untuk melihat keterangannya." },
    { t: "Membaca Beranda",
      b: "Empat kotak di atas adalah ringkasan kandang. Di bawahnya, daftar Perlu tindakan diurutkan dari yang paling genting — merah berarti perlu petugas, kuning berarti bisa Anda tangani sendiri." },
    { t: "Menghubungi petugas",
      b: "Sapi yang perlu diperiksa petugas akan menampilkan tombol Hubungi petugas. Ketuk untuk langsung membuka percakapan WhatsApp, lengkap dengan kode sapi dan kondisinya." },
    { t: "Menyalakan notifikasi harian",
      b: "Buka Profil, nyalakan Notifikasi harian. Anda akan menerima sapaan dan info penting tiap hari meski aplikasi tertutup. Di iPhone, tambahkan dulu aplikasi ini ke layar utama lewat Safari → Bagikan → Tambahkan ke Layar Utama." },
  ];

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "var(--bg)",
                  overflowY: "auto", maxWidth: "var(--app-w)", margin: "0 auto",
                  boxShadow: "0 0 0 1px var(--border)" }}>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={onClose} className="icon-btn" aria-label="Kembali">
            <Icon.chevronLeft size={18} stroke={2.2} />
          </button>
          <p className="t-h3 c-1" style={{ margin: 0 }}>Cara pakai aplikasi</p>
        </div>
      </div>

      <div className="page">
        <div className="rowlist">
          {sections.map((sec, i) => (
            <div key={i}>
              <button className="row" onClick={() => setOpenSection(openSection === i ? -1 : i)}
                      aria-expanded={openSection === i} style={{ alignItems: "flex-start" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: "var(--brand-soft)", color: "var(--brand)", fontSize: 11.5, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</span>
                <span className="row-main">
                  <span className="row-title" style={{ whiteSpace: "normal" }}>{sec.t}</span>
                </span>
                <span className="row-chev" style={{ transform: openSection === i ? "rotate(180deg)" : "none",
                                                    transition: "transform .2s ease", marginTop: 2 }}>
                  <Icon.chevronDown size={17} />
                </span>
              </button>
              {openSection === i && (
                <div className="fade-in" style={{ padding: "0 14px 15px 48px" }}>
                  <p className="t-sm c-2" style={{ margin: 0 }}>{sec.b}</p>
                </div>
              )}
            </div>
          ))}
        </div>
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
    } catch {
      setAppToast({ message: "Terjadi kesalahan sistem.", type: "error" });
    }
    setIsLoading(false);
  };

  if (!open) return null;
  const inp = "input";

  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 60 }}>
      <div className="card pop-in" style={{ width: "100%", maxWidth: 400, padding: 22, maxHeight: "88dvh", overflowY: "auto", boxShadow: "var(--sh-xl)" }}>
        <h3 className="t-h2 c-1">Ganti Password</h3>
        <div className="space-y-4">
          <FF label="Password Lama">
            <div className="relative">
              <input type={showOld ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={oldPassword} onChange={e => setOldPassword(e.target.value)} disabled={isLoading} placeholder="Masukkan password lama" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-colors">{showOld ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Password Baru">
            <div className="relative">
              <input type={showNew ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isLoading} placeholder="Minimal 6 karakter" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-colors">{showNew ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Konfirmasi Password Baru">
            <input type={showNew ? "text" : "password"} className={inp} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} placeholder="Ulangi password baru" />
          </FF>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={isLoading}>Batal</button>
          <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Password'}</button>
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

  const inp = "input";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-cream px-4">
      <form onSubmit={handleSubmit} className="card pop-in" style={{ width: "100%", maxWidth: 400, padding: 24, boxShadow: "var(--sh-xl)" }}>
        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Buat Password Baru</h2>
        <p className="t-sm c-2" style={{ marginBottom: 18 }}>Tautan reset terverifikasi. Masukkan password baru untuk akun Anda.</p>
        <div className="space-y-4">
          <FF label="Password Baru">
            <div className="relative">
              <input type={showPw ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isLoading} placeholder="Minimal 6 karakter" autoFocus />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-colors">{showPw ? '🙈' : '👁️'}</button>
            </div>
          </FF>
          <FF label="Konfirmasi Password Baru">
            <input type={showPw ? "text" : "password"} className={inp} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} placeholder="Ulangi password baru" />
          </FF>
        </div>
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-block" style={{ marginTop: 20 }}>{isLoading ? "Menyimpan..." : "Simpan Password Baru"}</button>
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


// Menutup lapisan teratas satu per satu (modal -> sheet -> layar bantuan),
// baru keluar aplikasi kalau memang tidak ada apa-apa lagi yang terbuka.
function useBackButton() {
  useEffect(() => {
    const closeTop = () => {
      if (typeof window.__sirapiCloseTop === "function") return window.__sirapiCloseTop();
      return false;
    };

    const onKey = (e) => { if (e.key === "Escape") closeTop(); };
    window.addEventListener("keydown", onKey);

    let remove = null;
    // @capacitor/app hanya ada di build Android/iOS; di web impor ini gagal
    // dengan tenang dan aplikasi tetap jalan seperti biasa.
    import("@capacitor/app")
      .then(({ App: CapApp }) => {
        if (!CapApp?.addListener) return;
        const h = CapApp.addListener("backButton", ({ canGoBack }) => {
          const handled = closeTop();
          if (!handled && !canGoBack) CapApp.exitApp();
        });
        remove = () => Promise.resolve(h).then((x) => x?.remove?.());
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("keydown", onKey);
      if (remove) remove();
    };
  }, []);
}

function AppContent() {
  // Tombol kembali Android & tombol Esc. Sebelumnya tidak ditangani sama sekali:
  // di APK, menekan "kembali" saat modal terbuka menutup APLIKASI, bukan modalnya.
  useBackButton();

  const [dbCattle, setDbCattle] = useState([]);
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("srtt_user_profile")) || null; } 
    catch { return null; }
  });
  
  const [appToast, setAppToast] = useState(null); 
  const [appConfirm, setAppConfirm] = useState({ open: false }); 
  
  const [hasStarted, setHasStarted] = useState(profile !== null);
  const [nav, setNav] = useState("dashboard"); 
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  // Pengguna yang masuk lewat Google pertama kali belum punya baris di tabel
  // `users` (Google tidak kirim phone/kecamatan/desa yang wajib diisi) —
  // ditahan dulu sampai mereka benar-benar mau menambah sapi pertama,
  // lihat openAddCattle() di bawah.
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);
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
  const [rewindOpen, setRewindOpen] = useState(false);
  const [akademiOpen, setAkademiOpen] = useState(false);
  const [shareRewind, setShareRewind] = useState(null);

  // Satu tempat yang tahu urutan lapisan yang terbuka, dipakai oleh tombol
  // kembali Android dan tombol Esc. Urutannya dari yang paling atas.
  useEffect(() => {
    window.__openHelpGuide = () => setHelpGuideOpen(true);
    window.__sirapiCloseTop = () => {
      if (appConfirm?.open)   { setAppConfirm({ open: false }); return true; }
      if (rewindOpen)         { setRewindOpen(false); return true; }
      if (tutorialOpen)       { setTutorialOpen(false); return true; }
      if (helpGuideOpen)      { setHelpGuideOpen(false); return true; }
      if (akademiOpen)        { setAkademiOpen(false); return true; }
      if (changePasswordOpen) { setChangePasswordOpen(false); return true; }
      if (editProfileOpen)    { setEditProfileOpen(false); return true; }
      if (detailItem)         { setDetailItem(null); return true; }
      if (actionItem)         { setActionItem(null); return true; }
      if (addOpen)            { setAddOpen(false); setEditItem(null); return true; }
      if (nav !== "dashboard"){ setNav("dashboard"); return true; }
      return false;
    };
    return () => {
      delete window.__sirapiCloseTop;
      delete window.__openHelpGuide;
    };
  }, [appConfirm, rewindOpen, tutorialOpen, helpGuideOpen, akademiOpen, changePasswordOpen, editProfileOpen,
      detailItem, actionItem, addOpen, nav]);

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    import('./core/pushService').then(({ pushService }) => {
      pushService.isSubscribed().then(setPushSubscribed);
    });
  }, []);

  const handleTogglePush = async () => {
    setPushLoading(true);
    const { pushService } = await import('./core/pushService');
    if (pushSubscribed) {
      await pushService.unsubscribe(profile?.id);
      setPushSubscribed(false);
      setAppToast({ message: "Notifikasi dimatikan.", type: "success" });
    } else {
      const result = await pushService.subscribe(profile?.id);
      if (result.success) {
        setPushSubscribed(true);
        setAppToast({ message: "Notifikasi diaktifkan!", type: "success" });
      } else {
        setAppToast({ message: result.error || "Gagal mengaktifkan notifikasi.", type: "error" });
      }
    }
    setPushLoading(false);
  };

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
  useEffect(() => { try { if (profile) localStorage.setItem("srtt_user_profile", JSON.stringify(profile)); } catch { /* storage penuh/diblokir browser — abaikan */ } }, [profile]);

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

  // Satu pintu masuk untuk "tambah sapi baru" dari mana pun tombolnya
  // dipencet. Kalau profil belum lengkap (bekas login Google pertama kali),
  // minta lengkapi dulu — begitu tersimpan, langsung lanjut ke form sapi
  // tanpa perlu tekan tombol tambah lagi.
  const openAddCattle = () => {
    if (profile?.profileIncomplete) {
      setCompleteProfileOpen(true);
      return;
    }
    setEditItem(null);
    setAddOpen(true);
  };

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
    } catch {
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

      // ibSinceCalving, bukan current.ibLog mentah — kalau tidak disaring,
      // sapi yang belum pernah di-IB di siklus SEKARANG tapi punya riwayat
      // IB lama (dari kehamilan sebelumnya yang sudah lama selesai) bisa
      // ketiban conceptionDate dari IB bertahun-tahun lalu itu.
      const sortedIB = ibSinceCalving(current);
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
    } catch {
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
    } catch {
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
      <div className="app-shell flex flex-col">
        <GlobalStyle />
        <ToastNotification message={appToast?.message} type={appToast?.type} onClose={() => setAppToast(null)} />
        <ResetPasswordScreen onDone={() => setRecoveryMode(false)} setAppToast={setAppToast} />
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col">
      <GlobalStyle />
      
      <DialogSystem />
      <ToastNotification message={appToast?.message} type={appToast?.type} onClose={() => setAppToast(null)} />
      <CustomConfirm {...appConfirm} onCancel={() => setAppConfirm({ open: false })} />
      
      {!hideSplashDOM && (
        <div className="splash-container">
          <HeroScene />
          <div className="splash-inner">
            <div className="splash-logo-wrap">
              <img src={logoTuban} alt="" style={{ width: 46, height: "auto", display: "block" }} />
            </div>
            <h1 className="splash-title">SIRAPI</h1>
            <p className="splash-subtitle">Sistem Informasi Reproduksi Sapi</p>
            <div className="splash-loader" />
          </div>
          <p className="splash-foot">
            Dinas Ketahanan Pangan, Pertanian dan Perikanan<br />Kabupaten Tuban
          </p>
        </div>
      )}

      {hideSplashDOM && !hasStarted && !profile && (
        <div className="intro fade-in">
          <HeroScene />

          <div className="intro-top">
            <span className="glass-pill">
              <img src={logoTuban} alt="" style={{ width: 17, height: 17, objectFit: "contain" }} />
              Kabupaten Tuban
            </span>
          </div>

          {/* Cuplikan kartu asli dari dalam aplikasi. Bagian atas layar sambutan
              biasanya kosong melompong; diisi ini, calon pengguna langsung
              melihat wujud produknya sebelum menekan apa pun. */}
          <div className="intro-peek" aria-hidden="true">
            <div className="peek-card peek-a">
              <span className="peek-badge peek-warn">Perlu tindakan</span>
              <p className="peek-code">SPI-005</p>
              <p className="peek-sub">Waktunya pemeriksaan kebuntingan</p>
            </div>
            <div className="peek-card peek-b">
              <span className="peek-badge peek-ok">Aman</span>
              <p className="peek-code">SPI-006</p>
              <p className="peek-sub">Bunting aktif · perkiraan lahir 31 Des</p>
            </div>
          </div>

          <div className="intro-body">
            <h1 className="intro-title rise-in">
              Kandang Anda,<br />terpantau tiap hari.
            </h1>
            <p className="intro-lead rise-in" style={{ animationDelay: ".06s" }}>
              Catat kawin, bunting, kelahiran, dan kesehatan sapi — SIRAPI yang mengingatkan
              kapan tiap ekor perlu diurus.
            </p>

            <ul className="intro-points rise-in" style={{ animationDelay: ".12s" }}>
              {[
                { icon: Icon.calendar, t: "Jadwal dihitung otomatis", d: "Birahi, pemeriksaan kebuntingan, perkiraan lahir" },
                { icon: Icon.alertCircle, t: "Peringatan sebelum terlambat", d: "Tahu lebih dulu sapi mana yang perlu petugas" },
                { icon: Icon.bell, t: "Pengingat harian", d: "Sampai ke HP meski aplikasi tertutup" },
              ].map((p) => (
                <li key={p.t}>
                  <span className="intro-ic"><p.icon size={17} stroke={2} /></span>
                  <span>
                    <strong>{p.t}</strong>
                    <em>{p.d}</em>
                  </span>
                </li>
              ))}
            </ul>

            <div className="intro-cta rise-in" style={{ animationDelay: ".18s" }}>
              <button onClick={() => { setHasStarted(true); }} className="btn btn-lg btn-block intro-btn">
                Mulai <Icon.arrowRight size={18} stroke={2.2} />
              </button>
              <p className="intro-foot">
                Dinas Ketahanan Pangan, Pertanian dan Perikanan Kabupaten Tuban
              </p>
            </div>
          </div>
        </div>
      )}

      {hideSplashDOM && hasStarted && !profile && (
        <AuthScreen setProfile={(userData) => { setProfile(userData); setAppToast({message: "Berhasil Login!", type: "success"}) }} />
      )}

      {hideSplashDOM && hasStarted && profile && profile.status === 'pending' && (
        <PendingApprovalScreen profile={profile} onLogout={() => { setProfile(null); localStorage.removeItem("srtt_user_profile"); }} />
      )}

      {hideSplashDOM && hasStarted && profile && profile.status !== 'pending' && (
        <>
          <header className="topbar">
            <div className="topbar-brand">
              <img src={logoTuban} alt="" className="topbar-logo" />
              <div className="min-w-0">
                <p className="topbar-name">SIRAPI</p>
                <p className="topbar-sub">Dinas Ketahanan Pangan, Pertanian dan Perikanan Tuban</p>
              </div>
            </div>
          </header>

          <div className="flex-1">
            {nav === "dashboard" && <DashboardView dbCattle={safeDb} onAdviceClick={handleAdviceClick} profile={profile} setAppToast={setAppToast} onAddNew={openAddCattle} />}
            {nav === "assets" && (
              <div className="fade-in">
                <div style={{ position: "sticky", top: "calc(56px + env(safe-area-inset-top))", zIndex: 30,
                              background: "rgba(244,245,247,.92)", backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)",
                              padding: "14px 16px 12px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 11 }}>
                    <h1 className="t-h1 c-1">Ternak</h1>
                    <span className="t-xs c-3 tabular" style={{ fontWeight: 600 }}>
                      {filteredCattle.length === safeDb.length
                        ? `${safeDb.length} ekor`
                        : `${filteredCattle.length} dari ${safeDb.length} ekor`}
                    </span>
                  </div>

                  {/* Pencarian sekarang input teks sungguhan. Sebelumnya berupa
                      dropdown berisi seluruh kode sapi — tidak terpakai begitu
                      jumlah ternak lewat 20 ekor. */}
                  <div className="input-icon">
                    <Icon.search size={18} />
                    <input
                      type="search"
                      className="input"
                      inputMode="search"
                      placeholder="Cari kode sapi…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="segmented" style={{ marginTop: 10 }}>
                    {[
                      { k: "ALL", l: "Semua" },
                      { k: "BETINA", l: "Betina" },
                      { k: "JANTAN", l: "Jantan" },
                    ].map((g) => (
                      <button key={g.k} onClick={() => setGenderFilter(g.k)} className={genderFilter === g.k ? "active" : ""}>
                        {g.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="page" style={{ paddingTop: 14 }}>
                  {safeDb.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <div className="empty-icon"><Icon.cow size={26} /></div>
                        <p className="empty-title">Belum ada data sapi</p>
                        <p className="empty-text">Tambahkan sapi pertama Anda lewat tombol + di tab Beranda.</p>
                      </div>
                    </div>
                  ) : filteredCattle.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <div className="empty-icon"><Icon.search size={24} /></div>
                        <p className="empty-title">Tidak ditemukan</p>
                        <p className="empty-text">
                          Tidak ada sapi dengan kode &ldquo;{searchQuery}&rdquo;
                          {genderFilter !== "ALL" ? ` pada filter ${genderFilter.toLowerCase()}` : ""}.
                        </p>
                        <button onClick={() => { setSearchQuery(""); setGenderFilter("ALL"); }} className="btn btn-sm btn-secondary">
                          Bersihkan pencarian
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="stack-8 stagger">
                      {filteredCattle.map((item) =>
                        item ? (
                          <AssetRecordCard
                            key={item.id}
                            item={item}
                            onEdit={(i) => { setEditItem(i); setAddOpen(true); }}
                            onOpenAction={setActionItem}
                            onDelete={handleDeleteRequest}
                            onOpenDetail={setDetailItem}
                            highlightedId={highlightedId}
                            setHighlightedId={setHighlightedId}
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                <div className="fab-wrap">
                  <button onClick={openAddCattle} className="fab" aria-label="Tambah ternak">
                    <Icon.plus size={24} stroke={2.3} />
                  </button>
                </div>
              </div>
            )}
            {nav === "calendar" && <CalendarView dbCattle={safeDb} profile={profile} />}
            {nav === "laporan" && (
              <LaporanView
                dbCattle={safeDb}
                onBukaRewind={() => setRewindOpen(true)}
                onPilihSapi={handleAdviceClick}
              />
            )}
            {nav === "profile" && (
              <div className="page fade-in">
                <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "var(--r-full)", overflow: "hidden",
                                background: "var(--brand-soft)", color: "var(--brand)", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22, fontWeight: 700 }}>
                    {profile.photo
                      ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span>{profile.name ? profile.name.charAt(0).toUpperCase() : "P"}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="t-h2 c-1 truncate-1" style={{ margin: 0 }}>{profile.name}</p>
                    <p className="t-sm c-3 truncate-1" style={{ margin: "2px 0 0" }}>
                      {[profile.dusun, profile.desa, profile.kecamatan].filter(Boolean).join(", ") || "Tuban"}
                    </p>
                  </div>
                  <button onClick={() => setEditProfileOpen(true)} className="btn btn-sm btn-secondary">Ubah</button>
                </div>

                <div className="stack-20">
                  <section>
                    <p className="t-over" style={{ marginBottom: 9 }}>Notifikasi</p>
                    <div className="rowlist">
                      <div className="row" style={{ cursor: "default" }}>
                        <span className="row-icon" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                          <Icon.bell size={18} />
                        </span>
                        <span className="row-main">
                          <span className="row-title">Notifikasi harian</span>
                          <span className="row-sub" style={{ whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}>Sapaan dan info penting tiap hari, meski aplikasi tertutup</span>
                        </span>
                        <button
                          onClick={handleTogglePush}
                          disabled={pushLoading}
                          role="switch"
                          aria-checked={pushSubscribed}
                          aria-label="Notifikasi harian"
                          style={{
                            position: "relative", width: 46, height: 27, borderRadius: 999, border: 0,
                            flexShrink: 0, cursor: "pointer", opacity: pushLoading ? .5 : 1,
                            background: pushSubscribed ? "var(--brand)" : "var(--border-strong)",
                            transition: "background .2s ease",
                          }}
                        >
                          <span style={{
                            position: "absolute", top: 3, left: 3, width: 21, height: 21, borderRadius: "50%",
                            background: "#fff", boxShadow: "0 1px 3px rgba(16,24,40,.2)",
                            transform: pushSubscribed ? "translateX(19px)" : "translateX(0)",
                            transition: "transform .2s cubic-bezier(.34,1.4,.64,1)",
                          }} />
                        </button>
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className="t-over" style={{ marginBottom: 9 }}>Bantuan</p>
                    <div className="rowlist">
                      <button className="row" onClick={() => setHelpGuideOpen(true)}>
                        <span className="row-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                          <Icon.book size={18} />
                        </span>
                        <span className="row-main"><span className="row-title">Cara pakai aplikasi</span></span>
                        <Icon.chevronRight size={18} className="row-chev" />
                      </button>
                      <button className="row" onClick={() => setTutorialOpen(true)}>
                        <span className="row-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                          <Icon.help size={18} />
                        </span>
                        <span className="row-main"><span className="row-title">Tutorial interaktif</span></span>
                        <Icon.chevronRight size={18} className="row-chev" />
                      </button>
                      <button className="row" onClick={() => setAkademiOpen(true)}>
                        <span className="row-icon" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                          <Icon.video size={18} />
                        </span>
                        <span className="row-main">
                          <span className="row-title">Kelas &amp; materi</span>
                          <span className="row-sub">Jadwal kelas daring dan panduan belajar</span>
                        </span>
                        <Icon.chevronRight size={18} className="row-chev" />
                      </button>
                      <a className="row" style={{ textDecoration: "none" }} target="_blank" rel="noopener noreferrer"
                         href={waPetugas(`Halo Petugas, saya ${profile?.name || "Peternak"}. Saya butuh bantuan.`)}>
                        <span className="row-icon" style={{ background: "#E7F9EE", color: "#1DA851" }}>
                          <Icon.phone size={18} />
                        </span>
                        <span className="row-main"><span className="row-title">Hubungi petugas</span></span>
                        <Icon.chevronRight size={18} className="row-chev" />
                      </a>
                    </div>
                  </section>

                  <section>
                    <p className="t-over" style={{ marginBottom: 9 }}>Akun</p>
                    <div className="rowlist">
                      <button className="row" onClick={() => setChangePasswordOpen(true)}>
                        <span className="row-icon" style={{ background: "var(--neut-bg)", color: "var(--text-2)" }}>
                          <Icon.lock size={18} />
                        </span>
                        <span className="row-main"><span className="row-title">Ubah kata sandi</span></span>
                        <Icon.chevronRight size={18} className="row-chev" />
                      </button>
                      <button
                        className="row"
                        onClick={() => {
                          setAppConfirm({
                            open: true,
                            title: "Keluar dari akun?",
                            message: "Sesi Anda akan diakhiri. Data ternak tetap tersimpan dan bisa dibuka lagi setelah masuk kembali.",
                            isDestructive: true,
                            confirmText: "Keluar",
                            onConfirm: () => {
                              setDbCattle([]);
                              localStorage.removeItem("srtt_user_profile");
                              setProfile(null); setNav("dashboard"); setSearchQuery("");
                              setGenderFilter("ALL"); setDetailItem(null); setActionItem(null);
                              setEditItem(null); setAddOpen(false); setHighlightedId(null);
                            },
                          });
                        }}
                      >
                        <span className="row-icon" style={{ background: "var(--crit-bg)", color: "var(--crit)" }}>
                          <Icon.logout size={18} />
                        </span>
                        <span className="row-main">
                          <span className="row-title" style={{ color: "var(--crit)" }}>Keluar akun</span>
                        </span>
                      </button>
                    </div>
                  </section>

                  <p className="t-xs c-3" style={{ textAlign: "center", lineHeight: 1.6, marginTop: 4 }}>
                    SIRAPI · Sistem Informasi Reproduksi Sapi<br />
                    Dinas Ketahanan Pangan, Pertanian dan Perikanan Kabupaten Tuban
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <nav className="nav-bar" aria-label="Navigasi utama">
            {[
              { key: "dashboard", label: "Beranda",     icon: Icon.home },
              { key: "assets",    label: "Ternak",      icon: Icon.cow },
              { key: "calendar",  label: "Kalender",    icon: Icon.calendar },
              { key: "laporan",   label: "Laporan",     icon: Icon.trendUp },
              { key: "profile",   label: "Profil",      icon: Icon.user },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setNav(t.key)}
                className={`nav-item ${nav === t.key ? "active" : ""}`}
                aria-current={nav === t.key ? "page" : undefined}
              >
                <span className="nav-icon">
                  <t.icon size={23} stroke={nav === t.key ? 2.1 : 1.75} />
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          
          {rewindOpen && (
            <RewindView
              dbCattle={safeDb}
              tahun={new Date().getFullYear()}
              onTutup={() => setRewindOpen(false)}
              onBagikan={() => { setRewindOpen(false); setShareRewind(true); }}
            />
          )}

          <ShareSummaryModal
            open={!!shareRewind}
            onClose={() => setShareRewind(null)}
            stats={{
              total: safeDb.length,
              jantan: safeDb.filter((i) => i && (i.jenis_kelamin === "JANTAN" || i.gender === "JANTAN")).length,
              betina: safeDb.filter((i) => i && (i.jenis_kelamin === "BETINA" || i.gender === "BETINA")).length,
              pregnant: safeDb.filter((i) => i && (i.status_reproduksi === "PREGNANT" || i.phase === "PREGNANT")).length,
            }}
            profile={profile}
            dbCattle={safeDb}
            setAppToast={setAppToast}
          />

          <AddModal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null); }} onSave={handleSaveAdd} editItem={editItem} setAppToast={setAppToast} />
          <CompleteProfileModal
            open={completeProfileOpen}
            googleUser={profile}
            onClose={() => setCompleteProfileOpen(false)}
            onComplete={(updatedUser) => {
              setProfile(updatedUser);
              setCompleteProfileOpen(false);
              setEditItem(null);
              setAddOpen(true);
            }}
            setAppToast={setAppToast}
          />
          <ActionModal open={!!actionItem} item={actionItem} onClose={() => setActionItem(null)} onSaveRepro={handleSaveRepro} onSaveHealth={handleSaveHealth} setAppToast={setAppToast} />
          <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onDeleteLog={handleDeleteLog} setAppToast={setAppToast} setAppConfirm={setAppConfirm} />
          <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSave={setProfile} currentProfile={profile} setAppToast={setAppToast} />
          <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} currentProfile={profile} setAppToast={setAppToast} />
          <OnboardingTutorial open={tutorialOpen} onClose={() => { setTutorialOpen(false); localStorage.setItem("srtt_tutorial_seen", "1"); }} />
          <HelpGuideScreen open={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} />
          <AcademyView open={akademiOpen} onClose={() => setAkademiOpen(false)} />
        </>
      )}
    </div>
  );
}