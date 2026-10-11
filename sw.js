const CACHE = 'joyplan-v6';
const ASSETS = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const sameOrigin = url.startsWith('./');
        const response = await fetch(url, sameOrigin ? {} : { mode: 'no-cors' });
        await cache.put(url, response);
      } catch (e) { /* skip anything that fails; the app still works online */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;   // database calls always go to the network
  const sameOrigin = url.origin === self.location.origin;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (sameOrigin) {
      // Your own files: try the network first so new uploads show up right away
      try {
        const fresh = await fetch(event.request);
        if (fresh && fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(event.request)) || Response.error();
      }
    }
    // Outside files (fonts, icon library): use the cache first
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && (response.ok || response.type === 'opaque')) cache.put(event.request, response.clone());
      return response;
    } catch (e) {
      return Response.error();
    }
  })());
});
