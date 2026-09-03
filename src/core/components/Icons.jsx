/* eslint-disable react-refresh/only-export-components --
   File ini sengaja mengekspor objek `Icon` berisi puluhan komponen ikon,
   bukan satu komponen per file — memecahnya akan menyentuh semua pemanggilan
   Icon.xxx di App.jsx tanpa manfaat nyata selain hot-reload lebih mulus. */
import React from "react";

/* Satu set ikon dengan gaya konsisten: garis 1.75px, ujung membulat, kotak 24×24.
   Sebelumnya ikon ditulis inline satu per satu di App.jsx dengan ketebalan garis
   2 / 2.5 yang campur aduk, dan dua di antaranya lupa viewBox sehingga tergunting.
   Semua ikon di sini mewarisi warna dari CSS (currentColor). */

const Svg = ({ size = 20, stroke = 1.75, fill = "none", children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={fill === "none" ? "currentColor" : "none"}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const Icon = {
  home: (p) => (
    <Svg {...p}><path d="M3 10.2 12 3l9 7.2" /><path d="M5 9.6V20a1 1 0 0 0 1 1h3.5v-5.5h5V21H18a1 1 0 0 0 1-1V9.6" /></Svg>
  ),
  cow: (p) => (
    <Svg {...p}>
      {/* tanduk — bagian yang paling cepat dikenali sebagai sapi,
          bahkan saat ikon dirender kecil di navigasi bawah */}
      <path d="M5 4.5c-1.6 0-2.6 1.1-2.6 2.6 0 1.3.8 2.3 2 2.6" />
      <path d="M19 4.5c1.6 0 2.6 1.1 2.6 2.6 0 1.3-.8 2.3-2 2.6" />
      {/* kepala */}
      <path d="M4.4 9.2h15.2v3.4c0 2.3-1.3 4.3-3.3 5.2a4.6 4.6 0 0 1-8.6 0c-2-.9-3.3-2.9-3.3-5.2Z" />
      {/* mata */}
      <path d="M9.2 12h.01M14.8 12h.01" />
      {/* moncong */}
      <path d="M10.3 17.4h3.4" />
    </Svg>
  ),
  calendar: (p) => (
    <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01" /></Svg>
  ),
  book: (p) => (
    <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v13" /><path d="M6.5 17H20v3.5H6.5A2.5 2.5 0 0 1 4 18V5.5" /><path d="M8 7.5h8" /></Svg>
  ),
  user: (p) => (
    <Svg {...p}><circle cx="12" cy="8" r="3.75" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></Svg>
  ),
  plus:  (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  search:(p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Svg>,
  close: (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>,
  chevronRight: (p) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>,
  chevronDown:  (p) => <Svg {...p}><path d="m5 9 7 7 7-7" /></Svg>,
  chevronLeft:  (p) => <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>,
  arrowRight:   (p) => <Svg {...p}><path d="M4 12h16M14 6l6 6-6 6" /></Svg>,
  alert: (p) => (
    <Svg {...p}><path d="M10.3 3.9 1.9 18.2A2 2 0 0 0 3.6 21.2h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17.2h.01" /></Svg>
  ),
  alertCircle: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.3h.01" /></Svg>,
  check:       (p) => <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>,
  checkCircle: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.2 12.2 2.6 2.6 5-5.4" /></Svg>,
  info:  (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8h.01" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.3 2" /></Svg>,
  heart: (p) => (
    <Svg {...p}><path d="M12 20.3 4.2 12.5a4.9 4.9 0 0 1 0-7 5 5 0 0 1 7.1 0l.7.7.7-.7a5 5 0 0 1 7.1 0 4.9 4.9 0 0 1 0 7Z" /></Svg>
  ),
  activity: (p) => <Svg {...p}><path d="M3 12h4l2.5-7 5 14 2.5-7h4" /></Svg>,
  stethoscope: (p) => (
    <Svg {...p}><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M5 3H3.5M13 3h1.5" /><path d="M9 12v2.5a5 5 0 0 0 10 0V13" /><circle cx="19" cy="11" r="2" /></Svg>
  ),
  lock: (p) => (
    <Svg {...p}><rect x="4" y="10.5" width="16" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></Svg>
  ),
  bell: (p) => (
    <Svg {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 5.5-2.2 7-2.2 7h16.4S18 14 18 8.5" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></Svg>
  ),
  help:  (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 2.3" /><path d="M12 16.5h.01" /></Svg>,
  logout:(p) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4" /></Svg>,
  share: (p) => (
    <Svg {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" /></Svg>
  ),
  edit:  (p) => <Svg {...p}><path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17V20Z" /><path d="m14.5 7 2.5 2.5" /></Svg>,
  trash: (p) => <Svg {...p}><path d="M4 6.5h16M9.5 6.5V4.5h5v2" /><path d="M6.5 6.5 7.4 20a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1l.9-13.5" /><path d="M10.5 10.5v6M13.5 10.5v6" /></Svg>,
  filter:(p) => <Svg {...p}><path d="M3 5.5h18M6.5 12h11M10 18.5h4" /></Svg>,
  trendUp: (p) => <Svg {...p}><path d="M3 17 9.5 10.5l3.5 3.5L21 6.5" /><path d="M15.5 6.5H21v5.5" /></Svg>,
  pin:   (p) => <Svg {...p}><path d="M12 21s-6.5-6.6-6.5-11a6.5 6.5 0 0 1 13 0c0 4.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></Svg>,
  phone: (p) => <Svg {...p}><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" /></Svg>,
  mail:  (p) => <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></Svg>,
  refresh: (p) => <Svg {...p}><path d="M20 11a8 8 0 0 0-13.7-4.9L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 13.7 4.9L21 15" /><path d="M21 20v-5h-5" /></Svg>,
  tag:   (p) => <Svg {...p}><path d="M3 3h8l10 10-8 8L3 11Z" /><circle cx="7.5" cy="7.5" r="1.3" /></Svg>,
  video: (p) => <Svg {...p}><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10.5 6-3v9l-6-3Z" /></Svg>,
  sparkle: (p) => <Svg {...p}><path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9Z" /><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" /></Svg>,
  download: (p) => <Svg {...p}><path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4 17.5v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" /></Svg>,
  eye:      (p) => <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>,
  eyeOff:   (p) => <Svg {...p}><path d="M10.7 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a15.9 15.9 0 0 1-2.9 3.6M6.3 8.3A15.6 15.6 0 0 0 2.5 12S6 18 12 18a8.9 8.9 0 0 0 3.5-.7" /><path d="M3 3l18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>,
  building: (p) => <Svg {...p}><path d="M4 21V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 14 5.5V21" /><path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21" /><path d="M2.5 21h19" /><path d="M7 8h4M7 12h4M7 16h4M17 14h.01M17 17.5h.01" /></Svg>,
};
