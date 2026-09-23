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
            Sistem Informasi Reproduksi Sapi Kabupaten Tuban.
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,.62)", lineHeight: 1.6, margin: 0, maxWidth: 340 }}>
            Modul administrasi untuk pengelolaan data pendaftaran peternak, akun petugas lapangan, dan rekapitulasi data ternak per kecamatan.
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

function RingkasanTab({ data, loading, onJumpToPeternak, onJumpToPemantauan, onJumpToLaporan }) {
  const [showBirahiInfo, setShowBirahiInfo] = useState(false);
  const [openFunnelInfo, setOpenFunnelInfo] = useState(null);
  if (loading) return <p className="t-sm c-3">Memuat...</p>;

  const { totalPeternak, totalSapi, totalPetugas, tanpaSapi, terbaru, perKecamatan, birahi, gangguan, kawin, bunting, evaluasiBirahi1, evaluasiBirahi2, berpotensiBunting, kelahiranTerbaru } = data;

  // Warna makin "matang" kian ke kanan - kuning (baru dievaluasi) → oranye
  // (evaluasi kedua, indikasi menguat) → hijau (berpotensi bunting, indikasi
  // paling kuat). Bukan token semantik warn/crit biasa (itu untuk
  // peringatan/masalah) - ini murni gradasi tahapan, jadi pakai warna
  // langsung, bukan var(--warn)/var(--crit) yang maknanya beda.
  const FUNNEL = [
    { key: "kawin", label: "Sudah dikawin", value: kawin, desc: "IB tercatat", fg: "var(--info)", bg: "var(--info-bg)" },
    {
      key: "eval1", label: "Evaluasi Birahi 1", value: evaluasiBirahi1, desc: "Hari ke-21 (18-24 hari)",
      fg: "#B54708", bg: "#FFFAEB",
      penjelasan: "Sapi-sapi ini sedang di hari ke-18 sampai 24 sejak IB terakhir — jendela waktu birahi normalnya muncul kembali kalau IB sebelumnya TIDAK berhasil. Amati tanda birahi (3A: Abang, Abuh, Anget) dan keluarnya lendir bening dari vulva. Kalau tanda itu MUNCUL lagi di masa ini, kemungkinan besar sapi belum bunting dan perlu di-IB ulang. Kalau TIDAK ada tanda birahi sampai lewat masa ini, itu indikasi awal (belum pasti) kemungkinan bunting.",
    },
    {
      key: "eval2", label: "Evaluasi Birahi 2", value: evaluasiBirahi2, desc: "Hari ke-42 (36-48 hari)",
      fg: "#C4320A", bg: "#FFF4ED",
      penjelasan: "Sapi-sapi ini sudah melewati Evaluasi Birahi 1 tanpa tanda birahi, dan sekarang berada di jendela siklus kedua (hari ke-36 sampai 48). Sama seperti evaluasi pertama: kalau lendir birahi MUNCUL lagi sekarang, berarti kemungkinan besar belum bunting. Kalau sampai di sini pun tetap tidak ada tanda birahi, indikasi kemungkinan buntingnya makin kuat — tapi tetap harus dipastikan lewat PKB resmi petugas di bulan ke-3.",
    },
    { key: "potensi", label: "Berpotensi bunting", value: berpotensiBunting, desc: "Lewat hari ke-48, belum PKB", fg: "var(--ok)", bg: "var(--ok-bg)" },
  ];

  return (
    <div>
      {/* Inti tujuan SIRAPI — bukan hitung peternak/sapi, tapi tahapan
          reproduksi sapi saat ini: birahi (siap kawin) → positif bunting,
          plus gangguan reproduksi sebagai kartu peringatan terpisah.
          Sengaja ditaruh paling atas, lebih besar dari stat tile
          administratif di bawahnya. */}
      <div className="mission-grid">
        <button className="mission-card is-warn" onClick={() => onJumpToPemantauan('birahi')}>
          <div className="mission-card-head">
            <span className="mission-icon"><Icon.heart size={18} stroke={2.2} /></span>
            <span className="mission-count">{nf.format(birahi.length)}</span>
          </div>
          <div>
            <p className="mission-label">Sapi birahi / siap kawin</p>
            <p className="mission-desc">Jumlah sapi pada fase birahi atau siap dikawinkan.</p>
          </div>
        </button>
        <div className="mission-card is-ok" style={{ cursor: "default" }}>
          <div className="mission-card-head">
            <span className="mission-icon"><Icon.checkCircle size={18} stroke={2.2} /></span>
            <span className="mission-count">{nf.format(bunting)}</span>
          </div>
          <div>
            <p className="mission-label">Positif bunting</p>
            <p className="mission-desc">Sapi dengan hasil PKB positif, sedang dalam masa kebuntingan.</p>
          </div>
        </div>
        <button className="mission-card is-crit" onClick={() => onJumpToPemantauan('gangguan')}>
          <div className="mission-card-head">
            <span className="mission-icon"><Icon.alertCircle size={18} stroke={2.2} /></span>
            <span className="mission-count">{nf.format(gangguan.length)}</span>
          </div>
          <div>
            <p className="mission-label">Gangguan reproduksi</p>
            <p className="mission-desc">Jumlah sapi yang teridentifikasi mengalami gangguan reproduksi.</p>
          </div>
        </button>
      </div>

      {/* Alur pasca-kawin - satu baris tersambung (bukan kartu terpisah
          seperti sebelumnya) supaya urutannya kebaca jelas: makin ke
          kanan, makin lama sejak IB & makin kuat indikasi buntingnya.
          Bukan diagnosa pasti sampai kotak terakhir - PKB oleh petugas
          di bulan ke-3 tetap wajib untuk hasil yang valid. */}
      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: showBirahiInfo ? 8 : 14 }}>
          <p className="t-over" style={{ margin: 0 }}>Alur pasca-kawin menuju kebuntingan</p>
          <button
            onClick={() => setShowBirahiInfo(v => !v)}
            className="icon-btn"
            style={{ width: 20, height: 20, background: showBirahiInfo ? "var(--info-bg)" : "var(--surface-3)", color: showBirahiInfo ? "var(--info)" : "var(--text-2)" }}
            aria-label="Penjelasan alur"
            title="Penjelasan"
          >
            <Icon.info size={13} stroke={2.4} />
          </button>
        </div>
        {showBirahiInfo && (
          <p className="t-xs c-3" style={{ margin: "0 0 14px", padding: "10px 12px", background: "var(--info-bg)", borderRadius: "var(--r)", color: "var(--info)" }}>
            Dari sapi yang sudah dikawin (IB), dua titik cek dini di hari ke-21 dan ke-42: kalau tidak muncul tanda birahi lagi, ada indikasi awal kemungkinan bunting. Lewat hari ke-48 tanpa birahi lagi = berpotensi bunting. Ini semua BUKAN diagnosa pasti — pemeriksaan kebuntingan (PKB) oleh petugas di bulan ke-3 tetap wajib agar hasilnya valid.
          </p>
        )}
        <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap", gap: 0 }}>
          {FUNNEL.map((step, i) => (
            <React.Fragment key={step.key}>
              <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 2, padding: "10px 14px", background: step.bg, borderRadius: "var(--r)" }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: step.fg, fontVariantNumeric: "tabular-nums" }}>{nf.format(step.value)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{step.label}</p>
                  {step.penjelasan && (
                    <button
                      onClick={() => setOpenFunnelInfo(v => v === step.key ? null : step.key)}
                      className="icon-btn"
                      style={{ width: 17, height: 17, background: openFunnelInfo === step.key ? step.fg : "var(--surface)", color: openFunnelInfo === step.key ? "#fff" : step.fg, flexShrink: 0 }}
                      aria-label={`Kenapa ${step.label}?`}
                      title="Kenapa angka ini?"
                    >
                      <Icon.info size={11} stroke={2.6} />
                    </button>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-3)" }}>{step.desc}</p>
              </div>
              {i < FUNNEL.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--text-3)", flexShrink: 0 }}>
                  <Icon.arrowRight size={18} stroke={2} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        {openFunnelInfo && (() => {
          const s = FUNNEL.find(f => f.key === openFunnelInfo);
          return (
            <p className="t-xs" style={{ margin: "10px 0 0", padding: "10px 12px", background: s.bg, borderRadius: "var(--r)", color: s.fg }}>
              {s.penjelasan}
            </p>
          );
        })()}
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
          className={`stat ${tanpaSapi > 0 ? 'is-warn stat-clickable' : ''}`}
          onClick={tanpaSapi > 0 ? onJumpToLaporan : undefined}
          role={tanpaSapi > 0 ? "button" : undefined}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Peternak belum input sapi</span>
            <span className="stat-icon"><Icon.alert size={15} stroke={2.2} /></span>
          </div>
          <span className="stat-value">{nf.format(tanpaSapi)}</span>
          {tanpaSapi > 0 && <span className="stat-meta" style={{ color: "var(--warn)" }}>Rincian di Laporan &rarr;</span>}
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
            <BarList items={perKecamatan.map(([kec, count]) => ({ label: kec, nilai: count }))} showRank />
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p className="t-over" style={{ margin: 0 }}>Peternak terbaru</p>
            {terbaru.length > 0 && (
              <button onClick={onJumpToPeternak} className="btn btn-sm btn-ghost" style={{ padding: "4px 8px" }}>Lihat semua</button>
            )}
          </div>
          {terbaru.length === 0 ? (
            <p className="t-sm c-3">Belum ada peternak terdaftar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {terbaru.slice(0, 5).map(u => (
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

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <p className="t-over" style={{ marginBottom: 14 }}>Kelahiran terbaru</p>
        {kelahiranTerbaru.length === 0 ? (
          <p className="t-sm c-3">Belum ada kelahiran yang tercatat.</p>
        ) : (
          <div className="rowlist">
            {kelahiranTerbaru.map((k, i) => (
              <div key={`${k.cattle.id}-${k.date}-${i}`} className="row" style={{ cursor: "default" }}>
                <span className="admin-avatar" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><Icon.cow size={16} stroke={2} /></span>
                <div className="row-main">
                  <span className="row-title">{k.cattle.code || k.cattle.id} <span className="c-3" style={{ fontWeight: 500 }}>· {k.peternak.name}</span></span>
                  <span className="row-sub">{k.peternak.desa}, {k.peternak.kecamatan}</span>
                </div>
                <span className="t-xs c-3 tabular">{fmtDate(k.date)}</span>
              </div>
            ))}
          </div>
        )}
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
          <p className="empty-title">{section === 'birahi' ? "Tidak ada sapi pada fase birahi" : "Tidak ada gangguan reproduksi terdeteksi"}</p>
          <p className="empty-text">{section === 'birahi' ? "Tidak ada sapi yang tercatat pada fase birahi saat ini." : "Tidak ada sapi yang teridentifikasi mengalami gangguan reproduksi."}</p>
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

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const JENIS_TONE = {
  'Inseminasi Buatan (IB)': 'badge-info',
  'PKB Positif (Bunting)': 'badge-ok',
  'PKB Negatif': 'badge-crit',
  'Kelahiran': 'badge-ok',
  'Keguguran': 'badge-crit',
};

// Warna gradasi sama seperti kartu "Alur pasca-kawin" di Ringkasan - kuning
// → oranye → hijau, makin kuat indikasi kemungkinan buntingnya.
const EVAL_STATUS_STYLE = {
  'Evaluasi Birahi 1': { fg: "#B54708", bg: "#FFFAEB" },
  'Evaluasi Birahi 2': { fg: "#C4320A", bg: "#FFF4ED" },
  'Berpotensi Bunting': { fg: "var(--ok)", bg: "var(--ok-bg)" },
};

// Filter kejadian reproduksi per tanggal/rentang/tahun, plus unduh CSV —
// supaya admin bisa "kolekting data" untuk keperluan laporan ke pimpinan
// tanpa perlu minta bantuan siapa pun mengambilnya langsung dari database.
function EventCollectorCard() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [fromDate, setFromDate] = useState(isoDate(firstOfMonth));
  const [toDate, setToDate] = useState(isoDate(today));
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (from, to) => {
    setLoading(true);
    const res = await adminService.getEventsInRange({ from, to });
    setEvents(res.success ? res.events : []);
    setLoading(false);
  };

  useEffect(() => { load(fromDate, toDate); }, []); // eslint-disable-line

  const applyPreset = (from, to) => {
    setFromDate(from); setToDate(to);
    load(from, to);
  };

  const presetHariIni = () => { const d = isoDate(today); applyPreset(d, d); };
  const presetMingguIni = () => { const d = new Date(today); d.setDate(d.getDate() - 6); applyPreset(isoDate(d), isoDate(today)); };
  const presetBulanIni = () => applyPreset(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), isoDate(today));
  const presetTahunIni = () => applyPreset(isoDate(new Date(today.getFullYear(), 0, 1)), isoDate(today));

  const downloadCSV = () => {
    if (!events || events.length === 0) return;
    const header = ['Tanggal', 'Jenis Kejadian', 'Status Evaluasi', 'Kode Sapi', 'Peternak', 'Kecamatan', 'Desa'];
    const rows = events.map(e => [e.date, e.jenis, e.evaluasiStatus || '', e.cattleCode || '', e.peternakName, e.kecamatan, e.desa]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sirapi-kejadian-${fromDate}_sd_${toDate}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const summary = {};
  (events || []).forEach(e => { summary[e.jenis] = (summary[e.jenis] || 0) + 1; });

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <p className="t-over" style={{ marginBottom: 4 }}>Kolekting data — filter kejadian per tanggal</p>
      <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>
        Semua Inseminasi Buatan (IB), hasil PKB, kelahiran, dan keguguran yang tercatat pada rentang tanggal ini — siap diunduh untuk keperluan laporan. Baris IB yang sapinya masih menunggu PKB ikut ditandai tahap evaluasi birahinya saat ini (kolom "Status Evaluasi").
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div className="field" style={{ margin: 0 }}>
          <label className="field-label">Dari tanggal</label>
          <input type="date" className="input" value={fromDate} max={toDate} onChange={e => { setFromDate(e.target.value); load(e.target.value, toDate); }} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label className="field-label">Sampai tanggal</label>
          <input type="date" className="input" value={toDate} min={fromDate} max={isoDate(today)} onChange={e => { setToDate(e.target.value); load(fromDate, e.target.value); }} />
        </div>
        <button onClick={presetHariIni} className="btn btn-sm btn-secondary">Hari ini</button>
        <button onClick={presetMingguIni} className="btn btn-sm btn-secondary">7 hari terakhir</button>
        <button onClick={presetBulanIni} className="btn btn-sm btn-secondary">Bulan ini</button>
        <button onClick={presetTahunIni} className="btn btn-sm btn-secondary">Tahun ini</button>
        <button onClick={downloadCSV} disabled={!events || events.length === 0} className="btn btn-sm btn-primary" style={{ marginLeft: "auto" }}>
          <Icon.download size={15} stroke={2.2} /> Unduh CSV
        </button>
      </div>

      {loading ? <p className="t-sm c-3">Memuat...</p> : !events || events.length === 0 ? (
        <p className="t-sm c-3">Tidak ada kejadian tercatat pada rentang tanggal ini.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {Object.entries(summary).map(([jenis, count]) => (
              <span key={jenis} className={`badge ${JENIS_TONE[jenis] || 'badge-neut'}`}>{jenis}: {count}</span>
            ))}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className="t-sm" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "6px 8px" }}>Tanggal</th>
                  <th style={{ padding: "6px 8px" }}>Jenis</th>
                  <th style={{ padding: "6px 8px" }}>Status Evaluasi</th>
                  <th style={{ padding: "6px 8px" }}>Kode Sapi</th>
                  <th style={{ padding: "6px 8px" }}>Peternak</th>
                  <th style={{ padding: "6px 8px" }}>Kecamatan / Desa</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const evalStyle = e.evaluasiStatus ? EVAL_STATUS_STYLE[e.evaluasiStatus] : null;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="tabular" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{fmtDate(e.date)}</td>
                      <td style={{ padding: "6px 8px" }}>{e.jenis}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {evalStyle && (
                          <span style={{ background: evalStyle.bg, color: evalStyle.fg, borderRadius: 4, padding: "2px 8px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {e.evaluasiStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>{e.cattleCode || '-'}</td>
                      <td style={{ padding: "6px 8px" }}>{e.peternakName}</td>
                      <td style={{ padding: "6px 8px", color: "var(--text-3)" }}>{e.desa}, {e.kecamatan}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Rekapitulasi data, bukan potret "hari ini" seperti Ringkasan/Pemantauan:
// sebaran gangguan reproduksi per kecamatan dan per jenis, status
// pencatatan sapi per kecamatan, dan tren laporan enam bulan terakhir.
// Halaman ini menyajikan data apa adanya — keputusan program tetap ada
// di tangan Dinas.
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
      <EventCollectorCard />

      <div className="admin-grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Gangguan reproduksi per kecamatan</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Jumlah kasus gangguan reproduksi yang tercatat di tiap kecamatan.</p>
          <BarList items={gangguanPerKecamatan} tone="crit" showRank />
        </div>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Jenis gangguan yang paling sering</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Sebaran jenis gangguan reproduksi berdasarkan jumlah kejadian.</p>
          <BarList items={jenisGangguan} tone="crit" showRank />
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Peternak belum input sapi{tanpaSapi ? ` (${tanpaSapi.total})` : ''}</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Peternak berstatus aktif yang belum memiliki data sapi, berdasarkan kecamatan.</p>
          {tanpaSapi === null ? <p className="t-sm c-3">Memuat...</p> : tanpaSapi.total === 0 ? (
            <p className="t-sm c-3">Semua peternak aktif sudah input minimal 1 sapi.</p>
          ) : (
            <BarList items={tanpaSapi.perKecamatan.map(([label, nilai]) => ({ label, nilai }))} tone="warn" showRank />
          )}
        </div>
        <div className="card card-pad">
          <p className="t-over" style={{ marginBottom: 4 }}>Tren laporan masalah reproduksi</p>
          <p className="t-xs c-3" style={{ margin: "0 0 14px" }}>Jumlah laporan hasil PKB negatif dan kejadian keguguran per bulan, enam bulan terakhir.</p>
          {trend === null ? <p className="t-sm c-3">Memuat...</p> : <AreaChart data={trend} satuan="laporan" allPoints />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- PETERNAK ----- */

// Direktori lengkap semua peternak — cari, klik satu orang, lihat & edit
// profilnya plus semua sapi miliknya lewat UserDetailModal. Sebelumnya ada
// alur "Menunggu persetujuan" terpisah (pendaftaran baru ditahan sampai
// admin menyetujui) — dihapus atas permintaan pengguna, pendaftaran
// mandiri sekarang langsung aktif (lihat authService.js), jadi tidak ada
// lagi yang perlu diputuskan di sini.
function PeternakTab({ setToast }) {
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
        <div className="empty"><p className="empty-title">Belum ada petugas</p><p className="empty-text">Belum ada akun petugas lapangan yang terdaftar.</p></div>
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

  // Data agregat dipakai di Ringkasan.
  const [overview, setOverview] = useState({ totalPeternak: 0, totalSapi: null, totalPetugas: 0, tanpaSapi: 0, terbaru: [], perKecamatan: [], birahi: [], gangguan: [], kawin: 0, bunting: 0, evaluasiBirahi1: 0, evaluasiBirahi2: 0, berpotensiBunting: 0, kelahiranTerbaru: [] });
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [pemantauanJump, setPemantauanJump] = useState(null);

  const loadOverview = async () => {
    setOverviewLoading(true);
    const [approvedRes, cattleRes, petugasRes, reproRes, tanpaSapiRes] = await Promise.all([
      adminService.getApprovedPeternak(),
      adminService.getCattleCount(),
      adminService.getPetugasList(),
      adminService.getReproMonitoring(),
      adminService.getPeternakTanpaSapi(),
    ]);
    const perKecamatan = {};
    if (approvedRes.success) approvedRes.users.forEach(u => { perKecamatan[u.kecamatan] = (perKecamatan[u.kecamatan] || 0) + 1; });
    const terbaru = approvedRes.success
      ? [...approvedRes.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
      : [];
    setOverview({
      totalPeternak: approvedRes.success ? approvedRes.users.length : 0,
      totalSapi: cattleRes.success ? cattleRes.count : null,
      totalPetugas: petugasRes.success ? petugasRes.users.length : 0,
      tanpaSapi: tanpaSapiRes.success ? tanpaSapiRes.total : 0,
      terbaru,
      perKecamatan: Object.entries(perKecamatan).sort((a, b) => b[1] - a[1]),
      birahi: reproRes.success ? reproRes.birahi : [],
      gangguan: reproRes.success ? reproRes.gangguan : [],
      kawin: reproRes.success ? reproRes.kawin : 0,
      bunting: reproRes.success ? reproRes.bunting : 0,
      evaluasiBirahi1: reproRes.success ? reproRes.evaluasiBirahi1 : 0,
      evaluasiBirahi2: reproRes.success ? reproRes.evaluasiBirahi2 : 0,
      berpotensiBunting: reproRes.success ? reproRes.berpotensiBunting : 0,
      kelahiranTerbaru: reproRes.success ? reproRes.kelahiranTerbaru : [],
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

  // Penyegaran otomatis berkala - tanpa ini, dashboard yang dibiarkan
  // terbuka di satu tab (mis. layar kantor yang tidak pernah ditutup)
  // akan menampilkan angka yang sama persis SELAMANYA, karena sebelumnya
  // data cuma diambil sekali saat halaman pertama dibuka. Tombol "Refresh
  // data" di header tetap ada untuk yang mau lihat seketika, ini jaring
  // pengaman supaya tidak bergantung pada orang ingat mengklik.
  useEffect(() => {
    if (!admin) return;
    loadOverview();
    const interval = setInterval(loadOverview, 5 * 60 * 1000); // tiap 5 menit
    return () => clearInterval(interval);
  }, [admin]);

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

  const gangguanCount = overview.gangguan.length;
  const TABS = [
    { key: 'ringkasan', label: 'Ringkasan', icon: Icon.home },
    { key: 'pemantauan', label: 'Pemantauan Sapi', icon: Icon.activity, badge: gangguanCount || null },
    { key: 'laporan', label: 'Laporan', icon: Icon.trendUp },
    { key: 'peternak', label: 'Peternak', icon: Icon.user },
    { key: 'petugas', label: 'Petugas', icon: Icon.stethoscope },
  ];
  const PAGE_META = {
    ringkasan: { title: `Selamat datang, ${admin.name.split(' ')[0]}`, sub: "Kondisi data SIRAPI Kabupaten Tuban per hari ini." },
    pemantauan: { title: "Pemantauan sapi", sub: "Data sapi pada fase birahi/siap dikawinkan, dan sapi yang teridentifikasi mengalami gangguan reproduksi." },
    laporan: { title: "Laporan", sub: "Rekapitulasi data gangguan reproduksi dan status pencatatan sapi." },
    peternak: { title: "Peternak", sub: "Data pendaftaran dan daftar peternak terdaftar." },
    petugas: { title: "Petugas lapangan", sub: "Daftar akun petugas lapangan." },
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
        <div className="admin-page-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1>{PAGE_META[tab].title}</h1>
            <p>{PAGE_META[tab].sub}</p>
          </div>
          {/* Data Ringkasan/Pemantauan/Laporan cuma dimuat sekali saat login,
              TIDAK otomatis refresh - kalau halaman dibiarkan terbuka lama,
              angkanya "beku" padahal data asli terus berubah (peternak lain
              terus input sapi). Tombol ini supaya tidak perlu reload seluruh
              halaman cuma untuk lihat angka terbaru. */}
          {['ringkasan', 'pemantauan', 'laporan'].includes(tab) && (
            <button onClick={loadOverview} disabled={overviewLoading} className="btn btn-sm btn-secondary" style={{ flexShrink: 0 }}>
              <Icon.refresh size={15} stroke={2.2} /> {overviewLoading ? "Memuat..." : "Refresh data"}
            </button>
          )}
        </div>

        {tab === 'ringkasan' && (
          <RingkasanTab
            data={overview}
            loading={overviewLoading}
            onJumpToPeternak={() => setTab('peternak')}
            onJumpToPemantauan={(section) => { setPemantauanJump(section); setTab('pemantauan'); }}
            onJumpToLaporan={() => setTab('laporan')}
          />
        )}
        {tab === 'pemantauan' && (
          <PemantauanTab data={overview} loading={overviewLoading} jumpTo={pemantauanJump} />
        )}
        {tab === 'laporan' && (
          overviewLoading ? <p className="t-sm c-3">Memuat...</p> : <LaporanTab data={overview} />
        )}
        {tab === 'peternak' && (
          <PeternakTab setToast={setToast} />
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
