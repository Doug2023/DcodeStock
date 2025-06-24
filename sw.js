const CACHE_NAME = 'dcode-stock-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './dcode-icon-192.png',
  './dcode-icon-512.png',
  './dcodeimage.jpeg'
];

// Instala e faz cache inicial
self.addEventListener('install', event => {
  self.skipWaiting(); // força ativação imediata na atualização
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Ativa novo service worker e limpa cache antigo, se houver
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // força controle imediato da página
});

// Intercepta requisições e responde com cache ou fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
