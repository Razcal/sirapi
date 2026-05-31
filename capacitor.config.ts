import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.proverti.tuban',
  appName: 'PROVERTI',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '640859770536-uc58dsoiaka67huadtkmhj0qdoufjmqp.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
