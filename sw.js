const CACHE_NAME = 'pronos26-no-cache-v1';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => { if (event.request.method === 'GET') event.respondWith(fetch(event.request, { cache: 'no-store' })); });
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: 'Pronos 2026', body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Pronos 2026', {
    body: data.body || '', icon: data.icon || './favicon.ico', badge: data.badge || './favicon.ico',
    tag: data.tag || 'pronos26-notification', data: { url: data.url || './?notifications=1' },
    renotify: false
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './?notifications=1', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(c => 'focus' in c);
    if (existing) { existing.navigate(url); return existing.focus(); }
    return clients.openWindow(url);
  }));
});
