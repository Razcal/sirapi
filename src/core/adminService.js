import { supabase } from './supabaseClient';
import { analyzeCattle } from './analyzeCattle';

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
  // Peternak yang mendaftar sendiri dan masih menunggu persetujuan.
  getPendingPeternak: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'peternak')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setUserStatus: async (userId, status) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

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
};
