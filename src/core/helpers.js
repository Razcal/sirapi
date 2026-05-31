export const todayStr = () => new Date().toISOString().split("T")[0];

export const daysDiff = (a, b = new Date()) => Math.floor((new Date(b) - new Date(a)) / 86400000);

export const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }); } 
  catch(e) { return "-"; }
};

export const getAge = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const m = Math.floor(daysDiff(dateStr) / 30);
    if (isNaN(m)) return "-";
    const y = Math.floor(m / 12);
    const remM = m % 12;
    if (y > 0) return `${y} Thn ${remM} Bln`;
    return `${m} Bln`;
  } catch(e) { return "-"; }
};

export const dialog = {
  alert: (message, title = "Informasi") => { if (window.__showAlertDialog) window.__showAlertDialog(message, title); else alert(message); },
  confirm: (message, onConfirm, title = "Konfirmasi") => { if (window.__showConfirmDialog) window.__showConfirmDialog(message, onConfirm, title); else if (window.confirm(message)) onConfirm(); }
};
