// Plain Pull List (no RPG). Own cache name and scope so it does not clash with the game build at ../.
// Shared app.js / style.css / config.js live one directory up. Scan data + photos live in the same IndexedDB.
const V = 'pl-pages-plain-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', '../style.css', '../fonts/cinzel.woff2', '../app.js', '../zip.js', '../config.js', '../icon-192.png', '../icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('pl-pages-plain') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
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
