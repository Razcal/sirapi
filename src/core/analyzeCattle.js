// Modul bersama (dipakai frontend React maupun serverless function di /api)
// untuk logika deteksi status reproduksi/kesehatan sapi. Dipisah dari App.jsx
// supaya kriteria "sapi mendesak" untuk notifikasi selalu sinkron dengan yang
// ditampilkan di Dashboard/kartu saran, tidak ada duplikasi logika yang bisa drift.

export const daysDiff = (a, b = new Date()) => Math.floor((new Date(b) - new Date(a)) / 86400000);

export const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return "-"; }
};

// Tanggal hari ini menurut zona waktu LOKAL (sama seperti todayStr() di
// App.jsx) — bukan new Date().toISOString() yang UTC, supaya keduanya
// selalu identik walau dipanggil dekat pergantian hari WIB.
const todayStrLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ibLog tidak pernah dikosongkan saat sapi melahirkan (lihat handleSaveRepro
// di App.jsx, res==="CALVED" cuma reset conceptionDate, bukan ibLog) — jadi
// ini riwayat IB SEUMUR HIDUP sapi, bisa mencakup beberapa periode laktasi
// sekaligus. Fungsi ini menyaring ke IB yang relevan untuk siklus BERJALAN
// saja (setelah tanggal melahirkan terakhir), dipakai di sini maupun di
// App.jsx (form pencatatan Reproduksi) — supaya kriterianya konsisten di
// kedua tempat, tidak ada yang lupa disaring lalu salah menyimpan
// conceptionDate dari kehamilan yang sudah lama selesai.
export const ibSinceCalving = (item) => {
  return [...(item?.ibLog || [])]
    .filter(entry => {
      const d = typeof entry === 'object' ? entry.date : entry;
      return !item?.calvingDate || new Date(d) > new Date(item.calvingDate);
    })
    .sort((a, b) => {
      const da = typeof a === 'object' ? a.date : a;
      const db = typeof b === 'object' ? b.date : b;
      return new Date(da) - new Date(db);
    });
};

// Mengubah data sapi sesuai hasil pencatatan reproduksi (Inseminasi Buatan,
// hasil pemeriksaan kebuntingan, melahirkan, keguguran, terapi). Diekstrak
// dari App.jsx (dulu inline di handleSaveRepro) supaya App.jsx dan
// PetugasApp.jsx (petugas mencatat langsung untuk sapi peternak lain) pakai
// persis logika yang sama — tidak ada yang bisa drift/beda perilaku.
// Return objek sapi baru (tidak memutasi `item`); pemanggil yang tanggung
// jawab menyimpan ke server lewat cattleService.updateCattle().
export function applyReproAction(item, res, pregMonth, d) {
  let current = { ...item };

  if (res === "NEGATIVE") {
    current.phase = "OPEN"; current.status_reproduksi = "OPEN";
    current.pkbLog = [...(current.pkbLog || []), { date: d, result: "NEGATIVE" }];
  }
  else if (res === "IB") {
    current.phase = "BRED"; current.status_reproduksi = "BRED";
    current.ibLog = [...(current.ibLog || []), { date: d, isSuspect: false }];
  }
  else if (res === "POSITIVE") {
    let calculatedConception = todayStrLocal();

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

  return current;
}

// Opsi tindakan reproduksi yang relevan untuk fase sapi saat ini — dipakai
// bersama oleh App.jsx (peternak) dan PetugasApp.jsx (petugas) supaya
// aturan boleh/tidak-boleh-nya selalu identik di kedua tempat, tidak ada
// yang lupa disinkronkan saat salah satu diubah.
//
// IB SENGAJA TIDAK PERNAH diblokir menurut jarak hari — sempat dicoba
// (mewajibkan PKB dulu begitu lewat 24 hari sejak IB terakhir), tapi
// dibatalkan: birahi itu mendesak waktu (aktif cuma ~12-18 jam), jadi
// memblokir opsi IB demi menunggu PKB berisiko peternak kehilangan
// momen kawin itu sama sekali — kerugian nyata (tunggu ~21 hari lagi,
// biaya semen beku terbuang) yang lebih besar dari manfaat blokirnya.
// Sebagai gantinya, pola "IB lagi tanpa PKB di antaranya" tetap boleh
// dicatat, lalu otomatis ditandai lewat statusLabel "Gangguan
// Reproduksi: Diduga Keguguran Dini Tak Terpantau" (lihat suspectLossGap
// di analyzeCattle()) begitu tersimpan — supaya kelihatan di Pemantauan
// Sapi & Laporan admin untuk ditindaklanjuti petugas, tanpa menghalangi
// tindakan yang justru mendesak dilakukan saat itu juga.
export function getOpsiReproduksi(item) {
  const phase = String(item?.status_reproduksi || item?.phase || "").toUpperCase();
  const punyaIB = ibSinceCalving(item).length > 0;

  const ALL = [
    { v: "IB",       t: "Inseminasi buatan (IB)",             show: ["CALF", "OPEN", "BRED", "POSTPARTUM"] },
    { v: "POSITIVE", t: "Hasil periksa: bunting (+)",         show: ["BRED", "OPEN", "PREGNANT"], perlu: () => punyaIB || phase === "PREGNANT" },
    { v: "NEGATIVE", t: "Hasil periksa: tidak bunting (−)",   show: ["BRED", "PREGNANT"] },
    { v: "CALVED",   t: "Melahirkan",                          show: ["PREGNANT"] },
    { v: "ABORTUS",  t: "Keguguran",                           show: ["BRED", "PREGNANT"] },
    { v: "TERAPI",   t: "Sudah mendapat terapi medis",         show: ["OPEN", "BRED", "POSTPARTUM", "ABORTUS_PENDING"] },
  ];

  return phase === "ABORTUS_PENDING"
    ? ALL.filter((o) => o.v === "TERAPI")
    : ALL.filter((o) => o.show.includes(phase) && (!o.perlu || o.perlu()));
}

// Sama seperti applyReproAction tapi untuk catatan kesehatan (lapor gejala /
// dinyatakan sembuh). Diekstrak dari handleSaveHealth di App.jsx.
export function applyHealthAction(item, { type, date, gejala }) {
  let current = { ...item };

  if (type === 'LAPOR') {
    current.healthLog = [...(current.healthLog || []), { date, gejala, status: "MENUNGGU_DOKTER" }];
  } else if (type === 'SEMBUH') {
    const activeIdx = (current.healthLog || []).findIndex(h => h.status !== "SEMBUH");
    if (activeIdx !== -1) {
      const updatedLog = [...(current.healthLog || [])];
      updatedLog[activeIdx] = { ...updatedLog[activeIdx], status: "SEMBUH", tanggalSembuh: date };
      current.healthLog = updatedLog;
    }
  }

  return current;
}

export function analyzeCattle(item) {
  if (!item) return { color: "slate", statusLabel: "DATA TIDAK VALID", advice: "Data tidak valid", isUrgent: false, adviceColor: "text-slate-600 bg-slate-50" };

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

    const logIBDates = ibSinceCalving(item).map(entry => (typeof entry === 'object' ? entry.date : entry));

    const lastIB = logIBDates.length > 0 ? logIBDates[logIBDates.length - 1] : null;
    const daysSinceLastIB = lastIB ? daysDiff(lastIB) : 0;
    const hasIbAfterCalving = logIBDates.length > 0;

    let cycles = 1;
    let suspectSistaGap = 0;
    // Jarak antar IB yang jauh melebihi siklus birahi normal (>=35 hari —
    // aman di atas 24 hari maksimum siklus + jeda pengamatan), TANPA ada
    // PKB tercatat di antara keduanya. Beda dari Repeat Breeder biasa: pada
    // Repeat Breeder jaraknya justru RUTIN di kisaran normal (sapi memang
    // gagal bunting tiap siklus). Jarak yang jauh & tak terpantau begini
    // lebih mengarah ke sapi yang sempat dianggap bunting (tidak birahi
    // sekian lama) lalu mengalami kematian embrio/keguguran dini yang
    // tidak disadari peternak — bukan cuma "telat kawin lagi".
    let suspectLossGap = 0;
    const pkbDates = (item.pkbLog || []).map(e => (typeof e === 'object' ? e.date : e)).filter(Boolean);

    if (logIBDates.length > 1) {
      let tempLast = new Date(logIBDates[0]);
      for (let i = 1; i < logIBDates.length; i++) {
        const iniIB = new Date(logIBDates[i]);
        const diff = Math.floor((iniIB - tempLast) / 86400000);
        if (diff > 0 && diff < 18 && suspectSistaGap === 0) suspectSistaGap = diff;
        if (diff >= 18) cycles++;
        const pernahDiperiksa = pkbDates.some(pd => new Date(pd) > tempLast && new Date(pd) <= iniIB);
        if (diff >= 35 && !pernahDiperiksa && suspectLossGap === 0) suspectLossGap = diff;
        tempLast = iniIB;
      }
    }

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
      else if (umurHari >= 365) { res.statusLabel = "DARA BELUM SAATNYA IB"; res.color = "violet"; res.advice = `Usia ${Math.floor(umurHari/30)} bulan. Pubertas pada sapi betina umumnya sudah terjadi sejak usia 6-12 bulan, tapi IB pertama tetap disarankan pada usia 18-24 bulan agar pertumbuhan tubuh optimal — bukan berarti belum birahi, hanya belum waktunya dikawinkan. Fokuskan pada pencapaian bobot badan ideal.`; }
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
      if (cycles >= 4) { res.color = "rose"; res.statusLabel = "Gangguan Reproduksi: Gagal Bunting Berulang"; res.isUrgent = true; res.needsVet = true; res.advice = `Sapi telah menjalani ${cycles - 1} kali IB (jarak antar IB minimal 18 hari, bukan birahi susulan di siklus yang sama) namun gagal bunting, dan kini memasuki IB ke-${cycles}. Status sementara: Repeat Breeder. Kemungkinan penyebab (belum pasti): gangguan ovarium, endometritis subklinis, ketidaktepatan waktu IB, atau kualitas semen/teknik IB — penyebab sebenarnya hanya bisa dipastikan lewat pemeriksaan. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan mendalam sebelum IB berikutnya.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (suspectSistaGap > 0) { res.color = "rose"; res.statusLabel = "Gangguan Reproduksi: Birahi Tidak Normal"; res.isUrgent = true; res.needsVet = true; res.advice = `Ditemukan jarak antar IB hanya ${suspectSistaGap} hari, padahal siklus birahi normal sapi adalah 18-24 hari. Pola birahi yang terlalu sering dan pendek seperti ini diduga mengarah pada Sista Folikuler (Nymphomania) — namun ini baru indikasi awal, bukan diagnosa pasti. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan per-rektal/USG ovarium secara mendalam.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (suspectLossGap > 0) { res.color = "rose"; res.statusLabel = "Gangguan Reproduksi: Diduga Keguguran Dini Tak Terpantau"; res.isUrgent = true; res.needsVet = true; res.advice = `Jarak ke IB sebelumnya ${suspectLossGap} hari — jauh melebihi siklus birahi normal (18-24 hari) — dan tidak ada pemeriksaan kebuntingan (PKB) yang tercatat di antara keduanya. Ini baru indikasi awal (suspect), diduga sapi sempat bunting lalu mengalami kematian embrio dini/keguguran dini yang tidak menimbulkan gejala terlihat, sehingga birahi baru muncul kembali belakangan tanpa sempat dipastikan lewat PKB — bukan diagnosa pasti. Wajib laporkan ke petugas/dokter hewan untuk pemeriksaan lebih lanjut. Agar kejadian serupa terpantau lebih awal, usahakan PKB tetap dilakukan pada hari ke-60 pasca IB berikutnya.`; res.adviceColor = "text-rose-800 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
      else if (daysSinceLastIB < 60) {
        const sisaHariPkb = 60 - daysSinceLastIB;
        res.color = "slate"; res.statusLabel = "Diduga Bunting";
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
         // "l" itu hari TERSISA menuju HPL, bukan margin ketidakpastian —
         // sebelumnya ditulis "(±113 hari)" yang menyesatkan (seolah
         // perkiraan tanggalnya bisa meleset 113 hari). Diperjelas jadi
         // hitung mundur biasa, dan tetap masuk akal kalau sudah lewat HPL.
         const infoHari = l >= 0 ? `${l} hari lagi` : `sudah lewat ${Math.abs(l)} hari dari perkiraan`;
         let txtHPL = `Perkiraan tanggal lahir: ${fmtDate(hpl.toISOString().split("T")[0])} (${infoHari}).`;

         let nutrisi = "";
         if (pregDays <= 94) nutrisi = "Nutrisi Trimester 1: Fokus pemberian hijauan berkualitas tinggi dan mineral mix. Jaga kondisi tubuh ideal, hindari pakan berjamur.";
         else if (pregDays <= 189) nutrisi = "Nutrisi Trimester 2: Tambahkan konsentrat berenergi tinggi. Suplementasi Kalsium (Ca) dan Fosfor (P) penting untuk pertumbuhan tulang janin.";
         else nutrisi = "Nutrisi Trimester 3: Fase krusial pertumbuhan janin. Berikan pakan penguat dan lakukan kering kandang bila sapi masih diperah.";

         // Sebelumnya "ANCAMAN DISTOKIA" baru muncul di hari ke-285 — itu
         // persis di sekitar HPL (285 ≈ 9bln10hr), jadi peternak baru
         // diperingatkan pas/lewat perkiraan lahir, bukan DISIAPKAN
         // sebelumnya. Sekarang dipecah dua: "PERSIAPAN KELAHIRAN" muncul
         // proaktif dalam 3 minggu menjelang HPL (l<=21, termasuk yang
         // sudah sedikit lewat HPL tapi belum lama), dan "ANCAMAN DISTOKIA"
         // digeser ke kebuntingan yang benar-benar lewat rentang normal
         // (>295 hari) — indikasi kuat perlu bantuan medis segera.
         if (pregDays >= 295) { res.color = "rose"; res.statusLabel = "ANCAMAN DISTOKIA"; res.isUrgent = true; res.needsVet = true; res.advice = `Usia kebuntingan hari ke-${pregDays}, sudah melewati rentang normal kebuntingan sapi (~279-292 hari). Segera hubungi petugas/dokter hewan — kebuntingan yang terlalu lama dari perkiraan berisiko kesulitan melahirkan (distokia) atau kelainan lain yang perlu diperiksa. ${nutrisi}`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-bold shadow-sm"; }
         else if (l <= 21) { res.color = "orange"; res.statusLabel = "PERSIAPAN KELAHIRAN"; res.isUrgent = true; res.advice = `${txtHPL} Sudah masuk masa siap melahirkan. Siapkan kandang bersalin yang bersih dan kering, pantau tanda-tanda melahirkan (gelisah, ambing membesar, keluar lendir/air ketuban) minimal 2x sehari, dan pastikan kontak petugas/dokter hewan siap dihubungi sewaktu-waktu. ${nutrisi}`; res.adviceColor = "text-orange-900 bg-orange-50 border border-orange-200 font-bold shadow-sm"; }
         else if (l <= 60) { res.color = "amber"; res.statusLabel = "KERING KANDANG"; res.isUrgent = true; res.advice = `${txtHPL} Hentikan pemerahan susu segera (kering kandang) agar kelenjar susu pulih sebelum melahirkan. ${nutrisi}`; res.adviceColor = "text-amber-900 bg-amber-50 border border-amber-200 font-semibold shadow-sm"; }
         else { res.color = "emerald"; res.statusLabel = "BUNTING AKTIF"; res.advice = `${txtHPL} ${nutrisi}`; }
      }
    }
    else if (phase === "POSTPARTUM") {
      const d = daysDiff(item.calvingDate);
      if (d <= 21) { res.statusLabel = "PUERPERIUM (NIFAS)"; res.color = "rose"; res.isUrgent = true; res.advice = `Hari ke-${d} pasca melahirkan. Masa nifas normal berlangsung 2-3 minggu. Amati tanda bahaya berikut dan segera laporkan ke petugas/dokter hewan bila ditemukan — bukan untuk didiagnosa sendiri: (1) Lokia berbau busuk (kemungkinan Metritis/Endometritis); (2) Plasenta belum lepas lebih dari 24 jam (kemungkinan Retensio Plasenta); (3) Demam tinggi atau nafsu makan menurun. Diagnosa pasti memerlukan pemeriksaan oleh petugas.`; res.adviceColor = "text-rose-900 bg-rose-50 border border-rose-200 font-semibold shadow-sm"; }
      else if (d <= 45) { res.statusLabel = "Pemulihan Rahim Pasca Melahirkan"; res.color = "blue"; res.advice = `Hari ke-${d} pasca melahirkan. Rahim sedang dalam proses involusi (pemulihan), berlangsung sekitar 4-6 minggu. IB tidak boleh dilakukan pada periode ini. Amati tanda birahi pertama — sapi normal kembali birahi 3-6 minggu setelah melahirkan.`; }
      else { res.statusLabel = "Siap Dikawinkan Kembali"; res.color = "emerald"; res.advice = `Hari ke-${d} pasca melahirkan. Sapi telah siap menerima IB kembali. Lakukan IB segera saat tanda birahi muncul (3A: Abang, Abuh, Anget). Jangan menunda agar calving interval tetap ideal (12-13 bulan).`; }
    }
    return res;
  } catch {
    return { color: "rose", statusLabel: "DATA TIDAK VALID", advice: "Format tanggal atau riwayat sapi ini tidak valid.", isUrgent: true, adviceColor: "text-rose-900 bg-rose-50" };
  }
}
