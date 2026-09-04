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
        // Email ini sudah pernah dipakai daftar sebelumnya (baik berhasil
        // penuh, maupun sempat gagal di tengah jalan lalu dicoba lagi).
        // Pesan asli Supabase macam-macam redaksinya ("User already
        // registered", "already been registered", dst) — dicocokkan
        // longgar lewat kata "regist" supaya semua varian tertangkap,
        // lalu diarahkan ke tindakan yang jelas alih-alih pesan teknis.
        if (/regist/i.test(authError.message || '')) {
          throw new Error('Email ini sudah terdaftar. Silakan masuk lewat menu Masuk, atau pakai "Lupa kata sandi?" kalau lupa kata sandinya.');
        }
        // Jika rate limit, generate UUID lokal untuk user
        if (authError.status === 429 || authError.message?.includes('rate limit') || authError.message?.includes('too many') || authError.message?.includes('429')) {
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
        // Pendaftaran mandiri (bukan dibuatkan admin) selalu peternak.
        // Sebelumnya wajib menunggu persetujuan admin dulu (status
        // 'pending') — dihapus atas permintaan pengguna, sekarang
        // langsung aktif begitu daftar.
        role: 'peternak',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Jika pakai fallback UUID (rate limit), simpan password hash
      if (!sessionToken) {
        const passwordHash = await bcrypt.hash(trimmedPassword, 10);
        userInsertData.password_hash = passwordHash;
      }

      const { data: _profileResult, error: profileError } = await supabase
        .from('users')
        .insert([userInsertData])
        .select()
        .single();

      if (profileError) {
        console.error('Profile insert error:', profileError);
        // 23505 = unique constraint di tabel users (email atau nomor HP
        // sudah dipakai akun lain). Pesan mentah Postgres diganti supaya
        // peternak tahu persis apa yang perlu diubah, bukan sekadar
        // "gagal daftar" tanpa alasan.
        if (profileError.code === '23505') {
          if (/email/i.test(profileError.message || '')) {
            throw new Error('Email ini sudah terdaftar. Silakan masuk lewat menu Masuk, atau gunakan email lain.');
          }
          if (/phone/i.test(profileError.message || '')) {
            throw new Error('Nomor HP ini sudah terdaftar dengan akun lain. Gunakan nomor HP lain, atau hubungi admin dinas kalau ini memang nomor Anda.');
          }
        }
        throw new Error(`Gagal menyimpan profil: ${profileError.message}`);
      }

      // 3. Simpan user profile (JANGAN simpan password!)
      const safeUser = {
        id: userId,
        email: trimmedEmail,
        phone: trimmedPhone,
        ...profileData,
        role: 'peternak',
        status: 'approved',
      };
      saveUserToStorage(safeUser);

      if (sessionToken) saveTokenToStorage(sessionToken);

      return {
        success: true,
        user: safeUser,
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

      // 3. Coba authenticate dengan email ke Supabase Auth
      let token = null;

      // Jika user punya password_hash, verify dengan bcrypt (fallback user atau emergency)
      if (userRecord.password_hash) {
        const passwordMatch = await bcrypt.compare(trimmedPassword, userRecord.password_hash);
        if (!passwordMatch) {
          throw new Error('Password salah');
        }
      } else {
        // User dari Supabase Auth, authenticate normally
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

      // Save user profile to storage (JANGAN simpan password_hash!)
      const { password_hash: _password_hash, ...safeUserRecord } = userRecord;
      saveUserToStorage(safeUserRecord);

      return {
        success: true,
        user: safeUserRecord,
        token
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Masuk dengan Google (native, via idToken dari @capgo/capacitor-social-login).
  // Kalau akun ini belum pernah dipakai di SIRAPI, tabel `users` mewajibkan
  // phone/kecamatan/desa (NOT NULL) yang tidak disediakan Google — jadi hasilnya
  // needsProfile:true, dan pemanggil (AuthScreen) wajib tampilkan langkah
  // lengkapi data sebelum bisa masuk ke dashboard.
  loginWithGoogleIdToken: async (idToken) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (authError) throw new Error(authError.message);

      const authUser = authData.user;
      if (!authUser) throw new Error('Gagal masuk dengan Google');

      const token = authData.session?.access_token;
      if (token) saveTokenToStorage(token);

      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);

      if (userRecord) {
        const { password_hash: _password_hash, ...safeUserRecord } = userRecord;
        saveUserToStorage(safeUserRecord);
        return { success: true, needsProfile: false, user: safeUserRecord, token };
      }

      return {
        success: true,
        needsProfile: true,
        googleUser: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          photo: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        },
        token,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Lengkapi profil peternak setelah Google sign-in pertama kali (phone,
  // kecamatan, desa, dll — field yang tidak dikirim Google sama sekali).
  completeGoogleProfile: async (googleUser, profileData) => {
    try {
      const userInsertData = {
        id: googleUser.id,
        email: googleUser.email,
        phone: profileData.phone,
        name: profileData.name,
        kecamatan: profileData.kecamatan,
        desa: profileData.desa,
        dusun: profileData.dusun,
        rt: profileData.rt,
        rw: profileData.rw,
        photo: profileData.photo || googleUser.photo || null,
        role: 'peternak',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([userInsertData])
        .select()
        .single();

      if (error) throw new Error(`Gagal menyimpan profil: ${error.message}`);

      saveUserToStorage(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
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

      if (!userProfile) return null;
      const { password_hash: _password_hash, ...safeUserProfile } = userProfile;
      return safeUserProfile;
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
  },

  // Ganti password (mendukung user Supabase Auth normal maupun fallback bcrypt)
  changePassword: async (userId, oldPassword, newPassword) => {
    try {
      const trimmedOld = oldPassword.trim();
      const trimmedNew = newPassword.trim();

      if (trimmedNew.length < 6) {
        throw new Error('Password baru minimal 6 karakter');
      }

      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !userRecord) throw new Error('Data pengguna tidak ditemukan');

      if (userRecord.password_hash) {
        // User fallback (bcrypt) — verifikasi password lama, lalu update hash baru
        const isMatch = await bcrypt.compare(trimmedOld, userRecord.password_hash);
        if (!isMatch) throw new Error('Password lama salah');

        const newHash = await bcrypt.hash(trimmedNew, 10);
        const { error: updateError } = await supabase
          .from('users')
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) throw updateError;
      } else {
        // User Supabase Auth normal — verifikasi password lama via re-login, lalu update password
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: trimmedOld,
        });
        if (verifyError) throw new Error('Password lama salah');

        const { error: updateError } = await supabase.auth.updateUser({ password: trimmedNew });
        if (updateError) throw updateError;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Kirim link reset password ke email — untuk kasus benar-benar lupa password
  // (tidak perlu tahu password lama). Hanya berfungsi untuk akun Supabase Auth
  // normal; akun fallback bcrypt (kasus rate-limit saat registrasi) tetap
  // perlu dibantu petugas/admin karena tidak punya identitas Supabase Auth asli.
  requestPasswordReset: async (email) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) throw new Error('Email wajib diisi');

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
