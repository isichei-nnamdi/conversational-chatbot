// Keeps the page shell and the topics available offline. Question lookups and the helper always need a connection.
const CACHE = "siwes-v1";
const SHELL = ["/", "/miva-logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Topics: newest when online, last copy when not. Nothing else from the API is stored.
  const isKb = url.pathname === "/api/kb";
  if (url.pathname.startsWith("/api/") && !isKb) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (isKb || url.origin === location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))),
  );
});
