import React, { useState, useEffect } from "react";
import { authService } from "./core/authService";
import { adminService } from "./core/adminService";
import { TUBAN_DATA } from "./core/constants";
import { Icon } from "./core/components/Icons";
import { supabase } from "./core/supabaseClient";
import logoTuban from "./Tubankab.png";

// Panel admin — web murni, tidak dibundel ke APK peternak (lihat main.jsx).
// Sengaja lebar penuh (bukan --app-w: 480px seperti aplikasi peternak)
// karena ini kerja meja kantor, bukan di HP.

function AdminLogin({ onLoggedIn }) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailOrPhone || !password) return setError("Isi email dan kata sandi.");
    setIsLoading(true);
    const result = await authService.login(emailOrPhone, password);
    setIsLoading(false);
    if (!result.success) return setError(result.error || "Login gagal.");
    if (result.user.role !== 'admin') {
      await authService.logout();
      return setError("Akun ini bukan akun admin.");
    }
    onLoggedIn(result.user);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <form onSubmit={handleSubmit} className="card card-pad" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <img src={logoTuban} alt="" style={{ width: 34, height: "auto" }} />
          <div>
            <p className="t-h3 c-1" style={{ margin: 0 }}>SIRAPI Admin</p>
            <p className="t-xs c-3" style={{ margin: 0 }}>Panel Dinas Ketahanan Pangan, Pertanian dan Perikanan Tuban</p>
          </div>
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input type="text" className="input" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} placeholder="admin@sirapi.local" autoFocus />
        </div>
        <div className="field">
          <label className="field-label">Kata sandi</label>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && (
          <div className="callout callout-crit" style={{ marginBottom: 16 }}>
            <Icon.alert size={17} stroke={2} /><span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg btn-block">
          {isLoading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

function PeternakBaruTab({ setToast }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await adminService.getPendingPeternak();
    if (result.success) setList(result.users);
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    setBusyId(id);
    const result = await adminService.setUserStatus(id, status);
    setBusyId(null);
    if (result.success) {
      setList(prev => prev.filter(u => u.id !== id));
      setToast({ message: status === 'approved' ? "Peternak disetujui." : "Peternak ditolak.", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
  };

  if (loading) return <p className="t-sm c-3">Memuat...</p>;
  if (list.length === 0) return <div className="empty"><p className="empty-title">Tidak ada yang menunggu</p><p className="empty-text">Semua pendaftaran peternak sudah diputuskan.</p></div>;

  return (
    <div className="rowlist">
      {list.map(u => (
        <div key={u.id} className="row" style={{ cursor: "default", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div className="row-main">
            <span className="row-title">{u.name}</span>
            <span className="row-sub">{u.phone} · {u.email}</span>
            <span className="row-sub">{u.desa}, {u.kecamatan}{u.dusun ? ` · Dusun ${u.dusun}` : ''}</span>
            <span className="t-xs c-3">Daftar: {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => decide(u.id, 'rejected')} disabled={busyId === u.id} className="btn btn-sm btn-danger">Tolak</button>
            <button onClick={() => decide(u.id, 'approved')} disabled={busyId === u.id} className="btn btn-sm btn-primary">Setujui</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PetugasTab({ session, setToast }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", kecamatan: "Tuban", desa: "Baturetno", password: "" });
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await adminService.getPetugasList();
    if (result.success) setList(result.users);
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleKecamatanChange = (kec) => setForm(f => ({ ...f, kecamatan: kec, desa: TUBAN_DATA[kec]?.[0] || "" }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      return setToast({ message: "Semua kolom wajib diisi.", type: "error" });
    }
    if (form.password.length < 6) return setToast({ message: "Kata sandi minimal 6 karakter.", type: "error" });

    setSaving(true);
    try {
      const res = await fetch('/api/admin-create-petugas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun.');
      setCreatedCreds({ email: form.email, password: form.password });
      setFormOpen(false);
      setForm({ name: "", email: "", phone: "", kecamatan: "Tuban", desa: "Baturetno", password: "" });
      load();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {createdCreds && (
        <div className="callout callout-ok" style={{ marginBottom: 16, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <strong>Akun petugas dibuat.</strong>
          <span>Sampaikan ke petugasnya secara langsung (WhatsApp/lisan) — kata sandi ini tidak akan ditampilkan lagi:</span>
          <span className="t-num" style={{ fontWeight: 700 }}>{createdCreds.email} / {createdCreds.password}</span>
          <button onClick={() => setCreatedCreds(null)} className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-end" }}>Tutup</button>
        </div>
      )}

      {!formOpen ? (
        <button onClick={() => setFormOpen(true)} className="btn btn-primary" style={{ marginBottom: 16 }}>
          <Icon.plus size={17} stroke={2.2} /> Tambah petugas
        </button>
      ) : (
        <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 20, maxWidth: 420 }}>
          <p className="t-h3 c-1" style={{ margin: "0 0 14px" }}>Petugas baru</p>
          <div className="field"><label className="field-label">Nama lengkap</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="field"><label className="field-label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="field"><label className="field-label">Nomor HP</label><input type="tel" className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="field"><label className="field-label">Wilayah tugas — Kecamatan</label>
            <select className="select" value={form.kecamatan} onChange={e => handleKecamatanChange(e.target.value)}>
              {Object.keys(TUBAN_DATA).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label">Desa</label>
            <select className="select" value={form.desa} onChange={e => setForm({...form, desa: e.target.value})}>
              {(TUBAN_DATA[form.kecamatan] || []).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label">Kata sandi awal</label><input type="text" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimal 6 karakter" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setFormOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>{saving ? "Menyimpan..." : "Buat akun"}</button>
          </div>
        </form>
      )}

      {loading ? <p className="t-sm c-3">Memuat...</p> : list.length === 0 ? (
        <div className="empty"><p className="empty-title">Belum ada petugas</p><p className="empty-text">Tambahkan akun petugas lapangan pertama.</p></div>
      ) : (
        <div className="rowlist">
          {list.map(u => (
            <div key={u.id} className="row" style={{ cursor: "default" }}>
              <div className="row-main">
                <span className="row-title">{u.name}</span>
                <span className="row-sub">{u.phone} · {u.email}</span>
                <span className="row-sub">Wilayah: {u.kecamatan}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LaporanTab({ setToast }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [peternakRes, cattleRes] = await Promise.all([
        adminService.getApprovedPeternak(),
        adminService.getCattleCount(),
      ]);
      if (!peternakRes.success) { setToast({ message: peternakRes.error, type: "error" }); setLoading(false); return; }
      const perKecamatan = {};
      peternakRes.users.forEach(u => { perKecamatan[u.kecamatan] = (perKecamatan[u.kecamatan] || 0) + 1; });
      setStats({
        totalPeternak: peternakRes.users.length,
        totalSapi: cattleRes.success ? cattleRes.count : null,
        perKecamatan: Object.entries(perKecamatan).sort((a, b) => b[1] - a[1]),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="t-sm c-3">Memuat...</p>;

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 24, maxWidth: 500 }}>
        <div className="stat">
          <span className="stat-label">Total peternak aktif</span>
          <span className="stat-value">{stats.totalPeternak}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total sapi tercatat</span>
          <span className="stat-value">{stats.totalSapi ?? '—'}</span>
        </div>
      </div>
      <p className="t-over" style={{ marginBottom: 10 }}>Sebaran per kecamatan</p>
      {stats.perKecamatan.length === 0 ? (
        <p className="t-sm c-3">Belum ada data.</p>
      ) : (
        <div className="rowlist" style={{ maxWidth: 500 }}>
          {stats.perKecamatan.map(([kec, count]) => (
            <div key={kec} className="row" style={{ cursor: "default" }}>
              <span className="row-main row-title">{kec}</span>
              <span className="t-bodystr">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('peternak');
  const [toast, setToast] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = await authService.getCurrentUser();
        if (user?.role === 'admin') {
          setAdmin(user);
          setSession(data.session);
        }
      }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (checking) return null;

  if (!admin) {
    return (
      <AdminLogin onLoggedIn={async (user) => {
        setAdmin(user);
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      }} />
    );
  }

  const TABS = [
    { key: 'peternak', label: 'Peternak Baru', icon: Icon.user },
    { key: 'petugas', label: 'Petugas', icon: Icon.stethoscope },
    { key: 'laporan', label: 'Laporan', icon: Icon.trendUp },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <header className="topbar" style={{ maxWidth: 960, margin: "0 auto", position: "static" }}>
        <div className="topbar-brand">
          <img src={logoTuban} alt="" className="topbar-logo" />
          <div>
            <p className="topbar-name">SIRAPI Admin</p>
            <p className="topbar-sub">{admin.name}</p>
          </div>
        </div>
        <button onClick={async () => { await authService.logout(); setAdmin(null); setSession(null); }} className="btn btn-sm btn-ghost">
          <Icon.logout size={17} /> Keluar
        </button>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div className="segmented" style={{ maxWidth: 420, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "active" : ""}>
              <t.icon size={16} stroke={2} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'peternak' && <PeternakBaruTab setToast={setToast} />}
        {tab === 'petugas' && <PetugasTab session={session} setToast={setToast} />}
        {tab === 'laporan' && <LaporanTab setToast={setToast} />}
      </div>

      {toast && (
        <div className="toast">
          {toast.type === "error" ? <Icon.alertCircle className="toast-icon" style={{ color: "var(--crit)" }} /> : <Icon.checkCircle className="toast-icon" style={{ color: "var(--ok)" }} />}
          <span className="toast-msg">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
