import React from "react";

/* ============================================================================
   AURORA — latar dekoratif untuk splash, layar sambutan, layar masuk, dan
   kartu sapaan di Beranda.

   Dibangun murni dari gradasi CSS, bukan gambar:
   - Ukurannya nol byte tambahan. Tidak ada yang perlu diunduh, jadi layar
     pembuka muncul seketika bahkan di sinyal 3G — dan tetap tampil utuh saat
     aplikasi dibuka offline (SIRAPI adalah PWA dengan service worker).
   - Tajam di layar berapa pun kerapatan pikselnya.
   - Warnanya terkunci ke palet SIRAPI, sehingga teks putih di atasnya dijamin
     lolos kontras — hal yang tidak bisa dijamin kalau latarnya foto.

   Tiga varian:
     full    — layar penuh (splash, layar sambutan)
     compact — pita atas (layar masuk & daftar)
     card    — kartu kecil (sapaan di Beranda)
   ========================================================================= */

export function HeroScene({ variant = "full", className = "", style, children }) {
  return (
    <div className={`aurora aurora-${variant} ${className}`} style={style}>
      <span className="aurora-blob b1" />
      <span className="aurora-blob b2" />
      <span className="aurora-blob b3" />
      <span className="aurora-rings" />
      <span className="aurora-grain" />
      {children}
    </div>
  );
}

export default HeroScene;
