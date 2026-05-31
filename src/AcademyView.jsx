import React, { useState } from "react";

export function AcademyView() {
  const [openTermId, setOpenTermId] = useState(null);
  const dayOrder = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  const todayIndex = dayOrder.indexOf(todayName);

  const weeklySchedule = [
    { day: "Selasa", time: "19:30 WIB", title: "Optimalisasi Siklus Birahi & IB", level: "Manajemen Reproduksi", instructor: "Drh. Budi Santoso", levelColor: "bg-blue-100 text-blue-800", zoomLink: "https://zoom.us/j/1234567890" },
    { day: "Rabu", time: "19:30 WIB", title: "Formulasi Pakan Efisien", level: "Manajemen Pakan", instructor: "Dr. A. Nurrakhman", levelColor: "bg-amber-100 text-amber-800", zoomLink: "https://zoom.us/j/1234567890" },
    { day: "Kamis", time: "19:30 WIB", title: "Pencegahan Penyakit Metabolik", level: "Manajemen Kesehatan", instructor: "Prof. Dr. drh. Candra", levelColor: "bg-emerald-100 text-emerald-800", zoomLink: "https://zoom.us/j/1234567890" },
  ];

  const sortedSchedule = [...weeklySchedule].sort((a, b) => {
    const isPastA = dayOrder.indexOf(a.day) < todayIndex;
    const isPastB = dayOrder.indexOf(b.day) < todayIndex;
    const isTodayA = dayOrder.indexOf(a.day) === todayIndex;
    const isTodayB = dayOrder.indexOf(b.day) === todayIndex;
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    if (isPastA && !isPastB) return 1;
    if (!isPastA && isPastB) return -1;
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
  });

  const medicalTerms = [
      { id: 1, name: "Retensio Secundinarum", alias: "KEGAGALAN PELEPASAN PLASENTA (ARI-ARI)", gejala: "Plasenta (selaput pembungkus janin) masih tertahan di dalam rahim atau menggantung di vulva lebih dari 12 jam pasca persalinan.", bahaya: "Memicu infeksi rahim parah (Endometritis), penyebaran bakteri ke dalam sirkulasi darah (Septikemia), penurunan fertilitas, hingga risiko kematian jika ditarik paksa.", solusi: "Sangat dilarang ditarik secara paksa. Segera hubungi Dokter Hewan untuk prosedur pelepasan manual yang aman dan pemberian terapi antibiotik." },
      { id: 2, name: "Endometritis & Pyometra", alias: "RADANG DAN AKUMULASI NANAH PADA UTERUS", gejala: "Terdapat leleran abnormal (keruh, purulen/bernanah, berdarah, atau berbau busuk) dari vulva. Pada kasus Pyometra, serviks tertutup sehingga nanah terakumulasi di dalam rahim.", bahaya: "Menciptakan lingkungan toksik bagi spermatozoa dan embrio. Menyebabkan kegagalan kebuntingan secara berulang dan kerusakan jaringan dinding rahim.", solusi: "Memerlukan penanganan medis spesifik berupa irigasi uterus (Uterine Spooling) dengan antiseptik ringan dan pemberian antibiotik intra-uterin oleh tenaga medis." },
      { id: 3, name: "Hipofungsi Ovarium", alias: "PENURUNAN AKTIVITAS INDUNG TELUR (ANESTRUS)", gejala: "Sapi betina dewasa atau induk pascapartus tidak menunjukkan tanda-tanda siklus estrus (birahi) dalam jangka waktu yang melebihi batas normal.", bahaya: "Mengakibatkan kerugian ekonomi yang signifikan akibat perpanjangan masa kosong (Days Open). Sapi mengonsumsi pakan tanpa memberikan hasil produksi reproduksi.", solusi: "Evaluasi dan perbaiki manajemen nutrisi (program Flushing). Konsultasikan dengan tenaga medis veteriner untuk stimulasi ovarium atau penyuntikan terapi hormonal." },
      { id: 4, name: "Corpus Luteum Persisten (CLP)", alias: "BERTAHANNYA KORPUS LUTEUM PADA FASE KOSONG", gejala: "Sapi mengalami anestrus (tidak birahi) berkepanjangan. Pada pemeriksaan palpasi rektal, uterus tidak berisi janin, namun terdapat struktur Korpus Luteum pada ovarium.", bahaya: "Korpus Luteum terus memproduksi hormon progesteron, mengondisikan sistem endokrin sapi seolah-olah sedang bunting (kebuntingan semu), padahal uterus dalam keadaan kosong.", solusi: "Pemeriksaan medis wajib dilakukan untuk memastikan diagnosis, dilanjutkan dengan injeksi hormon Prostaglandin (PGF2α) oleh Dokter Hewan untuk melisiskan struktur tersebut." },
      { id: 5, name: "Sista Ovarium (Cystic Ovary)", alias: "KISTA FOLIKEL ATAU LUTEAL PADA OVARIUM", gejala: "Sapi dapat mengalami birahi terus-menerus dan agresif (Nymphomania) pada kasus kista folikuler, atau sebaliknya, mengalami anestrus total pada kasus kista luteal.", bahaya: "Terjadi kegagalan pelepasan sel telur (ovulasi) akibat terbentuknya struktur patologis berisi cairan di ovarium. Menghentikan siklus reproduksi normal ternak.", solusi: "Diagnosis definitif melalui palpasi rektal atau ultrasonografi (USG) oleh Dokter Hewan, diikuti dengan terapi hormon pelepas gonadotropin (GnRH / hCG)." },
      { id: 6, name: "Repeat Breeder", alias: "KEGAGALAN KEBUNTINGAN BERTURUT-TURUT", gejala: "Sapi betina memiliki siklus estrus yang normal (18-21 hari) dan telah diinseminasi lebih dari tiga siklus berturut-turut, namun senantiasa gagal mencapai kebuntingan.", bahaya: "Memperpanjang interval kelahiran (Calving Interval), meningkatkan biaya operasional IB, serta menurunkan efisiensi reproduksi peternakan secara drastis.", solusi: "Hentikan Inseminasi Buatan sementara. Minta evaluasi komprehensif dari Dokter Hewan untuk mendeteksi kemungkinan infeksi sub-klinis atau abnormalitas saluran reproduksi." }
  ];

  return (
    <div className="p-5 pb-28 fade-in bg-slate-50 min-h-screen">
      <div className="mb-6 mt-2"><h2 className="text-2xl font-black text-slate-900 tracking-tight">Akademi</h2><p className="text-xs font-semibold text-slate-500 mt-0.5">#PeternakWajibPintar</p></div>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4 ml-1"><span className="text-2xl">🗓️</span><div><h2 className="font-black text-slate-900 text-lg tracking-tight">Jadwal Webinar Mingguan</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Live via Zoom Meeting</p></div></div>
        <div className="space-y-3">
          {sortedSchedule.map((session, index) => {
            const dayIndex = dayOrder.indexOf(session.day);
            const isToday = dayIndex === todayIndex;
            const isPast = dayIndex < todayIndex;
            return (
              <div key={index} className={`border rounded-[20px] p-4 shadow-sm flex items-center gap-4 transition-all ${isToday ? 'bg-white border-emerald-400 ring-4 ring-emerald-100' : isPast ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-white border-slate-100'}`}>
                <div className="text-center w-16 flex-shrink-0"><p className={`font-black text-lg leading-none ${isToday ? 'text-emerald-600' : isPast ? 'text-slate-500' : 'text-slate-800'}`}>{session.day}</p><p className={`text-xs font-bold mt-1 ${isToday || !isPast ? 'text-emerald-600' : 'text-slate-400'}`}>{session.time}</p></div>
                <div className="w-px bg-slate-200 self-stretch mx-2"></div>
                <div className="flex-1">
                  {isToday && <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-widest inline-block mb-2 animate-pulse">LIVE HARI INI</span>}
                  <span className={`${isPast ? 'bg-slate-200 text-slate-600' : session.levelColor} text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-widest inline-block mb-1.5`}>{session.level}</span>
                  <h4 className={`font-extrabold text-sm leading-snug ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>{session.title}</h4>
                  <p className={`text-[11px] font-semibold mt-1 ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>oleh {session.instructor}</p>
                </div>
                {isPast ? <button disabled className="font-bold text-xs px-4 py-3 rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed">Selesai</button> : <a href={session.zoomLink} target="_blank" rel="noopener noreferrer" className={`font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-md ${isToday ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'}`}>Join Zoom</a>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-10 mb-4">
        <div className="flex items-center gap-2.5 mb-5 ml-1"><span className="text-2xl">📖</span><div><h2 className="font-black text-slate-900 text-lg tracking-tight">Kamus Medis Repro</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Kenali Gejala & Bahayanya</p></div></div>
        <div className="space-y-3">
          {medicalTerms.map(term => (
            <div key={term.id} className="bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm transition-all">
              <button onClick={() => setOpenTermId(openTermId === term.id ? null : term.id)} className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors">
                <div><h4 className="font-black text-slate-800 text-sm">{term.name}</h4><p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">{term.alias}</p></div>
                <div className={`transform transition-transform ${openTermId === term.id ? 'rotate-180' : ''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-300"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
              </button>
              {openTermId === term.id && (
                <div className="px-5 pb-5 pt-2 bg-slate-50 border-t border-slate-100 fade-in text-xs leading-relaxed">
                  <div className="mt-3"><span className="font-black text-slate-800">👀 Gejala Visual:</span><p className="text-slate-600 mt-1 font-medium">{term.gejala}</p></div>
                  <div className="mt-4"><span className="font-black text-rose-700">⚠️ Dampak Fatal:</span><p className="text-slate-600 mt-1 font-medium">{term.bahaya}</p></div>
                  <div className="mt-5 p-3.5 bg-emerald-100/50 border border-emerald-200 rounded-xl"><span className="font-black text-emerald-800 text-[11px] uppercase tracking-widest">💡 Tindakan Wajib:</span><p className="text-emerald-900 font-bold mt-1.5">{term.solusi}</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}