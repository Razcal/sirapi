import { createClient } from '@supabase/supabase-js';

// Bikin akun petugas butuh Supabase Admin API (supabase.auth.admin.createUser)
// yang cuma bisa dipakai lewat service_role key — TIDAK BOLEH pernah dikirim
// ke browser. Makanya ini endpoint server, bukan panggilan langsung dari
// AdminApp.jsx ke Supabase seperti fungsi lain di adminService.js.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Pastikan yang memanggil ini benar-benar admin — verifikasi token
    // sesi pemanggil (bukan sekadar percaya body request).
    const authHeader = req.headers['authorization'] || '';
    const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!callerToken) return res.status(401).json({ error: 'Tidak ada sesi login.' });

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(callerToken);
    if (callerAuthError || !callerAuth?.user) return res.status(401).json({ error: 'Sesi login tidak valid.' });

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerAuth.user.id)
      .single();
    if (callerProfileError || callerProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang boleh membuat akun petugas.' });
    }

    // 2. Validasi input.
    const { email, phone, name, kecamatan, desa, password } = req.body || {};
    if (!email || !phone || !name || !kecamatan || !desa || !password) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }

    // 3. Buat akun Supabase Auth + baris profil petugas.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
    });
    if (createError) throw createError;

    const newUserId = created.user.id;
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: newUserId,
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        name: String(name).trim(),
        kecamatan,
        desa,
        role: 'petugas',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (profileError) {
      // Profil gagal tersimpan — jangan tinggalkan akun auth yatim piatu.
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw profileError;
    }

    return res.status(200).json({ success: true, user: profileRow });
  } catch (error) {
    console.error('Error creating petugas:', error);
    return res.status(500).json({ error: error.message });
  }
}
