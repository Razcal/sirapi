// Test untuk analyzeCattle.js — sebelumnya modul ini sama sekali tidak punya
// test otomatis, padahal ini "otak" utama SIRAPI (menentukan status
// reproduksi/kesehatan setiap sapi + kriteria "perlu tindakan" di
// dashboard/notifikasi). Ditulis sekalian saat membenahi 3 bug/celah yang
// ditemukan lewat audit manual — supaya perbaikannya terverifikasi dan
// tidak regresi diam-diam di kemudian hari.

import { analyzeCattle, applyReproAction, applyHealthAction, applyLaporanPetugas, getOpsiReproduksi } from './analyzeCattle.js';

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

// --- PKB mutlak wajib begitu lewat hari ke-60 (jadwal PKB resmi) TANPA
//     pernah diperiksa — sebelum titik itu (termasuk kalau birahi muncul
//     lagi lebih awal, mis. hari ke-50, studi kasus dari pengguna) IB
//     tetap harus bisa dicatat langsung karena birahi mendesak waktu
//     (~12-18 jam aktif) dan PKB memang belum bisa dilakukan sebelum
//     hari ke-60 — memblokir di jendela itu cuma bikin peternak
//     kehilangan momen kawin tanpa ada gunanya. TAPI jendela 25-59 hari
//     itu tetap diberi catatan waspada (hint level "warn") — hanya
//     IB-nya yang tidak diblokir, bukan berarti tidak ada keterangan
//     sama sekali. ---
{
  const sapiDalamSiklus = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-10) }], pkbLog: [] };
  const { options: opsiSiklus, hint: hintSiklus } = getOpsiReproduksi(sapiDalamSiklus);
  truthy('Dalam siklus normal (10 hari) → opsi IB tetap ditawarkan', opsiSiklus.some(o => o.v === 'IB'));
  eq('Dalam siklus normal (10 hari) → tidak ada catatan apapun', hintSiklus, null);

  const sapiHari50 = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-50) }], pkbLog: [] };
  const { options: opsiHari50, hint: hintHari50 } = getOpsiReproduksi(sapiHari50);
  truthy('Birahi lagi di hari ke-50 (sebelum jadwal PKB hari ke-60) → IB tetap ditawarkan, tidak diblokir', opsiHari50.some(o => o.v === 'IB'));
  truthy('Hari ke-50 di luar siklus normal → tetap ada catatan waspada', !!hintHari50);
  eq('Hari ke-50 → catatan levelnya waspada (warn), bukan wajib (crit)', hintHari50.level, 'warn');

  // End-to-end: setelah IB hari ke-50 itu BENAR dicatat (bukan cuma opsinya
  // tersedia), analyzeCattle langsung menandainya sebagai anomali —
  // inilah "tindak lanjut otomatis" untuk jendela yang sengaja tidak diblokir.
  const setelahIBHari50 = applyReproAction(sapiHari50, 'IB', null, iso(0));
  const hasilSetelahIB = analyzeCattle(setelahIBHari50);
  eq('Setelah IB hari ke-50 dicatat → langsung ditandai Diduga Keguguran Dini', hasilSetelahIB.statusLabel, 'Gangguan Reproduksi: Diduga Keguguran Dini Tak Terpantau');

  // Lewat hari ke-60 tanpa PKB sama sekali → di sinilah PKB jadi mutlak
  // wajib, IB baru tidak ditawarkan lagi sampai hasil PKB dicatat, dan
  // catatannya naik level jadi "crit".
  const sapiLewat60 = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-65) }], pkbLog: [] };
  const { options: opsiLewat60, hint: hintLewat60 } = getOpsiReproduksi(sapiLewat60);
  eq('Lewat hari ke-60 tanpa PKB → opsi IB TIDAK ditawarkan', opsiLewat60.some(o => o.v === 'IB'), false);
  truthy('Lewat hari ke-60 tanpa PKB → opsi hasil PKB (bunting/tidak) tetap ada', opsiLewat60.some(o => o.v === 'POSITIVE') && opsiLewat60.some(o => o.v === 'NEGATIVE'));
  truthy('Lewat hari ke-60 tanpa PKB → ada peringatan PKB mutlak wajib', !!hintLewat60);
  eq('Lewat hari ke-60 → catatan levelnya wajib (crit), bukan cuma waspada', hintLewat60.level, 'crit');
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

// --- Fitur baru: "Sudah menghubungi petugas" — begitu peternak melapor
//     SETELAH kejadian yang memicu gangguan, warnanya turun dari merah ke
//     kuning (tetap waspada, statusLabel & advice-nya TIDAK berubah, cuma
//     warnanya). Kalau belum ada laporan, tetap merah. ---
{
  const sapiGangguan = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-10) }, { date: iso(-3) }], pkbLog: [] };
  const sebelumLapor = analyzeCattle(sapiGangguan);
  eq('Belum ada laporan → status Birahi Tidak Normal, merah', sebelumLapor.statusLabel, 'Gangguan Reproduksi: Birahi Tidak Normal');
  eq('Belum ada laporan → warna rose', sebelumLapor.color, 'rose');
  eq('Belum ada laporan → sudahLapor belum ada', !!sebelumLapor.sudahLapor, false);

  const sapiSudahLapor = applyLaporanPetugas(sapiGangguan, { date: iso(0), catatan: 'Sudah dijadwalkan kunjungan petugas.' });
  eq('applyLaporanPetugas → tercatat di laporanPetugasLog', sapiSudahLapor.laporanPetugasLog.length, 1);
  const setelahLaporGangguan = analyzeCattle(sapiSudahLapor);
  eq('Sudah dilaporkan SETELAH kejadian → statusLabel tetap sama (belum tentu beres)', setelahLaporGangguan.statusLabel, 'Gangguan Reproduksi: Birahi Tidak Normal');
  eq('Sudah dilaporkan SETELAH kejadian → warna turun jadi kuning (amber)', setelahLaporGangguan.color, 'amber');
  truthy('Sudah dilaporkan → sudahLapor true', setelahLaporGangguan.sudahLapor);

  // Kontrol: laporan yang tanggalnya SEBELUM kejadian (mis. laporan lama
  // dari masalah sebelumnya) tidak boleh ikut menurunkan warna gangguan
  // yang baru terjadi belakangan.
  const sapiLaporanLama = { ...sapiGangguan, laporanPetugasLog: [{ date: iso(-9), catatan: 'Laporan lama, sebelum IB ke-2.' }] };
  const hasilLaporanLama = analyzeCattle(sapiLaporanLama);
  eq('Laporan lama (sebelum kejadian terbaru) → tidak ikut menurunkan warna', hasilLaporanLama.color, 'rose');

  // Pemulihan otomatis: IB berikutnya dengan jarak normal (18-24 hari)
  // dari IB terakhir → status kembali normal dengan sendirinya, TANPA
  // perlu laporan apapun — bukan terkunci gangguan selamanya.
  const sapiUntukPulih = { jenis_kelamin: 'BETINA', status_reproduksi: 'BRED', ibLog: [{ date: iso(-30) }, { date: iso(-23) }], pkbLog: [] };
  const sebelumPulih = analyzeCattle(sapiUntukPulih);
  eq('Sebelum pulih → masih Birahi Tidak Normal', sebelumPulih.statusLabel, 'Gangguan Reproduksi: Birahi Tidak Normal');
  const setelahIBNormal = applyReproAction(sapiUntukPulih, 'IB', null, iso(0)); // gap dari -23 ke 0 = 23 hari, normal
  const hasilPulih = analyzeCattle(setelahIBNormal);
  eq('IB berikutnya berjarak normal (23 hari) → otomatis pulih, bukan lagi Birahi Tidak Normal', hasilPulih.statusLabel, 'Diduga Bunting');
}

console.log(`\n${pass} lolos, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
