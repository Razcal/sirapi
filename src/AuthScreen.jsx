import React, { useState, useEffect } from "react";
import { dialog } from "./core/helpers";
import { TUBAN_DATA } from "./core/constants";
import { FF } from "./core/components/SharedUI";
import { authService } from "./core/authService";
import { saveUserToStorage } from "./core/supabaseClient";
import logoTuban from "./Tubankab.png";

export function AuthScreen({ setProfile }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Login state
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "",
    kecamatan: "Tuban",
    desa: "Baturetno",
    rt: "",
    rw: "",
    dusun: "",
    photo: null
  });

  // Monitor password confirmation
  useEffect(() => {
    if (confirmPassword === "") {
      setPasswordMatch(null);
    } else if (registerPassword === confirmPassword) {
      setPasswordMatch(true);
    } else {
      setPasswordMatch(false);
    }
  }, [registerPassword, confirmPassword]);

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
      saveUserToStorage(result.user);
      setProfile(result.user);
    } else {
      dialog.alert(result.error || "Login gagal!", "Login Gagal");
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
      setPasswordMatch(null);
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

  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden slide-up">
      <div className="pb-6 px-6 bg-white rounded-b-[32px] shadow-sm z-10 relative" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3rem)' }}>
        <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center p-3"><img src={logoTuban} alt="Logo Tuban" className="w-full h-full object-contain" /></div></div>
        <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight">PROVERTI</h1>
        <p className="text-[10px] font-bold text-center text-slate-500 uppercase tracking-widest mt-1">Kabupaten Tuban</p>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mt-6">
          <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${isLogin ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Masuk</button>
          <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${!isLogin ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Daftar Baru</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-12">
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4 fade-in">
            <FF label="Email atau No. Handphone"><input type="text" className={inp} placeholder="Email atau 0812xxxx" value={loginEmailOrPhone} onChange={e => setLoginEmailOrPhone(e.target.value)} /></FF>
            <div>
              <FF label="Kata Sandi (Password)">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} className={inp.replace("px-4", "pl-4 pr-12")} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </FF>
              <div className="flex justify-between items-center -mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 accent-emerald-600 rounded border-slate-300" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span className="text-[11px] font-bold text-slate-500">Ingat Saya</span></label>
                <button type="button" onClick={() => dialog.alert("Silakan hubungi petugas/admin dinas.", "Bantuan")} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Lupa Password?</button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-xl mt-4 text-sm shadow-lg shadow-emerald-500/30 transition-all">{isLoading ? "Memproses..." : "Masuk ke Aplikasi"}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 fade-in pb-10">
            <FF label="Email Address"><input type="email" className={inp} value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} placeholder="your@email.com" /></FF>
            <FF label="No. Handphone (Aktif WA)"><input type="tel" className={inp} value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} placeholder="Cth: 0812xxxx" /></FF>
            <FF label="Buat Kata Sandi"><input type="password" className={inp} value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} placeholder="Minimal 6 karakter" /></FF>
            
            {/* Konfirmasi Password dengan indikator */}
            <div>
              <FF label="Konfirmasi Kata Sandi">
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className={`${inp.replace("px-4", "pl-4 pr-12")} ${
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </FF>
              {/* Indikator status */}
              {confirmPassword !== "" && (
                <p className={`text-[11px] font-bold mt-1 ml-1 ${
                  passwordMatch ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {passwordMatch ? "✅ Kata sandi cocok" : "❌ Kata sandi tidak cocok"}
                </p>
              )}
            </div>

            <div className="h-px bg-slate-200 my-6"></div>
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Profil Identitas Peternak</p>
            <FF label="Nama Lengkap Pemilik"><input className={inp} value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} placeholder="Nama lengkap" /></FF>
            <FF label="Kecamatan"><select className={inp} value={profileData.kecamatan} onChange={e => handleKecamatanChange(e.target.value)}>{Object.keys(TUBAN_DATA).map(k => <option key={k} value={k}>{k}</option>)}</select></FF>
            <FF label="Desa / Kelurahan"><select className={inp} value={profileData.desa} onChange={e => setProfileData({...profileData, desa: e.target.value})}>{(TUBAN_DATA[profileData.kecamatan] || []).map(d => <option key={d} value={d}>{d}</option>)}</select></FF>
            <FF label="Dusun (Opsional)"><input type="text" className={inp} value={profileData.dusun} onChange={e => setProfileData({...profileData, dusun: e.target.value})} placeholder="Nama dusun (opsional)" /></FF>
            <div className="flex gap-4"><div className="flex-1"><FF label="RT"><input type="number" className={inp} value={profileData.rt} onChange={e => setProfileData({...profileData, rt: e.target.value})} placeholder="RT" /></FF></div><div className="flex-1"><FF label="RW"><input type="number" className={inp} value={profileData.rw} onChange={e => setProfileData({...profileData, rw: e.target.value})} placeholder="RW" /></FF></div></div>
            <button type="submit" disabled={isLoading || passwordMatch === false} className={`w-full text-white font-bold py-4 rounded-xl mt-6 text-sm transition-all ${isLoading || passwordMatch === false ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30"}`}>{isLoading ? "Memproses..." : "Daftar Akun Baru"}</button>
          </form>
        )}
      </div>
    </div>
  );
}