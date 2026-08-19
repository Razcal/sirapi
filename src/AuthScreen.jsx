import React, { useState } from "react";
import { dialog } from "./core/helpers";
import { TUBAN_DATA } from "./core/constants";
import { FF } from "./core/components/SharedUI";
import { authService } from "./core/authService";
import { Icon } from "./core/components/Icons";
import { HeroScene } from "./core/components/Hero";
import logoTuban from "./Tubankab.png";

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