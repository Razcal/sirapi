import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { analyzeCattle } from '../src/core/analyzeCattle.js';

export default async function handler(req, res) {
  // Lindungi endpoint ini supaya tidak bisa dipanggil sembarang orang dari internet.
  // Vercel Cron otomatis mengirim header ini; panggilan manual harus menyertakan secret yang sama.
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: cattleList, error: cattleError } = await supabase.from('cattle').select('*');
    if (cattleError) throw cattleError;

    // Kumpulkan sapi mendesak per peternak (user_id)
    const urgentByUser = {};
    for (const item of cattleList || []) {
      let analysis = null;
      try { analysis = analyzeCattle(item); } catch (e) { continue; }
      if (analysis?.isUrgent) {
        if (!urgentByUser[item.user_id]) urgentByUser[item.user_id] = [];
        urgentByUser[item.user_id].push({ code: item.code || item.id, label: analysis.statusLabel });
      }
    }

    const userIds = Object.keys(urgentByUser);
    if (userIds.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Tidak ada sapi mendesak hari ini.' });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);
    if (subError) throw subError;

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions || []) {
      const urgentItems = urgentByUser[sub.user_id] || [];
      if (urgentItems.length === 0) continue;

      const title = 'SIRAPI - Sapi Butuh Perhatian';
      const body = urgentItems.length === 1
        ? `Sapi ${urgentItems[0].code}: ${urgentItems[0].label}`
        : `${urgentItems.length} sapi Anda butuh perhatian segera. Ketuk untuk lihat detail.`;

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body, url: '/' }));
        sent++;
      } catch (err) {
        failed++;
        // Endpoint tidak valid lagi (kadaluarsa/dicabut pengguna) - bersihkan dari database.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    return res.status(200).json({ sent, failed, urgentUsers: userIds.length });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return res.status(500).json({ error: error.message });
  }
}
