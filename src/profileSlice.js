import { createSlice } from '@reduxjs/toolkit';

const getInitialProfile = () => {
  try { 
    return JSON.parse(localStorage.getItem("srtt_user_profile")) || null; 
  } catch (e) { return null; }
};

const profileSlice = createSlice({
  name: 'profile',
  initialState: { data: getInitialProfile() },
  reducers: {
    setProfile: (state, action) => {
      state.data = action.payload;
      localStorage.setItem("srtt_user_profile", JSON.stringify(action.payload));
    },
    clearProfile: (state) => {
      state.data = null;
      localStorage.removeItem("srtt_user_profile");
    }
  }
});
export const { setProfile, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;