import {
  parseDate, ymd, startOfWeek, rentang, kejadianDari, dalamRentang,
  servicePerConception, conceptionRate, calvingInterval, hariAktif,
  streakMingguan, sapiTeraktif, bulanTersibuk, deret, gridHarian, ringkasan,
} from './analytics.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? '  OK  ' : ' GAGAL ') + '| ' + label + (ok ? '' : `  → dapat ${JSON.stringify(got)}, harusnya ${JSON.stringify(want)}`));
};
const near = (label, got, want, tol=0.01) => {
  const ok = got != null && Math.abs(got - want) <= tol;
  ok ? pass++ : fail++;
  console.log((ok ? '  OK  ' : ' GAGAL ') + '| ' + label + (ok ? '' : `  → dapat ${got}, harusnya ${want}`));
};

// --- tanggal lokal, bukan UTC ---
eq('parseDate("2026-08-19") jadi 19 Agustus lokal', ymd(parseDate('2026-08-19')), '2026-08-19');
eq('startOfWeek(Rabu 19 Agu 2026) = Senin 17 Agu', ymd(startOfWeek(parseDate('2026-08-19'))), '2026-08-17');
eq('startOfWeek(Senin) tetap Senin', ymd(startOfWeek(parseDate('2026-08-17'))), '2026-08-17');
eq('startOfWeek(Minggu 23 Agu) = Senin 17 Agu', ymd(startOfWeek(parseDate('2026-08-23'))), '2026-08-17');

// --- rentang periode ---
const ref = parseDate('2026-08-19');
const rM = rentang('minggu', ref);
eq('minggu ini: 17–23 Agu', [ymd(rM.mulai), ymd(rM.selesai)], ['2026-08-17','2026-08-23']);
const rB = rentang('bulan', ref);
eq('bulan ini: 1–31 Agu', [ymd(rB.mulai), ymd(rB.selesai)], ['2026-08-01','2026-08-31']);
const rT = rentang('tahun', ref);
eq('tahun ini: 1 Jan – 31 Des', [ymd(rT.mulai), ymd(rT.selesai)], ['2026-01-01','2026-12-31']);
const rBprev = rentang('bulan', ref, -1);
eq('bulan lalu: 1–31 Jul', [ymd(rBprev.mulai), ymd(rBprev.selesai)], ['2026-07-01','2026-07-31']);
const rBjan = rentang('bulan', parseDate('2026-01-15'), -1);
eq('bulan lalu dari Januari = Desember tahun lalu', [ymd(rBjan.mulai), ymd(rBjan.selesai)], ['2025-12-01','2025-12-31']);

// --- ekstraksi kejadian ---
const sapi = [
  { id:'a', code:'A-1', created_at:'2026-01-05', jenis_kelamin:'BETINA',
    ibLog:[{date:'2026-02-01'},{date:'2026-02-22'},{date:'2026-03-15'}],
    pkbLog:[{date:'2026-04-20', result:'POSITIVE'}],
    calvingLog:['2026-01-10'],
    healthLog:[{date:'2026-05-02', gejala:'demam', status:'SEMBUH', tanggalSembuh:'2026-05-09'}] },
  { id:'b', code:'B-2', created_at:'2026-01-08', jenis_kelamin:'BETINA',
    ibLog:['2026-03-01'],
    pkbLog:[{date:'2026-05-05', result:'NEGATIVE'}],
    calvingLog:['2025-02-01','2026-03-05'] },
  { id:'c', code:'C-3', created_at:'2026-02-01', jenis_kelamin:'JANTAN', ibLog:[], pkbLog:[], healthLog:[] },
];
const kj = kejadianDari(sapi);
// A: 3ib+1pkb+1lahir+1sakit+1sembuh+1daftar = 8; B: 1ib+1pkb+2lahir+1daftar = 5; C: 1daftar = 1
eq('total kejadian terekstrak', kj.length, 14);
eq('kejadian terurut menaik', kj.every((k,i)=> i===0 || kj[i-1].tanggal <= k.tanggal), true);
eq('IB milik A ada 3', kj.filter(k=>k.jenis==='ib' && k.sapiId==='a').length, 3);
eq('PKB positif terbaca', kj.filter(k=>k.jenis==='pkb' && k.meta?.positif).length, 1);
eq('sembuh terbaca terpisah', kj.filter(k=>k.jenis==='sembuh').length, 1);

// --- metrik ---
const th = dalamRentang(kj, parseDate('2026-01-01'), parseDate('2026-12-31'));
near('S/C = 4 IB / 1 bunting = 4', servicePerConception(th), 4);
near('CR = 1 dari 2 PKB = 50%', conceptionRate(th), 50);
eq('S/C null kalau belum ada bunting', servicePerConception(th.filter(k=>k.jenis!=='pkb')), null);
eq('CR null kalau belum ada PKB', conceptionRate(th.filter(k=>k.jenis!=='pkb')), null);
near('calving interval B: 2025-02-01 → 2026-03-05 = 397 hari', calvingInterval(sapi), 397, 1);
eq('calving interval null kalau cuma 1 kelahiran', calvingInterval([sapi[0]]), null);

// --- kerajinan mencatat ---
// 10 tanggal unik: 10/1, 1/2, 22/2, 1/3, 5/3, 15/3, 20/4, 2/5, 5/5, 9/5
eq('hari aktif (tanggal unik, tanpa "daftar")', hariAktif(th), 10);
eq('sapi teraktif = A-1', sapiTeraktif(th)?.kode, 'A-1');
// Maret punya 3 (ib 1/3, lahir 5/3, ib 15/3) — lebih banyak dari Februari yang 2
eq('bulan tersibuk = Maret (3 kejadian)', bulanTersibuk(th)?.bulan, 2);
eq('jumlah bulan tersibuk', bulanTersibuk(th)?.jumlah, 3);

// --- deret ---
const d12 = deret(th, parseDate('2026-01-01'), parseDate('2026-12-31'), 'bulan');
eq('deret bulanan punya 12 titik', d12.length, 12);
eq('Januari = 1 kelahiran', d12[0].nilai, 1);
eq('Februari = 2 IB', d12[1].nilai, 2);
eq('jumlah deret = total kejadian kerja', d12.reduce((a,b)=>a+b.nilai,0), th.filter(k=>k.jenis!=='daftar').length);

const dHari = deret(dalamRentang(kj, parseDate('2026-02-01'), parseDate('2026-02-28')), parseDate('2026-02-01'), parseDate('2026-02-28'), 'hari');
eq('Februari punya 28 hari', dHari.length, 28);
eq('1 Feb ada 1 kejadian', dHari[0].nilai, 1);

// --- grid heatmap ---
const g = gridHarian(dalamRentang(kj, parseDate('2026-02-01'), parseDate('2026-02-28')), parseDate('2026-02-01'), parseDate('2026-02-28'));
eq('tiap kolom grid berisi 7 hari', g.every(c=>c.hari.length===7), true);
const totalGrid = g.flatMap(c=>c.hari).reduce((a,h)=> a + (h.nilai||0), 0);
eq('jumlah grid = kejadian Februari', totalGrid, 2);
eq('hari di luar rentang bernilai null', g[0].hari.some(h=>h.nilai===null), true);

// --- ringkasan utuh ---
const R = ringkasan(sapi, 'tahun', ref);
eq('ringkasan: label tahun', R.label, '2026');
eq('ringkasan: total kejadian', R.totalKejadian, th.filter(k=>k.jenis!=='daftar').length);
eq('ringkasan: populasi', R.populasiSekarang, 3);
eq('ringkasan: betina 2 / jantan 1', [R.betina, R.jantan], [2,1]);
eq('ringkasan: ada pembanding periode sebelumnya', R.sebelum !== null, true);
const Rall = ringkasan(sapi, 'keseluruhan', ref);
eq('keseluruhan: tidak ada pembanding', Rall.sebelum, null);
eq('keseluruhan mencakup kelahiran 2025', Rall.hitung.lahir, 3);
const Rkosong = ringkasan([], 'tahun', ref);
eq('data kosong tidak error', Rkosong.totalKejadian, 0);
eq('data kosong: S/C null', Rkosong.sc, null);

console.log(`\n${pass} lolos, ${fail} gagal`);
process.exit(fail ? 1 : 0);
