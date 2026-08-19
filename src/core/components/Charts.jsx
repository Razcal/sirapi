import React from "react";

/* ============================================================================
   GRAFIK SIRAPI — SVG murni, tanpa pustaka grafik.

   Keputusan warna yang dipegang di seluruh berkas ini:

   - TIDAK ADA PALET KATEGORIS BERWARNA-WARNI. Aplikasi ini sudah memakai warna
     untuk menyatakan tingkat kegentingan (merah = perlu petugas, kuning =
     perlu tindakan, hijau = aman). Kalau grafik ikut memakai biru/oranye/ungu
     untuk membedakan "jenis kejadian", dua sistem warna bertabrakan dan
     pembacanya harus mengingat dua arti untuk warna yang sama.

     Jadi: setiap grafik di sini memakai SATU hue (hijau merek) untuk besaran,
     dan warna kegentingan hanya dipakai kalau yang dimaksud memang keadaan —
     selalu bersama ikon dan label, tidak pernah warna saja.

   - Perbandingan antar jenis kejadian ditampilkan sebagai daftar batang
     horizontal berwarna sama, bukan tumpukan warna-warni. Panjang batang
     sudah menyatakan besaran; warna tidak perlu mengulanginya.

   Spesifikasi mark mengikuti pedoman visualisasi data: batang maksimal 24px,
   ujung membulat 4px dengan pangkal rata di garis dasar, garis 2px, titik
   minimal 8px dengan cincin warna permukaan, gridline hairline yang mundur ke
   belakang, dan label yang dipasang selektif — bukan angka di setiap titik.
   ========================================================================= */

const HUE = "#047857";          // hue tunggal untuk besaran, kontras 5,48:1 di putih
const HUE_SOFT = "#D1FADF";
const GRID = "#E4E7EC";
const INK_3 = "#667085";

/* Ramp sequential untuk peta panas — monotonik terang→gelap (sudah diuji). */
const RAMP = ["#F2F4F7", "#D1FADF", "#A6F4C5", "#6CE9A6", "#32D583", "#12B76A", "#047857"];

const nf = new Intl.NumberFormat("id-ID");

/* ---------------------------------------------------------------- BAR ----- */

/** Grafik batang vertikal untuk deret waktu.
    Satu seri, jadi tidak perlu kotak legenda — judul kartu sudah menyebutnya. */
export function BarChart({ data = [], height = 132, labelSetiap = 1, onPilih, terpilih }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  // Batang tidak pernah memenuhi slotnya — sisanya sengaja dibiarkan jadi udara.
  // Lebarnya persen dari slot masing-masing, dengan langit-langit 24px.
  const lebarBar = data.length > 20 ? "72%" : "58%";

  const puncak = data.reduce((best, d, i) => (d.nilai > (data[best]?.nilai ?? -1) ? i : best), 0);
  const adaData = data.some((d) => d.nilai > 0);

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", height }}>
        {/* gridline hairline, mundur ke belakang */}
        <svg width="100%" height={height} style={{ display: "block", overflow: "visible" }} preserveAspectRatio="none">
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1="0" x2="100%" y1={height - f * height} y2={height - f * height}
                  stroke={GRID} strokeWidth="1" />
          ))}
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
          {data.map((d, i) => {
            const t = maks > 0 ? d.nilai / maks : 0;
            const h = d.nilai === 0 ? 2 : Math.max(4, t * (height - 16));
            const aktif = terpilih === i;
            return (
              <div
                key={d.kunci ?? i}
                onClick={onPilih ? () => onPilih(i) : undefined}
                title={`${d.label}: ${nf.format(d.nilai)} kejadian`}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "flex-end", height: "100%",
                  cursor: onPilih ? "pointer" : "default",
                }}
              >
                {/* label nilai hanya di puncak — bukan angka di setiap batang */}
                {adaData && i === puncak && (
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: "var(--text)",
                    marginBottom: 3, fontVariantNumeric: "tabular-nums",
                  }}>{nf.format(d.nilai)}</span>
                )}
                <div style={{
                  width: lebarBar, minWidth: 3, maxWidth: 24, height: h,
                  background: d.nilai === 0 ? GRID : (aktif ? "#065F46" : HUE),
                  // ujung membulat di atas, pangkal rata di garis dasar
                  borderRadius: "4px 4px 0 0",
                  transition: "height .3s cubic-bezier(.32,.72,0,1), background .15s ease",
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* sumbu x — label diberi jarak supaya tidak bertabrakan */}
      <div style={{ display: "flex", marginTop: 7 }}>
        {data.map((d, i) => (
          <span key={d.kunci ?? i} style={{
            flex: 1, textAlign: "center", fontSize: 11, fontWeight: 600, color: INK_3,
            whiteSpace: "nowrap", overflow: "hidden",
            visibility: i % labelSetiap === 0 ? "visible" : "hidden",
          }}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}

/* --------------------------------------------------------------- AREA ----- */

/** Garis + area untuk satu seri (misal populasi ternak dari bulan ke bulan).
    Area diisi wash 10%, garis 2px, hanya titik akhir yang diberi penanda. */
export function AreaChart({ data = [], height = 110, satuan = "" }) {
  if (data.length < 2) return null;
  const W = 300, H = height, pad = 10;
  const maks = Math.max(...data.map((d) => d.nilai));
  const min = Math.min(...data.map((d) => d.nilai));
  const datar = maks === min;   // populasi tidak berubah sepanjang periode
  const span = Math.max(1, maks - min);
  const x = (i) => pad + (i * (W - pad * 2)) / (data.length - 1);
  // Kalau nilainya rata, garisnya ditaruh di tengah — bukan menempel di dasar,
  // yang bakal terbaca seperti "nol" padahal populasinya justru penuh.
  const y = (v) => (datar ? H / 2 : H - pad - ((v - min) / span) * (H - pad * 2));

  const garis = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.nilai).toFixed(1)}`).join(" ");
  const isi = `${garis} L${x(data.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const akhir = data[data.length - 1];

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <line x1="0" x2={W} y1={H - pad} y2={H - pad} stroke={GRID} strokeWidth="1" />
        <path d={isi} fill={HUE} opacity=".10" />
        <path d={garis} fill="none" stroke={HUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* penanda akhir: r=4 (8px) dengan cincin permukaan 2px */}
        <circle cx={x(data.length - 1)} cy={y(akhir.nilai)} r="4" fill={HUE} stroke="#fff" strokeWidth="2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: INK_3 }}>
          {datar ? "Tidak berubah sepanjang periode" : data[0].label}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
          {nf.format(akhir.nilai)}{satuan ? ` ${satuan}` : ""}
        </span>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ HEATMAP ----- */

/** Peta panas kalender — kolom = minggu, baris = hari. Ramp satu hue,
    makin banyak catatan makin gelap. Tiap sel punya tooltip sebagai
    penunjang, karena sel paling terang kontrasnya rendah. */
export function Heatmap({ kolom = [], ukuran = 13, gap = 3 }) {
  const semua = kolom.flatMap((k) => k.hari.map((h) => h.nilai)).filter((v) => v != null);
  const maks = Math.max(1, ...semua);
  const warna = (v) => {
    if (v == null) return "transparent";
    if (v === 0) return RAMP[0];
    const step = Math.ceil((v / maks) * (RAMP.length - 1));
    return RAMP[Math.min(RAMP.length - 1, Math.max(1, step))];
  };
  const HARI = ["S", "S", "R", "K", "J", "S", "M"];

  return (
    <figure style={{ margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap, paddingTop: 0 }}>
        {HARI.map((h, i) => (
          <span key={i} style={{
            height: ukuran, lineHeight: `${ukuran}px`, fontSize: 9.5, fontWeight: 600,
            color: INK_3, visibility: i % 2 === 0 ? "visible" : "hidden",
          }}>{h}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap, overflowX: "auto", paddingBottom: 2 }}>
        {kolom.map((k, ki) => (
          <div key={ki} style={{ display: "flex", flexDirection: "column", gap }}>
            {k.hari.map((h, hi) => (
              <span
                key={hi}
                title={h.nilai == null ? "" :
                  `${h.tanggal.getDate()}/${h.tanggal.getMonth() + 1}: ${nf.format(h.nilai)} catatan`}
                style={{
                  width: ukuran, height: ukuran, borderRadius: 3,
                  background: warna(h.nilai),
                  boxShadow: h.nilai != null && h.nilai > 0 ? "inset 0 0 0 0.5px rgba(2,36,28,.10)" : "none",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </figure>
  );
}

/** Legenda ramp untuk peta panas — identitas tidak boleh hanya dari warna. */
export function HeatmapLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: INK_3 }}>Sedikit</span>
      {RAMP.map((c) => (
        <span key={c} style={{ width: 11, height: 11, borderRadius: 3, background: c,
                               boxShadow: "inset 0 0 0 0.5px rgba(2,36,28,.10)" }} />
      ))}
      <span style={{ fontSize: 11, fontWeight: 600, color: INK_3 }}>Banyak</span>
    </div>
  );
}

/* ---------------------------------------------------------- BAR LIST ----- */

/** Rincian jenis kejadian sebagai batang horizontal. Semua batang berwarna
    sama: panjangnya sudah menyatakan besaran, jadi warna tidak perlu ikut
    mengulanginya — dan slot warna tetap bebas untuk menyatakan kegentingan. */
export function BarList({ items = [] }) {
  const maks = Math.max(1, ...items.map((i) => i.nilai));
  const total = items.reduce((a, b) => a + b.nilai, 0);
  if (total === 0) {
    return <p className="t-sm c-3" style={{ margin: 0, padding: "10px 0" }}>Belum ada kejadian pada periode ini.</p>;
  }
  return (
    <div>
      {items.filter((i) => i.nilai > 0).map((it) => (
        <div key={it.label} style={{ padding: "7px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--text-2)" }}>
              {it.label}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {nf.format(it.nilai)}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: HUE_SOFT, overflow: "hidden" }}>
            <div style={{
              width: `${(it.nilai / maks) * 100}%`, height: "100%",
              background: HUE, borderRadius: 999,
              transition: "width .4s cubic-bezier(.32,.72,0,1)",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- METER ----- */

/** Satu rasio terhadap batas ideal — bukan pie dua irisan.
    Trek memakai ramp yang sama, penanda ideal digambar sebagai garis. */
export function Meter({ nilai, maks, ideal, sev = "neut", format = (v) => v }) {
  const SEV = {
    ok:   "var(--ok-dot)",
    warn: "var(--warn-dot)",
    crit: "var(--crit-dot)",
    neut: "var(--neut-dot)",
  };
  const kosong = nilai == null;
  const pct = kosong ? 0 : Math.min(100, (nilai / maks) * 100);
  const idealPct = Math.min(100, (ideal / maks) * 100);

  return (
    <div>
      <div style={{ position: "relative", height: 9, borderRadius: 999, background: "var(--surface-3)", overflow: "visible" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 999,
          background: SEV[sev], transition: "width .45s cubic-bezier(.32,.72,0,1)",
        }} />
        <span title={`Batas ideal: ${format(ideal)}`} style={{
          position: "absolute", left: `${idealPct}%`, top: -3, bottom: -3, width: 2,
          background: "var(--text-2)", borderRadius: 2,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: INK_3 }}>0</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: INK_3 }}>
          batas ideal {format(ideal)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------- BAR UNTUK LATAR GELAP -- */

/** Versi batang untuk kartu Rewind yang latarnya gelap. Hue-nya diganti ke
    langkah ramp yang terang supaya kontrasnya tetap lolos (10,9:1). */
export function BarChartDark({ data = [], height = 120 }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const puncak = data.reduce((best, d, i) => (d.nilai > (data[best]?.nilai ?? -1) ? i : best), 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", height, gap: 3 }}>
        {data.map((d, i) => {
          const h = d.nilai === 0 ? 2 : Math.max(4, (d.nilai / maks) * (height - 18));
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column",
                                  alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              {i === puncak && d.nilai > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 3,
                               fontVariantNumeric: "tabular-nums" }}>{nf.format(d.nilai)}</span>
              )}
              <div style={{
                width: "100%", maxWidth: 22, height: h, borderRadius: "4px 4px 0 0",
                background: i === puncak ? "#6CE9A6" : "rgba(108,233,166,.42)",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 7 }}>
        {data.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 9.5, fontWeight: 600,
                                 color: "rgba(255,255,255,.5)" }}>
            {d.label?.[0] ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
