import { supabase } from './supabaseClient';
import { analyzeCattle } from './analyzeCattle';
import { BULAN } from './analytics';
import bcrypt from 'bcryptjs';

// Label status yang berarti "sapi ini birahi / waktunya kawin sekarang" —
// dicocokkan ke statusLabel literal dari analyzeCattle.js. Dijaga sebagai
// daftar tetap (bukan tebak-tebak dari warna) karena cuma authoring di
// analyzeCattle.js yang tahu persis kapan sebuah label itu soal birahi.
const LABEL_BIRAHI = new Set([
  "SIAP IB",
  "DARA SIAP KAWIN",
  "Siap Dikawinkan Kembali",
  "WASPADA: BIRAHI TERTUNDA",
]);

// Semua fungsi di sini mengandalkan RLS di tabel `users` (belum dikunci
// ketat per Agustus 2026 — lihat catatan di App.jsx/README terkait). Untuk
// sekarang siapa pun yang berhasil login dan lolos gate role==='admin' di
// AdminApp.jsx bisa memanggil ini. Mengunci RLS supaya cuma admin yang
// benar-benar bisa query/ubah baris orang lain adalah kerja susulan.
export const adminService = {
  getPetugasList: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'petugas')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Peternak yang sudah disetujui — dipakai halaman Laporan admin untuk
  // hitung sebaran per kecamatan, bukan buat ditampilkan mentah-mentah.
  getApprovedPeternak: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, kecamatan, desa, created_at')
        .eq('role', 'peternak')
        .eq('status', 'approved');
      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getCattleCount: async () => {
    try {
      const { count, error } = await supabase
        .from('cattle')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, count: count || 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Menjawab pertanyaan inti SIRAPI di level kabupaten: sapi mana yang
  // birahi/siap kawin sekarang, dan sapi mana yang diduga ada gangguan
  // reproduksi — bukan cuma jumlah peternak/sapi. Memakai analyzeCattle
  // yang SAMA dengan App.jsx (peternak) dan petugasService.js, supaya
  // penilaian di ketiga tempat selalu konsisten.
  getReproMonitoring: async () => {
    try {
      const { data: peternakList, error: peternakError } = await supabase
        .from('users')
        .select('id, name, phone, kecamatan, desa, dusun')
        .eq('role', 'peternak')
        .eq('status', 'approved');
      if (peternakError) throw peternakError;
      if (!peternakList || peternakList.length === 0) return { success: true, birahi: [], gangguan: [] };

      const peternakById = {};
      peternakList.forEach(u => { peternakById[u.id] = u; });

      const { data: cattleList, error: cattleError } = await supabase
        .from('cattle')
        .select('*')
        .in('user_id', peternakList.map(u => u.id));
      if (cattleError) throw cattleError;

      const birahi = [];
      const gangguan = [];
      (cattleList || []).forEach(item => {
        const peternak = peternakById[item.user_id];
        if (!peternak) return; // sapi milik peternak yang belum/tidak approved — lewati
        let analysis = null;
        try { analysis = analyzeCattle(item); } catch { return; }
        if (!analysis) return;
        const row = { cattle: item, analysis, peternak };
        if (analysis.needsVet) gangguan.push(row);
        else if (LABEL_BIRAHI.has(analysis.statusLabel)) birahi.push(row);
      });

      return { success: true, birahi, gangguan };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Direktori lengkap semua peternak. Pencarian dilakukan di sisi klien
  // (jumlah masih ratusan, belum perlu query server per ketikan).
  getAllPeternak: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'peternak')
        .order('name', { ascending: true });
      if (error) throw error;
      return { success: true, users: (data || []).map((u) => { const { password_hash: _password_hash, ...safe } = u; return safe; }) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Ubah data profil (nama, HP, wilayah) — dipakai admin untuk peternak
  // maupun petugas, dari panel detail akun.
  updateUserProfile: async (userId, patch) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      const { password_hash: _password_hash, ...safeUser } = data;
      return { success: true, user: safeUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Reset kata sandi langsung dari panel admin (peternak lupa kata sandi
  // adalah keluhan yang sering, sebelumnya tidak ada jalan lain selain
  // minta bantuan lewat kode). Semua akun saat ini (Agustus 2026) memakai
  // jalur bcrypt fallback — lihat catatan di authService.js — jadi tulis
  // langsung ke password_hash selalu berlaku, bukan cuma untuk sebagian
  // akun. Kalau nanti ada akun Supabase Auth murni (tanpa password_hash),
  // fungsi ini masih menuliskan password_hash sebagai fallback baru untuk
  // akun itu — login tetap jalan karena authService.login mengecek
  // password_hash lebih dulu sebelum coba Supabase Auth.
  resetUserPassword: async (userId, newPassword) => {
    try {
      const hash = await bcrypt.hash(newPassword.trim(), 10);
      const { error } = await supabase
        .from('users')
        .update({ password_hash: hash, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Peternak yang sudah disetujui tapi belum input sapi sama sekali —
  // menunjukkan di kecamatan mana sosialisasi/pendampingan pemakaian
  // aplikasi paling dibutuhkan, bukan cuma "kurang peternak aktif".
  getPeternakTanpaSapi: async () => {
    try {
      const { data: peternak, error: peternakError } = await supabase
        .from('users')
        .select('id, kecamatan')
        .eq('role', 'peternak')
        .eq('status', 'approved');
      if (peternakError) throw peternakError;

      const { data: cattleOwners, error: cattleError } = await supabase
        .from('cattle')
        .select('user_id');
      if (cattleError) throw cattleError;

      const ownerSet = new Set((cattleOwners || []).map(c => c.user_id));
      const tanpaSapi = (peternak || []).filter(u => !ownerSet.has(u.id));
      const perKecamatan = {};
      tanpaSapi.forEach(u => { perKecamatan[u.kecamatan] = (perKecamatan[u.kecamatan] || 0) + 1; });

      return {
        success: true,
        total: tanpaSapi.length,
        perKecamatan: Object.entries(perKecamatan).sort((a, b) => b[1] - a[1]),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Tren laporan masalah reproduksi 6 bulan terakhir — dihitung dari
  // KEJADIAN yang tercatat dengan tanggal (PKB hasil negatif, keguguran),
  // BUKAN dari menjalankan ulang analyzeCattle mundur ke masa lalu (fungsi
  // itu memang dirancang menilai kondisi HARI INI, bukan kondisi historis
  // di tanggal tertentu — memutar mundur "hari ke berapa sejak IB" untuk
  // bulan-bulan lama tidak berarti apa-apa). Jadi ini hitungan laporan
  // masuk per bulan, dipakai untuk lihat arah tren (membaik/memburuk),
  // bukan potret kondisi sapi saat ini (itu tugas getReproMonitoring).
  getGangguanTrend: async () => {
    try {
      const { data: peternak, error: peternakError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'peternak')
        .eq('status', 'approved');
      if (peternakError) throw peternakError;
      const ids = (peternak || []).map(u => u.id);
      if (ids.length === 0) return { success: true, months: [] };

      // Hasil PKB negatif + kejadian keguguran — dua sinyal masalah
      // reproduksi yang tercatat dengan tanggal (lihat
      // SUPABASE_ABORTUS_COLUMNS_MIGRATION.sql untuk riwayat kenapa
      // abortusLog sempat tidak bisa dipakai di sini).
      const { data: cattleList, error: cattleError } = await supabase
        .from('cattle')
        .select('pkbLog, abortusLog')
        .in('user_id', ids);
      if (cattleError) throw cattleError;

      const now = new Date();
      const buckets = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: BULAN[d.getMonth()], nilai: 0 });
      }
      const byKey = {};
      buckets.forEach(b => { byKey[b.key] = b; });

      const tally = (dateStr) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (byKey[key]) byKey[key].nilai += 1;
      };

      (cattleList || []).forEach(item => {
        (item.pkbLog || []).forEach(e => { if (e?.result === 'NEGATIVE') tally(e.date); });
        (item.abortusLog || []).forEach(dateStr => tally(dateStr));
      });

      return { success: true, months: buckets };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
