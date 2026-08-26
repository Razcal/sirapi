import React, { useState, useEffect } from "react";
import { authService } from "./core/authService";
import { adminService } from "./core/adminService";
import { TUBAN_DATA } from "./core/constants";
import { Icon } from "./core/components/Icons";
import { BarList, AreaChart } from "./core/components/Charts";
import { supabase } from "./core/supabaseClient";
import { petugasService } from "./core/petugasService";
import { analyzeCattle } from "./core/analyzeCattle";
import logoTuban from "./Tubankab.png";

// Panel admin — web murni, tidak dibundel ke APK peternak (lihat main.jsx).
// Sengaja lebar penuh dengan sidebar tetap (bukan --app-w: 480px seperti
// aplikasi peternak) karena ini kerja meja kantor, bukan di HP. Sidebar
// memakai gradasi "aurora" yang sama dengan layar pembuka peternak — satu
// identitas visual SIRAPI, dipakai di dua konteks berbeda.

const nf = new Intl.NumberFormat("id-ID");
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const waLink = (phone, pesan) => `https://wa.me/${String(phone).replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(pesan)}`;

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
    <div style={{ minHeight: "100dvh", display: "flex" }}>
      {/* Panel kiri — identitas, memakai gradasi aurora yang sama dengan
          layar pembuka peternak, supaya login admin tidak terasa seperti
          alat lepas dari aplikasi utama. Disembunyikan di layar sempit. */}
      <div className="aurora" style={{ position: "relative", flex: "0 0 44%", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 40 }} data-hide-narrow>
        <div className="aurora-rings" />
        <div className="aurora-grain" />
        <style>{`@media (max-width: 860px){ [data-hide-narrow]{ display: none !important; } }`}</style>
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
            <img src={logoTuban} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>SIRAPI</span>
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.25, margin: "0 0 12px", maxWidth: 360 }}>
            Pusat kendali reproduksi ternak Kabupaten Tuban.
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,.62)", lineHeight: 1.6, margin: 0, maxWidth: 340 }}>
            Validasi pendaftaran peternak, kelola akun petugas lapangan, dan pantau sebaran ternak per kecamatan dari satu tempat.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
        <form onSubmit={handleSubmit} className="card card-pad" style={{ width: "100%", maxWidth: 380 }}>
          <p className="t-h2 c-1" style={{ margin: "0 0 4px" }}>Masuk sebagai admin</p>
          <p className="t-xs c-3" style={{ margin: "0 0 20px" }}>Dinas Ketahanan Pangan, Pertanian dan Perikanan Tuban</p>
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
    </div>
  );
}

/* ------------------------------------------------------- RINGKASAN ----- */

function RingkasanTab({ data, loading, onJumpToPeternak, onJumpToPemantauan }) {
  if (loading) return <p className="t-sm c-3">Memuat...</p>;

  const { totalPeternak, totalSapi, totalPetugas, pending, perKecamatan, birahi, gangguan } = data;

  return (
    <div>
      {/* Inti tujuan SIRAPI — bukan hitung peternak/sapi, tapi sapi mana yang
          birahi (siap kawin sekarang) dan mana yang diduga ada gangguan
          reproduksi. Sengaja ditaruh paling atas, lebih besar dari stat
          tile administratif di bawahnya. */}
      <div className="mission-grid">
        <button className="mission-card is-warn" onClick={() => onJumpToPemantauan('birahi')}>
          <div className="mission-card-head">
            <span className="mission-icon"><Icon.heart size={18} stroke={2.2} /></span>
            <span className="mission-count">{nf.format(birahi.length)}</span>
          </div>
          <div>
            <p className="mission-label">Sapi birahi / siap kawin</p>
            <p className="mission-desc">Waktunya IB sekarang — jangan sampai terlewat siklusnya.</p>
          </div>
        </button>
        <button className="mission-card is-crit" onClick={() => onJumpToPemantauan('gangguan')}>
          <div className="mission-card-head">
            <span className="mission-icon"><Icon.alertCircle size={18} stroke={2.2} /></span>
            <span className="mission-count">{nf.format(gangguan.length)}</span>
          </div>
          <div>
            <p className="mission-label">Gangguan reproduksi</p>
            <p className="mission-desc">Diduga ada masalah — perlu petugas/dokter hewan segera.</p>
          </div>
        </button>
      </div>

      <div className="stat-grid-4" style={{ marginBottom: 22 }}>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Peternak aktif</span>
            <span className="stat-icon"><Icon.user size={15} stroke={2.2} /></span>
          </div>
          <span className="stat-value">{nf.format(totalPeternak)}</span>
        </div>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Sapi tercatat</span>
            <span className="stat-icon"><Icon.cow size={15} stroke={2.2} /></span>
          </div>
          <span className="stat-value">{totalSapi ?? '—'}</span>
        </div>
        <div
          className={`stat ${pending.length > 0 ? 'is-warn stat-clickable' : ''}`}
          onClick={pending.length > 0 ? onJumpToPeternak : undefined}
          role={pending.length > 0 ? "button" : undefined}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Menunggu persetujuan</span>
            <span className="stat-icon"><Icon.clock size={15} stroke={2.2} /></span>
          </div>
          <span className="stat-value">{nf.format(pending.length)}</span>
          {pending.length > 0 && <span className="stat-meta" style={{ color: "var(--warn)" }}>Lihat &rarr;</span>}
        </div>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Petugas lapangan</span>
            <span className="stat-icon"><Icon.stethoscope size={15} stroke={2.2} /></span>
          </div>
          <span className="stat-value">{nf.format(totalPetugas)}</span>
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 14 }}>Sebaran peternak per kecamatan</p>
          {perKecamatan.length === 0 ? (
            <p className="t-sm c-3">Belum ada data.</p>
          ) : (
            <BarList items={perKecamatan.map(([kec, count]) => ({ label: kec, nilai: count }))} />
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p className="t-over" style={{ margin: 0 }}>Pendaftaran terbaru</p>
            {pending.length > 0 && (
              <button onClick={onJumpToPeternak} className="btn btn-sm btn-ghost" style={{ padding: "4px 8px" }}>Lihat semua</button>
            )}
          </div>
          {pending.length === 0 ? (
            <p className="t-sm c-3">Tidak ada yang menunggu persetujuan.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="admin-avatar" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>{initials(u.name)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="t-smstr c-1" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</p>
                    <p className="t-xs c-3" style={{ margin: 0 }}>{u.kecamatan} · {fmtDate(u.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ PEMANTAUAN ----- */

function ReproRow({ row }) {
  const { cattle, analysis, peternak } = row;
  return (
    <div className="row" style={{ cursor: "default", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <div className="row-main">
        <span className="row-title">{cattle.code || cattle.id} <span className="c-3" style={{ fontWeight: 500 }}>· {peternak.name}</span></span>
        <span className="row-sub">{analysis.statusLabel}</span>
        <span className="t-xs c-3">{peternak.desa}, {peternak.kecamatan}</span>
      </div>
      <a href={waLink(peternak.phone, `Halo Pak/Bu ${peternak.name}, dari Dinas mau menindaklanjuti sapi ${cattle.code || cattle.id} — ${analysis.statusLabel}.`)}
         className="btn btn-sm btn-secondary">
        <Icon.phone size={14} stroke={2.2} /> Hubungi
      </a>
    </div>
  );
}

function PemantauanTab({ data, loading, jumpTo }) {
  const [section, setSection] = useState(jumpTo || 'birahi');
  useEffect(() => { if (jumpTo) setSection(jumpTo); }, [jumpTo]);

  if (loading) return <p className="t-sm c-3">Memuat...</p>;
  const { birahi, gangguan } = data;
  const list = section === 'birahi' ? birahi : gangguan;

  return (
    <div>
      <div className="segmented" style={{ maxWidth: 420, marginBottom: 18 }}>
        <button onClick={() => setSection('birahi')} className={section === 'birahi' ? 'active' : ''}>
          <Icon.heart size={15} stroke={2.2} /> Birahi ({birahi.length})
        </button>
        <button onClick={() => setSection('gangguan')} className={section === 'gangguan' ? 'active' : ''}>
          <Icon.alertCircle size={15} stroke={2.2} /> Gangguan ({gangguan.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{section === 'birahi' ? "Tidak ada yang birahi saat ini" : "Tidak ada gangguan reproduksi terdeteksi"}</p>
          <p className="empty-text">{section === 'birahi' ? "Belum ada sapi yang perlu di-IB sekarang." : "Semua sapi dalam kondisi terpantau baik."}</p>
        </div>
      ) : (
        <div className="rowlist">
          {list.map(row => <ReproRow key={row.cattle.id} row={row} />)}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- LAPORAN ----- */

// Bukan potret "hari ini" seperti Ringkasan/Pemantauan — ini empat sudut
// pandang untuk memutuskan PROGRAM: kecamatan mana yang paling butuh
// perhatian, jenis gangguan apa yang paling sering (menentukan jenis
// program), di mana sosialisasi aplikasi paling dibutuhkan, dan apakah
// tren membaik atau memburuk dari waktu ke waktu.
function LaporanTab({ data }) {
  const { gangguan } = data;
  const [tanpaSapi, setTanpaSapi] = useState(null);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    adminService.getPeternakTanpaSapi().then(res => { if (res.success) setTanpaSapi(res); });
    adminService.getGangguanTrend().then(res => { if (res.success) setTrend(res.months); });
  }, []);

  const perKecamatan = {};
  gangguan.forEach(row => { perKecamatan[row.peternak.kecamatan] = (perKecamatan[row.peternak.kecamatan] || 0) + 1; });
  const gangguanPerKecamatan = Object.entries(perKecamatan).sort((a, b) => b[1] - a[1]).map(([label, nilai]) => ({ label, nilai }));

  const perJenis = {};
  gangguan.forEach(row => { perJenis[row.analysis.statusLabel] = (perJenis[row.analysis.statusLabel] || 0) + 1; });
  const jenisGangguan = Object.entries(perJenis).sort((a, b) => b[1] - a[1]).map(([label, nilai]) => ({ label, nilai }));

  return (
    <div>
      <div className="admin-grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Gangguan reproduksi per kecamatan</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Kecamatan dengan kasus terbanyak — pertimbangkan kirim petugas/dokter hewan ke sana lebih dulu.</p>
          <BarList items={gangguanPerKecamatan} tone="crit" />
        </div>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Jenis gangguan yang paling sering</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Menentukan jenis programnya — pelatihan teknik IB, penyuluhan nutrisi, atau kirim dokter hewan.</p>
          <BarList items={jenisGangguan} tone="crit" />
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Peternak belum input sapi{tanpaSapi ? ` (${tanpaSapi.total})` : ''}</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Peternak sudah disetujui tapi belum pernah catat sapi — sosialisasi/pendampingan aplikasi paling dibutuhkan di sini.</p>
          {tanpaSapi === null ? <p className="t-sm c-3">Memuat...</p> : tanpaSapi.total === 0 ? (
            <p className="t-sm c-3">Semua peternak aktif sudah input minimal 1 sapi.</p>
          ) : (
            <BarList items={tanpaSapi.perKecamatan.map(([label, nilai]) => ({ label, nilai }))} tone="warn" />
          )}
        </div>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Tren laporan masalah reproduksi</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Hasil PKB negatif per bulan, 6 bulan terakhir — naik berarti perlu dievaluasi, turun berarti program yang jalan berhasil.</p>
          {trend === null ? <p className="t-sm c-3">Memuat...</p> : <AreaChart data={trend} satuan="laporan" />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- PETERNAK BARU ----- */

function PeternakBaruTab({ setToast, onListChange }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await adminService.getPendingPeternak();
    if (result.success) { setList(result.users); onListChange?.(result.users); }
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    setBusyId(id);
    const result = await adminService.setUserStatus(id, status);
    setBusyId(null);
    if (result.success) {
      const next = list.filter(u => u.id !== id);
      setList(next);
      onListChange?.(next);
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
          <span className="admin-avatar" style={{ background: "var(--brand-soft)", color: "var(--brand)", marginTop: 2 }}>{initials(u.name)}</span>
          <div className="row-main">
            <span className="row-title">{u.name}</span>
            <span className="row-sub">{u.phone} · {u.email}</span>
            <span className="row-sub">{u.desa}, {u.kecamatan}{u.dusun ? ` · Dusun ${u.dusun}` : ''}</span>
            <span className="t-xs c-3">Daftar: {fmtDate(u.created_at)}</span>
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

// Direktori lengkap semua peternak (bukan cuma yang menunggu) — "lihat
// semua data" yang diminta: cari, klik satu orang, lihat & edit profilnya
// plus semua sapi miliknya lewat UserDetailModal.
function SemuaPeternakTab({ setToast }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await adminService.getAllPeternak();
    if (result.success) setList(result.users);
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const q = query.trim().toLowerCase();
  const filtered = !q ? list : list.filter(u =>
    u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.desa?.toLowerCase().includes(q) || u.kecamatan?.toLowerCase().includes(q)
  );

  const STATUS_BADGE = { approved: 'badge-ok', pending: 'badge-warn', rejected: 'badge-crit' };
  const STATUS_LABEL = { approved: 'Aktif', pending: 'Menunggu', rejected: 'Ditolak' };

  return (
    <div>
      <div className="input-icon" style={{ marginBottom: 16, maxWidth: 420 }}>
        <Icon.search size={18} />
        <input className="input" placeholder="Cari nama, HP, desa, atau kecamatan..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? <p className="t-sm c-3">Memuat...</p> : filtered.length === 0 ? (
        <p className="t-sm c-3">{q ? "Tidak ditemukan." : "Belum ada peternak terdaftar."}</p>
      ) : (
        <div className="rowlist">
          {filtered.map(u => (
            <button key={u.id} onClick={() => setSelected(u)} className="row">
              <span className="admin-avatar" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>{initials(u.name)}</span>
              <div className="row-main">
                <span className="row-title">{u.name}</span>
                <span className="row-sub">{u.phone} · {u.desa}, {u.kecamatan}</span>
              </div>
              <span className={`badge ${STATUS_BADGE[u.status] || 'badge-neut'}`}>{STATUS_LABEL[u.status] || u.status}</span>
              <Icon.chevronRight size={17} className="row-chev" />
            </button>
          ))}
        </div>
      )}

      <UserDetailModal
        user={selected} kind="peternak" open={!!selected} setToast={setToast}
        onClose={() => setSelected(null)}
        onSaved={(updated) => { setList(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u)); setSelected(updated); }}
      />
    </div>
  );
}

// Pembungkus tab Peternak: "Menunggu" (persetujuan, alur lama tak
// berubah) dan "Semua" (direktori lengkap, baru).
function PeternakTab({ setToast, onListChange }) {
  const [section, setSection] = useState('semua');
  return (
    <div>
      <div className="segmented" style={{ maxWidth: 320, marginBottom: 18 }}>
        <button onClick={() => setSection('semua')} className={section === 'semua' ? 'active' : ''}>Semua Peternak</button>
        <button onClick={() => setSection('menunggu')} className={section === 'menunggu' ? 'active' : ''}>Menunggu</button>
      </div>
      {section === 'menunggu'
        ? <PeternakBaruTab setToast={setToast} onListChange={onListChange} />
        : <SemuaPeternakTab setToast={setToast} />}
    </div>
  );
}

/* -------------------------------------------------------- DETAIL AKUN ----- */

// Panel "spek dewa": lihat & edit profil, reset kata sandi, dan (khusus
// peternak) lihat semua sapi miliknya — dipakai dari tab Peternak (Semua)
// maupun Petugas. Satu komponen untuk dua konteks supaya tidak ada dua
// form edit yang bisa saling melenceng.
function UserDetailModal({ user, kind, open, onClose, setToast, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cattle, setCattle] = useState(null); // null = belum dimuat
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name, phone: user.phone, kecamatan: user.kecamatan, desa: user.desa });
    setNewPassword("");
    setCattle(null);
    if (kind === 'peternak') {
      petugasService.getCattleByFarmer(user.id).then(res => { if (res.success) setCattle(res.cattle); });
    }
  }, [user, kind]);

  if (!open || !user || !form) return null;

  const handleKecamatanChange = (kec) => setForm(f => ({ ...f, kecamatan: kec, desa: TUBAN_DATA[kec]?.[0] || "" }));

  const saveProfile = async () => {
    setSaving(true);
    const res = await adminService.updateUserProfile(user.id, form);
    setSaving(false);
    if (res.success) { setToast({ message: "Profil diperbarui.", type: "success" }); onSaved?.(res.user); }
    else setToast({ message: res.error, type: "error" });
  };

  const doResetPassword = async () => {
    if (newPassword.trim().length < 6) return setToast({ message: "Kata sandi minimal 6 karakter.", type: "error" });
    setResetting(true);
    const res = await adminService.resetUserPassword(user.id, newPassword);
    setResetting(false);
    if (res.success) { setToast({ message: `Kata sandi ${user.name} berhasil direset.`, type: "success" }); setNewPassword(""); }
    else setToast({ message: res.error, type: "error" });
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            <p className="t-h3 c-1" style={{ margin: 0 }}>{user.name}</p>
            <p className="t-xs c-3" style={{ margin: "2px 0 0" }}>{kind === 'peternak' ? 'Peternak' : 'Petugas'} · {user.email}</p>
          </div>
          <button onClick={onClose} className="icon-btn"><Icon.close size={17} /></button>
        </div>

        <div className="sheet-body">
          <p className="t-over" style={{ marginBottom: 10 }}>Profil</p>
          <div className="field"><label className="field-label">Nama lengkap</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field"><label className="field-label">Nomor HP</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label className="field-label">Kecamatan</label>
              <select className="select" value={form.kecamatan} onChange={e => handleKecamatanChange(e.target.value)}>
                {Object.keys(TUBAN_DATA).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}><label className="field-label">Desa</label>
              <select className="select" value={form.desa} onChange={e => setForm({ ...form, desa: e.target.value })}>
                {(TUBAN_DATA[form.kecamatan] || []).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "Menyimpan..." : "Simpan profil"}
          </button>

          <hr className="divider" style={{ margin: "22px 0" }} />

          <p className="t-over" style={{ marginBottom: 6 }}>Reset kata sandi</p>
          <p className="t-xs c-3" style={{ margin: "0 0 10px" }}>
            Sampaikan kata sandi baru ke pemiliknya secara langsung (WhatsApp/lisan) — tidak ditampilkan lagi setelah ini.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text" className="input" style={{ flex: 1 }}
              placeholder="Kata sandi baru (min. 6 karakter)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />
            <button onClick={doResetPassword} disabled={resetting} className="btn btn-secondary btn-sm">
              {resetting ? "..." : "Reset"}
            </button>
          </div>

          {kind === 'peternak' && (
            <>
              <hr className="divider" style={{ margin: "22px 0" }} />
              <p className="t-over" style={{ marginBottom: 10 }}>Sapi milik peternak ini{cattle ? ` (${cattle.length})` : ''}</p>
              {cattle === null ? (
                <p className="t-sm c-3">Memuat...</p>
              ) : cattle.length === 0 ? (
                <p className="t-sm c-3">Belum ada sapi terdaftar.</p>
              ) : (
                <div className="rowlist">
                  {cattle.map(item => {
                    let a = null;
                    try { a = analyzeCattle(item); } catch { /* data sapi ini tak lengkap, tampilkan apa adanya */ }
                    return (
                      <div key={item.id} className="row" style={{ cursor: "default" }}>
                        <div className="row-main">
                          <span className="row-title">{item.code || item.id}</span>
                          <span className="row-sub">{a?.statusLabel || 'Data belum lengkap'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- PETUGAS ----- */

function PetugasTab({ session, setToast, onListChange }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", kecamatan: "Tuban", desa: "Baturetno", password: "" });
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await adminService.getPetugasList();
    if (result.success) { setList(result.users); onListChange?.(result.users); }
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
            <button key={u.id} onClick={() => setSelected(u)} className="row">
              <span className="admin-avatar" style={{ background: "var(--info-bg)", color: "var(--info)" }}>{initials(u.name)}</span>
              <div className="row-main">
                <span className="row-title">{u.name}</span>
                <span className="row-sub">{u.phone} · {u.email}</span>
                <span className="row-sub">Wilayah: {u.kecamatan}</span>
              </div>
              <Icon.chevronRight size={17} className="row-chev" />
            </button>
          ))}
        </div>
      )}

      <UserDetailModal
        user={selected} kind="petugas" open={!!selected} setToast={setToast}
        onClose={() => setSelected(null)}
        onSaved={(updated) => { setList(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u)); setSelected(updated); }}
      />
    </div>
  );
}

/* ================================================================== */

export default function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('ringkasan');
  const [toast, setToast] = useState(null);
  const [checking, setChecking] = useState(true);

  // Data agregat dipakai di Ringkasan; sub-tab lain melaporkan lewat
  // onListChange supaya angka di kartu ringkasan & lencana sidebar tetap
  // sinkron begitu admin menyetujui/menolak/menambah, tanpa refetch ganda.
  const [overview, setOverview] = useState({ totalPeternak: 0, totalSapi: null, totalPetugas: 0, pending: [], perKecamatan: [], birahi: [], gangguan: [] });
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [pemantauanJump, setPemantauanJump] = useState(null);

  const loadOverview = async () => {
    setOverviewLoading(true);
    const [pendingRes, approvedRes, cattleRes, petugasRes, reproRes] = await Promise.all([
      adminService.getPendingPeternak(),
      adminService.getApprovedPeternak(),
      adminService.getCattleCount(),
      adminService.getPetugasList(),
      adminService.getReproMonitoring(),
    ]);
    const perKecamatan = {};
    if (approvedRes.success) approvedRes.users.forEach(u => { perKecamatan[u.kecamatan] = (perKecamatan[u.kecamatan] || 0) + 1; });
    setOverview({
      totalPeternak: approvedRes.success ? approvedRes.users.length : 0,
      totalSapi: cattleRes.success ? cattleRes.count : null,
      totalPetugas: petugasRes.success ? petugasRes.users.length : 0,
      pending: pendingRes.success ? pendingRes.users : [],
      perKecamatan: Object.entries(perKecamatan).sort((a, b) => b[1] - a[1]),
      birahi: reproRes.success ? reproRes.birahi : [],
      gangguan: reproRes.success ? reproRes.gangguan : [],
    });
    setOverviewLoading(false);
  };

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

  useEffect(() => { if (admin) loadOverview(); }, [admin]);

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

  const pendingCount = overview.pending.length;
  const gangguanCount = overview.gangguan.length;
  const TABS = [
    { key: 'ringkasan', label: 'Ringkasan', icon: Icon.home },
    { key: 'pemantauan', label: 'Pemantauan Sapi', icon: Icon.activity, badge: gangguanCount || null },
    { key: 'laporan', label: 'Laporan', icon: Icon.trendUp },
    { key: 'peternak', label: 'Peternak', icon: Icon.user, badge: pendingCount || null },
    { key: 'petugas', label: 'Petugas', icon: Icon.stethoscope },
  ];
  const PAGE_META = {
    ringkasan: { title: `Selamat datang, ${admin.name.split(' ')[0]}`, sub: "Ini kondisi SIRAPI hari ini di Kabupaten Tuban." },
    pemantauan: { title: "Pemantauan sapi", sub: "Sapi yang birahi/siap kawin, dan yang diduga ada gangguan reproduksi." },
    laporan: { title: "Laporan", sub: "Sudut pandang untuk memutuskan program — bukan potret hari ini." },
    peternak: { title: "Peternak", sub: "Tinjau pendaftaran baru, atau cari & kelola semua peternak terdaftar." },
    petugas: { title: "Petugas lapangan", sub: "Kelola akun petugas yang bertugas memantau ternak." },
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar aurora">
        <div className="aurora-rings" />
        <div className="aurora-grain" />
        <div className="admin-sidebar-inner">
          <div className="admin-brand">
            <div className="admin-brand-logo"><img src={logoTuban} alt="" /></div>
            <div>
              <p className="admin-brand-name">SIRAPI Admin</p>
              <p className="admin-brand-sub">Dinas KPPP Tuban</p>
            </div>
          </div>

          <nav className="admin-nav">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`admin-nav-item ${tab === t.key ? 'active' : ''}`}>
                <t.icon size={18} stroke={2} />
                {t.label}
                {!!t.badge && <span className="admin-nav-badge">{t.badge}</span>}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-foot">
            <span className="admin-avatar">{initials(admin.name)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="admin-sidebar-foot-name">{admin.name}</p>
              <p className="admin-sidebar-foot-role">Admin</p>
            </div>
            <button onClick={async () => { await authService.logout(); setAdmin(null); setSession(null); }} className="admin-logout-btn" title="Keluar">
              <Icon.logout size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-page-head">
          <h1>{PAGE_META[tab].title}</h1>
          <p>{PAGE_META[tab].sub}</p>
        </div>

        {tab === 'ringkasan' && (
          <RingkasanTab
            data={overview}
            loading={overviewLoading}
            onJumpToPeternak={() => setTab('peternak')}
            onJumpToPemantauan={(section) => { setPemantauanJump(section); setTab('pemantauan'); }}
          />
        )}
        {tab === 'pemantauan' && (
          <PemantauanTab data={overview} loading={overviewLoading} jumpTo={pemantauanJump} />
        )}
        {tab === 'laporan' && (
          overviewLoading ? <p className="t-sm c-3">Memuat...</p> : <LaporanTab data={overview} />
        )}
        {tab === 'peternak' && (
          <PeternakTab setToast={setToast} onListChange={(list) => setOverview(o => ({ ...o, pending: list }))} />
        )}
        {tab === 'petugas' && (
          <PetugasTab session={session} setToast={setToast} onListChange={(list) => setOverview(o => ({ ...o, totalPetugas: list.length }))} />
        )}
      </main>

      {toast && (
        <div className="toast">
          {toast.type === "error" ? <Icon.alertCircle className="toast-icon" style={{ color: "var(--crit)" }} /> : <Icon.checkCircle className="toast-icon" style={{ color: "var(--ok)" }} />}
          <span className="toast-msg">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
