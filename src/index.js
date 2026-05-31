import { configureStore } from '@reduxjs/toolkit';
import profileReducer from './profileSlice';
import cattleReducer from './cattleSlice';

export const store = configureStore({
  reducer: {
    profile: profileReducer,
    cattle: cattleReducer
  }
});