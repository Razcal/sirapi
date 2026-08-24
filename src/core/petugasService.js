import { supabase } from './supabaseClient';
import { cattleService } from './cattleService';
import { analyzeCattle, applyReproAction, applyHealthAction } from './analyzeCattle';

// Pencatatan lintas-peternak oleh petugas mengandalkan tabel `users`/`cattle`
// yang saat ini TIDAK punya RLS restriktif (lihat catatan di commit "Panel
// petugas" dan SUPABASE_ROLES_MIGRATION.sql) — sama sekali bukan celah baru
// yang dibuka fitur ini, cuma memakai akses yang memang sudah terbuka.
export const petugasService = {
  // Semua peternak approved + sapi mereka yang "perlu tindakan" (isUrgent),
  // dikelompokkan per peternak, diurutkan yang paling banyak sapi mendesak
  // duluan. Ini yang jadi daftar utama di PetugasApp.
  getUrgentList: async () => {
    try {
      const { data: peternakList, error: peternakError } = await supabase
        .from('users')
        .select('id, name, phone, kecamatan, desa, dusun')
        .eq('role', 'peternak')
        .eq('status', 'approved');
      if (peternakError) throw peternakError;
      if (!peternakList || peternakList.length === 0) return { success: true, groups: [] };

      const userIds = peternakList.map(u => u.id);
      const { data: cattleList, error: cattleError } = await supabase
        .from('cattle')
        .select('*')
        .in('user_id', userIds);
      if (cattleError) throw cattleError;

      const byUser = {};
      (cattleList || []).forEach(item => {
        let analysis = null;
        try { analysis = analyzeCattle(item); } catch { return; }
        if (!analysis?.isUrgent) return;
        if (!byUser[item.user_id]) byUser[item.user_id] = [];
        byUser[item.user_id].push({ cattle: item, analysis });
      });

      const groups = peternakList
        .filter(u => byUser[u.id]?.length > 0)
        .map(u => ({ peternak: u, items: byUser[u.id] }))
        .sort((a, b) => b.items.length - a.items.length);

      return { success: true, groups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Semua sapi milik satu peternak (dipakai layar detail peternak).
  getCattleByFarmer: async (userId) => {
    try {
      const { data, error } = await supabase.from('cattle').select('*').eq('user_id', userId);
      if (error) throw error;
      return { success: true, cattle: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  searchPeternak: async (query) => {
    try {
      const q = query.trim();
      if (!q) return { success: true, users: [] };
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, kecamatan, desa, dusun')
        .eq('role', 'peternak')
        .eq('status', 'approved')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Catat tindakan reproduksi (IB/PKB/melahirkan/keguguran/terapi) langsung
  // ke sapi peternak — pakai applyReproAction yang SAMA dengan App.jsx,
  // supaya perhitungan conceptionDate dkk konsisten di kedua tempat.
  recordReproAction: async (cattleItem, res, pregMonth, date) => {
    try {
      const updated = applyReproAction(cattleItem, res, pregMonth, date);
      const result = await cattleService.updateCattle(cattleItem.id, updated);
      if (!result.success) throw new Error(result.error);
      return { success: true, cattle: result.cattle };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  recordHealthAction: async (cattleItem, payload) => {
    try {
      const updated = applyHealthAction(cattleItem, payload);
      const result = await cattleService.updateCattle(cattleItem.id, updated);
      if (!result.success) throw new Error(result.error);
      return { success: true, cattle: result.cattle };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
