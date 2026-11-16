// Offline open: app shell is precached; scan data + photos live in IndexedDB. API calls go to Apps Script and are
// never cached. Same-origin files are network-first with a short timeout, so weak yard signal falls back to the
// cached copy fast instead of hanging. Reference thumbs (i.ebayimg.com, yard photos) are cached once seen.
const V = 'pl-pages-v20';
const SHELL = ['./', 'index.html', 'style.css', 'fonts/cinzel.woff2', 'app.js', 'zip.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
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
  e.respondWith((async () => {
    const c = await caches.open(V);
    const cached = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('index.html') : null);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()).catch(() => {}); return r; });
    if (!cached) return net.catch(() => c.match('index.html'));
    const timeout = new Promise(ok => setTimeout(() => ok(null), 3500));
    try { return (await Promise.race([net, timeout])) || cached; } catch (err) { return cached; }
  })());
});
