const CACHE_NAME = 'gbc-pwa-v1';
const LOCAL_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(LOCAL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Core EmulatorJS dal CDN: stale-while-revalidate (offline dopo il primo avvio)
  if (url.origin === 'https://cdn.emulatorjs.org') {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          try { cache.put(req, res.clone()); } catch (err) {}
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Stessa origine: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => { try { c.put(req, copy); } catch (err) {} });
          return res;
        }).catch(() => cached);
      })
    );
  }
});