import { supabase, saveUserToStorage, saveTokenToStorage } from './supabaseClient';
import bcrypt from 'bcryptjs';

// Helper function to generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const authService = {
  // Register/Sign Up
  register: async (email, phone, password, profileData) => {
    try {
      // Trim password untuk pastikan tidak ada spasi
      const trimmedPassword = password.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone.trim();

      // 1. Create auth user dengan email (dengan error handling untuk rate limit)
      let userId = null;
      let sessionToken = null;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      console.log('Signup response:', {
        error: authError ? authError.message : null,
        userId: authData?.user?.id,
        sessionToken: authData?.session?.access_token ? 'YES' : 'NO',
      });

      if (authError) {
        // Jika rate limit, generate UUID lokal untuk user
        if (authError.message?.includes('rate limit') || authError.message?.includes('too many') || authError.message?.includes('429')) {
          console.warn('Rate limit terdeteksi, menggunakan fallback UUID...');
          userId = generateUUID();
          sessionToken = null;
          // Tidak ada session token, akan langsung login nanti
        } else {
          throw new Error(authError.message);
        }
      } else {
        userId = authData.user?.id;
        sessionToken = authData.session?.access_token || authData.user?.access_token;
        
        if (!userId) throw new Error('User tidak terregistrasi');

        console.log('Signup success - setting session...');
        // Set session secara manual (untuk handle email confirmation)
        if (sessionToken) {
          try {
            await supabase.auth.setSession({
              access_token: sessionToken,
              refresh_token: authData.session?.refresh_token || ''
            });
          } catch (e) {
            console.warn('Session set error:', e.message);
          }
        }
      }

      // 2. Insert user profile ke table
      // Jika pakai fallback ID (rate limit), hash password untuk disimpan
      let userInsertData = {
        id: userId,
        email: trimmedEmail,
        phone: trimmedPhone,
        name: profileData.name,
        kecamatan: profileData.kecamatan,
        desa: profileData.desa,
        dusun: profileData.dusun,
        rt: profileData.rt,
        rw: profileData.rw,
        photo: profileData.photo || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Jika pakai fallback UUID (rate limit), simpan password hash
      if (!sessionToken) {
        console.log('Using fallback registration - hashing password...');
        const passwordHash = await bcrypt.hash(trimmedPassword, 10);
        console.log('Password hashing for fallback user:');
        console.log('- Original password:', trimmedPassword);
        console.log('- Hash generated:', passwordHash);
        userInsertData.password_hash = passwordHash;
      } else {
        console.log('Using normal registration - password handled by Supabase Auth');
      }

      const { data: profileResult, error: profileError } = await supabase
        .from('users')
        .insert([userInsertData])
        .select()
        .single();

      if (profileError) {
        console.error('Profile insert error:', profileError);
        throw new Error(`Gagal menyimpan profil: ${profileError.message}`);
      }

      // 3. Simpan user profile (JANGAN simpan password!)
      saveUserToStorage({
        id: userId,
        email: trimmedEmail,
        phone: trimmedPhone,
        ...profileData
      });

      if (sessionToken) saveTokenToStorage(sessionToken);

      return {
        success: true,
        user: {
          id: userId,
          email: trimmedEmail,
          phone: trimmedPhone,
          ...profileData
        },
        token: sessionToken
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Login/Sign In - bisa dengan email atau phone
  login: async (emailOrPhone, password) => {
    try {
      // Trim input
      const trimmedInput = emailOrPhone.trim();
      const trimmedPassword = password.trim();

      // 1. Tentukan apakah input adalah email atau phone
      const isEmail = trimmedInput.includes('@');
      
      // 2. Cari user di database berdasarkan email atau phone
      let userRecord;
      if (isEmail) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', trimmedInput.toLowerCase())
          .single();
        if (error) throw new Error('Email tidak ditemukan');
        userRecord = data;
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', trimmedInput)
          .single();
        if (error) throw new Error('Nomor HP tidak ditemukan');
        userRecord = data;
      }

      if (!userRecord) throw new Error('User tidak ditemukan');

      // Check if user ID is fallback UUID (not from Supabase Auth)
      const isFallbackUser = userRecord.id && userRecord.id.startsWith('user_');
      
      console.log('Login attempt:');
      console.log('- User ID:', userRecord.id);
      console.log('- Is fallback user:', isFallbackUser);
      console.log('- Has password hash:', !!userRecord.password_hash);

      // 3. Coba authenticate dengan email ke Supabase Auth
      let token = null;
      
      // Jika user punya password_hash, verify dengan bcrypt (fallback user atau emergency)
      if (userRecord.password_hash) {
        console.log('User has password_hash - using bcrypt verification...');
        console.log('- Input password:', trimmedPassword);
        console.log('- Stored hash:', userRecord.password_hash);
        
        const passwordMatch = await bcrypt.compare(trimmedPassword, userRecord.password_hash);
        console.log('- Password match result:', passwordMatch);
        
        if (!passwordMatch) {
          throw new Error('Password salah');
        }
        console.log('Bcrypt verification successful!');
      } else {
        // User dari Supabase Auth, authenticate normally
        console.log('User has no password_hash - using Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: trimmedPassword,
        });

        if (authError) {
          throw new Error('Password salah');
        }

        token = authData.session?.access_token;
        if (token) saveTokenToStorage(token);
      }

      // Save user profile to storage
      saveUserToStorage(userRecord);

      return {
        success: true,
        user: userRecord,
        token
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return userProfile;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Update user profile
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
  }
};
