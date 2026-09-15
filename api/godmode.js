// Panel super-admin tersembunyi (lihat GodModeApp.jsx) - satu-satunya jalur
// di seluruh aplikasi yang boleh menghapus akun peternak (tabel `users`
// menolak DELETE dari kunci publik/anon lewat RLS, lihat catatan di
// adminService.js/cattleService.js) dan melihat/mengubah data siapa saja
// tanpa batas. Pakai SUPABASE_SERVICE_ROLE_KEY (bypass RLS sepenuhnya) -
// KUNCI INI TIDAK BOLEH PERNAH diimpor ke kode sisi klien (src/), cuma
// boleh dipakai di sini (kode server, tidak pernah terkirim ke browser).
//
// Password diperiksa di server (bukan di klien) supaya "cuma saya sendiri
// yang bisa akses" itu benar-benar berlaku, bukan cuma URL yang disembunyikan
// - siapa pun yang membaca kode aplikasi (bisa dilihat semua orang, ini web
// app) tetap butuh password asli untuk berhasil lewat pemeriksaan di bawah.
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

// Hash bcrypt dari password godmode - BUKAN password aslinya, tidak bisa
// dibalik jadi teks asli. Aman disimpan di kode.
const PASSWORD_HASH = '$2b$10$OuaufZhdaRD2qCrR9/.rsOIk90Nq9pv.PDujm040WQr.NfFj8Vs0.';

let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return supabase;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, action, payload } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(401).json({ error: 'Password wajib diisi' });
  }
  const valid = await bcrypt.compare(password, PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Password salah' });

  const db = getSupabase();

  try {
    switch (action) {
      case 'stats': {
        const { count: totalUsers } = await db.from('users').select('id', { count: 'exact', head: true });
        const { count: totalCattle } = await db.from('cattle').select('id', { count: 'exact', head: true });
        const { count: dummyUsers } = await db.from('users').select('id', { count: 'exact', head: true }).like('email', '%@demo.sirapi.id');
        const { data: byPhase } = await db.from('cattle').select('status_reproduksi');
        const phaseCounts = {};
        (byPhase || []).forEach(c => { const p = c.status_reproduksi || 'N/A'; phaseCounts[p] = (phaseCounts[p] || 0) + 1; });
        const { data: byKec } = await db.from('users').select('kecamatan');
        const kecCounts = {};
        (byKec || []).forEach(u => { const k = u.kecamatan || '(kosong)'; kecCounts[k] = (kecCounts[k] || 0) + 1; });
        return res.status(200).json({ totalUsers, totalCattle, dummyUsers, realUsers: (totalUsers || 0) - (dummyUsers || 0), phaseCounts, kecCounts });
      }

      case 'listUsers': {
        const { search } = payload || {};
        let q = db.from('users').select('id, name, email, phone, kecamatan, desa, dusun, role, status, created_at').order('created_at', { ascending: false }).limit(500);
        if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ users: data });
      }

      case 'listCattle': {
        const { search, userId } = payload || {};
        let q = db.from('cattle').select('*').order('created_at', { ascending: false }).limit(500);
        if (userId) q = q.eq('user_id', userId);
        if (search) q = q.ilike('code', `%${search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ cattle: data });
      }

      case 'updateUser': {
        const { id, fields } = payload || {};
        if (!id || !fields) return res.status(400).json({ error: 'id dan fields wajib' });
        const { id: _drop, created_at: _c, ...safe } = fields;
        const { data, error } = await db.from('users').update(safe).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json({ user: data });
      }

      case 'deleteUser': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'id wajib' });
        await db.from('cattle').delete().eq('user_id', id);
        await db.from('farms').delete().eq('user_id', id);
        await db.from('push_subscriptions').delete().eq('user_id', id);
        const { error } = await db.from('users').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // Peternak baru + kandangnya sekaligus (matching alur register() biasa,
      // tapi tanpa Supabase Auth - langsung pakai password_hash seperti
      // akun bcrypt-fallback lain). Kalau password tidak diisi, pakai
      // password demo default.
      case 'createUser': {
        const { fields, password: newPw } = payload || {};
        if (!fields?.name || !fields?.email || !fields?.phone) {
          return res.status(400).json({ error: 'Nama, email, dan No. HP wajib diisi' });
        }
        const id = uuid();
        const nowIso = new Date().toISOString();
        const passwordHash = await bcrypt.hash(newPw || 'sirapi123', 10);
        const userRow = {
          id,
          email: fields.email.trim().toLowerCase(),
          phone: fields.phone.trim(),
          name: fields.name.trim(),
          kecamatan: fields.kecamatan || '',
          desa: fields.desa || '',
          dusun: fields.dusun || '',
          rt: fields.rt || '',
          rw: fields.rw || '',
          photo: null,
          role: fields.role || 'peternak',
          status: 'approved',
          password_hash: passwordHash,
          created_at: nowIso,
          updated_at: nowIso,
        };
        const { data: user, error } = await db.from('users').insert([userRow]).select().single();
        if (error) throw error;
        const { error: farmErr } = await db.from('farms').insert([{
          id: uuid(), user_id: id, name: `Kandang ${userRow.name}`,
          address: `Desa ${userRow.desa}, Kec. ${userRow.kecamatan}, Kab. Tuban`,
          created_at: nowIso, updated_at: nowIso,
        }]);
        if (farmErr) throw farmErr;
        return res.status(200).json({ user });
      }

      // Reset password peternak - butuh ini karena TIDAK ADA cara lain di
      // seluruh aplikasi untuk admin mereset password peternak yang lupa
      // (fitur "lupa password" yang ada di app cuma untuk akun Google Auth).
      case 'resetPassword': {
        const { id, newPassword } = payload || {};
        if (!id || !newPassword) return res.status(400).json({ error: 'id dan newPassword wajib' });
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const { error } = await db.from('users').update({ password_hash: passwordHash }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      case 'updateCattle': {
        const { id, fields } = payload || {};
        if (!id || !fields) return res.status(400).json({ error: 'id dan fields wajib' });
        const { id: _drop, created_at: _c, user_id: _u, farm_id: _f, ...safe } = fields;
        const { data, error } = await db.from('cattle').update(safe).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json({ cattle: data });
      }

      case 'deleteCattle': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const { error } = await db.from('cattle').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // Sapi baru untuk peternak manapun. Kandangnya diambil otomatis kalau
      // sudah punya (biasanya iya), dibuatkan kalau belum - sama seperti
      // alur AddModal di aplikasi peternak biasa.
      case 'createCattle': {
        const { userId, fields } = payload || {};
        if (!userId || !fields?.code) return res.status(400).json({ error: 'userId dan code wajib' });

        let { data: farm } = await db.from('farms').select('id').eq('user_id', userId).limit(1).maybeSingle();
        if (!farm) {
          const { data: user } = await db.from('users').select('name, desa, kecamatan').eq('id', userId).single();
          const nowIso = new Date().toISOString();
          const { data: newFarm, error: farmErr } = await db.from('farms').insert([{
            id: uuid(), user_id: userId, name: `Kandang ${user?.name || 'Peternak'}`,
            address: `Desa ${user?.desa || ''}, Kec. ${user?.kecamatan || ''}, Kab. Tuban`,
            created_at: nowIso, updated_at: nowIso,
          }]).select().single();
          if (farmErr) throw farmErr;
          farm = newFarm;
        }

        const { data: cattle, error } = await db.from('cattle').insert([{
          farm_id: farm.id,
          user_id: userId,
          ...fields,
          code: String(fields.code).trim().toUpperCase(),
          updated_at: new Date().toISOString(),
        }]).select().single();
        if (error) throw error;
        return res.status(200).json({ cattle });
      }

      default:
        return res.status(400).json({ error: 'Aksi tidak dikenal: ' + action });
    }
  } catch (error) {
    console.error('Godmode error:', error);
    return res.status(500).json({ error: error.message });
  }
}
