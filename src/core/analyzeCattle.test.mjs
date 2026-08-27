// Test untuk analyzeCattle.js — sebelumnya modul ini sama sekali tidak punya
// test otomatis, padahal ini "otak" utama SIRAPI (menentukan status
// reproduksi/kesehatan setiap sapi + kriteria "perlu tindakan" di
// dashboard/notifikasi). Ditulis sekalian saat membenahi 3 bug/celah yang
// ditemukan lewat audit manual — supaya perbaikannya terverifikasi dan
// tidak regresi diam-diam di kemudian hari.

import { analyzeCattle, applyReproAction, applyHealthAction, getOpsiReproduksi } from './analyzeCattle.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log((ok ? '  OK  ' : ' GAGAL ') + '| ' + label + (ok ? '' : `  → dapat "${got}", harusnya "${want}"`));
};
const truthy = (label, got) => {
  const ok = !!got;
  ok ? pass++ : fail++;
  console.log((ok ? '  OK  ' : ' GAGAL ') + '| ' + label + (ok ? '' : `  → dapat ${JSON.stringify(got)}`));
};

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// --- Bug: ibLog seumur hidup (tidak direset saat melahirkan) mencemari
//     deteksi "Gagal Bunting Berulang" / "Nymphomania" siklus berjalan ---
{
  // Riwayat IB LAMA (4x, jarak >=18 hari — dulu akan langsung dianggap
  // cycles>=4 dan memicu "Gagal Bunting Berulang" biarpun semuanya dari
  // sebelum sapi ini melahirkan dan sudah lama selesai/berhasil).
  const riwayatLama = [-620, -600, -575, -550].map(o => ({ date: iso(o) }));
  const sapiBersih = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'BRED',
    calvingDate: iso(-100), // melahirkan 100 hari lalu — riwayat di atas semua SEBELUM ini
    ibLog: [...riwayatLama, { date: iso(-10) }], // cuma 1 IB baru pasca melahirkan
  };
  const hasil = analyzeCattle(sapiBersih);
  eq('IB lama sebelum melahirkan tidak ikut terhitung → bukan Repeat Breeder', hasil.statusLabel, 'Diduga Bunting');

  // Kontrol: kalau 4 IB br-jarak-normal itu semua terjadi SETELAH
  // melahirkan (siklus berjalan sungguhan), baru harus kena Repeat Breeder.
  const sapiRepeatBreeder = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'BRED',
    calvingDate: iso(-700),
    ibLog: [-620, -600, -575, -10].map(o => ({ date: iso(o) })),
  };
  const hasil2 = analyzeCattle(sapiRepeatBreeder);
  eq('4x IB jarak normal pasca melahirkan → Repeat Breeder terdeteksi', hasil2.statusLabel, 'Gangguan Reproduksi: Gagal Bunting Berulang');
  truthy('Repeat Breeder ditandai isUrgent', hasil2.isUrgent);
}

// --- Fitur baru: jarak antar IB yang jauh melebihi siklus birahi normal
//     TANPA PKB di antaranya → diduga keguguran dini tak terpantau (beda
//     dari Repeat Breeder, yang jaraknya justru rutin di kisaran normal).
//     Studi kasus: IB 1 Januari, tidak sempat PKB bulan ke-3 (kendala
//     biaya), ternyata birahi lagi di bulan ke-4. ---
{
  const sapiKeguguranDini = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'BRED',
    ibLog: [{ date: iso(-120) }, { date: iso(-10) }], // jarak 110 hari, tak ada PKB
    pkbLog: [],
  };
  const hasil = analyzeCattle(sapiKeguguranDini);
  eq('IB jauh tanpa PKB di antaranya → diduga keguguran dini tak terpantau', hasil.statusLabel, 'Gangguan Reproduksi: Diduga Keguguran Dini Tak Terpantau');
  truthy('Diduga keguguran dini ditandai isUrgent', hasil.isUrgent);
  truthy('Diduga keguguran dini ditandai needsVet', hasil.needsVet);

  // Kontrol: jarak antar IB sama-sama jauh, TAPI ada PKB (negatif) di
  // antara keduanya — berarti sapi memang sempat dipastikan tidak bunting,
  // bukan kejadian tak terpantau. Tidak boleh kena label baru ini.
  const sapiSudahDiperiksa = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'BRED',
    ibLog: [{ date: iso(-120) }, { date: iso(-10) }],
    pkbLog: [{ date: iso(-60), result: 'NEGATIVE' }],
  };
  const hasilKontrol = analyzeCattle(sapiSudahDiperiksa);
  eq('Jarak jauh TAPI ada PKB di antaranya → bukan keguguran dini tak terpantau', hasilKontrol.statusLabel, 'Diduga Bunting');

  // Kontrol: Repeat Breeder biasa (jarak normal ~20 hari tiap siklus) tidak
  // boleh ikut kena label baru ini — cuma jarak besar yang harus memicu.
  const sapiRepeatNormal = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'BRED',
    ibLog: [-80, -60, -40, -20].map(o => ({ date: iso(o) })), // 3x jarak 20 hari → cycles=4
    pkbLog: [],
  };
  const hasilRepeat = analyzeCattle(sapiRepeatNormal);
  eq('Repeat Breeder jarak normal tetap dapat labelnya sendiri, bukan keguguran dini', hasilRepeat.statusLabel, 'Gangguan Reproduksi: Gagal Bunting Berulang');
}

// --- Fitur baru: PKB wajib — begitu lewat 24 hari sejak IB terakhir tanpa
//     PKB, opsi "IB" tidak lagi ditawarkan (peternak/petugas harus catat
//     hasil PKB dulu). Di dalam 24 hari, IB tetap boleh langsung (birahi
//     kembali di siklus normal, PKB memang belum bisa dilakukan). ---
{
  const sapiBaruSajaIB = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-10) }], pkbLog: [] };
  const { options: opsi1, hint: hint1 } = getOpsiReproduksi(sapiBaruSajaIB);
  truthy('Dalam 24 hari sejak IB → opsi IB masih ditawarkan', opsi1.some(o => o.v === 'IB'));
  eq('Dalam 24 hari sejak IB → tidak ada peringatan PKB wajib', hint1, null);

  const sapiLewatMasaTunggu = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-30) }], pkbLog: [] };
  const { options: opsi2, hint: hint2 } = getOpsiReproduksi(sapiLewatMasaTunggu);
  eq('Lewat 24 hari tanpa PKB → opsi IB TIDAK ditawarkan', opsi2.some(o => o.v === 'IB'), false);
  truthy('Lewat 24 hari tanpa PKB → opsi hasil PKB (bunting/tidak) tetap ada', opsi2.some(o => o.v === 'POSITIVE') && opsi2.some(o => o.v === 'NEGATIVE'));
  truthy('Lewat 24 hari tanpa PKB → ada peringatan PKB wajib', !!hint2);
}

// --- Fitur baru: peringatan proaktif menjelang HPL, bukan cuma setelah lewat ---
{
  // conceptionDate ~274 hari lalu → HPL (274+9bln10hr≈284) sekitar 10 hari lagi
  const sapiMauLahir = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'PREGNANT',
    conceptionDate: iso(-274),
  };
  const hasil = analyzeCattle(sapiMauLahir);
  eq('10 hari menjelang HPL → Persiapan Kelahiran (bukan cuma "Bunting Aktif")', hasil.statusLabel, 'PERSIAPAN KELAHIRAN');
  truthy('Persiapan Kelahiran ditandai isUrgent', hasil.isUrgent);

  // Jauh lewat rentang normal (296 hari) → distokia
  const sapiOverdue = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'PREGNANT',
    conceptionDate: iso(-296),
  };
  const hasilOverdue = analyzeCattle(sapiOverdue);
  eq('296 hari bunting (jauh lewat normal) → Ancaman Distokia', hasilOverdue.statusLabel, 'ANCAMAN DISTOKIA');

  // Masih jauh dari HPL (100 hari) → tetap Bunting Aktif seperti semula
  const sapiAwal = {
    jenis_kelamin: 'BETINA',
    status_reproduksi: 'PREGNANT',
    conceptionDate: iso(-100),
  };
  eq('100 hari bunting → tetap Bunting Aktif (trimester 2)', analyzeCattle(sapiAwal).statusLabel, 'BUNTING AKTIF');
}

// --- Sanity check: jalur-jalur lain tidak ikut berubah perilakunya ---
{
  eq('Pedet jantan', analyzeCattle({ jenis_kelamin: 'JANTAN', tanggal_lahir: iso(-100) }).statusLabel, 'PEDET JANTAN');
  eq('Sakit menunggu dokter selalu prioritas tertinggi', analyzeCattle({
    jenis_kelamin: 'BETINA', status_reproduksi: 'OPEN',
    healthLog: [{ status: 'MENUNGGU_DOKTER', gejala: 'demam tinggi' }],
  }).statusLabel, 'MENUNGGU DOKTER');
  eq('Data tidak valid ditangani rapi', analyzeCattle(null).statusLabel, 'DATA TIDAK VALID');
}

// --- applyReproAction/applyHealthAction: diekstrak dari App.jsx supaya
//     App.jsx dan PetugasApp.jsx (petugas mencatat langsung ke sapi
//     peternak lain) pakai persis logika yang sama. Test ini mengunci
//     perilakunya biar refactor besok tidak diam-diam mengubah hasil. ---
{
  const sapiKosong = { id: 'x1', jenis_kelamin: 'BETINA', status_reproduksi: 'OPEN', ibLog: [] };

  const setelahIB = applyReproAction(sapiKosong, 'IB', null, iso(0));
  eq('applyReproAction IB → fase BRED', setelahIB.status_reproduksi, 'BRED');
  eq('applyReproAction IB → tercatat di ibLog', setelahIB.ibLog.length, 1);
  eq('sapiKosong asli tidak ikut berubah (bukan mutasi)', sapiKosong.status_reproduksi, 'OPEN');

  const sapiBRED = { id: 'x2', jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-65) }] };
  const setelahPositif = applyReproAction(sapiBRED, 'POSITIVE', null, iso(0));
  eq('applyReproAction POSITIVE → fase PREGNANT', setelahPositif.status_reproduksi, 'PREGNANT');
  eq('applyReproAction POSITIVE → conceptionDate dari IB terakhir', setelahPositif.conceptionDate, iso(-65));

  const sapiPregnant = { id: 'x3', jenis_kelamin: 'BETINA', status_reproduksi: 'PREGNANT', conceptionDate: iso(-280) };
  const setelahLahir = applyReproAction(sapiPregnant, 'CALVED', null, iso(0));
  eq('applyReproAction CALVED → fase POSTPARTUM', setelahLahir.status_reproduksi, 'POSTPARTUM');
  eq('applyReproAction CALVED → conceptionDate direset', setelahLahir.conceptionDate, null);

  const sapiSehat = { id: 'x4', jenis_kelamin: 'BETINA', status_reproduksi: 'OPEN', healthLog: [] };
  const setelahLapor = applyHealthAction(sapiSehat, { type: 'LAPOR', date: iso(0), gejala: 'nafsu makan turun' });
  eq('applyHealthAction LAPOR → status MENUNGGU_DOKTER', setelahLapor.healthLog[0].status, 'MENUNGGU_DOKTER');

  const setelahSembuh = applyHealthAction(setelahLapor, { type: 'SEMBUH', date: iso(1) });
  eq('applyHealthAction SEMBUH → status jadi SEMBUH', setelahSembuh.healthLog[0].status, 'SEMBUH');
}

console.log(`\n${pass} lolos, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
