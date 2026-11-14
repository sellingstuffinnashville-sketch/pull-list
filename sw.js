// Offline open: app shell is cached; scan data + photos live in IndexedDB. API calls go to Apps Script and are never cached.
// Reference thumbs from i.ebayimg.com are cached opaque so they still show in the yard without signal.
const V = 'pl-pages-v9';
const SHELL = ['./', 'index.html', 'style.css', 'fonts/cinzel.woff2', 'app.js', 'loot.js', 'zip.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'i.ebayimg.com' || u.hostname === 'papimages.blob.core.windows.net') {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request, { mode: 'no-cors', credentials: 'omit' });
      try { await c.put(e.request, r.clone()); } catch (err) {}
      return r;
    })());
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
