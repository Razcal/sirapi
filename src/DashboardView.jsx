import React, { useState } from "react";
import { fmtDate, dialog } from "./core/helpers";
import { COLOR } from "./core/constants";
import { analyzeCattle } from "./core/cattleEngine";

function AdviceCard({ item, analysis, onClick }) {
  if (!item || !analysis || !analysis.advice) return null;
  const c = COLOR[analysis.color] || COLOR.slate;
  const icon = analysis.isUrgent ? '⚠️' : '💡';
  
  // 1. Membaca teks saran (dijadikan huruf kecil semua agar mudah dicocokkan)
  const teksSaran = analysis.advice.toLowerCase();
  
  // 2. Mengecek apakah ada kata "panggil dokter" atau "panggil petugas"
  const butuhBantuan = teksSaran.includes("panggil dokter") || teksSaran.includes("panggil petugas");
  
  // 3. Menyiapkan pesan WA (sudah disesuaikan untuk memberikan NOTIFIKASI SAJA)
  const waMessage = `Halo Petugas, ada kondisi pada Sapi ${item.id}. Mohon segera direspons untuk memberikan NOTIFIKASI SAJA.`;
  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-2 cursor-pointer hover:bg-slate-50/70 border border-slate-100 hover:border-slate-200">
      
      {/* Bagian teks reminder */}
      <div className="flex items-start gap-3" onClick={() => onClick(item)}>
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex-shrink-0 flex items-center justify-center mt-0.5`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sapi {item.id}</p>
          <p className="text-sm font-semibold text-slate-800 leading-snug mt-1">
            {analysis.advice.replace(/⚠️|🚨|💡|✅/g, '').trim()}
          </p>
        </div>
      </div>

      {/* Tombol WA HANYA muncul jika variabel butuhBantuan bernilai True */}
      {butuhBantuan && (
        <div className="mt-2">
          <a 
            href={waLink} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} 
            className="block w-full bg-[#25D366] text-white text-sm font-bold text-center py-2.5 rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            🚨 LAPOR MASALAH
          </a>
        </div>
      )}

    </div>
  );
}

function ShareSummaryModal({ open, onClose, stats, profile }) {
  if (!open) return null;
  const farmName = profile?.farm || "Peternakan";
  const ownerName = profile?.name || "Peternak";
  const txt = `*LAPORAN POPULASI TERNAK - PROVERTI*\n\n🏡 Peternakan: ${farmName}\n🧑‍🌾 Pemilik: ${ownerName}\n📊 Total Aset: ${stats.total} Ekor\n🐄 Indukan Produktif: ${stats.betina} Ekor (Bunting: ${stats.pregnant})\n🐂 Pejantan/Bakalan: ${stats.jantan} Ekor\n\n~ Dibagikan dari Aplikasi PROVERTI Tuban`;
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  const shareFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://proverti.tubankab.go.id')}&quote=${encodeURIComponent(txt)}`, '_blank');
  const shareOther = async () => { if (navigator.share) { try { await navigator.share({ title: `Laporan Populasi ${farmName}`, text: txt }); } catch (e) {} } else { dialog.alert("Perangkat Anda tidak mendukung fitur berbagi.", "Info"); } };

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
          <button onClick={onClose} className="w-full bg-white/10 text-white border border-white/20 py-3 rounded-2xl font-bold text-sm">Tutup</button>
        </div>
      </div>
    </div>
  );
}

export function DashboardView({ dbCattle, profile, onAdviceClick }) {
  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const total = safeDb.length;
  const jantan = safeDb.filter(i => i && i.gender === "JANTAN").length;
  const betina = safeDb.filter(i => i && i.gender === "BETINA").length;
  const pregnant = safeDb.filter(i => i && i.phase === "PREGNANT").length;
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 1. Mengambil nama peternak otomatis dari data profile Anda
  const ownerName = profile?.name || "Peternak";
  
  // 2. Menyusun pesan WA dengan nama peternak tersebut
  const waMessage = `Halo Petugas, saya ${ownerName}. Ada kondisi darurat pada ternak saya. Mohon segera direspons.`;
  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(waMessage)}`;

  const itemsWithAdvice = safeDb.map(item => {
    if (!item) return null;
    try { const analysis = analyzeCattle(item); return analysis.advice ? { item, analysis } : null; } 
    catch (e) { return null; }
  }).filter(Boolean).sort((a, b) => {
    if (a.analysis.isUrgent && !b.analysis.isUrgent) return -1;
    if (!a.analysis.isUrgent && b.analysis.isUrgent) return 1;
    return 0;
  });

  return (
    <div className="fade-in pb-28 pt-2">
      <div className="px-5 space-y-5">
        
        {/* Kotak Total Aset Ternak */}
        <div className="bg-slate-900 rounded-[32px] p-7 text-white shadow-xl relative overflow-hidden">
           <div className="flex justify-between items-start relative z-10 mb-2">
             <div><p className="text-slate-400 text-[10px] font-extrabold uppercase mb-1.5">Total Aset Ternak</p><h2 className="text-5xl font-black mt-1">{total}</h2></div>
             <button onClick={() => setShareModalOpen(true)} className="bg-white/10 text-emerald-400 p-3 rounded-full">Share</button>
           </div>
        </div>

        {/* --- TOMBOL LAPOR MASALAH DARURAT --- */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-[#25D366] text-white text-base font-black text-center py-4 rounded-[24px] shadow-lg active:scale-95 transition-transform"
        >
          🚨 LAPOR MASALAH DARURAT
        </a>
        {/* ------------------------------------ */}

        {/* Bagian Saran & Peringatan */}
        <div>
          <div className="flex items-center mb-4 ml-1"><h3 className="font-black text-slate-800 text-base">Saran & Peringatan</h3></div>
          <div className="space-y-3">
            {itemsWithAdvice.length === 0 ? <div className="p-6 bg-emerald-50 rounded-[24px] text-center text-emerald-800 font-bold">Semua populasi aman terkendali.</div> : itemsWithAdvice.map(({ item, analysis }) => (<AdviceCard key={item.id} item={item} analysis={analysis} onClick={onAdviceClick} />))}
          </div>
        </div>
        
      </div>
      <ShareSummaryModal open={shareModalOpen} onClose={() => setShareModalOpen(false)} stats={{total, jantan, betina, pregnant}} profile={profile} />
    </div>
  );
}