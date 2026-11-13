// Pull List (GitHub Pages build). Opens offline via service worker. Every action is an op saved to IndexedDB first,
// then POSTed to the Apps Script JSON API when online. Photos queue in IndexedDB and upload to Drive one at a time.
'use strict';
const $ = s => document.querySelector(s);
const main = $('#main');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ebaySize = (u, n) => String(u || '').replace(/s-l\d+/i, 's-l' + n);

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
async function call(fn, ...args) { // JSON API on the Apps Script /exec URL (text/plain = no CORS preflight)
  const r = await fetch(window.PL_CONFIG.EXEC_URL, { method: 'POST', body: JSON.stringify({ fn, args }),
    redirect: 'follow', credentials: 'omit', cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error('Bad reply from server'); }
}
let TOKEN = localStorage.getItem('pl_token') || '';
async function api(fn, ...args) {
  const r = await call(fn, TOKEN, ...args);
  if (r && r.error === 'login') { const e = new Error('login'); e.login = 1; throw e; }
  if (r && r.error) throw new Error(r.error);
  return r;
}

// ---------- device ----------
let DEV = localStorage.getItem('pl_dev') || '';       // initial(s), e.g. B, W, D, K
let DEVNAME = localStorage.getItem('pl_devname') || '';

// ---------- state ----------
let scan = null, date = null, serverState = {}, localOps = [];
function view() { // merged view: server state overlaid with local ops, last writer wins
  const st = { ...serverState };
  for (const o of localOps) {
    const cur = st[o.k];
    if (!cur || o.ts > cur.ts || (o.ts === cur.ts && o.dev >= cur.dev)) st[o.k] = { v: o.v, dev: o.dev, ts: o.ts };
  }
  return st;
}
const val = (st, k) => st[k] ? st[k].v : undefined;
async function op(k, v) {
  const o = { id: DEV + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), k, v, dev: DEV, ts: Date.now(), date, pending: 1 };
  localOps.push(o);
  await tx('ops', 'readwrite', s => s.put(o));
  render(); sync();
}

// ---------- sync ----------
let syncing = false;
function setPill(cls, txt) { const p = $('#net'); p.className = 'pill ' + cls; p.textContent = txt; }
async function sync() {
  if (!date || syncing) return;
  const pend = localOps.filter(o => o.pending);
  if (!navigator.onLine) { setPill('off', pend.length ? `Offline · ${pend.length} saved` : 'Offline'); return; }
  syncing = true;
  try {
    const j = await api('sync', date, pend.map(({ id, k, v, dev, ts }) => ({ id, k, v, dev, ts })));
    serverState = j.state;
    await tx('server', 'readwrite', s => s.put({ date, state: serverState }));
    await tx('ops', 'readwrite', s => { for (const o of pend) { o.pending = 0; s.put(o); } });
    render();
  } catch (e) {
    if (e.login) { TOKEN = ''; localStorage.removeItem('pl_token'); syncing = false; return showLogin(); }
  } finally { syncing = false; }
  upload();
}
// ---------- photo upload queue (one at a time, oldest first) ----------
let uploading = false;
async function upload() {
  if (uploading || !navigator.onLine) return status();
  uploading = true;
  try {
    for (;;) {
      const all = await tx('photos', 'readonly', s => req(s.getAll()));
      const next = all.filter(r => !r.uploaded).sort((a, b) => (a.t || 0) - (b.t || 0))[0];
      if (!next || !navigator.onLine) break;
      status(all.filter(r => !r.uploaded).length);
      const b64 = await blobToB64(next.blob);
      await api('uploadPhoto', next.date, next.name, b64);
      next.uploaded = 1;
      await tx('photos', 'readwrite', s => s.put(next));
    }
  } catch (e) { if (e.login) { uploading = false; return showLogin(); } }
  finally { uploading = false; }
  status();
}
async function status(n) {
  if (n == null) n = (await tx('photos', 'readonly', s => req(s.getAll()))).filter(r => !r.uploaded).length;
  const p = localOps.filter(o => o.pending).length;
  if (!navigator.onLine) return setPill('off', p + n ? `Offline · ${p + n} saved` : 'Offline');
  if (n) return setPill('wait', `Uploading ${n} 📷`);
  if (p) return setPill('wait', `${p} waiting`);
  setPill('ok', 'Synced');
}
function blobToB64(blob) {
  return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
}
window.addEventListener('online', sync);
window.addEventListener('offline', sync);
setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 15000);

// ---------- photos ----------
function nextName(st, prefix) { // per-device numbering so two phones never collide
  const re = new RegExp('^photo:' + prefix.replace(/[-]/g, '\\-') + DEV + '(\\d+)\\.jpg$');
  let max = 0;
  for (const k of Object.keys(st)) { const m = re.exec(k); if (m) max = Math.max(max, +m[1]); }
  return `${prefix}${DEV}${max + 1}.jpg`;
}
async function toJpeg(file) { // shrink to keep full camera quality (up to 4000px)
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, 4000 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.type === 'image/jpeg' && file.size < 8e6) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.93));
  } catch { return file; }
}
function takePhoto() {
  return new Promise(ok => {
    const cam = $('#cam'); cam.value = '';
    cam.onchange = () => ok(cam.files[0] || null);
    cam.click();
  });
}
async function capture(kind, code) {
  // kind: part -> <code>_<DEV><n>.jpg ; vin -> <car6>_VIN_<DEV><n>.jpg ; x -> <car6>_X_<DEV><n>.jpg ; rcpt -> RECEIPT_<DEV><n>.jpg
  const f = await takePhoto(); if (!f) return;
  const blob = await toJpeg(f);
  const st = view();
  const prefix = kind === 'part' ? `${code}_` : kind === 'vin' ? `${code}_VIN_` : kind === 'x' ? `${code}_X_` : 'RECEIPT_';
  const name = nextName(st, prefix);
  await tx('photos', 'readwrite', s => s.put({ key: `${date}/${name}`, date, name, blob, uploaded: 0, t: Date.now() }));
  await op('photo:' + name, { kind, code, by: DEVNAME || DEV, size: blob.size });
  if (kind === 'vin') await op('vin:' + code, { file: name, verify: 'pending' });
  upload();
}
const urlCache = new Map();
async function thumbURL(name) {
  const key = `${date}/${name}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await tx('photos', 'readonly', s => req(s.get(key)));
  const u = rec ? URL.createObjectURL(rec.blob) : null; urlCache.set(key, u); return u;
}
function photosFor(st, kind, code) {
  return Object.keys(st).filter(k => k.startsWith('photo:') && st[k].v && st[k].v.kind === kind && st[k].v.code === code && !val(st, 'del:' + k.slice(6)))
    .map(k => k.slice(6)).sort();
}
function thumbs(names) {
  if (!names.length) return '';
  return `<div class="thumbs">${names.map(n => `<div class="t" data-photo="${esc(n)}"><span>${esc(n.replace(/^.*?_((VIN_|X_)?[A-Z]+\d+)\.jpg$/, '$1'))}</span></div>`).join('')}</div>`;
}
async function fillThumbs() {
  for (const el of main.querySelectorAll('.t[data-photo]')) {
    const u = await thumbURL(el.dataset.photo);
    if (u && !el.querySelector('img')) { const i = new Image(); i.src = u; el.prepend(i); }
    else if (!u && !el.dataset.tried && view()['up:' + el.dataset.photo] && navigator.onLine) {
      el.dataset.tried = 1;
      api('getThumb', date, el.dataset.photo).then(r => { if (r.url) { urlCache.set(`${date}/${el.dataset.photo}`, r.url); const i = new Image(); i.src = r.url; el.prepend(i); } }).catch(() => {});
    }
  }
}

// ---------- screens ----------
function showLogin(msg = '') {
  $('#back').hidden = true; $('#title').textContent = 'Pull List';
  main.innerHTML = `<div class="login"><h2>Enter passcode</h2>
    <p class="small">Only needed once on this phone or computer.</p>
    <input id="pc" inputmode="numeric" autocomplete="one-time-code" maxlength="12">
    <p class="msg" id="lmsg">${esc(msg)}</p><button class="big" id="go">Unlock</button></div>`;
  $('#go').onclick = async () => {
    $('#lmsg').textContent = 'Checking…';
    try {
      const r = await call('login', $('#pc').value);
      if (r.ok) { TOKEN = r.token; localStorage.setItem('pl_token', TOKEN); start(); }
      else $('#lmsg').textContent = r.error || 'Wrong passcode';
    } catch (e) { $('#lmsg').textContent = 'No signal. Try again.'; }
  };
}
function showWho() {
  main.innerHTML = `<div class="login"><h2>Who's using this phone?</h2>
    <p class="small">Your initial goes in photo names so two phones never clash. Use a different one for each person.</p>
    <input id="nm" placeholder="Name (Brian)" style="letter-spacing:0;font-size:22px;margin-bottom:8px">
    <input id="ini" placeholder="Initial (B)" maxlength="3" style="text-transform:uppercase">
    <button class="big" id="ok">Save</button></div>`;
  $('#ok').onclick = () => {
    const ini = $('#ini').value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!ini) return;
    DEV = ini; DEVNAME = $('#nm').value.trim() || ini;
    localStorage.setItem('pl_dev', DEV); localStorage.setItem('pl_devname', DEVNAME); if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
start();
  };
}
async function showHome() {
  date = null; scan = null;
  $('#back').hidden = true; $('#title').textContent = 'Pull List · Scans';
  setPill(navigator.onLine ? 'ok' : 'off', DEVNAME ? DEVNAME : '');
  let idx;
  try { idx = (await api('listScans')).scans; await kvSet('index', idx); }
  catch (e) { if (e.login) return showLogin(); idx = await kvGet('index') || []; }
  main.innerHTML = `<p class="small">Newest first. Tap a scan to open it.</p>` + (idx.length ? idx.map(s =>
    `<button class="scanitem" data-d="${esc(s.date)}"><b>${esc(s.date)}</b>${esc(s.label)}<br><span class="small">${s.cars} cars · ${s.parts} parts</span></button>`).join('')
    : '<p>No scans yet.</p>');
  main.querySelectorAll('.scanitem').forEach(b => b.onclick = () => openScan(b.dataset.d));
}
async function openScan(d) {
  date = d;
  $('#back').hidden = false; $('#title').textContent = d;
  try { scan = (await api('getScan', d)).scan; await kvSet('scan:' + d, scan); }
  catch (e) { if (e.login) return showLogin(); scan = await kvGet('scan:' + d); }
  if (!scan) { main.innerHTML = '<p>This scan is not saved on this phone yet. Open it once with signal.</p>'; return; }
  serverState = ((await tx('server', 'readonly', s => req(s.get(d)))) || {}).state || {};
  localOps = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.date === d);
  render(); sync();
}

function money(n) { return n == null ? '?' : '$' + n; }
let renderLater = false;
main.addEventListener('focusout', () => setTimeout(() => { if (renderLater && !main.contains(document.activeElement)) { renderLater = false; render(); } }, 50));
function render() {
  if (!scan || !date) return;
  const ae = document.activeElement; // don't redraw under someone typing a part number
  if (ae && ae.tagName === 'INPUT' && main.contains(ae)) { renderLater = true; return; }
  const st = view();
  let gotN = 0, gotNet = 0, all = 0;
  let h = '';
  // trip line
  const rc = photosFor(st, 'rcpt', 'trip');
  h += `<div class="trip"><div class="trow"><div><label>Trip date</label><input id="tdate" type="date" value="${esc(val(st, 'trip:date') || new Date().toISOString().slice(0, 10))}"></div>
    <div><label>Paid ($)</label><input id="tpaid" inputmode="decimal" placeholder="0.00" value="${esc(val(st, 'trip:paid') || '')}"></div></div>
    <button class="big" data-act="rcpt">📷 Receipt photo${rc.length ? ` (${rc.length})` : ''}</button>${thumbs(rc)}
    <div class="small" id="tally"></div></div>`;
  for (const row of scan.rows) {
    h += `<div class="rowband">ROW ${esc(row.row)}</div>`;
    for (const car of row.cars) {
      const vinPics = photosFor(st, 'vin', car.code6), xPics = photosFor(st, 'x', car.code6);
      const vin = val(st, 'vin:' + car.code6);
      h += `<section class="car"><div class="carhd">
        ${car.photo ? `<button type="button" class="carphoto" data-refimg="${esc(car.photo)}" aria-label="Yard photo of ${esc(car.car)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(car.photo)}" alt=""></button>` : ''}
        <div class="carbtns"><button data-act="vin" data-c="${car.code6}" class="${vinPics.length ? 'done' : ''}">📷 VIN photo${vinPics.length ? ' ✓' : ''}</button>
        <button data-act="x" data-c="${car.code6}">📷 Extra photo${xPics.length ? ` (${xPics.length})` : ''}</button></div>
        <div class="code6">${esc(car.code6)}</div>
        <div class="name">${esc(car.car)}${car.engine ? ` · ${esc(car.engine.replace(/^[\d.]+L\s*/, ''))}` : ''}</div>
        <div class="vin">VIN ${esc(car.vin)}</div>
        ${vin ? `<div class="vinflag">VIN photo taken · check ${vin.verify === 'ok' ? 'passed' : vin.verify === 'mismatch' ? 'MISMATCH' : 'pending'}</div>` : ''}
        ${thumbs(vinPics)}${thumbs(xPics)}</div>`;
      const removed = [];
      for (const p of car.parts) {
        all++;
        if (val(st, 'rm:' + p.code)) { removed.push(p); continue; }
        const got = !!val(st, 'got:' + p.code);
        if (got) { gotN++; gotNet += p.net || 0; }
        const pics = photosFor(st, 'part', p.code).concat(
          Object.keys(st).filter(k => k.startsWith('assign:') && st[k].v === p.code).map(k => k.slice(7)));
        const thumb = p.ref && p.ref.img
          ? `<button type="button" class="pref" data-refimg="${esc(p.ref.img)}" aria-label="Reference photo of ${esc(p.part)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(ebaySize(p.ref.img, 225))}" alt="" width="56" height="56"></button>`
          : '';
        const elink = p.ref && p.ref.link
          ? `<a class="elink" href="${esc(p.ref.link)}" target="_blank" rel="noopener noreferrer">eBay</a>`
          : '';
        h += `<div class="part ${got ? 'got' : ''}"><div class="pline">
          <button class="chk" data-act="got" data-c="${p.code}" aria-label="Got it">${got ? '✓' : ''}</button>
          ${thumb}
          <div class="pinfo"><span class="pcode">${esc(p.code)}</span><span class="tier ${p.tier}">${p.tier}</span>${elink}
          <div class="pname">${esc(p.part)}</div>${p.note ? `<div class="pnote">${esc(p.note)}</div>` : ''}
          ${p.pap != null ? `<div class="small">PAP price $${p.pap.toFixed(2)}</div>` : ''}</div>
          <div class="pnet"><span class="pnetlbl">Est. net</span>${money(p.net)}</div></div>
          <div class="pbtns"><button class="cambtn" data-act="part" data-c="${p.code}">📷${pics.length ? ' ' + pics.length : ''}</button>
          <input data-pn="${p.code}" placeholder="Actual part #" value="${esc(val(st, 'pn:' + p.code) || '')}">
          <button class="rmbtn" data-act="rm" data-c="${p.code}">Remove</button></div>${thumbs(pics)}</div>`;
      }
      for (const p of removed) {
        const by = st['rm:' + p.code];
        h += `<div class="removed">✕ ${esc(p.code)} ${esc(p.part)} <span class="small">skipped${by ? ' by ' + esc(by.dev) : ''}</span><button data-act="undo" data-c="${p.code}">Undo</button></div>`;
      }
      h += `</section>`;
    }
  }
  h += `<button class="big" data-act="export">⬇ Export photos + checks (zip)</button>
    <p class="small">Photos upload to Drive by code when there's signal. Export is a backup of this phone's photos.</p>
    <p class="small">This phone: ${esc(DEVNAME)} (${esc(DEV)}) · <a href="#" id="chg">change</a></p>`;
  const y = scrollY; main.innerHTML = h; scrollTo(0, y);
  $('#tally').textContent = `Got ${gotN} of ${all} parts · est net ${money(gotNet)}`;
  fillThumbs();
  $('#chg').onclick = e => { e.preventDefault(); showWho(); };
}

function refPreview(img) {
  const el = document.createElement('div'); el.className = 'refover';
  el.innerHTML = `<img src="${esc(ebaySize(img, 1600))}" referrerpolicy="no-referrer" alt=""><button type="button">Close</button>`;
  el.onclick = ev => { if (ev.target === el || ev.target.tagName === 'BUTTON') el.remove(); };
  document.body.append(el);
}

main.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); const ph = e.target.closest('.t[data-photo]');
  const rb = e.target.closest('[data-refimg]');
  if (rb && !t) { e.preventDefault(); return refPreview(rb.dataset.refimg); }
  if (ph && !t) return photoSheet(ph.dataset.photo);
  if (!t) return;
  const c = t.dataset.c, st = view();
  switch (t.dataset.act) {
    case 'got': return op('got:' + c, !val(st, 'got:' + c));
    case 'rm': return op('rm:' + c, true);
    case 'undo': return op('rm:' + c, false);
    case 'part': return capture('part', c);
    case 'vin': return capture('vin', c);
    case 'x': return capture('x', c);
    case 'rcpt': return capture('rcpt', 'trip');
    case 'export': return exportZip();
  }
});
main.addEventListener('change', e => {
  if (e.target.dataset.pn) op('pn:' + e.target.dataset.pn, e.target.value.trim());
  if (e.target.id === 'tpaid') op('trip:paid', e.target.value.trim());
  if (e.target.id === 'tdate') op('trip:date', e.target.value);
});

async function photoSheet(name) {
  const st = view(), meta = val(st, 'photo:' + name) || {}, u = await thumbURL(name);
  const car = scan.rows.flatMap(r => r.cars).find(c => c.code6 === meta.code);
  const opts = meta.kind === 'x' && car ? car.parts.map(p => `<button data-assign="${p.code}">Assign to ${esc(p.code)} ${esc(p.part)}</button>`).join('') : '';
  const el = document.createElement('div'); el.className = 'sheet';
  el.innerHTML = `<div class="box">${u ? `<img src="${u}">` : '<p>Taken on another phone. It is in Drive once uploaded.</p>'}
    <p><b>${esc(name)}</b><br><span class="small">by ${esc(meta.by || '')}${val(st, 'assign:' + name) ? ' · assigned to ' + esc(val(st, 'assign:' + name)) : ''}</span></p>
    ${opts}${u ? `<button data-del="1" style="color:#e05050;border-color:#a33">Delete photo</button>` : ''}<button data-close="1">Close</button></div>`;
  document.body.append(el);
  el.onclick = async ev => {
    const b = ev.target;
    if (b === el || b.dataset.close) return el.remove();
    if (b.dataset.assign) { el.remove(); return op('assign:' + name, b.dataset.assign); }
    if (b.dataset.del && confirm('Delete this photo?')) { el.remove(); await tx('photos', 'readwrite', s => s.delete(`${date}/${name}`)); urlCache.delete(`${date}/${name}`); return op('del:' + name, true); }
  };
}

async function exportZip() {
  const st = view(), files = [];
  const recs = (await tx('photos', 'readonly', s => req(s.getAll()))).filter(r => r.date === date && !val(st, 'del:' + r.name));
  for (const r of recs) {
    const m = val(st, 'photo:' + r.name) || {};
    const folder = m.kind === 'part' ? m.code : m.kind === 'vin' ? `${m.code}_car` : m.kind === 'x' ? (val(st, 'assign:' + r.name) || `${m.code}_extra`) : '_receipt';
    files.push({ name: `${date}/${folder}/${r.name}`, data: r.blob });
  }
  const lines = [['code', 'row', 'car', 'VIN', 'part', 'Q/B', 'est net', 'got', 'removed', 'actual PN', 'photos'].join(',')];
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  for (const row of scan.rows) for (const car of row.cars) for (const p of car.parts)
    lines.push([p.code, row.row, car.car, car.vin, p.part, p.tier, p.net, val(st, 'got:' + p.code) ? 'Y' : '', val(st, 'rm:' + p.code) ? 'Y' : '',
      val(st, 'pn:' + p.code) || '', photosFor(st, 'part', p.code).join(' ')].map(q).join(','));
  files.push({ name: `${date}/checks_${date}.csv`, data: lines.join('\n') + '\n' });
  files.push({ name: `${date}/state_${date}.json`, data: JSON.stringify({ date, exported_by: DEVNAME, at: new Date().toISOString(), trip: { date: val(st, 'trip:date'), paid: val(st, 'trip:paid') }, state: st }, null, 1) });
  const blob = await ZipLite.make(files);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pull_${date}_${DEV}.zip`; document.body.append(a); a.click(); a.remove();
}

$('#back').onclick = () => showHome();
async function start() {
  if (!TOKEN) return showLogin(navigator.onLine ? '' : 'Needs signal the first time.');
  if (navigator.onLine) {
    try { await api('me'); } catch (e) { if (e.login) { TOKEN = ''; localStorage.removeItem('pl_token'); return showLogin(); } }
  }
  if (!DEV) return showWho();
  showHome(); upload();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
start();
