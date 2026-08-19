import React from "react";

/* Donat SVG murni — menggantikan Recharts.
   Alasannya tiga:
   1. Recharts menambah ±92 KB (gzip) ke bundel padahal aplikasi ini cuma punya
      satu grafik. Untuk pengguna di pedesaan dengan sinyal seadanya, itu mahal.
   2. Recharts merender lewat ResponsiveContainer yang butuh satu frame untuk
      mengukur diri. Kartu "Bagikan" diekspor jadi PNG dengan html-to-image,
      dan grafik yang belum selesai mengukur bisa ikut terekspor dalam keadaan
      kosong.
   3. Di sini kita hanya butuh satu bentuk. Menariknya sendiri justru lebih
      sedikit kode daripada mengonfigurasi pustaka grafik.

   Teknik: satu <circle> per segmen, tebal garis = (outer - inner), lalu
   panjang tiap segmen diatur dengan strokeDasharray. Celah antar segmen
   didapat dengan memendekkan tiap segmen sepanjang `gap`. */

export default function Donut({
  data = [],           // [{ value, color }]
  size = 116,
  inner = 40,
  outer = 57,
  gap = 3,             // celah antar segmen, dalam piksel busur
  track = "#EAECF0",
  children,
}) {
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const r = (inner + outer) / 2;
  const sw = outer - inner;
  const C = 2 * Math.PI * r;
  const visible = data.filter((d) => Number(d.value) > 0);
  const onlyOne = visible.length === 1;

  let cursor = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={sw} />
          {total > 0 &&
            visible.map((d, i) => {
              const len = (Number(d.value) / total) * C;
              // Segmen tunggal digambar penuh — kalau dipotong celah, lingkaran
              // penuh malah terlihat "sumbing" tanpa alasan.
              const drawn = onlyOne ? len : Math.max(len - gap, 0.5);
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={sw}
                  strokeLinecap="butt"
                  strokeDasharray={`${drawn} ${C - drawn}`}
                  strokeDashoffset={-cursor}
                />
              );
              cursor += len;
              return el;
            })}
        </g>
      </svg>
      {children != null && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
