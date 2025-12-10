// Service Worker for Unity WebGL PWA
const CACHE_NAME = 'unity-webgl-cache-v1';

// Files to cache immediately on install
const PRECACHE_FILES = [
  './index.html',
  './manifest.json',
  './favicon.ico'
];

// Install event - precache essential files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching app shell');
      return cache.addAll(PRECACHE_FILES).catch((err) => {
        console.error('[ServiceWorker] Pre-cache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Return cached version
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the new response
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache Unity build files and assets
          if (event.request.url.includes('/Build/') || 
              event.request.url.includes('/StreamingAssets/') ||
              event.request.url.endsWith('.png') ||
              event.request.url.endsWith('.jpg') ||
              event.request.url.endsWith('.json')) {
            cache.put(event.request, responseToCache);
          }
        });

        return response;
      }).catch((error) => {
        console.error('[ServiceWorker] Fetch failed:', error);
        // You could return a custom offline page here
        throw error;
      });
    })
  );
});
