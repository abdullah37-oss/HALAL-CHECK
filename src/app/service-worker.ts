const CACHE = 'halalcheck-v7';
const worker = self as unknown as ServiceWorkerGlobalScope;
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './config.js', './analytics.js', './manifest.webmanifest', './offline.html', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './src/i18n/index.js', './src/data/ingredientDatabase.js', './src/data/universalHalalPolicy.js', './src/utils/halalAnalyzer.js', './src/models/productModel.js', './src/data/productCatalog.js', './src/utils/productRepository.js'];
worker.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => worker.skipWaiting())));
worker.addEventListener('activate', (event) => event.waitUntil(Promise.all([
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('halalcheck-') && key !== CACHE).map((key) => caches.delete(key)))),
  worker.clients.claim()
])));
worker.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== worker.location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && response.type !== 'opaque') {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? (await caches.match('./offline.html')) || Response.error() : Response.error())));
});

export {};
