/* ============================================================================
   MESIN ANALITIK SIRAPI

   Mengubah catatan mentah tiap ekor (ibLog, pkbLog, calvingLog, healthLog, …)
   menjadi angka yang bisa dibaca peternak dan dinas: berapa kejadian, seberapa
   berhasil IB-nya, berapa jarak antar kelahiran, dan seberapa rajin datanya diisi.

   Prinsip yang dipegang di sini:

   1. TIDAK ADA ANGKA KARANGAN. Kalau data belum cukup untuk menghitung sesuatu
      (misal S/C tanpa satu pun kebuntingan terkonfirmasi), fungsi mengembalikan
      null — bukan 0. Layar wajib menampilkan "belum cukup data", bukan angka
      yang kelihatan pasti padahal tidak.

   2. Semua tanggal diperlakukan sebagai tanggal lokal, bukan UTC. Ini alasan
      yang sama dengan perbaikan todayStr(): peternak mencatat subuh, dan
      pergeseran satu hari menggeser sapi ke minggu/bulan yang salah.

   3. Batas periode inklusif di kedua ujung, dan dihitung dari tengah malam
      waktu setempat.
   ========================================================================= */

/* ---------- utilitas tanggal ---------- */

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** "2026-08-19" -> Date lokal tengah malam. Menghindari new Date("...") yang
    menafsirkan string tanggal polos sebagai UTC. */
export const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : startOfDay(v);
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : startOfDay(d);
};

export const ymd = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

/** Minggu dimulai Senin — konvensi yang dipakai di Indonesia. */
export const startOfWeek = (d) => {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Senin = 0
  return addDays(x, -dow);
};

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* ---------- definisi periode ---------- */

export const PERIODE = [
  { key: "minggu",     label: "Minggu ini" },
  { key: "bulan",      label: "Bulan ini" },
  { key: "tahun",      label: "Tahun ini" },
  { key: "keseluruhan", label: "Sepanjang waktu" },
];

/** Rentang [mulai, selesai] inklusif untuk sebuah periode.
    `offset` menggeser ke periode sebelumnya (-1 = minggu/bulan/tahun lalu). */
export function rentang(key, ref = new Date(), offset = 0) {
  const now = startOfDay(ref);
  if (key === "minggu") {
    const mulai = addDays(startOfWeek(now), offset * 7);
    return { mulai, selesai: addDays(mulai, 6) };
  }
  if (key === "bulan") {
    const mulai = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const selesai = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return { mulai, selesai };
  }
  if (key === "tahun") {
    const y = now.getFullYear() + offset;
    return { mulai: new Date(y, 0, 1), selesai: new Date(y, 11, 31) };
  }
  return { mulai: null, selesai: null }; // keseluruhan
}

export function labelPeriode(key, r) {
  if (key === "keseluruhan") return "Sejak awal pencatatan";
  if (key === "tahun") return String(r.mulai.getFullYear());
  if (key === "bulan") return `${BULAN_PANJANG[r.mulai.getMonth()]} ${r.mulai.getFullYear()}`;
  const sama = r.mulai.getMonth() === r.selesai.getMonth();
  return sama
    ? `${r.mulai.getDate()}–${r.selesai.getDate()} ${BULAN[r.mulai.getMonth()]} ${r.mulai.getFullYear()}`
    : `${r.mulai.getDate()} ${BULAN[r.mulai.getMonth()]} – ${r.selesai.getDate()} ${BULAN[r.selesai.getMonth()]} ${r.selesai.getFullYear()}`;
}

/* ---------- ekstraksi kejadian ---------- */

export const JENIS = {
  ib:        { label: "Inseminasi",  singkat: "IB" },
  pkb:       { label: "Pemeriksaan", singkat: "PKB" },
  lahir:     { label: "Kelahiran",   singkat: "Lahir" },
  keguguran: { label: "Keguguran",   singkat: "Keguguran" },
  sakit:     { label: "Lapor sakit", singkat: "Sakit" },
  sembuh:    { label: "Sembuh",      singkat: "Sembuh" },
  terapi:    { label: "Terapi",      singkat: "Terapi" },
  daftar:    { label: "Ternak baru", singkat: "Baru" },
};

const tglDari = (entry) => parseDate(typeof entry === "object" && entry !== null ? entry.date : entry);

/** Mendatarkan seluruh log jadi satu daftar kejadian: { tanggal, jenis, sapi, meta }.
    Ini satu-satunya tempat yang tahu bentuk log mentah — sisanya bekerja di
    tingkat "kejadian", jadi kalau bentuk datanya berubah cukup ubah di sini. */
export function kejadianDari(dbCattle) {
  const out = [];
  const list = Array.isArray(dbCattle) ? dbCattle : [];

  for (const c of list) {
    if (!c || !c.id) continue;
    const kode = c.code || c.id;
    const push = (tanggal, jenis, meta) => {
      if (tanggal) out.push({ tanggal, jenis, sapiId: c.id, kode, meta: meta || null });
    };

    (c.ibLog || []).forEach((e) => push(tglDari(e), "ib"));

    (c.pkbLog || []).forEach((e) => {
      const positif = e && e.result === "POSITIVE";
      push(tglDari(e), "pkb", { positif });
    });

    (c.calvingLog || []).forEach((e) => push(tglDari(e), "lahir"));
    // Sapi lama bisa hanya punya calvingDate tanpa calvingLog.
    if (c.calvingDate && !(c.calvingLog || []).length) push(parseDate(c.calvingDate), "lahir");

    (c.abortusLog || []).forEach((e) => push(tglDari(e), "keguguran"));
    if (c.abortusDate && !(c.abortusLog || []).length) push(parseDate(c.abortusDate), "keguguran");

    (c.therapyLog || []).forEach((e) => push(tglDari(e), "terapi"));

    (c.healthLog || []).forEach((h) => {
      push(parseDate(h?.date), "sakit", { gejala: h?.gejala });
      if (h?.tanggalSembuh) push(parseDate(h.tanggalSembuh), "sembuh");
    });

    push(parseDate(c.created_at || c.tanggal_lahir || c.birthDate), "daftar");
  }

  return out.sort((a, b) => a.tanggal - b.tanggal);
}

export const dalamRentang = (kejadian, mulai, selesai) => {
  if (!mulai || !selesai) return kejadian;
  const a = startOfDay(mulai).getTime();
  const b = startOfDay(selesai).getTime();
  return kejadian.filter((k) => {
    const t = k.tanggal.getTime();
    return t >= a && t <= b;
  });
};

/* ---------- metrik peternakan ---------- */

/** Service per Conception: berapa kali IB dibutuhkan untuk satu kebuntingan.
    Ideal 1,5–2,0. Dikembalikan null kalau belum ada kebuntingan terkonfirmasi —
    membagi dengan nol lalu menampilkan "0" akan menyesatkan. */
export function servicePerConception(kejadian) {
  const ib = kejadian.filter((k) => k.jenis === "ib").length;
  const bunting = kejadian.filter((k) => k.jenis === "pkb" && k.meta?.positif).length;
  if (bunting === 0) return null;
  return ib / bunting;
}

/** Conception rate: persen pemeriksaan kebuntingan yang hasilnya positif. */
export function conceptionRate(kejadian) {
  const pkb = kejadian.filter((k) => k.jenis === "pkb");
  if (pkb.length === 0) return null;
  return (pkb.filter((k) => k.meta?.positif).length / pkb.length) * 100;
}

/** Rata-rata jarak antar kelahiran (hari), dihitung per ekor lalu dirata-rata.
    Ideal 365–400 hari. Butuh minimal dua kelahiran pada ekor yang sama. */
export function calvingInterval(dbCattle) {
  const list = Array.isArray(dbCattle) ? dbCattle : [];
  const jarak = [];
  for (const c of list) {
    const tgl = [
      ...(c?.calvingLog || []).map(tglDari),
      ...(!(c?.calvingLog || []).length && c?.calvingDate ? [parseDate(c.calvingDate)] : []),
    ].filter(Boolean).sort((a, b) => a - b);
    for (let i = 1; i < tgl.length; i++) {
      const d = daysBetween(tgl[i - 1], tgl[i]);
      if (d > 200 && d < 1000) jarak.push(d); // buang nilai mustahil
    }
  }
  if (!jarak.length) return null;
  return jarak.reduce((a, b) => a + b, 0) / jarak.length;
}

/** Hari berbeda yang punya minimal satu catatan — ukuran kerajinan mencatat. */
export function hariAktif(kejadian) {
  return new Set(kejadian.filter((k) => k.jenis !== "daftar").map((k) => ymd(k.tanggal))).size;
}

/** Rentetan minggu berturut-turut yang ada catatannya. Dipakai di Rewind. */
export function streakMingguan(kejadian) {
  const minggu = new Set(
    kejadian.filter((k) => k.jenis !== "daftar").map((k) => ymd(startOfWeek(k.tanggal)))
  );
  if (!minggu.size) return 0;
  const urut = [...minggu].map((s) => parseDate(s)).sort((a, b) => a - b);
  let best = 1, cur = 1;
  for (let i = 1; i < urut.length; i++) {
    cur = daysBetween(urut[i - 1], urut[i]) === 7 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

/** Ekor dengan catatan terbanyak pada periode itu. */
export function sapiTeraktif(kejadian) {
  const hitung = {};
  for (const k of kejadian) {
    if (k.jenis === "daftar") continue;
    hitung[k.sapiId] = hitung[k.sapiId] || { kode: k.kode, sapiId: k.sapiId, n: 0 };
    hitung[k.sapiId].n += 1;
  }
  const urut = Object.values(hitung).sort((a, b) => b.n - a.n);
  return urut[0] || null;
}

/** Bulan tersibuk dalam setahun. */
export function bulanTersibuk(kejadian) {
  const per = Array(12).fill(0);
  kejadian.forEach((k) => { if (k.jenis !== "daftar") per[k.tanggal.getMonth()] += 1; });
  const maks = Math.max(...per);
  if (maks === 0) return null;
  return { bulan: per.indexOf(maks), nama: BULAN_PANJANG[per.indexOf(maks)], jumlah: maks };
}

/* ---------- deret untuk grafik ---------- */

/** Jumlah kejadian per satuan waktu, siap dipakai grafik batang.
    satuan: "hari" | "minggu" | "bulan" */
export function deret(kejadian, mulai, selesai, satuan) {
  const bucket = [];
  if (satuan === "bulan") {
    const y = mulai.getFullYear();
    for (let m = 0; m < 12; m++) bucket.push({ label: BULAN[m], kunci: `${y}-${m}`, nilai: 0, tanggal: new Date(y, m, 1) });
    kejadian.forEach((k) => {
      if (k.jenis === "daftar") return;
      if (k.tanggal.getFullYear() !== y) return;
      bucket[k.tanggal.getMonth()].nilai += 1;
    });
    return bucket;
  }

  if (satuan === "hari") {
    for (let d = new Date(mulai); d <= selesai; d = addDays(d, 1)) {
      bucket.push({ label: String(d.getDate()), kunci: ymd(d), nilai: 0, tanggal: new Date(d) });
    }
    const idx = Object.fromEntries(bucket.map((b, i) => [b.kunci, i]));
    kejadian.forEach((k) => {
      if (k.jenis === "daftar") return;
      const i = idx[ymd(k.tanggal)];
      if (i !== undefined) bucket[i].nilai += 1;
    });
    return bucket;
  }

  // minggu
  for (let d = startOfWeek(mulai); d <= selesai; d = addDays(d, 7)) {
    bucket.push({ label: `${d.getDate()} ${BULAN[d.getMonth()]}`, kunci: ymd(d), nilai: 0, tanggal: new Date(d) });
  }
  const idx = Object.fromEntries(bucket.map((b, i) => [b.kunci, i]));
  kejadian.forEach((k) => {
    if (k.jenis === "daftar") return;
    const i = idx[ymd(startOfWeek(k.tanggal))];
    if (i !== undefined) bucket[i].nilai += 1;
  });
  return bucket;
}

/** Grid untuk peta panas: kolom = minggu, baris = hari (Senin..Minggu). */
export function gridHarian(kejadian, mulai, selesai) {
  const per = {};
  kejadian.forEach((k) => {
    if (k.jenis === "daftar") return;
    const s = ymd(k.tanggal);
    per[s] = (per[s] || 0) + 1;
  });
  const kolom = [];
  for (let w = startOfWeek(mulai); w <= selesai; w = addDays(w, 7)) {
    const hari = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i);
      const diLuar = d < startOfDay(mulai) || d > startOfDay(selesai);
      hari.push({ tanggal: new Date(d), nilai: diLuar ? null : (per[ymd(d)] || 0) });
    }
    kolom.push({ mulai: new Date(w), hari });
  }
  return kolom;
}

/** Populasi ternak di akhir tiap bulan sepanjang tahun. */
export function deretPopulasi(dbCattle, mulai) {
  const list = (Array.isArray(dbCattle) ? dbCattle : []).filter(Boolean);
  const titik = [];
  const y = mulai.getFullYear();
  const hariIni = startOfDay(new Date());
  for (let m = 0; m < 12; m++) {
    const akhir = new Date(y, m + 1, 0);
    if (akhir > hariIni) break;
    const n = list.filter((c) => {
      const masuk = parseDate(c.created_at || c.tanggal_lahir || c.birthDate);
      return masuk && masuk <= akhir;
    }).length;
    titik.push({ label: BULAN[m], nilai: n, tanggal: akhir });
  }
  return titik;
}

/* ---------- ringkasan lengkap ---------- */

export function ringkasan(dbCattle, periodeKey, ref = new Date(), offset = 0) {
  const semua = kejadianDari(dbCattle);
  const r = rentang(periodeKey, ref, offset);

  let mulai = r.mulai, selesai = r.selesai;
  if (periodeKey === "keseluruhan") {
    mulai = semua.length ? semua[0].tanggal : startOfDay(ref);
    selesai = startOfDay(ref);
  }

  const isi = dalamRentang(semua, mulai, selesai);
  const kerja = isi.filter((k) => k.jenis !== "daftar");

  const hitung = Object.fromEntries(Object.keys(JENIS).map((j) => [j, 0]));
  isi.forEach((k) => { hitung[k.jenis] = (hitung[k.jenis] || 0) + 1; });

  // Periode sebelumnya, untuk menampilkan perubahan
  let sebelum = null;
  if (periodeKey !== "keseluruhan") {
    const rs = rentang(periodeKey, ref, offset - 1);
    const isiS = dalamRentang(semua, rs.mulai, rs.selesai).filter((k) => k.jenis !== "daftar");
    sebelum = {
      total: isiS.length,
      lahir: isiS.filter((k) => k.jenis === "lahir").length,
      ib: isiS.filter((k) => k.jenis === "ib").length,
    };
  }

  const satuan = periodeKey === "minggu" ? "hari"
    : periodeKey === "bulan" ? "hari"
    : periodeKey === "tahun" ? "bulan" : "bulan";

  const populasi = (Array.isArray(dbCattle) ? dbCattle : []).filter(Boolean);
  const betina = populasi.filter((c) => (c.jenis_kelamin || c.gender) !== "JANTAN").length;

  return {
    periodeKey,
    mulai, selesai,
    label: labelPeriode(periodeKey, { mulai, selesai }),
    kejadian: isi,
    totalKejadian: kerja.length,
    hitung,
    sebelum,
    sc: servicePerConception(isi),
    cr: conceptionRate(isi),
    ci: calvingInterval(dbCattle),
    hariAktif: hariAktif(isi),
    streak: streakMingguan(semua),
    teraktif: sapiTeraktif(isi),
    tersibuk: periodeKey === "tahun" || periodeKey === "keseluruhan" ? bulanTersibuk(isi) : null,
    deret: deret(isi, mulai, selesai, satuan),
    grid: periodeKey === "tahun" || periodeKey === "keseluruhan" ? null : gridHarian(isi, mulai, selesai),
    populasiSekarang: populasi.length,
    betina,
    jantan: populasi.length - betina,
  };
}

/* ---------- penilaian terhadap standar ---------- */

/** Membandingkan angka dengan rentang ideal peternakan.
    Rujukan angka ideal: S/C 1,5–2,0 dan calving interval 365–400 hari
    (Noakes et al., 2019) — sama dengan rujukan yang dipakai mesin analisa. */
export function nilaiSC(sc) {
  if (sc == null) return { sev: "neut", teks: "Belum cukup data" };
  if (sc <= 2) return { sev: "ok", teks: "Dalam kisaran ideal (1,5–2,0)" };
  if (sc <= 2.5) return { sev: "warn", teks: "Sedikit di atas ideal (1,5–2,0)" };
  return { sev: "crit", teks: "Jauh di atas ideal — perlu evaluasi" };
}

export function nilaiCR(cr) {
  if (cr == null) return { sev: "neut", teks: "Belum ada pemeriksaan" };
  if (cr >= 60) return { sev: "ok", teks: "Baik" };
  if (cr >= 45) return { sev: "warn", teks: "Perlu diperhatikan" };
  return { sev: "crit", teks: "Rendah — perlu evaluasi" };
}

export function nilaiCI(ci) {
  if (ci == null) return { sev: "neut", teks: "Belum ada dua kelahiran pada ekor yang sama" };
  if (ci <= 400) return { sev: "ok", teks: "Dalam kisaran ideal (365–400 hari)" };
  if (ci <= 450) return { sev: "warn", teks: "Sedikit di atas ideal" };
  return { sev: "crit", teks: "Terlalu panjang — evaluasi pakan & deteksi birahi" };
}
