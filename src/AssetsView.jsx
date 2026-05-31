import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addOrUpdateCattle, deleteCattle, deleteCattleLog, saveReproLog, saveHealthLog, saveHealthReport } from "./store/cattleSlice";
import { todayStr, fmtDate, getAge, handleExportCSV } from "./core/helpers";
import { COLOR } from "./core/constants";
import { analyzeCattle, buildHistory } from "./core/cattleEngine";
import { FF, TimelineItem } from "./core/components/SharedUI";

function DetailModal({ item, onClose, onDeleteLog }) {
  if (!item) return null;
  const history = buildHistory(item);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full rounded-t-[32px] slide-up h-[92vh] flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div><h3 className="font-black text-3xl">{item.id}</h3><p className="text-xs text-slate-500 uppercase">{item.ras} • {item.phase}</p></div>
          <button onClick={onClose} className="bg-slate-100 w-10 h-10 rounded-full font-bold">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto mt-4">
          {history.map((log, index) => (
            <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 mb-3 shadow-sm">
               <div className="flex justify-between items-center"><p className="font-extrabold text-sm">{log.label}</p><p className="text-[10px] text-slate-400">{fmtDate(log.date)}</p></div>
               <p className="text-xs text-slate-500 mt-2">{log.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetRecordCard({ item, onEdit, onOpenAction, onOpenDetail, onDelete, highlightedId, setHighlightedId }) {
  if (!item) return null;
  const analysis = analyzeCattle(item);
  const c = COLOR[analysis.color] || COLOR.slate;
  const history = buildHistory(item).slice(0, 2);
  const cardRef = React.useRef(null);
  const isHighlighted = highlightedId === item.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      const timer = setTimeout(() => {
        if (setHighlightedId) setHighlightedId(null);
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, setHighlightedId]);

  return (
    <div ref={cardRef} className={`bg-white rounded-3xl border shadow-sm overflow-hidden mb-4 transition-all duration-300 ${isHighlighted ? 'highlight-blink border-emerald-500 ring-2 ring-emerald-500 shadow-emerald-500/20 shadow-lg' : 'border-slate-100'}`} onClick={() => onOpenDetail && onOpenDetail(item)}>
      <div className="p-5 border-b border-slate-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-2xl font-black tracking-tight">{item.id || "?"}</h3>
          <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl ${c.bg} ${c.text}`}>{analysis.statusLabel}</span>
        </div>
        <p className="text-xs text-slate-500 font-medium">Usia: <span className="font-bold">{getAge(item.birthDate)}</span></p>
      </div>
      <div className="p-5 pb-3">
        {history.map((log, i) => <TimelineItem key={i} log={log} isLast={i === history.length - 1} />)}
      </div>
      <div className="bg-slate-50/50 px-5 py-4 flex gap-3">
        <button onClick={(e) => { e.stopPropagation(); onOpenAction(item); }} className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold">Lapor Aksi Terpadu</button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="bg-white border px-3 py-2.5 rounded-xl text-xs font-bold">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="bg-rose-50 text-rose-600 px-3 py-2.5 rounded-xl text-xs font-bold">Hapus</button>
      </div>
    </div>
  );
}

function AddModal({ open, onClose, onSave, editItem }) {
  const [id, setId] = useState("");
  useEffect(() => { if (open) setId(editItem?.id || ""); }, [open, editItem]);
  const save = () => { if (!id) return; onSave({ id, gender: "BETINA", phase: "CALF", birthDate: todayStr() }); onClose(); };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 slide-up"><FF label="Kode Sapi"><input className="w-full border p-3 rounded-xl" value={id} onChange={e=>setId(e.target.value)} /></FF><button onClick={save} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-4">Simpan</button></div>
    </div>
  );
}

function ConfirmDeleteModal({ open, onClose, onConfirm, cattleId }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-sm rounded-[24px] p-8 pop-in shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">Konfirmasi Penghapusan</h3>
        <p className="text-sm text-slate-600 font-medium mb-8">Apakah Anda yakin ingin menghapus sapi dengan kode <strong className="text-slate-900">"{cattleId}"</strong>? Aksi ini tidak dapat dibatalkan.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">Batal</button>
          <button onClick={() => { onConfirm(cattleId); onClose(); }} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-rose-500/30 transition-all">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ open, item, onClose, onSaveRepro, onSaveHealth }) {
  const [tab, setTab] = useState("KESEHATAN");
  const [resRepro, setResRepro] = useState("NONE"); 
  const [dRepro, setDRepro] = useState(todayStr()); 
  const [isUSG, setIsUSG] = useState(false);
  const [pregMonth, setPregMonth] = useState("");
  
  const [dHealth, setDHealth] = useState(todayStr());
  const [gejalaKeluhan, setGejalaKeluhan] = useState("");
  const [appAlert, setAppAlert] = useState(null);

  const profile = useSelector(state => state.profile || {});
  const ownerName = profile.name || "Peternak";

  useEffect(() => {
    if(open) { 
      setTab(item?.gender === "JANTAN" ? "KESEHATAN" : "REPRO");
      setResRepro("NONE"); setDRepro(todayStr()); setIsUSG(false); setPregMonth("");
      setDHealth(todayStr()); setGejalaKeluhan("");
      setAppAlert(null);
    }
  }, [open, item]);

  if (!open || !item) return null;

  // --- LOGIKA PENENTU PERINGATAN MEDIS ---
  const getMedicalWarning = () => {
    // 1. Cek Sapi Bunting di-IB lagi
    if (resRepro === "IB" && item.phase === "PREGNANT") {
      return "Sapi ini sudah BUNTING. Input IB tidak valid & berisiko aborsi!";
    }
    
    // 2. Cek PKB Dini
    const sortedIB = [...(item.ibLog || [])].sort((a, b) => new Date(a) - new Date(b));
    const lastIB = sortedIB.length > 0 ? sortedIB[sortedIB.length - 1] : null;
    if (lastIB && (resRepro === "POSITIVE" || resRepro === "NEGATIVE")) {
      const dPreg = Math.floor((new Date(dRepro) - new Date(lastIB)) / 86400000);
      if (!isUSG && dPreg < 60) return `Risiko EED! Pemeriksaan manual usia ${dPreg} hari sangat berbahaya.`;
      if (isUSG && dPreg < 25) return `Terlalu dini! USG baru efektif di atas 25 hari pasca IB.`;
    }

    // 3. Jika ada error lain dari sistem
    if (appAlert) return appAlert.text;

    return null;
  };

  const warningContent = getMedicalWarning();
  const waLink = `https://wa.me/6281555863186?text=${encodeURIComponent(`Halo Petugas, saya ${ownerName}. Ada PERINGATAN MEDIS pada Sapi ${item.id}: ${warningContent}. Mohon bantuannya.`)}`;

  const handleSaveRepro = () => {
    const err = getMedicalWarning();
    if (err) return setAppAlert({ type: "warning", text: err });
    if (resRepro === "NONE") return setAppAlert({ type: "warning", text: "Silakan pilih jenis aksi!" });
    if (onSaveRepro) onSaveRepro(resRepro, pregMonth, dRepro, isUSG);
    onClose();
  };

  const submitHealth = () => {
    if (!gejalaKeluhan.trim()) return setAppAlert({ type: "warning", text: "Harap isi gejala ternak!" });
    if (onSaveHealth) onSaveHealth(dHealth, gejalaKeluhan);
    onClose();
  };

  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-50";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-5">
          <div><p className="font-black text-xl text-slate-900 leading-tight">Lapor Aksi Terpadu</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: {item.id}</p></div>
          <button onClick={onClose} className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center font-bold">✕</button>
        </div>

        {/* --- KOTAK PERINGATAN MEDIS --- */}
        {warningContent && (
          <div className="p-4 rounded-2xl mb-5 bg-rose-50 border border-rose-200 text-rose-800 flex gap-3 pop-in">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-black text-[12px] tracking-widest uppercase mb-1">PERINGATAN MEDIS</p>
              <p className="text-[11px] font-medium leading-relaxed">{warningContent}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {tab === "KESEHATAN" ? (
            <>
              <FF label="Tanggal Kejadian"><input type="date" className={inp} value={dHealth} onChange={e => setDHealth(e.target.value)} /></FF>
              <FF label="Gejala / Keluhan"><textarea className={inp + " h-24 resize-none"} value={gejalaKeluhan} onChange={e => setGejalaKeluhan(e.target.value)} placeholder="Contoh: Sapi demam..." /></FF>
            </>
          ) : (
            <>
              <FF label="Tanggal Kejadian"><input type="date" className={inp} value={dRepro} onChange={e => setDRepro(e.target.value)} /></FF>
              <FF label="Jenis Aksi"><select className={inp} value={resRepro} onChange={e => setResRepro(e.target.value)}><option value="NONE">-- Pilih Aksi --</option><option value="IB">Inseminasi Buatan (IB)</option><option value="NEGATIVE">PKB: Negatif</option><option value="POSITIVE">PKB: Positif (+)</option><option value="CALVED">Kelahiran</option></select></FF>
              {(resRepro === "POSITIVE" || resRepro === "NEGATIVE") && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200"><input type="checkbox" id="usg_check" className="w-5 h-5 accent-emerald-600 rounded" checked={isUSG} onChange={(e) => setIsUSG(e.target.checked)} /><label htmlFor="usg_check" className="text-xs font-bold text-emerald-800 uppercase">Gunakan Alat USG</label></div>
              )}
            </>
          )}

          {/* --- TRIGGER TOMBOL WA: Hanya muncul jika ada kata "PERINGATAN MEDIS" --- */}
          {warningContent && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" 
               className="block w-full bg-[#25D366] text-white font-black py-4 rounded-2xl text-center text-sm shadow-md active:scale-95 transition-all mb-3">
              🚨 HUBUNGI PETUGAS (WA)
            </a>
          )}

          <button onClick={tab === "KESEHATAN" ? submitHealth : handleSaveRepro} 
                  className={`w-full font-bold py-4 rounded-2xl text-sm transition-all ${warningContent ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white shadow-lg"}`}>
            Simpan {tab === "KESEHATAN" ? "Laporan" : "Aksi Repro"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function AssetsView({ highlightedId, setHighlightedId }) {
  const dbCattle = useSelector(state => state.cattle.list);
  const dispatch = useDispatch();
  
  const [addOpen, setAddOpen] = useState(false); 
  const [editItem, setEditItem] = useState(null); 
  const [actionItem, setActionItem] = useState(null); 
  const [detailItem, setDetailItem] = useState(null);
  
  // Perbaikan: State untuk konfirmasi hapus yang sebelumnya terlewat
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");

  const safeDb = Array.isArray(dbCattle) ? dbCattle : [];
  const filteredCattle = safeDb.filter(item => {
    const searchMatch = item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const genderMatch = genderFilter === "ALL" || item.gender === genderFilter;
    return searchMatch && genderMatch;
  });

  return (
    <div className="pb-28 fade-in bg-slate-50">
      <div className="sticky z-30 bg-slate-50/90 backdrop-blur-md px-5 py-4 border-b border-slate-200">
         <div className="flex justify-between items-center">
          <div><h2 className="font-black text-xl text-slate-900">Database Aset</h2></div>
          <div className="flex gap-2">
            <button onClick={() => handleExportCSV(safeDb)} className="bg-blue-50 text-blue-600 p-2 rounded-xl">⬇️</button>
            <button onClick={() => { setEditItem(null); setAddOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ Ternak Baru</button>
          </div>
         </div>
         <div className="mt-4"><input type="text" placeholder="Cari Kode Sapi..." className="w-full border rounded-xl px-4 py-3 text-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      </div>
      <div className="p-5 space-y-4">
        {filteredCattle.map(item => <AssetRecordCard key={item.id} item={item} onEdit={(i) => {setEditItem(i); setAddOpen(true);}} onOpenAction={setActionItem} onDelete={(id) => setConfirmDeleteId(id)} onOpenDetail={setDetailItem} highlightedId={highlightedId} setHighlightedId={setHighlightedId} />)}
      </div>
      <AddModal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null); }} onSave={(d) => dispatch(addOrUpdateCattle({ data: d, editId: editItem?.id }))} editItem={editItem} />
      <ActionModal 
        open={!!actionItem} 
        item={actionItem} 
        onClose={() => setActionItem(null)} 
        onSaveRepro={(res, pregMonth, d, isUSG) => {
          let calculatedConception = todayStr();
          if (res === "POSITIVE") {
            if (pregMonth) { 
              const dt = new Date(d); dt.setMonth(dt.getMonth() - Number(pregMonth)); calculatedConception = dt.toISOString().split("T")[0]; 
            } else { 
              const sortedIB = [...(actionItem.ibLog || [])].sort((a, b) => new Date(a) - new Date(b)); calculatedConception = sortedIB.length > 0 ? sortedIB[sortedIB.length - 1] : todayStr(); 
            }
          }
          dispatch(saveReproLog({ itemId: actionItem.id, res, d, calculatedConception }));
        }} 
        onSaveHealth={(d, gejalaKeluhan) => {
          dispatch(saveHealthReport({ itemId: actionItem.id, tanggalLaporan: d, gejalaKeluhan }));
        }} 
      />
      <ConfirmDeleteModal open={!!confirmDeleteId} cattleId={confirmDeleteId} onClose={() => setConfirmDeleteId(null)} onConfirm={(id) => dispatch(deleteCattle(id))} />
      <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onDeleteLog={(id, type, idx) => { dispatch(deleteCattleLog({itemId: id, logType: type, index: idx})); setDetailItem(null); }} />
    </div>
  );
}