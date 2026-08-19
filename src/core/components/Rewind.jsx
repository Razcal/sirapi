import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "./Icons";
import { HeroScene } from "./Hero";
import { BarChartDark } from "./Charts";
import { ringkasan, deret, nilaiSC } from "../analytics";

const nf = new Intl.NumberFormat("id-ID");

/* ============================================================================
   REWIND — rangkuman setahun sebagai kartu layar penuh yang di-swipe.

   Aturan yang dipegang:
   - Setiap kartu hanya membawa SATU angka. Begitu satu kartu punya dua angka
     besar, keduanya berhenti terasa besar.
   - Tidak ada angka yang dikarang. Kartu yang datanya belum cukup (misal S/C
     tanpa kebuntingan terkonfirmasi) tidak ikut ditampilkan sama sekali,
     bukan diisi nol.
   - Bisa dilewati kapan saja. Rewind itu hiburan, bukan tugas.
   ========================================================================= */

function useKartu(dbCattle, tahun) {
  return useMemo(() => {
    const ref = new Date(tahun, 11, 31);
    const R = ringkasan(dbCattle, "tahun", ref, 0);
    const perBulan = deret(R.kejadian, R.mulai, R.selesai, "bulan");
    const kartu = [];

    kartu.push({
      id: "buka",
      kicker: String(tahun),
      besar: null,
      judul: `Setahun di kandang Anda`,
      teks: "Mari lihat apa saja yang terjadi — dirangkum dari catatan Anda sendiri.",
      ikon: Icon.sparkle,
    });

    kartu.push({
      id: "total",
      kicker: "Sepanjang tahun ini",
      besar: nf.format(R.totalKejadian),
      satuan: R.totalKejadian === 1 ? "catatan" : "catatan",
      judul: "Anda mencatat sebanyak ini",
      teks: R.sebelum && R.sebelum.total > 0
        ? (R.totalKejadian >= R.sebelum.total
            ? `Naik ${nf.format(R.totalKejadian - R.sebelum.total)} dari tahun lalu.`
            : `Turun ${nf.format(R.sebelum.total - R.totalKejadian)} dari tahun lalu.`)
        : "Setiap catatan bikin prediksi kalendernya makin akurat.",
      ikon: Icon.activity,
    });

    if (R.hariAktif > 0) {
      kartu.push({
        id: "rajin",
        kicker: "Kerajinan mencatat",
        besar: nf.format(R.hariAktif),
        satuan: "hari",
        judul: "Hari yang ada catatannya",
        teks: `Rentetan terpanjang Anda ${nf.format(R.streak)} minggu berturut-turut.`,
        ikon: Icon.calendar,
      });
    }

    if (R.hitung.lahir > 0) {
      kartu.push({
        id: "lahir",
        kicker: "Kabar paling ditunggu",
        besar: nf.format(R.hitung.lahir),
        satuan: R.hitung.lahir === 1 ? "kelahiran" : "kelahiran",
        judul: "Pedet lahir di kandang Anda",
        teks: R.sebelum && R.sebelum.lahir > 0
          ? `Tahun lalu ${nf.format(R.sebelum.lahir)}.`
          : "Semoga tahun depan lebih banyak lagi.",
        ikon: Icon.sparkle,
      });
    }

    if (R.hitung.ib > 0) {
      kartu.push({
        id: "ib",
        kicker: "Inseminasi buatan",
        besar: nf.format(R.hitung.ib),
        satuan: "kali IB",
        judul: "Tercatat sepanjang tahun",
        teks: R.sc != null
          ? `Rata-rata ${R.sc.toLocaleString("id-ID", { maximumFractionDigits: 2 })}× IB untuk satu kebuntingan — ${nilaiSC(R.sc).sev === "ok" ? "ini sudah dalam kisaran ideal" : "kisaran idealnya 1,5–2,0×"}.`
          : "Hasil pemeriksaan kebuntingannya belum tercatat.",
        ikon: Icon.heart,
      });
    }

    if (R.tersibuk) {
      kartu.push({
        id: "sibuk",
        kicker: "Bulan tersibuk",
        besar: R.tersibuk.nama,
        besarKecil: true,
        satuan: `${nf.format(R.tersibuk.jumlah)} catatan`,
        judul: "Bulan paling padat",
        teks: "Sebaran catatan Anda sepanjang tahun:",
        chart: perBulan,
        ikon: Icon.calendar,
      });
    }

    if (R.teraktif) {
      kartu.push({
        id: "bintang",
        kicker: "Bintang tahun ini",
        besar: R.teraktif.kode,
        besarKecil: true,
        satuan: `${nf.format(R.teraktif.n)} catatan`,
        judul: "Sapi yang paling banyak dicatat",
        teks: "Paling sering butuh perhatian Anda tahun ini.",
        ikon: Icon.cow,
      });
    }

    kartu.push({
      id: "tutup",
      kicker: `Rewind ${tahun}`,
      besar: null,
      judul: "Terima kasih sudah rajin mencatat",
      teks: "Setiap tanggal yang Anda isi bikin sistem makin tepat mengingatkan kapan tiap ekor perlu diurus.",
      ikon: Icon.checkCircle,
      penutup: true,
      ringkas: R,
    });

    return { kartu, R };
  }, [dbCattle, tahun]);
}

export default function RewindView({ dbCattle, tahun, onTutup, onBagikan }) {
  const { kartu, R } = useKartu(dbCattle, tahun);
  const [i, setI] = useState(0);
  const sentuh = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onTutup();
      if (e.key === "ArrowRight") setI((v) => Math.min(kartu.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [kartu.length, onTutup]);

  const maju = () => setI((v) => Math.min(kartu.length - 1, v + 1));
  const mundur = () => setI((v) => Math.max(0, v - 1));

  const k = kartu[i];
  const Ikon = k.ikon;

  return (
    <div
      className="rewind"
      onTouchStart={(e) => { sentuh.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (sentuh.current == null) return;
        const d = e.changedTouches[0].clientX - sentuh.current;
        if (Math.abs(d) > 45) (d < 0 ? maju : mundur)();
        sentuh.current = null;
      }}
    >
      <HeroScene />

      {/* penanda kemajuan */}
      <div className="rewind-bars">
        {kartu.map((_, n) => (
          <span key={n} className={`rewind-bar ${n <= i ? "on" : ""}`} onClick={() => setI(n)} />
        ))}
      </div>

      <button className="rewind-close" onClick={onTutup} aria-label="Tutup Rewind">
        <Icon.close size={19} stroke={2.2} />
      </button>

      {/* isi kartu — di-key supaya animasinya mengulang tiap ganti kartu */}
      <div className="rewind-body" key={k.id}>
        <span className="rewind-ic"><Ikon size={22} stroke={2} /></span>
        <p className="rewind-kicker">{k.kicker}</p>

        {k.besar != null && (
          <p className={`rewind-big ${k.besarKecil ? "sm" : ""}`}>
            {k.besar}
            {k.satuan && <span className="rewind-unit">{k.satuan}</span>}
          </p>
        )}

        <h2 className="rewind-title">{k.judul}</h2>
        <p className="rewind-text">{k.teks}</p>

        {k.chart && (
          <div style={{ marginTop: 20 }}>
            <BarChartDark data={k.chart} height={116} />
          </div>
        )}

        {k.penutup && (
          <div className="rewind-summary">
            {[
              { l: "Catatan", v: nf.format(R.totalKejadian) },
              { l: "Kelahiran", v: nf.format(R.hitung.lahir) },
              { l: "Hari aktif", v: nf.format(R.hariAktif) },
              { l: "Populasi", v: nf.format(R.populasiSekarang) },
            ].map((s) => (
              <div key={s.l} className="rewind-sum-cell">
                <span className="rewind-sum-v">{s.v}</span>
                <span className="rewind-sum-l">{s.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* aksi */}
      <div className="rewind-foot">
        {k.penutup ? (
          <>
            <button onClick={() => onBagikan && onBagikan(R)} className="btn btn-lg btn-block intro-btn">
              <Icon.download size={17} /> Bagikan rangkuman
            </button>
            <button onClick={onTutup} className="rewind-skip" style={{ marginTop: 12 }}>Tutup</button>
          </>
        ) : (
          <>
            <button onClick={maju} className="btn btn-lg btn-block intro-btn">
              Lanjut <Icon.arrowRight size={17} stroke={2.2} />
            </button>
            <button onClick={onTutup} className="rewind-skip" style={{ marginTop: 12 }}>Lewati</button>
          </>
        )}
      </div>

      {/* area ketuk kiri/kanan, seperti stories */}
      <button className="rewind-tap left" onClick={mundur} aria-label="Kartu sebelumnya" />
      <button className="rewind-tap right" onClick={maju} aria-label="Kartu berikutnya" />
    </div>
  );
}
