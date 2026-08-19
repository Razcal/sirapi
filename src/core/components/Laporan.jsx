import React, { useState, useMemo } from "react";
import { Icon } from "./Icons";
import { HeroScene } from "./Hero";
import { BarChart, AreaChart, Heatmap, HeatmapLegend, BarList, Meter } from "./Charts";
import {
  PERIODE, ringkasan, deretPopulasi,
  nilaiSC, nilaiCR, nilaiCI, JENIS,
} from "../analytics";

const nf = new Intl.NumberFormat("id-ID");
const angka = (v, d = 1) => (v == null ? "–" : Number(v).toLocaleString("id-ID", { maximumFractionDigits: d }));

/* Selisih terhadap periode sebelumnya. Ditampilkan sebagai teks + ikon arah,
   bukan warna saja — naik tidak selalu berarti baik (naiknya laporan sakit
   bukan kabar bagus), jadi warnanya sengaja netral. */
function Delta({ kini, lalu }) {
  if (lalu == null) return null;
  const d = kini - lalu;
  if (d === 0) return <span className="t-xs c-3" style={{ fontWeight: 600 }}>sama seperti periode lalu</span>;
  const naik = d > 0;
  return (
    <span className="t-xs c-3" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ transform: naik ? "none" : "rotate(90deg)", display: "inline-flex" }}>
        <Icon.trendUp size={13} stroke={2.2} />
      </span>
      {naik ? "+" : "−"}{nf.format(Math.abs(d))} dari periode lalu
    </span>
  );
}

function Stat({ label, nilai, sub, ikon: Ikon }) {
  return (
    <div className="stat">
      <span className="stat-label">{Ikon && <Ikon size={14} />} {label}</span>
      <span className="stat-value">{nilai}</span>
      {sub && <span className="stat-meta">{sub}</span>}
    </div>
  );
}

/* Kartu metrik peternakan: angka besar + penilaian terhadap standar + meter. */
function KartuMetrik({ judul, nilai, satuan, penilaian, meter, penjelasan }) {
  const IkonSev = { ok: Icon.checkCircle, warn: Icon.alert, crit: Icon.alertCircle, neut: Icon.info }[penilaian.sev];
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="t-over" style={{ marginBottom: 5 }}>{judul}</p>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.03em",
                      fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
            {nilai}<span className="t-sm c-3" style={{ marginLeft: 5, fontWeight: 600 }}>{satuan}</span>
          </p>
        </div>
        <span className={`badge badge-${penilaian.sev}`}>
          <IkonSev size={13} stroke={2} /> {penilaian.sev === "ok" ? "Baik"
            : penilaian.sev === "warn" ? "Perhatikan"
            : penilaian.sev === "crit" ? "Evaluasi" : "Data kurang"}
        </span>
      </div>
      {meter && <div style={{ marginTop: 14 }}>{meter}</div>}
      <p className="t-sm c-2" style={{ margin: "12px 0 0" }}>{penilaian.teks}</p>
      {penjelasan && <p className="t-xs c-3" style={{ margin: "6px 0 0" }}>{penjelasan}</p>}
    </div>
  );
}

export default function LaporanView({ dbCattle, onBukaRewind, onPilihSapi }) {
  const [periode, setPeriode] = useState("bulan");
  const [offset, setOffset] = useState(0);

  const R = useMemo(() => ringkasan(dbCattle, periode, new Date(), offset), [dbCattle, periode, offset]);
  const populasi = useMemo(
    () => (periode === "tahun" || periode === "keseluruhan"
      ? deretPopulasi(dbCattle, R.mulai) : []),
    [dbCattle, periode, R.mulai]
  );

  const kosong = !Array.isArray(dbCattle) || dbCattle.length === 0;
  const bisaMundur = periode !== "keseluruhan";
  const bisaMaju = bisaMundur && offset < 0;

  const rincian = [
    { label: JENIS.ib.label,        nilai: R.hitung.ib },
    { label: JENIS.pkb.label,       nilai: R.hitung.pkb },
    { label: JENIS.lahir.label,     nilai: R.hitung.lahir },
    { label: JENIS.sakit.label,     nilai: R.hitung.sakit },
    { label: JENIS.sembuh.label,    nilai: R.hitung.sembuh },
    { label: JENIS.keguguran.label, nilai: R.hitung.keguguran },
    { label: JENIS.terapi.label,    nilai: R.hitung.terapi },
  ];

  const labelSetiap = R.deret.length > 20 ? 5 : R.deret.length > 12 ? 3 : 1;

  return (
    <div className="page fade-in">
      <div className="page-head">
        <h1 className="t-h1 c-1">Laporan</h1>
        <p className="t-sm c-3" style={{ marginTop: 2 }}>Rekap kegiatan dan performa kandang Anda</p>
      </div>

      {kosong ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Icon.trendUp size={24} /></div>
            <p className="empty-title">Belum ada yang bisa dilaporkan</p>
            <p className="empty-text" style={{ marginBottom: 0 }}>
              Laporan tersusun otomatis dari catatan harian Anda. Tambahkan ternak dan mulai mencatat,
              angkanya akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="stack-20">
          {/* ---- pemilih periode ---- */}
          <div>
            <div className="segmented" style={{ marginBottom: 10 }}>
              {PERIODE.map((p) => (
                <button key={p.key}
                        onClick={() => { setPeriode(p.key); setOffset(0); }}
                        className={periode === p.key ? "active" : ""}
                        style={{ fontSize: 12.5, padding: "8px 4px" }}>
                  {p.key === "keseluruhan" ? "Semua" : p.label.replace(" ini", "")}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <button className="icon-btn" disabled={!bisaMundur}
                      onClick={() => setOffset((o) => o - 1)} aria-label="Periode sebelumnya"
                      style={{ opacity: bisaMundur ? 1 : .35 }}>
                <Icon.chevronLeft size={17} stroke={2.2} />
              </button>
              <p className="t-smstr c-1" style={{ margin: 0, textAlign: "center", flex: 1 }}>{R.label}</p>
              <button className="icon-btn" disabled={!bisaMaju}
                      onClick={() => setOffset((o) => Math.min(0, o + 1))} aria-label="Periode berikutnya"
                      style={{ opacity: bisaMaju ? 1 : .35 }}>
                <Icon.chevronRight size={17} stroke={2.2} />
              </button>
            </div>
          </div>

          {/* ---- Rewind ---- */}
          {(periode === "tahun" || periode === "keseluruhan") && R.totalKejadian > 0 && (
            <button onClick={onBukaRewind} className="rewind-cta">
              <HeroScene variant="card" />
              <span className="rewind-cta-in">
                <span className="rewind-cta-badge"><Icon.sparkle size={13} stroke={2} /> Rewind</span>
                <span className="rewind-cta-title">
                  Kaleidoskop {periode === "tahun" ? R.label : "kandang"} Anda
                </span>
                <span className="rewind-cta-sub">
                  {nf.format(R.totalKejadian)} catatan, dirangkum jadi cerita singkat
                </span>
              </span>
              <span className="rewind-cta-arrow"><Icon.arrowRight size={18} stroke={2.2} /></span>
            </button>
          )}

          {/* ---- ringkasan angka ---- */}
          <section>
            <div className="stat-grid">
              <Stat label="Total catatan" ikon={Icon.activity}
                    nilai={nf.format(R.totalKejadian)}
                    sub={R.sebelum ? undefined : "sepanjang waktu"} />
              <Stat label="Kelahiran" ikon={Icon.sparkle}
                    nilai={nf.format(R.hitung.lahir)}
                    sub={`${nf.format(R.hitung.ib)} kali IB`} />
              <Stat label="Hari aktif" ikon={Icon.calendar}
                    nilai={nf.format(R.hariAktif)}
                    sub="hari dengan catatan" />
              <Stat label="Populasi" ikon={Icon.cow}
                    nilai={nf.format(R.populasiSekarang)}
                    sub={`${R.betina} betina · ${R.jantan} jantan`} />
            </div>
            {R.sebelum && (
              <p style={{ margin: "10px 0 0" }}><Delta kini={R.totalKejadian} lalu={R.sebelum.total} /></p>
            )}
          </section>

          {/* ---- aktivitas ---- */}
          <section>
            <h2 className="t-h2 c-1" style={{ marginBottom: 3 }}>Aktivitas pencatatan</h2>
            <p className="t-sm c-3" style={{ margin: "0 0 12px" }}>
              Jumlah kejadian yang Anda catat {periode === "tahun" || periode === "keseluruhan" ? "tiap bulan" : "tiap hari"}
            </p>
            <div className="card card-pad">
              {R.totalKejadian === 0 ? (
                <p className="t-sm c-3" style={{ margin: 0, textAlign: "center", padding: "18px 0" }}>
                  Belum ada catatan pada periode ini.
                </p>
              ) : (
                <BarChart data={R.deret} labelSetiap={labelSetiap} />
              )}
            </div>
          </section>

          {/* ---- peta panas ---- */}
          {R.grid && R.totalKejadian > 0 && (
            <section>
              <h2 className="t-h2 c-1" style={{ marginBottom: 3 }}>Peta kerajinan</h2>
              <p className="t-sm c-3" style={{ margin: "0 0 12px" }}>
                Makin gelap, makin banyak catatan hari itu
              </p>
              <div className="card card-pad">
                <Heatmap kolom={R.grid} />
                <HeatmapLegend />
              </div>
            </section>
          )}

          {/* ---- rincian jenis ---- */}
          <section>
            <h2 className="t-h2 c-1" style={{ marginBottom: 12 }}>Rincian kejadian</h2>
            <div className="card card-pad"><BarList items={rincian} /></div>
          </section>

          {/* ---- performa reproduksi ---- */}
          <section>
            <h2 className="t-h2 c-1" style={{ marginBottom: 3 }}>Performa reproduksi</h2>
            <p className="t-sm c-3" style={{ margin: "0 0 12px" }}>
              Diukur dengan standar yang dipakai penyuluh peternakan
            </p>
            <div className="stack-12">
              <KartuMetrik
                judul="Service per Conception (S/C)"
                nilai={angka(R.sc, 2)} satuan={R.sc == null ? "" : "×"}
                penilaian={nilaiSC(R.sc)}
                meter={<Meter nilai={R.sc} maks={4} ideal={2} sev={nilaiSC(R.sc).sev}
                              format={(v) => `${v}×`} />}
                penjelasan="Rata-rata berapa kali IB dibutuhkan sampai satu sapi berhasil bunting. Makin kecil makin efisien."
              />
              <KartuMetrik
                judul="Angka keberhasilan IB"
                nilai={angka(R.cr, 0)} satuan={R.cr == null ? "" : "%"}
                penilaian={nilaiCR(R.cr)}
                meter={<Meter nilai={R.cr} maks={100} ideal={60} sev={nilaiCR(R.cr).sev}
                              format={(v) => `${v}%`} />}
                penjelasan="Persentase pemeriksaan kebuntingan yang hasilnya positif."
              />
              <KartuMetrik
                judul="Jarak antar kelahiran"
                nilai={angka(R.ci, 0)} satuan={R.ci == null ? "" : "hari"}
                penilaian={nilaiCI(R.ci)}
                meter={<Meter nilai={R.ci} maks={600} ideal={400} sev={nilaiCI(R.ci).sev}
                              format={(v) => `${v} hari`} />}
                penjelasan="Rata-rata jarak dari satu kelahiran ke kelahiran berikutnya pada ekor yang sama. Dihitung dari seluruh riwayat, bukan hanya periode ini."
              />
            </div>
          </section>

          {/* ---- populasi ---- */}
          {populasi.length >= 2 && (
            <section>
              <h2 className="t-h2 c-1" style={{ marginBottom: 12 }}>Perkembangan populasi</h2>
              <div className="card card-pad">
                <AreaChart data={populasi} satuan="ekor" />
              </div>
            </section>
          )}

          {/* ---- sorotan ---- */}
          {(R.teraktif || R.tersibuk) && (
            <section>
              <h2 className="t-h2 c-1" style={{ marginBottom: 12 }}>Sorotan</h2>
              <div className="rowlist">
                {R.teraktif && (
                  <button className="row" onClick={() => onPilihSapi && onPilihSapi({ id: R.teraktif.sapiId })}>
                    <span className="row-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                      <Icon.cow size={18} />
                    </span>
                    <span className="row-main">
                      <span className="row-title">Sapi paling banyak dicatat</span>
                      <span className="row-sub">{R.teraktif.kode} · {nf.format(R.teraktif.n)} catatan</span>
                    </span>
                    <Icon.chevronRight size={18} className="row-chev" />
                  </button>
                )}
                {R.tersibuk && (
                  <div className="row" style={{ cursor: "default" }}>
                    <span className="row-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                      <Icon.calendar size={18} />
                    </span>
                    <span className="row-main">
                      <span className="row-title">Bulan tersibuk</span>
                      <span className="row-sub">{R.tersibuk.nama} · {nf.format(R.tersibuk.jumlah)} catatan</span>
                    </span>
                  </div>
                )}
                <div className="row" style={{ cursor: "default" }}>
                  <span className="row-icon" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                    <Icon.sparkle size={18} />
                  </span>
                  <span className="row-main">
                    <span className="row-title">Rentetan terpanjang</span>
                    <span className="row-sub">{nf.format(R.streak)} minggu berturut-turut ada catatan</span>
                  </span>
                </div>
              </div>
            </section>
          )}

          <p className="t-xs c-3" style={{ textAlign: "center", lineHeight: 1.6 }}>
            Semua angka dihitung langsung dari catatan Anda.<br />
            Makin rajin dicatat, makin bisa dipercaya laporannya.
          </p>
        </div>
      )}
    </div>
  );
}
