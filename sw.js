const CACHE_NAME = 'dcode-stock-v2'; // IMPORTANTE: sempre aumente o número para forçar update
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

self.addEventListener('install', event => {
  self.skipWaiting(); // ativa imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // controla todas as abas imediatamente
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
