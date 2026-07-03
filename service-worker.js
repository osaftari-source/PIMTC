const CACHE_NAME = "pimtc-v15-2-7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./robots.txt",
  "./sitemap.xml",
  "./css/style.css",
  "./css/style.css?v=15.2.7",
  "./js/app.js",
  "./js/app.js?v=15.2.7",
  "./data/home.json",
  "./data/men.json",
  "./data/women.json",
  "./data/tournaments.json",
  "./data/results.json",
  "./data/standings.json",
  "./data/playoffs.json",
  "./data/live.json",
  "./data/updates.json",
  "./data/live-standings.json",
  "./data/schedule.json",
  "./data/gallery.json",
  "./data/home-gallery.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo.png",
  "./icons/favicon-48.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for Google Sheets API calls, cache-first for app shell.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isApi = url.hostname.includes("script.google.com");
  const isMedia = url.pathname.includes("/media/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url.pathname);

  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (isMedia) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

