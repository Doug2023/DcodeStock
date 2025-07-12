
const CACHE_NAME = 'dcode-stock-v2';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './payment.js',
  './manifest.json',
  './Dcodelogo.png',
  './Dcodeanimation.mp4'
];

// Instala e adiciona ao cache
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => console.error('Service Worker: Cache failed', err))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Service Worker: Removing old cache', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Estratégia de cache: Cache First com fallback para network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(fetchResponse => {
        // Cache new GET requests
        if (event.request.method === 'GET') {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        // Fallback universal: se for navegação (document), retorna index.html
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

