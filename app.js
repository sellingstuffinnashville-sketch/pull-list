// Pull List (GitHub Pages build). Opens offline via service worker. Every action is an op saved to IndexedDB first,
// then POSTed to the Apps Script JSON API when there is signal. Photos queue in IndexedDB and upload to Drive one at
// a time, retrying with backoff on weak signal; the queue survives closing the app.
'use strict';
const RPG = window.PL_RPG !== false;
try { document.documentElement.classList.toggle('rpg', !!RPG); } catch (e) {}
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

// ---------- sounds (original Web Audio synth; no samples, no copyrighted audio) ----------
const SFX_KEY = 'pl_sfx';
let SFX = localStorage.getItem(SFX_KEY) !== '0'; // on by default
let actx, master, noiseBufCache;

function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!actx) {
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.4; // keep the whole set quiet
    master.connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
  if (typeof startBgm === 'function') startBgm();
}
if (RPG) {
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(ev =>
    document.addEventListener(ev, unlockAudio, { capture: true }));
}

function sfxReady() { return SFX && actx && master; }

function noiseBuf() {
  if (noiseBufCache) return noiseBufCache;
  const n = Math.ceil(0.35 * actx.sampleRate);
  const b = actx.createBuffer(1, n, actx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBufCache = b;
  return b;
}
function tone(type, freq, t, dur, vol, freqEnd) {
  const o = actx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function burst(t, dur, vol, startHz, endHz) {
  const src = actx.createBufferSource();
  src.buffer = noiseBuf();
  const f = actx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(startHz, t);
  f.frequency.exponentialRampToValueAtTime(endHz, t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur);
}

function playThud(reverse) {
  if (!sfxReady()) return;
  const t = actx.currentTime;
  const vol = reverse ? 0.22 : 0.32;
  tone('sine', reverse ? 96 : 68, t, reverse ? 0.2 : 0.28, vol, reverse ? 150 : 36);
  tone('square', reverse ? 210 : 170, t, 0.08, vol * 0.08, 55);
  burst(t, reverse ? 0.14 : 0.2, vol * 0.45, reverse ? 900 : 520, 110);
}
function playClink() {
  if (!sfxReady()) return;
  const t = actx.currentTime;
  [[1760, 0, 0.11, 0.16], [2340, 0.028, 0.09, 0.12], [1310, 0.05, 0.08, 0.1]].forEach(([freq, delay, dur, vol]) => {
    tone('sine', freq, t + delay, dur, vol, freq * 0.9);
  });
}
function playGong() {
  if (!sfxReady()) return;
  const t = actx.currentTime;
  [[82, 0.28, 1.1], [110, 0.2, 1.0], [164, 0.1, 0.85], [220, 0.06, 0.7], [277, 0.035, 0.55]].forEach(([freq, vol, dur]) => {
    tone('sine', freq, t, dur, vol, freq * 0.97);
  });
}
function playQuest() {
  if (!sfxReady()) return;
  const t = actx.currentTime;
  // deep grim "quest complete" chord (original, not a copied motif)
  [[73.42, 0, 0.28, 0.9], [110, 0.03, 0.18, 0.85], [146.83, 0.06, 0.16, 0.8], [174.61, 0.14, 0.12, 0.75], [220, 0.22, 0.1, 0.7]].forEach(([freq, delay, vol, dur]) => {
    tone('triangle', freq, t + delay, dur, vol, freq * 0.99);
  });
}
function playLevelUp() {
  if (!sfxReady()) return;
  const t = actx.currentTime;
  // original rising fanfare (not a copied motif)
  [[146.83, 0, 0.2, 0.35], [174.61, 0.08, 0.2, 0.38], [220, 0.16, 0.22, 0.45],
   [293.66, 0.28, 0.26, 0.7], [440, 0.42, 0.16, 0.65], [587.33, 0.52, 0.14, 0.85]].forEach(([freq, delay, vol, dur]) => {
    tone('triangle', freq, t + delay, dur, vol, freq * 1.03);
    tone('sine', freq * 2, t + delay, dur * 0.65, vol * 0.22, freq * 2.03);
  });
}
const BGM_KEY = 'pl_bgm';
let BGM = localStorage.getItem(BGM_KEY) !== '0'; // on by default
let bgmGain, bgmTimer, bgmNodes = [], bgmNext = 0, bgmBar = 0, bgmBus, bgmFilter, bgmComp, bgmGen = 0;

function syncBgmBtn() {
  const b = $('#bgm');
  if (!b) return;
  b.textContent = BGM ? '♪' : '♪';
  b.setAttribute('aria-label', BGM ? 'Music on' : 'Music off');
  b.classList.toggle('off', !BGM);
}
function stopBgm() {
  bgmGen++;
  if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
  (bgmNodes || []).forEach(n => {
    try {
      if (n.gain) {
        n.gain.cancelScheduledValues(0);
        n.gain.value = 0;
      }
    } catch (e) {}
    try { if (n.frequency && n.frequency.cancelScheduledValues) n.frequency.cancelScheduledValues(0); } catch (e) {}
    try { if (n.stop) n.stop(); } catch (e) {}
    try { n.disconnect(); } catch (e) {}
  });
  bgmNodes = [];
  [bgmGain, bgmBus, bgmFilter, bgmComp].forEach(n => { try { if (n) n.disconnect(); } catch (e) {} });
  bgmGain = bgmBus = bgmFilter = bgmComp = null;
  if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }
}
// RPG music is a track list (song 1, ballad, pirate, then repeat). Add an entry to
// window.PLBgmTracks to drop in another song — lyrics, bpm, choruses and dance style go with it.
// Tracks are lazy-loaded and cached by the service worker on first play (and prefetched for the next).
// Plain restart at the end of each file — no crossfade, so vocals stay intact.
// The procedural tavern loop below is only a fallback if a file can't load.
const BGM_FILE_GAIN = 0.4;
window.PLBgmTracks = [
  {
    id: 'junkyard-hero',
    file: 'music.mp3',
    lyrics: 'lyrics.json',
    title: 'Junkyard Hero',
    bpm: 108,
    beatOff: 0.09,
    gain: BGM_FILE_GAIN,
    dance: 'full',
    choruses: [[49.96, 65.60], [102.12, 119.46], [119.98, 152.70], [153.30, 172.46]]
  },
  {
    id: 'waiting-for-the-hero',
    file: 'music2.mp3',
    lyrics: 'lyrics2.json',
    title: 'Waiting for the Hero',
    bpm: 74,
    beatOff: 0.04,
    gain: BGM_FILE_GAIN,
    dance: 'gentle',
    choruses: [[49.74, 77.08], [119.40, 141.44], [175.98, 201.60]]
  },
  {
    id: 'bay-trader',
    file: 'music3.mp3',
    lyrics: 'lyrics3.json',
    title: "The Bay Trader's Bargain",
    bpm: 116,
    beatOff: 0.03,
    gain: BGM_FILE_GAIN,
    dance: 'full',
    choruses: [[21.64, 32.04], [48.72, 59.40], [78.86, 98.40], [105.28, 116.96]]
  }
];
let bgmTrack = 0, bgmEl = null, bgmElP = null, bgmFileFailed = false, bgmPlayToken = 0;
function bgmTrackInfo() {
  const list = window.PLBgmTracks || [];
  if (!list.length) return { file: 'music.mp3', lyrics: 'lyrics.json', bpm: 108, beatOff: 0.09, gain: BGM_FILE_GAIN, dance: 'full', choruses: [] };
  if (bgmTrack < 0 || bgmTrack >= list.length) bgmTrack = ((bgmTrack % list.length) + list.length) % list.length;
  return list[bgmTrack];
}
function prefetchBgm(i) {
  const list = window.PLBgmTracks || [];
  if (!list.length) return;
  const t = list[((i % list.length) + list.length) % list.length];
  if (!t) return;
  try { fetch(t.file).catch(() => {}); } catch (e) {}
  try { if (t.lyrics) fetch(t.lyrics).catch(() => {}); } catch (e) {}
}
function armBgmEnded(el) {
  if (el._endedArmed) return;
  el._endedArmed = true;
  el.addEventListener('ended', () => {
    if (!BGM || !window.PL_RPG) return;
    const list = window.PLBgmTracks || [];
    if (list.length > 1) {
      bgmTrack = (bgmTrack + 1) % list.length;
      bgmElP = null;
      if (bgmEl) bgmEl._ready = false;
      announceTrack();
      startBgm(true);
      prefetchBgm(bgmTrack + 1);
    }
  });
}
function loadBgmFile(force) {
  if (!window.PL_RPG) return Promise.reject(new Error('no rpg'));
  const tr = bgmTrackInfo();
  if (!force && bgmEl && bgmEl._ready && bgmEl._file === tr.file) return Promise.resolve(bgmEl);
  const token = ++bgmPlayToken;
  const el = bgmEl || new Audio();
  bgmEl = el;
  el.loop = false;
  el.preload = 'auto';
  el.volume = (tr.gain != null) ? tr.gain : BGM_FILE_GAIN;
  armBgmEnded(el);
  bgmElP = new Promise((res, rej) => {
    const ok = () => { if (token !== bgmPlayToken) return; el._ready = true; el._file = tr.file; res(el); };
    el.addEventListener('canplaythrough', ok, { once: true });
    el.addEventListener('error', () => { if (token !== bgmPlayToken) return; bgmFileFailed = true; bgmElP = null; rej(new Error('music')); }, { once: true });
    try { el.pause(); } catch (e) {}
    el.src = tr.file;
    el.load();
  });
  return bgmElP;
}
function bgmPlaying() {
  return !!(window.PL_RPG && BGM && bgmEl && !bgmEl.paused && !bgmEl.ended);
}
function bgmTime() {
  return bgmPlaying() ? (bgmEl.currentTime || 0) : -1;
}
function announceTrack() {
  const tr = bgmTrackInfo();
  const title = (tr && (tr.title || tr.id)) || '';
  showBgmTitle(title);
  try {
    window.dispatchEvent(new CustomEvent('pl-bgm-track', { detail: { title, index: bgmTrack, id: tr && tr.id, file: tr && tr.file } }));
  } catch (e) {}
}
let bgmToastTimer = 0;
function showBgmTitle(title) {
  if (!window.PL_RPG || !title) return;
  let el = document.getElementById('bgmtoast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bgmtoast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = title;
  el.classList.add('on');
  if (bgmToastTimer) clearTimeout(bgmToastTimer);
  bgmToastTimer = setTimeout(() => { el.classList.remove('on'); }, 2600);
}
function skipBgm(dir) {
  if (!window.PL_RPG) return;
  const list = window.PLBgmTracks || [];
  if (list.length < 2) return;
  const n = list.length;
  bgmTrack = (bgmTrack + (dir < 0 ? -1 : 1) + n) % n;
  bgmElP = null;
  bgmFileFailed = false;
  if (bgmEl) {
    bgmEl._ready = false;
    try { bgmEl.pause(); } catch (e) {}
  }
  announceTrack();
  if (BGM) startBgm(true);
  prefetchBgm(bgmTrack);
  prefetchBgm(bgmTrack + 1);
}
function mountBgmSkip() {
  if (!window.PL_RPG) return;
  const b = document.getElementById('bgm');
  if (!b || (b.parentElement && b.parentElement.classList.contains('bgmcluster'))) return;
  const wrap = document.createElement('div');
  wrap.className = 'bgmcluster';
  const mk = (cls, label, glyph, dir) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sfxbtn bgmskip ' + cls;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.textContent = glyph;
    btn.addEventListener('click', ev => { ev.stopPropagation(); skipBgm(dir); });
    return btn;
  };
  b.parentNode.insertBefore(wrap, b);
  wrap.append(mk('prev', 'Previous song', '‹', -1), b, mk('next', 'Next song', '›', 1));
}
window.PLBgm = { playing: bgmPlaying, time: bgmTime, track: bgmTrackInfo, index() { return bgmTrack; }, tracks() { return window.PLBgmTracks; }, skip: skipBgm };
function startBgm(force) {
  if (!window.PL_RPG) return;
  if (!BGM || !SFX || document.hidden) return;
  if (!force && bgmEl && !bgmEl.paused) return;
  if (bgmGain) return;
  if (bgmFileFailed) {
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    return startProcBgm();
  }
  const gen = ++bgmGen;
  loadBgmFile(!!force).then(el => {
    if (gen !== bgmGen || !BGM || document.hidden) return;
    if (force) { try { el.currentTime = 0; } catch (e) {} }
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    prefetchBgm(bgmTrack + 1);
  }).catch(() => {
    if (gen !== bgmGen) return;
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    startProcBgm();
  });
}
function startProcBgm() {
  if (!BGM || !SFX || document.hidden || !actx || bgmGain) return;
  const gen = ++bgmGen;
  bgmGain = actx.createGain();
  bgmGain.gain.value = 0.06;
  bgmFilter = actx.createBiquadFilter();
  bgmFilter.type = 'lowpass';
  bgmFilter.frequency.value = 5000;
  bgmFilter.Q.value = 0.7;
  bgmComp = actx.createDynamicsCompressor();
  bgmComp.threshold.value = -18;
  bgmComp.knee.value = 4;
  bgmComp.ratio.value = 20;
  bgmComp.attack.value = 0.003;
  bgmComp.release.value = 0.12;
  bgmBus = actx.createGain();
  bgmBus.gain.value = 1;
  bgmBus.connect(bgmFilter);
  bgmFilter.connect(bgmComp);
  bgmComp.connect(bgmGain);
  bgmGain.connect(actx.destination);
  bgmNodes.push(bgmBus, bgmFilter, bgmComp, bgmGain);
  // Drone in D Dorian (D, A, F)
  [[73.42, 0.35], [110, 0.22], [87.31, 0.12]].forEach(([freq, vol]) => {
    const o = actx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = actx.createGain();
    g.gain.value = vol;
    o.connect(g).connect(bgmBus);
    o.start();
    bgmNodes.push(o, g);
  });
  // Soft crowd murmur: looping filtered noise
  const nlen = Math.ceil(2 * actx.sampleRate);
  const nb = actx.createBuffer(1, nlen, actx.sampleRate);
  const nd = nb.getChannelData(0);
  let v = 0;
  for (let i = 0; i < nlen; i++) { v = v * 0.98 + (Math.random() * 2 - 1) * 0.02; nd[i] = v; }
  const crowd = actx.createBufferSource();
  crowd.buffer = nb;
  crowd.loop = true;
  const cf = actx.createBiquadFilter();
  cf.type = 'lowpass';
  cf.frequency.value = 700;
  const cg = actx.createGain();
  cg.gain.value = 0.22;
  crowd.connect(cf).connect(cg).connect(bgmBus);
  crowd.start();
  bgmNodes.push(crowd, cf, cg);
  bgmNext = actx.currentTime + 0.05;
  bgmBar = 0;
  if (gen !== bgmGen) return;
  schedBgm();
}
function pluckAt(freq, t, dur, vol) {
  if (!bgmBus) return;
  [1, 2, 3.02, 4.05].forEach((h, i) => {
    const o = actx.createOscillator();
    o.type = i ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(freq * h, t);
    const g = actx.createGain();
    const v = vol * (i ? 0.22 / i : 1);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (i ? 0.45 : 1));
    o.connect(g).connect(bgmBus);
    o.start(t);
    o.stop(t + dur + 0.05);
    bgmNodes.push(o, g);
  });
}
function drumAt(t, lo) {
  if (!bgmBus) return;
  const src = actx.createBufferSource();
  src.buffer = noiseBuf();
  const f = actx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(lo ? 180 : 700, t);
  const g = actx.createGain();
  g.gain.setValueAtTime(lo ? 0.28 : 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (lo ? 0.12 : 0.05));
  src.connect(f).connect(g).connect(bgmBus);
  src.start(t);
  src.stop(t + 0.15);
  bgmNodes.push(src, f, g);
}
// Original 8-bar D Dorian lute phrase (not a known tune). Values are [eighths from loop start, Hz, eighths long].
const BGM_TUNE = [
  [0, 293.66, 2], [2, 349.23, 2], [4, 392.00, 2], [6, 440.00, 2],
  [8, 392.00, 2], [10, 349.23, 2], [12, 329.63, 2], [14, 293.66, 2],
  [16, 349.23, 2], [18, 440.00, 2], [20, 523.25, 2], [22, 440.00, 2],
  [24, 392.00, 2], [26, 349.23, 2], [28, 293.66, 4],
  [32, 220.00, 2], [34, 293.66, 2], [36, 349.23, 2], [38, 329.63, 2],
  [40, 349.23, 2], [42, 392.00, 2], [44, 440.00, 2], [46, 392.00, 2],
  [48, 349.23, 2], [50, 329.63, 2], [52, 293.66, 2], [54, 261.63, 2],
  [56, 293.66, 4], [60, 220.00, 2], [62, 293.66, 2]
];
const BGM_BEAT = 60 / 86; // ~86 BPM, eighth = BGM_BEAT/2
const BGM_EIGHTH = BGM_BEAT / 2;
function schedBgm() {
  if (!BGM || !bgmGain || !bgmBus || !actx || document.hidden) return;
  const gen = bgmGen;
  const horizon = actx.currentTime + 1.25;
  while (bgmNext < horizon) {
    const t = bgmNext;
    const i = bgmBar % 64;
    BGM_TUNE.forEach(([step, freq, len]) => {
      if (step === i) pluckAt(freq, t, len * BGM_EIGHTH * 0.95, 0.22);
    });
    if (i % 4 === 0) drumAt(t, true);
    else if (i % 4 === 2) drumAt(t, false);
    bgmBar++;
    bgmNext += BGM_EIGHTH;
  }
  bgmTimer = setTimeout(() => { if (gen === bgmGen) schedBgm(); }, 350);
}

document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('pl-paused', document.hidden);
  if (document.hidden) { stopBgm(); }
  else {
    if (BGM) startBgm();
  }
});

function syncSfxBtn() {
  const b = $('#sfx');
  if (!b) return;
  b.textContent = SFX ? '🔊' : '🔇';
  b.setAttribute('aria-label', SFX ? 'Sound on' : 'Sound off');
  b.classList.toggle('off', !SFX);
}
function carForPart(code) {
  if (!scan) return null;
  for (const row of scan.rows) for (const car of row.cars)
    if (car.parts.some(p => p.code === code)) return car;
  return null;
}
function carAllGot(car, st, override) {
  let any = false;
  for (const p of car.parts) {
    const rm = override && p.code === override.code && 'rm' in override ? !!override.rm : !!val(st, 'rm:' + p.code);
    if (rm) continue;
    any = true;
    const got = override && p.code === override.code && 'got' in override ? !!override.got : !!val(st, 'got:' + p.code);
    if (!got) return false;
  }
  return any;
}


// ---------- XP / levels (local only: the server sync is per-scan and won't take a lifetime key) ----------
const XP_KEY = 'pl_xp';
function defaultXp() { return { xp: 0, level: 1, grants: {}, pulled: 0, net: 0, chests: 0, chestAwarded: {}, levelChests: {}, inventory: {}, equipped: {}, cls: 'warrior', classes: {} }; }
function loadXp() {
  try {
    const s = JSON.parse(localStorage.getItem(XP_KEY) || '');
    if (!s || typeof s.xp !== 'number') return defaultXp();
    return {
      xp: Math.max(0, s.xp | 0),
      level: Math.max(1, s.level | 0),
      grants: s.grants && typeof s.grants === 'object' ? s.grants : {},
      pulled: Math.max(0, s.pulled | 0),
      net: Math.max(0, s.net | 0),
      chests: Math.max(0, s.chests | 0),
      chestAwarded: s.chestAwarded && typeof s.chestAwarded === 'object' ? s.chestAwarded : {},
      levelChests: s.levelChests && typeof s.levelChests === 'object' ? s.levelChests : {},
      inventory: s.inventory && typeof s.inventory === 'object' ? s.inventory : {},
      equipped: s.equipped && typeof s.equipped === 'object' ? s.equipped : {},
      cls: ['warrior', 'shooter', 'mage'].includes(s.cls) ? s.cls : 'warrior',
      classes: s.classes && typeof s.classes === 'object' ? s.classes : {},
      classesV: s.classesV | 0
    };
  } catch { return defaultXp(); }
}
let xpState = loadXp();
function xpToNext(level) { return Math.round(100 * Math.pow(level, 1.5)); }
function totalXpForLevel(level) {
  let t = 0;
  for (let i = 1; i < level; i++) t += xpToNext(i);
  return t;
}
function levelFromXp(xp) {
  let lvl = 1;
  while (totalXpForLevel(lvl + 1) <= xp && lvl < 200) lvl++;
  return lvl;
}
function xpProgress(xp, level) {
  const start = totalXpForLevel(level), need = xpToNext(level);
  return { have: xp - start, need };
}
function partXp(part) {
  const n = part && part.net != null && isFinite(part.net) ? Math.round(Number(part.net)) : 0;
  return Math.max(5, n);
}
function partNet(part) {
  return part && part.net != null && isFinite(part.net) ? Math.max(0, Math.round(Number(part.net))) : 0;
}
function gotId(code, d = date) { return 'got:' + d + ':' + code; }
function photoId(name, d = date) { return 'photo:' + d + ':' + name; }
function vinId(code, d = date) { return 'vin:' + d + ':' + code; }
function carId(car, d = date) { return 'car:' + d + ':' + car.code6; }
function grantAmount(rec) { return !rec ? 0 : (typeof rec === 'number' ? rec : rec.xp || 0); }
function grantSilent(id, amount, extras) {
  if (!(amount > 0) || xpState.grants[id]) return 0;
  const rec = { xp: amount };
  if (extras && extras.pulled) rec.pulled = extras.pulled;
  if (extras && extras.net) rec.net = extras.net;
  xpState.grants[id] = rec;
  xpState.xp += amount;
  xpState.pulled += rec.pulled || 0;
  xpState.net += rec.net || 0;
  return amount;
}
function revokeSilent(id) {
  const rec = xpState.grants[id];
  if (!rec) return 0;
  const amount = grantAmount(rec);
  delete xpState.grants[id];
  xpState.xp = Math.max(0, xpState.xp - amount);
  xpState.pulled = Math.max(0, xpState.pulled - (rec.pulled || 0));
  xpState.net = Math.max(0, xpState.net - (rec.net || 0));
  return amount;
}
function persistXp() { localStorage.setItem(XP_KEY, JSON.stringify(xpState)); }
function applyXp(changes, ev) {
  if (!changes || !changes.length) return;
  const oldLevel = xpState.level;
  let gained = 0;
  for (const c of changes) {
    if (c.revoke) revokeSilent(c.id);
    else gained += grantSilent(c.id, c.amount, c.extras);
  }
  xpState.level = levelFromXp(xpState.xp);
  persistXp();
  if (!RPG) return;
  renderXpBar();
  for (const c of changes) {
    if (!c.revoke && c.id && c.id.indexOf('car:') === 0 && window.PLLoot) window.PLLoot.award(c.id);
  }
  if (gained > 0) floatXp(gained, ev);
  if (xpState.level > oldLevel) {
    if (window.PLLoot && window.PLLoot.awardLevels) window.PLLoot.awardLevels(oldLevel, xpState.level);
    setTimeout(() => { playLevelUp(); showLevelUp(xpState.level); }, 280);
  }
}
function xpAnchor(ev) {
  if (ev && ev.clientX != null) return ev;
  const el = $('#xpwrap') || $('#lvlbadge');
  if (!el) return { clientX: window.innerWidth / 2, clientY: 80 };
  const r = el.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.bottom };
}
function floatXp(n, ev) {
  const pt = xpAnchor(ev);
  const el = document.createElement('div');
  el.className = 'xpfloat';
  el.textContent = '+' + n + ' XP';
  el.style.left = pt.clientX + 'px';
  el.style.top = pt.clientY + 'px';
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.remove(), 1100);
}
function showLevelUp(level) {
  document.querySelectorAll('.lvlup').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'lvlup';
  el.innerHTML = '<b>LEVEL UP — Level ' + level + '</b>';
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}
function renderXpBar() {
  const badge = $('#lvlbadge'), fill = $('#xpfill'), wrap = $('#xpwrap');
  if (!badge || !fill) return;
  const { have, need } = xpProgress(xpState.xp, xpState.level);
  badge.textContent = 'Lv ' + xpState.level;
  if (wrap) wrap.title = have + ' / ' + need + ' XP to level ' + (xpState.level + 1);
  fill.style.width = Math.min(100, need ? (have / need) * 100 : 0) + '%';
}

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
  if (r && r.checkResetEpoch) await applyCheckoffResetIfNeeded(r.checkResetEpoch);
  if (r && r.partNoteResetEpoch) await applyPartNoteResetIfNeeded(r.partNoteResetEpoch);
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
  xpState = defaultXp();
  persistXp();
  localStorage.removeItem('pl_battle'); // battle-strip kills reset with the character
  if (window.PLBattle) window.PLBattle.reset();
  localStorage.setItem(RESET_KEY, String(target));
  if (window.PLLoot) window.PLLoot.init();
  renderXpBar();
  if (scan && date) render();
  return true;
}

// Field Test Reset (pre-yard-trip, 2026-11-18): wipe got/rm/why/day marks in local cache so phones
// pick up the cleared shared list. Do not touch hero/XP profiles or login. A second pass
// (applyPartNoteResetIfNeeded) also drops per-part notes, VIN marks, and part photos.
const CHECK_RESET_KEY = 'pl_checkoff_reset_epoch';
const LOCAL_CHECKOFF_RESET_EPOCH = 1795031000000; // v47 Field Test Reset pass 3 (1:43 PM CT Nov 18): also wipes the 35 Nov 13 checks device B re-added at 1:21 PM. v45 used 1795030000000. Do not lower.
const checkEpochNow = () => Number(localStorage.getItem(CHECK_RESET_KEY) || 0);
function isCheckoffKey(k) { return /^(got|rm|why|day):/.test(String(k || '')); }
async function applyCheckoffResetIfNeeded(epoch) {
  const target = Math.max(Number(epoch || 0), LOCAL_CHECKOFF_RESET_EPOCH);
  if (checkEpochNow() >= target) return false;
  localOps = (localOps || []).filter(o => !isCheckoffKey(o.k));
  if (serverState) {
    for (const k of Object.keys(serverState)) if (isCheckoffKey(k)) delete serverState[k];
  }
  if (typeof VIEWS !== 'undefined') {
    for (const d of Object.keys(VIEWS)) {
      const st = VIEWS[d];
      if (!st) continue;
      for (const k of Object.keys(st)) if (isCheckoffKey(k)) delete st[k];
    }
  }
  await tx('ops', 'readwrite', s => req(s.getAll()).then(rs => {
    for (const o of rs) if (isCheckoffKey(o.k)) s.delete(o.id);
  }));
  await tx('server', 'readwrite', s => req(s.getAll()).then(rs => {
    for (const rec of rs) {
      if (!rec || !rec.state) continue;
      let changed = false;
      for (const k of Object.keys(rec.state)) if (isCheckoffKey(k)) { delete rec.state[k]; changed = true; }
      if (changed) s.put(rec);
    }
  }));
  localStorage.setItem(CHECK_RESET_KEY, String(target));
  if (scan && date) render();
  return true;
}

// Field Test Reset pass 2: also clear per-part notes, VIN marks, photo deletions, and
// uploaded part/VIN photos. Keep receipts (tday / RECEIPT_*), hero profiles, XP, and login.
// Cutoff is 1:21:00 PM CT Nov 18 (after leftover test marks, before new yard activity).
const PARTNOTE_RESET_KEY = 'pl_partnote_reset_epoch';
const LOCAL_PARTNOTE_RESET_EPOCH = 1795029660000; // keep in sync with Apps Script PARTNOTE_RESET_EPOCH
const partNoteEpochNow = () => Number(localStorage.getItem(PARTNOTE_RESET_KEY) || 0);
function isReceiptName(name) { return /^RECEIPT_/i.test(String(name || '')); }
function isPartNoteKey(k, rec) {
  const s = String(k || '');
  if (/^(pn|vin|assign):/.test(s)) return true;
  const m = /^(del|up|photo):/.exec(s);
  if (!m) return false;
  const name = s.slice(m[1].length + 1);
  if (isReceiptName(name)) return false;
  let kind;
  if (rec && typeof rec === 'object') kind = rec.kind || (rec.v && rec.v.kind);
  if (kind === 'rcpt') return false;
  return true;
}
function partNoteNamesFrom(k, rec) {
  const s = String(k || '');
  const names = [];
  const m = /^(del|up|photo|assign):/.exec(s);
  if (m) names.push(s.slice(m[1].length + 1));
  const v = rec && typeof rec === 'object' ? (rec.file || rec.v) : rec;
  if (v && typeof v === 'object' && v.file) names.push(v.file);
  return names.filter(n => n && !isReceiptName(n));
}
function stripPartNotesFromState(st, target, names) {
  if (!st) return false;
  let changed = false;
  for (const k of Object.keys(st)) {
    const rec = st[k];
    const ts = (rec && typeof rec === 'object' && rec.ts != null) ? Number(rec.ts) : 0;
    if (isPartNoteKey(k, rec) && ts < target) {
      partNoteNamesFrom(k, rec).forEach(n => names.add(n));
      delete st[k];
      changed = true;
    }
  }
  return changed;
}
async function applyPartNoteResetIfNeeded(epoch) {
  const target = Math.max(Number(epoch || 0), LOCAL_PARTNOTE_RESET_EPOCH);
  if (partNoteEpochNow() >= target) return false;
  const names = new Set();
  localOps = (localOps || []).filter(o => {
    if (isPartNoteKey(o.k, o.v) && Number(o.ts || 0) < target) {
      partNoteNamesFrom(o.k, o.v).forEach(n => names.add(n));
      return false;
    }
    return true;
  });
  stripPartNotesFromState(serverState, target, names);
  if (typeof VIEWS !== 'undefined') {
    for (const d of Object.keys(VIEWS)) stripPartNotesFromState(VIEWS[d], target, names);
  }
  await tx('ops', 'readwrite', s => req(s.getAll()).then(rs => {
    for (const o of rs) {
      if (isPartNoteKey(o.k, o.v) && Number(o.ts || 0) < target) {
        partNoteNamesFrom(o.k, o.v).forEach(n => names.add(n));
        s.delete(o.id);
      }
    }
  }));
  await tx('server', 'readwrite', s => req(s.getAll()).then(rs => {
    for (const rec of rs) {
      if (!rec || !rec.state) continue;
      if (stripPartNotesFromState(rec.state, target, names)) s.put(rec);
    }
  }));
  // Drop locally cached part/VIN photos that belonged to the wiped marks; leave receipts
  // and any photos taken at or after the cutoff (including today's new yard work).
  await tx('photos', 'readwrite', s => req(s.getAll()).then(rs => {
    for (const r of rs) {
      if (!r) continue;
      const old = Number(r.t || 0) < target;
      if (old && (names.has(r.name) || /(?:_VIN_|_X_|^[A-Z0-9]{6}-\d{2}_)/.test(r.name || ''))) {
        try {
          const u = urlCache && urlCache.get(`${r.date}/${r.name}`);
          if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u);
          if (urlCache) urlCache.delete(`${r.date}/${r.name}`);
        } catch (e) {}
        s.delete(r.key);
      }
    }
  }));
  localStorage.setItem(PARTNOTE_RESET_KEY, String(target));
  if (scan && date) render();
  return true;
}

// One-time client reset (v1): wipe RPG progress and local test photos, keep scan/pull
// data, auth, and settings. Not the field RESET_EPOCH — do not bump pl_reset_epoch here.
const PROGRESS_RESET_KEY = 'pl_reset_v1';
const PHOTO_HIDE_KEY = 'pl_photos_hide_before';
async function applyProgressResetV1() {
  if (localStorage.getItem(PROGRESS_RESET_KEY) === '1') return false;
  xpState = defaultXp();
  persistXp();
  localStorage.removeItem('pl_battle');
  if (window.PLBattle) window.PLBattle.reset();
  SFX = true;
  BGM = true;
  localStorage.setItem(SFX_KEY, '1');
  localStorage.setItem(BGM_KEY, '1');
  syncSfxBtn();
  syncBgmBtn();
  if (!localStorage.getItem(PHOTO_HIDE_KEY)) localStorage.setItem(PHOTO_HIDE_KEY, String(Date.now()));
  try {
    if (typeof urlCache !== 'undefined') {
      for (const u of urlCache.values()) { try { if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u); } catch (e) {} }
      urlCache.clear();
    }
    await tx('photos', 'readwrite', s => s.clear());
  } catch (e) { return false; }
  localStorage.setItem(PROGRESS_RESET_KEY, '1');
  if (window.PLLoot) window.PLLoot.init();
  renderXpBar();
  return true;
}
function tryAutoBgm() {
  if (!RPG || !BGM || document.hidden) return;
  startBgm();
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
function pickListParts() {
  if (!scan || !date || !scan.rows) return [];
  const st = view();
  const out = [];
  for (const row of scan.rows) {
    for (const car of (row.cars || [])) {
      for (const p of (car.parts || [])) {
        if (val(st, 'rm:' + p.code)) continue;
        const name = String(p.part || '').trim();
        if (!name) continue;
        out.push({ code: p.code, name, car: car.car || '', net: partNet(p), got: !!val(st, 'got:' + p.code) });
      }
    }
  }
  return out;
}
window.PLPickList = { parts: pickListParts, loaded() { return !!(scan && scan.rows && scan.rows.length); } };
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
  await applyCheckoffResetIfNeeded(0);
  await applyPartNoteResetIfNeeded(0);
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
      const checkEpoch = checkEpochNow();
      const partNoteEpoch = partNoteEpochNow();
      let j;
      try { j = await api('sync', d, pend.map(({ id, k, v, dev, ts }) => ({ id, k, v, dev, ts })), epoch, checkEpoch, partNoteEpoch); }
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
  if (kind === 'vin') playGong(); else playClink();
  if (kind === 'part') applyXp([{ id: photoId(name, d), amount: 5 }], xpAnchor());
  if (kind === 'vin') applyXp([{ id: vinId(code, d), amount: 10 }], xpAnchor());
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
  const hideBefore = Number(localStorage.getItem(PHOTO_HIDE_KEY) || 0);
  return Object.keys(st).filter(k => k.startsWith('photo:') && st[k].v && st[k].v.kind === kind && st[k].v.code === code && !val(st, 'del:' + k.slice(6)) && (!hideBefore || (st[k].ts || 0) >= hideBefore))
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
function setHeaderTitle(text) {
  const el = $('#title');
  if (!el) return;
  el.classList.remove('brandtitle');
  el.textContent = text;
}
function setBrandTitle(kind) {
  const el = $('#title');
  if (!el) return;
  if (window.PL_RPG) {
    el.classList.add('brandtitle');
    el.innerHTML = '<span class="brand">Junkyard Hero</span><small>Salvage Crusade</small>';
    return;
  }
  el.classList.remove('brandtitle');
  el.textContent = kind === 'scans' ? 'Pull List · Scans' : 'Pull List';
}
function showLogin(msg = '') {
  $('#back').hidden = true; setBrandTitle('login');
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
let olderDaysOpen = false;
function scanSetTitle(d, sc) {
  if (!window.PLHomeList || !sc) return d;
  const cars = PLHomeList.scanCars(sc);
  return PLHomeList.setDateLabel(cars, d) || d;
}
async function homeRows(idx) {
  const rows = [];
  for (const s of idx || []) {
    const sc = await kvGet('scan:' + s.date);
    rows.push(PLHomeList.summarize(s, sc));
  }
  return PLHomeList.sortRows(rows);
}
function homeListHtml(rows) {
  const { recent, older } = PLHomeList.splitDays(rows, 3);
  const btn = r => {
    const t = PLHomeList.rowText(r);
    const cars = r.cars === 1 ? '1 car' : (r.cars || 0) + ' cars';
    const parts = r.parts === 1 ? '1 part' : (r.parts || 0) + ' parts';
    const est = PLHomeList.moneyInt(r.fourHour);
    const mid = '(' + cars + ', ' + parts + ')';
    const right = est ? '4-hr pull ≈ ' + est : '';
    return `<button class="scanitem" data-d="${esc(r.date)}" aria-label="${esc(t)}"><b>${esc(r.setDate || r.date || '')}</b><span class="scanmeta">${esc(mid)}</span>${right ? `<span class="scanest">${esc(right)}</span>` : ''}</button>`;
  };
  let h = recent.map(btn).join('');
  if (older.length) h += `<details class="olderdays"${olderDaysOpen ? ' open' : ''}><summary>Older days</summary>${older.map(btn).join('')}</details>`;
  return h;
}
async function showHome() {
  date = null; scan = null; screen = 'home'; lastScan = null;
  $('#back').hidden = true; $('#back').textContent = '← Scans'; setBrandTitle('scans');
  status();
  const draw = async idx => {
    if (screen !== 'home') return;
    const rows = await homeRows(idx);
    if (screen !== 'home') return;
    const list = (idx && idx.length) ? homeListHtml(rows) : `<p>${navigator.onLine ? 'Loading scans…' : 'No scans saved on this phone yet. Open the app once with signal.'}</p>`;
    const rpgBits = RPG ? `<div class="rpghome"><p class="xpstats">Level ${xpState.level} · ${xpState.xp} XP · ${xpState.pulled} parts pulled · est. net ${money(xpState.net)}</p>${window.PLLoot ? window.PLLoot.picker() : ''}</div>` : '';
    const y = scrollY;
    main.innerHTML = `<div class="tools"><button data-act="trip">Trip days</button><button data-act="ready">Ready to list</button></div>`
      + list + rpgBits
      + `<p class="small">This phone: ${esc(DEVNAME)} · <a href="#" class="chg">settings</a></p>`;
    scrollTo(0, y);
    main.querySelectorAll('.scanitem').forEach(b => b.onclick = () => openScan(b.dataset.d));
    const older = main.querySelector('.olderdays');
    if (older) older.addEventListener('toggle', () => { olderDaysOpen = older.open; });
    if (RPG && window.PLLoot) window.PLLoot.wirePicker(main);
  };
  const cached = await kvGet('index') || [];
  await draw(cached);
  if (!navigator.onLine) return;
  try {
    const idx = (await api('listScans')).scans || [];
    await kvSet('index', idx);
    await draw(idx);
    await prefetchScans(idx);
    if (screen === 'home') await draw(idx);
  } catch (e) { if (e.login) return showLogin(); }
}
async function prefetchScans(list) {
  let login = false;
  await Promise.all((list || []).map(async s => {
    if (login) return;
    try { const sc = (await api('getScan', s.date)).scan; if (sc) await kvSet('scan:' + s.date, sc); }
    catch (e) { if (e.login) login = true; }
  }));
  if (login) throw Object.assign(new Error('login'), { login: true });
}
async function openScan(d) {
  date = d; screen = 'scan'; lastScan = null;
  $('#back').hidden = false; $('#back').textContent = '← Scans';
  scan = await kvGet('scan:' + d);
  setHeaderTitle(scanSetTitle(d, scan));
  serverState = ((await tx('server', 'readonly', s => req(s.get(d)))) || {}).state || {};
  localOps = (await tx('ops', 'readonly', s => req(s.getAll()))).filter(o => o.date === d);
  if (scan) { render(); sync(); playGong(); }
  else main.innerHTML = '<p>Loading…</p>';
  if (!navigator.onLine) { if (!scan) main.innerHTML = '<p>This scan is not saved on this phone yet. Open it once with signal.</p>'; return; }
  try {
    const fresh = (await api('getScan', d)).scan;
    if (fresh) { await kvSet('scan:' + d, fresh); if (date === d) { const first = !scan; scan = fresh; setHeaderTitle(scanSetTitle(d, scan)); render(); if (first) { sync(); playGong(); } } }
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
  const hideBefore = Number(localStorage.getItem(PHOTO_HIDE_KEY) || 0);
  const assigned = Object.keys(st).filter(k => {
    if (!k.startsWith('assign:') || st[k].v !== code || val(st, 'del:' + k.slice(7))) return false;
    if (!hideBefore) return true;
    const name = k.slice(7), ph = st['photo:' + name];
    return ((ph && ph.ts) || (st[k].ts || 0)) >= hideBefore;
  }).map(k => k.slice(7));
  return photosFor(st, 'part', code).concat(assigned);
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
    <div class="pname">${esc(p.part)}${p.risk ? `<span class="prisk" title="High failure risk from a junkyard car">yard risk</span>` : ''}</div>${p.note ? `<div class="pnote">${esc(p.note)}</div>` : ''}
    ${p.pap != null ? `<div class="small">PAP price $${p.pap.toFixed(2)}</div>` : ''}</div>
    <div class="pnet"><span class="pnetlbl">Est. net</span>${money(p.net)}${p.dollars_per_hour != null ? `<span class="pdph">${money(p.dollars_per_hour)}/hr</span>` : ''}</div></div>
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
      const parts = car.parts.slice().sort((a, b) => (b.dollars_per_hour || 0) - (a.dollars_per_hour || 0) || (b.net || 0) - (a.net || 0) || String(a.code).localeCompare(String(b.code)));
      for (const p of parts) {
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
    case 'got': {
      const next = !val(st, 'got:' + c);
      const car = carForPart(c);
      const part = car && car.parts.find(p => p.code === c);
      const wasDone = car && carAllGot(car, st);
      const nowDone = car && carAllGot(car, st, { code: c, got: next });
      const xp = [];
      if (next) {
        playThud(false);
        xp.push({ id: gotId(c), amount: partXp(part), extras: { pulled: 1, net: partNet(part) } });
        if (nowDone && !wasDone) { playQuest(); xp.push({ id: carId(car), amount: 50 }); }
      } else {
        playThud(true);
        xp.push({ id: gotId(c), revoke: 1 });
        if (wasDone && !nowDone) xp.push({ id: carId(car), revoke: 1 });
      }
      applyXp(xp, e);
      return next ? ops([['got:' + c, true], ['day:' + c, chiDay()]]) : op('got:' + c, false);
    }
    case 'pnok': {
      const p = scan.rows.flatMap(r => r.cars).flatMap(x => x.parts).find(x => x.code === c);
      if (!p || !p.expected_pn) return;
      const cur = val(st, 'pn:' + c) || '';
      return op('pn:' + c, pnNorm(cur) === pnNorm(p.expected_pn) ? '' : p.expected_pn);
    }
    case 'why': {
      const car = carForPart(c);
      const wasDone = car && carAllGot(car, st);
      const nowDone = car && carAllGot(car, st, { code: c, rm: true });
      const xp = [];
      if (val(st, 'got:' + c)) xp.push({ id: gotId(c), revoke: 1 });
      if (wasDone && !nowDone) xp.push({ id: carId(car), revoke: 1 });
      if (!wasDone && nowDone) xp.push({ id: carId(car), amount: 50 });
      applyXp(xp, e);
      return ops([['rm:' + c, true], ['why:' + c, t.dataset.why]]); // gone / damaged / skip, logged in the op file
    }
    case 'undo': {
      const car = carForPart(c);
      const part = car && car.parts.find(p => p.code === c);
      const wasDone = car && carAllGot(car, st);
      const nowDone = car && carAllGot(car, st, { code: c, rm: false });
      const xp = [];
      if (val(st, 'got:' + c)) xp.push({ id: gotId(c), amount: partXp(part), extras: { pulled: 1, net: partNet(part) } });
      if (wasDone && !nowDone) xp.push({ id: carId(car), revoke: 1 });
      if (!wasDone && nowDone) { playQuest(); xp.push({ id: carId(car), amount: 50 }); }
      applyXp(xp, e);
      return ops([['rm:' + c, false], ['why:' + c, '']]);
    }
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
      if (meta.kind === 'part') applyXp([{ id: photoId(name, d), revoke: 1 }]);
      if (meta.kind === 'vin' && photosFor(st, 'vin', meta.code).filter(n => n !== name).length === 0)
        applyXp([{ id: vinId(meta.code, d), revoke: 1 }]);
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
  $('#back').hidden = false; $('#back').textContent = lastScan ? '← List' : '← Scans'; setHeaderTitle(title);
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
const sfxBtn = $('#sfx');
if (sfxBtn) {
  syncSfxBtn();
  sfxBtn.onclick = () => {
    SFX = !SFX;
    localStorage.setItem(SFX_KEY, SFX ? '1' : '0');
    syncSfxBtn();
    unlockAudio();
    if (SFX) { playClink(); if (BGM) startBgm(); }
    else stopBgm();
  };
}
const bgmBtn = $('#bgm');
if (bgmBtn) {
  syncBgmBtn();
  mountBgmSkip();
  bgmBtn.onclick = () => {
    BGM = !BGM;
    localStorage.setItem(BGM_KEY, BGM ? '1' : '0');
    syncBgmBtn();
    unlockAudio();
    if (BGM) startBgm();
    else stopBgm();
  };
}
async function start() {
  await applyProgressResetV1();
  tryAutoBgm();
  if (!TOKEN) return showLogin(navigator.onLine ? '' : 'Needs signal the first time.');
  await applyResetIfNeeded(0);
  await applyCheckoffResetIfNeeded(0);
  await applyPartNoteResetIfNeeded(0);
  ensureDevice();
  if (RPG) {
    renderXpBar();
    if (window.PLLoot) window.PLLoot.init();
    if (window.PLBattle) window.PLBattle.init();
  }
  showHome();
  status();
  retryNow(); // resume any photos/changes still queued from last time
  tryAutoBgm();
  if (navigator.onLine) {
    try { await api('me'); } catch (e) { if (e.login) { TOKEN = ''; localStorage.removeItem('pl_token'); return showLogin(); } }
  }
}

if (!window.PL_TEST) {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  start();
}
