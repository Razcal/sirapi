import { useState, useEffect, useCallback } from "react";

// Panel super-admin tersembunyi - tidak ditautkan dari menu manapun di
// aplikasi, cuma bisa diakses langsung lewat URL-nya (lihat main.jsx).
// Password diperiksa SERVER-SIDE di /api/godmode.js setiap kali panggilan -
// sessionStorage di sini cuma kenyamanan (supaya tidak ketik ulang tiap
// aksi), bukan satu-satunya penjaga keamanan.
const STORAGE_KEY = "sirapi_godmode_pw";

async function callApi(password, action, payload) {
  const res = await fetch("/api/godmode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

// field.type: "text" (default) | "date" | "number" | "select" | "json"
// "json" dipakai untuk kolom riwayat (ibLog, pkbLog, dst) yang bentuknya
// array/objek - diedit sebagai teks JSON mentah, baru di-parse saat Simpan
// (bukan tiap ketikan, supaya JSON belum lengkap tidak langsung error).
function EditModal({ title, fields, initial, onCancel, onSave, saving }) {
  const [values, setValues] = useState({});
  const [rawJson, setRawJson] = useState({});
  const [jsonErr, setJsonErr] = useState("");

  useEffect(() => {
    if (!initial) return;
    setValues(initial);
    setJsonErr("");
    const rj = {};
    fields.forEach((f) => {
      if (f.type === "json") rj[f.key] = JSON.stringify(initial[f.key] ?? (f.default ?? []), null, 2);
    });
    setRawJson(rj);
  }, [initial]); // eslint-disable-line

  if (!initial) return null;

  const handleSave = () => {
    // Bangun `final` cuma dari field yang benar-benar didaftarkan di
    // `fields` (bukan sekadar spread `values`/`initial` apa adanya) -
    // supaya kalau `initial` kebetulan membawa properti tambahan (mis.
    // dari tab "Perlu Perhatian" yang menyisipkan ownerName/isUrgent/dst
    // ke objek sapi untuk keperluan tampilan), properti asing itu TIDAK
    // ikut terkirim ke updateCattle/updateUser dan bikin server menolak
    // kolom yang tidak dikenal.
    const final = {};
    for (const f of fields) {
      if (f.type === "json") {
        const raw = (rawJson[f.key] ?? "").trim();
        try {
          final[f.key] = raw === "" ? (f.default ?? []) : JSON.parse(raw);
        } catch (e) {
          setJsonErr(`Format JSON tidak valid di "${f.label}": ${e.message}`);
          return;
        }
      } else {
        final[f.key] = values[f.key];
      }
    }
    setJsonErr("");
    onSave(final);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
        <h3 style={{ color: "#e6edf3", margin: "0 0 14px", fontSize: 16 }}>{title}</h3>
        {fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8b949e", marginBottom: 4, textTransform: "uppercase", letterSpacing: .4 }}>{f.label}</label>
            {f.type === "select" ? (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "7px 9px", color: "#e6edf3", fontSize: 13 }}
              >
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "json" ? (
              <textarea
                value={rawJson[f.key] ?? ""}
                onChange={(e) => setRawJson((r) => ({ ...r, [f.key]: e.target.value }))}
                rows={4}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "7px 9px", color: "#7ee787", fontSize: 11.5, fontFamily: "ui-monospace, monospace", boxSizing: "border-box", resize: "vertical" }}
              />
            ) : (
              <input
                type={f.type || "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "7px 9px", color: "#e6edf3", fontSize: 13, boxSizing: "border-box" }}
              />
            )}
          </div>
        ))}
        {jsonErr && <p style={{ color: "#f85149", fontSize: 12, margin: "4px 0 10px" }}>{jsonErr}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={btnStyle("#30363d")}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={btnStyle("#238636", 1)}>{saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </div>
    </div>
  );
}

// Field lengkap sapi - dipakai untuk Edit maupun Tambah baru. Kolom riwayat
// (ibLog dst) diedit sebagai JSON mentah - "selengkap mungkin" termasuk
// akses langsung ke riwayat, bukan cuma field ringkasan seperti di
// aplikasi peternak biasa.
const CATTLE_FIELDS = [
  { key: "code", label: "Kode" },
  { key: "jenis_kelamin", label: "Jenis kelamin", type: "select", options: ["BETINA", "JANTAN"] },
  { key: "jenis_ras", label: "Ras" },
  { key: "asal_usul_sapi", label: "Asal usul", type: "select", options: ["KANDANG", "PASAR"] },
  { key: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
  { key: "status_reproduksi", label: "Status reproduksi", type: "select", options: ["CALF", "OPEN", "BRED", "PREGNANT", "POSTPARTUM", "ABORTUS_PENDING", "N/A"] },
  { key: "jumlah_beranak", label: "Jumlah beranak" },
  { key: "conceptionDate", label: "Tanggal kawin (untuk fase Bunting)", type: "date" },
  { key: "ibLog", label: "Riwayat IB (JSON)", type: "json", default: [] },
  { key: "pkbLog", label: "Riwayat PKB (JSON)", type: "json", default: [] },
  { key: "calvingLog", label: "Riwayat Melahirkan (JSON)", type: "json", default: [] },
  { key: "abortusLog", label: "Riwayat Keguguran (JSON)", type: "json", default: [] },
  { key: "therapyLog", label: "Riwayat Terapi (JSON)", type: "json", default: [] },
  { key: "healthLog", label: "Riwayat Kesehatan (JSON)", type: "json", default: [] },
  { key: "laporanPetugasLog", label: "Riwayat Lapor Petugas (JSON)", type: "json", default: [] },
];

const btnStyle = (bg, flex) => ({
  flex: flex || "none", background: bg, color: "#fff", border: "none", borderRadius: 6,
  padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});

export default function GodModeApp() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [pwInput, setPwInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockErr, setUnlockErr] = useState("");
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [cattle, setCattle] = useState([]);
  const [cattleSearch, setCattleSearch] = useState("");
  const [filterUserId, setFilterUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingCattle, setEditingCattle] = useState(null);
  const [creatingUser, setCreatingUser] = useState(null);
  const [creatingCattle, setCreatingCattle] = useState(null);
  const [problems, setProblems] = useState([]);
  const [staleDays, setStaleDays] = useState(30);
  const [problemFilter, setProblemFilter] = useState("all"); // all | urgent | stale
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const tryUnlock = async (pw) => {
    setUnlockErr("");
    setBusy(true);
    try {
      const data = await callApi(pw, "stats");
      setStats(data);
      setPassword(pw);
      sessionStorage.setItem(STORAGE_KEY, pw);
      setUnlocked(true);
    } catch (e) {
      setUnlockErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (password) tryUnlock(password); }, []); // eslint-disable-line

  const loadUsers = useCallback(async () => {
    setBusy(true);
    try {
      const data = await callApi(password, "listUsers", { search: userSearch });
      setUsers(data.users || []);
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  }, [password, userSearch]);

  const loadCattle = useCallback(async () => {
    setBusy(true);
    try {
      const data = await callApi(password, "listCattle", { search: cattleSearch, userId: filterUserId });
      setCattle(data.cattle || []);
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  }, [password, cattleSearch, filterUserId]);

  const loadProblems = useCallback(async () => {
    setBusy(true);
    try {
      const data = await callApi(password, "listProblems", { staleDays });
      setProblems(data.problems || []);
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  }, [password, staleDays]);

  useEffect(() => { if (unlocked && tab === "problems") loadProblems(); }, [unlocked, tab, loadProblems]);
  useEffect(() => { if (unlocked && tab === "users") loadUsers(); }, [unlocked, tab, loadUsers]);
  useEffect(() => { if (unlocked && tab === "cattle") loadCattle(); }, [unlocked, tab, loadCattle]);

  const saveUser = async (fields) => {
    setSaving(true);
    try {
      await callApi(password, "updateUser", { id: editingUser.id, fields });
      showToast("Peternak diperbarui.");
      setEditingUser(null);
      loadUsers();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const createUser = async (fields) => {
    setSaving(true);
    try {
      const { newPassword, ...rest } = fields;
      await callApi(password, "createUser", { fields: rest, password: newPassword });
      showToast("Peternak baru ditambahkan.");
      setCreatingUser(null);
      loadUsers();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const resetPassword = async (u) => {
    const newPw = prompt(`Password baru untuk "${u.name}" (kosongkan untuk batal):`);
    if (!newPw) return;
    setBusy(true);
    try {
      await callApi(password, "resetPassword", { id: u.id, newPassword: newPw });
      showToast(`Password "${u.name}" berhasil direset.`);
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  };

  const deleteUser = async (u) => {
    if (!confirm(`Hapus peternak "${u.name}" beserta SEMUA sapinya? Tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      await callApi(password, "deleteUser", { id: u.id });
      showToast("Peternak dihapus.");
      loadUsers();
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  };

  // Refresh daftar yang sedang aktif dilihat - bisa dipanggil dari tab Sapi
  // biasa ATAUPUN dari tab Perlu Perhatian (keduanya bisa buka modal edit
  // sapi yang sama).
  const refreshCattleView = () => { if (tab === "problems") loadProblems(); else loadCattle(); };

  const saveCattle = async (fields) => {
    setSaving(true);
    try {
      await callApi(password, "updateCattle", { id: editingCattle.id, fields });
      showToast("Sapi diperbarui.");
      setEditingCattle(null);
      refreshCattleView();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const deleteCattle = async (c) => {
    if (!confirm(`Hapus sapi "${c.code}"? Tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      await callApi(password, "deleteCattle", { id: c.id });
      showToast("Sapi dihapus.");
      refreshCattleView();
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  };

  // Daftar Perlu Perhatian cuma bawa field ringkas (lihat listProblems di
  // godmode.js) - ambil dulu record lengkapnya sebelum buka modal edit.
  const openCattleFromProblem = async (p) => {
    setBusy(true);
    try {
      const data = await callApi(password, "listCattle", { id: p.id });
      const full = (data.cattle || [])[0];
      if (!full) return showToast("Sapi tidak ditemukan (mungkin baru saja dihapus).", "error");
      setEditingCattle(full);
    } catch (e) { showToast(e.message, "error"); }
    setBusy(false);
  };

  const createCattle = async (fields) => {
    if (!filterUserId) return showToast("Pilih peternak dulu (tombol \"Sapi\" di tab Peternak).", "error");
    setSaving(true);
    try {
      await callApi(password, "createCattle", { userId: filterUserId, fields });
      showToast("Sapi baru ditambahkan.");
      setCreatingCattle(null);
      loadCattle();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const page = { minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" };

  if (!unlocked) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>⚡</div>
          <p style={{ fontSize: 13, color: "#8b949e", marginBottom: 20, letterSpacing: 1 }}>SIRAPI // GODMODE</p>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock(pwInput)}
            placeholder="Password"
            style={{ width: "100%", background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "12px 14px", color: "#e6edf3", fontSize: 14, boxSizing: "border-box", textAlign: "center" }}
          />
          {unlockErr && <p style={{ color: "#f85149", fontSize: 12, marginTop: 10 }}>{unlockErr}</p>}
          <button onClick={() => tryUnlock(pwInput)} disabled={busy} style={{ ...btnStyle("#238636"), width: "100%", marginTop: 12, padding: "11px 0" }}>
            {busy ? "..." : "Masuk"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...page, display: "flex", flexWrap: "wrap", minHeight: "100vh" }}>
      {/* Panel kontrol godmode - sisi kiri */}
      <div style={{ flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #30363d" }}>
        <div style={{ borderBottom: "1px solid #30363d", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <strong style={{ letterSpacing: 1 }}>⚡ SIRAPI GODMODE</strong>
          {["stats", "users", "cattle", "problems"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ background: tab === t ? "#238636" : "transparent", color: tab === t ? "#fff" : "#8b949e", border: "1px solid " + (tab === t ? "#238636" : "#30363d"), borderRadius: 6, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}
            >
              {t === "stats" ? "Statistik" : t === "users" ? "Peternak" : t === "cattle" ? "Sapi" : "⚠ Perlu Perhatian"}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#484f58" }}>{busy ? "memuat..." : ""}</span>
        </div>

        <div style={{ padding: 20, flex: 1 }}>
        {tab === "stats" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                ["Total peternak", stats.totalUsers],
                ["Total sapi", stats.totalCattle],
                ["Peternak asli", stats.realUsers],
                ["Peternak dummy", stats.dummyUsers],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
                  <p style={{ fontSize: 11, color: "#8b949e", margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
                  <p style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: "#8b949e", marginBottom: 8, textTransform: "uppercase" }}>Sapi per fase</p>
                {Object.entries(stats.phaseCounts || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: 13 }}>
                    <span>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#8b949e", marginBottom: 8, textTransform: "uppercase" }}>Peternak per kecamatan</p>
                {Object.entries(stats.kecCounts || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: 13 }}>
                    <span>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                placeholder="Cari nama / email / HP..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                style={{ flex: 1, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "9px 12px", color: "#e6edf3", fontSize: 13, boxSizing: "border-box" }}
              />
              <button onClick={() => setCreatingUser({ kecamatan: "", desa: "", dusun: "", rt: "", rw: "", newPassword: "" })} style={btnStyle("#238636")}>+ Peternak baru</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8b949e", borderBottom: "1px solid #30363d" }}>
                    <th style={{ padding: 8 }}>Nama</th><th style={{ padding: 8 }}>Email</th><th style={{ padding: 8 }}>HP</th>
                    <th style={{ padding: 8 }}>Kecamatan</th><th style={{ padding: 8 }}>Desa</th><th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #21262d" }}>
                      <td style={{ padding: 8 }}>{u.name}</td>
                      <td style={{ padding: 8, color: "#8b949e" }}>{u.email}</td>
                      <td style={{ padding: 8 }}>{u.phone}</td>
                      <td style={{ padding: 8 }}>{u.kecamatan}</td>
                      <td style={{ padding: 8 }}>{u.desa}</td>
                      <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                        <button onClick={() => { setFilterUserId(u.id); setTab("cattle"); }} style={{ ...btnStyle("#1f6feb"), padding: "4px 8px", fontSize: 11, marginRight: 6 }}>Sapi</button>
                        <button onClick={() => setEditingUser(u)} style={{ ...btnStyle("#30363d"), padding: "4px 8px", fontSize: 11, marginRight: 6 }}>Edit</button>
                        <button onClick={() => resetPassword(u)} style={{ ...btnStyle("#9e6a03"), padding: "4px 8px", fontSize: 11, marginRight: 6 }}>Reset Sandi</button>
                        <button onClick={() => deleteUser(u)} style={{ ...btnStyle("#da3633"), padding: "4px 8px", fontSize: 11 }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "cattle" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                placeholder="Cari kode sapi..."
                value={cattleSearch}
                onChange={(e) => setCattleSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadCattle()}
                style={{ flex: 1, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "9px 12px", color: "#e6edf3", fontSize: 13, boxSizing: "border-box" }}
              />
              {filterUserId && <button onClick={() => setFilterUserId(null)} style={btnStyle("#30363d")}>Lihat semua peternak</button>}
              {filterUserId && (
                <button
                  onClick={() => setCreatingCattle({ jenis_kelamin: "BETINA", asal_usul_sapi: "KANDANG", status_reproduksi: "CALF", jumlah_beranak: 0, code: "", jenis_ras: "SIMENTAL SPSI", tanggal_lahir: "" })}
                  style={btnStyle("#238636")}
                >+ Sapi baru</button>
              )}
            </div>
            {!filterUserId && (
              <p style={{ fontSize: 12, color: "#8b949e", marginBottom: 10 }}>Pilih peternak dulu (tombol "Sapi" di tab Peternak) untuk bisa menambah sapi baru.</p>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8b949e", borderBottom: "1px solid #30363d" }}>
                    <th style={{ padding: 8 }}>Kode</th><th style={{ padding: 8 }}>Jenis kelamin</th><th style={{ padding: 8 }}>Ras</th>
                    <th style={{ padding: 8 }}>Status repro</th><th style={{ padding: 8 }}>Lahir</th><th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cattle.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #21262d" }}>
                      <td style={{ padding: 8, fontWeight: 700 }}>{c.code}</td>
                      <td style={{ padding: 8 }}>{c.jenis_kelamin}</td>
                      <td style={{ padding: 8 }}>{c.jenis_ras}</td>
                      <td style={{ padding: 8 }}>{c.status_reproduksi}</td>
                      <td style={{ padding: 8, color: "#8b949e" }}>{c.tanggal_lahir}</td>
                      <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                        <button onClick={() => setEditingCattle(c)} style={{ ...btnStyle("#30363d"), padding: "4px 8px", fontSize: 11, marginRight: 6 }}>Edit</button>
                        <button onClick={() => deleteCattle(c)} style={{ ...btnStyle("#da3633"), padding: "4px 8px", fontSize: 11 }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "problems" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
              {[["all", "Semua"], ["urgent", "Bermasalah saja"], ["stale", "Tidak diupdate saja"]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setProblemFilter(v)}
                  style={{ background: problemFilter === v ? "#1f6feb" : "transparent", color: problemFilter === v ? "#fff" : "#8b949e", border: "1px solid " + (problemFilter === v ? "#1f6feb" : "#30363d"), borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
                >{label}</button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#8b949e" }}>Batas "tidak diupdate":</span>
              <select
                value={staleDays}
                onChange={(e) => setStaleDays(Number(e.target.value))}
                style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "5px 9px", color: "#e6edf3", fontSize: 12 }}
              >
                {[14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} hari</option>)}
              </select>
            </div>
            <p style={{ fontSize: 12, color: "#8b949e", margin: "0 0 14px" }}>
              "Bermasalah" = status darurat menurut sistem (sama seperti yang muncul di Dashboard peternak). "Tidak diupdate" = tidak ada catatan apa pun tercatat lebih dari {staleDays} hari - indikasi peternaknya tidak rajin memperbarui aplikasi.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8b949e", borderBottom: "1px solid #30363d" }}>
                    <th style={{ padding: 8 }}>Kode</th><th style={{ padding: 8 }}>Peternak</th><th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Terakhir update</th><th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {problems
                    .filter((p) => problemFilter === "all" || (problemFilter === "urgent" ? p.isUrgent : p.isStale))
                    .map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: 8, fontWeight: 700 }}>{p.code}</td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => { setFilterUserId(p.user_id); setTab("cattle"); }} style={{ background: "none", border: "none", color: "#58a6ff", cursor: "pointer", padding: 0, fontSize: 12.5, textDecoration: "underline" }}>
                            {p.ownerName}
                          </button>
                        </td>
                        <td style={{ padding: 8 }}>
                          {p.isUrgent && <span style={{ background: "#da3633", color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 10.5, fontWeight: 700, marginRight: 6 }}>DARURAT</span>}
                          {p.statusLabel}
                        </td>
                        <td style={{ padding: 8, color: p.isStale ? "#d29922" : "#8b949e" }}>
                          {p.daysSinceUpdate === null ? "tidak diketahui" : `${p.daysSinceUpdate} hari lalu`}
                        </td>
                        <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                          <button onClick={() => openCattleFromProblem(p)} style={{ ...btnStyle("#30363d"), padding: "4px 8px", fontSize: 11, marginRight: 6 }}>Edit</button>
                          <button onClick={() => deleteCattle(p)} style={{ ...btnStyle("#da3633"), padding: "4px 8px", fontSize: 11 }}>Hapus</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {problems.length === 0 && !busy && (
                <p style={{ fontSize: 13, color: "#8b949e", padding: "20px 0", textAlign: "center" }}>Tidak ada sapi bermasalah maupun yang tidak diupdate. Semua aman.</p>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Halaman Admin biasa - disematkan permanen di sebelah kanan, otomatis
          terbuka begitu panel godmode dibuka (bukan tab yang perlu diklik).
          Login-nya tetap terpisah dari password godmode - pakai akun admin
          dinas seperti biasa. */}
      <div style={{ flex: "1 1 460px", minWidth: 320, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 12, color: "#8b949e", padding: "10px 20px", margin: 0, borderBottom: "1px solid #30363d" }}>
          🖥 Halaman Admin (/admin) — login terpisah, pakai akun admin dinas seperti biasa
        </p>
        <iframe
          title="Admin"
          src="/admin"
          style={{ width: "100%", flex: 1, border: "none", display: "block", minHeight: "70vh" }}
        />
      </div>

      <EditModal
        title={`Edit: ${editingUser?.name || ""}`}
        initial={editingUser}
        saving={saving}
        onCancel={() => setEditingUser(null)}
        onSave={saveUser}
        fields={[
          { key: "name", label: "Nama" },
          { key: "email", label: "Email" },
          { key: "phone", label: "No. HP" },
          { key: "kecamatan", label: "Kecamatan" },
          { key: "desa", label: "Desa" },
          { key: "dusun", label: "Dusun" },
          { key: "status", label: "Status", type: "select", options: ["approved", "pending", "suspended"] },
        ]}
      />
      <EditModal
        title="Tambah peternak baru"
        initial={creatingUser}
        saving={saving}
        onCancel={() => setCreatingUser(null)}
        onSave={createUser}
        fields={[
          { key: "name", label: "Nama" },
          { key: "email", label: "Email" },
          { key: "phone", label: "No. HP" },
          { key: "kecamatan", label: "Kecamatan" },
          { key: "desa", label: "Desa" },
          { key: "dusun", label: "Dusun" },
          { key: "newPassword", label: "Password (kosongkan = sirapi123)" },
        ]}
      />
      <EditModal
        title={`Edit sapi: ${editingCattle?.code || ""}`}
        initial={editingCattle}
        saving={saving}
        onCancel={() => setEditingCattle(null)}
        onSave={saveCattle}
        fields={CATTLE_FIELDS}
      />
      <EditModal
        title="Tambah sapi baru"
        initial={creatingCattle}
        saving={saving}
        onCancel={() => setCreatingCattle(null)}
        onSave={createCattle}
        fields={CATTLE_FIELDS}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#da3633" : "#238636", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 300 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
