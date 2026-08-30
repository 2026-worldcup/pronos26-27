import webpush from 'web-push';
import type { Config } from '@netlify/functions';

export default async () => {
  const vapidPublic = Netlify.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Netlify.env.get('VAPID_PRIVATE_KEY');
  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const supabaseKey = Netlify.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!vapidPublic || !vapidPrivate || !supabaseUrl || !supabaseKey) throw new Error('Push configuration incomplete');

  webpush.setVapidDetails('mailto:pronos26-27@netlify.app', vapidPublic, vapidPrivate);
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(vapidPrivate));
  const token = [...new Uint8Array(tokenHash)].map(b => b.toString(16).padStart(2, '0')).join('');

  const rpc = async (name: string, args: Record<string, unknown>) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify(args)
    });
    if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`);
    return response.json();
  };

  const jobs = await rpc('claim_due_push_notifications', { p_server_token_hash: token });
  const results = await Promise.allSettled((jobs || []).map(async (job: any) => {
    try {
      await webpush.sendNotification(job.subscription, JSON.stringify({
        title: `${job.countdown} pour pronostiquer`, body: `${job.team1} × ${job.team2}`,
        tag: `pronos26-match-${job.match_id}`, url: './?notifications=1'
      }));
      await rpc('complete_push_notification', { p_server_token_hash: token, p_delivery_id: job.delivery_id });
    } catch (error: any) {
      await rpc('release_push_notification', { p_server_token_hash: token, p_delivery_id: job.delivery_id }).catch(() => {});
      if (error?.statusCode === 404 || error?.statusCode === 410) await rpc('delete_push_subscription_by_endpoint', { p_server_token_hash: token, p_endpoint: job.subscription.endpoint }).catch(() => {});
      throw error;
    }
  }));

  return new Response(JSON.stringify({ processed: results.length, failed: results.filter(r => r.status === 'rejected').length }), { headers: { 'Content-Type': 'application/json' } });
};

export const config: Config = { schedule: '*/1 * * * *' };
