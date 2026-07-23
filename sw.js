const CACHE = "troutatlas-v16";

// Core app shell cached on install (small, fast)
const SHELL = [
  "/index.html",
  "/river.html",
  "/mappa.html",
  "/knots.html",
  "/negozi.html",
  "/trote.html",
  "/app.js",
  "/river.js",
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
      // Don't call clients.claim() — avoid disrupting in-flight page fetches
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
