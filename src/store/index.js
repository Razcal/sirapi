import { configureStore } from '@reduxjs/toolkit';
import profileReducer from './slices/profileSlice';
import cattleReducer from './slices/cattleSlice';

export const store = configureStore({
  reducer: {
    profile: profileReducer,
    cattle: cattleReducer
  }
});
