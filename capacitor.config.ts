import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sirapi.tuban',
  appName: 'SIRAPI',
  webDir: 'dist',
  plugins: {
    // Sign-in Google native (@capgo/capacitor-social-login). webClientId
    // sesungguhnya diisi lewat SocialLogin.initialize() di src/App.jsx —
    // lihat GOOGLE_WEB_CLIENT_ID di src/core/constants.js.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
