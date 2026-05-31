import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setProfile, clearProfile } from "./app/store/profileSlice";
import { dialog, handleExportCSV } from "./core/helpers";
import { TUBAN_DATA } from "./core/constants";
import { FF } from "./core/components/SharedUI";

function EditProfileModal({ open, onClose, onSave, currentProfile }) {
  const [profileData, setProfileData] = useState(currentProfile);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white w-full max-w-sm rounded-[24px] p-6"><h3 className="font-black text-xl mb-5">Edit Profil</h3>
        <div className="space-y-4"><FF label="Nama Pemilik"><input className="w-full border p-3 rounded-xl" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} /></FF></div>
        <div className="flex gap-3 mt-8"><button onClick={onClose} className="flex-1 py-3.5 border rounded-xl font-bold">Batal</button><button onClick={() => { onSave(profileData); onClose(); }} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold">Simpan</button></div>
      </div>
    </div>
  );
}

export function ProfileView({ setNav }) {
  const profile = useSelector(state => state.profile.data);
  const dbCattle = useSelector(state => state.cattle.list);
  const dispatch = useDispatch();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  return (
    <div className="pb-32 fade-in bg-slate-50 min-h-screen">
      <div className="bg-white px-5 pt-8 pb-8 border-b border-slate-200 shadow-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-black mb-3">{profile.name.charAt(0)}</div>
        <h2 className="text-2xl font-black">{profile.name}</h2>
        <p className="text-[10px] font-bold text-slate-500 mt-1 text-center">{profile.desa}, {profile.kecamatan}</p>
        <button onClick={() => setEditProfileOpen(true)} className="mt-4 px-6 py-2 bg-slate-100 font-bold text-xs rounded-full">Edit Profil</button>
      </div>
      <div className="px-5 mt-6 space-y-6">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Data & Laporan</h3>
          <div className="bg-white rounded-[20px] border shadow-sm">
            <button onClick={() => handleExportCSV(dbCattle)} className="w-full p-4 font-bold text-sm text-left">Export Laporan Excel (.csv)</button>
          </div>
        </div>
        <button onClick={() => { dialog.confirm("Yakin ingin keluar aplikasi?", () => { dispatch(clearProfile()); setNav("dashboard"); }, "Logout") }} className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-[20px] text-sm">
          Keluar Akun (Logout)
        </button>
      </div>
      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSave={(p) => dispatch(setProfile(p))} currentProfile={profile} />
    </div>
  );
}