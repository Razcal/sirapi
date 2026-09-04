import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

// PENTING: di dalam WebView Capacitor (APK), `PushManager` dan `Notification`
// TIDAK tersedia sama sekali — sudah dites langsung: 'serviceWorker' in
// navigator = true, tapi 'PushManager' in window = false. Web Push API
// (dipakai di jalur `*Web` di bawah) cuma berfungsi di browser/PWA
// sungguhan. Di APK, notifikasi harus lewat FCM native (@capacitor/
// push-notifications) — jalur `*Native` di bawah. Semua method publik
// (isSupported/subscribe/dst) otomatis pilih jalur yang benar lewat
// Capacitor.isNativePlatform().

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- Jalur native (APK, lewat FCM) --------------------------------------

const isSubscribedNative = async () => {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const status = await PushNotifications.checkPermissions();
  return status.receive === 'granted';
};

const subscribeNative = async (userId) => {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let status = await PushNotifications.checkPermissions();
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== 'granted') {
    return { success: false, error: 'Izin notifikasi ditolak. Aktifkan lewat Pengaturan HP > Aplikasi > SIRAPI > Notifikasi.' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      PushNotifications.removeAllListeners();
      resolve(result);
    };

    PushNotifications.addListener('registration', async (token) => {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            endpoint: `fcm:${token.value}`,
            fcm_token: token.value,
            platform: 'android',
          }, { onConflict: 'endpoint' });
        if (error) throw error;
        finish({ success: true });
      } catch (error) {
        finish({ success: false, error: error.message });
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      finish({ success: false, error: 'Gagal mendaftar ke layanan notifikasi Google (FCM): ' + (err?.error || 'tidak diketahui') + '. Kemungkinan aplikasi belum dikonfigurasi admin untuk fitur ini.' });
    });

    // Jaga-jaga kalau plugin tidak pernah memanggil listener sama sekali
    // (misal google-services.json belum ada) — jangan biarkan menggantung selamanya.
    setTimeout(() => finish({ success: false, error: 'Waktu tunggu habis. Fitur notifikasi mungkin belum dikonfigurasi admin.' }), 15000);

    PushNotifications.register();
  });
};

const unsubscribeNative = async (userId) => {
  if (userId) {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('platform', 'android');
  }
  // Android tidak punya "unregister" resmi dari FCM lewat plugin ini — token
  // tetap hidup di sisi Google, tapi begitu barisnya dihapus dari database,
  // server kita berhenti mengirim ke token itu. Cukup untuk kebutuhan kita.
  return { success: true };
};

// --- Tampilkan notifikasi saat aplikasi sedang dibuka (foreground) --------
// PENTING: Android TIDAK otomatis menampilkan notifikasi FCM ke system tray
// kalau aplikasi SIRAPI sedang aktif terbuka di layar (auto-tampil cuma
// terjadi kalau aplikasi di background/tertutup) — jadi tanpa listener ini,
// notifikasi datang tapi "hilang" begitu saja kalau peternak sedang membuka
// aplikasinya persis saat notifikasi masuk. Dipanggil sekali saat aplikasi
// pertama kali dibuka (lihat App.jsx), bukan cuma saat proses mengaktifkan.
let foregroundListenerReady = false;
const initForegroundListener = async () => {
  if (!Capacitor.isNativePlatform() || foregroundListenerReady) return;
  foregroundListenerReady = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions().catch(() => {});
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 2147483647),
            title: notification?.title || 'SIRAPI',
            body: notification?.body || '',
          }],
        });
      } catch { /* gagal tampilkan lokal - tidak fatal, sudah dicatat FCM */ }
    });
  } catch { /* plugin belum siap / bukan APK - lewati diam-diam */ }
};

// --- Jalur web/PWA (browser biasa) ---------------------------------------

const isSubscribedWeb = async () => {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};

const subscribeWeb = async (userId) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Browser ini tidak mendukung notifikasi push. Di iPhone, tambahkan dulu aplikasi ini ke Homescreen.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Izin notifikasi ditolak. Aktifkan lewat pengaturan browser jika ingin mencoba lagi.' };
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subJson = subscription.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      platform: 'web',
    }, { onConflict: 'endpoint' });

  if (error) throw error;
  return { success: true };
};

const unsubscribeWeb = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { success: true };
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  }
  return { success: true };
};

// --- API publik: pilih jalur otomatis -------------------------------------

export const pushService = {
  isSupported: () => Capacitor.isNativePlatform() || ('serviceWorker' in navigator && 'PushManager' in window),

  // Dipanggil sekali di App.jsx saat aplikasi dibuka (APK) - lihat catatan
  // di initForegroundListener di atas. Aman dipanggil berkali-kali.
  initForegroundListener,

  getPermissionStatus: () => {
    if (Capacitor.isNativePlatform()) return 'native'; // dicek async lewat isSubscribed()
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  isSubscribed: async () => {
    try {
      return Capacitor.isNativePlatform() ? await isSubscribedNative() : await isSubscribedWeb();
    } catch {
      return false;
    }
  },

  subscribe: async (userId) => {
    try {
      return Capacitor.isNativePlatform() ? await subscribeNative(userId) : await subscribeWeb(userId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  unsubscribe: async (userId) => {
    try {
      return Capacitor.isNativePlatform() ? await unsubscribeNative(userId) : await unsubscribeWeb();
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
