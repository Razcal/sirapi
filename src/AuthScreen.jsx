import React, { useState, useRef } from "react";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { dialog } from "./core/helpers";
import { TUBAN_DATA, GOOGLE_WEB_CLIENT_ID } from "./core/constants";
import { FF } from "./core/components/SharedUI";
import { authService } from "./core/authService";
import { Icon } from "./core/components/Icons";
import { HeroScene } from "./core/components/Hero";
import logoTuban from "./Tubankab.png";

// Logo "G" resmi Google — bukan bagian dari set Icon.* (ikon garis generik),
// jadi ditulis terpisah di sini karena harus 4 warna sesuai brand guideline.
const GoogleG = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.57-5.17 3.57-8.82Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.58l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);

export function AuthScreen({ setProfile }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Lupa Password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Login state
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMatch = confirmPassword === "" ? null : registerPassword === confirmPassword;
  const [profileData, setProfileData] = useState({
    name: "",
    kecamatan: "Tuban",
    desa: "Baturetno",
    rt: "",
    rw: "",
    dusun: "",
    photo: null
  });

  // Sign-in Google: kalau akun ini baru pertama kali dipakai di SIRAPI,
  // belum ada baris di tabel `users` (phone/kecamatan/desa Google tidak
  // pernah kirim itu). Daripada menahan mereka di layar login, langsung
  // masuk ke dashboard — App.jsx yang akan minta lengkapi data itu nanti,
  // pas mereka menekan "Tambah sapi pertama" (lihat profileIncomplete).
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleInitialized = useRef(false);

  const handleGoogleLogin = async () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith("ISI_DENGAN_")) {
      return dialog.alert("Masuk dengan Google belum diaktifkan admin. Silakan gunakan email/password, atau hubungi admin dinas.", "Belum Tersedia");
    }

    setIsGoogleLoading(true);
    try {
      if (!googleInitialized.current) {
        await SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } });
        googleInitialized.current = true;
      }

      const { result } = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
      const idToken = result?.idToken;
      if (!idToken) throw new Error("Google tidak mengembalikan token. Coba lagi.");

      const authResult = await authService.loginWithGoogleIdToken(idToken);
      if (!authResult.success) throw new Error(authResult.error || "Gagal masuk dengan Google");

      if (authResult.needsProfile) {
        setProfile({ ...authResult.googleUser, profileIncomplete: true });
      } else {
        dialog.alert(`Selamat datang kembali, ${authResult.user.name}!`, "Sukses");
        setProfile(authResult.user);
      }
    } catch (err) {
      dialog.alert(err.message || "Gagal masuk dengan Google", "Gagal");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleKecamatanChange = (kec) => {
    const newDesa = TUBAN_DATA[kec]?.[0] || "";
    setProfileData({ ...profileData, kecamatan: kec, desa: newDesa });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmailOrPhone || !loginPassword) {
      return dialog.alert("Harap isi Email/No. HP dan Password!", "Perhatian");
    }
    
    setIsLoading(true);
    const result = await authService.login(loginEmailOrPhone, loginPassword);
    setIsLoading(false);

    if (result.success) {
      dialog.alert(`Selamat datang kembali, ${result.user.name}!`, "Sukses");
      setProfile(result.user);
    } else {
      dialog.alert(result.error || "Login gagal!", "Login Gagal");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      return dialog.alert("Harap isi email yang terdaftar!", "Perhatian");
    }

    setIsSendingReset(true);
    const result = await authService.requestPasswordReset(forgotEmail);
    setIsSendingReset(false);

    if (result.success) {
      dialog.alert("Link reset password telah dikirim ke email Anda. Silakan cek kotak masuk (dan folder spam) untuk melanjutkan.", "Email Terkirim");
      setForgotPasswordOpen(false);
      setForgotEmail("");
    } else {
      dialog.alert("Gagal mengirim link reset. Jika email Anda terdaftar lewat akun lama (sebelum sistem ini diperbarui), silakan hubungi petugas/admin dinas secara langsung.", "Gagal Mengirim");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validasi wajib diisi
    if (!registerEmail || !registerPhone || !registerPassword || !confirmPassword || !profileData.name || !profileData.rt || !profileData.rw) {
      return dialog.alert("Harap lengkapi semua kolom yang wajib!", "Perhatian");
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      return dialog.alert("Format email tidak valid!", "Email Tidak Valid");
    }

    // Validasi password match
    if (registerPassword !== confirmPassword) {
      return dialog.alert("Kata sandi dan konfirmasi kata sandi tidak sama!", "Password Tidak Cocok");
    }

    // Validasi panjang password
    if (registerPassword.length < 6) {
      return dialog.alert("Kata sandi minimal 6 karakter!", "Password Terlalu Pendek");
    }

    setIsLoading(true);
    const result = await authService.register(registerEmail, registerPhone, registerPassword, profileData);
    setIsLoading(false);

    if (result.success) {
      dialog.alert("Pendaftaran Akun Berhasil! Silakan login dengan akun Anda.", "Sukses");
      // Reset form dan kembali ke login
      setLoginEmailOrPhone(registerEmail);
      setLoginPassword("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setConfirmPassword("");
      setProfileData({
        name: "",
        kecamatan: "Tuban",
        desa: "Baturetno",
        rt: "",
        rw: "",
        dusun: "",
        photo: null
      });
      setIsLogin(true);
    } else {
      dialog.alert(result.error || "Pendaftaran gagal!", "Pendaftaran Gagal");
    }
  };

  const inp = "input";

  return (
    <>
    <div className="app-shell fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden", background: "#02241C" }}>
      <div className="auth-hero">
        <HeroScene variant="compact" />
        <div className="auth-hero-in">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,.95)",
                           display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                           boxShadow: "0 10px 22px -10px rgba(0,0,0,.5)" }}>
              <img src={logoTuban} alt="" style={{ width: 26, height: "auto" }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1 }}>SIRAPI</p>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.6)", lineHeight: 1.2 }}>
                Sistem Informasi Reproduksi Sapi
              </p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-.025em", lineHeight: 1.25 }}>
            {isLogin ? "Selamat datang kembali." : "Buat akun peternak."}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "rgba(255,255,255,.62)", lineHeight: 1.5 }}>
            {isLogin
              ? "Masuk untuk melanjutkan pencatatan kandang Anda."
              : "Isi sekali, lalu semua ternak Anda tercatat rapi."}
          </p>
        </div>
      </div>

      <div className="auth-sheet">
        <div className="segmented" style={{ marginBottom: 20 }}>
          <button type="button" onClick={() => setIsLogin(true)} className={isLogin ? "active" : ""}>Masuk</button>
          <button type="button" onClick={() => setIsLogin(false)} className={!isLogin ? "active" : ""}>Daftar baru</button>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={isGoogleLoading} className="btn btn-lg btn-block"
                style={{ marginBottom: 18, background: "#fff", border: "1.5px solid var(--line)", color: "var(--text-1)",
                         display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <GoogleG size={19} />
          {isGoogleLoading ? "Menghubungkan..." : (isLogin ? "Masuk dengan Google" : "Daftar dengan Google")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px" }}>
          <hr className="divider" style={{ flex: 1, margin: 0 }} />
          <span className="t-xs c-3" style={{ fontWeight: 700 }}>ATAU</span>
          <hr className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4 fade-in">
            <FF label="Email atau nomor HP"><input type="text" className="input" placeholder="nama@email.com atau 0812…" value={loginEmailOrPhone} onChange={e => setLoginEmailOrPhone(e.target.value)} /></FF>
            <div>
              <FF label="Kata sandi">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} className={`${inp} pr-12`} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)", background: "none", border: 0, cursor: "pointer", display: "flex", padding: 4 }}>{showPassword ? <Icon.eyeOff size={19} /> : <Icon.eye size={19} />}</button>
                </div>
              </FF>
              <div className="flex justify-between items-center -mt-2">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minHeight: 44 }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="t-sm c-2" style={{ fontWeight: 600 }}>Ingat saya</span>
                </label>
                <button type="button" onClick={() => { setForgotEmail(""); setForgotPasswordOpen(true); }} className="text-[13px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Lupa kata sandi?</button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{isLoading ? "Memproses..." : "Masuk"}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 fade-in pb-10">
            <FF label="Email"><input type="email" className="input" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} placeholder="your@email.com" /></FF>
            <FF label="Nomor HP (aktif WhatsApp)"><input type="tel" className="input" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} placeholder="08xx xxxx xxxx" /></FF>
            <FF label="Buat kata sandi"><input type="password" className="input" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} placeholder="Minimal 6 karakter" /></FF>
            
            {/* Konfirmasi Password dengan indikator */}
            <div>
              <FF label="Ulangi kata sandi">
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className={`${`${inp} pr-12`} ${
                      confirmPassword === "" ? "border-slate-200" : 
                      passwordMatch ? "border-emerald-500 bg-emerald-50" : 
                      "border-rose-500 bg-rose-50"
                    }`}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Ulangi kata sandi" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)", background: "none", border: 0, cursor: "pointer", display: "flex", padding: 4 }}
                  >
                    {showConfirmPassword ? <Icon.eyeOff size={19} /> : <Icon.eye size={19} />}
                  </button>
                </div>
              </FF>
              {/* Indikator status */}
              {confirmPassword !== "" && (
                <p className="t-xs" style={{ marginTop: -10, marginBottom: 16, fontWeight: 600,
                     color: passwordMatch ? "var(--ok)" : "var(--crit)" }}>
                  {passwordMatch ? "Kata sandi cocok" : "Kata sandi belum cocok"}
                </p>
              )}
            </div>

            <hr className="divider" style={{ margin: "24px 0 18px" }} />
            <p className="t-over" style={{ marginBottom: 14 }}>Identitas peternak</p>
            <FF label="Nama lengkap"><input className="input" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} placeholder="Nama lengkap" /></FF>
            <FF label="Kecamatan"><select className="select" value={profileData.kecamatan} onChange={e => handleKecamatanChange(e.target.value)}>{Object.keys(TUBAN_DATA).map(k => <option key={k} value={k}>{k}</option>)}</select></FF>
            <FF label="Desa atau kelurahan"><select className="select" value={profileData.desa} onChange={e => setProfileData({...profileData, desa: e.target.value})}>{(TUBAN_DATA[profileData.kecamatan] || []).map(d => <option key={d} value={d}>{d}</option>)}</select></FF>
            <FF label="Dusun (boleh dikosongkan)"><input type="text" className="input" value={profileData.dusun} onChange={e => setProfileData({...profileData, dusun: e.target.value})} placeholder="Nama dusun (opsional)" /></FF>
            <div className="flex gap-4"><div className="flex-1"><FF label="RT"><input type="number" className="input" value={profileData.rt} onChange={e => setProfileData({...profileData, rt: e.target.value})} placeholder="RT" /></FF></div><div className="flex-1"><FF label="RW"><input type="number" className="input" value={profileData.rw} onChange={e => setProfileData({...profileData, rw: e.target.value})} placeholder="RW" /></FF></div></div>
            <button type="submit" disabled={isLoading || passwordMatch === false} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }}>{isLoading ? "Memproses..." : "Buat akun"}</button>
          </form>
        )}
      </div>
    </div>

    {forgotPasswordOpen && (
      <div className="sheet-overlay" style={{ alignItems: "center", padding: 16, zIndex: 110 }}>
        <form onSubmit={handleForgotPassword} className="card pop-in" style={{ width: "100%", maxWidth: 400, padding: 22, boxShadow: "var(--sh-xl)" }}>
          <h3 className="t-h2 c-1" style={{ margin: "0 0 6px" }}>Lupa kata sandi?</h3>
          <p className="t-sm c-2" style={{ margin: "0 0 18px" }}>Masukkan email yang terdaftar. Kami akan mengirimkan link untuk membuat password baru.</p>
          <FF label="Email terdaftar">
            <input type="email" className="input" placeholder="nama@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} disabled={isSendingReset} autoFocus />
          </FF>
          <p className="text-[12.5px] text-slate-500 font-medium mb-2 -mt-1 px-1 leading-relaxed">Jika akun Anda dibuat sebelum sistem ini diperbarui dan link reset tidak berhasil terkirim, silakan hubungi petugas/admin dinas secara langsung.</p>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setForgotPasswordOpen(false)} disabled={isSendingReset} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isSendingReset} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">{isSendingReset ? "Mengirim..." : "Kirim Link Reset"}</button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}