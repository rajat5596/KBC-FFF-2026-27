const CACHE_NAME = 'kbc-v2'; // वर्ज़न बदल दिया ताकि पुराना कैश डिलीट हो जाए
const assets = [
  './',
  './index.html',
  './game.html',
  './style.css',
  './script.js',
  './game.js',
  './question.js',
  './manifest.json'
];

// इंस्टॉल इवेंट
self.addEventListener('install', event => {
  self.skipWaiting(); // तुरंत नया वर्ज़न एक्टिव करने के लिए
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// एक्टिवेट इवेंट - पुराना कैश साफ़ करना
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// फेच इवेंट - Network First Strategy (पहले नया मांगो)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
