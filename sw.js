const CACHE = "troutatlas-v19";

// Core app shell cached on install (small, fast)
const SHELL = [
  "/index.html",
  "/river.html",
  "/explore.html",
  "/mappa.html",
  "/knots.html",
  "/negozi.html",
  "/trote.html",
  "/app.js",
  "/river.js",
  "/explore.js",
  "/explore-style.css",
  "/intelligence.js",
  "/mappa.js",
  "/knots.js",
  "/negozi.js",
  "/trote.js",
  "/atlas.html",
  "/atlas.js",
  "/style.css",
  "/database.json",
  "/negozi.json",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  // OSM tiles: cache as they load, serve stale-while-revalidate
  if (e.request.url.includes("tile.openstreetmap.org")) {
    e.respondWith(
      caches.open(CACHE + "-tiles").then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request).catch(() => null);
        if (res && res.ok) cache.put(e.request, res.clone());
        return res || new Response("", { status: 503 });
      })
    );
    return;
  }

  // Everything else: cache-first, update in background
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkPromise = fetch(e.request)
        .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => null);
      return cached || networkPromise;
    })
  );
});
