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

    const { data: subscriptions, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Belum ada peternak yang mengaktifkan notifikasi.' });
    }

    const userIds = [...new Set(subscriptions.map(s => s.user_id))];

    const { data: users, error: usersError } = await supabase.from('users').select('id, name').in('id', userIds);
    if (usersError) throw usersError;
    const nameByUserId = {};
    (users || []).forEach(u => { nameByUserId[u.id] = u.name; });

    const { data: cattleList, error: cattleError } = await supabase.from('cattle').select('*').in('user_id', userIds);
    if (cattleError) throw cattleError;

    // Kumpulkan informasi penting per peternak (user_id) — bukan "mendesak", istilah yang lebih netral/ramah
    const importantByUser = {};
    for (const item of cattleList || []) {
      let analysis = null;
      try { analysis = analyzeCattle(item); } catch (e) { continue; }
      if (analysis?.isUrgent) {
        if (!importantByUser[item.user_id]) importantByUser[item.user_id] = [];
        importantByUser[item.user_id].push({ code: item.code || item.id, label: analysis.statusLabel });
      }
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const name = nameByUserId[sub.user_id] || 'Peternak';
      const importantItems = importantByUser[sub.user_id] || [];

      let body = `Selamat pagi, ${name}! `;
      if (importantItems.length === 1) {
        body += `Ada informasi penting: Sapi ${importantItems[0].code} - ${importantItems[0].label}.`;
      } else if (importantItems.length > 1) {
        body += `Ada ${importantItems.length} informasi penting tentang sapi Anda hari ini. Ketuk untuk lihat detail.`;
      } else {
        body += `Semua sapi Anda dalam kondisi baik hari ini. Selamat beternak!`;
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify({ title: 'SIRAPI', body, url: '/' }));
        sent++;
      } catch (err) {
        failed++;
        // Endpoint tidak valid lagi (kadaluarsa/dicabut pengguna) - bersihkan dari database.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    return res.status(200).json({ sent, failed, totalSubscribers: subscriptions.length });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return res.status(500).json({ error: error.message });
  }
}
