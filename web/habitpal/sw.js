// Define a cache name
const CACHE_NAME = "habitpal-v0.3";
// List the files you want to cache (your app shell)
const urlsToCache = [
  "/habitpal/",
  "/habitpal/index.html",
  "/habitpal/index.css",
  "/habitpal/js/ts/index.js",
  "/habitpal/favicon.ico",
  "/habitpal/manifest.json",
];

// Install event: Cache the app shell
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching app shell", CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event: Clean up old caches (optional but good practice)
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...", CACHE_NAME);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("Service Worker: Clearing old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event: Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Got fetch for ", event.request.url);
  event.respondWith(
    caches
      .match(event.request) // Try to find the response in the cache
      .then((response) => {
        // Return response from cache if found
        if (response) {
          console.log("Service Worker: Found in cache", event.request.url);
          return response;
        }
        // Otherwise, fetch from network
        console.log(
          "Service Worker: Not in cache, fetching from network",
          event.request.url
        );
        return fetch(event.request)
          .then((networkResponse) => {
            // Optional: Cache the newly fetched resource dynamically
            // Be careful what you cache dynamically!
            let cacheCopy = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, cacheCopy));
            return networkResponse;
          })
          .catch((error) => {
            // Handle network errors (e.g., return an offline fallback page)
            console.error("Service Worker: Fetch failed:", error);
            // return caches.match('/offline.html'); // Example fallback
          });
      })
  );
});
