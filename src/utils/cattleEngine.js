import { daysDiff, fmtDate } from './helpers';

export function analyzeCattle(item) {
  if (!item) return { color: "slate", statusLabel: "ERROR", advice: "Data tidak valid", isUrgent: false, adviceColor: "text-slate-600 bg-slate-50" };

  try {
    const today = new Date();
    let res = { color: "slate", statusLabel: "", advice: "", isUrgent: false, adviceColor: "text-slate-600 bg-slate-50" };

    const umurHari = item.birthDate ? daysDiff(item.birthDate) : 0;
    const isJantan = item.gender === "JANTAN";

    // --- 1. LOGIKA KESEHATAN (SEMUA SAKIT = PERINGATAN MEDIS) ---
    const activeIllness = (item.healthLog || []).find(h => h.status === "SAKIT");
    if (activeIllness) {
       res.isUrgent = true;
       const isBelumDiperiksa = activeIllness.treatment?.includes("Menunggu pemeriksaan") || !activeIllness.rawMedis?.diagnosa;
       res.statusLabel = isBelumDiperiksa ? "BUTUH PEMERIKSAAN" : "DALAM PERAWATAN";
       res.color = isBelumDiperiksa ? "orange" : "rose";
       
       let cleanKondisi = (activeIllness.kondisi || "").replace(/\[.*?\]\s*/, '').trim(); 
       
       // Output suara tunggal: PERINGATAN MEDIS
       res.advice = `⚠️ PERINGATAN MEDIS: Ternak sakit (${cleanKondisi}). Segera panggil petugas untuk pemeriksaan.`;
       res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm";
       return res; 
    }

    // --- 2. LOGIKA JANTAN ---
    if (isJantan) {
        if (umurHari < 180) { res.statusLabel = "PEDET JANTAN"; res.color = "violet"; res.advice = "Fokus susu & pakan pemula."; } 
        else if (umurHari < 730) { res.statusLabel = "JANTAN BAKALAN"; res.color = "blue"; res.advice = "Fase penggemukan (Feedlot)."; } 
        else { res.statusLabel = "PEJANTAN DEWASA"; res.color = "emerald"; res.advice = "Siap untuk dipasarkan."; }
        return res;
    }

    // --- 3. LOGIKA REPRODUKSI BETINA ---
    const daysOpen = item.calvingDate ? daysDiff(item.calvingDate) : 0;
    const logIB = [...(item.ibLog || [])].sort((a,b) => new Date(a) - new Date(b));
    const lastIB = logIB.length > 0 ? logIB[logIB.length - 1] : null;
    const prevIB = logIB.length > 1 ? logIB[logIB.length - 2] : null;
    const daysSinceLastIB = lastIB ? daysDiff(lastIB) : 0;

    let cycles = 1; 
    let diffPrevLast = 0;
    if (prevIB && lastIB) diffPrevLast = Math.floor((new Date(lastIB) - new Date(prevIB))/86400000);
    
    if (logIB.length > 1) {
      let tempLast = new Date(logIB[0]);
      for (let i = 1; i < logIB.length; i++) {
         let diff = Math.floor((new Date(logIB[i]) - tempLast) / 86400000);
         if (diff >= 15) cycles++; 
         tempLast = new Date(logIB[i]);
      }
    }

    let hasIbAfterCalving = lastIB && (!item.calvingDate || new Date(lastIB) > new Date(item.calvingDate));

    // --- FASE: DARA (CALF) ---
    if (item.phase === "CALF") {
      if (!item.calvingDate && umurHari > 1095) { 
          res.statusLabel = "KEMAJIRAN ABSOLUT"; res.color = "rose"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Dara > 3 thn belum birahi. Suspect Hipoplasia Ovarium. Panggil petugas!`; 
      } 
      else if (umurHari > 730) { 
          res.statusLabel = "DARA TERLAMBAT KAWIN"; res.color = "orange"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Umur > 2 thn belum di-IB. Potensi gangguan hormon. Panggil petugas!`; 
      } 
      else if (umurHari >= 540) { res.statusLabel = "DARA SIAP KAWIN"; res.color = "emerald"; res.advice = "Usia ideal IB (18-24 bulan). Pantau birahi."; } 
      else { res.statusLabel = "DARA PERTUMBUHAN"; res.color = "blue"; res.advice = "Masa Pra-pubertas."; }
    } 
    
    // --- FASE: KOSONG (OPEN) ---
    else if (item.phase === "OPEN") {
      if (item.calvingDate && daysOpen > 150 && !hasIbAfterCalving) { 
          res.statusLabel = "SUSPECT PYOMETRA"; res.color = "rose"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Kosong > 5 bln tanpa IB. Waspada infeksi rahim. Panggil petugas!`; 
      } 
      else if (item.calvingDate && daysOpen > 120) { 
          res.statusLabel = "KOSONG > 120 HARI"; res.color = "rose"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Sapi kosong terlalu lama (${daysOpen} hari). Panggil petugas!`; 
      } 
      else { res.statusLabel = "SIAP IB"; res.color = "amber"; res.advice = "Fase Kosong. Pantau tanda birahi."; }
    } 
    
    // --- FASE: PASCA IB (BRED) ---
    else if (item.phase === "BRED") {
      if (cycles >= 3) { 
          res.color = "rose"; res.statusLabel = "REPEAT BREEDER"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Gagal bunting dalam ${cycles} siklus IB. Panggil petugas!`; 
      } 
      else if (diffPrevLast >= 1 && diffPrevLast <= 17) { 
          res.color = "rose"; res.statusLabel = "SUSPECT SISTA"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Jarak IB terlalu dekat (${diffPrevLast} hari). Suspect Sista Ovarium. Panggil petugas!`; 
      } 
      else if (daysSinceLastIB < 60) { res.color = "slate"; res.statusLabel = "SUSPECT BUNTING"; res.advice = `H+${daysSinceLastIB} pasca IB. Dilarang rogo manual!`; } 
      else { 
          res.color = "orange"; res.statusLabel = "WAKTUNYA PKB"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: JADWAL PKB! Segera panggil petugas untuk cek kebuntingan.`; 
      }
    } 
    
    // --- FASE: BUNTING (PREGNANT) ---
    else if (item.phase === "PREGNANT") {
      if (!item.conceptionDate) { 
          res.color = "orange"; res.statusLabel = "BUNTING PASAR"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Belum ada data PKB resmi. Segera panggil petugas untuk PKB Dokter.`; 
      } 
      else {
         const hpl = new Date(item.conceptionDate); hpl.setMonth(hpl.getMonth() + 9); hpl.setDate(hpl.getDate() + 10);
         const l = Math.ceil((hpl - today) / 86400000); const pregDays = daysDiff(item.conceptionDate);
         if (pregDays >= 285) { 
             res.color = "rose"; res.statusLabel = "ANCAMAN DISTOKIA"; res.isUrgent = true; 
             res.advice = `⚠️ PERINGATAN MEDIS: KANDUNGAN TUA! Risiko sulit melahirkan. Siagakan petugas!`; 
         } 
         else if (l <= 60 && l > 21) { res.color = "amber"; res.statusLabel = "KERING KANDANG"; res.advice = `HPL: ${fmtDate(hpl.toISOString().split("T")[0])}. Segera kering kandang.`; } 
         else { res.color = "emerald"; res.statusLabel = "BUNTING AKTIF"; res.advice = `HPL: ${fmtDate(hpl.toISOString().split("T")[0])}. Jaga pakan.`; }
      }
    } 
    
    // --- FASE: PASCA MELAHIRKAN (POSTPARTUM) ---
    else if (item.phase === "POSTPARTUM") {
      const d = daysDiff(item.calvingDate);
      if (d <= 14) { 
          res.statusLabel = "MASA NIFAS"; res.color = "rose"; res.isUrgent = true; 
          res.advice = `⚠️ PERINGATAN MEDIS: Waspada Lokia busuk atau sisa ari-ari. Panggil petugas jika sakit!`; 
      } 
      else if (d <= 45) { res.statusLabel = "INVOLUSI UTERUS"; res.color = "blue"; res.advice = `Rahim sedang pemulihan. DILARANG di-IB.`; } 
      else { res.statusLabel = "BREEDING WINDOW"; res.color = "emerald"; res.advice = `Sapi siap di-IB kembali.`; }
    }

    // FINAL CHECK: Pastikan warna kotak saran merah jika ada "PERINGATAN MEDIS"
    if (res.advice.includes("PERINGATAN MEDIS")) {
        res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm";
    }

    return res;
  } catch (error) { return { color: "rose", statusLabel: "DATA ERROR", advice: "Format data tidak valid.", isUrgent: true, adviceColor: "text-rose-900 bg-rose-50" }; }
}

export function buildHistory(item) { 
  let history = []; 
  try {
    (item.ibLog || []).forEach((d, i) => history.push({ type: 'ibLog', originalIndex: i, date: d, label: `IB ke-${i + 1}`, desc: "Inseminasi Buatan", colorDot: "bg-blue-500", rawDate: new Date(d) })); 
    (item.pkbLog || []).forEach((log, i) => history.push({ type: 'pkbLog', originalIndex: i, date: log.date, label: `PKB: ${log.result === "POSITIVE" ? "Positif (+)" : "Negatif (-)"}`, desc: log.result === "POSITIVE" ? "Disahkan Bunting" : "Tidak Bunting", colorDot: log.result === "POSITIVE" ? "bg-emerald-500" : "bg-rose-500", rawDate: new Date(log.date) })); 
    (item.calvingLog || []).forEach((d, i) => history.push({ type: 'calvingLog', originalIndex: i, date: d, label: "Partus", desc: "Kelahiran Pedet", colorDot: "bg-violet-500", rawDate: new Date(d) }));
    (item.healthLog || []).forEach((l, i) => { const isSembuh = l.status === "SEMBUH"; let labelTxt = l.treatment?.includes("Menunggu pemeriksaan") ? `Gejala: ${l.kondisi}` : l.kondisi; history.push({ type: 'healthLog', originalIndex: i, date: l.date, label: isSembuh ? `✅ Sembuh: ${labelTxt}` : labelTxt, desc: l.treatment, colorDot: isSembuh ? "bg-emerald-500" : "bg-rose-500", rawDate: new Date(l.date), status: l.status || "SAKIT" }); });
    (item.healthReports || []).forEach((r, i) => history.push({ type: 'healthReport', originalIndex: i, date: r.tanggalLaporan, label: "📋 Laporan Kesehatan", desc: r.gejalaKeluhan, colorDot: "bg-amber-500", rawDate: new Date(r.tanggalLaporan) }));
    if (item.birthDate) history.push({ type: 'birthDate', originalIndex: 0, date: item.birthDate, label: "Lahir / Masuk", desc: item.origin === "KANDANG" ? "Lahir di kandang" : "Beli", colorDot: "bg-slate-300", rawDate: new Date(item.birthDate) }); 
    return history.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0)); 
  } catch(e) { return []; }
}
