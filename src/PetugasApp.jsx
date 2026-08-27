import React, { useState, useEffect } from "react";
import { authService } from "./core/authService";
import { petugasService } from "./core/petugasService";
import { analyzeCattle, ibSinceCalving, getOpsiReproduksi } from "./core/analyzeCattle";
import { Icon } from "./core/components/Icons";
import { supabase } from "./core/supabaseClient";
import logoTuban from "./Tubankab.png";

// Aplikasi petugas — APK terpisah dari aplikasi peternak (beda ikon/nama),
// tapi kodenya masih satu repo dan dimuat LIVE dari web (bukan dibundel
// offline seperti APK peternak) lewat capacitor.petugas.config.ts. Lihat
// PETUGAS-APP.md untuk kenapa pendekatan ini dipilih.

const todayStrLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const waLink = (phone, pesan) => `https://wa.me/${String(phone).replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(pesan)}`;

function PetugasLogin({ onLoggedIn }) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailOrPhone || !password) return setError("Isi email/HP dan kata sandi.");
    setIsLoading(true);
    const result = await authService.login(emailOrPhone, password);
    setIsLoading(false);
    if (!result.success) return setError(result.error || "Login gagal.");
    if (result.user.role !== 'petugas') {
      await authService.logout();
      return setError("Akun ini bukan akun petugas.");
    }
    onLoggedIn(result.user);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <form onSubmit={handleSubmit} className="card card-pad" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <img src={logoTuban} alt="" style={{ width: 34, height: "auto" }} />
          <div>
            <p className="t-h3 c-1" style={{ margin: 0 }}>SIRAPI Petugas</p>
            <p className="t-xs c-3" style={{ margin: 0 }}>Dinas Ketahanan Pangan, Pertanian dan Perikanan Tuban</p>
          </div>
        </div>
        <div className="field"><label className="field-label">Email atau nomor HP</label>
          <input type="text" className="input" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} autoFocus />
        </div>
        <div className="field"><label className="field-label">Kata sandi</label>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="callout callout-crit" style={{ marginBottom: 16 }}><Icon.alert size={17} stroke={2} /><span>{error}</span></div>}
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg btn-block">{isLoading ? "Memproses..." : "Masuk"}</button>
      </form>
    </div>
  );
}

function RecordActionModal({ open, cattle, onClose, onSaved, setToast }) {
  const [tab, setTab] = useState("REPRO");
  const [res, setRes] = useState("NONE");
  const [date, setDate] = useState(todayStrLocal());
  const [pregMonth, setPregMonth] = useState("");
  const [healthType, setHealthType] = useState("LAPOR");
  const [gejala, setGejala] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("REPRO"); setRes("NONE"); setDate(todayStrLocal()); setPregMonth("");
      setHealthType("LAPOR"); setGejala(""); setSaving(false);
    }
  }, [open, cattle?.id]);

  if (!open || !cattle) return null;
  const { options: opsi, hint: opsiHint } = getOpsiReproduksi(cattle);
  const punyaIB = ibSinceCalving(cattle).length > 0;

  const submitRepro = async () => {
    if (res === "NONE") return setToast({ message: "Pilih jenis tindakan.", type: "error" });
    if (res === "POSITIVE" && !punyaIB && !pregMonth) return setToast({ message: "Perkiraan usia kebuntingan wajib diisi (tidak ada catatan IB).", type: "error" });
    setSaving(true);
    const result = await petugasService.recordReproAction(cattle, res, pregMonth, date);
    setSaving(false);
    if (result.success) { setToast({ message: "Tercatat.", type: "success" }); onSaved(result.cattle); }
    else setToast({ message: result.error, type: "error" });
  };

  const submitHealth = async () => {
    if (healthType === "LAPOR" && !gejala.trim()) return setToast({ message: "Isi gejala yang diamati.", type: "error" });
    setSaving(true);
    const result = await petugasService.recordHealthAction(cattle, { type: healthType, date, gejala });
    setSaving(false);
    if (result.success) { setToast({ message: "Tercatat.", type: "success" }); onSaved(result.cattle); }
    else setToast({ message: result.error, type: "error" });
  };

  const isSakit = (cattle.healthLog || []).some(h => h.status !== "SEMBUH");

  return (
    <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 110 }}>
      <div className="card pop-in" style={{ width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto", boxShadow: "var(--sh-xl)" }}>
        <div style={{ padding: "18px 20px 0" }}>
          <h3 className="t-h2 c-1" style={{ margin: "0 0 4px" }}>{cattle.code || cattle.id}</h3>
          <p className="t-sm c-3" style={{ margin: "0 0 16px" }}>Catat tindakan yang baru dilakukan.</p>
          <div className="segmented" style={{ marginBottom: 18 }}>
            <button type="button" onClick={() => setTab("REPRO")} className={tab === "REPRO" ? "active" : ""}>Reproduksi</button>
            <button type="button" onClick={() => setTab("KESEHATAN")} className={tab === "KESEHATAN" ? "active" : ""}>Kesehatan</button>
          </div>
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          {tab === "REPRO" ? (
            <>
              {opsi.length === 0 ? (
                <p className="t-sm c-3">Tidak ada tindakan reproduksi yang relevan untuk fase sapi ini saat ini.</p>
              ) : (
                <>
                  {opsiHint && (
                    <div className={`callout callout-${opsiHint.level === "crit" ? "crit" : "warn"}`} style={{ marginBottom: 16 }}>
                      <Icon.alert size={17} stroke={2} /><span>{opsiHint.text}</span>
                    </div>
                  )}
                  <div className="field">
                    <label className="field-label">Jenis tindakan</label>
                    <select className="select" value={res} onChange={e => setRes(e.target.value)}>
                      <option value="NONE">Pilih tindakan…</option>
                      {opsi.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Tanggal tindakan</label>
                    <input type="date" className="input" value={date} max={todayStrLocal()} onChange={e => setDate(e.target.value)} />
                  </div>
                  {res === "POSITIVE" && !punyaIB && (
                    <div className="field">
                      <label className="field-label">Perkiraan usia kebuntingan</label>
                      <select className="select" value={pregMonth} onChange={e => setPregMonth(e.target.value)}>
                        <option value="">Pilih usia…</option>
                        {[1,2,3,4,5,6,7,8,9].map(m => <option key={m} value={m}>{m} bulan</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={submitRepro} disabled={saving} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{saving ? "Menyimpan..." : "Simpan"}</button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="segmented" style={{ marginBottom: 16 }}>
                <button type="button" onClick={() => setHealthType("LAPOR")} className={healthType === "LAPOR" ? "active" : ""}>Lapor gejala</button>
                <button type="button" onClick={() => setHealthType("SEMBUH")} disabled={!isSakit} className={healthType === "SEMBUH" ? "active" : ""}>Tandai sembuh</button>
              </div>
              <div className="field">
                <label className="field-label">Tanggal</label>
                <input type="date" className="input" value={date} max={todayStrLocal()} onChange={e => setDate(e.target.value)} />
              </div>
              {healthType === "LAPOR" && (
                <div className="field">
                  <label className="field-label">Gejala yang diamati</label>
                  <textarea className="textarea" value={gejala} onChange={e => setGejala(e.target.value)} placeholder="Contoh: demam, nafsu makan turun, keluar lendir berbau" />
                </div>
              )}
              <button onClick={submitHealth} disabled={saving} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{saving ? "Menyimpan..." : "Simpan"}</button>
            </>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

function FarmerDetail({ peternak, onBack, setToast }) {
  const [loading, setLoading] = useState(true);
  const [cattle, setCattle] = useState([]);
  const [recording, setRecording] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await petugasService.getCattleByFarmer(peternak.id);
    if (result.success) setCattle(result.cattle);
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, [peternak.id]);

  return (
    <div>
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
        <Icon.chevronLeft size={16} /> Kembali
      </button>
      <div className="card card-pad" style={{ marginBottom: 20, maxWidth: 500 }}>
        <p className="t-h3 c-1" style={{ margin: "0 0 4px" }}>{peternak.name}</p>
        <p className="t-sm c-2" style={{ margin: "0 0 2px" }}>{peternak.desa}, {peternak.kecamatan}{peternak.dusun ? ` · Dusun ${peternak.dusun}` : ''}</p>
        <a href={waLink(peternak.phone, `Halo Pak/Bu ${peternak.name}, saya petugas dari Dinas mau menindaklanjuti sapi Anda.`)}
           className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
          <Icon.phone size={15} stroke={2} /> Hubungi {peternak.phone}
        </a>
      </div>

      {loading ? <p className="t-sm c-3">Memuat...</p> : cattle.length === 0 ? (
        <p className="t-sm c-3">Peternak ini belum punya data sapi.</p>
      ) : (
        <div className="rowlist" style={{ maxWidth: 500 }}>
          {cattle.map(item => {
            const a = analyzeCattle(item);
            return (
              <button key={item.id} onClick={() => setRecording(item)} className="row">
                <div className="row-main">
                  <span className="row-title">{item.code || item.id}</span>
                  <span className="row-sub">{a.statusLabel}</span>
                </div>
                <span className={`badge badge-${a.color === 'rose' || a.color === 'orange' ? 'crit' : a.isUrgent ? 'warn' : 'neut'}`}>{a.isUrgent ? 'Perlu tindakan' : 'Aman'}</span>
                <Icon.chevronRight size={17} className="row-chev" />
              </button>
            );
          })}
        </div>
      )}

      <RecordActionModal
        open={!!recording}
        cattle={recording}
        onClose={() => setRecording(null)}
        onSaved={(updated) => { setCattle(prev => prev.map(c => c.id === updated.id ? updated : c)); setRecording(null); }}
        setToast={setToast}
      />
    </div>
  );
}

function UrgentListView({ onSelectPeternak, setToast }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await petugasService.getUrgentList();
    if (result.success) setGroups(result.groups);
    else setToast({ message: result.error, type: "error" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const result = await petugasService.searchPeternak(query);
      setSearching(false);
      if (result.success) setSearchResults(result.users);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <div className="input-icon" style={{ marginBottom: 20, maxWidth: 500 }}>
        <Icon.search size={18} />
        <input className="input" placeholder="Cari nama atau nomor HP peternak..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {query.trim() ? (
        searching ? <p className="t-sm c-3">Mencari...</p> : (searchResults || []).length === 0 ? (
          <p className="t-sm c-3">Tidak ditemukan.</p>
        ) : (
          <div className="rowlist" style={{ maxWidth: 500 }}>
            {searchResults.map(u => (
              <button key={u.id} onClick={() => onSelectPeternak(u)} className="row">
                <div className="row-main"><span className="row-title">{u.name}</span><span className="row-sub">{u.phone} · {u.desa}, {u.kecamatan}</span></div>
                <Icon.chevronRight size={17} className="row-chev" />
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="t-over" style={{ marginBottom: 10 }}>Perlu tindakan</p>
          {loading ? <p className="t-sm c-3">Memuat...</p> : groups.length === 0 ? (
            <div className="empty"><p className="empty-title">Tidak ada yang mendesak</p><p className="empty-text">Semua sapi dalam kondisi terpantau baik.</p></div>
          ) : (
            <div className="rowlist" style={{ maxWidth: 500 }}>
              {groups.map(g => (
                <button key={g.peternak.id} onClick={() => onSelectPeternak(g.peternak)} className="row">
                  <div className="row-main">
                    <span className="row-title">{g.peternak.name}</span>
                    <span className="row-sub">{g.peternak.desa}, {g.peternak.kecamatan}</span>
                  </div>
                  <span className="badge badge-crit">{g.items.length} sapi</span>
                  <Icon.chevronRight size={17} className="row-chev" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PetugasApp() {
  const [petugas, setPetugas] = useState(null);
  const [checking, setChecking] = useState(true);
  const [selectedPeternak, setSelectedPeternak] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = await authService.getCurrentUser();
        if (user?.role === 'petugas') setPetugas(user);
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
  if (!petugas) return <PetugasLogin onLoggedIn={setPetugas} />;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <header className="topbar" style={{ position: "sticky" }}>
        <div className="topbar-brand">
          <img src={logoTuban} alt="" className="topbar-logo" />
          <div className="min-w-0">
            <p className="topbar-name">SIRAPI Petugas</p>
            <p className="topbar-sub">{petugas.name} · {petugas.kecamatan}</p>
          </div>
        </div>
        <button onClick={async () => { await authService.logout(); setPetugas(null); setSelectedPeternak(null); }} className="btn btn-sm btn-ghost">
          <Icon.logout size={17} />
        </button>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 60px" }}>
        {selectedPeternak
          ? <FarmerDetail peternak={selectedPeternak} onBack={() => setSelectedPeternak(null)} setToast={setToast} />
          : <UrgentListView onSelectPeternak={setSelectedPeternak} setToast={setToast} />}
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
