// Pixel-art renderer for the hero, his gear and the Reliquary Chest.
// Original art drawn in code (no copied sprites, no trademarked designs). Small sprites are shaded,
// outlined and rim-lit by the campfire, then shown with nearest-neighbour scaling to match the cave backdrop.
'use strict';
(function () {
  const RAMP = {
    skin: ['#2e1a12', '#5e3a28', '#94603f', '#c48a62', '#e6b88e'],
    dirt: ['#24160e', '#46301f', '#6a4c33', '#8c6a4a', '#a88a66'],
    cloth: ['#1a110a', '#352416', '#553b23', '#765633', '#977648'],
    rag: ['#151010', '#2a221d', '#433830', '#5e5143', '#7a6a58'],
    leather: ['#170c07', '#331c0e', '#552f17', '#7a4724', '#9c6436'],
    wood: ['#160c06', '#34200f', '#583619', '#7c5026', '#9c6c38'],
    iron: ['#121216', '#2c2c33', '#52525a', '#82828a', '#c2beb6'],
    steel: ['#16181c', '#373b43', '#626a74', '#9ca4ae', '#e6ebf0'],
    rust: ['#24100a', '#4a2212', '#76391b', '#a0572b', '#c47d45'],
    gold: ['#2a1905', '#64400f', '#a2741d', '#dcac3e', '#fff0a2'],
    brass: ['#26180a', '#563a14', '#8a6224', '#b88a3c', '#e2be70'],
    bone: ['#2a2216', '#625644', '#a2967c', '#d6caae', '#f6eedc'],
    blood: ['#1a0505', '#460c0c', '#7a1515', '#b02822', '#de5a3e'],
    night: ['#050509', '#11111e', '#212138', '#383858', '#66668e'],
    crimson: ['#170404', '#3a0909', '#661313', '#912020', '#bb3a2e'],
    ash: ['#100f0e', '#232120', '#3a3733', '#544f49', '#706861'],
    capeN: ['#07050c', '#141024', '#241e3e', '#372e5c', '#544c86'],
    parch: ['#463620', '#867046', '#bca474', '#e2cc9c', '#fff4d0'],
    wax: ['#280404', '#560a0a', '#8a1414', '#c02828', '#ee6060'],
    hair: ['#0e0704', '#22130a', '#382110', '#503018', '#684220'],
    leaf: ['#0b1707', '#18300f', '#2b541a', '#46842c', '#76b448'],
    stone: ['#121110', '#26221d', '#3e382f', '#5a5248', '#786e62'],
    soil: ['#0e0a07', '#1e1610', '#30241a', '#463626', '#5c4834'],
    plume: ['#1a0303', '#420808', '#741010', '#a81c18', '#d84030'],
    flesh: ['#141a12', '#2c3626', '#4a5a3e', '#6e8058', '#98a87a'],
    sick: ['#0e1406', '#22300c', '#3e5414', '#62801e', '#9ab83a'],
    demon: ['#1a0604', '#40100a', '#701c10', '#a02e18', '#d05028'],
    fur: ['#120c0a', '#2a201a', '#463628', '#62503c', '#7e6a52'],
    glass: ['#2a0606', '#6a0e0e', '#b01c1c', '#e04040', '#ffa0a0'],
    drab: ['#12140c', '#262a18', '#3e4428', '#5a623c', '#7a8454'],
    khaki: ['#1a160c', '#3a3018', '#5e4e2a', '#86723e', '#ae9858'],
    urban: ['#0e1014', '#222833', '#3a4452', '#566474', '#7a8a9a'],
    robeB: ['#07081a', '#141834', '#232a56', '#36407a', '#5260a4'],
    robeP: ['#120618', '#2a0e36', '#46185a', '#662a80', '#8c44a8'],
    crystal: ['#06202a', '#0e4454', '#1a7890', '#40b0c8', '#a0f0ff']
  };
  const FLAT = {
    void: [10, 6, 5, 255], glowY: [255, 240, 170, 255], glowC: [190, 246, 255, 255], glowR: [255, 110, 60, 255],
    ember: [255, 170, 60, 255], white: [255, 250, 230, 255], shadow: [0, 0, 0, 120], smoke: [150, 140, 130, 120],
    fire: [255, 120, 30, 255], glowG: [170, 255, 120, 255], glowP: [210, 150, 255, 255]
  };
  const NONSOLID = { shadow: 1, smoke: 1 };
  const OUTLINE = [12, 7, 5, 255];
  const RIM = [255, 140, 60];
  const hexes = {};
  function hx(c) {
    if (hexes[c]) return hexes[c];
    return (hexes[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255]);
  }

  function Spr(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.mat = new Int16Array(n).fill(-1);
    this.part = new Int16Array(n).fill(-1);
    this.off = new Int8Array(n);
    this.ox = 0; this.oy = 0; this.k = 1; this.pid = -1; this.parts = []; this.mats = []; this.mi = {}; this.glows = [];
  }
  Spr.prototype.P = function (o) { this.pid++; this.parts.push(o || {}); return this; };
  Spr.prototype.m = function (name) {
    let i = this.mi[name];
    if (i == null) { i = this.mats.length; this.mats.push(name); this.mi[name] = i; }
    return i;
  };
  Spr.prototype.px = function (x, y, mat, off) {
    if (this.k !== 1) {
      const b = Math.max(1, Math.round(this.k)), X = Math.floor(x * this.k), Y = Math.floor(y * this.k), k = this.k;
      this.k = 1;
      for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) this.px(X + i, Y + j, mat, off);
      this.k = k; return;
    }
    x = Math.floor(x) + this.ox; y = Math.floor(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (mat == null) { this.mat[i] = -1; this.part[i] = -1; return; }
    this.mat[i] = this.m(mat); this.part[i] = this.pid; this.off[i] = off || 0;
  };
  // Tone tweak on existing pixels of the current drawing (engraving, folds) without changing part
  Spr.prototype.tone = function (x, y, d) {
    if (this.k !== 1) {
      const b = Math.max(1, Math.round(this.k)), X = Math.floor(x * this.k), Y = Math.floor(y * this.k), k = this.k;
      this.k = 1;
      for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) this.tone(X + i, Y + j, d);
      this.k = k; return;
    }
    x = Math.floor(x) + this.ox; y = Math.floor(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] >= 0) this.off[i] = d;
  };
  Spr.prototype.rect = function (x, y, w, h, mat, off) {
    if (this.k !== 1) {
      const k = this.k, X0 = Math.round(x * k), Y0 = Math.round(y * k), X1 = Math.max(X0 + 1, Math.round((x + w) * k)), Y1 = Math.max(Y0 + 1, Math.round((y + h) * k));
      this.k = 1; this.rect(X0, Y0, X1 - X0, Y1 - Y0, mat, off); this.k = k; return;
    }
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, mat, off);
  };
  Spr.prototype.poly = function (pts, mat, off) {
    if (this.k !== 1) { const k = this.k; this.k = 1; this.poly(pts.map(p => [p[0] * k, p[1] * k]), mat, off); this.k = k; return; }
    let y0 = 1e9, y1 = -1e9;
    pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const sy = y + 0.5, xs = [];
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x + 0.5 < xs[k + 1]; x++) this.px(x, y, mat, off);
      }
    }
  };
  Spr.prototype.ell = function (cx, cy, rx, ry, mat, off) {
    if (this.k !== 1) { const k = this.k; this.k = 1; this.ell(cx * k, cy * k, rx * k, ry * k, mat, off); this.k = k; return; }
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.px(x, y, mat, off);
    }
  };
  Spr.prototype.line = function (x0, y0, x1, y1, mat, off) {
    if (this.k !== 1) {
      const k = this.k, b = Math.max(1, Math.round(k));
      this.k = 1;
      const X0 = Math.round(x0 * k), Y0 = Math.round(y0 * k), X1 = Math.round(x1 * k), Y1 = Math.round(y1 * k);
      for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) this.line(X0 + i, Y0 + j, X1 + i, Y1 + j, mat, off);
      this.k = k; return;
    }
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, mat, off);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  };
  Spr.prototype.glow = function (x, y, r, c, a, under) { this.glows.push([x * this.k + this.ox, y * this.k + this.oy, r * this.k, FLAT[c] || hx(c), a == null ? 0.7 : a, !!under]); };

    Spr.prototype.render = function () {
    const w = this.w, h = this.h, n = w * h;
    const out = new Uint8ClampedArray(n * 4);
    const part = this.part, mat = this.mat;
    const solid = new Uint8Array(n);
    for (let i = 0; i < n; i++) solid[i] = mat[i] >= 0 && !NONSOLID[this.mats[mat[i]]] ? 1 : 0;
    const same = (x, y, p) => x >= 0 && y >= 0 && x < w && y < h && part[y * w + x] === p;
    const run = (x, y, dx, dy, p, max) => { let k = 0; while (k < max && same(x + dx * (k + 1), y + dy * (k + 1), p)) k++; return k; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mat[i] < 0) continue;
      const name = this.mats[mat[i]], p = part[i], o = this.parts[p] || {};
      let c;
      if (FLAT[name]) c = FLAT[name];
      else {
        const ramp = RAMP[name] || RAMP.iron;
        let t = 2;
        if (!o.flat) {
          const dl = run(x, y, -1, 0, p, 8), dr = run(x, y, 1, 0, p, 8), du = run(x, y, 0, -1, p, 3), dd = run(x, y, 0, 1, p, 3);
          if (du === 0) t += 1;
          if (dl === 0) t += 1;
          if (dr === 0) t -= 1;
          if (dd === 0) t -= 1;
          if (o.round !== false && dl + dr >= 4) {
            const f = (dl + 0.5) / (dl + dr + 1);
            if (f < 0.3) t += 1; else if (f > 0.72) t -= 1;
            if (o.shine && f > 0.18 && f < 0.36 && du >= 1 && du <= 2) t = 4;
          }
          // contact shadow where a later part sits on top of this one
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = x + ax, Y = y + ay;
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
            const q = part[Y * w + X];
            if (q > p && solid[Y * w + X] && !(this.parts[q] || {}).nocs) { t -= 1; break; }
          }
        }
        t += this.off[i];
        if (this.off[i] >= 10) t = this.off[i] - 10;
        t = Math.max(0, Math.min(4, t));
        c = hx(ramp[t]);
        // warm rim light from the campfire on the right-hand silhouette
        let open = 0;
        for (let k = 1; k <= 3; k++) if (x + k >= w || !solid[y * w + x + k]) open++;
        if (!o.flat && o.rim !== false && solid[i] && open === 3 && x >= 20 && y > 4) {
          const k = y > 26 ? 0.38 : 0.22;
          c = [Math.round(c[0] * (1 - k) + RIM[0] * k), Math.round(c[1] * (1 - k) + RIM[1] * k * 0.9), Math.round(c[2] * (1 - k) + RIM[2] * k * 0.7), 255];
        }
      }
      out.set(c, i * 4);
    }
    // 1px dark outline around the solid silhouette
    const orig = solid.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (orig[i]) continue;
      if ((x > 0 && orig[i - 1]) || (x < w - 1 && orig[i + 1]) || (y > 0 && orig[i - w]) || (y < h - 1 && orig[i + w])) {
        out.set(OUTLINE, i * 4); solid[i] = 2;
      }
    }
    // dithered pixel glows
    for (const [gx, gy, r, c, a0, under] of this.glows) {
      for (let y = Math.floor(gy - r); y <= gy + r; y++) for (let x = Math.floor(gx - r); x <= gx + r; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy) / r;
        if (d >= 1) continue;
        let a = a0 * Math.pow(1 - d, 1.6);
        a = Math.round(a * 6) / 6;
        if (a <= 0) continue;
        const i = y * w + x, j = i * 4;
        if (solid[i]) {
          if (under) continue;
          out[j] = out[j] + c[0] * a; out[j + 1] = out[j + 1] + c[1] * a; out[j + 2] = out[j + 2] + c[2] * a;
        } else {
          const A = out[j + 3] / 255;
          const na = Math.min(1, a + A * (1 - a));
          out[j] = (c[0] * a + out[j] * A * (1 - a)) / na; out[j + 1] = (c[1] * a + out[j + 1] * A * (1 - a)) / na;
          out[j + 2] = (c[2] * a + out[j + 2] * A * (1 - a)) / na; out[j + 3] = na * 255;
        }
      }
    }
    return out;
  };
  function toCanvas(spr, crop) {
    const data = spr.render();
    let x0 = 0, y0 = 0, x1 = spr.w - 1, y1 = spr.h - 1;
    if (crop === 'auto') {
      x0 = spr.w; y0 = spr.h; x1 = -1; y1 = -1;
      for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) if (data[(y * spr.w + x) * 4 + 3] > 40) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 1; y1 = 1; }
      x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(spr.w - 1, x1 + 1); y1 = Math.min(spr.h - 1, y1 + 1);
    }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) img.data.set(data.subarray(((y + y0) * spr.w + x0) * 4, ((y + y0) * spr.w + x0 + cw) * 4), y * cw * 4);
    cx.putImageData(img, 0, 0);
    return cv;
  }

  // ---------- helpers ----------
  const M = x => 48 - x; // mirror continuous x around the hero's centre line
  const mp = pts => pts.map(p => [M(p[0]), p[1]]);
  function rivet(S, x, y) { S.px(x, y, 'steel', 12); S.px(x + 1, y, 'iron', 10); }
  function seal(S, x, y) {
    S.P({ nocs: true, rim: false });
    S.rect(x + 1, y + 2, 2, 4, 'parch'); S.px(x + 1, y + 6, 'parch', 0); S.tone(x + 2, y + 3, -1); S.tone(x + 2, y + 5, -1);
    S.P({ nocs: true, rim: false });
    S.rect(x, y, 4, 3, 'wax'); S.px(x, y, null); S.px(x + 3, y, null); S.px(x + 1, y - 1, 'wax'); S.px(x + 2, y - 1, 'wax');
    S.px(x + 1, y, 'wax', 13);
  }
  function skull(S, x, y, eyes) {
    S.P({ shine: true });
    S.ell(x, y, 2.6, 2.4, 'bone'); S.rect(Math.floor(x) - 1, Math.floor(y) + 1, 3, 2, 'bone');
    S.px(x - 1, y, eyes || 'void'); S.px(x + 1, y, eyes || 'void'); S.px(x, y + 2, 'void');
  }

  // ---------- hero layers (48 x 64 grid, centre x = 24, feet at y = 61) ----------
  const ARMOR = {
    'arm-iron': ['iron', 'iron'], 'arm-brass': ['iron', 'brass'], 'arm-bone': ['bone', 'iron'], 'arm-night': ['night', 'gold'],
    'arm-blood': ['blood', 'gold'], 'arm-gilt': ['steel', 'gold'], 'arm-halo': ['gold', 'white']
  };
  function drawBase(S, id) {
    S.P({ flat: true }); S.ell(24, 61.5, 15, 2.6, 'shadow');
    if (id === 'base-rubble') {
      S.P(); S.ell(24, 61.5, 14, 2.4, 'soil');
      S.P(); S.poly([[7, 63], [9, 59], [13, 58], [15, 63]], 'stone');
      S.P(); S.poly([[33, 63], [35, 58.5], [39, 58], [42, 63]], 'stone'); S.tone(37, 60, 1);
      S.P(); S.poly([[16, 64], [18, 61], [21, 62], [21, 64]], 'iron');
      S.P(); S.poly([[28, 64], [29, 61.5], [33, 61], [32, 64]], 'rust');
    } else if (id === 'base-gear') {
      S.P({ round: true });
      for (let k = 0; k < 12; k++) {
        const a = Math.PI * 2 * k / 12, x = 24 + Math.cos(a) * 17, y = 61 + Math.sin(a) * 3;
        S.rect(Math.round(x - 1), Math.round(y - 1), 2, 2, 'brass');
      }
      S.ell(24, 61, 16, 2.9, 'brass');
      S.P({ flat: true }); S.ell(24, 61, 11, 1.7, 'brass', -1);
      S.P({ flat: true }); S.ell(24, 61, 5, 1, 'gold', 1);
    } else if (id === 'base-skulls') {
      S.P(); S.ell(24, 61.5, 15, 2.6, 'soil');
      skull(S, 9, 60); skull(S, 39.5, 60); skull(S, 18, 62.5); skull(S, 31, 62.5);
      S.P(); S.line(12, 63, 15, 62, 'bone'); S.P(); S.line(34, 62, 37, 63, 'bone');
    }
  }
  function drawCape(S, id, top) {
    if (!id) return;
    const mat = id === 'cape-crimson' ? 'crimson' : id === 'cape-night' ? 'capeN' : 'ash';
    S.P({ round: true });
    if (id === 'cape-ash') {
      S.poly([[14, top], [34, top], [37, 38], [39, 56], [37, 53], [35, 58], [32, 54], [29, 59], [26, 55], [22, 59], [19, 54],
        [16, 58], [13, 53], [11, 57], [9, 52], [11, 38]], 'ash');
      S.px(12, 44, null); S.px(36, 47, null); S.px(35, 48, null);
    } else {
      S.poly([[14, top], [34, top], [38, 38], [40, 58], [34, 60], [24, 61], [14, 60], [8, 58], [10, 38]], mat);
    }
    for (let y = top + 6; y < 58; y++) { S.tone(12 + (y > 40 ? -1 : 0), y, -1); S.tone(36 + (y > 40 ? 1 : 0), y, -1); }
    if (id === 'cape-night') {
      S.P({ nocs: true, flat: true });
      S.line(8, 58, 14, 60, 'gold', 2); S.line(14, 60, 24, 61, 'gold', 2); S.line(24, 61, 34, 60, 'gold', 2); S.line(34, 60, 40, 58, 'gold', 2);
      S.line(10, 38, 8, 57, 'gold', 1); S.line(38, 38, 40, 57, 'gold', 1);
    }
    if (id === 'cape-crimson') { S.P({ nocs: true, flat: true }); S.line(9, 58, 39, 58, 'crimson', 0); }
  }
  function drawPack(S, id, sy) {
    if (!id) return;
    if (id === 'pack-banner') {
      S.P(); S.rect(7, 1, 2, 56, 'wood');
      S.P({ flat: true }); S.rect(7, 2, 15, 1, 'gold', 2); S.px(6, 1, 'gold', 3); S.px(22, 1, 'gold', 3);
      S.P({ round: true });
      S.poly([[9, 3], [21, 3], [21, 17], [19, 15], [17, 19], [15, 15.5], [13, 19], [11, 15], [9, 17]], 'crimson');
      for (let y = 5; y < 15; y++) { S.tone(13, y, -1); S.tone(18, y, -1); }
      S.P({ nocs: true }); S.rect(9, 3, 12, 1, 'gold');
      skull(S, 15.5, 8.5, 'glowR');
      S.P({ flat: true, nocs: true }); S.line(12, 13, 19, 13, 'gold', 1);
      return;
    }
    if (id === 'pack-rack') {
      S.P(); S.rect(14, sy - 4, 20, 10, 'iron');
      S.P({ flat: true });
      [[13, -15], [17, -19], [31, -19], [35, -15]].forEach(([x, dy], k) => {
        S.line(x, sy - 4, x + (k < 2 ? -2 : 2), sy + dy, 'steel', k % 2 ? 1 : 0);
      });
      skull(S, 15.5, sy - 18.5); skull(S, 33, sy - 16);
      return;
    }
    // box packs
    S.P({ shine: true }); S.rect(15, sy - 5, 18, 12, id === 'pack-censer' ? 'brass' : 'iron', -1);
    S.P();
    if (id === 'pack-iron' || id === 'pack-skull') {
      S.rect(13, sy - 11, 4, 8, 'iron'); S.P(); S.rect(31, sy - 11, 4, 8, 'iron');
      S.P({ flat: true, nocs: true }); S.rect(13, sy - 12, 4, 1, 'void'); S.rect(31, sy - 12, 4, 1, 'void');
      S.rect(13, sy - 9, 4, 1, 'brass', 2); S.rect(31, sy - 9, 4, 1, 'brass', 2);
    }
    if (id === 'pack-censer') {
      S.rect(16, sy - 9, 3, 5, 'gold'); S.rect(29, sy - 9, 3, 5, 'gold');
      S.P({ flat: true }); S.line(14, sy - 3, 6, sy + 10, 'gold', 2);
      S.P({ shine: true }); S.ell(6, sy + 13, 3.2, 3.4, 'brass'); S.rect(4, sy + 9, 5, 1, 'gold');
      S.P({ flat: true, nocs: true }); S.px(5, sy + 13, 'ember'); S.px(7, sy + 13, 'ember'); S.px(6, sy + 14, 'fire');
      S.P({ flat: true });
      [[5, -1], [4, -3], [5, -5], [7, -6], [6, -8], [4, -10], [8, -3]].forEach(([x, dy]) => S.px(x, sy + 9 + dy, 'smoke'));
      S.glow(6, sy + 13.5, 6, 'ember', 0.5);
    }
  }
  function drawFamiliar(S, id) {
    if (id !== 'pack-skull') return;
    S.P({ flat: true }); S.ell(41, 17, 3, 0.8, 'shadow');
    S.P({ flat: true }); S.line(38, 9, 35, 13, 'brass', 2); S.px(34, 14, 'brass', 3);
    S.P({ shine: true }); S.ell(41, 8, 4, 3.8, 'bone'); S.rect(39, 10, 5, 3, 'bone');
    S.tone(40, 5, 1); S.tone(43, 6, -1);
    S.P({ flat: true, nocs: true });
    S.rect(39, 8, 2, 2, 'void'); S.rect(42, 8, 2, 2, 'void'); S.px(41, 11, 'void');
    S.px(39, 12, 'void'); S.px(41, 12, 'void'); S.px(43, 12, 'void');
    S.px(39, 8, 'glowR'); S.px(42, 8, 'glowR');
    S.P({ flat: true }); S.rect(38, 4, 2, 1, 'brass', 3); S.px(37, 3, 'glowY');
    S.glow(40.5, 8.5, 4, 'glowR', 0.6); S.glow(37.5, 3.5, 3, 'glowY', 0.5);
  }
  function drawLegs(S, eq) {
    const a = ARMOR[eq.armor];
    if (!a) {
      S.P(); S.rect(20, 44, 2, 14, 'skin', -1); S.P(); S.rect(26, 44, 2, 14, 'skin', -1);
      S.tone(20, 50, 0); S.tone(27, 51, -2);
      S.P(); S.rect(18, 57, 5, 4, 'rag'); S.tone(19, 58, 1); S.tone(21, 59, -1);
      S.P(); S.rect(25, 57, 5, 4, 'rag'); S.tone(26, 59, -1); S.tone(28, 58, 1);
      return;
    }
    const [pl, tr] = a;
    S.P(); S.rect(17, 36, 6, 11, pl === 'gold' ? 'gold' : 'iron', -1);
    S.P(); S.rect(25, 36, 6, 11, pl === 'gold' ? 'gold' : 'iron', -1);
    S.P({ shine: true }); S.poly([[15, 49], [23, 49], [23, 57], [14.5, 57]], pl);
    S.P({ shine: true }); S.poly([[25, 49], [33, 49], [33.5, 57], [25, 57]], pl);
    S.tone(19, 53, 1); S.tone(29, 53, 1);
    S.P({ shine: true }); S.ell(19, 48, 4.3, 2.8, tr === 'white' ? 'gold' : tr); S.P({ shine: true }); S.ell(29, 48, 4.3, 2.8, tr === 'white' ? 'gold' : tr);
    S.P(); S.poly([[13, 57], [23, 57], [23, 61], [12, 61]], 'iron');
    S.P(); S.poly([[25, 57], [35, 57], [36, 61], [25, 61]], 'iron');
    S.tone(14, 58, 1); S.tone(26, 58, 1);
  }
  function drawTorso(S, eq) {
    const a = ARMOR[eq.armor];
    if (!a) {
      // scrawny peon in a ragged sack robe
      S.P({ round: true });
      S.poly([[18.5, 19], [29.5, 19], [31.5, 30], [33, 44], [31, 46], [29.5, 43], [27, 47], [24.5, 44], [22, 47.5], [19.5, 43.5],
        [17, 46], [15, 44], [16.5, 30]], 'cloth');
      for (let y = 32; y < 45; y++) { S.tone(20 + (y > 38 ? -1 : 0), y, -1); S.tone(28 + (y > 38 ? 1 : 0), y, -1); }
      S.tone(23, 23, 1); S.tone(24, 24, 1);
      S.P(); S.rect(25, 35, 3, 3, 'rag'); S.P({ flat: true, nocs: true }); S.px(24, 35, 'leather', 3); S.px(28, 37, 'leather', 3);
      S.P({ round: false }); S.line(16, 30, 32, 29, 'leather'); S.line(22, 30, 21, 35, 'leather', -1); S.px(21, 36, 'leather', 1);
      S.P(); S.rect(22, 17, 4, 3, 'skin', -1);
      return;
    }
    const [pl, tr] = a;
    // faulds and belt
    S.P({ shine: true }); S.poly([[16, 33], [32, 33], [33.5, 38], [14.5, 38]], pl); S.tone(18, 36, -1); S.tone(30, 36, -1);
    for (let x = 16; x < 33; x++) S.tone(x, 37, -1);
    S.P({ nocs: false }); S.rect(16, 33, 16, 2, tr === 'white' ? 'gold' : (tr === 'iron' ? 'leather' : tr));
    S.P({ nocs: true }); S.rect(22, 33, 4, 2, 'gold', 1);
    if (eq.armor === 'arm-gilt' || eq.armor === 'arm-halo' || eq.armor === 'arm-blood') {
      S.P({ round: true }); S.poly([[21, 35], [27, 35], [27.5, 50], [24, 52], [20.5, 50]], 'crimson');
      S.tone(23, 40, 1); S.tone(23, 44, 1);
      S.P({ nocs: true, flat: true }); S.line(21, 49, 24, 51, 'gold', 2); S.line(24, 51, 27, 49, 'gold', 2);
      S.px(24, 39, 'gold', 3); S.px(23, 40, 'gold', 2); S.px(25, 40, 'gold', 2); S.px(24, 41, 'gold', 3);
    }
    // breastplate
    S.P({ shine: true, round: true });
    S.poly([[15, 18], [33, 18], [34.5, 24], [32.5, 33], [15.5, 33], [13.5, 24]], pl);
    S.line(17, 25, 23, 27, pl, -1); S.line(25, 27, 31, 25, pl, -1);
    for (let y = 20; y < 32; y++) S.tone(24, y, y < 27 ? 1 : 0);
    for (let x = 18; x < 31; x++) S.tone(x, 30, -1);
    // collar
    S.P({ shine: true }); S.rect(18, 15, 12, 4, pl === 'gold' ? 'iron' : tr); S.tone(19, 16, 1);
    // chest emblem: a winged eye-gem (original)
    const em = tr === 'iron' ? 'iron' : (tr === 'white' ? 'white' : tr);
    S.P({ nocs: true, flat: true });
    S.line(18, 21, 22, 23, em, 3); S.line(30, 21, 26, 23, em, 3); S.line(19, 22, 22, 24, em, 1); S.line(29, 22, 26, 24, em, 1);
    S.P({ shine: true }); S.ell(24, 23, 2.2, 2.2, em === 'iron' ? 'steel' : 'gold');
    if (pl !== 'iron' || tr !== 'iron') { S.P({ flat: true, nocs: true }); S.px(24, 23, eq.armor === 'arm-night' ? 'glowC' : 'glowR'); }
    if (eq.armor === 'arm-iron' || eq.armor === 'arm-brass') { rivet(S, 16, 20); rivet(S, 31, 20); rivet(S, 16, 30); rivet(S, 31, 30); }
    if (eq.armor === 'arm-bone') {
      S.P({ flat: true, nocs: true });
      for (let k = 0; k < 3; k++) { S.line(17, 26 + k * 2, 21, 27 + k * 2, 'iron', 1); S.line(31, 26 + k * 2, 27, 27 + k * 2, 'iron', 1); }
    }
    if (eq.armor === 'arm-gilt' || eq.armor === 'arm-halo') {
      S.P({ nocs: true, flat: true }); S.line(15, 18, 33, 18, 'gold', 3); S.line(16, 32, 32, 32, 'gold', 2);
      S.line(14, 24, 15, 31, 'gold', 2); S.line(34, 24, 33, 31, 'gold', 1);
      seal(S, 17, 27);
      if (eq.armor === 'arm-halo') seal(S, 28, 28);
    }
  }
  function drawArm(S, eq, side) {
    const a = ARMOR[eq.armor];
    const f = side === 'L' ? (p => p) : mp;
    if (!a) {
      S.P(); S.poly(f([[15, 21], [18.5, 20], [17.5, 27], [15, 28]]), 'cloth');
      S.P(); S.poly(f([[15, 27], [17.5, 27], [17, 35], [15, 35]]), 'skin', -1);
      S.P({ shine: true }); S.ell(side === 'L' ? 16 : 32, 36, 1.8, 1.8, 'skin');
      return;
    }
    const [pl, tr] = a;
    S.P({ shine: true }); S.poly(f([[10, 22], [15, 21], [16, 30], [11, 31]]), pl);
    S.P({ shine: true }); S.poly(f([[10, 30], [16.5, 30], [16.5, 36], [10, 36]]), pl);
    S.P({ nocs: true }); S.rect(side === 'L' ? 10 : 31, 30, 7, 1, tr === 'white' ? 'gold' : tr);
    S.P({ shine: true }); S.ell(side === 'L' ? 13.2 : 34.8, 38, 3.6, 2.8, 'iron');
    S.tone(side === 'L' ? 12 : 34, 37, 1);
  }
  function drawPauldrons(S, id, armored) {
    if (!id) return;
    const mat = (id === 'paul-gilt' || id === 'paul-sun') ? 'gold' : id === 'paul-bone' ? 'bone' : 'iron';
    const dome = [[4.5, 25], [5, 19.5], [8, 16], [13, 14.5], [18, 16], [19.5, 21], [18.5, 26], [5, 26.5]];
    for (const side of ['L', 'R']) {
      const f = side === 'L' ? (p => p) : mp;
      if (id === 'paul-spike') {
        S.P({ flat: true });
        for (const [x, top] of [[8, 9], [12, 6], [16, 9]]) {
          const X = side === 'L' ? x : 47 - x;
          S.line(X, 16, X, top, 'steel', 2); S.px(X, top + 3, 'steel', 1); S.px(X + (side === 'L' ? 1 : -1), top + 4, 'steel', 1);
        }
      }
      S.P({ shine: true, round: true }); S.poly(f(dome), mat);
      const xa = side === 'L' ? 5 : 30;
      const rim = id === 'paul-gilt' ? 'gold' : id === 'paul-bone' ? 'bone' : id === 'paul-sun' ? 'steel' : 'iron';
      S.P({ round: false }); S.rect(xa, 24, 13, 3, rim); for (let x = xa; x < xa + 13; x++) S.tone(x, 26, -1);
      if (id === 'paul-iron' || id === 'paul-spike') { rivet(S, xa + 1, 25); rivet(S, xa + 10, 25); rivet(S, side === 'L' ? 10 : 36, 18); }
      if (id === 'paul-bone') {
        S.P({ flat: true, nocs: true });
        for (let k = 0; k < 4; k++) { const x = xa + 1 + k * 3; S.px(x, 27, 'bone', 3); S.px(x + 1, 27, 'bone', 2); S.px(x, 28, 'bone', 2); }
        skull(S, side === 'L' ? 12 : 36, 20);
      }
      if (id === 'paul-gilt') { seal(S, side === 'L' ? 9 : 35, 26); S.P({ flat: true, nocs: true }); S.line(side === 'L' ? 7 : 41, 18, side === 'L' ? 16 : 32, 16, 'gold', 4); }
      if (id === 'paul-sun') {
        const cx = side === 'L' ? 12 : 36;
        S.P({ flat: true, nocs: true });
        for (let k = 0; k < 8; k++) { const a = Math.PI * 2 * k / 8; S.px(cx + Math.round(Math.cos(a) * 3), 20 + Math.round(Math.sin(a) * 2.6), 'gold', 4); }
        S.px(cx, 20, 'glowY'); S.glow(cx + 0.5, 20.5, 5, 'glowY', 0.55);
        seal(S, side === 'L' ? 8 : 37, 26);
      }
    }
  }
  function drawHead(S, eq) {
    const armored = !!ARMOR[eq.armor];
    const id = eq.helm;
    if (!id) {
      if (!armored) {
        // peon: gaunt face in a ragged hood
        S.P({ shine: true }); S.ell(24, 13.5, 3.7, 4.6, 'skin');
        S.P({ flat: true, nocs: true });
        S.px(22, 13, 'void'); S.px(26, 13, 'void'); S.px(22, 12, 'skin', 0); S.px(26, 12, 'skin', 0);
        S.line(23, 16, 25, 16, 'skin', 0); S.px(24, 15, 'skin', 3); S.px(22, 17, 'hair', 2); S.px(26, 17, 'hair', 2); S.line(23, 17.5, 25, 17.5, 'hair', 3);
        S.P({ round: true });
        S.poly([[17.5, 20], [17.5, 12], [19.5, 7], [24, 5], [28.5, 7], [30.5, 12], [30.5, 20], [28, 20], [28, 12], [26, 9.5], [22, 9.5], [20, 12], [20, 20]], 'cloth');
        S.tone(20, 8, 1); S.tone(21, 7, 1); S.tone(19, 15, -1); S.tone(29, 15, -1);
        return;
      }
      // armoured but bare-headed: shaved, scarred veteran
      S.P({ shine: true }); S.ell(24, 10.5, 4.6, 5.6, 'skin'); S.rect(22, 14, 5, 2, 'skin', -1);
      S.P({ flat: true, nocs: true });
      S.line(21, 10, 22, 10, 'hair', 3); S.line(26, 10, 27, 10, 'hair', 3);
      S.px(22, 11, 'void'); S.px(26, 11, 'void'); S.px(24, 13, 'skin', 1); S.line(23, 14, 25, 14, 'skin', 0);
      S.line(26, 7, 27, 12, 'skin', 4); S.px(24, 5, 'skin', 4); S.px(25, 6, 'skin', 4);
      return;
    }
    const goldish = id === 'helm-mask' || id === 'helm-phoenix';
    const mat = goldish ? 'gold' : id === 'helm-skull' ? 'bone' : 'iron';
    if (id === 'helm-crest' || id === 'helm-phoenix') {
      S.P({ round: true });
      if (id === 'helm-crest') { S.poly([[21, 5], [24, 0], [28, 1], [32, 5], [33, 11], [30, 7], [27, 4]], 'plume'); S.tone(26, 2, 1); S.tone(29, 4, -1); }
      else {
        S.poly([[23, 4], [24, -1], [26, 0], [25, 4]], 'gold');
        S.P({ round: true }); S.poly([[18, 10], [13, 4], [12, 8], [10, 7], [13, 13], [18, 14]], 'gold'); S.poly(mp([[18, 10], [13, 4], [12, 8], [10, 7], [13, 13], [18, 14]]), 'gold');
        S.P({ flat: true, nocs: true }); S.line(13, 6, 17, 11, 'gold', 4); S.line(35, 6, 31, 11, 'gold', 4);
        S.px(24, 0, 'fire'); S.px(24, 1, 'ember'); S.glow(24.5, 1, 4, 'ember', 0.6);
      }
    }
    if (id === 'helm-horn') {
      S.P({ round: false }); S.poly([[19, 9], [14, 6], [11, 1], [13, 2], [16, 5], [20, 7]], 'bone'); S.poly(mp([[19, 9], [14, 6], [11, 1], [13, 2], [16, 5], [20, 7]]), 'bone');
      S.tone(14, 5, 1); S.tone(34, 5, 1);
    }
    S.P({ shine: true, round: true });
    S.poly([[18.5, 14], [18.5, 8], [20.5, 4.5], [24, 3.5], [27.5, 4.5], [29.5, 8], [29.5, 14], [28, 17], [20, 17]], mat);
    S.tone(21, 6, 1); S.tone(22, 5, 1);
    if (id === 'helm-skull' || id === 'helm-mask') {
      const face = id === 'helm-mask' ? 'gold' : 'bone';
      S.P({ shine: true }); S.ell(24, 11.5, 4.4, 4.6, face); S.rect(21, 14, 7, 3, face);
      S.P({ flat: true, nocs: true });
      S.rect(21, 10, 2, 2, 'void'); S.rect(26, 10, 2, 2, 'void'); S.px(24, 13, 'void'); S.px(23, 14, 'void'); S.px(25, 14, 'void');
      for (let x = 21; x <= 27; x += 2) S.px(x, 16, 'void');
      const eye = id === 'helm-mask' ? 'glowY' : 'glowR';
      S.px(22, 11, eye); S.px(26, 11, eye);
      S.glow(22.5, 11.5, 3, eye, 0.55); S.glow(26.5, 11.5, 3, eye, 0.55);
      if (id === 'helm-mask') { S.P({ flat: true, nocs: true }); S.line(19, 7, 29, 7, 'gold', 4); S.px(24, 6, 'glowR'); seal(S, 27, 15); }
    } else {
      // visor slit
      const g = id === 'helm-phoenix' ? 'glowY' : 'glowC';
      S.P({ flat: true, nocs: true }); S.rect(20, 10, 9, 2, 'void'); S.rect(21, 10, 7, 1, g);
      S.P({ flat: true, nocs: true }); S.line(24, 12, 24, 16, mat, 0); S.px(22, 14, 'void'); S.px(26, 14, 'void');
      S.glow(24.5, 10.5, 5, g, 0.45);
      if (id === 'helm-iron') { rivet(S, 19, 14); rivet(S, 28, 14); }
      if (id === 'helm-phoenix') { S.P({ flat: true, nocs: true }); S.line(19, 8, 29, 8, 'white', 0); seal(S, 19, 15); seal(S, 26, 15); }
    }
    if (id === 'helm-laurel') {
      S.P({ flat: true, nocs: true });
      for (let k = 0; k < 6; k++) {
        const y = 6 + k * 1.7;
        S.px(18 - (k > 2 ? 0 : 1), y, 'leaf', 3 - (k & 1)); S.px(17 - (k > 2 ? 0 : 1), y + 1, 'leaf', 2);
        S.px(30 + (k > 2 ? 0 : 1), y, 'leaf', 3 - (k & 1)); S.px(31 + (k > 2 ? 0 : 1), y + 1, 'leaf', 1);
      }
      S.px(24, 3, 'gold', 4); S.px(23, 3, 'leaf', 3); S.px(25, 3, 'leaf', 3);
    }
  }
  function drawWeapon(S, id, ax, ay) {
    if (!id) {
      // a rusty scrapyard wrench
      S.P(); S.rect(ax, ay - 14, 2, 18, 'rust');
      S.P(); S.rect(ax - 2, ay - 19, 6, 5, 'rust'); S.px(ax, ay - 19, null); S.px(ax + 1, ay - 19, null); S.px(ax, ay - 18, null); S.px(ax + 1, ay - 18, null);
      S.tone(ax - 2, ay - 17, 1); S.tone(ax + 3, ay - 16, -1);
      S.P(); S.rect(ax - 1, ay + 4, 4, 2, 'rust'); S.px(ax + 1, ay - 8, 'rust', 3);
      return;
    }
    if (id === 'wep-blade' || id === 'wep-rune') {
      S.P(); S.rect(ax, ay - 2, 2, 6, 'leather');
      S.P({ round: true }); S.poly([[ax - 1.5, ay - 4], [ax + 3.5, ay - 4], [ax + 3, ay - 22], [ax + 1, ay - 26], [ax - 1, ay - 22]], 'steel');
      for (let y = ay - 22; y < ay - 4; y++) S.tone(ax + 1, y, 1);
      S.P(); S.rect(ax - 3, ay - 5, 8, 2, id === 'wep-rune' ? 'brass' : 'iron');
      S.P(); S.rect(ax, ay + 4, 2, 2, id === 'wep-rune' ? 'gold' : 'iron');
      if (id === 'wep-rune') {
        S.P({ flat: true, nocs: true });
        for (let y = ay - 21; y < ay - 6; y += 2) { S.px(ax + 4, y, 'steel', 4); S.px(ax + 4, y + 1, 'iron', 1); }
        for (let y = ay - 20; y < ay - 7; y += 3) S.px(ax + 1, y, 'glowC');
        S.glow(ax + 1.5, ay - 14, 6, 'glowC', 0.35);
      }
      return;
    }
    // shooters point toward the enemy (right) and get chunkier with rarity
    if (id === 'wep-pipe') {
      S.P(); S.poly([[ax - 5, ay - 2], [ax, ay - 3], [ax, ay], [ax - 4, ay + 1]], 'wood');
      S.P(); S.rect(ax, ay - 4, 13, 2, 'rust'); S.P({ flat: true, nocs: true }); S.px(ax + 12, ay - 4, 'void');
      S.P({ nocs: true }); S.rect(ax + 3, ay - 5, 2, 4, 'rag');
      S.P(); S.rect(ax + 2, ay - 2, 2, 3, 'rust', -1);
      return;
    }
    if (id === 'wep-revolver') {
      S.P(); S.rect(ax - 1, ay - 2, 3, 5, 'wood');
      S.P({ shine: true }); S.rect(ax - 1, ay - 6, 7, 4, 'iron');
      S.P({ shine: true }); S.ell(ax + 3, ay - 3.5, 2.2, 2, 'brass');
      S.P(); S.rect(ax + 6, ay - 6, 6, 2, 'steel'); S.P({ flat: true, nocs: true }); S.px(ax + 11, ay - 7, 'iron', 3);
      return;
    }
    if (id === 'wep-boltc') {
      S.P(); S.rect(ax - 4, ay - 4, 4, 4, 'iron', -1);
      S.P({ shine: true }); S.rect(ax, ay - 8, 10, 7, 'blood');
      S.P({ nocs: true }); S.rect(ax, ay - 8, 10, 1, 'steel'); S.rect(ax + 2, ay - 9, 4, 1, 'iron');
      S.P({ shine: true }); S.rect(ax + 10, ay - 7, 4, 4, 'iron');
      S.P({ flat: true, nocs: true }); S.px(ax + 13, ay - 6, 'void'); S.px(ax + 13, ay - 5, 'void');
      S.P(); S.rect(ax + 3, ay - 1, 4, 5, 'iron'); S.P({ flat: true, nocs: true }); S.px(ax + 4, ay - 5, 'bone', 4); S.px(ax + 5, ay - 5, 'bone', 3);
      return;
    }
    if (id === 'wep-rifle') {
      S.P(); S.poly([[ax - 5, ay - 3], [ax, ay - 3], [ax, ay], [ax - 5, ay + 2]], 'wood');
      S.P({ shine: true }); S.rect(ax, ay - 4, 9, 3, 'iron');
      S.P(); S.rect(ax + 9, ay - 3, 5, 1, 'steel');
      S.P(); S.rect(ax + 3, ay - 1, 2, 4, 'iron', -1);
      S.P({ flat: true, nocs: true }); S.px(ax + 7, ay - 5, 'iron', 3);
      return;
    }
    if (id === 'wep-carbine') {
      S.P(); S.rect(ax - 4, ay - 3, 4, 3, 'wood');
      S.P({ shine: true }); S.rect(ax, ay - 5, 10, 4, 'iron');
      S.P({ shine: true }); S.ell(ax + 4, ay + 1.5, 2.6, 2.6, 'brass');
      S.P(); S.rect(ax + 10, ay - 4, 4, 2, 'steel'); S.P({ flat: true, nocs: true }); S.px(ax + 13, ay - 4, 'void'); S.px(ax + 13, ay - 3, 'void');
      S.P({ flat: true, nocs: true }); S.rect(ax + 1, ay - 4, 7, 1, 'iron', 3); S.px(ax + 9, ay - 6, 'iron', 3);
      return;
    }
    if (id === 'wep-slug') {
      S.P(); S.rect(ax - 5, ay - 4, 5, 4, 'iron', -1);
      S.P({ shine: true }); S.rect(ax, ay - 7, 10, 7, 'iron');
      S.P({ nocs: true }); S.rect(ax, ay - 7, 10, 1, 'gold'); S.rect(ax, ay - 1, 10, 1, 'gold', -1);
      S.P({ shine: true }); S.rect(ax + 10, ay - 6, 4, 4, 'steel');
      S.P({ flat: true, nocs: true }); S.px(ax + 13, ay - 5, 'void'); S.px(ax + 13, ay - 4, 'void'); S.px(ax + 11, ay - 6, 'void'); S.px(ax + 11, ay - 3, 'void');
      S.P(); S.rect(ax + 2, ay, 4, 4, 'crimson');
      S.P({ flat: true, nocs: true }); S.px(ax + 3, ay - 5, 'ember'); S.px(ax + 5, ay - 5, 'ember'); S.px(ax + 7, ay - 5, 'ember');
      S.glow(ax + 5, ay - 5, 4, 'ember', 0.35);
      return;
    }
    if (id === 'wep-siege') {
      S.P({ flat: true }); for (let k = 0; k < 5; k++) S.px(ax - 3 - k, ay + 1 + (k & 1), 'brass', 3 - (k & 1));
      S.P(); S.rect(ax - 5, ay - 5, 5, 5, 'gold', -1);
      S.P({ shine: true }); S.rect(ax, ay - 9, 10, 9, 'iron');
      S.P({ nocs: true }); S.rect(ax, ay - 9, 10, 1, 'gold'); S.rect(ax, ay - 1, 10, 1, 'gold'); S.rect(ax + 9, ay - 9, 1, 9, 'gold');
      S.P({ shine: true }); S.rect(ax + 10, ay - 8, 4, 3, 'steel'); S.P({ shine: true }); S.rect(ax + 10, ay - 4, 4, 3, 'steel');
      S.P({ flat: true, nocs: true }); S.px(ax + 13, ay - 7, 'glowY'); S.px(ax + 13, ay - 3, 'glowY');
      skull(S, ax + 4.5, ay - 5.5, 'glowR');
      seal(S, ax + 6, ay);
      S.glow(ax + 13.5, ay - 5, 4, 'glowY', 0.5);
      return;
    }
    if (id === 'wep-axe') {
      S.P(); S.rect(ax, ay - 20, 2, 30, 'wood');
      S.P({ shine: true }); S.poly([[ax + 2, ay - 19], [ax + 9, ay - 23], [ax + 11, ay - 15], [ax + 9, ay - 8], [ax + 2, ay - 11]], 'iron');
      S.P({ flat: true, nocs: true });
      for (let y = ay - 21; y < ay - 9; y += 2) S.px(ax + 11 - (y < ay - 15 ? 0 : 1) + (y < ay - 19 ? -1 : 0), y, 'steel', 4);
      rivet(S, ax + 4, ay - 15);
      return;
    }
    if (id === 'wep-maul') {
      S.P(); S.rect(ax, ay - 12, 2, 20, 'wood');
      S.P({ shine: true }); S.rect(ax - 4, ay - 21, 10, 9, 'iron');
      S.P({ nocs: true }); S.rect(ax - 4, ay - 17, 10, 1, 'brass');
      S.P({ flat: true, nocs: true });
      [[ax - 3, ay - 22], [ax - 4, ay - 24], [ax - 2, ay - 25], [ax + 3, ay - 23], [ax + 4, ay - 25], [ax + 6, ay - 26], [ax + 6, ay - 20], [ax + 7, ay - 18]].forEach(p => S.px(p[0], p[1], 'glowC'));
      S.glow(ax + 1, ay - 19, 9, 'glowC', 0.45);
      return;
    }
    if (id === 'wep-sun') {
      S.P(); S.rect(ax - 1, ay - 2, 3, 5, 'wood');
      S.P({ shine: true }); S.rect(ax - 1, ay - 6, 9, 4, 'iron');
      S.P({ nocs: true }); S.rect(ax + 1, ay - 7, 5, 1, 'gold');
      S.P({ flat: true }); S.ell(ax + 9.5, ay - 4, 2.2, 2.2, 'glowY'); S.px(ax + 9, ay - 5, 'white');
      S.glow(ax + 9.5, ay - 4, 6.5, 'glowY', 0.7);
      return;
    }
    if (id === 'wep-glaive') {
      S.P(); S.rect(ax, ay - 28, 2, 40, 'wood');
      S.P({ nocs: true }); S.rect(ax - 1, ay - 29, 4, 2, 'gold'); S.rect(ax, ay - 12, 2, 1, 'gold'); S.rect(ax, ay + 10, 2, 2, 'gold');
      S.P({ shine: true }); S.poly([[ax + 1, ay - 29], [ax + 2, ay - 37], [ax + 7, ay - 42], [ax + 6, ay - 34], [ax + 3, ay - 27]], 'steel');
      S.P({ flat: true, nocs: true });
      [[ax + 7, ay - 43], [ax + 8, ay - 40], [ax + 8, ay - 37], [ax + 7, ay - 34], [ax + 4, ay - 40]].forEach(p => S.px(p[0], p[1], 'fire'));
      S.px(ax + 6, ay - 38, 'ember'); S.px(ax + 5, ay - 35, 'ember');
      S.glow(ax + 5.5, ay - 37, 7, 'ember', 0.55);
      return;
    }
    if (id === 'wep-storm') {
      S.P(); S.rect(ax, ay - 14, 2, 24, 'wood');
      S.P({ nocs: true }); S.rect(ax, ay - 6, 2, 1, 'gold'); S.rect(ax, ay + 2, 2, 1, 'gold'); S.rect(ax - 1, ay + 9, 4, 2, 'gold');
      S.P({ shine: true }); S.poly([[ax - 6, ay - 24], [ax + 8, ay - 24], [ax + 9, ay - 15], [ax - 7, ay - 15]], 'iron');
      S.P({ nocs: true }); S.rect(ax - 6, ay - 24, 14, 1, 'gold'); S.rect(ax - 7, ay - 16, 16, 1, 'gold');
      S.P({ shine: true }); S.ell(ax + 1, ay - 19.5, 2.4, 2.4, 'gold'); S.P({ flat: true, nocs: true }); S.px(ax + 1, ay - 20, 'glowC');
      S.P({ flat: true, nocs: true });
      [[ax - 3, ay - 25], [ax - 4, ay - 26], [ax - 3, ay - 27], [ax - 4, ay - 28], [ax + 1, ay - 25], [ax + 2, ay - 26], [ax + 1, ay - 27], [ax + 2, ay - 28], [ax + 1, ay - 29],
        [ax + 5, ay - 25], [ax + 6, ay - 26], [ax + 5, ay - 27], [ax + 6, ay - 28]].forEach(p => S.px(p[0], p[1], 'glowC'));
      S.glow(ax + 1, ay - 24, 9, 'glowC', 0.55);
    }
  }
  function drawFist(S, eq, ax, ay) {
    if (!ARMOR[eq.armor]) { S.P({ shine: true }); S.ell(ax + 1, ay + 1, 2, 2, 'skin'); return; }
    S.P({ shine: true }); S.ell(ax + 1, ay + 1, 3.4, 2.8, 'iron'); S.tone(ax, ay, 1);
  }
  function drawAura(S, eq, rank, color) {
    if (eq.armor === 'arm-halo' || eq.armor === 'sh-arm-halo' || eq.armor === 'mg-arm-eye') {
      S.P({ flat: true });
      for (let k = 0; k < 40; k++) {
        const a = Math.PI * 2 * k / 40, x = 24 + Math.cos(a) * 9, y = 8 + Math.sin(a) * 2.6;
        if (y < 8 || Math.abs(x - 24) > 5) S.px(x, y - 4, k % 5 ? 'gold' : 'white', 4);
      }
      S.glow(24, 4, 11, 'glowY', 0.35);
    }
    if (rank >= 5) {
      S.P({ flat: true });
      [[5, 6], [43, 22], [3, 40], [44, 44], [9, 30]].forEach(p => S.px(p[0], p[1], 'white'));
    }
  }


  // ================= SHOOTER (grimdark gunner) =================
  const SH_ARMOR = {
    'sh-arm-flak': { vest: 'drab', trim: 'khaki' },
    'sh-arm-quilt': { vest: 'urban', trim: 'iron' },
    'sh-arm-carapace': { vest: 'drab', plate: 'khaki', trim: 'leather' },
    'sh-arm-urban': { vest: 'urban', plate: 'urban', trim: 'iron' },
    'sh-arm-storm': { vest: 'night', plate: 'blood', trim: 'steel' },
    'sh-arm-gilt': { vest: 'night', plate: 'steel', trim: 'gold', seals: 1 },
    'sh-arm-halo': { vest: 'crimson', plate: 'gold', trim: 'gold', seals: 2 }
  };
  function shLegs(S, a) {
    const trou = !a ? 'cloth' : (a.vest === 'night' || a.vest === 'crimson') ? 'night' : 'drab';
    S.P(); S.rect(18, 35, 5, 13, trou); S.P(); S.rect(25, 35, 5, 13, trou);
    S.P(); S.rect(18, 47, 5, 10, trou, -1); S.P(); S.rect(25, 47, 5, 10, trou, -1);
    if (!a) { S.P({ flat: true, nocs: true }); S.px(20, 42, 'cloth', 3); S.px(27, 51, 'rag', 1); S.px(19, 52, 'rag', 1); }
    if (a && a.plate) {
      S.P({ shine: true }); S.rect(17, 37, 6, 6, a.plate); S.P({ shine: true }); S.rect(25, 37, 6, 6, a.plate);
      S.P({ shine: true }); S.rect(17, 50, 6, 6, a.plate); S.P({ shine: true }); S.rect(25, 50, 6, 6, a.plate);
    }
    if (a) { S.P({ shine: true }); S.ell(20.5, 48, 3, 2.2, a.plate || 'leather'); S.P({ shine: true }); S.ell(27.5, 48, 3, 2.2, a.plate || 'leather'); }
    S.P(); S.poly([[17, 56], [23, 56], [23, 61], [15.5, 61]], 'leather'); S.P(); S.poly([[25, 56], [31, 56], [32.5, 61], [25, 61]], 'leather');
    S.tone(17, 57, 1); S.tone(26, 57, 1);
  }
  function shTorso(S, a, eq) {
    S.P({ round: true }); S.poly([[17, 18], [31, 18], [32, 34], [16, 34]], a ? 'drab' : 'cloth');
    if (!a) {
      S.tone(20, 25, -1); S.tone(21, 26, -1); S.tone(28, 29, -1);
      S.P({ flat: true, nocs: true }); S.px(23, 21, 'steel', 3); S.px(23, 22, 'steel', 2); S.px(24, 23, 'steel', 4);
    } else {
      S.P({ round: true, shine: true }); S.poly([[16, 18], [32, 18], [32.5, 31], [15.5, 31]], a.vest);
      if (a.plate) {
        S.P({ round: true, shine: true }); S.poly([[17, 19], [31, 19], [31.5, 26], [24, 28.5], [16.5, 26]], a.plate);
        for (let y = 20; y < 28; y++) S.tone(24, y, 1);
        S.P({ nocs: true, flat: true }); S.line(17, 19, 31, 19, a.trim, 3);
      }
      S.P({ round: false });
      for (const x of [17, 21, 25, 29]) { S.rect(x, 28, 3, 3, a.trim === 'gold' ? 'leather' : (a.trim === 'iron' ? 'urban' : a.trim)); }
      S.P({ flat: true, nocs: true }); S.line(18, 18, 22, 31, 'leather', 1); S.line(30, 18, 26, 31, 'leather', 1);
      if (a.seals) { seal(S, 18, 23); if (a.seals > 1) seal(S, 27, 23); }
    }
    S.P(); S.rect(16, 32, 16, 3, 'leather'); S.P({ nocs: true }); S.rect(22, 32, 4, 3, a && a.trim === 'gold' ? 'gold' : 'brass');
    S.P(); S.rect(22, 16, 4, 3, 'skin', -1);
  }
  function shArm(S, a, side) {
    const f = side === 'L' ? (p => p) : mp, mat = a ? (a.vest === 'crimson' ? 'night' : a.vest) : 'cloth';
    S.P({ round: true }); S.poly(f([[13, 20], [17.5, 19], [18, 33], [13.5, 33]]), mat);
    if (a && a.plate) { S.P({ shine: true }); S.poly(f([[13, 27], [18, 27], [18, 32], [13.5, 32]]), a.plate); }
    S.P({ shine: true }); S.ell(side === 'L' ? 15.7 : 32.3, 35, 2.5, 2.2, a ? 'leather' : 'skin');
  }
  function shPauldrons(S, id) {
    if (!id) return;
    const mat = { 'sh-paul-pad': 'drab', 'sh-paul-plate': 'khaki', 'sh-paul-stripe': 'urban', 'sh-paul-gilt': 'gold' }[id] || 'drab';
    for (const side of ['L', 'R']) {
      const cx = side === 'L' ? 14.5 : 33.5;
      S.P({ shine: true, round: true }); S.ell(cx, 20.5, 5.2, 3.9, mat);
      if (id !== 'sh-paul-pad') { S.P({ round: false }); S.rect(cx - 5, 22.5, 10, 2, id === 'sh-paul-gilt' ? 'gold' : 'iron'); }
      if (id === 'sh-paul-stripe') { S.P({ flat: true, nocs: true }); S.line(cx - 3, 18, cx + 2, 20, 'blood', 3); S.line(cx - 3, 19, cx + 2, 21, 'blood', 2); }
      if (id === 'sh-paul-gilt') { S.P({ flat: true, nocs: true }); for (let x = -4; x <= 4; x += 2) { S.px(cx + x, 25, 'gold', 4); S.px(cx + x, 26, 'gold', 3); } }
      if (id === 'sh-paul-plate') rivet(S, cx - 1, 19);
    }
  }
  function shHead(S, eq) {
    const id = eq.helm;
    const face = () => {
      S.P({ shine: true }); S.ell(24, 12.5, 3.9, 4.8, 'skin');
      S.P({ flat: true, nocs: true }); S.px(22, 12, 'void'); S.px(26, 12, 'void'); S.line(23, 15, 25, 15, 'skin', 0); S.px(24, 14, 'skin', 3);
    };
    if (!id) {
      face();
      S.P({ round: false }); S.poly([[20, 9.5], [21, 7.5], [24, 6.5], [27, 7.5], [28, 9.5]], 'hair'); S.P({ nocs: true }); S.rect(20, 9, 9, 1, 'crimson');
      S.P({ flat: true, nocs: true }); S.px(19, 10, 'crimson', 1); S.px(18, 11, 'crimson', 1); S.px(22, 16, 'hair', 2); S.px(26, 16, 'hair', 2);
      return;
    }
    if (id === 'sh-helm-cap') {
      face(); S.P({ round: true }); S.poly([[19.5, 10], [20, 7], [24, 5.5], [28, 7], [28.5, 10]], 'drab');
      S.P(); S.rect(18, 9, 12, 2, 'drab', -1); S.P({ flat: true, nocs: true }); S.px(24, 7, 'brass', 3);
      return;
    }
    if (id === 'sh-helm-peak') {
      face(); S.P({ flat: true, nocs: true }); S.line(26, 11, 27, 15, 'skin', 4);
      S.P({ round: true }); S.poly([[18.5, 9], [19.5, 5.5], [24, 4], [28.5, 5.5], [29.5, 9]], 'night');
      S.P(); S.rect(18, 9, 12, 2, 'void'); S.P({ nocs: true }); S.rect(19, 8, 10, 1, 'crimson');
      skull(S, 24, 6.5); S.P({ flat: true, nocs: true }); S.line(21, 5, 27, 5, 'gold', 3);
      return;
    }
    // helmets
    const mat = { 'sh-helm-flak': 'drab', 'sh-helm-mask': 'urban', 'sh-helm-visor': 'blood', 'sh-helm-sun': 'gold' }[id] || 'drab';
    if (id === 'sh-helm-flak') face();
    if (id === 'sh-helm-sun') { S.P({ round: true }); S.poly([[22, 5], [24, -1], [27, 0], [31, 5], [31, 10], [28, 6]], 'plume'); }
    S.P({ shine: true, round: true }); S.poly([[19, 11], [19.5, 7], [22, 4.5], [26, 4.5], [28.5, 7], [29, 11]], mat);
    S.P(); S.rect(18, 10, 12, 2, mat, -1);
    if (id === 'sh-helm-flak') { S.P({ shine: true }); S.ell(22, 8, 1.6, 1.4, 'crystal'); S.P({ shine: true }); S.ell(26, 8, 1.6, 1.4, 'crystal'); S.P({ flat: true }); S.line(19, 11, 21, 17, 'leather', 1); S.line(29, 11, 27, 17, 'leather', 1); }
    if (id === 'sh-helm-mask') {
      S.P({ shine: true }); S.rect(20, 11, 9, 6, 'iron');
      S.P({ flat: true, nocs: true }); S.ell(22, 13, 1.6, 1.6, 'void'); S.ell(26.5, 13, 1.6, 1.6, 'void'); S.px(22, 13, 'glowG'); S.px(26, 13, 'glowG');
      S.P({ shine: true }); S.ell(24.5, 17, 2, 1.6, 'iron'); S.P({ flat: true }); S.line(26, 17, 30, 22, 'rag', 2);
      S.glow(22, 13, 3, 'glowG', 0.4); S.glow(26.5, 13, 3, 'glowG', 0.4);
    }
    if (id === 'sh-helm-visor' || id === 'sh-helm-sun') {
      S.P({ shine: true }); S.rect(20, 11, 9, 6, mat); S.tone(24, 14, 1);
      const g = id === 'sh-helm-sun' ? 'glowY' : 'glowR';
      S.P({ flat: true, nocs: true }); S.rect(20, 11, 9, 2, 'void'); S.rect(21, 11, 7, 1, g); S.line(24, 13, 24, 16, mat, 0);
      S.glow(24.5, 11.5, 5, g, 0.45);
      if (id === 'sh-helm-sun') { S.P({ flat: true, nocs: true }); S.line(19, 7, 29, 7, 'white', 0); seal(S, 27, 15); }
    }
  }
  function shPack(S, id, sy) {
    if (!id) return;
    if (id === 'sh-pack-vox') {
      S.P({ flat: true }); S.line(31, sy - 3, 35, sy - 19, 'steel', 1); S.px(35, sy - 20, 'glowR'); S.glow(35.5, sy - 19.5, 3, 'glowR', 0.5);
      S.P({ shine: true }); S.rect(15, sy - 4, 18, 11, 'urban'); S.P({ flat: true, nocs: true }); S.px(17, sy - 2, 'glowG'); S.px(19, sy - 2, 'glowY');
      return;
    }
    S.P({ shine: true }); S.rect(15, sy - 4, 18, 11, 'drab', -1); S.P({ nocs: true }); S.rect(15, sy - 4, 18, 2, 'khaki');
    if (id === 'sh-pack-rack') {
      for (const [x, y] of [[15, -7], [19, -8], [29, -8], [33, -7]]) { S.P({ shine: true }); S.ell(x, sy + y, 2, 2.4, 'drab'); S.P({ flat: true, nocs: true }); S.px(x, sy + y - 3, 'steel', 3); }
    }
  }
  function shFamiliar(S, id) {
    if (id !== 'sh-pack-drone') return;
    S.P({ flat: true }); S.line(36, 5, 46, 5, 'steel', 2); S.px(41, 6, 'iron', 2);
    S.P({ shine: true }); S.ell(41, 9, 4, 3, 'iron'); S.P({ shine: true }); S.rect(38, 11, 7, 2, 'urban');
    S.P({ flat: true, nocs: true }); S.px(39, 9, 'glowR'); S.px(40, 9, 'void'); S.glow(39.5, 9.5, 3, 'glowR', 0.6);
  }
  function shCape(S, id) {
    if (!id) return;
    const mat = id === 'sh-cape-officer' ? 'night' : 'drab';
    S.P({ round: true }); S.poly([[15, 18], [33, 18], [35, 40], [37, 60], [11, 60], [13, 40]], mat);
    for (let y = 36; y < 59; y++) { S.tone(14, y, -1); S.tone(34, y, -1); }
    if (id === 'sh-cape-camo') { S.P({ flat: true, nocs: true }); [[13, 44], [15, 52], [34, 47], [35, 55], [12, 56], [33, 41]].forEach(([x, y]) => { S.rect(x, y, 2, 2, 'khaki', 1); S.px(x + 1, y + 2, 'leather', 2); }); }
    if (id === 'sh-cape-officer') { S.P({ flat: true, nocs: true }); S.line(11, 60, 37, 60, 'gold', 2); S.line(13, 40, 11, 59, 'crimson', 3); S.line(35, 40, 37, 59, 'crimson', 2); }
  }

  // ================= MAGE (hooded psychic caster) =================
  const MG_ROBE = {
    'mg-arm-grey': { robe: 'ash', trim: 'iron' },
    'mg-arm-blue': { robe: 'robeB', trim: 'brass' },
    'mg-arm-bone': { robe: 'cloth', trim: 'bone', beads: 1 },
    'mg-arm-violet': { robe: 'robeP', trim: 'crystal', runes: 'glowP' },
    'mg-arm-crimson': { robe: 'crimson', trim: 'gold', runes: 'glowY' },
    'mg-arm-star': { robe: 'capeN', trim: 'gold', stars: 1, runes: 'glowC' },
    'mg-arm-eye': { robe: 'bone', trim: 'gold', eye: 1, seals: 2, runes: 'glowY' }
  };
  function mgBody(S, r) {
    if (!r) {
      S.P(); S.rect(20, 52, 2, 7, 'skin', -1); S.P(); S.rect(26, 52, 2, 7, 'skin', -1);
      S.P(); S.rect(19, 58, 4, 3, 'skin'); S.P(); S.rect(25, 58, 4, 3, 'skin');
      S.P({ round: true });
      S.poly([[18, 17], [30, 17], [32, 32], [34, 52], [31, 55], [29, 51], [26, 55], [24, 51], [21, 55], [19, 51], [16, 54], [14, 52], [16, 32]], 'rag');
      for (let y = 34; y < 51; y++) { S.tone(20, y, -1); S.tone(28, y, -1); }
      S.P({ round: false }); S.line(16, 31, 32, 31, 'wood'); S.px(21, 32, 'wood', 1); S.px(21, 33, 'wood', 1);
      return;
    }
    S.P(); S.rect(19, 59, 4, 2, 'leather'); S.P(); S.rect(25, 59, 4, 2, 'leather');
    S.P({ round: true, shine: true });
    S.poly([[18, 17], [30, 17], [32, 32], [35, 59], [30, 60.5], [24, 61], [18, 60.5], [13, 59], [16, 32]], r.robe);
    for (let y = 36; y < 59; y++) { S.tone(18 - (y - 36) / 10, y, -1); S.tone(30 + (y - 36) / 10, y, -1); }
    S.P({ round: true }); S.poly([[22, 30], [26, 30], [26.5, 59.5], [21.5, 59.5]], r.trim === 'iron' ? r.robe : r.trim, r.trim === 'iron' ? -1 : 0);
    S.P({ nocs: true, flat: true }); S.line(13, 59, 24, 60.5, r.trim, 2); S.line(24, 60.5, 35, 59, r.trim, 1);
    S.P(); S.rect(16, 31, 16, 2, r.trim === 'gold' ? 'crimson' : 'leather');
    if (r.runes) { S.P({ flat: true, nocs: true }); for (let y = 36; y < 58; y += 5) S.px(24, y, r.runes); S.glow(24, 47, 6, r.runes, 0.25); }
    if (r.stars) { S.P({ flat: true, nocs: true }); [[17, 40], [30, 44], [19, 52], [31, 55], [28, 37], [15, 56]].forEach(([x, y]) => S.px(x, y, 'white')); }
    if (r.beads) { S.P({ flat: true, nocs: true }); for (let k = 0; k < 5; k++) { S.px(20 + k, 19 + k, 'bone', 4); S.px(28 - k, 19 + k, 'bone', 4); } skull(S, 24, 25); }
    if (r.eye) { S.P({ shine: true }); S.ell(24, 23, 3, 2, 'gold'); S.P({ flat: true, nocs: true }); S.px(24, 23, 'glowR'); S.px(23, 23, 'void'); S.glow(24.5, 23.5, 4, 'glowY', 0.4); }
    if (r.seals) { seal(S, 17, 34); seal(S, 28, 35); }
  }
  function mgArm(S, r, side) {
    const f = side === 'L' ? (p => p) : mp;
    S.P({ round: true }); S.poly(f([[17, 18], [14, 21], [11, 33], [17.5, 34], [18.5, 24]]), r ? r.robe : 'rag');
    if (r && r.trim !== 'iron') { S.P({ flat: true, nocs: true }); S.line(side === 'L' ? 11 : 37, 33, side === 'L' ? 17 : 31, 34, r.trim, 2); }
    S.P({ shine: true }); S.ell(side === 'L' ? 14.5 : 33.5, 35.5, 1.9, 1.9, 'skin');
  }
  function mgMantle(S, id) {
    if (!id) return;
    if (id === 'mg-paul-crystal') {
      for (const side of [-1, 1]) {
        const cx = 24 + side * 9.5;
        S.P({ shine: true }); S.poly([[cx - 4, 22], [cx - 3, 18], [cx + 3, 17], [cx + 4.5, 22]], 'robeP');
        S.P({ flat: true });
        for (let k = 0; k < 3; k++) { const x = cx - 2 + k * 2; S.line(x, 18, x + side, 13 - (k === 1 ? 2 : 0), 'crystal', 3); }
        S.glow(cx, 15, 5, 'glowC', 0.4);
      }
      return;
    }
    const mat = id === 'mg-paul-fur' ? 'fur' : id === 'mg-paul-bone' ? 'bone' : 'gold';
    S.P({ round: true, shine: true }); S.poly([[13, 22], [14, 18], [19, 15.5], [29, 15.5], [34, 18], [35, 22], [30, 21], [24, 20], [18, 21]], mat);
    if (id === 'mg-paul-fur') { S.P({ flat: true }); for (let x = 14; x < 35; x += 2) S.px(x, 22 - (x % 4 ? 0 : 1), 'fur', 1); }
    if (id === 'mg-paul-bone') { skull(S, 16.5, 19); skull(S, 31.5, 19); }
    if (id === 'mg-paul-gilt') { seal(S, 15, 21); seal(S, 31, 21); S.P({ flat: true, nocs: true }); S.line(15, 18, 33, 18, 'gold', 4); }
  }
  function mgHead(S, eq) {
    const id = eq.helm, r = MG_ROBE[eq.armor];
    const gl = r && r.runes;
    S.P({ shine: true }); S.ell(24, 12.5, 3.6, 4.6, 'skin');
    S.P({ flat: true, nocs: true }); S.px(22, 12, gl || 'void'); S.px(26, 12, gl || 'void');
    S.line(23, 15, 25, 15, 'skin', 0);
    if (!id) {
      S.P({ flat: true, nocs: true }); S.px(24, 9, 'skin', 4); S.line(22, 16.5, 26, 16.5, 'hair', 2); S.px(24, 17.5, 'hair', 2);
      S.P({ round: true }); S.poly([[18.5, 18], [20, 16], [28, 16], [29.5, 18], [27, 19.5], [21, 19.5]], 'rag');
      if (gl) { S.glow(22.5, 12.5, 2.5, gl, 0.4); S.glow(26.5, 12.5, 2.5, gl, 0.4); }
      return;
    }
    if (id === 'mg-helm-circlet') {
      S.P({ flat: true, nocs: true }); S.line(20.5, 9, 27.5, 9, 'steel', 3); S.px(24, 8, 'glowC'); S.px(24, 9, 'crystal', 4);
      S.line(22, 16.5, 26, 16.5, 'hair', 2); S.glow(24.5, 8.5, 4, 'glowC', 0.5);
      return;
    }
    if (id === 'mg-helm-mask') { S.P({ shine: true }); S.ell(24, 12.5, 3.6, 4.6, 'steel'); S.P({ flat: true, nocs: true }); S.rect(21, 11, 2, 1, 'glowP'); S.rect(25, 11, 2, 1, 'glowP'); S.line(24, 13, 24, 16, 'steel', 1); S.glow(24, 11.5, 4, 'glowP', 0.45); }
    if (id === 'mg-helm-crystal') {
      S.P({ flat: true });
      [[17, 10, 13, 1], [19, 7, 16, -1], [24, 6, 24, -3], [29, 7, 32, -1], [31, 10, 35, 1]].forEach(([x0, y0, x1, y1]) => { S.line(x0, y0, x1, y1, 'crystal', 3); S.px(x1, y1, 'glowC'); });
      S.glow(24, 2, 9, 'glowC', 0.35);
    }
    if (id === 'mg-helm-crown') {
      S.P({ flat: true, nocs: true });
      [[20, 2], [22, 0], [24, -1], [26, 0], [28, 2], [21, 3], [27, 3], [24, 1]].forEach(([x, y]) => S.px(x, y + 1, 'glowP'));
      S.glow(24, 3, 8, 'glowP', 0.55);
    }
    const hood = { 'mg-helm-hood': 'cloth', 'mg-helm-cowl': 'robeP', 'mg-helm-crystal': 'night', 'mg-helm-mask': 'crimson', 'mg-helm-crown': 'bone' }[id] || 'cloth';
    S.P({ round: true });
    S.poly([[17.5, 20], [17.5, 12], [19.5, 6.5], [24, 4.5], [28.5, 6.5], [30.5, 12], [30.5, 20], [28, 20], [28, 12], [26, 8.5], [22, 8.5], [20, 12], [20, 20]], hood);
    S.tone(20, 8, 1); S.tone(21, 7, 1);
    if (id === 'mg-helm-hood') { S.P({ flat: true, nocs: true }); S.rect(21, 9, 6, 2, 'void'); }
    if (id === 'mg-helm-cowl') { S.P({ flat: true, nocs: true }); for (let y = 8; y < 20; y += 2) { S.px(18, y, 'gold', 3); S.px(30, y, 'gold', 3); } }
    if (id === 'mg-helm-crown') { S.P({ nocs: true }); S.rect(20, 5, 9, 2, 'gold'); S.P({ flat: true, nocs: true }); S.px(24, 5, 'glowR'); }
  }
  function mgWeapon(S, id, ax, ay) {
    const shaft = (mat, top) => { S.P(); S.rect(ax, ay - top, 2, top + 24, mat); };
    if (!id) {
      S.P(); S.line(ax, ay - 26, ax + 1, ay + 22, 'wood'); S.line(ax + 1, ay - 26, ax + 2, ay + 22, 'wood', -1);
      S.P({ flat: true }); S.line(ax, ay - 26, ax - 2, ay - 29, 'wood', 1);
      S.P({ flat: true, nocs: true }); S.px(ax - 3, ay - 31, 'glowC'); S.glow(ax - 2.5, ay - 30.5, 3, 'glowC', 0.5);
      return;
    }
    if (id === 'mg-wep-stick') { shaft('wood', 26); S.P({ flat: true }); S.line(ax, ay - 26, ax - 3, ay - 31, 'wood', 1); S.line(ax + 1, ay - 26, ax + 4, ay - 30, 'wood', 1); S.px(ax + 1, ay - 29, 'leaf', 3); return; }
    if (id === 'mg-wep-sword') {
      S.P(); S.rect(ax, ay - 2, 2, 6, 'leather');
      S.P({ round: true }); S.poly([[ax - 1.5, ay - 4], [ax + 3.5, ay - 4], [ax + 3, ay - 22], [ax + 1, ay - 26], [ax - 1, ay - 22]], 'crystal');
      S.P(); S.rect(ax - 3, ay - 5, 8, 2, 'gold');
      S.P({ flat: true, nocs: true }); for (let y = ay - 22; y < ay - 6; y += 3) S.px(ax + 1, y, 'glowC');
      S.glow(ax + 1, ay - 15, 7, 'glowC', 0.45);
      return;
    }
    if (id === 'mg-wep-iron') { shaft('iron', 26); S.P({ shine: true }); S.rect(ax - 2, ay - 31, 6, 5, 'iron'); S.P({ flat: true, nocs: true }); S.px(ax, ay - 29, 'glowC'); S.px(ax + 1, ay - 29, 'glowC'); S.glow(ax + 1, ay - 28.5, 4, 'glowC', 0.5); return; }
    if (id === 'mg-wep-skull') { shaft('wood', 26); skull(S, ax + 1, ay - 29, 'glowG'); S.glow(ax + 1, ay - 29, 4, 'glowG', 0.4); return; }
    if (id === 'mg-wep-orb') { shaft('wood', 25); S.P({ flat: true }); S.line(ax - 2, ay - 25, ax - 2, ay - 30, 'brass', 3); S.line(ax + 3, ay - 25, ax + 3, ay - 30, 'brass', 2); S.P({ shine: true }); S.ell(ax + 1, ay - 29, 2.6, 2.6, 'crystal'); S.glow(ax + 1, ay - 29, 5, 'glowC', 0.5); return; }
    if (id === 'mg-wep-crystal') { shaft('steel', 24); S.P({ shine: true }); S.poly([[ax + 1, ay - 36], [ax + 4, ay - 30], [ax + 1, ay - 24], [ax - 2, ay - 30]], 'crystal'); S.glow(ax + 1, ay - 30, 7, 'glowC', 0.5); return; }
    if (id === 'mg-wep-eye') {
      shaft('gold', 24); S.P({ shine: true }); S.ell(ax + 1, ay - 29, 4, 4, 'gold');
      S.P({ flat: true, nocs: true }); S.ell(ax + 1, ay - 29, 2.2, 1.6, 'bone', 4); S.px(ax + 1, ay - 29, 'glowR'); S.glow(ax + 1, ay - 29, 6, 'glowR', 0.45);
      return;
    }
    if (id === 'mg-wep-storm') {
      shaft('night', 24); S.P({ nocs: true }); S.rect(ax, ay - 10, 2, 1, 'gold'); S.rect(ax, ay + 4, 2, 1, 'gold');
      S.P({ round: false }); S.poly([[ax - 4, ay - 26], [ax - 5, ay - 33], [ax - 2, ay - 37], [ax - 2, ay - 31], [ax + 1, ay - 27], [ax + 4, ay - 31], [ax + 4, ay - 37], [ax + 7, ay - 33], [ax + 6, ay - 26]], 'gold');
      S.P({ flat: true, nocs: true }); [[ax + 1, ay - 31], [ax, ay - 33], [ax + 1, ay - 35], [ax + 2, ay - 37], [ax + 1, ay - 39]].forEach(p => S.px(p[0], p[1], 'glowP'));
      S.glow(ax + 1, ay - 33, 9, 'glowP', 0.55);
    }
  }
  function mgPack(S, id, sy) {
    if (!id) return;
    if (id === 'mg-pack-scrolls') { S.P({ shine: true }); S.poly([[12, sy - 10], [15, sy - 12], [33, sy + 6], [30, sy + 8]], 'leather'); S.P({ nocs: true }); S.ell(13, sy - 11, 2, 2, 'parch'); return; }
    if (id === 'mg-pack-candles') {
      S.P(); S.rect(14, sy - 3, 20, 3, 'wood');
      for (const x of [15, 19, 29, 33]) { S.P(); S.rect(x - 1, sy - 9 + (x % 2), 2, 6, 'parch'); S.P({ flat: true, nocs: true }); S.px(x - 1, sy - 11 + (x % 2), 'ember'); S.glow(x - 0.5, sy - 10.5, 3, 'ember', 0.4); }
      return;
    }
    if (id === 'mg-pack-tome' || id === 'mg-pack-grimoire') {
      S.P({ flat: true }); S.line(16, 31, 12, 38, 'iron', 3);
      S.P({ shine: true }); S.rect(8, 38, 7, 8, id === 'mg-pack-grimoire' ? 'robeP' : 'leather'); S.P({ nocs: true }); S.rect(8, 38, 2, 2, 'gold'); S.rect(13, 44, 2, 2, 'gold');
      S.P({ flat: true, nocs: true }); S.px(11, 41, 'glowY');
    }
  }
  function mgFamiliar(S, id) {
    if (id !== 'mg-pack-grimoire') return;
    S.P({ shine: true }); S.poly([[36, 9], [40, 7], [41, 8], [42, 7], [46, 9], [46, 13], [42, 12], [41, 13], [40, 12], [36, 13]], 'bone');
    S.P({ flat: true, nocs: true }); S.px(38, 10, 'glowP'); S.px(44, 10, 'glowP'); S.px(41, 9, 'leather', 2); S.line(37, 14, 45, 14, 'robeP', 2);
    S.glow(41, 10, 6, 'glowP', 0.45);
  }
  function mgCape(S, id) {
    if (!id) return;
    const mat = id === 'mg-cape-star' ? 'robeB' : id === 'mg-cape-void' ? 'night' : 'ash';
    S.P({ round: true });
    if (id === 'mg-cape-grey') S.poly([[14, 17], [34, 17], [38, 38], [40, 57], [36, 54], [33, 59], [28, 55], [24, 60], [20, 55], [15, 59], [12, 54], [8, 57], [10, 38]], mat);
    else S.poly([[14, 17], [34, 17], [38, 38], [40, 60], [24, 61], [8, 60], [10, 38]], mat);
    if (id === 'mg-cape-star') { S.P({ flat: true, nocs: true }); [[10, 44], [37, 48], [11, 55], [38, 56], [12, 38], [36, 40]].forEach(([x, y]) => S.px(x, y, 'white')); }
    if (id === 'mg-cape-void') { S.P({ flat: true, nocs: true }); S.line(10, 38, 8, 59, 'glowP'); S.line(38, 38, 40, 59, 'glowP'); S.glow(9, 50, 4, 'glowP', 0.3); S.glow(39, 50, 4, 'glowP', 0.3); }
  }
  function poseShift(pose, sh) {
    if (pose === 'raise') return sh ? [2, -2] : [1, -7];
    if (pose === 'overhead') return [2, -12];
    if (pose === 'sweep') return sh ? [8, 0] : [11, 2];
    if (pose === 'bash' || pose === 'thrust') return sh ? [8, -1] : [9, 0];
    if (pose === 'cast') return [3, -10];
    if (pose === 'aim') return [7, -2];
    if (pose === 'band') return [-6, -5];
    return [0, 0];
  }
  function classSprite(S, eq, cls, only, pose) {
    const sh = cls === 'shooter';
    const a = sh ? SH_ARMOR[eq.armor] : MG_ROBE[eq.armor];
    let ax = 32, ay = 35;
    const ps = poseShift(pose, sh); ax += ps[0]; ay += ps[1];
    const wep = (id, x, y) => { if (sh) drawWeapon(S, id ? id.replace(/^sh-/, '') : 'wep-pipe', x, y); else mgWeapon(S, id, x, y); };
    if (only) {
      if (only === 'base') drawBase(S, eq.base);
      else if (only === 'cape') sh ? shCape(S, eq.cape) : mgCape(S, eq.cape);
      else if (only === 'pack') { sh ? (shPack(S, eq.pack, 19), shFamiliar(S, eq.pack)) : (mgPack(S, eq.pack, 19), mgFamiliar(S, eq.pack)); }
      else if (only === 'armor') { if (sh) { shLegs(S, a); shTorso(S, a, eq); shArm(S, a, 'L'); shArm(S, a, 'R'); } else { mgBody(S, a); mgArm(S, a, 'L'); mgArm(S, a, 'R'); } }
      else if (only === 'pauldrons') sh ? shPauldrons(S, eq.pauldrons) : mgMantle(S, eq.pauldrons);
      else if (only === 'helm') sh ? shHead(S, eq) : mgHead(S, eq);
      else if (only === 'weapon') wep(eq.weapon, 24, 44);
      return S;
    }
    drawBase(S, eq.base);
    if (sh) {
      shCape(S, eq.cape); shPack(S, eq.pack, 19); shLegs(S, a); shTorso(S, a, eq); shArm(S, a, 'L'); shArm(S, a, 'R');
      shPauldrons(S, eq.pauldrons); shHead(S, eq); wep(eq.weapon, ax, ay);
      S.P({ shine: true }); S.ell(ax + 1, ay + 1, 2.4, 2.2, a ? 'leather' : 'skin');
      shFamiliar(S, eq.pack);
    } else {
      mgCape(S, eq.cape); mgPack(S, eq.pack, 19); mgBody(S, a); mgArm(S, a, 'L'); mgArm(S, a, 'R');
      mgMantle(S, eq.pauldrons); mgHead(S, eq); wep(eq.weapon, ax, ay);
      S.P({ shine: true }); S.ell(ax + 1, ay + 1, 1.9, 1.9, 'skin');
      mgFamiliar(S, eq.pack);
    }
    return S;
  }
  function heroSprite(eq, rank, color, only, pose) {
    const S = new Spr(48, 64);
    const cls = eq._cls || 'warrior';
    if (cls !== 'warrior') {
      if (!only) drawAura(S, eq, rank, color);
      return classSprite(S, eq, cls, only, pose);
    }
    const armored = !!ARMOR[eq.armor];
    let ax = armored ? 34 : 32, ay = armored ? 37 : 35;
    const sy = armored ? 18 : 21;
    const ps = poseShift(pose, false); ax += ps[0]; ay += ps[1];
    if (only) {
      if (only === 'base') drawBase(S, eq.base);
      else if (only === 'cape') drawCape(S, eq.cape, 18);
      else if (only === 'pack') { drawPack(S, eq.pack, 18); drawFamiliar(S, eq.pack); }
      else if (only === 'armor') { const e = { armor: eq.armor }; drawLegs(S, e); drawTorso(S, e); drawArm(S, e, 'L'); drawArm(S, e, 'R'); drawFist(S, e, 34, 37); }
      else if (only === 'pauldrons') drawPauldrons(S, eq.pauldrons, true);
      else if (only === 'helm') drawHead(S, { helm: eq.helm, armor: 'arm-iron' });
      else if (only === 'weapon') { drawWeapon(S, eq.weapon, 24, 46); drawFist(S, { armor: 'arm-iron' }, 24, 46); }
      return S;
    }
    drawAura(S, eq, rank, color);
    drawBase(S, eq.base);
    drawCape(S, eq.cape, armored ? 17 : 19);
    drawPack(S, eq.pack, sy);
    drawLegs(S, eq);
    drawTorso(S, eq);
    drawArm(S, eq, 'L');
    drawArm(S, eq, 'R');
    drawPauldrons(S, eq.pauldrons, armored);
    drawHead(S, eq);
    drawWeapon(S, eq.weapon, ax, ay);
    drawFist(S, eq, ax, ay);
    drawFamiliar(S, eq.pack);
    return S;
  }

  // ---------- Reliquary Chest (40 x 36 drawn inside a 52 x 46 canvas for glow room), frames: 0 closed, 1 ajar, 2 open ----------
  function chestSprite(frame, color) {
    const S = new Spr(52, 46);
    S.ox = 6; S.oy = 8;
    S.P({ flat: true }); S.ell(20, 33.5, 18, 2.2, 'shadow');
    const lift = frame === 1 ? 3 : 0;
    if (frame === 2) {
      // lid thrown back: inside of the lid, then glowing hoard
      S.P({ round: true }); S.poly([[4, 16], [1, 3], [5, -3], [35, -3], [39, 3], [36, 16]], 'wood', -1);
      for (const x of [8, 14, 20, 26, 32]) for (let y = -1; y < 16; y++) S.tone(x + (y < 4 ? (x < 20 ? -1 : x > 20 ? 1 : 0) : 0), y, -2);
      S.P(); S.poly([[8, 16], [7, -3], [10, -3], [11, 16]], 'iron', -1); S.P(); S.poly([[29, 16], [30, -3], [33, -3], [32, 16]], 'iron', -1);
      S.P({ nocs: true }); S.rect(4, -3, 32, 1, 'gold'); S.line(1, 3, 4, -3, 'gold'); S.line(39, 3, 36, -3, 'gold');
    }
    // body
    S.P({ round: true }); S.rect(4, 18, 32, 14, 'wood');
    for (let x = 5; x < 35; x++) { S.tone(x, 22, -2); S.tone(x, 27, -2); }
    for (const [x, y] of [[7, 20], [16, 24], [24, 20], [33, 25], [13, 29], [26, 29]]) S.tone(x, y, -1);
    S.P({ shine: true }); S.rect(9, 18, 3, 14, 'iron'); S.P({ shine: true }); S.rect(28, 18, 3, 14, 'iron');
    S.P(); S.rect(4, 30, 32, 2, 'iron');
    for (const x of [10, 29]) for (const y of [20, 25]) rivet(S, x, y);
    S.P({ shine: true }); S.rect(3, 27, 5, 6, 'gold'); S.P({ shine: true }); S.rect(32, 27, 5, 6, 'gold');
    S.P({ shine: true }); S.rect(3, 17, 4, 4, 'gold'); S.P({ shine: true }); S.rect(33, 17, 4, 4, 'gold');
    if (frame === 2) {
      S.P({ flat: true }); S.rect(5, 15, 30, 3, 'void');
      S.P({ shine: true });
      S.poly([[7, 18], [10, 14], [15, 12.5], [20, 12], [26, 12.5], [31, 14], [33, 18]], 'gold');
      for (const [x, y] of [[12, 15], [17, 13], [22, 14], [27, 15], [19, 16], [29, 16]]) S.tone(x, y, 4);
      S.P({ flat: true, nocs: true }); S.px(20, 13, 'white'); S.px(15, 14, 'white'); S.px(26, 14, 'white');
      S.P({ shine: true }); S.ell(23.5, 13.5, 1.8, 1.8, 'wax'); S.px(23, 13, 'wax', 14);
    }
    // lock plate with keyhole and skull
    S.P({ shine: true }); S.rect(17, frame === 2 ? 17 : 15, 6, 8 - (frame === 2 ? 2 : 0), 'gold');
    S.P({ flat: true, nocs: true }); S.px(19, 19, 'void'); S.px(20, 19, 'void'); S.px(19, 20, 'void'); S.px(20, 20, 'void'); S.px(19, 21, 'void'); S.px(20, 21, 'void');
    if (frame !== 2) {
      const L = -lift;
      S.P({ round: true });
      S.poly([[3, 17 + L], [3, 11 + L], [5, 7.5 + L], [9, 5.5 + L], [20, 4.5 + L], [31, 5.5 + L], [35, 7.5 + L], [37, 11 + L], [37, 17 + L]], 'wood');
      for (let x = 4; x < 37; x++) S.tone(x, 11 + L, -2);
      S.P({ shine: true }); S.poly([[9, 17 + L], [9, 6 + L], [12, 5.5 + L], [12, 17 + L]], 'iron');
      S.P({ shine: true }); S.poly([[28, 17 + L], [28, 5.5 + L], [31, 6 + L], [31, 17 + L]], 'iron');
      rivet(S, 10, 9 + L); rivet(S, 29, 9 + L); rivet(S, 10, 14 + L); rivet(S, 29, 14 + L);
      S.P({ nocs: true }); S.rect(3, 16 + L, 34, 2, 'gold');
      S.P({ shine: true }); S.rect(17, 13 + L, 6, 4, 'gold');
      skull(S, 20, 9.5 + L);
      if (frame === 1) {
        S.P({ flat: true }); S.rect(5, 15, 30, 3, 'void');
        S.P({ flat: true }); S.rect(6, 16, 28, 1, 'glowY');
        S.glow(20, 16, 16, color || 'glowY', 0.5, true);
      }
    }
    if (frame === 2) {
      S.glow(20, 12, 20, color || 'glowY', 0.55, true);
      S.glow(20, 13, 8, 'glowY', 0.55);
      S.P({ flat: true });
      for (const [x, y0, len] of [[14, 9, 4], [20, 7, 6], [26, 9, 4], [17, 6, 2], [23, 5, 3]]) for (let y = y0; y < y0 + len; y++) if ((x + y) % 2 === 0) S.px(x, y, 'white');
    }
    return S;
  }

  // ================= SIDE PROFILE (walk / run / idle-side) =================
  // Facing right. 56 x 64 so a long stride and trailing cape have room. Body plant at x=30, feet at y=61.
  const SIDE_W = 56, SIDE_CX = 30, SIDE_FEET = 61;
  function gaitPose(loco, frame) {
    const n = 8, p = ((frame % n) + n) % n, tau = (p / n) * Math.PI * 2;
    if (loco === 'idle' || loco === 'stand') {
      const breath = Math.sin(tau) * 0.5;
      return { rx: 1.2, lx: -1.2, rLift: 0, lLift: 0, bob: breath, head: breath * 0.4, cape: -3, flutter: Math.sin(tau * 0.5) * 0.8, lean: 0, armR: 0.5, armL: -0.5, armRY: 0, armLY: 0, run: false };
    }
    const run = loco === 'run';
    const stride = run ? 8 : 5, lift = run ? 5 : 3, flight = run ? 1.2 : 0;
    return {
      rx: Math.cos(tau) * stride,
      rLift: Math.max(flight, -Math.sin(tau)) * lift,
      lx: -Math.cos(tau) * stride,
      lLift: Math.max(flight, Math.sin(tau)) * lift,
      bob: -Math.abs(Math.cos(tau)) * (run ? 3 : 1.4) + (run ? 1 : 0),
      head: -Math.abs(Math.cos(tau - 0.45)) * (run ? 2.2 : 1.1) + (run ? 0.4 : 0),
      cape: -4 - Math.sin(tau - 0.8) * (run ? 4 : 2) - (run ? 3 : 0),
      flutter: Math.sin(tau - 0.8) * (run ? 3.5 : 1.8),
      lean: run ? 5 : 1.5,
      armR: -Math.cos(tau) * (run ? 6 : 4),
      armL: Math.cos(tau) * (run ? 6 : 4),
      armRY: Math.sin(tau) * (run ? 2 : 1.2),
      armLY: -Math.sin(tau) * (run ? 2 : 1.2),
      run
    };
  }
  function capeMatOf(id) {
    if (!id) return null;
    if (id === 'cape-crimson') return 'crimson';
    if (id === 'cape-night' || id === 'mg-cape-void') return 'capeN';
    if (id === 'sh-cape-officer') return 'night';
    if (id === 'mg-cape-star') return 'robeB';
    if (id === 'mg-cape-grey' || id === 'cape-ash') return 'ash';
    if (id === 'sh-cape-camo' || id === 'sh-cape-coat') return 'drab';
    return 'ash';
  }
  function bodyMats(eq, cls) {
    if (cls === 'shooter') {
      const a = SH_ARMOR[eq.armor];
      return { body: a ? (a.plate || a.vest || 'drab') : 'cloth', trim: a ? a.trim : 'leather', boot: 'leather', pants: a ? ((a.vest === 'night' || a.vest === 'crimson') ? 'night' : 'drab') : 'cloth', skin: 'skin' };
    }
    if (cls === 'mage') {
      const r = MG_ROBE[eq.armor];
      return { body: r ? r.robe : 'rag', trim: r ? r.trim : 'wood', boot: 'leather', pants: r ? r.robe : 'rag', skin: 'skin', runes: r && r.runes, stars: r && r.stars };
    }
    const a = ARMOR[eq.armor];
    return { body: a ? a[0] : 'cloth', trim: a ? (a[1] === 'white' ? 'gold' : a[1]) : 'leather', boot: a ? 'iron' : 'rag', pants: a ? (a[0] === 'gold' ? 'gold' : 'iron') : 'skin', skin: 'skin', armored: !!a };
  }
  function sideLeg(S, hipX, hipY, footX, lift, mat, boot, thick) {
    const fy = SIDE_FEET - lift, fx = hipX + footX, mx = hipX + footX * 0.5, my = (hipY + fy) * 0.5, t = thick || 2.2;
    S.P({ shine: true }); S.poly([[hipX - t, hipY], [hipX + t, hipY], [mx + t, my], [mx - t, my]], mat);
    S.P({ shine: true }); S.poly([[mx - t, my], [mx + t, my], [fx + t, fy - 3], [fx - t * 0.8, fy - 3]], mat);
    S.P(); S.poly([[fx - 3, fy - 3], [fx + 5, fy - 3], [fx + 6, fy], [fx - 2, fy]], boot);
  }
  function sideArm(S, shX, shY, handX, handY, mat, skin, thick) {
    const mx = (shX + handX) * 0.5, my = (shY + handY) * 0.5 + 1, t = thick || 1.8;
    S.P({ shine: true }); S.poly([[shX - t, shY], [shX + t, shY + 1], [mx + t, my], [mx - t, my]], mat);
    S.P({ shine: true }); S.poly([[mx - t, my], [mx + t, my], [handX + t, handY], [handX - t, handY]], mat);
    S.P({ shine: true }); S.ell(handX, handY, 1.8, 1.7, skin);
  }
  function drawCapeSide(S, id, shX, shY, G) {
    const mat = capeMatOf(id); if (!mat) return;
    const tail = shX + (G.cape || -4), flutter = G.flutter || 0, hem = SIDE_FEET - 4;
    S.P({ round: true });
    S.poly([[shX - 1, shY], [shX + 4, shY + 2], [tail + 6, shY + 16], [tail + flutter, hem], [tail - 3, hem - 2 + Math.abs(flutter) * 0.3], [tail + 2, shY + 14]], mat);
    S.tone(tail + 2, shY + 20, -1);
    if (id === 'cape-night' || id === 'sh-cape-officer') { S.P({ flat: true, nocs: true }); S.line(tail - 1, hem - 1, tail + 6, hem, 'gold', 2); }
    if (id === 'mg-cape-void') { S.P({ flat: true, nocs: true }); S.line(tail, shY + 16, tail + flutter, hem, 'glowP'); S.glow(tail, shY + 22, 4, 'glowP', 0.3); }
    if (id === 'mg-cape-star') { S.P({ flat: true, nocs: true }); [[tail + 2, shY + 18], [tail, shY + 28], [tail + 4, hem - 6]].forEach(([x, y]) => S.px(x, y, 'white')); }
    if (id === 'sh-cape-camo') { S.P({ flat: true, nocs: true }); S.rect(tail + 1, shY + 20, 2, 2, 'khaki', 1); S.rect(tail, hem - 8, 2, 2, 'leather', 2); }
    if (id === 'cape-ash') { S.P({ flat: true, nocs: true }); S.px(tail + 1, hem - 3, null); S.px(tail + 3, hem - 5, null); }
  }
  function drawPackSide(S, id, cls, backX, backY) {
    if (!id) return;
    if (id === 'pack-banner') {
      S.P(); S.rect(backX - 1, 2, 2, backY + 20, 'wood');
      S.P({ round: true }); S.poly([[backX + 1, 4], [backX + 10, 4], [backX + 10, 16], [backX + 1, 16]], 'crimson');
      skull(S, backX + 5, 9, 'glowR');
      return;
    }
    if (id === 'pack-rack' || id === 'sh-pack-rack') {
      S.P(); S.rect(backX - 2, backY - 2, 8, 8, 'iron');
      S.P({ flat: true }); S.line(backX, backY - 2, backX - 2, backY - 12, 'steel', 1); S.line(backX + 5, backY - 2, backX + 6, backY - 11, 'steel', 0);
      return;
    }
    if (id === 'pack-censer') {
      S.P({ shine: true }); S.rect(backX - 1, backY, 8, 8, 'brass');
      S.P({ shine: true }); S.ell(backX - 3, backY + 12, 2.4, 2.4, 'brass'); S.glow(backX - 3, backY + 12, 4, 'ember', 0.4);
      return;
    }
    if (id === 'sh-pack-vox') { S.P({ shine: true }); S.rect(backX, backY, 7, 8, 'urban'); S.P(); S.rect(backX + 2, backY - 3, 2, 3, 'iron'); return; }
    if (id === 'mg-pack-scrolls' || id === 'mg-pack-tome' || id === 'mg-pack-candles') {
      S.P({ shine: true }); S.rect(backX, backY, 6, 8, id === 'mg-pack-tome' ? 'leather' : 'parch');
      if (id === 'mg-pack-candles') { S.P(); S.rect(backX + 1, backY - 4, 1, 4, 'parch'); S.px(backX + 1, backY - 5, 'ember'); }
      return;
    }
    S.P({ shine: true }); S.rect(backX, backY, 8, 9, cls === 'shooter' ? 'drab' : 'iron');
  }
  function drawPaulSide(S, id, cls, x, y) {
    if (!id) return;
    if (cls === 'mage') {
      const mat = id === 'mg-paul-fur' ? 'fur' : id === 'mg-paul-bone' ? 'bone' : id === 'mg-paul-crystal' ? 'crystal' : 'gold';
      S.P({ shine: true, round: true }); S.poly([[x - 4, y + 4], [x - 3, y - 2], [x + 5, y - 3], [x + 6, y + 3]], mat);
      if (id === 'mg-paul-crystal') { S.P({ flat: true }); S.line(x, y - 2, x + 1, y - 8, 'crystal', 2); S.glow(x + 1, y - 6, 3, 'glowC', 0.4); }
      if (id === 'mg-paul-bone') skull(S, x, y, 'void');
      return;
    }
    if (cls === 'shooter') {
      const mat = id === 'sh-paul-gilt' ? 'gold' : id === 'sh-paul-stripe' ? 'steel' : 'drab';
      S.P({ shine: true }); S.rect(x - 3, y, 8, 4, mat);
      if (id === 'sh-paul-gilt') { S.P({ flat: true, nocs: true }); S.line(x - 2, y, x + 4, y, 'gold', 3); }
      return;
    }
    const mat = (id === 'paul-gilt' || id === 'paul-sun') ? 'gold' : id === 'paul-bone' ? 'bone' : 'iron';
    S.P({ shine: true, round: true }); S.poly([[x - 4, y + 6], [x - 4, y - 1], [x + 1, y - 4], [x + 7, y - 2], [x + 6, y + 5]], mat);
    if (id === 'paul-spike') { S.P({ flat: true }); S.line(x, y - 2, x, y - 9, 'steel', 2); S.line(x + 3, y - 2, x + 4, y - 8, 'steel', 1); }
    if (id === 'paul-bone') skull(S, x + 1, y, 'void');
    if (id === 'paul-gilt' || id === 'paul-sun') { S.P({ flat: true, nocs: true }); S.line(x - 2, y - 1, x + 5, y - 1, 'gold', 3); }
  }
  function drawHeadSide(S, eq, cls, cx, cy) {
    const id = eq.helm;
    S.P({ shine: true }); S.ell(cx, cy, 4, 5, 'skin');
    S.P({ shine: true }); S.poly([[cx + 2, cy - 3], [cx + 6, cy - 1], [cx + 6.5, cy + 1], [cx + 5, cy + 3], [cx + 2, cy + 4]], 'skin');
    S.P({ flat: true, nocs: true }); S.px(cx + 3, cy - 1, 'void'); S.px(cx + 3, cy - 2, 'skin', 0); S.line(cx + 4, cy + 2, cx + 5, cy + 2, 'skin', 0);
    S.P(); S.ell(cx - 3, cy, 1.3, 1.7, 'skin');
    if (!id) {
      if (cls === 'mage') {
        const robe = bodyMats(eq, cls).body;
        S.P({ round: true }); S.poly([[cx - 6, cy + 6], [cx - 6, cy - 2], [cx - 2, cy - 7], [cx + 4, cy - 6], [cx + 6, cy - 1], [cx + 3, cy + 1], [cx - 2, cy + 1], [cx - 4, cy + 6]], robe);
      } else {
        S.P(); S.poly([[cx - 4, cy - 1], [cx - 3, cy - 6], [cx + 2, cy - 6], [cx + 4, cy - 3], [cx + 1, cy - 1]], 'hair');
      }
      return;
    }
    if (id.indexOf('mg-helm') === 0) {
      const robe = bodyMats(eq, cls).body;
      S.P({ round: true }); S.poly([[cx - 6, cy + 6], [cx - 7, cy - 1], [cx - 2, cy - 8], [cx + 5, cy - 7], [cx + 7, cy - 1], [cx + 4, cy + 1], [cx - 2, cy + 2], [cx - 4, cy + 7]], robe);
      if (id === 'mg-helm-circlet' || id === 'mg-helm-crown') { S.P({ shine: true }); S.rect(cx - 3, cy - 5, 8, 2, 'gold'); }
      if (id === 'mg-helm-crystal') { S.P({ flat: true }); S.line(cx + 1, cy - 7, cx + 2, cy - 12, 'crystal', 2); S.glow(cx + 2, cy - 10, 3, 'glowC', 0.4); }
      if (id === 'mg-helm-mask' || id === 'mg-helm-crown') { S.P({ shine: true }); S.ell(cx + 2, cy, 3, 3.2, 'gold'); S.P({ flat: true, nocs: true }); S.px(cx + 3, cy - 1, 'glowY'); }
      return;
    }
    if (id.indexOf('sh-helm') === 0) {
      if (id === 'sh-helm-cap' || id === 'sh-helm-peak') {
        S.P(); S.poly([[cx - 5, cy], [cx - 3, cy - 5], [cx + 3, cy - 5], [cx + 6, cy - 1], [cx + 8, cy + 1], [cx + 2, cy + 1]], id === 'sh-helm-peak' ? 'night' : 'drab');
        if (id === 'sh-helm-peak') { S.P({ flat: true, nocs: true }); S.line(cx - 2, cy - 2, cx + 5, cy - 2, 'gold', 2); }
      } else {
        const mat = id === 'sh-helm-sun' ? 'gold' : 'iron';
        S.P({ shine: true, round: true }); S.poly([[cx - 5, cy + 3], [cx - 5, cy - 3], [cx, cy - 6], [cx + 5, cy - 5], [cx + 6, cy + 2], [cx + 3, cy + 5]], mat);
        S.P({ flat: true, nocs: true }); S.rect(cx + 1, cy - 1, 5, 2, 'void');
        if (id === 'sh-helm-mask') { S.P(); S.rect(cx, cy + 1, 6, 3, 'urban'); }
        if (id === 'sh-helm-sun') S.glow(cx + 2, cy - 5, 4, 'ember', 0.4);
      }
      return;
    }
    const goldish = id === 'helm-mask' || id === 'helm-phoenix' || id === 'helm-laurel';
    const mat = goldish ? 'gold' : id === 'helm-skull' ? 'bone' : 'iron';
    if (id === 'helm-crest') { S.P({ round: true }); S.poly([[cx - 1, cy - 5], [cx + 1, cy - 12], [cx + 6, cy - 8], [cx + 4, cy - 5]], 'plume'); }
    if (id === 'helm-phoenix') { S.P({ round: true }); S.poly([[cx, cy - 6], [cx + 1, cy - 12], [cx + 4, cy - 7]], 'gold'); S.px(cx + 1, cy - 12, 'fire'); S.glow(cx + 1, cy - 11, 3, 'ember', 0.5); }
    if (id === 'helm-horn') { S.P(); S.poly([[cx + 2, cy - 4], [cx + 8, cy - 10], [cx + 7, cy - 6], [cx + 3, cy - 3]], 'bone'); }
    S.P({ shine: true, round: true }); S.poly([[cx - 5, cy + 4], [cx - 5, cy - 3], [cx - 1, cy - 7], [cx + 4, cy - 6], [cx + 6, cy - 1], [cx + 5, cy + 5], [cx + 1, cy + 6]], mat);
    S.P({ flat: true, nocs: true }); S.rect(cx + 1, cy - 1, 5, 2, 'void');
    const glow = id === 'helm-phoenix' || id === 'helm-mask' ? 'glowY' : (id === 'helm-skull' ? 'glowR' : 'glowC');
    S.rect(cx + 2, cy - 1, 3, 1, glow);
    if (id === 'helm-skull' || id === 'helm-mask') { S.P({ shine: true }); S.ell(cx + 2, cy + 1, 3, 3, id === 'helm-mask' ? 'gold' : 'bone'); S.P({ flat: true, nocs: true }); S.px(cx + 3, cy, glow); }
    if (id === 'helm-laurel') { S.P({ flat: true, nocs: true }); S.line(cx - 3, cy - 5, cx + 4, cy - 6, 'leaf', 2); }
  }
  function drawWepSide(S, id, cls, hx, hy, G) {
    id = id || '';
    if (cls === 'mage' || id.indexOf('mg-wep') === 0) {
      if (id === 'mg-wep-sword') {
        S.P({ shine: true }); S.poly([[hx, hy - 2], [hx + 14, hy - 4], [hx + 15, hy - 2], [hx, hy + 1]], 'steel');
        S.P(); S.rect(hx - 2, hy - 1, 4, 3, 'leather');
        return;
      }
      const tipy = hy - 20 + (G.armRY || 0), tipx = hx - 1 + (G.armR || 0) * 0.15;
      const mat = id === 'mg-wep-iron' ? 'iron' : (id === 'mg-wep-crystal' ? 'crystal' : 'wood');
      S.P(); S.line(hx, hy, tipx, tipy, mat, 2);
      S.P({ shine: true });
      if (id === 'mg-wep-skull') skull(S, tipx, tipy, 'glowP');
      else if (id === 'mg-wep-orb' || id === 'mg-wep-eye' || id === 'mg-wep-storm') {
        S.ell(tipx, tipy, 2.4, 2.4, id === 'mg-wep-storm' ? 'gold' : 'crystal');
        S.P({ flat: true, nocs: true }); S.px(tipx, tipy, 'glowP'); S.glow(tipx, tipy, 5, 'glowP', 0.45);
      } else if (id === 'mg-wep-crystal') {
        S.poly([[tipx, tipy - 4], [tipx + 2, tipy], [tipx, tipy + 2], [tipx - 2, tipy]], 'crystal'); S.glow(tipx, tipy, 4, 'glowC', 0.4);
      } else S.ell(tipx, tipy, 1.6, 1.6, 'wood');
      return;
    }
    const gun = cls === 'shooter' || /rifle|carbine|sun|slug|siege|revolver|boltc|pipe/.test(id);
    if (gun) {
      const mat = /sun|siege/.test(id) ? 'gold' : (/slug|boltc/.test(id) ? 'blood' : 'iron');
      S.P({ shine: true }); S.rect(hx - 2, hy - 2, 14, 3, mat);
      S.P(); S.rect(hx + 12, hy - 3, 5, 2, 'steel');
      S.P(); S.rect(hx - 4, hy - 1, 3, 4, 'wood');
      S.P({ flat: true, nocs: true }); S.px(hx + 16, hy - 3, 'void');
      if (/sun/.test(id)) S.glow(hx + 14, hy - 2, 4, 'ember', 0.4);
      return;
    }
    S.P(); S.rect(hx - 1, hy - 2, 3, 5, 'leather');
    if (id === 'wep-axe' || id === 'wep-maul' || id === 'wep-storm') {
      S.P(); S.line(hx, hy, hx + 1, hy - 16, 'wood', 2);
      S.P({ shine: true });
      if (id === 'wep-axe') S.poly([[hx - 2, hy - 16], [hx + 8, hy - 14], [hx + 8, hy - 18], [hx, hy - 20]], 'steel');
      else S.ell(hx + 1, hy - 17, 4, 3.2, 'iron');
      if (id === 'wep-storm' || id === 'wep-maul') S.glow(hx + 1, hy - 17, 4, 'glowC', 0.35);
    } else {
      S.P({ round: true, shine: true }); S.poly([[hx - 1, hy - 3], [hx + 3, hy - 4], [hx + 4, hy - 18], [hx + 2, hy - 21], [hx, hy - 18]], 'steel');
      S.P(); S.rect(hx - 3, hy - 4, 7, 2, id === 'wep-rune' ? 'brass' : 'iron');
      if (id === 'wep-rune' || id === 'wep-glaive') { S.P({ flat: true, nocs: true }); S.px(hx + 2, hy - 12, 'glowC'); S.glow(hx + 2, hy - 12, 4, id === 'wep-glaive' ? 'ember' : 'glowC', 0.35); }
    }
  }
  function drawFamiliarSide(S, id, x, y) {
    if (id === 'pack-skull') { S.P({ shine: true }); S.ell(x, y, 3.4, 3.2, 'bone'); S.P({ flat: true, nocs: true }); S.px(x + 1, y, 'glowR'); S.glow(x, y, 3, 'glowR', 0.35); }
    else if (id === 'sh-pack-drone') { S.P({ shine: true }); S.ell(x, y, 3, 2.2, 'iron'); S.P({ flat: true, nocs: true }); S.px(x + 1, y, 'glowC'); }
    else if (id === 'mg-pack-grimoire') { S.P({ shine: true }); S.rect(x - 3, y - 3, 7, 6, 'leather'); S.glow(x, y, 3, 'glowP', 0.35); }
  }
  function drawHeroSide(S, eq, cls, loco, frame) {
    const G = gaitPose(loco, frame), M = bodyMats(eq, cls);
    const bob = G.bob, lean = G.lean;
    const hipX = SIDE_CX + lean * 0.3, hipY = 44 + bob;
    const chestX = SIDE_CX + lean, chestY = 22 + bob;
    const headX = chestX + 3, headY = 11 + G.head;
    const shX = chestX + 1, shY = 20 + bob;
    S.P({ flat: true }); S.ell(SIDE_CX + (G.rx + G.lx) * 0.15, SIDE_FEET + 0.5, 12, 2.2, 'shadow');
    if (cls !== 'mage') sideLeg(S, hipX - 1, hipY, G.lx, G.lLift, M.pants, M.boot, 2);
    drawCapeSide(S, eq.cape, shX - 3, shY, G);
    drawPackSide(S, eq.pack, cls, shX - 7, shY + 4);
    sideArm(S, shX - 2, shY + 2, shX - 2 + G.armL - 1, shY + 16 + G.armLY, M.body, M.skin, 1.6);
    if (cls === 'mage') {
      S.P({ round: true, shine: true });
      S.poly([[chestX - 3, chestY], [chestX + 5, chestY], [chestX + 6, hipY], [chestX + 7 + G.flutter * 0.3, SIDE_FEET - 1], [chestX - 4 + G.cape * 0.2, SIDE_FEET - 1], [chestX - 4, hipY]], M.body);
      if (M.trim && M.trim !== 'iron') { S.P({ flat: true, nocs: true }); S.line(chestX - 3, SIDE_FEET - 2, chestX + 6, SIDE_FEET - 2, M.trim, 2); }
      const fwd = G.rx >= G.lx ? [G.rx, G.rLift] : [G.lx, G.lLift];
      S.P(); S.poly([[hipX + fwd[0] - 2, SIDE_FEET - fwd[1] - 3], [hipX + fwd[0] + 5, SIDE_FEET - fwd[1] - 3], [hipX + fwd[0] + 6, SIDE_FEET - fwd[1]], [hipX + fwd[0] - 1, SIDE_FEET - fwd[1]]], M.boot);
      if (M.runes) { S.P({ flat: true, nocs: true }); S.px(chestX + 1, hipY, M.runes); S.glow(chestX + 1, hipY - 4, 5, M.runes, 0.25); }
      if (M.stars) { S.P({ flat: true, nocs: true }); S.px(chestX, hipY - 6, 'white'); S.px(chestX + 3, hipY + 4, 'white'); }
    } else {
      S.P({ shine: true, round: true });
      S.poly([[chestX - 3, chestY], [chestX + 6, chestY + 1], [chestX + 5, hipY + 2], [chestX - 3, hipY + 3]], M.body);
      if (M.trim) { S.P({ nocs: true }); S.rect(chestX - 2, hipY - 2, 8, 2, M.trim === 'white' ? 'gold' : M.trim); }
      sideLeg(S, hipX + 1, hipY, G.rx, G.rLift, M.pants, M.boot, 2.3);
    }
    S.P(); S.rect(chestX, chestY - 3, 3, 4, M.skin, -1);
    drawPaulSide(S, eq.pauldrons, cls, shX + 2, shY);
    drawHeadSide(S, eq, cls, headX, headY);
    if (cls === 'shooter') {
      const hx = shX + 8, hy = shY + 10 + G.armRY * 0.3;
      sideArm(S, shX + 2, shY, hx, hy, M.body, 'leather', 1.8);
      drawWepSide(S, eq.weapon, cls, hx, hy, G);
    } else {
      const hx = shX + 4 + G.armR, hy = shY + 15 + G.armRY;
      sideArm(S, shX + 2, shY, hx, hy, M.body, M.skin, 1.9);
      drawWepSide(S, eq.weapon, cls, hx, hy, G);
    }
    if (eq.pack === 'pack-skull' || eq.pack === 'sh-pack-drone' || eq.pack === 'mg-pack-grimoire') {
      drawFamiliarSide(S, eq.pack, headX - 10, headY - 4 + Math.sin((frame || 0) * 0.7) * 1.5);
    }
  }
  function heroSpriteSide(eq, rank, color, loco, frame) {
    const S = new Spr(SIDE_W, 64);
    drawHeroSide(S, eq || {}, eq && eq._cls || 'warrior', loco || 'run', frame | 0);
    return S;
  }

  const cache = new Map(), ccache = new Map(), scache = new Map();

  function url(key, make, crop) {
    let u = cache.get(key);
    if (!u) {
      try { u = toCanvas(make(), crop).toDataURL('image/png'); } catch (e) { u = ''; }
      if (cache.size > 120) cache.clear();
      cache.set(key, u);
    }
    return u;
  }
  window.PLPixel = {
    hero(eq, rank, color, only) {
      return url('h|' + JSON.stringify(eq) + '|' + rank + '|' + color + '|' + (only || ''), () => heroSprite(eq, rank, color, only), only ? 'auto' : null);
    },
    chest(frame, color) { return url('c|' + frame + '|' + (color || ''), () => chestSprite(frame, color)); },
    // raw canvases for the battle strip (cached)
    heroCanvas(eq, rank, color, pose) {
      const k = 'hc|' + JSON.stringify(eq) + '|' + rank + '|' + color + '|' + (pose || '');
      let c = ccache.get(k);
      if (!c) { c = toCanvas(heroSprite(eq, rank, color, '', pose)); if (ccache.size > 80) ccache.clear(); ccache.set(k, c); }
      return c;
    },
    heroCanvasSide(eq, rank, color, loco, frame) {
      const k = 'hs|' + JSON.stringify(eq) + '|' + rank + '|' + color + '|' + (loco || 'run') + '|' + (frame | 0);
      let c = scache.get(k);
      if (!c) {
        c = toCanvas(heroSpriteSide(eq, rank, color, loco, frame));
        c._ax = SIDE_CX;
        if (scache.size > 120) scache.clear();
        scache.set(k, c);
      }
      return c;
    },
    gaitPose: gaitPose,
    Spr: Spr, toCanvas: toCanvas, skull: skull,
    HERO_W: 48, HERO_H: 64, HERO_SIDE_W: SIDE_W, HERO_SIDE_AX: SIDE_CX, CHEST_W: 52, CHEST_H: 46
  };
})();
