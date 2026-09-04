import { supabase } from './supabaseClient';

export const cattleService = {
  // Get all cattle for a farm
  getCattleByFarm: async (farmId) => {
    try {
      const { data, error } = await supabase
        .from('cattle')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      return { success: true, cattle: data || [] };
    } catch (error) {
      console.error("Error Get Cattle:", error);
      return { success: false, error: error.message };
    }
  },

  // Get cattle by ID
  getCattleById: async (cattleId) => {
    try {
      const { data, error } = await supabase
        .from('cattle')
        .select('*')
        .eq('id', cattleId)
        .single();

      if (error) throw error;
      return { success: true, cattle: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create new cattle
  createCattle: async (farmId, userId, cattleData) => {
    try {
      const { data, error } = await supabase
        .from('cattle')
        .insert([{
          farm_id: farmId,
          user_id: userId,
          // Menggunakan spread operator agar data dinamis (seperti 'phase') ikut masuk
          ...cattleData,
          code: cattleData.code.trim().toUpperCase(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, cattle: data };
    } catch (error) {
      console.error("Error Create Cattle:", error);
      // Kode 23505 = pelanggaran unique constraint. Kalau soal kode sapi
      // (cattle_user_code_key — unik per peternak, lihat migrasi
      // SUPABASE_FIX_KODE_SAPI_UNIK_PER_PETERNAK.sql), pesan mentah dari
      // Postgres diganti kalimat yang jelas maksudnya untuk peternak.
      if (error.code === '23505' && /code/i.test(error.message || '')) {
        return { success: false, error: 'Kode sapi ini sudah dipakai untuk salah satu ternak Anda. Gunakan kode lain.' };
      }
      return { success: false, error: error.message };
    }
  },

  // Update cattle (SANGAT PENTING UNTUK FITUR LAPOR AKSI)
  updateCattle: async (cattleId, cattleData) => {
    try {
      // 1. Buang ID dan data bawaan agar tidak bentrok dengan Primary Key Supabase
      const { id: _id, created_at: _created_at, farm_id: _farm_id, user_id: _user_id, ...safeUpdateData } = cattleData;

      // 2. Pastikan kode sapi selalu kapital jika ikut di-update
      if (safeUpdateData.code) {
        safeUpdateData.code = safeUpdateData.code.trim().toUpperCase();
      }

      // 3. Update data dinamis (Termasuk ibLog, pkbLog, healthLog, dll)
      const { data, error } = await supabase
        .from('cattle')
        .update({
          ...safeUpdateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', cattleId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, cattle: data };
    } catch (error) {
      console.error("Error Update Cattle:", error);
      if (error.code === '23505' && /code/i.test(error.message || '')) {
        return { success: false, error: 'Kode sapi ini sudah dipakai untuk salah satu ternak Anda. Gunakan kode lain.' };
      }
      return { success: false, error: error.message };
    }
  },

  // Delete cattle
  deleteCattle: async (cattleId) => {
    try {
      const { error } = await supabase
        .from('cattle')
        .delete()
        .eq('id', cattleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error Delete Cattle:", error);
      return { success: false, error: error.message };
    }
  }
};