// @ts-check

/**
 * Service Worker for VRChat Worlds Manager Web (PWA)
 *
 * Strategy:
 * - Static assets: Cache-first with versioned cache name
 * - API responses: Network-first with stale-while-revalidate fallback
 * - Navigation: Network-first
 */

const CACHE_NAME = 'vrcwm-v1';

/** @type {string[]} */
const PRECACHE_URLS = ['/', '/icons/app-icon.PNG'];

/**
 * Install event: precache static assets
 * @param {ExtendableEvent} event
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // Activate immediately
  /** @type {ServiceWorkerGlobalScope} */ (
    /** @type {unknown} */ (self)
  ).skipWaiting();
});

/**
 * Activate event: clean up old caches
 * @param {ExtendableEvent} event
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  /** @type {ServiceWorkerGlobalScope} */ (
    /** @type {unknown} */ (self)
  ).clients.claim();
});

/**
 * Fetch event: network-first for navigations and API, cache-first for static assets
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first for navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () => caches.match('/') || new Response('Offline', { status: 503 }),
      ),
    );
    return;
  }

  // Network-first for API calls (stale-while-revalidate)
  if (
    url.hostname.includes('api.vrchat.cloud') ||
    url.hostname.includes('workers.dev')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_e) {
          const cached = await cache.match(request);
          return cached || new Response('Network error', { status: 503 });
        }
      }),
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
