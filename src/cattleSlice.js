import { createSlice } from '@reduxjs/toolkit';

const getInitialCattle = () => {
  try { 
    const data = JSON.parse(localStorage.getItem("srtt_db_cattle")); 
    return Array.isArray(data) ? data : []; 
  } catch (e) { return []; }
};

const cattleSlice = createSlice({
  name: 'cattle',
  initialState: { list: getInitialCattle() },
  reducers: {
    addOrUpdateCattle: (state, action) => {
      const { data, editId } = action.payload;
      const exists = state.list.some(c => c.id === data.id);
      if (editId || exists) {
        const index = state.list.findIndex(x => x.id === (editId || data.id));
        if (index !== -1) state.list[index] = { ...state.list[index], ...data };
      } else {
        state.list.push(data);
      }
      localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
    },
    deleteCattle: (state, action) => {
      state.list = state.list.filter(x => x.id !== action.payload);
      localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
    },
    deleteCattleLog: (state, action) => {
      const { itemId, logType, index } = action.payload;
      const item = state.list.find(x => x.id === itemId);
      if (item && item[logType] && item[logType].length > index) {
        item[logType].splice(index, 1);
        localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
      }
    },
    saveReproLog: (state, action) => {
      const { itemId, res, d, calculatedConception } = action.payload;
      const current = state.list.find(b => b.id === itemId);
      if (!current) return;

      if (res === "NEGATIVE") { current.phase = "OPEN"; current.pkbLog = current.pkbLog || []; current.pkbLog.push({ date: d, result: "NEGATIVE" }); }
      else if (res === "IB") { current.phase = "BRED"; current.ibLog = current.ibLog || []; current.ibLog.push(d); }
      else if (res === "POSITIVE") { current.phase = "PREGNANT"; current.conceptionDate = calculatedConception; current.pkbLog = current.pkbLog || []; current.pkbLog.push({ date: d, result: "POSITIVE" }); }
      else if (res === "CALVED") { current.phase = "POSTPARTUM"; current.calvingDate = d; current.calvingLog = current.calvingLog || []; current.calvingLog.push(d); }

      localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
    },
    saveHealthLog: (state, action) => {
      const { itemId, logEntry } = action.payload;
      const current = state.list.find(b => b.id === itemId);
      if (current) {
        current.healthLog = current.healthLog || [];
        current.healthLog.push(logEntry);
        localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
      }
    },
    saveHealthReport: (state, action) => {
      const { itemId, tanggalLaporan, gejalaKeluhan } = action.payload;
      const current = state.list.find(b => b.id === itemId);
      if (current) {
        current.healthReports = current.healthReports || [];
        current.healthReports.push({
          tanggalLaporan,
          gejalaKeluhan,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem("srtt_db_cattle", JSON.stringify(state.list));
      }
    }
  }
});

export const { addOrUpdateCattle, deleteCattle, deleteCattleLog, saveReproLog, saveHealthLog, saveHealthReport } = cattleSlice.actions;
export default cattleSlice.reducer;