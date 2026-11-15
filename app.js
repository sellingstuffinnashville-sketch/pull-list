// Pull List (GitHub Pages build). Opens offline via service worker. Every action is an op saved to IndexedDB first,
// then POSTed to the Apps Script JSON API when there is signal. Photos queue in IndexedDB and upload to Drive one at
// a time, retrying with backoff on weak signal; the queue survives closing the app.
'use strict';
const $ = s => document.querySelector(s);
const main = $('#main');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function ebaySize(u, n) {
  u = String(u || '');
  const g = u.match(/i\.ebayimg\.com\/images\/g\/([^/?#]+)/i)
         || u.match(/i\.ebayimg\.com\/00\/s\/[^/]+\/z\/([^/]+)\//i);
  if (g) return 'https://i.ebayimg.com/images/g/' + g[1] + '/s-l' + n + '.jpg';
  return u.replace(/s-l\d+/i, 's-l' + n);
}

// One-time cleanup: drop leftover keys from the old game build (XP, battle, sound, music). Login and device stay.
(function cleanLocal() {
  const keep = new Set(['pl_token', 'pl_dev', 'pl_devname', 'pl_reset_epoch', 'pl_lastsync', 'pl_view']);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pl_') && !keep.has(k)) localStorage.removeItem(k);
    }
  } catch (e) {}
})();

// ---------- IndexedDB ----------
let dbp;
function db() {
  return dbp ||= new Promise((ok, bad) => {
    const r = indexedDB.open('pull-list', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('photos', { keyPath: 'key' });      // key = date/filename, {blob, date, name}
      d.createObjectStore('ops', { keyPath: 'id' });          // every local op, {date, pending}
      d.createObjectStore('server', { keyPath: 'date' });     // last merged state from server
      d.createObjectStore('kv');
    };
    r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((ok, bad) => {
    const t = d.transaction(store, mode), s = t.objectStore(store); let out;
    Promise.resolve(fn(s)).then(v => out = v);
    t.oncomplete = () => ok(out); t.onerror = () => bad(t.error);
  });
}
const req = r => new Promise((ok, bad) => { r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
const kvGet = k => tx('kv', 'readonly', s => req(s.get(k)));
const kvSet = (k, v) => tx('kv', 'readwrite', s => s.put(v, k));

// ---------- server calls ----------
// JSON API on the Apps Script /exec URL (text/plain = no CORS preflight). Every call has a timeout so a
// weak yard signal can't leave a request hanging forever.
async function call(fn, ...args) {
  const ms = fn === 'uploadPhoto' ? 180000 : 30000;
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(window.PL_CONFIG.EXEC_URL, { method: 'POST', body: JSON.stringify({ fn, args }),
      redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ac.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { throw new Error('Bad reply from server'); }
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally { clearTimeout(tm); }
}
let TOKEN = localStorage.getItem('pl_token') || '';
async function api(fn, ...args) {
  const r = await call(fn, TOKEN, ...args);
  if (r && r.error === 'login') { const e = new Error('login'); e.login = 1; throw e; }
  if (r && r.resetEpoch) await applyResetIfNeeded(r.resetEpoch);
  if (r && r.error === 'reset') { const e = new Error('reset'); e.reset = 1; throw e; }
  if (r && r.error) throw new Error(r.error);
  return r;
}

// Field reset (2026-11-14): wipe local checks, notes and photos once per epoch. Already applied on every phone
// that opened the app since; kept so the server keeps accepting this phone's writes (it checks the epoch).
const RESET_KEY = 'pl_reset_epoch';
const LOCAL_RESET_EPOCH = 1794670000000; // keep in sync with Apps Script RESET_EPOCH
const epochNow = () => Number(localStorage.getItem(RESET_KEY) || 0);
async function applyResetIfNeeded(epoch) {
  const target = Math.max(Number(epoch || 0), LOCAL_RESET_EPOCH);
  if (epochNow() >= target) return false;
  localOps = [];
  serverState = {};
  for (const u of urlCache.values()) { try { if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u); } catch (e) {} }
  urlCache.clear();
  await tx('ops', 'readwrite', s => s.clear());
  await tx('photos', 'readwrite', s => s.clear());
  await tx('server', 'readwrite', s => s.clear());
  localStorage.setItem(RESET_KEY, String(target));
  if (scan && date) render();
  return true;
}

// ---------- device ----------
let DEV = localStorage.getItem('pl_dev') || '';       // short tag in photo names, e.g. B or QXR
let DEVNAME = localStorage.getItem('pl_devname') || '';

// ---------- state ----------
// screen: home | scan | trip | ready. Ops are per "date": a scan date for part checks/photos/notes, or a trip
// day for that day's receipt and paid total (same Drive op log file name pattern, different keys).
let screen = 'home';
let scan = null, date = null, serverState = {}, localOps = [];
const VIEWS = {}; // date -> merged state from the last draw (photo marks and photo sheets read it)
function merge(srv, ops) { // server state overlaid with local ops, last writer wins
  const st = { ...srv };
  for (const o of ops) {
    const cur = st[o.k];
    if (!cur || o.ts > cur.ts || (o.ts === cur.ts && o.dev >= cur.dev)) st[o.k] = { v: o.v, dev: o.dev, ts: o.ts };
  }
  return st;
}
function view() { return (VIEWS[date] = merge(serverState, localOps)); }
const val = (st, k) => st[k] ? st[k].v : undefined;
const chiDay = (ts = Date.now()) => new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
async function stateFor(d) {
  const srv = ((await tx('server', 'readonly', s => req(s.get(d)))) || {}).state || {};
  const ops = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.date === d);
  return (VIEWS[d] = merge(srv, ops));
}
async function ops(pairs, d = date) { // save one or more ops locally first, then sync
  const now = Date.now();
  const list = pairs.map(([k, v], i) => ({ id: DEV + '-' + (now + i).toString(36) + '-' + Math.random().toString(36).slice(2, 8), k, v, dev: DEV, ts: now + i, date: d, pending: 1 }));
  if (d === date) localOps.push(...list);
  await tx('ops', 'readwrite', s => { for (const o of list) s.put(o); });
  rerender(); sync();
}
const op = (k, v, d = date) => ops([[k, v]], d);
function rerender() {
  if (screen === 'scan') render();
  else if (screen === 'trip') showTrip(true);
  else if (screen === 'ready') showReady(true);
}

// ---------- sync ----------
// Checks and notes: every op sits in IndexedDB with pending=1 until the server has it. Pending ops for any
// scan date (not just the open one) go up on the next sync, so nothing made offline is lost.
let syncing = false;
const LAST_KEY = 'pl_lastsync';
function markSynced() { localStorage.setItem(LAST_KEY, String(Date.now())); }
function clock(ts) { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
async function sync(extra = []) {
  if (syncing) return;
  await applyResetIfNeeded(0);
  if (!navigator.onLine) { status(); return; }
  syncing = true;
  try {
    const allPend = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.pending);
    const dates = new Set(allPend.map(o => o.date).filter(Boolean));
    if (date) dates.add(date);
    for (const d of extra) dates.add(d);
    let changed = false;
    const order = [...dates].sort((a, b) => (b === date) - (a === date)); // open scan first
    for (const d of order) {
      const pend = allPend.filter(o => o.date === d);
      if (d === date) for (const o of localOps) if (o.pending && !pend.some(p => p.id === o.id)) pend.push(o);
      const epoch = epochNow();
      let j;
      try { j = await api('sync', d, pend.map(({ id, k, v, dev, ts }) => ({ id, k, v, dev, ts })), epoch); }
      catch (e) { if (e.login) throw e; break; } // no signal or server hiccup: ops stay pending for next time
      if (epochNow() > epoch) continue; // a reset landed mid-call; those ops were wiped
      await tx('server', 'readwrite', s => s.put({ date: d, state: j.state || {} }));
      await tx('ops', 'readwrite', s => { for (const o of pend) { o.pending = 0; s.put(o); } });
      const ids = new Set(pend.map(o => o.id));
      for (const o of localOps) if (ids.has(o.id)) o.pending = 0;
      if (d === date) serverState = j.state || {};
      changed = true;
      markSynced();
    }
    if (changed) rerender();
  } catch (e) {
    if (e.login) { TOKEN = ''; localStorage.removeItem('pl_token'); syncing = false; return showLogin(); }
  } finally { syncing = false; }
  upload();
}

// ---------- photo upload queue ----------
// One at a time, oldest first. A failed or timed-out upload waits 5s, 15s, 30s, 1m, 2m, then every 5m,
// and retries right away when the phone comes back online or the app is reopened.
const BACKOFF = [5e3, 15e3, 30e3, 60e3, 120e3, 300e3];
let uploading = false, upNow = null, upTimer = null;
function scheduleUpload(ms) {
  clearTimeout(upTimer);
  upTimer = setTimeout(upload, Math.max(500, ms));
}
async function upload() {
  if (uploading) return;
  if (!navigator.onLine) return status();
  uploading = true;
  try {
    for (;;) {
      const all = (await tx('photos', 'readonly', s => req(s.getAll()))).filter(r => !r.uploaded);
      if (!all.length || !navigator.onLine) break;
      const now = Date.now();
      const due = all.filter(r => !(r.next > now)).sort((a, b) => (a.t || 0) - (b.t || 0));
      if (!due.length) { scheduleUpload(Math.min(...all.map(r => r.next)) - now); break; }
      const next = due[0];
      upNow = next.key; status(); paintStatus();
      try {
        const b64 = await blobToB64(next.blob);
        const epoch = epochNow();
        await api('uploadPhoto', next.date, next.name, b64, epoch);
        if (epochNow() > epoch) break; // a mid-upload reset cleared the photos store
        next.uploaded = 1; next.tries = 0; next.next = 0; next.err = ''; next.upAt = Date.now();
        await tx('photos', 'readwrite', s => s.put(next));
        markSynced();
      } catch (e) {
        if (e.login) throw e;
        if (e.reset) break;
        next.tries = (next.tries || 0) + 1;
        next.next = Date.now() + BACKOFF[Math.min(next.tries - 1, BACKOFF.length - 1)];
        next.err = String(e && e.message || e).slice(0, 120);
        await tx('photos', 'readwrite', s => s.put(next));
        scheduleUpload(next.next - Date.now());
        break; // probably no signal; don't hammer the rest of the queue
      } finally { upNow = null; }
    }
  } catch (e) { if (e.login) { uploading = false; upNow = null; TOKEN = ''; localStorage.removeItem('pl_token'); return showLogin(); } }
  finally { uploading = false; upNow = null; }
  status(); paintStatus();
}
function retryNow() { // phone came back online or app reopened: skip the backoff wait
  tx('photos', 'readwrite', s => req(s.getAll()).then(rs => { for (const r of rs) if (!r.uploaded && r.next) { r.next = 0; s.put(r); } }))
    .then(() => { sync(); upload(); }).catch(() => {});
}

// Header pill: pending count + last good sync time.
async function status() {
  const p = $('#net'); if (!p) return;
  let n = 0, ops = 0, failing = 0;
  try {
    const photos = (await tx('photos', 'readonly', s => req(s.getAll()))).filter(r => !r.uploaded);
    n = photos.length; failing = photos.filter(r => r.tries > 0).length;
    ops = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.pending).length;
  } catch (e) {}
  const last = Number(localStorage.getItem(LAST_KEY) || 0);
  const when = last ? 'synced ' + clock(last) : 'not synced yet';
  const pend = n + ops;
  let cls, txt;
  if (!navigator.onLine) { cls = 'off'; txt = pend ? `Offline · ${pend} waiting` : 'Offline'; }
  else if (upNow) { cls = 'wait'; txt = `Uploading · ${pend} left`; }
  else if (failing) { cls = 'wait'; txt = `Retrying · ${pend} waiting`; }
  else if (pend) { cls = 'wait'; txt = `${pend} waiting`; }
  else { cls = 'ok'; txt = 'Synced'; }
  p.className = 'pill ' + cls;
  p.innerHTML = `<b>${esc(txt)}</b><small>${esc(when)}</small>`;
  p.title = `${n} photo(s) and ${ops} check/note change(s) waiting · ${when}`;
}
function blobToB64(blob) {
  return new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => bad(r.error); r.readAsDataURL(blob); });
}
window.addEventListener('online', retryNow);
window.addEventListener('offline', () => { status(); paintStatus(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') retryNow(); });
setInterval(() => { if (document.visibilityState === 'visible') { sync(); upload(); } }, 15000);

// ---------- photos ----------
// Capture uses the phone's own camera app at full resolution (<input type=file accept=image/* capture=environment>).
// The original JPEG is stored and uploaded byte-for-byte: no resize, no recompression. Only a separate small
// thumbnail is made for the list. A non-JPEG original (e.g. HEIC/PNG) is converted once to a full-size JPEG at
// q0.95, because Drive names and the server expect .jpg.
function nextName(st, prefix) { // per-device numbering so two phones never collide
  const re = new RegExp('^photo:' + prefix.replace(/[-]/g, '\\-') + DEV + '(\\d+)\\.jpg$');
  let max = 0;
  for (const k of Object.keys(st)) { const m = re.exec(k); if (m) max = Math.max(max, +m[1]); }
  return `${prefix}${DEV}${max + 1}.jpg`;
}
async function isJpeg(file) {
  if (/^image\/jpe?g$/i.test(file.type)) return true;
  try { const b = new Uint8Array(await file.slice(0, 3).arrayBuffer()); return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF; }
  catch { return false; }
}
async function originalJpeg(file) {
  if (await isJpeg(file)) return file; // untouched original
  try { // full resolution, no downscale
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    return await new Promise(ok => c.toBlob(b => ok(b || file), 'image/jpeg', 0.95));
  } catch { return file; }
}
async function makeThumb(blob) { // small display copy only; never uploaded
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8));
  } catch { return null; }
}
function takePhoto() {
  return new Promise(ok => {
    const cam = $('#cam'); cam.value = '';
    cam.onchange = () => ok(cam.files[0] || null);
    cam.click();
  });
}
async function capture(kind, code, d = date) {
  // kind: part -> <code>_<DEV><n>.jpg ; vin -> <car6>_VIN_<DEV><n>.jpg ; x -> <car6>_X_<DEV><n>.jpg ; rcpt -> RECEIPT_<DEV><n>.jpg
  const f = await takePhoto(); if (!f) return;
  const blob = await originalJpeg(f);
  const thumb = await makeThumb(blob);
  const st = d === date && scan ? view() : await stateFor(d);
  const prefix = kind === 'part' ? `${code}_` : kind === 'vin' ? `${code}_VIN_` : kind === 'x' ? `${code}_X_` : 'RECEIPT_';
  const name = nextName(st, prefix);
  await tx('photos', 'readwrite', s => s.put({ key: `${d}/${name}`, date: d, name, blob, thumb, uploaded: 0, tries: 0, next: 0, t: Date.now() }));
  const pairs = [['photo:' + name, { kind, code, by: DEVNAME || DEV, size: blob.size, day: chiDay() }]];
  if (kind === 'vin') pairs.push(['vin:' + code, { file: name, verify: 'pending' }]);
  await ops(pairs, d);
  upload();
}
const urlCache = new Map();
async function thumbURL(name, full, d = date) {
  const key = `${d}/${name}` + (full ? '#full' : '');
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await tx('photos', 'readonly', s => req(s.get(`${d}/${name}`)));
  const b = rec ? (full ? rec.blob : rec.thumb || rec.blob) : null;
  const u = b ? URL.createObjectURL(b) : null; if (u || !full) urlCache.set(key, u); return u;
}
function photosFor(st, kind, code) {
  return Object.keys(st).filter(k => k.startsWith('photo:') && st[k].v && st[k].v.kind === kind && st[k].v.code === code && !val(st, 'del:' + k.slice(6)))
    .map(k => k.slice(6)).sort();
}
function thumbs(names, d = date) {
  if (!names.length) return '';
  return `<div class="thumbs">${names.map(n => `<div class="t" data-photo="${esc(n)}" data-d="${esc(d)}"><i class="ps"></i><span>${esc(n.replace(/^.*?_((VIN_|X_)?[A-Z]+\d+)\.jpg$/, '$1'))}</span></div>`).join('')}</div>`;
}
async function fillThumbs() {
  for (const el of main.querySelectorAll('.t[data-photo]')) {
    const d = el.dataset.d || date, n = el.dataset.photo;
    const u = await thumbURL(n, false, d);
    if (u && !el.querySelector('img')) { const i = new Image(); i.src = u; el.prepend(i); }
    else if (!u && !el.dataset.tried && (VIEWS[d] || {})['up:' + n] && navigator.onLine) {
      el.dataset.tried = 1;
      api('getThumb', d, n).then(r => { if (r.url) { urlCache.set(`${d}/${n}`, r.url); const i = new Image(); i.src = r.url; el.prepend(i); } }).catch(() => {});
    }
  }
  paintStatus();
}
// Per-photo mark: waiting (queued on this phone) / uploading / synced / retrying after a failure.
const PS = { wait: ['⏳', 'Waiting to upload'], up: ['↑', 'Uploading'], ok: ['✓', 'Synced to Drive'], retry: ['!', 'Upload failed, retrying'], other: ['…', 'Not uploaded yet from the other phone'] };
async function paintStatus() {
  const els = main.querySelectorAll('.t[data-photo]'); if (!els.length) return;
  let recs = [];
  try { recs = await tx('photos', 'readonly', s => req(s.getAll())); } catch (e) {}
  const mine = new Map(recs.map(r => [r.key, r]));
  for (const el of els) {
    const d = el.dataset.d || date, st = VIEWS[d] || {};
    const n = el.dataset.photo, r = mine.get(`${d}/${n}`), up = st['up:' + n] && st['up:' + n].v;
    const s = r ? (r.uploaded || up ? 'ok' : upNow === r.key ? 'up' : r.tries > 0 ? 'retry' : 'wait') : (up ? 'ok' : 'other');
    const i = el.querySelector('.ps'); if (!i) continue;
    i.className = 'ps ps-' + s; i.textContent = PS[s][0]; el.title = PS[s][1] + (r && r.err && s === 'retry' ? ` (${r.err})` : '');
  }
}

// ---------- screens ----------
function showLogin(msg = '') {
  $('#back').hidden = true; $('#title').textContent = 'Pull List';
  main.innerHTML = `<div class="login"><h2>Enter passcode</h2>
    <p class="small">Only needed once on this phone or computer.</p>
    <input id="pc" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12">
    <p class="msg" id="lmsg">${esc(msg)}</p><button class="big" id="go">Unlock</button></div>`;
  const go = async () => {
    $('#lmsg').textContent = 'Checking…';
    try {
      const r = await call('login', $('#pc').value);
      if (r.ok) { TOKEN = r.token; localStorage.setItem('pl_token', TOKEN); start(); }
      else $('#lmsg').textContent = r.error || 'Wrong passcode';
    } catch (e) { $('#lmsg').textContent = 'No signal. Try again.'; }
  };
  $('#go').onclick = go;
  $('#pc').onkeydown = e => { if (e.key === 'Enter') go(); };
}
// Each device gets a stable random tag (2-3 letters) used in photo names and op attribution, so the login is
// passcode-only. Existing phones keep the initial they already have. The display name can be renamed in settings.
function ensureDevice() {
  if (!DEV) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const rnd = new Uint32Array(3); crypto.getRandomValues(rnd);
    DEV = Array.from(rnd, x => A[x % A.length]).join('');
    localStorage.setItem('pl_dev', DEV);
  }
  if (!DEVNAME) { DEVNAME = 'Phone ' + DEV; localStorage.setItem('pl_devname', DEVNAME); }
}
function showSettings() {
  const el = document.createElement('div'); el.className = 'sheet';
  el.innerHTML = `<div class="box"><p><b>This phone</b><br><span class="small">Tag ${esc(DEV)} (in photo names; stays the same)</span></p>
    <label class="small" for="nm">Name shown on checks and photos</label>
    <input id="nm" class="nmin" maxlength="24" value="${esc(DEVNAME)}">
    <button data-save="1">Save name</button><button data-close="1">Close</button></div>`;
  document.body.append(el);
  el.onclick = ev => {
    const b = ev.target;
    if (b === el || b.dataset.close) return el.remove();
    if (b.dataset.save) {
      DEVNAME = el.querySelector('#nm').value.trim().slice(0, 24) || ('Phone ' + DEV);
      localStorage.setItem('pl_devname', DEVNAME); el.remove();
      if (screen === 'home') showHome(); else rerender();
    }
  };
}
// Scan list and scans open from the copy saved on this phone first, then refresh from the server when there is
// signal. The newest scans are saved ahead of time so they open in the yard even if never opened before.
async function showHome() {
  date = null; scan = null; screen = 'home'; lastScan = null;
  $('#back').hidden = true; $('#back').textContent = '← Scans'; $('#title').textContent = 'Pull List · Scans';
  status();
  const draw = idx => {
    if (screen !== 'home') return;
    main.innerHTML = `<div class="tools"><button data-act="trip">Trip days</button><button data-act="ready">Ready to list</button></div><p class="small">Newest first. Tap a scan to open it.</p>` + (idx && idx.length ? idx.map(s =>
      `<button class="scanitem" data-d="${esc(s.date)}"><b>${esc(s.date)}</b>${esc(s.label)}<br><span class="small">${s.cars} cars · ${s.parts} parts</span></button>`).join('')
      : `<p>${navigator.onLine ? 'Loading scans…' : 'No scans saved on this phone yet. Open the app once with signal.'}</p>`)
      + `<p class="small">This phone: ${esc(DEVNAME)} · <a href="#" class="chg">settings</a></p>`;
    main.querySelectorAll('.scanitem').forEach(b => b.onclick = () => openScan(b.dataset.d));
  };
  const cached = await kvGet('index') || [];
  draw(cached);
  if (!navigator.onLine) return;
  try {
    const idx = (await api('listScans')).scans || [];
    await kvSet('index', idx); draw(idx);
    prefetchScans(idx.slice(0, 3));
  } catch (e) { if (e.login) return showLogin(); }
}
async function prefetchScans(list) {
  for (const s of list) {
    try { const sc = (await api('getScan', s.date)).scan; if (sc) await kvSet('scan:' + s.date, sc); } catch (e) { if (e.login) return; }
  }
}
async function openScan(d) {
  date = d; screen = 'scan'; lastScan = null;
  $('#back').hidden = false; $('#back').textContent = '← Scans'; $('#title').textContent = d;
  scan = await kvGet('scan:' + d);
  serverState = ((await tx('server', 'readonly', s => req(s.get(d)))) || {}).state || {};
  localOps = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.date === d);
  if (scan) { render(); sync(); }
  else main.innerHTML = '<p>Loading…</p>';
  if (!navigator.onLine) { if (!scan) main.innerHTML = '<p>This scan is not saved on this phone yet. Open it once with signal.</p>'; return; }
  try {
    const fresh = (await api('getScan', d)).scan;
    if (fresh) { await kvSet('scan:' + d, fresh); if (date === d) { const first = !scan; scan = fresh; render(); if (first) sync(); } }
  } catch (e) {
    if (e.login) return showLogin();
    if (!scan && date === d) main.innerHTML = '<p>This scan is not saved on this phone yet. Open it once with signal.</p>';
  }
}

function money(n) { return n == null ? '?' : '$' + n; }
const money2 = n => '$' + (Number(n) || 0).toFixed(2);
let renderLater = false;
main.addEventListener('focusout', () => setTimeout(() => { if (renderLater && !main.contains(document.activeElement)) { renderLater = false; rerender(); } }, 50));
function typing() { // don't redraw under someone typing a part number or a receipt total
  const ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && main.contains(ae)) { renderLater = true; return true; }
  return false;
}
let VIEWMODE = localStorage.getItem('pl_view') === 'row' ? 'row' : 'car';
const WHY = { gone: 'Gone', damaged: 'Damaged', skip: 'Skipped' };
function partPics(st, code) {
  return photosFor(st, 'part', code).concat(Object.keys(st).filter(k => k.startsWith('assign:') && st[k].v === code && !val(st, 'del:' + k.slice(7))).map(k => k.slice(7)));
}
function partCard(p, st, carLine) {
  const got = !!val(st, 'got:' + p.code);
  const pics = partPics(st, p.code);
  const thumb = p.ref && p.ref.img
    ? `<button type="button" class="pref" data-refimg="${esc(p.ref.img)}" aria-label="Reference photo of ${esc(p.part)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(ebaySize(p.ref.img, 225))}" alt="" width="56" height="56"></button>`
    : '';
  const elink = p.ref && p.ref.link ? `<a class="elink" href="${esc(p.ref.link)}" target="_blank" rel="noopener noreferrer">eBay</a>` : '';
  return `<div class="part ${got ? 'got' : ''}">${carLine || ''}<div class="pline">
    <button class="chk" data-act="got" data-c="${p.code}" aria-label="Got it">${got ? '✓' : ''}</button>
    ${thumb}
    <div class="pinfo"><span class="pcode">${esc(p.code)}</span><span class="tier ${p.tier}">${p.tier}</span>${elink}
    <div class="pname">${esc(p.part)}</div>${p.note ? `<div class="pnote">${esc(p.note)}</div>` : ''}
    ${p.pap != null ? `<div class="small">PAP price $${p.pap.toFixed(2)}</div>` : ''}</div>
    <div class="pnet"><span class="pnetlbl">Est. net</span>${money(p.net)}</div></div>
    ${pnBlock(p, st)}
    <div class="pbtns"><button class="cambtn" data-act="part" data-c="${p.code}">📷${pics.length ? ' ' + pics.length : ''}</button>
    <input data-pn="${p.code}" placeholder="Actual part #" value="${esc(val(st, 'pn:' + p.code) || '')}"></div>
    ${got ? '' : `<div class="whybtns"><button data-act="why" data-why="gone" data-c="${p.code}">Gone</button><button data-act="why" data-why="damaged" data-c="${p.code}">Damaged</button><button data-act="why" data-why="skip" data-c="${p.code}">Skip</button></div>`}
    ${thumbs(pics)}</div>`;
}
function removedLine(p, st) {
  const by = st['rm:' + p.code], why = WHY[val(st, 'why:' + p.code)] || 'Skipped';
  return `<div class="removed">✕ ${esc(p.code)} ${esc(p.part)} <span class="small">${why}${by ? ' · ' + esc(by.dev) : ''}</span><button data-act="undo" data-c="${p.code}">Undo</button></div>`;
}
function carHead(car, st) {
  const vinPics = photosFor(st, 'vin', car.code6), xPics = photosFor(st, 'x', car.code6);
  const vin = val(st, 'vin:' + car.code6);
  return `<div class="carhd">
    ${car.photo ? `<button type="button" class="carphoto" data-refimg="${esc(car.photo)}" aria-label="Yard photo of ${esc(car.car)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(car.photo)}" alt=""></button>` : ''}
    <div class="carbtns"><button data-act="vin" data-c="${car.code6}" class="${vinPics.length ? 'done' : ''}">📷 VIN photo${vinPics.length ? ' ✓' : ''}</button>
    <button data-act="x" data-c="${car.code6}">📷 Extra photo${xPics.length ? ` (${xPics.length})` : ''}</button></div>
    <div class="code6">${esc(car.code6)}</div>
    <div class="name">${esc(car.car)}${car.engine ? ` · ${esc(car.engine.replace(/^[\d.]+L\s*/, ''))}` : ''}</div>
    <div class="vin">VIN ${esc(car.vin)}</div>
    ${vin ? `<div class="vinflag">VIN photo taken · check ${vin.verify === 'ok' ? 'passed' : vin.verify === 'mismatch' ? 'MISMATCH' : 'pending'}</div>` : ''}
    ${thumbs(vinPics)}${thumbs(xPics)}</div>`;
}
function render() {
  if (!scan || !date || screen !== 'scan') return;
  if (typing()) return;
  const st = view();
  let gotN = 0, gotNet = 0, all = 0, skipN = 0;
  let h = `<div class="tools"><button data-act="mode">${VIEWMODE === 'row' ? '☰ By row' : '🚗 By car'}</button><button data-act="trip">Trip</button><button data-act="ready">Ready to list</button></div>
    <div class="small tally" id="tally"></div>`;
  for (const row of scan.rows) {
    h += `<div class="rowband">ROW ${esc(row.row)}</div>`;
    for (const car of row.cars) {
      if (VIEWMODE === 'car') h += `<section class="car">${carHead(car, st)}`;
      const removed = [];
      for (const p of car.parts) {
        all++;
        if (val(st, 'rm:' + p.code)) { removed.push(p); skipN++; continue; }
        if (val(st, 'got:' + p.code)) { gotN++; gotNet += p.net || 0; }
        const carLine = VIEWMODE === 'row' ? `<div class="carline"><b>${esc(car.code6)}</b> ${esc(car.car)}</div>` : '';
        h += VIEWMODE === 'row' ? `<section class="car rowpart">${partCard(p, st, carLine)}</section>` : partCard(p, st);
      }
      for (const p of removed) h += VIEWMODE === 'row' ? `<section class="car rowpart">${removedLine(p, st)}</section>` : removedLine(p, st);
      if (VIEWMODE === 'car') h += `</section>`;
    }
  }
  h += `<button class="big" data-act="export">⬇ Export photos + checks (zip)</button>
    <p class="small">Photos upload to Drive by code when there's signal. Export is a backup of this phone's photos.</p>
    <p class="small">This phone: ${esc(DEVNAME)} · <a href="#" class="chg">settings</a></p>`;
  const y = scrollY; main.innerHTML = h; scrollTo(0, y);
  $('#tally').textContent = `Got ${gotN} of ${all} parts · est net ${money(gotNet)}${skipN ? ` · ${skipN} skipped` : ''}`;
  fillThumbs();
}

// Expected part number (from sold-comp titles) with a one-tap confirm; the actual PN field sits below.
const pnNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function pnBlock(p, st) {
  if (!p.expected_pn) return '';
  const actual = val(st, 'pn:' + p.code) || '';
  const ok = actual && pnNorm(actual) === pnNorm(p.expected_pn);
  const alt = (p.alt_pns || []).filter(Boolean);
  return `<div class="xpn${ok ? ' ok' : ''}"><div class="xpnt"><span class="xpnl">Expected PN</span> <b>${esc(p.expected_pn)}</b>${alt.length ? `<div class="small">also seen: ${alt.map(esc).join(', ')}</div>` : ''}</div>
    <button type="button" class="xpnbtn" data-act="pnok" data-c="${p.code}">${ok ? '✓ Matches' : 'Matches'}</button></div>`;
}

function refPreview(img) {
  const el = document.createElement('div'); el.className = 'refover';
  el.innerHTML = `<img src="${esc(ebaySize(img, 1600))}" referrerpolicy="no-referrer" alt=""><button type="button">Close</button>`;
  el.onclick = ev => { if (ev.target === el || ev.target.tagName === 'BUTTON') el.remove(); };
  document.body.append(el);
}

main.addEventListener('click', async e => {
  if (e.target.closest('.chg')) { e.preventDefault(); return showSettings(); }
  const t = e.target.closest('[data-act]'); const ph = e.target.closest('.t[data-photo]');
  const rb = e.target.closest('[data-refimg]');
  if (rb && !t) { e.preventDefault(); return refPreview(rb.dataset.refimg); }
  if (ph && !t) return photoSheet(ph.dataset.photo, ph.dataset.d || date);
  if (!t) return;
  const c = t.dataset.c;
  switch (t.dataset.act) {
    case 'trip': return showTrip();
    case 'ready': return showReady();
    case 'rcptday': return capture('rcpt', t.dataset.day, t.dataset.day);
    case 'export': return exportZip();
  }
  if (screen !== 'scan') return;
  const st = view();
  switch (t.dataset.act) {
    case 'mode': VIEWMODE = VIEWMODE === 'row' ? 'car' : 'row'; localStorage.setItem('pl_view', VIEWMODE); return render();
    case 'got': return val(st, 'got:' + c) ? op('got:' + c, false) : ops([['got:' + c, true], ['day:' + c, chiDay()]]);
    case 'pnok': {
      const p = scan.rows.flatMap(r => r.cars).flatMap(x => x.parts).find(x => x.code === c);
      if (!p || !p.expected_pn) return;
      const cur = val(st, 'pn:' + c) || '';
      return op('pn:' + c, pnNorm(cur) === pnNorm(p.expected_pn) ? '' : p.expected_pn);
    }
    case 'why': return ops([['rm:' + c, true], ['why:' + c, t.dataset.why]]); // gone / damaged / skip, logged in the op file
    case 'undo': return ops([['rm:' + c, false], ['why:' + c, '']]);
    case 'part': return capture('part', c);
    case 'vin': return capture('vin', c);
    case 'x': return capture('x', c);
  }
});
main.addEventListener('change', e => {
  if (e.target.dataset.pn && screen === 'scan') op('pn:' + e.target.dataset.pn, e.target.value.trim());
  if (e.target.dataset.paid) op('tday:paid', e.target.value.trim().replace(/[^\d.]/g, ''), e.target.dataset.paid);
});

async function photoSheet(name, d = date) {
  const st = VIEWS[d] || (await stateFor(d)), meta = val(st, 'photo:' + name) || {};
  const u = (await thumbURL(name, true, d)) || (await thumbURL(name, false, d));
  const car = scan && d === date ? scan.rows.flatMap(r => r.cars).find(c => c.code6 === meta.code) : null;
  const opts = meta.kind === 'x' && car ? car.parts.map(p => `<button data-assign="${p.code}">Assign to ${esc(p.code)} ${esc(p.part)}</button>`).join('') : '';
  const el = document.createElement('div'); el.className = 'sheet';
  el.innerHTML = `<div class="box">${u ? `<img src="${u}">` : '<p>Taken on another phone. It is in Drive once uploaded.</p>'}
    <p><b>${esc(name)}</b><br><span class="small">by ${esc(meta.by || '')}${meta.day ? ' · ' + esc(meta.day) : ''}${val(st, 'assign:' + name) ? ' · assigned to ' + esc(val(st, 'assign:' + name)) : ''}</span></p>
    ${opts}${u ? `<button data-del="1" style="color:#e05050;border-color:#a33">Delete photo</button>` : ''}<button data-close="1">Close</button></div>`;
  document.body.append(el);
  el.onclick = async ev => {
    const b = ev.target;
    if (b === el || b.dataset.close) return el.remove();
    if (b.dataset.assign) { el.remove(); return op('assign:' + name, b.dataset.assign, d); }
    if (b.dataset.del && confirm('Delete this photo?')) {
      el.remove();
      await tx('photos', 'readwrite', s => s.delete(`${d}/${name}`));
      urlCache.delete(`${d}/${name}`); urlCache.delete(`${d}/${name}#full`);
      return op('del:' + name, true, d);
    }
  };
}

// ---------- trip days + ready to list ----------
// A part belongs to the Chicago-time day it was checked off (op day:<code>), whatever scan it came from, so a
// second visit the next day is its own trip. Each trip day keeps its receipt photos and typed receipt total in the
// op log for that day's date.
let lastScan = null;
const dayLabel = d => new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
async function gatherPulled() {
  const idx = await kvGet('index') || [];
  const allOps = await tx('ops', 'readonly', s => req(s.getAll()));
  const srv = Object.fromEntries((await tx('server', 'readonly', s => req(s.getAll()))).map(r => [r.date, r.state || {}]));
  const stOf = d => (VIEWS[d] = merge(srv[d] || {}, allOps.filter(o => o.date === d)));
  const days = {};
  for (const s of idx) {
    const sc = await kvGet('scan:' + s.date); if (!sc) continue;
    const st = stOf(s.date);
    for (const row of sc.rows) for (const car of row.cars) for (const p of car.parts) {
      if (!val(st, 'got:' + p.code) || val(st, 'rm:' + p.code)) continue;
      const day = val(st, 'day:' + p.code) || chiDay(st['got:' + p.code].ts);
      (days[day] ||= []).push({ d: s.date, row: row.row, car, p, st });
    }
  }
  const today = chiDay();
  const dayList = [...new Set([today, ...Object.keys(days)])].sort().reverse();
  for (const day of dayList) { days[day] ||= []; stOf(day); }
  return { days, dayList };
}
function enterSub(name, title) {
  if (screen === 'scan' && date) lastScan = date;
  screen = name; date = null; scan = null;
  $('#back').hidden = false; $('#back').textContent = lastScan ? '← List' : '← Scans'; $('#title').textContent = title;
}
async function showTrip(redraw) {
  if (!redraw) enterSub('trip', 'Trip days');
  if (screen !== 'trip' || typing()) return;
  const { days, dayList } = await gatherPulled();
  if (!redraw) sync(dayList.slice(0, 7));
  let h = `<div class="tools"><button data-act="ready">Ready to list</button></div>`;
  for (const day of dayList) {
    const items = days[day], dst = VIEWS[day] || {};
    const pap = items.reduce((a, x) => a + (x.p.pap || 0), 0), net = items.reduce((a, x) => a + (x.p.net || 0), 0);
    const paidTxt = val(dst, 'tday:paid') || '', paid = parseFloat(paidTxt);
    const spent = isFinite(paid) && paidTxt !== '' ? paid : pap;
    const rc = photosFor(dst, 'rcpt', day);
    h += `<section class="car tripday"><div class="carhd"><div class="name">${esc(dayLabel(day))}${day === chiDay() ? ' · today' : ''}</div>
      <div class="small">${esc(day)} · ${items.length} part${items.length === 1 ? '' : 's'} pulled</div></div>
      ${items.map(x => `<div class="tline"><span class="pcode">${esc(x.p.code)}</span> <span class="tl">${esc(x.p.part)}<br><span class="small">${esc(x.car.car)} · row ${esc(x.row)}</span></span>
        <span class="tnum">${x.p.pap != null ? money2(x.p.pap) : '?'}<br><b>${money(x.p.net)}</b></span></div>`).join('')}
      <div class="ttot"><span>PAP prices ${money2(pap)}</span><span>Est. net <b>${money(net)}</b></span></div>
      <div class="trip"><label for="paid-${day}">Receipt total ($)</label>
      <input id="paid-${day}" data-paid="${day}" inputmode="decimal" placeholder="${pap ? pap.toFixed(2) : '0.00'}" value="${esc(paidTxt)}">
      <div class="spent">Spent <b>${money2(spent)}</b>${paidTxt === '' ? ' <span class="small">(PAP prices; type the receipt total)</span>' : ''} · Est. net <b>${money(net)}</b></div>
      <button class="big" data-act="rcptday" data-day="${day}">📷 Receipt photo${rc.length ? ` (${rc.length})` : ''}</button>${thumbs(rc, day)}</div></section>`;
  }
  h += `<p class="small">Parts land on the day they were checked off (Chicago time). Receipts are kept with that day only.</p>`;
  const y = scrollY; main.innerHTML = h; if (redraw) scrollTo(0, y); else scrollTo(0, 0);
  fillThumbs();
}

// Ready to list: everything pulled, by trip day, with photos, PN and tag code. Each day's manifest is also written to
// Drive (pulled/<day>.json) when the Apps Script has the writeManifest endpoint; until then the screen still works.
const manifestState = {}; // day -> {json, at, err}
let manifestBlockedUntil = 0;
function buildManifest(day, items) {
  const dst = VIEWS[day] || {};
  return {
    day, built_by: DEVNAME || DEV, paid: val(dst, 'tday:paid') || '',
    receipts: photosFor(dst, 'rcpt', day),
    items: items.map(x => {
      const pn = val(x.st, 'pn:' + x.p.code) || '';
      return {
        code: x.p.code, scan_date: x.d, row: x.row, car: x.car.car, vin: x.car.vin, part: x.p.part, tier: x.p.tier,
        pap: x.p.pap ?? null, est_net: x.p.net ?? null, expected_pn: x.p.expected_pn || '', alt_pns: x.p.alt_pns || [],
        pn, pn_confirmed: !!(pn && x.p.expected_pn && pnNorm(pn) === pnNorm(x.p.expected_pn)),
        photos: partPics(x.st, x.p.code), vin_photos: photosFor(x.st, 'vin', x.car.code6), checked_by: (x.st['got:' + x.p.code] || {}).dev || '',
      };
    }),
  };
}
async function saveManifests(list) {
  if (!navigator.onLine || Date.now() < manifestBlockedUntil) return;
  for (const [day, man] of list) {
    const json = JSON.stringify(man), ms = manifestState[day] || {};
    if (ms.json === json && !ms.err) continue;
    try {
      const r = await api('writeManifest', day, man);
      manifestState[day] = { json, at: Date.now(), id: r && r.id };
    } catch (e) {
      if (e.login) return;
      const old = /unknown fn/.test(e.message);
      manifestState[day] = { json, err: old ? 'deploy' : 'retry' };
      if (old) { manifestBlockedUntil = Date.now() + 600000; break; }
    }
  }
  if (screen === 'ready') showReady(true, true);
}
async function showReady(redraw, noSave) {
  if (!redraw) enterSub('ready', 'Ready to list');
  if (screen !== 'ready' || typing()) return;
  const { days, dayList } = await gatherPulled();
  if (!redraw) sync(dayList.slice(0, 7));
  const withParts = dayList.filter(d => days[d].length);
  let h = `<div class="tools"><button data-act="trip">Trip days</button></div>`;
  if (!withParts.length) h += '<p>Nothing checked off yet. Pulled parts show up here by the day you checked them.</p>';
  const mans = [];
  for (const day of withParts) {
    const items = days[day], man = buildManifest(day, items); mans.push([day, man]);
    const ms = manifestState[day] || {};
    const mtxt = ms.err === 'deploy' ? 'Drive manifest waits for the Apps Script update' : ms.err ? 'Drive manifest: will retry' : ms.at ? 'Drive manifest saved ' + clock(ms.at) : navigator.onLine ? 'Drive manifest: saving…' : 'Drive manifest: offline, saves later';
    h += `<div class="rowband">${esc(dayLabel(day))} · ${items.length}</div><p class="small">${esc(day)} · ${esc(mtxt)}${man.receipts.length ? ` · ${man.receipts.length} receipt photo(s)` : ' · no receipt photo yet'}</p>`;
    for (const x of items) {
      const it = man.items.find(i => i.code === x.p.code);
      const pnLine = it.pn ? `PN <b>${esc(it.pn)}</b>${it.pn_confirmed ? ' ✓ matches expected' : ''}` : it.expected_pn ? `Expected PN <b>${esc(it.expected_pn)}</b> <span class="small">(not confirmed)</span>` : '<span class="small">No PN yet</span>';
      h += `<section class="car ready"><div class="carhd"><div class="code6">${esc(x.p.code)}</div>
        <div class="name">${esc(x.p.part)}</div><div class="small">${esc(x.car.car)} · VIN ${esc(x.car.vin)} · est. net ${money(x.p.net)}</div>
        <div class="rpn">${pnLine}</div>
        ${it.photos.length ? thumbs(it.photos, x.d) : '<div class="small warn">No part photos yet</div>'}${thumbs(it.vin_photos, x.d)}</div></section>`;
    }
    if (man.receipts.length) h += `<div class="small">Receipt</div>${thumbs(man.receipts, day)}`;
  }
  const y = scrollY; main.innerHTML = h; if (redraw) scrollTo(0, y); else scrollTo(0, 0);
  fillThumbs();
  if (!noSave) saveManifests(mans);
}

async function exportZip() {
  const st = view(), files = [];
  const recs = (await tx('photos', 'readonly', s => req(s.getAll()))).filter(r => r.date === date && !val(st, 'del:' + r.name));
  for (const r of recs) {
    const m = val(st, 'photo:' + r.name) || {};
    const folder = m.kind === 'part' ? m.code : m.kind === 'vin' ? `${m.code}_car` : m.kind === 'x' ? (val(st, 'assign:' + r.name) || `${m.code}_extra`) : '_receipt';
    files.push({ name: `${date}/${folder}/${r.name}`, data: r.blob });
  }
  const lines = [['code', 'row', 'car', 'VIN', 'part', 'Q/B', 'est net', 'got', 'removed', 'expected PN', 'actual PN', 'photos'].join(',')];
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  for (const row of scan.rows) for (const car of row.cars) for (const p of car.parts)
    lines.push([p.code, row.row, car.car, car.vin, p.part, p.tier, p.net, val(st, 'got:' + p.code) ? 'Y' : '', val(st, 'rm:' + p.code) ? 'Y' : '',
      p.expected_pn || '', val(st, 'pn:' + p.code) || '', photosFor(st, 'part', p.code).join(' ')].map(q).join(','));
  files.push({ name: `${date}/checks_${date}.csv`, data: lines.join('\n') + '\n' });
  files.push({ name: `${date}/state_${date}.json`, data: JSON.stringify({ date, exported_by: DEVNAME, at: new Date().toISOString(), trip: { date: val(st, 'trip:date'), paid: val(st, 'trip:paid') }, state: st }, null, 1) });
  const blob = await ZipLite.make(files);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pull_${date}_${DEV}.zip`; document.body.append(a); a.click(); a.remove();
}

$('#back').onclick = () => { if ((screen === 'trip' || screen === 'ready') && lastScan) openScan(lastScan); else showHome(); };
async function start() {
  if (!TOKEN) return showLogin(navigator.onLine ? '' : 'Needs signal the first time.');
  await applyResetIfNeeded(0);
  ensureDevice();
  showHome();
  status();
  retryNow(); // resume any photos/changes still queued from last time
  if (navigator.onLine) {
    try { await api('me'); } catch (e) { if (e.login) { TOKEN = ''; localStorage.removeItem('pl_token'); return showLogin(); } }
  }
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
start();
