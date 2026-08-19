import { supabase } from './supabaseClient';

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

export const pushService = {
  isSupported: () => 'serviceWorker' in navigator && 'PushManager' in window,

  getPermissionStatus: () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  isSubscribed: async () => {
    try {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  },

  subscribe: async (userId) => {
    try {
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
        }, { onConflict: 'endpoint' });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  unsubscribe: async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return { success: true };
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
