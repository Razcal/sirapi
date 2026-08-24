import { supabase } from './supabaseClient';

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
};
