const CACHE_NAME = 'kbc-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// इंस्टॉल इवेंट - जरूरी फाइल्स को कैश करना
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// फेच इवेंट - ऑफलाइन होने पर कैश से फाइल देना
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
