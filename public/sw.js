// Service worker: cache aset statis saja. Halaman login & /api TIDAK pernah disimpan.
const CACHE = "asetku-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/logo.png"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match("/offline.html"))); return; }
  if (u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/img/") || u.pathname.startsWith("/icons/") || /\.(png|svg|woff2)$/.test(u.pathname))
    e.respondWith(caches.match(r).then((h) => h || fetch(r).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); return res; })));
});
