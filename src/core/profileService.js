import { supabase } from './supabaseClient';

export const profileService = {
  // Upload profile photo
  uploadProfilePhoto: async (userId, file) => {
    try {
      if (!file) throw new Error('File tidak dipilih');

      // Generate unique file name
      const ext = file.name.split('.').pop();
      const fileName = `users/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
      
      console.log('Uploading to bucket: farm-photos');
      console.log('File path:', fileName);

      // First check if bucket exists by trying to list files
      const { data: bucketTest, error: bucketError } = await supabase.storage
        .from('farm-photos')
        .list('users', { limit: 1 });

      if (bucketError) {
        console.error('Bucket check failed:', bucketError);
        throw new Error('Storage bucket "farm-photos" tidak ditemukan. Harap buat bucket terlebih dahulu di Supabase Storage.');
      }

      const { data, error } = await supabase.storage
        .from('farm-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('farm-photos')
        .getPublicUrl(data.path);

      console.log('Upload success, URL:', publicUrl);
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user profile (name, photo)
  updateUserProfile: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get or create farm for user
  getFarm: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      return { success: true, farm: data || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create farm
  createFarm: async (userId, name, address) => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert([{
          user_id: userId,
          name: name.trim(),
          address: address.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, farm: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update farm
  updateFarm: async (farmId, name, address) => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .update({
          name: name.trim(),
          address: address.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', farmId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, farm: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
