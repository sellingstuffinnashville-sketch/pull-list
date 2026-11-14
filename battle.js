// Idle auto-battler strip: the hero runs through the cave in his equipped gear and fights monsters.
// Cosmetic only. No XP is earned here; kills are saved under pl_battle. Original monsters and art.
'use strict';
(function () {
  const BAT_KEY = 'pl_battler', STAT_KEY = 'pl_battle';
  const H = 68, FPS = 12;
  const RR = { common: 1, uncommon: 2, rare: 3, relic: 4, legendary: 5 };
  const GUNS = { 'wep-rifle': 1, 'wep-carbine': 1, 'wep-sun': 1, 'wep-slug': 1, 'wep-siege': 1 };

  // ---------- stats ----------
  function rk(eq, slot) {
    const it = typeof ITEM_BY_ID !== 'undefined' && ITEM_BY_ID[eq[slot]];
    return it ? RR[it.rarity] || 0 : 0;
  }
  function stats(eq, level) {
    eq = eq || {}; level = Math.max(1, level | 0);
    return {
      atk: 5 + 2 * level + 4 * rk(eq, 'weapon') + rk(eq, 'pack'),
      arm: 2 * (rk(eq, 'armor') + rk(eq, 'helm') + rk(eq, 'pauldrons')) + rk(eq, 'cape') + rk(eq, 'base'),
      hp: 40 + 6 * level + 4 * rk(eq, 'armor') + 2 * rk(eq, 'cape') + 2 * rk(eq, 'helm')
    };
  }
  function loadStats() {
    try { const s = JSON.parse(localStorage.getItem(STAT_KEY) || ''); if (s && typeof s === 'object') return { kills: s.kills | 0, elites: s.elites | 0, gold: s.gold | 0 }; } catch (e) {}
    return { kills: 0, elites: 0, gold: 0 };
  }
  let bstats = loadStats();
  function saveStats() { try { localStorage.setItem(STAT_KEY, JSON.stringify(bstats)); } catch (e) {} }

  // ---------- monster sprites (side view, facing left) ----------
  const P = () => window.PLPixel;
  function mk(w, h, draw) { const S = new (P().Spr)(w, h); draw(S); return P().toCanvas(S); }
  const MON = {
    rat: { name: 'Cave Rat', hp: 10, dmg: 2, w: 20, h: 11, min: 1, wt: 30, speed: 1.4, draw(S) {
      S.P({ round: true }); S.ell(11, 6.5, 6.5, 3.6, 'fur'); S.tone(9, 4, 1);
      S.P(); S.poly([[1, 7], [5, 3.5], [8, 4], [8, 9], [4, 9]], 'fur'); S.px(5, 3, 'skin', 2); S.px(6, 2, 'skin', 1);
      S.P({ flat: true, nocs: true }); S.px(4, 5, 'glowR'); S.px(1, 7, 'skin', 3); S.px(2, 8, 'bone', 4);
      S.P({ flat: true }); S.line(17, 6, 19, 3, 'skin', 1); S.px(19, 2, 'skin', 1);
      S.P({ flat: true }); S.px(6, 10, 'skin', 1); S.px(9, 10, 'skin', 1); S.px(13, 10, 'skin', 1); S.px(16, 10, 'skin', 1);
    } },
    skel: { name: 'Bone Walker', hp: 18, dmg: 3, w: 18, h: 27, min: 1, wt: 26, speed: 1, draw(S) {
      S.P({ shine: true }); S.ell(9, 4.5, 3.4, 3.6, 'bone'); S.rect(7, 7, 4, 2, 'bone');
      S.P({ flat: true, nocs: true }); S.px(7, 4, 'void'); S.px(10, 4, 'void'); S.px(7, 4, 'glowR'); S.px(8, 8, 'void');
      S.P(); S.rect(9, 9, 1, 9, 'bone');
      S.P({ flat: true }); for (let y = 10; y < 16; y += 2) S.line(6, y, 12, y, 'bone', 2);
      S.P(); S.rect(7, 17, 5, 2, 'bone');
      S.P({ flat: true }); S.line(8, 19, 7, 26, 'bone', 2); S.line(11, 19, 12, 26, 'bone', 1);
      S.line(6, 10, 4, 15, 'bone', 2); S.line(12, 10, 13, 15, 'bone', 1);
      S.P(); S.line(4, 15, 0, 9, 'rust'); S.line(4, 16, 1, 10, 'rust', -1); S.P(); S.rect(3, 15, 3, 1, 'iron');
    } },
    cult: { name: 'Hooded Zealot', hp: 24, dmg: 4, w: 18, h: 27, min: 2, wt: 20, speed: 1, draw(S) {
      S.P({ round: true }); S.poly([[5, 9], [13, 9], [15, 26], [3, 26]], 'crimson'); S.tone(7, 15, 1); S.tone(12, 20, -1);
      S.P({ round: true }); S.poly([[5, 9], [6, 3], [9, 1], [12, 3], [13, 9]], 'crimson', -1);
      S.P({ flat: true, nocs: true }); S.rect(6, 4, 5, 4, 'void'); S.px(7, 5, 'glowY'); S.px(9, 5, 'glowY');
      S.P({ nocs: true, flat: true }); S.line(4, 25, 14, 25, 'gold', 2); S.rect(8, 11, 2, 6, 'gold', 2);
      S.P(); S.rect(3, 15, 3, 2, 'skin', -1);
      S.P(); S.poly([[0, 13], [4, 15], [4, 16], [0, 15]], 'steel');
    } },
    crawl: { name: 'Plague Crawler', hp: 20, dmg: 3, w: 24, h: 13, min: 3, wt: 16, speed: 1.2, draw(S) {
      S.P({ flat: true }); for (let k = 0; k < 4; k++) { S.line(6 + k * 4, 9, 4 + k * 4, 12, 'sick', 1); S.line(7 + k * 4, 9, 9 + k * 4, 12, 'sick', 0); }
      S.P({ round: true }); S.ell(16, 7, 6, 4.4, 'sick');
      S.P({ round: true }); S.ell(9, 7, 4.5, 4, 'sick');
      S.P({ round: true }); S.ell(4, 7.5, 3.4, 3, 'flesh');
      S.P({ flat: true, nocs: true }); S.px(2, 6, 'glowR'); S.px(1, 9, 'bone', 4); S.px(3, 10, 'bone', 4);
      S.px(15, 4, 'glowG'); S.px(18, 5, 'glowG'); S.px(12, 5, 'glowG');
      S.glow(16, 5, 5, 'glowG', 0.35);
    } },
    mut: { name: 'Pit Mutant', hp: 34, dmg: 5, w: 24, h: 28, min: 4, wt: 12, speed: 0.8, draw(S) {
      S.P(); S.rect(10, 20, 3, 8, 'flesh', -1); S.P(); S.rect(15, 20, 3, 8, 'flesh', -1);
      S.P({ round: true, shine: true }); S.ell(14, 14, 7.5, 8, 'flesh');
      S.P({ flat: true, nocs: true }); S.line(11, 10, 17, 17, 'skin', 0); for (let k = 0; k < 4; k++) S.px(12 + k * 1.6, 12 + k * 1.6, 'bone', 3);
      S.P({ shine: true }); S.ell(12, 5, 3, 3, 'flesh'); S.P({ flat: true, nocs: true }); S.px(10, 4, 'glowY'); S.px(10, 6, 'void');
      S.P({ round: true }); S.poly([[8, 10], [3, 14], [1, 21], [6, 22], [9, 16]], 'flesh'); S.P({ shine: true }); S.ell(3, 22, 3, 2.5, 'flesh', 1);
      S.P({ flat: true }); S.px(1, 24, 'bone', 4); S.px(4, 24, 'bone', 4); S.P(); S.rect(10, 17, 9, 2, 'leather');
    } },
    brute: { name: 'Horned Brute', hp: 48, dmg: 6, w: 28, h: 33, min: 6, wt: 9, speed: 0.8, draw(S) {
      S.P(); S.poly([[10, 22], [14, 22], [13, 32], [8, 32]], 'demon'); S.P(); S.poly([[17, 22], [21, 22], [22, 32], [17, 32]], 'demon', -1);
      S.P({ round: true, shine: true }); S.poly([[7, 10], [22, 9], [24, 16], [21, 23], [9, 23], [6, 16]], 'demon');
      S.P({ round: true }); S.ell(12, 7, 4.2, 4, 'demon');
      S.P({ round: false }); S.poly([[10, 4], [7, 0], [6, 2], [9, 6]], 'bone'); S.poly([[15, 4], [18, 0], [19, 2], [15, 6]], 'bone');
      S.P({ flat: true, nocs: true }); S.px(10, 7, 'glowY'); S.px(13, 7, 'glowY'); S.line(9, 10, 13, 10, 'bone', 4);
      S.P({ round: true }); S.poly([[7, 11], [2, 16], [1, 24], [5, 24], [8, 17]], 'demon');
      S.P({ flat: true }); S.px(0, 25, 'bone', 4); S.px(2, 26, 'bone', 4); S.px(4, 25, 'bone', 4);
      S.P(); S.rect(9, 20, 13, 2, 'iron'); S.glow(12, 7, 5, 'glowY', 0.3);
    } },
    boss: { name: 'Ash Tyrant', hp: 90, dmg: 7, w: 34, h: 42, min: 1, wt: 0, speed: 0.7, boss: true, draw(S) {
      S.P({ round: true }); S.poly([[13, 12], [27, 12], [32, 40], [8, 40]], 'crimson', -1);
      S.P(); S.rect(12, 30, 5, 11, 'night'); S.P(); S.rect(20, 30, 5, 11, 'night', -1);
      S.P(); S.rect(11, 39, 7, 3, 'iron'); S.P(); S.rect(19, 39, 7, 3, 'iron');
      S.P({ round: true, shine: true }); S.poly([[9, 13], [27, 13], [28, 22], [25, 31], [11, 31], [8, 22]], 'night');
      S.P({ nocs: true, flat: true }); S.line(11, 21, 25, 21, 'gold', 3); S.line(18, 14, 18, 30, 'gold', 2);
      S.P({ round: true, shine: true }); S.ell(9, 15, 5, 4, 'night'); S.P({ round: true, shine: true }); S.ell(27, 15, 5, 4, 'night', -1);
      S.P({ shine: true }); S.poly([[14, 12], [14, 5], [16, 3], [21, 3], [23, 5], [23, 12]], 'night');
      S.P({ flat: true, nocs: true }); S.rect(15, 7, 7, 2, 'void'); S.px(16, 7, 'glowP'); S.px(19, 7, 'glowP');
      S.P({ flat: true }); for (const x of [14, 16, 18, 20, 22]) S.line(x, 3, x, x === 18 ? -1 : 0, 'gold', 3);
      S.P(); S.rect(4, 17, 4, 7, 'night'); S.P({ shine: true }); S.ell(5.5, 25, 2.6, 2.4, 'iron');
      S.P({ shine: true }); S.poly([[5, 24], [6, 24], [3, 2], [1, 0], [2, 4]], 'steel');
      S.P({ flat: true, nocs: true }); S.line(4, 20, 2, 6, 'glowP', 0); S.rect(2, 23, 7, 1, 'gold', 3);
      S.glow(17.5, 7.5, 6, 'glowP', 0.6); S.glow(3, 12, 9, 'glowP', 0.35);
    } }
  };
  const mcache = {};
  function monCanvas(type) {
    if (!mcache[type]) {
      const m = MON[type];
      const c = mk(m.w, m.h, m.draw);
      // white silhouette for hit flashes
      const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
      const fx = f.getContext('2d'); fx.drawImage(c, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#fff6e0'; fx.fillRect(0, 0, f.width, f.height);
      mcache[type] = { c, f };
    }
    return mcache[type];
  }
  function whiteOf(c) {
    if (c._white) return c._white;
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fx = f.getContext('2d'); fx.drawImage(c, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#ffd0c0'; fx.fillRect(0, 0, f.width, f.height);
    return (c._white = f);
  }

  // ---------- tiny 3x5 pixel font ----------
  const GLYPH = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
    5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
    '+': '000010111010000', B: '110101110101110', L: '100100100100111', O: '111101101101111', C: '111100100100111', K: '101101110101101'
  };
  function text(g, str, x, y, col) {
    x = Math.round(x); y = Math.round(y);
    for (let pass = 0; pass < 2; pass++) {
      g.fillStyle = pass ? col : '#0c0705';
      let cx = x;
      for (const ch of String(str)) {
        const gl = GLYPH[ch];
        if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') {
          const px = cx + (i % 3), py = y + ((i / 3) | 0);
          if (pass) g.fillRect(px, py, 1, 1); else g.fillRect(px - 1, py - 1, 3, 3);
        }
        cx += 4;
      }
    }
  }

  // ---------- background layers ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const TW = 160;
  let layers = null;
  function buildLayers() {
    const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // far wall
    const far = mkc(TW, H), f = far.getContext('2d'), r = rng(7);
    const grd = f.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(10,8,10,0)'); grd.addColorStop(0.1, 'rgba(10,8,10,.97)'); grd.addColorStop(1, '#1a120c');
    f.fillStyle = grd; f.fillRect(0, 0, TW, H);
    for (let x = 0; x < TW; x++) {
      const top = 14 + Math.round(6 * Math.sin(x / 13) + 4 * Math.sin(x / 5.3 + 1));
      f.fillStyle = '#17110d'; f.fillRect(x, top, 1, H - top);
      if (r() < 0.25) { f.fillStyle = '#211812'; f.fillRect(x, top + 2 + ((r() * 30) | 0), 1, 1); }
    }
    for (let k = 0; k < 9; k++) { const x = (r() * TW) | 0, len = 3 + ((r() * 7) | 0); f.fillStyle = '#100c0a'; for (let y = 0; y < len; y++) f.fillRect(x + (y > len / 2 ? 0 : -1), 10 + y, y > len / 2 ? 1 : 3, 1); }
    // glowing mushrooms + a distant torch
    const mid = mkc(TW, H), m = mid.getContext('2d'), r2 = rng(19);
    for (let k = 0; k < 4; k++) {
      const x = (r2() * TW) | 0, h = 10 + ((r2() * 14) | 0);
      m.fillStyle = '#2a1f17'; m.fillRect(x - 3, H - 6 - h, 7, h); m.fillStyle = '#3a2c20'; m.fillRect(x - 3, H - 6 - h, 2, h); m.fillStyle = '#120d0a'; m.fillRect(x + 3, H - 6 - h, 1, h);
      m.fillStyle = '#3a2c20'; m.fillRect(x - 2, H - 7 - h, 5, 1);
    }
    for (let k = 0; k < 5; k++) {
      const x = (r2() * TW) | 0, y = H - 7;
      m.fillStyle = '#d8b4e8'; m.fillRect(x, y - 3, 3, 1); m.fillStyle = '#9a6ab0'; m.fillRect(x - 1, y - 2, 5, 1); m.fillStyle = '#c8b8a0'; m.fillRect(x + 1, y - 1, 1, 2);
    }
    for (let k = 0; k < 3; k++) { const x = (r2() * TW) | 0; m.fillStyle = '#d6caae'; m.fillRect(x, H - 7, 3, 2); m.fillStyle = '#0a0605'; m.fillRect(x, H - 7, 1, 1); m.fillRect(x + 2, H - 7, 1, 1); }
    // floor
    const fl = mkc(TW, 8), g = fl.getContext('2d'), r3 = rng(31);
    g.fillStyle = '#2a1f16'; g.fillRect(0, 0, TW, 8); g.fillStyle = '#4a3624'; g.fillRect(0, 0, TW, 1);
    for (let k = 0; k < 140; k++) { const x = (r3() * TW) | 0, y = 1 + ((r3() * 7) | 0); g.fillStyle = ['#3a2a1c', '#1c140e', '#5a4430', '#241a12'][(r3() * 4) | 0]; g.fillRect(x, y, 1 + ((r3() * 2) | 0), 1); }
    for (let k = 0; k < 10; k++) { const x = (r3() * TW) | 0; g.fillStyle = '#6a5440'; g.fillRect(x, 1, 2, 1); g.fillStyle = '#1a120c'; g.fillRect(x, 2, 2, 1); }
    layers = { far, mid, fl };
  }

  // ---------- state ----------
  let cv, g, wrap, killEl, on = false, timer = 0, W = 300, scale = 1;
  let st = null;
  function freshState() {
    return { mode: 'run', t: 0, scroll: 0, hp: 1, max: 1, heroX: 22, mon: null, spawn: 18, fx: [], nums: [], coins: [], fire: null, atkT: 0, monT: 0, pose: '', lunge: 0, flashH: 0, potion: 0, eqKey: '' };
  }
  function eqNow() { return (typeof xpState !== 'undefined' && xpState.equipped) || {}; }
  function lvl() { return (typeof xpState !== 'undefined' && xpState.level) || 1; }
  function rarity(eq) {
    let best = 0, color = null;
    for (const k in eq) { const it = ITEM_BY_ID[eq[k]]; if (it && RR[it.rarity] > best) { best = RR[it.rarity]; color = RARITY[it.rarity].color; } }
    return { best, color };
  }
  function heroEq() { const e = Object.assign({}, eqNow()); delete e.base; return e; }

  function pickMonster() {
    const L = lvl();
    if (Math.random() < (L >= 3 ? 0.06 : 0.025)) return 'boss';
    const pool = Object.keys(MON).filter(k => MON[k].wt && MON[k].min <= L);
    let tot = 0; const ws = pool.map(k => { const w = MON[k].wt + (k === 'rat' ? -Math.min(20, L * 2) : MON[k].min * Math.min(L, 10) * 0.4); tot += Math.max(2, w); return Math.max(2, w); });
    let n = Math.random() * tot;
    for (let i = 0; i < pool.length; i++) { n -= ws[i]; if (n <= 0) return pool[i]; }
    return pool[0];
  }
  function spawn() {
    const type = pickMonster(), m = MON[type], L = lvl();
    const elite = !m.boss && Math.random() < 0.08;
    const hp = Math.round(m.hp * (1 + 0.25 * (L - 1)) * (elite ? 2.5 : 1));
    st.mon = { type, x: W + 4, hp, max: hp, elite, boss: !!m.boss, flash: 0, lunge: 0, dead: 0, walk: 0 };
  }
  function addNum(x, y, v, col) { st.nums.push({ x, y, v, col, t: 0 }); }
  function heroSprite(pose) {
    const eq = heroEq(), r = rarity(eqNow());
    return P().heroCanvas(eq, r.best, r.color, pose === 'raise' ? 'raise' : '');
  }

  // ---------- simulation (fixed 12 ticks per second) ----------
  function tick() {
    const s = st, eq = eqNow(), S = stats(eq, lvl());
    const key = JSON.stringify(eq) + lvl();
    if (key !== s.eqKey) { const ratio = s.hp / s.max; s.max = S.hp; s.hp = Math.max(1, Math.round(ratio * S.hp)); s.eqKey = key; }
    s.t++;
    if (s.flashH) s.flashH--;
    if (s.lunge) s.lunge--;
    s.nums.forEach(n => { n.t++; n.y -= n.t < 6 ? 1 : 0.5; }); s.nums = s.nums.filter(n => n.t < 14);
    s.fx.forEach(f => f.t++); s.fx = s.fx.filter(f => f.t < f.life);
    const heroFront = s.heroX + 40;
    s.coins.forEach(c => {
      c.t++;
      if (c.t < 8) { c.x += c.vx; c.y += c.vy; c.vy += 0.6; if (c.y > H - 7) { c.y = H - 7; c.vy *= -0.4; } }
      else { c.x += (s.heroX + 24 - c.x) * 0.35; c.y += (36 - c.y) * 0.35; }
    });
    const got = s.coins.filter(c => c.t >= 12).length;
    if (got) { bstats.gold += got; }
    s.coins = s.coins.filter(c => c.t < 12);
    const m = s.mon;
    const moving = () => { s.scroll += 2; if (s.fire) s.fire.x -= 2; if (s.fire && s.fire.x < -20) s.fire = null; };
    if (s.mode === 'run') {
      moving();
      if (!m) { if (--s.spawn <= 0) spawn(); }
      else {
        m.walk++;
        m.x -= 2 + MON[m.type].speed;
        if (m.x <= heroFront + (GUNS[eq.weapon] ? 30 : 7)) { s.mode = 'fight'; s.atkT = 2; s.monT = 6; }
      }
    } else if (s.mode === 'fight' && m) {
      if (m.flash) m.flash--;
      if (m.lunge) m.lunge--;
      if (m.dead) {
        if (++m.dead > 7) {
          s.mon = null; s.spawn = 10 + ((Math.random() * 18) | 0);
          bstats.kills++; if (m.elite || m.boss) bstats.elites++;
          saveStats(); if (killEl) killEl.textContent = '☠ ' + bstats.kills;
          if (s.hp < s.max * 0.4) startHeal(); else s.mode = 'run';
        }
        return;
      }
      // hero attack cycle: raise 2 ticks, strike, recover
      s.atkT--;
      const gun = !!GUNS[eq.weapon];
      if (s.atkT === 2) s.pose = gun ? '' : 'raise';
      if (s.atkT <= 0) {
        s.pose = ''; s.atkT = gun ? 6 : 7; s.lunge = gun ? 0 : 2;
        let d = Math.round(S.atk * (0.75 + Math.random() * 0.5));
        const crit = Math.random() < 0.12; if (crit) d *= 2;
        if (gun) {
          const by = 3 + (ITEM_BY_ID[eq.armor] ? 37 : 35) - 3, mx0 = s.heroX + (ITEM_BY_ID[eq.armor] ? 34 : 32) + 14;
          s.fx.push({ k: 'shot', x: mx0, y: by, tx: m.x + 4, t: 0, life: 3 });
          s.fx.push({ k: 'flash', x: mx0, y: by, t: 0, life: 2 });
        } else s.fx.push({ k: 'slash', x: heroFront - 6, y: 26, t: 0, life: 3 });
        m.hp -= d; m.flash = 2; m.x += 1;
        const mc = MON[m.type];
        addNum(m.x + mc.w / 2 - 4, H - 8 - mc.h - 2, d, crit ? '#ffd040' : '#fff6e0');
        if (m.hp <= 0) {
          m.dead = 1;
          s.fx.push({ k: 'poof', x: m.x + mc.w / 2, y: H - 6 - mc.h / 2, t: 0, life: 8, r: Math.max(6, mc.h / 2) });
          const n = m.boss ? 9 : m.elite ? 6 : 2 + ((Math.random() * 3) | 0);
          for (let i = 0; i < n; i++) s.coins.push({ x: m.x + mc.w / 2, y: H - 10 - mc.h / 2, vx: -1.5 - Math.random() * 2, vy: -3 - Math.random() * 2, t: 0 });
          return;
        }
      }
      // monster attack
      if (--s.monT <= 0) {
        const mc = MON[m.type];
        s.monT = m.boss ? 9 : 10; m.lunge = 2;
        // hits scale with his max HP so heals still happen at any level; armor softens them
        let d = Math.max(1, Math.round(s.max * (0.03 + 0.012 * mc.dmg) * (m.elite ? 1.4 : 1) * (0.7 + Math.random() * 0.6) * (1 - S.arm / (S.arm + 40))));
        if (s.hp - d < s.max * 0.12) { addNum(s.heroX + 18, 14, 'BLOCK', '#a8c8ff'); s.fx.push({ k: 'block', x: heroFront - 4, y: 30, t: 0, life: 3 }); }
        else { s.hp -= d; s.flashH = 2; addNum(s.heroX + 20, 14, d, '#ff6050'); }
      }
    } else if (s.mode === 'potion') {
      s.potion++;
      if (s.potion >= 6 && s.potion % 2 === 0 && s.hp < s.max) { const h = Math.ceil(s.max / 5); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 14 + (s.potion % 4) * 2, 12, '+' + h, '#70ff70'); }
      if (s.potion > 16) { s.mode = 'run'; s.potion = 0; }
    } else if (s.mode === 'rest') {
      s.potion++;
      if (s.potion > 6 && s.potion % 6 === 0 && s.hp < s.max) { const h = Math.ceil(s.max / 8); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 16, 18, '+' + h, '#70ff70'); }
      if (s.potion > 60 || (s.hp >= s.max && s.potion > 30)) { s.mode = 'run'; s.potion = 0; }
    }
  }
  function startHeal() {
    st.potion = 0;
    if (Math.random() < 0.55) st.mode = 'potion';
    else { st.mode = 'rest'; st.fire = { x: st.heroX + 46 }; }
  }

  // ---------- drawing ----------
  function tiled(c, off, y) {
    const w = c.width; let x = -(((off % w) + w) % w);
    for (; x < W; x += w) g.drawImage(c, Math.round(x), y);
  }
  function legShift(c, phase) {
    // running: lift one leg 2px by redrawing the lower body halves
    const k = '_run' + phase;
    if (c[k]) return c[k];
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext('2d');
    x.drawImage(c, 0, 0, c.width, 47, 0, 0, c.width, 47);
    const lift = phase ? [0, 2] : [2, 0];
    x.drawImage(c, 0, 47, 24, 17, 0, 47 - lift[0], 24, 17);
    x.drawImage(c, 24, 47, 24, 17, 24, 47 - lift[1], 24, 17);
    return (c[k] = o);
  }
  function sitOf(c) {
    if (c._sit) return c._sit;
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext('2d');
    x.drawImage(c, 0, 55, c.width, 9, 0, 55, c.width, 9);
    x.drawImage(c, 0, 0, c.width, 47, 0, 10, c.width, 47);
    return (c._sit = o);
  }
  const FIRE = [
    ['..y..', '.yoy.', 'yoOoy', 'oOWOo', 'rOWOr', '.rOr.'],
    ['.y...', '..yy.', '.yoOy', 'yOWOo', 'rOWOr', '.rOr.'],
    ['...y.', '.yy..', 'yOoy.', 'oOWOy', 'rOWOr', '.rOr.']
  ];
  const FC = { y: '#ffcf5a', o: '#ff8a2a', O: '#ff6018', W: '#fff2b0', r: '#c02a10' };
  function drawFire(fx, t) {
    const x = Math.round(fx), y = H - 7;
    const gr = g.createRadialGradient(x, y - 4, 1, x, y - 4, 26);
    gr.addColorStop(0, 'rgba(255,140,50,' + (0.3 + 0.06 * (t % 2)) + ')'); gr.addColorStop(1, 'rgba(255,140,50,0)');
    g.fillStyle = gr; g.fillRect(x - 26, y - 30, 52, 36);
    // stones and crossed logs
    g.fillStyle = '#4a3a2c'; [[-7, 0], [-5, -1], [5, -1], [7, 0], [-1, 1], [2, 1]].forEach(([dx, dy]) => g.fillRect(x + dx - 1, y + dy - 1, 2, 2));
    g.fillStyle = '#5a3a20'; for (let i = -5; i <= 5; i++) g.fillRect(x + i, y - 1 - Math.round(Math.abs(i) * 0.2), 1, 2);
    g.fillStyle = '#2a1a0e'; g.fillRect(x - 5, y, 11, 1);
    const f = FIRE[t % 3];
    for (let j = 0; j < f.length; j++) for (let i = 0; i < 5; i++) {
      const c = FC[f[j][i]]; if (!c) continue;
      g.fillStyle = c; g.fillRect(x - 2 + i, y - 8 + j, 1, 1);
    }
    if (t % 4 === 0) { g.fillStyle = '#ffb040'; g.fillRect(x + (t % 8 ? 1 : -2), y - 11 - (t % 3), 1, 1); }
  }
  function bar(x, y, w, frac, col) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#0c0705'; g.fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle = '#3a1210'; g.fillRect(x, y, w, 2);
    g.fillStyle = col; g.fillRect(x, y, Math.max(0, Math.round(w * frac)), 2);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, Math.max(0, Math.round(w * frac)), 1);
  }
  function draw() {
    const s = st;
    g.clearRect(0, 0, W, H);
    tiled(layers.far, s.scroll * 0.25, 0);
    tiled(layers.mid, s.scroll * 0.6, 0);
    tiled(layers.fl, s.scroll, H - 8);
    if (s.fire) drawFire(s.fire.x, s.t);
    // hero
    const base = heroSprite(s.pose);
    let img = base, hy = 3;
    if (s.mode === 'run') { img = legShift(base, (s.t >> 1) & 1); hy += ((s.t >> 1) & 1) ? 0 : -1; }
    else if (s.mode === 'rest') img = sitOf(base);
    const hx = s.heroX + (s.lunge ? 3 : 0);
    g.drawImage(img, hx, hy);
    if (s.flashH) { g.globalAlpha = 0.6; g.drawImage(whiteOf(img), hx, hy); g.globalAlpha = 1; }
    if (s.mode === 'potion') {
      // red flask lifted from the belt to the mouth
      const p = Math.min(1, s.potion / 5), fx = hx + 16, fy = Math.round(hy + 34 - p * 18);
      g.fillStyle = '#0c0705'; g.fillRect(fx - 1, fy - 3, 5, 7);
      g.fillStyle = '#c8b8a0'; g.fillRect(fx + 1, fy - 3, 1, 1); g.fillStyle = '#8a6a4a'; g.fillRect(fx + 1, fy - 2, 1, 1);
      g.fillStyle = '#b01c1c'; g.fillRect(fx, fy - 1, 3, 4); g.fillStyle = '#ff7070'; g.fillRect(fx, fy - 1, 1, 2); g.fillStyle = '#ffd0d0'; g.fillRect(fx, fy - 1, 1, 1);
    }
    // hero HP bar
    bar(hx + 14, 1, 20, s.hp / s.max, s.hp / s.max > 0.4 ? '#50d050' : '#e0a030');
    // monster
    const m = s.mon;
    if (m) {
      const mc = MON[m.type], spr = monCanvas(m.type);
      const bob = m.dead ? 0 : (s.mode === 'run' ? ((m.walk >> 1) & 1) : 0);
      const mx = Math.round(m.x - (m.lunge ? 3 : 0)), my = H - 6 - mc.h - bob;
      if (!m.dead || m.dead < 3) {
        if (m.elite || m.boss) {
          const gr = g.createRadialGradient(mx + mc.w / 2, my + mc.h / 2, 2, mx + mc.w / 2, my + mc.h / 2, mc.h * 0.8);
          const c = m.boss ? '170,100,255' : '255,200,80';
          gr.addColorStop(0, 'rgba(' + c + ',.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
          g.fillStyle = gr; g.fillRect(mx - mc.h, my - mc.h / 2, mc.w + mc.h * 2, mc.h * 2);
        }
        g.globalAlpha = m.dead ? 0.5 : 1;
        g.drawImage(spr.c, mx, my);
        if (m.flash || m.dead) { g.globalAlpha = m.dead ? 0.5 : 0.55; g.drawImage(spr.f, mx, my); }
        g.globalAlpha = 1;
      }
      if (!m.dead && (s.mode === 'fight' || m.boss || m.elite)) bar(mx + mc.w / 2 - 8, my - 5, 16, Math.max(0, m.hp / m.max), m.boss ? '#b070ff' : m.elite ? '#ffc040' : '#d04030');
    }
    // effects
    for (const f of s.fx) {
      if (f.k === 'slash') {
        const col = ['#ffffff', '#ffe8b0', '#c08040'][f.t] || '#c08040';
        g.fillStyle = col;
        for (let i = 0; i < 14; i++) {
          const a = -1.2 + i * 0.18 + f.t * 0.25;
          for (const r of [12, 13, 14]) { if (r === 14 && (i < 3 || i > 10)) continue; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + 6 + Math.sin(a) * r), 1, 1); }
        }
      } else if (f.k === 'shot') {
        const p = (f.t + 1) / 3, x0 = f.x + (f.tx - f.x) * (p - 0.33), x1 = f.x + (f.tx - f.x) * p;
        g.fillStyle = '#ffe080'; g.fillRect(Math.round(x0), f.y, Math.max(1, Math.round(x1 - x0)), 1);
        g.fillStyle = '#fff6d0'; g.fillRect(Math.round(x1) - 2, f.y, 2, 1);
      } else if (f.k === 'flash') {
        g.fillStyle = '#fff2a0'; g.fillRect(f.x, f.y - 1, 3, 3); g.fillStyle = '#ffb040'; g.fillRect(f.x + 3, f.y, 2, 1); g.fillRect(f.x + 1, f.y - 2, 1, 1); g.fillRect(f.x + 1, f.y + 2, 1, 1);
      } else if (f.k === 'block') {
        g.fillStyle = '#a8c8ff'; for (let i = 0; i < 6; i++) g.fillRect(f.x + ((i * 3) % 5), f.y - 6 + i * 2, 1, 1);
      } else if (f.k === 'poof') {
        const r = f.r * (0.4 + f.t / f.life);
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + i, rr = r * (0.6 + ((i * 7) % 5) / 10);
          g.fillStyle = i % 3 ? 'rgba(150,140,130,' + (1 - f.t / f.life) + ')' : 'rgba(230,220,200,' + (1 - f.t / f.life) + ')';
          g.fillRect(Math.round(f.x + Math.cos(a) * rr), Math.round(f.y + Math.sin(a) * rr * 0.7), 2, 2);
        }
      }
    }
    for (const c of s.coins) { g.fillStyle = '#5a3a08'; g.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 3, 3); g.fillStyle = (s.t + c.t) % 2 ? '#ffe070' : '#d8a030'; g.fillRect(Math.round(c.x), Math.round(c.y), 1, 1); }
    for (const n of s.nums) text(g, n.v, n.x, n.y, n.col);
  }

  // ---------- lifecycle ----------
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function enabled() { return localStorage.getItem(BAT_KEY) !== '0'; }
  function size() {
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(1.34 * dpr));
    scale = k / dpr;
    const cssW = wrap.clientWidth || window.innerWidth;
    W = Math.ceil(cssW / scale);
    cv.width = W; cv.height = H;
    cv.style.width = (W * scale) + 'px'; cv.style.height = (H * scale) + 'px';
    wrap.style.height = (H * scale) + 'px';
    document.documentElement.style.setProperty('--strip-h', (H * scale) + 'px');
    g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    if (st) { st.heroX = Math.max(6, Math.min(40, Math.round(W * 0.08))); if (st.mon && st.mon.x > W + 4) st.mon.x = W + 4; if (layers) draw(); }
  }
  function loop() {
    timer = 0;
    if (!on || document.hidden) return;
    tick(); draw();
    timer = setTimeout(loop, 1000 / FPS);
  }
  function start() {
    if (timer || !on || document.hidden) return;
    if (reduced()) { draw(); return; }
    loop();
  }
  function stop() { if (timer) clearTimeout(timer); timer = 0; }
  function mount() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.id = 'battlestrip'; wrap.className = 'battlestrip';
    wrap.setAttribute('role', 'button'); wrap.setAttribute('aria-label', 'Open Armory');
    cv = document.createElement('canvas'); cv.className = 'battlecv';
    killEl = document.createElement('span'); killEl.className = 'battlekills';
    wrap.append(cv, killEl);
    document.body.append(wrap);
    wrap.onclick = () => { if (typeof openArmory === 'function') openArmory(); };
    window.addEventListener('resize', () => { if (on) size(); });
  }
  function apply() {
    on = enabled() && !!window.PLPixel;
    document.documentElement.classList.toggle('battle-on', on);
    const b = document.getElementById('bat');
    if (b) { b.classList.toggle('off', !on); b.setAttribute('aria-label', on ? 'Battle on' : 'Battle off'); }
    if (on) {
      mount(); wrap.hidden = false;
      if (!layers) buildLayers();
      if (!st) st = freshState();
      size(); killEl.textContent = '☠ ' + bstats.kills;
      draw(); start();
    } else { stop(); if (wrap) wrap.hidden = true; document.documentElement.style.setProperty('--strip-h', '0px'); }
    if (typeof renderDock === 'function') renderDock();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); saveStats(); } else start(); });
  window.PLBattle = {
    init() {
      const b = document.getElementById('bat');
      if (b && !b._wired) { b._wired = 1; b.onclick = () => { localStorage.setItem(BAT_KEY, enabled() ? '0' : '1'); apply(); }; }
      apply();
    },
    active() { return on; },
    stats(eq, level) { return stats(eq || eqNow(), level || lvl()); },
    kills() { return bstats; },
    reset() { bstats = { kills: 0, elites: 0, gold: 0 }; saveStats(); localStorage.removeItem(STAT_KEY); st = null; if (on) { st = freshState(); size(); if (killEl) killEl.textContent = '☠ 0'; } },
    // preview hook: freeze a scene for screenshots
    _scene(opts) {
      st = freshState(); size(); Object.assign(st, opts.st || {});
      if (opts.mon) { const m = MON[opts.mon]; st.mon = Object.assign({ type: opts.mon, x: st.heroX + 47, hp: m.hp, max: m.hp, flash: 0, lunge: 0, dead: 0, walk: 0 }, opts.monSt || {}); }
      stop(); draw();
    },
    _tick(n) { for (let i = 0; i < n; i++) tick(); draw(); },
    _state() { return st; },
    _stop() { stop(); }
  };
})();
