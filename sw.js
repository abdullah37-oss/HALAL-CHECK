const CACHE = 'halalcheck-v4';
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './analytics.js', './manifest.webmanifest', './offline.html', './icons/icon.svg', './src/i18n/index.js', './src/data/ingredientDatabase.js', './src/data/universalHalalPolicy.js', './src/utils/halalAnalyzer.js', './src/models/productModel.js', './src/data/productCatalog.js', './src/utils/productRepository.js'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match('./offline.html'))));
});
