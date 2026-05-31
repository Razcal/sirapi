import React, { useState, useEffect } from "react";
import { fmtDate } from "./core/helpers";

export const FF = ({ label, children }) => (<div className="mb-4"><p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{label}</p>{children}</div>);

export function TimelineItem({ log, isLast }) {
  return (
    <div className="timeline-item flex gap-4 relative pb-5">
      {!isLast && <div className="timeline-line"></div>}
      <div className="relative z-10 mt-1"><div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${log.colorDot || "bg-slate-300"}`}></div></div>
      <div className="flex-1">
        <div className="flex justify-between items-start"><p className="text-xs font-bold text-slate-800">{log.label}</p><p className="text-[10px] font-medium text-slate-400">{fmtDate(log.date)}</p></div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed whitespace-pre-wrap">{log.desc}</p>
      </div>
    </div>
  );
}

export function DialogSystem() {
  const [alertConfig, setAlertConfig] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    window.__showAlertDialog = (message, title) => setAlertConfig({ message, title });
    window.__showConfirmDialog = (message, onConfirm, title) => setConfirmConfig({ message, onConfirm, title });
  }, []);

  if (!alertConfig && !confirmConfig) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      {alertConfig ? (
        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 pop-in shadow-2xl text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertConfig.title.toLowerCase().includes('sukses') ? 'bg-emerald-50 text-emerald-500' : alertConfig.title.toLowerCase().includes('peringatan') || alertConfig.title.toLowerCase().includes('gagal') ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}><span className="text-3xl">{alertConfig.title.toLowerCase().includes('sukses') ? '✅' : alertConfig.title.toLowerCase().includes('peringatan') || alertConfig.title.toLowerCase().includes('gagal') ? '⚠️' : 'ℹ️'}</span></div>
          <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">{alertConfig.title}</h3>
          <p className="text-sm text-slate-600 font-medium mb-8 whitespace-pre-wrap leading-relaxed">{alertConfig.message}</p>
          <button onClick={() => setAlertConfig(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg">Tutup</button>
        </div>
      ) : confirmConfig ? (
        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 pop-in shadow-2xl text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">❓</span></div>
          <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">{confirmConfig.title}</h3>
          <p className="text-sm text-slate-600 font-medium mb-8 whitespace-pre-wrap leading-relaxed">{confirmConfig.message}</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmConfig(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl transition-all hover:bg-slate-200">Batal</button>
            <button onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-rose-500/30">Ya, Lanjutkan</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}