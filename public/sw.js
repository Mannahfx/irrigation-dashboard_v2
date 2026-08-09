const CACHE_NAME = 'revo-ims-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through for Supabase and HiveMQ requests (don't cache API calls)
  if (event.request.url.includes('supabase.co') || event.request.url.includes('hivemq.cloud')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache new requests to serve offline next time (only HTTP/HTTPS)
          if (event.request.url.startsWith('http')) {
            cache.put(event.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    }).catch(() => {
      // Fallback to index.html for SPA routing if offline
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
