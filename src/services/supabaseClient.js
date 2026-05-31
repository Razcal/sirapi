import { createClient } from '@supabase/supabase-js';

// Ganti dengan credentials Supabase Anda
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://trglvemivnrswzxjphgz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KOhGhtJqGrqWxIsMO4wTOA_iTnk_daB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper untuk session management
export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('proverti_user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

export const saveUserToStorage = (user) => {
  localStorage.setItem('proverti_user', JSON.stringify(user));
};

export const clearUserFromStorage = () => {
  localStorage.removeItem('proverti_user');
  localStorage.removeItem('proverti_token');
};

export const getStoredToken = () => {
  return localStorage.getItem('proverti_token');
};

export const saveTokenToStorage = (token) => {
  localStorage.setItem('proverti_token', token);
};
