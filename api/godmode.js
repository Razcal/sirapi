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
import { analyzeCattle, applyReproAction } from '../src/core/analyzeCattle.js';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

// Sama persis dengan LABEL_BIRAHI di adminService.js (halaman Admin) -
// disalin (bukan diimpor) karena adminService.js membawa client Supabase
// sisi-anon-nya sendiri yang tidak perlu ikut ke sini. Kalau daftar label
// ini berubah di analyzeCattle.js/adminService.js, ingat update juga di
// sini supaya angka "Birahi/Siap Kawin" tetap sama di kedua tempat.
const LABEL_BIRAHI = new Set([
  'SIAP IB',
  'DARA SIAP KAWIN',
  'Siap Dikawinkan Kembali',
  'WASPADA: BIRAHI TERTUNDA',
]);

// Hash bcrypt dari password godmode - BUKAN password aslinya, tidak bisa
// dibalik jadi teks asli. Aman disimpan di kode.
const PASSWORD_HASH = '$2b$10$OuaufZhdaRD2qCrR9/.rsOIk90Nq9pv.PDujm040WQr.NfFj8Vs0.';

// Supabase/PostgREST diam-diam membatasi hasil .select() ke default
// max-rows (biasanya 1000) kalau tidak diberi .range() - TIDAK error,
// cuma memotong tanpa pemberitahuan. Ketahuan lewat totalCattle yang
// nempel persis di angka 1000 padahal baris sungguhannya 1047. Dipakai
// untuk semua penghitungan agregat penuh tabel cattle (stats,
// listProblems, listBirahi) - kalau tidak, angka birahi/gangguan/dst
// bisa diam-diam salah begitu tabelnya lewat 1000 baris.
async function fetchAllRows(buildQuery, pageSize = 1000) {
  let all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

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
        // "Total peternak" dkk HARUS didefinisikan persis sama dengan
        // halaman Admin biasa (lihat adminService.js getPeternakTanpaSapi:
        // role='peternak' saja - TIDAK ada lagi filter status='approved',
        // sistem persetujuan sudah dihapus, semua pendaftaran langsung
        // aktif) - kalau tidak, dua angka yang katanya sama-sama "total
        // peternak" bisa beda tampilannya (sempat kejadian: godmode ikut
        // menghitung 4 akun admin/petugas yang bukan peternak).
        const peternakRows = await fetchAllRows(() => db.from('users').select('id, kecamatan').eq('role', 'peternak'));
        const totalUsers = peternakRows.length;
        const peternakIds = new Set(peternakRows.map((u) => u.id));

        const { count: dummyUsers } = await db.from('users').select('id', { count: 'exact', head: true }).like('email', '%@demo.sirapi.id');

        const kecCounts = {};
        peternakRows.forEach((u) => { const k = u.kecamatan || '(kosong)'; kecCounts[k] = (kecCounts[k] || 0) + 1; });

        // Satu query buat semua sapi, dipakai bareng untuk phaseCounts, sudah
        // vs belum input sapi, DAN birahi/gangguan (adminService.js
        // getReproMonitoring) - lebih hemat daripada query berkali-kali
        // dengan filter beda-beda.
        const allCattle = await fetchAllRows(() => db.from('cattle').select('*'));
        const totalCattle = allCattle.length;
        const phaseCounts = {};
        const withCattleSet = new Set();
        let birahiCount = 0;
        let gangguanCount = 0;
        let kawinCount = 0;
        let buntingCount = 0;
        (allCattle || []).forEach((c) => {
          const p = c.status_reproduksi || 'N/A';
          phaseCounts[p] = (phaseCounts[p] || 0) + 1;
          if (!peternakIds.has(c.user_id)) return; // sapi nyasar milik akun bukan peternak - dilewati, sama seperti adminService.js
          withCattleSet.add(c.user_id);
          if (c.status_reproduksi === 'BRED') kawinCount++;
          else if (c.status_reproduksi === 'PREGNANT') buntingCount++;
          let analysis = null;
          try { analysis = analyzeCattle(c); } catch { /* data cacat - dilewati dari birahi/gangguan, tetap kehitung di phaseCounts */ }
          if (!analysis) return;
          if (analysis.needsVet) gangguanCount++;
          else if (LABEL_BIRAHI.has(analysis.statusLabel)) birahiCount++;
        });
        const usersWithCattle = withCattleSet.size;
        const usersWithoutCattle = totalUsers - usersWithCattle;

        return res.status(200).json({ totalUsers, totalCattle, dummyUsers, realUsers: (totalUsers || 0) - (dummyUsers || 0), usersWithCattle, usersWithoutCattle, birahiCount, gangguanCount, kawinCount, buntingCount, phaseCounts, kecCounts });
      }

      // Sapi bermasalah (status darurat menurut analyzeCattle - sama persis
      // logikanya dengan yang dipakai Dashboard peternak & notifikasi
      // harian, supaya tidak ada definisi "bermasalah" yang beda-beda) ATAU
      // sudah lama tidak ada aktivitas apa pun tercatat (updated_at lebih
      // tua dari `staleDays`, default 30 hari) - indikasi peternaknya tidak
      // rajin memperbarui datanya di aplikasi.
      case 'listProblems': {
        const staleDays = Number(payload?.staleDays) || 30;
        const cattleList = await fetchAllRows(() => db.from('cattle').select('*'));

        const userIds = [...new Set(cattleList.map(c => c.user_id))];
        const { data: userRows } = await db.from('users').select('id, name, email').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
        const ownerById = {};
        (userRows || []).forEach(u => { ownerById[u.id] = u; });

        const now = Date.now();
        const problems = cattleList.map((c) => {
          let analysis = null;
          try { analysis = analyzeCattle(c); } catch { /* data cacat - tetap ditampilkan sebagai masalah */ }
          const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : null;
          const daysSinceUpdate = updatedAt ? Math.floor((now - updatedAt) / 86400000) : null;
          const owner = ownerById[c.user_id];
          return {
            id: c.id, user_id: c.user_id, code: c.code,
            ownerName: owner?.name || '(peternak tidak ditemukan)',
            ownerEmail: owner?.email || '',
            statusLabel: analysis?.statusLabel || 'DATA TIDAK VALID',
            color: analysis?.color || 'rose',
            isUrgent: !!analysis?.isUrgent,
            daysSinceUpdate,
            isStale: daysSinceUpdate === null || daysSinceUpdate > staleDays,
          };
        }).filter((c) => c.isUrgent || c.isStale);

        problems.sort((a, b) => (b.isUrgent - a.isUrgent) || ((b.daysSinceUpdate ?? 9999) - (a.daysSinceUpdate ?? 9999)));
        return res.status(200).json({ problems, staleDays });
      }

      // Sapi birahi/siap kawin - metrik inti SIRAPI yang muncul paling
      // menonjol di halaman Admin ("Sapi birahi / siap kawin", mission
      // card pertama). Logikanya sama persis dengan adminService.js
      // getReproMonitoring: needsVet dikeluarkan dulu (itu domain
      // "gangguan", bukan birahi), baru dicocokkan ke LABEL_BIRAHI.
      case 'listBirahi': {
        const peternakRows = await fetchAllRows(() => db.from('users').select('id, name, phone, kecamatan, desa').eq('role', 'peternak'));
        const ownerById = {};
        peternakRows.forEach((u) => { ownerById[u.id] = u; });

        const cattleList = await fetchAllRows(() => db.from('cattle').select('*'));

        const birahi = [];
        cattleList.forEach((c) => {
          const owner = ownerById[c.user_id];
          if (!owner) return;
          let analysis = null;
          try { analysis = analyzeCattle(c); } catch { return; }
          if (!analysis || analysis.needsVet) return;
          if (!LABEL_BIRAHI.has(analysis.statusLabel)) return;
          birahi.push({
            id: c.id, user_id: c.user_id, code: c.code,
            ownerName: owner.name, ownerPhone: owner.phone, ownerKecamatan: owner.kecamatan, ownerDesa: owner.desa,
            statusLabel: analysis.statusLabel, advice: analysis.advice,
            updated_at: c.updated_at,
          });
        });

        birahi.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        return res.status(200).json({ birahi });
      }

      // Catat IB (Inseminasi Buatan) langsung dari tab Birahi/Siap Kawin -
      // dipakai applyReproAction yang SAMA persis dengan App.jsx (peternak)
      // dan petugasService.js (petugas), supaya efeknya konsisten (fase
      // jadi BRED, ibLog bertambah satu entri) - bukan nulis manual di sini.
      case 'recordKawin': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const { data: current, error: fetchErr } = await db.from('cattle').select('*').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        const today = new Date().toISOString().split('T')[0];
        const updated = applyReproAction(current, 'IB', null, today);
        const { id: _id, created_at: _c, user_id: _u, farm_id: _f, ...safe } = updated;
        const { data, error } = await db.from('cattle').update({ ...safe, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json({ cattle: data });
      }

      case 'listUsers': {
        const { search, onlyWithoutCattle } = payload || {};
        let q = db.from('users').select('id, name, email, phone, kecamatan, desa, dusun, role, status, created_at').order('created_at', { ascending: false }).limit(500);
        if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        // "Belum Input Sapi" itu metrik peternak, sama seperti di stats -
        // ikut disaring role juga di sini biar akun admin/petugas yang
        // memang tidak pernah punya sapi tidak ikut nongol di sini.
        if (onlyWithoutCattle) q = q.eq('role', 'peternak');
        const { data, error } = await q;
        if (error) throw error;

        // Jumlah sapi per peternak - supaya langsung kelihatan siapa yang
        // sudah dan belum pernah input sapi tanpa perlu klik satu-satu.
        const ids = data.map((u) => u.id);
        const cattleRows = ids.length
          ? await fetchAllRows(() => db.from('cattle').select('user_id').in('user_id', ids))
          : [];
        const countByUser = {};
        cattleRows.forEach((c) => { countByUser[c.user_id] = (countByUser[c.user_id] || 0) + 1; });
        let usersWithCount = data.map((u) => ({ ...u, cattleCount: countByUser[u.id] || 0 }));
        if (onlyWithoutCattle) usersWithCount = usersWithCount.filter((u) => u.cattleCount === 0);

        return res.status(200).json({ users: usersWithCount });
      }

      case 'listCattle': {
        const { search, userId, id } = payload || {};
        let q = db.from('cattle').select('*').order('created_at', { ascending: false }).limit(500);
        if (id) q = q.eq('id', id);
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
