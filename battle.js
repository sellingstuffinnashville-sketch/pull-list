// Idle auto-battler strip: the hero runs through the cave in his equipped gear and fights monsters.
// Cosmetic only. No XP is earned here; kills are saved under pl_battle. Original monsters and art.
'use strict';
(function () {
  const BAT_KEY = 'pl_battler', STAT_KEY = 'pl_battle';
  const H = 76, FPS = 12, HERO_Y = H - 69;
  const RR = { common: 1, uncommon: 2, rare: 3, relic: 4, legendary: 5 };
  const GUNS = { 'wep-rifle': 1, 'wep-carbine': 1, 'wep-sun': 1, 'wep-slug': 1, 'wep-siege': 1 };

  // ---------- stats ----------
  function rk(eq, slot) {
    const it = typeof ITEM_BY_ID !== 'undefined' && ITEM_BY_ID[eq[slot]];
    return it ? RR[it.rarity] || 0 : 0;
  }
  const CLS_MOD = { warrior: [1, 1.2], shooter: [1.1, 1], mage: [1.2, 0.9] };
  const CLS_SPD = { warrior: 0, shooter: 4, mage: 2 };
  function clsNow() { return (st && st.forceCls) || (typeof xpState !== 'undefined' && xpState.cls) || 'warrior'; }
  function stats(eq, level, cls) {
    eq = eq || {}; level = Math.max(1, level | 0);
    cls = cls || clsNow();
    const m = CLS_MOD[cls] || CLS_MOD.warrior;
    const def = Math.floor((level + 1) / 2) + 2 * (rk(eq, 'armor') + rk(eq, 'helm') + rk(eq, 'pauldrons')) + rk(eq, 'cape') + rk(eq, 'base');
    return {
      atk: Math.round((5 + 2 * level + 4 * rk(eq, 'weapon') + rk(eq, 'pack')) * m[0]),
      arm: def,
      def,
      hp: Math.round((40 + 6 * level + 4 * rk(eq, 'armor') + 2 * rk(eq, 'cape') + 2 * rk(eq, 'helm')) * m[1]),
      spd: Math.round(6 + level + rk(eq, 'pack') + (CLS_SPD[cls] || 0)),
      crit: Math.min(40, Math.round(8 + level * 0.7 + 2 * rk(eq, 'weapon') + (cls === 'mage' ? 4 : 0)))
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
  function mk(w, h, draw, k, detail) {
    k = k || 1;
    const S = new (P().Spr)(Math.ceil(w * k) + 2, Math.ceil(h * k) + 2);
    S.ox = 1; S.oy = 1; S.k = k; draw(S);
    if (detail) { S.k = 1; detail(S, k); }
    return P().toCanvas(S);
  }
  const MON = {
    rat: { k: 3.1, name: 'Cave Rat', hp: 10, dmg: 2, w: 20, h: 11, min: 1, wt: 30, speed: 1.4, gait: 'scurry', draw(S) {
      S.P({ round: true }); S.ell(11, 6.5, 6.5, 3.6, 'fur'); S.tone(9, 4, 1);
      S.P(); S.poly([[1, 7], [5, 3.5], [8, 4], [8, 9], [4, 9]], 'fur'); S.px(5, 3, 'skin', 2); S.px(6, 2, 'skin', 1);
      S.P({ flat: true, nocs: true }); S.px(4, 5, 'glowR'); S.px(1, 7, 'skin', 3); S.px(2, 8, 'bone', 4);
      S.P({ flat: true }); S.line(17, 6, 19, 3, 'skin', 1); S.px(19, 2, 'skin', 1);
      S.P({ flat: true }); S.px(6, 10, 'skin', 1); S.px(9, 10, 'skin', 1); S.px(13, 10, 'skin', 1); S.px(16, 10, 'skin', 1);
    } },
    skel: { k: 1.6, name: 'Bone Walker', hp: 18, dmg: 3, w: 18, h: 27, min: 1, wt: 26, speed: 1, gait: 'walk', draw(S) {
      S.P({ shine: true }); S.ell(9, 4.5, 3.4, 3.6, 'bone'); S.rect(7, 7, 4, 2, 'bone');
      S.P({ flat: true, nocs: true }); S.px(7, 4, 'void'); S.px(10, 4, 'void'); S.px(7, 4, 'glowR'); S.px(8, 8, 'void');
      S.P(); S.rect(9, 9, 1, 9, 'bone');
      S.P({ flat: true }); for (let y = 10; y < 16; y += 2) S.line(6, y, 12, y, 'bone', 2);
      S.P(); S.rect(7, 17, 5, 2, 'bone');
      S.P({ flat: true }); S.line(8, 19, 7, 26, 'bone', 2); S.line(11, 19, 12, 26, 'bone', 1);
      S.line(6, 10, 4, 15, 'bone', 2); S.line(12, 10, 13, 15, 'bone', 1);
      S.P(); S.line(4, 15, 0, 9, 'rust'); S.line(4, 16, 1, 10, 'rust', -1); S.P(); S.rect(3, 15, 3, 1, 'iron');
    } },
    cult: { k: 1.6, name: 'Hooded Zealot', hp: 24, dmg: 4, w: 18, h: 27, min: 2, wt: 20, speed: 1, gait: 'walk', draw(S) {
      S.P({ round: true }); S.poly([[5, 9], [13, 9], [15, 26], [3, 26]], 'crimson'); S.tone(7, 15, 1); S.tone(12, 20, -1);
      S.P({ round: true }); S.poly([[5, 9], [6, 3], [9, 1], [12, 3], [13, 9]], 'crimson', -1);
      S.P({ flat: true, nocs: true }); S.rect(6, 4, 5, 4, 'void'); S.px(7, 5, 'glowY'); S.px(9, 5, 'glowY');
      S.P({ nocs: true, flat: true }); S.line(4, 25, 14, 25, 'gold', 2); S.rect(8, 11, 2, 6, 'gold', 2);
      S.P(); S.rect(3, 15, 3, 2, 'skin', -1);
      S.P(); S.poly([[0, 13], [4, 15], [4, 16], [0, 15]], 'steel');
    } },
    crawl: { k: 2.7, name: 'Plague Crawler', hp: 20, dmg: 3, w: 24, h: 13, min: 3, wt: 16, speed: 1.2, gait: 'scuttle', draw(S) {
      S.P({ flat: true }); for (let k = 0; k < 4; k++) { S.line(6 + k * 4, 9, 4 + k * 4, 12, 'sick', 1); S.line(7 + k * 4, 9, 9 + k * 4, 12, 'sick', 0); }
      S.P({ round: true }); S.ell(16, 7, 6, 4.4, 'sick');
      S.P({ round: true }); S.ell(9, 7, 4.5, 4, 'sick');
      S.P({ round: true }); S.ell(4, 7.5, 3.4, 3, 'flesh');
      S.P({ flat: true, nocs: true }); S.px(2, 6, 'glowR'); S.px(1, 9, 'bone', 4); S.px(3, 10, 'bone', 4);
      S.px(15, 4, 'glowG'); S.px(18, 5, 'glowG'); S.px(12, 5, 'glowG');
      
    } },
    mut: { k: 1.6, name: 'Pit Mutant', hp: 34, dmg: 5, w: 24, h: 28, min: 4, wt: 12, speed: 0.8, gait: 'walk', draw(S) {
      S.P(); S.rect(10, 20, 3, 8, 'flesh', -1); S.P(); S.rect(15, 20, 3, 8, 'flesh', -1);
      S.P({ round: true, shine: true }); S.ell(14, 14, 7.5, 8, 'flesh');
      S.P({ flat: true, nocs: true }); S.line(11, 10, 17, 17, 'skin', 0); for (let k = 0; k < 4; k++) S.px(12 + k * 1.6, 12 + k * 1.6, 'bone', 3);
      S.P({ shine: true }); S.ell(12, 5, 3, 3, 'flesh'); S.P({ flat: true, nocs: true }); S.px(10, 4, 'glowY'); S.px(10, 6, 'void');
      S.P({ round: true }); S.poly([[8, 10], [3, 14], [1, 21], [6, 22], [9, 16]], 'flesh'); S.P({ shine: true }); S.ell(3, 22, 3, 2.5, 'flesh', 1);
      S.P({ flat: true }); S.px(1, 24, 'bone', 4); S.px(4, 24, 'bone', 4); S.P(); S.rect(10, 17, 9, 2, 'leather');
    } },
    brute: { k: 1.55, name: 'Horned Brute', hp: 48, dmg: 6, w: 28, h: 33, min: 6, wt: 9, speed: 0.8, gait: 'lumber', draw(S) {
      S.P(); S.poly([[10, 22], [14, 22], [13, 32], [8, 32]], 'demon'); S.P(); S.poly([[17, 22], [21, 22], [22, 32], [17, 32]], 'demon', -1);
      S.P({ round: true, shine: true }); S.poly([[7, 10], [22, 9], [24, 16], [21, 23], [9, 23], [6, 16]], 'demon');
      S.P({ round: true }); S.ell(12, 7, 4.2, 4, 'demon');
      S.P({ round: false }); S.poly([[10, 4], [7, 0], [6, 2], [9, 6]], 'bone'); S.poly([[15, 4], [18, 0], [19, 2], [15, 6]], 'bone');
      S.P({ flat: true, nocs: true }); S.px(10, 7, 'glowY'); S.px(13, 7, 'glowY'); S.line(9, 10, 13, 10, 'bone', 4);
      S.P({ round: true }); S.poly([[7, 11], [2, 16], [1, 24], [5, 24], [8, 17]], 'demon');
      S.P({ flat: true }); S.px(0, 25, 'bone', 4); S.px(2, 26, 'bone', 4); S.px(4, 25, 'bone', 4);
      S.P(); S.rect(9, 20, 13, 2, 'iron');
    } },
    boss: { k: 1.5, name: 'Ash Tyrant', hp: 90, dmg: 7, w: 34, h: 42, min: 1, wt: 0, speed: 0.7, boss: true, gait: 'lumber', draw(S) {
      S.P({ round: true }); S.poly([[13, 12], [27, 12], [32, 40], [8, 40]], 'crimson', -1);
      S.P(); S.rect(12, 30, 5, 11, 'night'); S.P(); S.rect(20, 30, 5, 11, 'night', -1);
      S.P(); S.rect(11, 39, 7, 3, 'iron'); S.P(); S.rect(19, 39, 7, 3, 'iron');
      S.P({ round: true, shine: true }); S.poly([[9, 13], [27, 13], [28, 22], [25, 31], [11, 31], [8, 22]], 'night');
      S.P({ nocs: true, flat: true }); S.line(11, 29, 25, 29, 'gold', 3);
      S.P({ round: true, shine: true }); S.ell(9, 15, 5, 4, 'night'); S.P({ round: true, shine: true }); S.ell(27, 15, 5, 4, 'night', -1);
      S.P({ shine: true }); S.poly([[14, 12], [14, 5], [16, 3], [21, 3], [23, 5], [23, 12]], 'night');
      S.P({ flat: true, nocs: true }); S.rect(15, 7, 7, 2, 'void'); S.px(16, 7, 'glowP'); S.px(19, 7, 'glowP');
      S.P({ flat: true }); for (const x of [14, 16, 18, 20, 22]) S.line(x, 3, x, x === 18 ? -1 : 0, 'gold', 3);
      S.P(); S.rect(4, 17, 4, 7, 'night'); S.P({ shine: true }); S.ell(5.5, 25, 2.6, 2.4, 'iron');
      S.P({ shine: true }); S.poly([[5, 24], [6, 24], [3, 2], [1, 0], [2, 4]], 'steel');
      S.P({ flat: true, nocs: true }); S.line(4, 20, 2, 6, 'glowP', 0); S.rect(2, 23, 7, 1, 'gold', 3);
      S.glow(17.5, 7.5, 4, 'glowP', 0.45);
    } },
    wisp: { k: 2.4, name: 'Ash Wisp', hp: 22, dmg: 4, w: 14, h: 16, min: 5, wt: 14, speed: 1.3, gait: 'hover', draw(S) {
      S.P({ flat: true }); S.glow(7, 8, 7, 'ember', 0.5); S.glow(7, 6, 4, 'glowY', 0.45);
      S.P({ shine: true }); S.ell(7, 7, 3.4, 3.8, 'gold');
      S.P({ flat: true, nocs: true }); S.px(6, 6, 'white'); S.px(7, 7, 'glowY');
      S.P({ flat: true }); S.line(6, 11, 4, 15, 'ember', 1); S.line(8, 11, 10, 15, 'ember', 0); S.px(7, 13, 'fire');
    } },
    rustknight: { k: 1.55, name: 'Rust Knight', hp: 42, dmg: 5, w: 20, h: 30, min: 7, wt: 11, speed: 0.85, gait: 'lumber', draw(S) {
      S.P(); S.rect(7, 20, 4, 10, 'rust'); S.P(); S.rect(12, 20, 4, 10, 'rust', -1);
      S.P(); S.rect(6, 28, 6, 2, 'iron'); S.P(); S.rect(11, 28, 6, 2, 'iron');
      S.P({ shine: true, round: true }); S.rect(6, 11, 11, 10, 'rust');
      S.P({ shine: true }); S.ell(11, 6, 4, 4.2, 'iron');
      S.P({ flat: true, nocs: true }); S.rect(8, 5, 6, 2, 'void'); S.px(9, 6, 'glowR'); S.px(13, 6, 'glowR');
      S.P({ shine: true }); S.rect(5, 10, 4, 3, 'rust'); S.rect(13, 10, 4, 3, 'rust');
      S.P(); S.line(3, 14, 0, 22, 'rust'); S.P({ shine: true }); S.poly([[0, 12], [4, 14], [4, 22], [1, 24], [-1, 16]], 'iron');
      S.P(); S.line(16, 14, 19, 8, 'rust'); S.P({ shine: true }); S.poly([[18, 8], [20, 4], [19, 8], [20, 12]], 'steel');
    } },
    wraith: { k: 1.55, name: 'Grave Wraith', hp: 38, dmg: 6, w: 18, h: 32, min: 9, wt: 10, speed: 1.1, gait: 'drift', draw(S) {
      S.P({ round: true }); S.poly([[4, 10], [14, 10], [16, 30], [9, 32], [2, 30]], 'capeN');
      S.tone(7, 18, 1); S.tone(12, 22, -1);
      S.P({ round: true }); S.poly([[5, 10], [6, 3], [9, 1], [12, 3], [13, 10]], 'night');
      S.P({ flat: true, nocs: true }); S.rect(6, 4, 6, 4, 'void'); S.px(7, 6, 'glowP'); S.px(11, 6, 'glowP');
      S.P(); S.rect(2, 16, 3, 2, 'bone');
      S.P({ flat: true }); S.line(3, 17, 0, 8, 'glowP', 0);
      S.glow(9, 6, 5, 'glowP', 0.4);
      for (let x = 3; x < 16; x += 3) S.px(x, 30 - (x % 2), null);
    } },
    wyrm: { k: 1.5, name: 'Cave Wyrm', hp: 58, dmg: 7, w: 32, h: 24, min: 12, wt: 7, speed: 0.9, gait: 'slither', draw(S) {
      S.P({ round: true }); S.poly([[18, 10], [30, 4], [28, 12], [22, 14]], 'demon');
      S.P({ round: true, shine: true }); S.ell(16, 14, 10, 6, 'demon');
      S.P({ round: true }); S.ell(6, 12, 5, 4.2, 'demon');
      S.P({ flat: true, nocs: true }); S.px(3, 11, 'glowY'); S.px(4, 12, 'void'); S.px(2, 14, 'glowR');
      S.P(); S.poly([[2, 14], [0, 16], [3, 16]], 'bone');
      S.P({ flat: true }); S.line(24, 16, 30, 20, 'demon', 1); S.line(22, 17, 28, 22, 'demon', 0);
      S.P({ flat: true }); S.px(8, 19, 'bone', 4); S.px(14, 20, 'bone', 4); S.px(20, 19, 'bone', 4);
      S.P({ flat: true, nocs: true }); S.px(1, 13, 'fire'); S.glow(3, 13, 4, 'ember', 0.45);
    } },
    lich: { k: 1.5, name: 'Vault Lich', hp: 110, dmg: 8, w: 30, h: 40, min: 8, wt: 0, speed: 0.75, boss: true, gait: 'lumber', draw(S) {
      S.P({ round: true }); S.poly([[8, 14], [22, 14], [26, 38], [6, 38]], 'capeN', -1);
      S.P(); S.rect(10, 28, 4, 12, 'bone'); S.P(); S.rect(16, 28, 4, 12, 'bone', -1);
      S.P({ shine: true }); S.ell(14, 8, 5, 5.2, 'bone');
      S.P({ flat: true, nocs: true }); S.px(12, 7, 'void'); S.px(16, 7, 'void'); S.px(12, 7, 'glowP'); S.px(14, 10, 'void');
      S.P(); S.rect(12, 13, 5, 2, 'bone'); S.rect(13, 15, 3, 10, 'bone');
      S.P({ flat: true }); for (let y = 16; y < 24; y += 2) S.line(10, y, 18, y, 'bone', 2);
      S.P(); S.line(8, 16, 2, 6, 'night'); S.P({ shine: true }); S.ell(2, 5, 2.4, 2.4, 'crystal');
      S.P({ flat: true, nocs: true }); S.px(2, 5, 'glowP'); S.glow(2, 5, 5, 'glowP', 0.5); S.glow(14, 7, 5, 'glowP', 0.4);
      S.P({ nocs: true, flat: true }); S.line(9, 26, 19, 26, 'gold', 3);
    } }
  };
  // fine detail drawn at full resolution after scaling (q = scaled coordinate)
  const DETAIL = {
    rat(S, k) {
      const q = v => Math.round(v * k);
      for (let x = 7; x < 16; x += 2) S.tone(q(x), q(3.4), -2);
      for (let x = 8; x < 16; x += 3) S.tone(q(x) + 1, q(7), -2);
      S.px(q(1) - 2, q(6), 'bone', 3); S.px(q(1) - 3, q(6) - 1, 'bone', 3); S.px(q(1) - 2, q(8) + 1, 'bone', 3); S.px(q(1) - 3, q(8) + 2, 'bone', 3);
      S.tone(q(10), q(5), 2); S.tone(q(12), q(4), 2);
    },
    skel(S, k) {
      const q = v => Math.round(v * k);
      S.line(q(8), q(1.6), q(9), q(3.6), 'bone', -2); S.px(q(7), q(7.5), 'void'); S.px(q(9), q(7.5), 'void'); S.px(q(10.5), q(7.5), 'void');
      S.P(); S.poly([[q(7), q(18.5)], [q(12), q(18.5)], [q(11.5), q(21.5)], [q(10), q(20.5)], [q(8.5), q(22)], [q(7.2), q(20.5)]], 'leather');
    },
    cult(S, k) {
      const q = v => Math.round(v * k);
      S.line(q(4.6), q(17.5), q(13.4), q(17.5), 'leather', 0); S.px(q(6), q(18.5), 'leather'); S.px(q(6), q(19.5), 'leather');
      for (const x of [6.5, 9, 11.5]) S.line(q(x), q(19), q(x - 0.5), q(25), 'crimson', -2);
      S.px(q(8.5), q(12), 'glowY'); S.px(q(9), q(13), 'glowY');
    },
    crawl(S, k) {
      const q = v => Math.round(v * k);
      [[14, 5], [17, 4.6], [19.5, 6], [10, 5], [16, 9], [12, 9]].forEach(([x, y]) => { S.px(q(x), q(y), 'glowG'); S.px(q(x) + 1, q(y), 'glowG'); S.px(q(x), q(y) + 1, 'sick', -2); });
      S.line(q(1), q(8), q(0), q(10.5), 'bone', 3);
    },
    mut(S, k) {
      const q = v => Math.round(v * k);
      for (let i = 0; i < 6; i++) { S.px(q(17.5), q(9) + i * 3, 'skin', -2); S.px(q(17.5) - 1, q(9) + i * 3 + 1, 'skin', -2); S.px(q(17.5) + 1, q(9) + i * 3 + 1, 'skin', -2); }
      S.px(q(13), q(4), 'glowY'); S.px(q(13) + 1, q(4), 'glowY'); S.tone(q(15), q(10), 2); S.tone(q(16), q(11), 2);
    },
    brute(S, k) {
      const q = v => Math.round(v * k);
      S.P(); S.poly([[q(19), q(10)], [q(23), q(5)], [q(22), q(10)]], 'bone'); S.P(); S.poly([[q(8), q(10)], [q(6), q(6)], [q(10), q(9.5)]], 'bone');
      S.line(q(13), q(13), q(17), q(17), 'demon', -2); S.line(q(16), q(12), q(19), q(15), 'demon', -2);
      S.line(q(9), q(20.5), q(21), q(20.5), 'gold', 3);
    },
    boss(S, k) {
      const q = v => Math.round(v * k);
      // skull emblem on the chest plate
      S.P({ shine: true }); S.ell(q(18), q(19), q(2.2), q(2), 'bone'); S.rect(q(17), q(21), q(2), q(1), 'bone');
      S.P({ flat: true, nocs: true }); S.px(q(17.2), q(19), 'void'); S.px(q(18.8), q(19), 'void'); S.px(q(17.3), q(19) + 1, 'void'); S.px(q(18.9), q(19) + 1, 'void');
      // tattered cape hem
      for (let x = q(9); x < q(32); x += 3) { S.px(x, q(40) - 1, null); S.px(x + 1, q(40) - 2, null); }
      for (const [x, y] of [[11, 24], [24, 24], [14, 17], [22, 17]]) S.px(q(x), q(y), 'steel', 12);
    },
    wisp(S, k) {
      const q = v => Math.round(v * k);
      S.px(q(7), q(5), 'white'); S.px(q(8), q(7), 'glowY'); S.px(q(5), q(8), 'ember');
    },
    rustknight(S, k) {
      const q = v => Math.round(v * k);
      S.line(q(6), q(16), q(16), q(16), 'iron', 0); S.px(q(9), q(13), 'gold'); S.px(q(11), q(4), 'rust');
    },
    wraith(S, k) {
      const q = v => Math.round(v * k);
      S.px(q(9), q(6), 'glowP'); S.px(q(9) + 1, q(7), 'glowP'); S.line(q(5), q(20), q(4), q(28), 'glowP', 0);
    },
    wyrm(S, k) {
      const q = v => Math.round(v * k);
      S.P(); S.poly([[q(22), q(6)], [q(26), q(1)], [q(27), q(7)]], 'bone');
      S.px(q(4), q(12), 'fire'); S.px(q(2), q(13), 'ember');
    },
    lich(S, k) {
      const q = v => Math.round(v * k);
      S.P({ shine: true }); S.ell(q(14), q(20), q(2), q(2), 'bone');
      S.P({ flat: true, nocs: true }); S.px(q(13.2), q(20), 'void'); S.px(q(14.8), q(20), 'void');
      for (let x = q(7); x < q(25); x += 3) S.px(x, q(38) - 1, null);
    }
  };
  Object.keys(DETAIL).forEach(k => MON[k].detail = DETAIL[k]);

  // Front-facing silhouettes (idle, spawn, and engage). Same materials as the side view.
  const FRONT = {
    rat(S) {
      S.P({ round: true }); S.ell(10, 6.5, 6, 4.2, 'fur'); S.tone(8, 4, 1);
      S.P(); S.poly([[6, 3], [8, 0], [10, 3]], 'fur'); S.poly([[10, 3], [12, 0], [14, 3]], 'fur');
      S.P({ flat: true, nocs: true }); S.px(7, 6, 'glowR'); S.px(12, 6, 'glowR'); S.px(9, 8, 'void');
      S.P({ flat: true }); S.px(5, 10, 'skin', 1); S.px(8, 10, 'skin', 1); S.px(12, 10, 'skin', 1); S.px(15, 10, 'skin', 1);
    },
    skel(S) {
      S.P({ shine: true }); S.ell(9, 4.5, 4, 3.8, 'bone');
      S.P({ flat: true, nocs: true }); S.px(7, 4, 'void'); S.px(10, 4, 'void'); S.px(7, 4, 'glowR'); S.px(10, 4, 'glowR'); S.px(8, 7, 'void');
      S.P(); S.rect(8, 8, 3, 8, 'bone');
      S.P({ flat: true }); for (let y = 10; y < 16; y += 2) S.line(5, y, 13, y, 'bone', 2);
      S.P(); S.rect(5, 17, 8, 2, 'bone');
      S.P({ flat: true }); S.line(6, 19, 5, 26, 'bone', 2); S.line(12, 19, 13, 26, 'bone', 1);
      S.P(); S.line(4, 11, 1, 16, 'bone', 2); S.line(13, 11, 16, 16, 'bone', 1);
    },
    cult(S) {
      S.P({ round: true }); S.poly([[4, 9], [14, 9], [16, 26], [2, 26]], 'crimson');
      S.P({ round: true }); S.poly([[4, 9], [5, 3], [9, 1], [13, 3], [14, 9]], 'crimson', -1);
      S.P({ flat: true, nocs: true }); S.rect(6, 4, 6, 5, 'void'); S.px(7, 6, 'glowY'); S.px(11, 6, 'glowY');
      S.P({ nocs: true, flat: true }); S.line(3, 25, 15, 25, 'gold', 2); S.rect(8, 12, 2, 6, 'gold', 2);
      S.P(); S.rect(2, 16, 3, 2, 'skin', -1); S.rect(13, 16, 3, 2, 'skin', -1);
    },
    crawl(S) {
      S.P({ flat: true }); for (let k = 0; k < 3; k++) { S.line(6 + k * 5, 8, 4 + k * 5, 12, 'sick', 1); S.line(10 + k * 4, 8, 12 + k * 4, 12, 'sick', 0); }
      S.P({ round: true }); S.ell(12, 7, 8, 5, 'sick');
      S.P({ round: true }); S.ell(12, 5, 4, 3.2, 'flesh');
      S.P({ flat: true, nocs: true }); S.px(10, 4, 'glowR'); S.px(14, 4, 'glowR'); S.px(8, 6, 'glowG'); S.px(16, 6, 'glowG');
    },
    mut(S) {
      S.P(); S.rect(8, 20, 4, 8, 'flesh', -1); S.P(); S.rect(14, 20, 4, 8, 'flesh', -1);
      S.P({ round: true, shine: true }); S.ell(13, 14, 8, 8, 'flesh');
      S.P({ shine: true }); S.ell(13, 6, 4, 4, 'flesh');
      S.P({ flat: true, nocs: true }); S.px(11, 5, 'glowY'); S.px(15, 5, 'glowY'); S.px(11, 5, 'void'); S.px(15, 7, 'void');
      S.P(); S.rect(8, 17, 10, 2, 'leather');
    },
    brute(S) {
      S.P(); S.poly([[8, 22], [13, 22], [12, 32], [7, 32]], 'demon'); S.P(); S.poly([[16, 22], [21, 22], [22, 32], [16, 32]], 'demon', -1);
      S.P({ round: true, shine: true }); S.poly([[6, 12], [22, 12], [24, 22], [6, 22]], 'demon');
      S.P({ round: true }); S.ell(14, 8, 5, 5, 'demon');
      S.P(); S.poly([[10, 5], [7, 0], [6, 2], [10, 7]], 'bone'); S.poly([[18, 5], [21, 0], [22, 2], [18, 7]], 'bone');
      S.P({ flat: true, nocs: true }); S.px(12, 8, 'glowY'); S.px(16, 8, 'glowY');
      S.P(); S.rect(8, 20, 13, 2, 'iron');
    },
    boss(S) {
      S.P({ round: true }); S.poly([[10, 14], [24, 14], [28, 40], [6, 40]], 'crimson', -1);
      S.P(); S.rect(10, 30, 5, 11, 'night'); S.P(); S.rect(19, 30, 5, 11, 'night', -1);
      S.P(); S.rect(9, 39, 7, 3, 'iron'); S.P(); S.rect(18, 39, 7, 3, 'iron');
      S.P({ round: true, shine: true }); S.poly([[8, 14], [26, 14], [27, 28], [7, 28]], 'night');
      S.P({ shine: true }); S.poly([[12, 14], [12, 5], [15, 2], [21, 2], [24, 5], [24, 14]], 'night');
      S.P({ flat: true, nocs: true }); S.rect(14, 7, 8, 3, 'void'); S.px(16, 8, 'glowP'); S.px(20, 8, 'glowP');
      S.P({ shine: true }); S.ell(7, 16, 4, 4, 'night'); S.ell(27, 16, 4, 4, 'night');
    },
    wisp(S) {
      S.P({ flat: true }); S.glow(7, 8, 7, 'ember', 0.5); S.glow(7, 6, 4, 'glowY', 0.45);
      S.P({ shine: true }); S.ell(7, 7, 3.6, 3.8, 'gold');
      S.P({ flat: true, nocs: true }); S.px(5, 6, 'white'); S.px(8, 6, 'white'); S.px(7, 8, 'glowY');
      S.P({ flat: true }); S.line(5, 11, 3, 15, 'ember', 1); S.line(9, 11, 11, 15, 'ember', 0);
    },
    rustknight(S) {
      S.P(); S.rect(6, 20, 4, 10, 'rust'); S.P(); S.rect(12, 20, 4, 10, 'rust', -1);
      S.P(); S.rect(5, 28, 6, 2, 'iron'); S.P(); S.rect(11, 28, 6, 2, 'iron');
      S.P({ shine: true, round: true }); S.rect(5, 11, 12, 10, 'rust');
      S.P({ shine: true }); S.ell(11, 6, 5, 4.4, 'iron');
      S.P({ flat: true, nocs: true }); S.rect(7, 5, 8, 2, 'void'); S.px(8, 6, 'glowR'); S.px(13, 6, 'glowR');
      S.P({ shine: true }); S.rect(4, 10, 4, 4, 'rust'); S.rect(14, 10, 4, 4, 'rust');
      S.P({ shine: true }); S.poly([[1, 14], [5, 14], [5, 24], [0, 24]], 'iron');
    },
    wraith(S) {
      S.P({ round: true }); S.poly([[3, 10], [15, 10], [17, 30], [9, 32], [1, 30]], 'capeN');
      S.P({ round: true }); S.poly([[4, 10], [5, 3], [9, 1], [13, 3], [14, 10]], 'night');
      S.P({ flat: true, nocs: true }); S.rect(6, 4, 6, 5, 'void'); S.px(7, 6, 'glowP'); S.px(11, 6, 'glowP');
      S.glow(9, 6, 5, 'glowP', 0.4);
    },
    wyrm(S) {
      S.P({ round: true, shine: true }); S.ell(16, 14, 10, 8, 'demon');
      S.P({ round: true }); S.ell(16, 8, 6, 5, 'demon');
      S.P({ flat: true, nocs: true }); S.px(13, 7, 'glowY'); S.px(18, 7, 'glowY'); S.px(16, 10, 'glowR');
      S.P(); S.poly([[14, 11], [16, 16], [18, 11]], 'bone');
      S.P({ flat: true }); S.px(8, 20, 'bone', 4); S.px(16, 21, 'bone', 4); S.px(24, 20, 'bone', 4);
      S.glow(16, 9, 5, 'ember', 0.4);
    },
    lich(S) {
      S.P({ round: true }); S.poly([[6, 14], [24, 14], [26, 38], [4, 38]], 'capeN', -1);
      S.P(); S.rect(8, 28, 5, 12, 'bone'); S.P(); S.rect(17, 28, 5, 12, 'bone', -1);
      S.P({ shine: true }); S.ell(15, 8, 5.5, 5.4, 'bone');
      S.P({ flat: true, nocs: true }); S.px(12, 7, 'void'); S.px(17, 7, 'void'); S.px(12, 7, 'glowP'); S.px(17, 7, 'glowP'); S.px(15, 10, 'void');
      S.P(); S.rect(13, 13, 5, 2, 'bone'); S.rect(14, 15, 3, 10, 'bone');
      S.P({ flat: true }); for (let y = 16; y < 24; y += 2) S.line(10, y, 20, y, 'bone', 2);
      S.P(); S.line(5, 16, 1, 8, 'night'); S.P({ shine: true }); S.ell(1, 7, 2.4, 2.4, 'crystal'); S.glow(1, 7, 4, 'glowP', 0.45);
    }
  };
  Object.keys(FRONT).forEach(k => { if (MON[k]) MON[k].front = FRONT[k]; });


  // Visual tiers stacked on a base type so new looks can be added later without new draw functions.
  const TIERS = [
    { id: 'feral', prefix: '', scale: 1, min: 1, tint: null, acc: null },
    { id: 'veteran', prefix: 'Veteran ', scale: 1.08, min: 4, tint: [50, 24, 10, 48], acc: 'spikes' },
    { id: 'cursed', prefix: 'Cursed ', scale: 1.14, min: 8, tint: [60, 12, 80, 55], acc: 'horns' },
    { id: 'ashen', prefix: 'Ashen ', scale: 1.22, min: 12, tint: [90, 22, 10, 62], acc: 'plates' }
  ];
  function pickTier(L, boss) {
    let t = 0;
    for (let i = TIERS.length - 1; i >= 0; i--) if (L >= TIERS[i].min) { t = i; break; }
    if (boss) t = Math.min(TIERS.length - 1, t + (L >= 8 ? 1 : 0));
    else if (Math.random() < 0.22 && t > 0) t--;
    return t;
  }
  function adorn(S, acc, elite, k, m) {
    const w = Math.ceil(m.w * k), h = Math.ceil(m.h * k);
    if (acc === 'spikes' || acc === 'plates') {
      S.P({ flat: true });
      for (let i = 0; i < 3; i++) {
        const x = Math.round(w * (0.28 + i * 0.2)), y = Math.round(h * 0.16);
        S.line(x, y, x, Math.max(0, y - 4), 'bone', 2);
      }
    }
    if (acc === 'horns' || acc === 'plates') {
      S.P();
      const y = Math.round(h * 0.12);
      S.poly([[Math.round(w * 0.3), y], [Math.round(w * 0.2), 0], [Math.round(w * 0.36), y]], 'bone');
      S.poly([[Math.round(w * 0.62), y], [Math.round(w * 0.74), 0], [Math.round(w * 0.56), y]], 'bone');
    }
    if (acc === 'plates') {
      S.P({ shine: true });
      S.rect(Math.round(w * 0.28), Math.round(h * 0.38), Math.round(w * 0.42), Math.max(2, Math.round(h * 0.14)), 'iron');
    }
    if (elite) {
      S.P({ shine: true });
      const cx = Math.round(w / 2), cy = Math.max(2, Math.round(h * 0.05));
      S.rect(cx - 3, cy, 7, 2, 'gold');
      S.px(cx - 3, cy - 1, 'gold'); S.px(cx, cy - 2, 'gold'); S.px(cx + 3, cy - 1, 'gold');
    }
  }
  const mcache = {};
  function tintMon(c, T, elite) {
    if (!(T.tint || elite)) return c;
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-atop';
    if (T.tint) { x.fillStyle = 'rgba(' + T.tint.join(',') + ')'; x.fillRect(0, 0, c.width, c.height); }
    if (elite) { x.fillStyle = 'rgba(180,140,40,0.22)'; x.fillRect(0, 0, c.width, c.height); }
    x.globalCompositeOperation = 'source-over';
    return c;
  }
  function flashOf(c) {
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fx = f.getContext('2d'); fx.drawImage(c, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#fff6e0'; fx.fillRect(0, 0, f.width, f.height);
    return f;
  }
  function monCanvas(type, opts) {
    opts = opts || {};
    const m = MON[type]; if (!m) return monCanvas('rat', opts);
    const tier = opts.tier | 0, elite = !!opts.elite;
    const key = type + '|' + tier + (elite ? '|e' : '');
    if (mcache[key]) return mcache[key];
    const T = TIERS[tier] || TIERS[0];
    const k = m.k * T.scale * (elite ? 1.12 : 1);
    const c = tintMon(mk(m.w, m.h, m.draw, k, (S, kk) => { if (m.detail) m.detail(S, kk); adorn(S, T.acc, elite, kk, m); }), T, elite);
    const fc = m.front ? tintMon(mk(m.w, m.h, m.front, k, (S, kk) => adorn(S, T.acc, elite, kk, m)), T, elite) : c;
    return (mcache[key] = { c, f: flashOf(c), front: fc, frontF: flashOf(fc), w: c.width, h: c.height, fw: fc.width, fh: fc.height, glow: T.acc, name: T.prefix + m.name, gait: m.gait || 'walk' });
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
  const TW = 192;
  const BIOMES = ['plains', 'forest', 'ruins', 'cave'];
  const BIOME_TICKS = FPS * 170, FADE = 30;
  const BIOME_MON = {
    plains: { skel: 1.3, cult: 1.2, rat: 0.8, rustknight: 1.4 }, forest: { mut: 1.8, rat: 1.3, crawl: 1.3, wisp: 1.6, wraith: 1.2 },
    ruins: { cult: 2, skel: 1.6, brute: 1.6, rustknight: 1.8, wraith: 1.1 }, cave: { rat: 2, crawl: 1.8, wyrm: 1.5, wisp: 1.2 }
  };
  // Each biome is built as tall layers (TH rows) so the scene runs up the whole page.
  // Rows TH-H..TH line up exactly with the strip; above that it fades into night sky.
  const layerCache = {}, PAD = 64; let HDR = 64;
  function mkc(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(g2, x, y, c, w, h) { g2.fillStyle = c; g2.fillRect(x | 0, y | 0, w || 1, h || 1); }
  function skyGrad(f, TH, stops) {
    const grd = f.createLinearGradient(0, 0, 0, TH);
    let last = 0;
    stops.forEach(([y, c]) => { const o = Math.max(last, Math.min(1, y / TH)); grd.addColorStop(o, c); last = o; });
    f.fillStyle = grd; f.fillRect(0, 0, TW, TH);
  }
  function stars(f, r, top, bottom, n, dim) {
    const list = [];
    for (let k = 0; k < n; k++) {
      const y = top + Math.pow(r(), 1.5) * (bottom - top), x = r() * TW, v = r();
      const c = v < 0.08 ? '#fff4d8' : v < 0.25 ? '#c8d8ff' : v < 0.35 ? '#e8c0d0' : '#8a90b8';
      f.globalAlpha = dim * (0.45 + 0.55 * r()); px(f, x, y, c);
      if (v < 0.05) { f.globalAlpha = dim * 0.45; px(f, x - 1, y, c); px(f, x + 1, y, c); px(f, x, y - 1, c); px(f, x, y + 1, c); }
      if (v < 0.3) list.push([x | 0, y | 0, c]);
    }
    f.globalAlpha = 1; return list;
  }
  function ridge(f, base, amp, f1, f2, col, ph, bottom) {
    for (let x = 0; x < TW; x++) {
      const t = (x / TW) * Math.PI * 2;
      const top = Math.round(base - amp * (0.6 * Math.sin(t * f1 + ph) + 0.4 * Math.sin(t * f2 + ph * 2)));
      px(f, x, top, col, 1, bottom - top);
    }
  }
  function pine(f, x, top, bottom, w0, col) {
    for (let y = top; y < bottom; y++) {
      const d = y - top, w = Math.min(w0, Math.round(d * 0.5 - ((d % 6) < 2 ? 1 : 0)));
      px(f, x - Math.max(0, w), y, col, Math.max(1, w * 2 + 1), 1);
    }
  }
  // features are drawn on a canvas PAD wider than the tile, then the overflow wraps to the left edge
  function fold(src) {
    const o = mkc(TW, src.height), x = o.getContext('2d');
    x.drawImage(src, 0, 0); x.drawImage(src, -TW, 0); return o;
  }
  function buildBiome(name, TH) {
    TH = Math.max(TH || H, H);
    const key = name + TH + (name === 'cave' ? '_' + HDR : '');
    if (layerCache[key]) return layerCache[key];
    const Y0 = TH - H;
    const skyC = mkc(TW, TH), f0 = skyC.getContext('2d');
    const farW = mkc(TW + PAD, TH), f = farW.getContext('2d');
    const midW = mkc(TW + PAD, TH), m = midW.getContext('2d');
    const fl = mkc(TW, 9), g2 = fl.getContext('2d');
    const r = rng(name.length * 97 + 13);
    let tw = [], kind = name;
    f.translate(0, Y0); m.translate(0, Y0); // strip-space coordinates from here (y < 0 is above the strip)
    if (name === 'cave') {
      skyGrad(f0, TH, [[0, '#050404'], [Y0 * 0.5, '#0a0807'], [Y0, '#0e0a08'], [TH, '#1a120c']]);
      // wall texture and strata
      for (let k = 0; k < TH * 1.2; k++) px(f0, r() * TW, r() * TH, r() < 0.5 ? '#120d0a' : '#0a0706', 1 + ((r() * 3) | 0));
      for (let k = 0; k < 7; k++) { const y = (r() * Y0) | 0; for (let x = 0; x < TW; x++) if (r() < 0.8) px(f0, x, y + Math.round(2 * Math.sin(x / 9 + k)), '#140f0b'); }
      // jagged ceiling with stalactites at the very top of the page
      const C0 = Math.min(Y0 - 60, HDR + 6);
      for (let x = 0; x < TW; x++) {
        const d = C0 + Math.round(5 * Math.sin((x / TW) * Math.PI * 4) + 3 * Math.sin((x / TW) * Math.PI * 14 + 1));
        px(f0, x, 0, '#040303', 1, d); px(f0, x, d, '#2a1e16'); px(f0, x, d - 1, '#140e0a');
      }
      for (let k = 0; k < 30; k++) {
        const x = 2 + ((r() * (TW - 6)) | 0), len = 8 + ((r() * 34) | 0), w = 3 + ((r() * 4) | 0), y0 = C0 - 2;
        for (let y = 0; y < len; y++) { const ww = Math.max(1, Math.round(w * (1 - y / len))); px(f0, x - (ww >> 1), y0 + y, '#0c0907', ww, 1); px(f0, x - (ww >> 1), y0 + y, '#2a1e16'); if (ww > 2) px(f0, x - (ww >> 1) + ww - 1, y0 + y, '#060404'); }
        if (r() < 0.35) px(f0, x, y0 + len + 3, '#5aa8c8');
      }
      // rising stalagmite columns behind the strip
      for (let k = 0; k < 5; k++) {
        const x = 10 + k * 38 + ((r() * 14) | 0), top = Y0 - 40 - ((r() * 110) | 0), w = 9 + ((r() * 6) | 0);
        for (let y = top; y < TH; y++) { const ww = Math.min(w, Math.round((y - top) * 0.22) + 2); px(f0, x - (ww >> 1), y, '#16100c', ww, 1); px(f0, x - (ww >> 1), y, '#231912'); px(f0, x - (ww >> 1) + ww - 1, y, '#0c0806'); if ((y * 7 + k * 3) % 23 === 0) px(f0, x - (ww >> 1) + 1, y, '#0e0a07', ww - 2, 1); }
      }
      // far: rock ridge at the strip and a few crystal clusters / torches up the walls
      for (let x = 0; x < TW; x++) {
        const top = 18 + Math.round(6 * Math.sin((x / TW) * Math.PI * 4) + 4 * Math.sin((x / TW) * Math.PI * 12 + 1));
        px(f, x, top, '#17110d', 1, H - top);
        if (r() < 0.25) px(f, x, top + 2 + ((r() * 30) | 0), '#211812');
      }
      for (let k = 0; k < 9; k++) {
        const x = (k * 21 + r() * 14) | 0, y = -20 - r() * (Y0 - C0 - 40), purple = k % 2;
        const c1 = purple ? '#c070ff' : '#60d8ff', c2 = purple ? '#6a2aa0' : '#20708a';
        const gr = f.createRadialGradient(x + 2, y, 1, x + 2, y, 18); gr.addColorStop(0, purple ? 'rgba(160,80,255,.22)' : 'rgba(80,200,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        f.fillStyle = gr; f.fillRect(x - 16, y - 18, 36, 36);
        px(f, x - 3, y + 2, '#1a130e', 12, 2);
        px(f, x, y - 5, c2, 2, 7); px(f, x + 1, y - 7, c1, 1, 7); px(f, x + 3, y - 2, c2, 2, 4); px(f, x + 4, y - 3, c1, 1, 2); px(f, x - 2, y - 1, c2, 2, 3); px(f, x - 2, y - 2, c1);
      }
      for (let k = 0; k < 3; k++) {
        const x = 40 + k * 64, y = -30 - ((r() * (Y0 - C0 - 60)) | 0);
        const gr = f.createRadialGradient(x + 1, y - 2, 1, x + 1, y - 2, 26); gr.addColorStop(0, 'rgba(255,140,50,.24)'); gr.addColorStop(1, 'rgba(255,140,50,0)');
        f.fillStyle = gr; f.fillRect(x - 26, y - 28, 54, 54);
        px(f, x, y, '#3a2a1c', 2, 5); px(f, x - 1, y, '#5a4430', 4, 1); px(f, x, y - 3, '#ff8a2a', 2, 3); px(f, x, y - 4, '#ffcf5a');
      }
      for (let k = 0; k < 2; k++) {
        const x = 30 + k * 96, y = 30;
        const gr = m.createRadialGradient(x + 1, y - 2, 1, x + 1, y - 2, 22); gr.addColorStop(0, 'rgba(255,140,50,.32)'); gr.addColorStop(1, 'rgba(255,140,50,0)');
        m.fillStyle = gr; m.fillRect(x - 22, y - 24, 46, 46);
        px(m, x, y, '#3a2a1c', 2, 6); px(m, x - 1, y, '#5a4430', 4, 1); px(m, x, y - 3, '#ff8a2a', 2, 3); px(m, x, y - 4, '#ffcf5a'); px(m, x + 1, y - 2, '#fff2b0');
      }
      for (let k = 0; k < 5; k++) {
        const x = (r() * TW) | 0, h = 12 + ((r() * 16) | 0);
        px(m, x - 3, H - 8 - h, '#2a1f17', 7, h); px(m, x - 3, H - 8 - h, '#3a2c20', 2, h); px(m, x + 3, H - 8 - h, '#120d0a', 1, h); px(m, x - 2, H - 9 - h, '#3a2c20', 5, 1);
      }
      for (let k = 0; k < 6; k++) { const x = (r() * TW) | 0, y = H - 9; px(m, x, y - 3, '#d8b4e8', 3); px(m, x - 1, y - 2, '#9a6ab0', 5); px(m, x + 1, y - 1, '#c8b8a0', 1, 2); }
      for (let k = 0; k < 3; k++) { const x = (r() * TW) | 0; px(m, x, H - 9, '#d6caae', 3, 2); px(m, x, H - 9, '#0a0605'); px(m, x + 2, H - 9, '#0a0605'); }
      px(g2, 0, 0, '#2a1f16', TW, 9); px(g2, 0, 0, '#4a3624', TW, 1);
      for (let k = 0; k < 170; k++) px(g2, r() * TW, 1 + r() * 8, ['#3a2a1c', '#1c140e', '#5a4430', '#241a12'][(r() * 4) | 0], 1 + ((r() * 2) | 0));
    } else if (name === 'plains') {
      skyGrad(f0, TH, [[0, '#03030a'], [Y0 - 260, '#05061a'], [Y0 - 150, '#0c0b28'], [Y0 - 70, '#1c1238'], [Y0 - 20, '#30163e'], [Y0, '#3e1c40'], [Y0 + H * 0.4, '#5a2a40'], [Y0 + H * 0.62, '#a4503a'], [Y0 + H * 0.78, '#d88a48'], [TH, '#e0a050']]);
      tw = stars(f0, r, 4, Y0 + 14, Math.round(TH * 0.32), 1);
      // faint band of the galaxy
      for (let k = 0; k < 160; k++) { const t = r(), x = t * TW, y = Y0 * 0.18 + t * Y0 * 0.25 + (r() - 0.5) * 26; f0.globalAlpha = 0.18; px(f0, x, y, '#a8a0d0'); }
      f0.globalAlpha = 1;
      for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d2 = x * x + y * y; if (d2 <= 81) px(f0, 130 + x, Y0 + 45 + y, d2 < 36 ? '#ffe0a0' : '#ffb868'); }
      px(f0, 112, Y0 + 44, '#e89058', 36, 1); px(f0, 104, Y0 + 48, '#e89058', 52, 1); px(f0, 118, Y0 + 40, '#f0a060', 24, 1);
      ridge(f, 50, 6, 2, 5, '#4a2a3a', 0.4, H);
      ridge(f, 57, 5, 3, 7, '#2e1c26', 1.7, H);
      ridge(m, 64, 3, 4, 9, '#1e1a14', 2.2, H);
      for (let k = 0; k < 3; k++) {
        const x = (r() * TW) | 0;
        px(m, x, H - 26, '#140e0c', 2, 18); px(m, x - 4, H - 24, '#140e0c', 4, 1); px(m, x + 2, H - 21, '#140e0c', 5, 1); px(m, x - 5, H - 25, '#140e0c'); px(m, x + 6, H - 22, '#140e0c');
      }
      for (let k = 0; k < 4; k++) { const x = (r() * TW) | 0; px(m, x, H - 14, '#3a2a1c', 2, 6); px(m, x + 9, H - 14, '#3a2a1c', 2, 6); px(m, x - 1, H - 12, '#4a3624', 13, 1); }
      px(g2, 0, 0, '#3a2a1a', TW, 9); px(g2, 0, 0, '#5a6a2a', TW, 2); px(g2, 0, 2, '#3a4a1e', TW, 1);
      for (let k = 0; k < 120; k++) { const x = r() * TW; px(g2, x, 0, '#7a8a3a'); if (k % 3 === 0) px(g2, x + 1, 0, '#90a048'); }
      for (let k = 0; k < 90; k++) px(g2, r() * TW, 3 + r() * 6, ['#4a3622', '#2a1e12', '#5a4630'][(r() * 3) | 0], 1 + ((r() * 2) | 0));
      for (let k = 0; k < 40; k++) { const x = (r() * TW) | 0; px(m, x, H - 10, '#5a6a2a'); px(m, x + 1, H - 11, '#7a8a3a'); px(m, x + 2, H - 10, '#4a5a22'); }
    } else if (name === 'forest') {
      skyGrad(f0, TH, [[0, '#030408'], [Y0 - 200, '#04060c'], [Y0 - 90, '#070c12'], [Y0, '#0c1416'], [Y0 + H * 0.7, '#18241e'], [TH, '#22301e']]);
      tw = stars(f0, r, 4, Y0 - 40, Math.round(TH * 0.24), 0.9);
      // distant pines climb above the strip and fade into the sky
      for (let k = 0; k < 18; k++) pine(f, (r() * TW) | 0, -60 + ((r() * 50) | 0), H, 9 + ((r() * 6) | 0), '#0a1216');
      for (let k = 0; k < 16; k++) pine(f, (r() * TW) | 0, -10 + ((r() * 34) | 0), H, 7 + ((r() * 6) | 0), k % 2 ? '#0e1812' : '#122018');
      // near trees: trunks rise from the ground into dark pine crowns
      for (let k = 0; k < 4; k++) {
        const x = 8 + k * 48 + ((r() * 18) | 0), w = 6 + ((r() * 4) | 0), crown = -70 - ((r() * 40) | 0);
        pine(m, x + (w >> 1), crown, crown + 74, 16, '#0c1610'); pine(m, x + (w >> 1) + 1, crown + 3, crown + 74, 14, '#09110c');
        px(m, x, crown + 40, '#1e140e', w, H - 8 - crown - 40); px(m, x, crown + 40, '#2e2216', 2, H - 8 - crown - 40); px(m, x + w - 1, crown + 40, '#0e0a08', 1, H - 8 - crown - 40);
        px(m, x - 2, H - 10, '#1e140e', w + 4, 2); px(m, x + 2, 20 + ((r() * 20) | 0), '#2a3a1a', 2, 3);
        px(m, x - 3, 14 + ((r() * 8) | 0), '#1e140e', 4, 1); px(m, x + w, -6 + ((r() * 8) | 0), '#1e140e', 4, 1);
      }
      for (let k = 0; k < 4; k++) { const x = (r() * TW) | 0; px(m, x, H - 11, '#c04040', 3, 1); px(m, x + 1, H - 10, '#d8c8a0', 1, 2); }
      px(g2, 0, 0, '#1e2414', TW, 9); px(g2, 0, 0, '#2e4a1e', TW, 1);
      for (let k = 0; k < 150; k++) px(g2, r() * TW, 1 + r() * 8, ['#26341a', '#14180e', '#3a2a1a', '#1a2212'][(r() * 4) | 0], 1 + ((r() * 2) | 0));
      for (let k = 0; k < 6; k++) { const x = (r() * TW) | 0; px(g2, x, 2, '#3a2416', 6, 1); px(g2, x + 5, 3, '#3a2416', 3, 1); }
    } else {
      skyGrad(f0, TH, [[0, '#030202'], [Y0 - 220, '#060303'], [Y0 - 110, '#120605'], [Y0 - 30, '#260c08'], [Y0, '#2e100c'], [Y0 + H * 0.45, '#3e1610'], [Y0 + H * 0.72, '#7a2c14'], [TH, '#b04a1a']]);
      tw = stars(f0, r, 4, Y0 - 120, Math.round(TH * 0.14), 0.6);
      // smoke drifting over the horizon
      for (let k = 0; k < 220; k++) { f0.globalAlpha = 0.12; px(f0, r() * TW, Y0 - 60 + r() * 70, '#3a1a12', 3, 1); }
      f0.globalAlpha = 1;
      // a tall cathedral and spires rising above the strip
      const spire = (x, w, top, col, lit) => {
        px(f, x, top, col, w, H - top);
        const tip = Math.round(w * 1.6);
        for (let y = 0; y < tip; y++) { const ww = Math.max(1, Math.round(w * (1 - y / tip))); px(f, x + ((w - ww) >> 1), top - y, col, ww, 1); }
        px(f, x + (w >> 1), top - tip - 3, col, 1, 3);
        for (let yy = top + 6; yy < H - 10; yy += 11) for (let j = 0; j < 3; j++) { const wx = x + 3 + j * 4; if (wx < x + w - 2 && r() < lit) { px(f, wx, yy, '#ff9a40', 2, 3); px(f, wx, yy - 1, '#ffb860', 1, 1); } }
      };
      spire(60, 22, -46, '#140a08', 0.35); spire(52, 8, -18, '#140a08', 0.3); spire(84, 8, -12, '#140a08', 0.3);
      for (let k = 0; k < 4; k++) { const x = (k * 48 + 120 + ((r() * 16) | 0)) % TW, w = 14 + ((r() * 10) | 0); spire(x, w, 8 + ((r() * 18) | 0), '#1a0e0c', 0.5); }
      ridge(f, 62, 3, 3, 8, '#140a08', 0.9, H);
      for (let k = 0; k < 4; k++) {
        const x = (r() * TW) | 0, h = 14 + ((r() * 20) | 0);
        px(m, x, H - 8 - h, '#3a3230', 6, h); px(m, x, H - 8 - h, '#4e4440', 2, h); px(m, x + 5, H - 8 - h, '#1e1816', 1, h);
        px(m, x - 1, H - 9 - h, '#4e4440', 3, 2); px(m, x + 3, H - 8 - h, '#3a3230', 3, 1);
        if (k % 2) { px(m, x + 8, H - 12, '#d6caae', 3, 2); px(m, x + 8, H - 12, '#0a0605'); px(m, x + 10, H - 12, '#0a0605'); }
      }
      px(g2, 0, 0, '#2a2420', TW, 9); px(g2, 0, 0, '#4a403a', TW, 1);
      for (let x = 0; x < TW; x += 12) { px(g2, x, 1, '#16120e', 1, 8); px(g2, x + 6, 5, '#16120e', 6, 1); px(g2, x + 1, 1, '#3a322c', 5, 1); }
      for (let k = 0; k < 60; k++) px(g2, r() * TW, 2 + r() * 7, ['#3a2a20', '#1a1410', '#5a2a18'][(r() * 3) | 0]);
    }
    return (layerCache[key] = { sky: skyC, far: fold(farW), mid: fold(midW), fl, tw, kind, TH });
  }

  // ---------- state ----------
  let cv, g, wrap, killEl, on = false, timer = 0, raf = 0, acc = 0, lastTs = 0, W = 300, scale = 1;
  let st = null;
  function freshState() {
    return { mode: 'run', t: 0, scroll: 0, hp: 1, max: 1, heroX: 22, mon: null, spawn: 40, fx: [], nums: [], coins: [], fire: null, atkT: 0, monT: 0, pose: '', lunge: 0, flashH: 0, potion: 0, eqKey: '', biome: 0, bt: 0, seq: null, seqI: 0, move: '', forceMove: null, forceCls: null, forceLoco: null, alpha: 0, loco: 'run', facing: 'side', turn: 0, turnTo: 'side', gaitF: 0, coolWalk: 0 };
  }
  function eqNow() { return (typeof xpState !== 'undefined' && xpState.equipped) || {}; }
  function lvl() { return (typeof xpState !== 'undefined' && xpState.level) || 1; }
  function rarity(eq) {
    let best = 0, color = null;
    for (const k in eq) { const it = ITEM_BY_ID[eq[k]]; if (it && RR[it.rarity] > best) { best = RR[it.rarity]; color = RARITY[it.rarity].color; } }
    return { best, color };
  }
  function heroEq() { const e = Object.assign({ _cls: clsNow() }, eqNow()); delete e.base; return e; }

  function pickMonster() {
    const L = lvl();
    if (Math.random() < (L >= 3 ? 0.06 : 0.025)) return (L >= 8 && Math.random() < 0.45) ? 'lich' : 'boss';
    const pool = Object.keys(MON).filter(k => MON[k].wt && MON[k].min <= L);
    const bm = BIOME_MON[BIOMES[st ? st.biome : 0]] || {};
    let tot = 0; const ws = pool.map(k => { const w = Math.max(2, MON[k].wt + (k === 'rat' ? -Math.min(20, L * 2) : MON[k].min * Math.min(L, 10) * 0.4)) * (bm[k] || 1); tot += w; return w; });
    let n = Math.random() * tot;
    for (let i = 0; i < pool.length; i++) { n -= ws[i]; if (n <= 0) return pool[i]; }
    return pool[0] || 'rat';
  }
  function spawn(forced) {
    const type = forced || pickMonster(), L = forced ? (st && st.forceLevel) || lvl() : lvl();
    const base = MON[type] || MON.rat;
    const elite = !base.boss && !forced && Math.random() < (0.06 + Math.min(0.08, L * 0.008));
    const tier = pickTier(L, !!base.boss);
    const spr = monCanvas(type, { tier, elite });
    const hp = Math.round(base.hp * (1 + 0.22 * (L - 1)) * (1 + 0.18 * tier) * (elite ? 2.4 : 1));
    const dmg = base.dmg * (1 + 0.12 * (L - 1)) * (1 + 0.1 * tier) * (elite ? 1.35 : 1);
    st.mon = { type, x: W + 4, px: W + 4, hp, max: hp, dmg, elite, boss: !!base.boss, tier, w: spr.w, h: spr.h, flash: 0, lunge: 0, dead: 0, walk: 0, hurt: 0, facing: 'front', turn: 0, turnTo: 'front', spawnFace: 6 };
    return st.mon;
  }
  function nextGap() { return Math.round(FPS * (18 - Math.min(8, lvl() * 0.5)) * (0.6 + Math.random() * 0.8)); }
  function atkKind(eq) {
    const c = clsNow();
    if (c === 'shooter') return 'ranged';
    if (c === 'mage') return 'bolt';
    return GUNS[eq.weapon] ? 'ranged' : 'melee';
  }
  function engageDist(eq) {
    const kind = atkKind(eq);
    const want = kind === 'ranged' ? 92 : kind === 'bolt' ? 80 : 8;
    return Math.min(want, Math.max(8, W - (st ? st.heroX : 22) - 70));
  }
  function addNum(x, y, v, col) { st.nums.push({ x, y, v, col, t: 0 }); }
  function heroSprite(pose) {
    const eq = heroEq(), r = rarity(eqNow());
    return P().heroCanvas(eq, r.best, r.color, pose || '');
  }
  const MOVES = {
    warrior: ['overhead', 'sweep', 'bash'],
    mage: ['bolt', 'chain', 'orb'],
    shooter: ['single', 'burst', 'grenade']
  };
  function pickMove(kind, dist) {
    if (st && st.forceMove) { const m = st.forceMove; st.forceMove = null; return m; }
    const c = clsNow();
    if (kind === 'melee' || c === 'warrior') return MOVES.warrior[(Math.random() * 3) | 0];
    if (kind === 'bolt' || c === 'mage') {
      if (dist > 55 && Math.random() < 0.55) return 'bolt';
      const r = Math.random();
      return r < 0.4 ? 'bolt' : r < 0.75 ? 'chain' : 'orb';
    }
    const r = Math.random();
    return r < 0.55 ? 'single' : r < 0.85 ? 'burst' : 'grenade';
  }
  function recoverWait(S, n) { return Math.max(3, Math.round(n * (20 / (20 + (S.spd || 6) * 0.2)))); }
  function buildSeq(move, S) {
    const R = n => recoverWait(S, n);
    switch (move) {
      case 'overhead': return [{ wait: 3, pose: 'overhead' }, { wait: 2, pose: '', hit: 'slashDown', lunge: 3 }, { wait: R(5), pose: '' }];
      case 'sweep': return [{ wait: 2, pose: 'raise' }, { wait: 2, pose: 'sweep', hit: 'slashSweep', lunge: 2 }, { wait: R(5), pose: '' }];
      case 'bash': return [{ wait: 2, pose: 'bash' }, { wait: 2, pose: 'bash', hit: 'bash', lunge: 4 }, { wait: R(6), pose: '' }];
      case 'bolt': return [{ wait: 2, pose: 'cast' }, { wait: 1, pose: 'cast', hit: 'bolt' }, { wait: R(5), pose: '' }];
      case 'chain': return [{ wait: 3, pose: 'cast' }, { wait: 2, pose: 'cast', hit: 'chain' }, { wait: R(6), pose: '' }];
      case 'orb': return [{ wait: 4, pose: 'cast' }, { wait: 1, pose: 'cast', hit: 'orb' }, { wait: R(7), pose: '' }];
      case 'single': return [{ wait: 2, pose: 'aim' }, { wait: 2, pose: 'aim', hit: 'shot' }, { wait: 3, pose: 'aim' }, { wait: 2, pose: 'aim', hit: 'shot' }, { wait: R(5), pose: '' }];
      case 'burst': return [{ wait: 2, pose: 'aim' }, { wait: 1, pose: 'aim', hit: 'shot' }, { wait: 1, pose: 'aim', hit: 'shot' }, { wait: 1, pose: 'aim', hit: 'shot' }, { wait: 1, pose: 'aim', hit: 'shot' }, { wait: R(6), pose: '' }];
      case 'grenade': return [{ wait: 3, pose: 'raise' }, { wait: 1, pose: 'sweep', hit: 'grenade' }, { wait: R(9), pose: '' }];
      default: return [{ wait: 2, pose: 'raise' }, { wait: 2, pose: '', hit: 'slashSweep', lunge: 2 }, { wait: R(5), pose: '' }];
    }
  }
  function mageCol(eq) {
    const purple = /storm|crown|warp|void|eye/.test((eq && eq.weapon) || '') || /eye|void/.test((eq && eq.armor) || '');
    return purple ? ['#f4e0ff', '#c070ff', '#6a2aa0'] : ['#e8ffff', '#60e0ff', '#2060a0'];
  }
  function muzzle(s, eq) {
    const cls = clsNow();
    const by = HERO_Y + (cls === 'warrior' ? (ITEM_BY_ID[eq.armor] ? 37 : 35) - 3 : 33);
    const mx0 = s.heroX + (cls === 'warrior' ? (ITEM_BY_ID[eq.armor] ? 34 : 32) + 14 : 47);
    return { x: cls === 'mage' ? s.heroX + 35 : mx0, y: cls === 'mage' ? HERO_Y + 9 : by };
  }
  function monMid(m) { return { x: m.x + (m.w || 16) / 2, y: H - 8 - (m.h || 16) / 2 }; }
  function rollDmg(S, scale) {
    let d = Math.round(S.atk * (0.75 + Math.random() * 0.5) * (scale || 1));
    const crit = Math.random() * 100 < (S.crit || 12);
    if (crit) d *= 2;
    return { d, crit };
  }
  function splat(s, m, n) {
    const mid = monMid(m);
    const c = 3 + ((Math.random() * (n || 4)) | 0);
    for (let i = 0; i < c; i++) {
      s.fx.push({ k: 'blood', x: mid.x + Math.random() * 6 - 2, y: mid.y + Math.random() * 6 - 3, vx: 0.4 + Math.random() * 1.4, vy: -1.2 - Math.random() * 1.6, t: 0, life: 5 + ((Math.random() * 4) | 0) });
    }
  }
  function lightningArcs(s, x, y, col) {
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, len = 8 + Math.random() * 12;
      const pts = [[x, y]]; let cx = x, cy = y;
      for (let k = 0; k < 3; k++) { cx += Math.cos(a) * len / 3 + Math.random() * 4 - 2; cy += Math.sin(a) * len / 3 + Math.random() * 4 - 2; pts.push([cx, cy]); }
      s.fx.push({ k: 'bolt', pts, col, t: 0, life: 3 });
    }
    s.fx.push({ k: 'zap', x, y, col: col[1], t: 0, life: 4 });
  }
  function hurtMon(s, m, d, crit) {
    if (!m || m.dead) return;
    m.hp -= d; m.flash = 3; m.hurt = 5; m.x += 3; m.px = (m.px != null ? m.px : m.x) ;
    addNum(m.x + (m.w || 16) / 2 - 4, Math.max(4, H - 10 - (m.h || 16) - 4), d, crit ? '#ffd040' : '#fff6e0');
    if (m.hp <= 0) {
      m.dead = 1;
      s.seq = null; s.pose = '';
      s.fx.push({ k: 'poof', x: m.x + (m.w || 16) / 2, y: H - 8 - (m.h || 16) / 2, t: 0, life: 8, r: Math.max(6, (m.h || 16) / 2) });
      const n = m.boss ? 9 : m.elite ? 6 : 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) s.coins.push({ x: m.x + (m.w || 16) / 2, y: H - 10 - (m.h || 16) / 2, vx: -1.5 - Math.random() * 2, vy: -3 - Math.random() * 2, t: 0 });
    }
  }
  function impact(s, m, S, scale, blood) {
    const { d, crit } = rollDmg(S, scale);
    hurtMon(s, m, d, crit);
    if (blood && !m.dead) splat(s, m);
    else if (blood) splat(s, m, 5);
  }
  function fireHit(s, eq, S, m, hit) {
    if (!m || m.dead) return;
    const muz = muzzle(s, eq), mid = monMid(m), col = mageCol(eq);
    const dist = Math.max(8, mid.x - muz.x);
    if (hit === 'slashDown') { s.fx.push({ k: 'slash', style: 'down', x: s.heroX + 34, y: HERO_Y + 16, t: 0, life: 5 }); impact(s, m, S, 1, true); }
    else if (hit === 'slashSweep') { s.fx.push({ k: 'slash', style: 'sweep', x: s.heroX + 36, y: HERO_Y + 24, t: 0, life: 5 }); impact(s, m, S, 1, true); }
    else if (hit === 'bash') { s.fx.push({ k: 'bash', x: mid.x - 6, y: mid.y, t: 0, life: 5 }); impact(s, m, S, 1.1, true); m.x += 4; }
    else if (hit === 'bolt') s.fx.push({ k: 'boltshot', x: muz.x, y: muz.y, tx: mid.x, ty: mid.y, t: 0, life: Math.max(3, Math.round(dist / 22)), dmg: rollDmg(S, 0.75), col, mon: m });
    else if (hit === 'chain') {
      const pts = [[muz.x, muz.y]]; const n = 7;
      for (let i = 1; i < n; i++) pts.push([muz.x + (mid.x - muz.x) * i / n, muz.y + (mid.y - muz.y) * i / n + (Math.random() * 12 - 6)]);
      pts.push([mid.x, mid.y]);
      s.fx.push({ k: 'bolt', pts, col, t: 0, life: 5 });
      lightningArcs(s, mid.x, mid.y, col);
      impact(s, m, S, 1.15, false);
    }
    else if (hit === 'orb') s.fx.push({ k: 'orb', x: muz.x, y: muz.y, tx: mid.x, ty: mid.y, t: 0, life: Math.max(6, Math.round(dist / 12)), dmg: rollDmg(S, 1.3), col, mon: m });
    else if (hit === 'shot') { s.fx.push({ k: 'shot', x: muz.x, y: muz.y, tx: mid.x, t: 0, life: 3 }); s.fx.push({ k: 'flash', x: muz.x, y: muz.y, t: 0, life: 2 }); impact(s, m, S, 0.65, true); }
    else if (hit === 'grenade') s.fx.push({ k: 'grenade', x: muz.x, y: muz.y, tx: mid.x, ty: H - 10, t: 0, life: 10, dmg: rollDmg(S, 1.5), mon: m });
  }
  function startAttack(s, eq, S, m) {
    const kind = atkKind(eq);
    const dist = m.x - (s.heroX + 40);
    const move = pickMove(kind, dist);
    s.move = move;
    s.seq = buildSeq(move, S);
    s.seqI = 0;
    s.atkT = s.seq[0].wait;
    s.pose = s.seq[0].pose || '';
    if (s.seq[0].lunge) s.lunge = s.seq[0].lunge;
    if (s.seq[0].hit) fireHit(s, eq, S, m, s.seq[0].hit);
  }

  // ---------- simulation (fixed 12 ticks per second, drawn on rAF) ----------
  function snap(s) {
    if (s.mon) s.mon.px = s.mon.x;
    s.fx.forEach(f => { f.px = f.x; f.py = f.y; });
    s.coins.forEach(c => { c.px = c.x; c.py = c.y; });
  }
  function tickFx(s, S) {
    const cur = s.fx;
    s.fx = [];
    for (const f of cur) {
      f.t++;
      if (f.k === 'blood') { f.x += f.vx; f.y += f.vy; f.vy += 0.45; }
      if ((f.k === 'boltshot' || f.k === 'orb') && f.t >= f.life) {
        const m = (f.mon && !f.mon.dead && st.mon === f.mon) ? f.mon : (st.mon && !st.mon.dead ? st.mon : null);
        if (m && f.dmg) {
          hurtMon(s, m, f.dmg.d, f.dmg.crit);
          if (f.k === 'orb') lightningArcs(s, f.tx, f.ty, f.col);
          else s.fx.push({ k: 'zap', x: f.tx, y: f.ty, col: f.col[1], t: 0, life: 3 });
        }
      }
      if (f.k === 'grenade' && f.t >= f.life) {
        const m = (f.mon && st.mon === f.mon && !f.mon.dead) ? f.mon : (st.mon && !st.mon.dead ? st.mon : null);
        s.fx.push({ k: 'boom', x: f.tx, y: f.ty, t: 0, life: 8 });
        if (m && f.dmg) { hurtMon(s, m, f.dmg.d, f.dmg.crit); splat(s, m, 3); }
      }
      if (f.t < f.life) s.fx.push(f);
    }
  }
  const TURN_N = 5;
  function beginTurn(s, view) {
    if (!s) return;
    if (s.facing === view && !s.turn) return;
    if (s.turn && s.turnTo === view) return;
    s.turnTo = view; s.turn = TURN_N;
  }
  function beginMonTurn(m, view) {
    if (!m) return;
    if (m.facing === view && !m.turn) return;
    if (m.turn && m.turnTo === view) return;
    m.turnTo = view; m.turn = TURN_N;
  }
  function tickTurn(o) {
    if (!o || !o.turn) return;
    o.turn--;
    if (o.turn <= 0) { o.turn = 0; o.facing = o.turnTo; }
  }
  function faceAmt(o, a) {
    if (!o) return 0;
    if (!o.turn) return o.facing === 'front' ? 1 : 0;
    const p = Math.max(0, Math.min(1, (TURN_N - o.turn + a) / TURN_N));
    return o.turnTo === 'front' ? p : 1 - p;
  }
  function heroLoco(s) {
    if (s.forceLoco) return s.forceLoco;
    return s.loco || 'run';
  }
  function goRun(s, walkFirst) {
    s.mode = 'run'; s.potion = 0;
    if (walkFirst) { s.coolWalk = 12; s.loco = 'walk'; } else s.loco = s.coolWalk ? 'walk' : 'run';
    beginTurn(s, 'side');
  }

  function tick() {
    const s = st, eq = eqNow(), S = stats(eq, lvl());
    const key = JSON.stringify(eq) + lvl() + clsNow();
    if (key !== s.eqKey) { const ratio = s.hp / s.max; s.max = S.hp; s.hp = Math.max(1, Math.round(ratio * S.hp)); s.eqKey = key; }
    snap(s);
    s.t++;
    if (s.flashH) s.flashH--;
    if (s.fade) s.fade--;
    if (s.lunge) s.lunge--;
    s.nums.forEach(n => { n.t++; n.y -= n.t < 6 ? 1 : 0.5; }); s.nums = s.nums.filter(n => n.t < 14);
    tickFx(s, S);
    const heroFront = s.heroX + 40;
    s.coins.forEach(c => {
      c.t++;
      if (c.t < 8) { c.x += c.vx; c.y += c.vy; c.vy += 0.6; if (c.y > H - 9) { c.y = H - 9; c.vy *= -0.4; } }
      else { c.x += (s.heroX + 24 - c.x) * 0.35; c.y += (40 - c.y) * 0.35; }
    });
    const got = s.coins.filter(c => c.t >= 12).length;
    if (got) { bstats.gold += got; }
    s.coins = s.coins.filter(c => c.t < 12);
    const m = s.mon;
    if (m) { if (m.hurt) m.hurt--; if (m.flash) m.flash--; if (m.lunge) m.lunge--; }
    tickTurn(s); if (m) tickTurn(m);
    const stepFor = loco => loco === 'walk' ? 1 : 2;
    const moving = (step) => { step = step || 2; s.scroll += step; if (++s.bt >= BIOME_TICKS) { s.bt = 0; s.prevBiome = s.biome; s.biome = (s.biome + 1) % BIOMES.length; s.fade = FADE; } if (s.fire) s.fire.x -= step; if (s.fire && s.fire.x < -20) s.fire = null; };
    if (s.mode === 'run') {
      if (s.coolWalk > 0) s.coolWalk--;
      if (!m) s.loco = (s.coolWalk || s.forceLoco === 'walk') ? 'walk' : 'run';
      else {
        const dist = m.x - heroFront - engageDist(eq);
        s.loco = dist <= 64 ? 'walk' : 'run';
      }
      if (s.forceLoco) s.loco = s.forceLoco;
      const step = stepFor(heroLoco(s));
      s.gaitF = (s.gaitF || 0) + (heroLoco(s) === 'run' ? 1.5 : 1);
      moving(step);
      beginTurn(s, 'side');
      if (!m) { if (--s.spawn <= 0) spawn(); }
      else {
        m.walk++;
        if (m.spawnFace > 0) { m.spawnFace--; if (m.spawnFace <= 0) beginMonTurn(m, 'side'); }
        else if (m.facing === 'front' && !m.turn) beginMonTurn(m, 'side');
        m.x -= step + (MON[m.type] || MON.rat).speed;
        if (m.x <= heroFront + engageDist(eq)) { s.mode = 'fight'; s.atkT = TURN_N + 1; s.monT = 6; s.seq = null; s.pose = ''; s.loco = 'idle'; beginTurn(s, 'front'); beginMonTurn(m, 'front'); }
      }
    } else if (s.mode === 'fight' && m) {
      s.loco = 'idle'; s.gaitF = (s.gaitF || 0) + 0.4;
      beginTurn(s, 'front');
      if (m.dead) {
        if (++m.dead > 7) {
          s.mon = null; s.spawn = nextGap(); s.seq = null; s.pose = '';
          bstats.kills++; if (m.elite || m.boss) bstats.elites++;
          saveStats(); if (killEl) killEl.textContent = '☠ ' + bstats.kills;
          if (s.hp < s.max * 0.4) startHeal(); else goRun(s, true);
        }
        return;
      }
      const close = heroFront + 8;
      if (m.x > close) { m.x -= (MON[m.type] || MON.rat).speed * 0.7; m.walk++; if (m.x > close + 6) beginMonTurn(m, 'side'); else beginMonTurn(m, 'front'); }
      else beginMonTurn(m, 'front');
      const turningIn = s.turn && s.turnTo === 'front';
      if (!s.seq || s.seqI >= s.seq.length) {
        if (!turningIn && --s.atkT <= 0) startAttack(s, eq, S, m);
      } else if (--s.atkT <= 0) {
        s.seqI++;
        if (s.seqI < s.seq.length) {
          const step = s.seq[s.seqI];
          s.atkT = step.wait; s.pose = step.pose || '';
          if (step.lunge) s.lunge = step.lunge;
          if (step.hit) fireHit(s, eq, S, m, step.hit);
        }
      }
      if (m.dead) return;
      if (m.x <= close + 2 && --s.monT <= 0) {
        const mc = MON[m.type] || MON.rat;
        const md = m.dmg || mc.dmg;
        s.monT = m.boss ? 9 : 10; m.lunge = 2;
        let d = Math.max(1, Math.round(s.max * (0.03 + 0.012 * md) * (m.elite ? 1.4 : 1) * (0.7 + Math.random() * 0.6) * (1 - S.def / (S.def + 40))));
        if (s.hp - d < s.max * 0.12) { addNum(s.heroX + 18, 18, 'BLOCK', '#a8c8ff'); s.fx.push({ k: 'block', x: heroFront - 4, y: 34, t: 0, life: 3 }); }
        else { s.hp -= d; s.flashH = 3; addNum(s.heroX + 20, 18, d, '#ff6050'); }
      }
    } else if (s.mode === 'potion') {
      s.potion++; s.pose = '';
      if (s.potion >= 6 && s.potion % 2 === 0 && s.hp < s.max) { const h = Math.ceil(s.max / 5); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 14 + (s.potion % 4) * 2, 12, '+' + h, '#70ff70'); }
      if (s.potion > 16) goRun(s, true);
    } else if (s.mode === 'rest') {
      s.potion++; s.pose = '';
      if (s.potion > 6 && s.potion % 6 === 0 && s.hp < s.max) { const h = Math.ceil(s.max / 8); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 16, 18, '+' + h, '#70ff70'); }
      if (s.potion > 60 || (s.hp >= s.max && s.potion > 30)) goRun(s, true);
    } else if (s.mode === 'band') {
      s.potion++; s.pose = 'band';
      if (s.potion >= 6 && s.potion % 3 === 0 && s.hp < s.max) { const h = Math.ceil(s.max / 6); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 16, 14, '+' + h, '#70ff70'); }
      if (s.potion > 18) { goRun(s, true); s.pose = ''; }
    }
  }
  function startHeal(forced) {
    st.potion = 0; st.seq = null; st.pose = ''; st.fire = null; st.loco = 'idle';
    beginTurn(st, 'front');
    const r = forced || (Math.random() < 0.34 ? 'potion' : Math.random() < 0.5 ? 'rest' : 'band');
    if (r === 'potion') st.mode = 'potion';
    else if (r === 'rest') { st.mode = 'rest'; st.fire = { x: st.heroX + 46 }; }
    else st.mode = 'band';
  }

  // ---------- drawing ----------
  function tiled(c, off, y, ctx) {
    ctx = ctx || g;
    const w = c.width; let x = -(((Math.round(off) % w) + w) % w);
    for (; x < W; x += w) ctx.drawImage(c, x, y);
  }
  function fadeDraw(fn, th, ctx) {
    ctx = ctx || g; const s = st;
    if (s.fade && s.prevBiome != null) {
      fn(buildBiome(BIOMES[s.prevBiome], th));
      ctx.globalAlpha = 1 - s.fade / FADE; fn(buildBiome(BIOMES[s.biome], th)); ctx.globalAlpha = 1;
    } else fn(buildBiome(BIOMES[s.biome], th));
  }
  // ---------- page background: the same scene continued up to the top of the screen ----------
  let bcv = null, bg = null, BH = H, bgOn = false, bgTimer = 0, bgParts = [];
  function bgMount() {
    if (bcv) return;
    bcv = document.createElement('canvas'); bcv.id = 'scenebg'; bcv.setAttribute('aria-hidden', 'true');
    document.body.prepend(bcv); bgOn = true;
  }
  function bgSize() {
    if (!bcv) return;
    const sa = parseFloat(getComputedStyle(bcv).bottom) || 0;
    const nh = Math.ceil((window.innerHeight - sa) / scale) + 1;
    if (nh !== BH) { for (const k in layerCache) delete layerCache[k]; BH = nh; }
    bcv.width = W; bcv.height = BH;
    bcv.style.width = (W * scale) + 'px'; bcv.style.height = (BH * scale) + 'px';
    bg = bcv.getContext('2d'); bg.imageSmoothingEnabled = false;
    const hd = document.getElementById('top'); if (hd) { const hb = hd.getBoundingClientRect().bottom; const top = window.innerHeight - sa - BH * scale; HDR = Math.max(0, Math.round((hb - top) / scale)); }
  }
  function bgParticles(L, k) {
    // a few moving bits drawn on top: twinkling stars, fireflies or embers (screen space)
    const t = st.t, sc = st.scroll;
    for (let i = 0; i < L.tw.length; i += 3) {
      const [x, y, c] = L.tw[i], a = 0.5 + 0.5 * Math.sin(t * 0.21 + i * 1.7);
      if (a < 0.6) continue;
      bg.globalAlpha = k * (a - 0.5) * 1.6; bg.fillStyle = c;
      for (let xx = x; xx < W; xx += TW) { bg.fillRect(xx, y, 1, 1); if (a > 0.92) { bg.fillRect(xx - 1, y, 3, 1); bg.fillRect(xx, y - 1, 1, 3); } }
    }
    bg.globalAlpha = 1;
    if (L.kind === 'forest' || L.kind === 'ruins') {
      if (bgParts.length !== 14) bgParts = Array.from({ length: 14 }, (_, i) => ({ x: (i * 53) % W, p: i * 0.9, sp: 0.5 + (i % 5) * 0.2 }));
      const top = BH - H - (L.kind === 'ruins' ? 170 : 90);
      for (const q of bgParts) {
        let x, y, a;
        if (L.kind === 'forest') {
          x = ((q.x + Math.sin(t * 0.05 * q.sp + q.p) * 14 - sc * 0.4) % W + W) % W; y = BH - 14 - ((q.p * 37) % (BH - 14 - top)) + Math.sin(t * 0.08 + q.p) * 6;
          a = 0.5 + 0.5 * Math.sin(t * 0.12 * q.sp + q.p * 3); bg.fillStyle = '#c8ff70';
        } else {
          const life = ((t * q.sp * 0.6 + q.p * 40) % 160) / 160;
          x = ((q.x + Math.sin(life * 6 + q.p) * 8 - sc * 0.3) % W + W) % W; y = BH - 10 - life * (BH - 10 - top);
          a = 1 - life; bg.fillStyle = life < 0.3 ? '#ffd070' : '#ff8a30';
        }
        bg.globalAlpha = k * Math.max(0, a); bg.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      bg.globalAlpha = 1;
    }
  }
  function drawBg() {
    if (!bg || !st) return;
    bg.clearRect(0, 0, W, BH);
    const s = st, fn = (L) => { tiled(L.sky, 0, BH - L.TH, bg); tiled(L.far, s.scroll * 0.2, BH - L.TH, bg); tiled(L.mid, s.scroll * 0.55, BH - L.TH, bg); };
    fadeDraw(fn, BH, bg);
    const fadeK = s.fade && s.prevBiome != null ? 1 - s.fade / FADE : 1;
    if (!reduced()) {
      if (fadeK < 1) { bgParticles(buildBiome(BIOMES[s.prevBiome], BH), 1 - fadeK); }
      bgParticles(buildBiome(BIOMES[s.biome], BH), fadeK);
    }
    // ground under everything, for when the strip is switched off
    if (!on) fadeDraw(L => tiled(L.fl, s.scroll, BH - 9, bg), BH, bg);
  }
  function advanceScene(n, dscroll) {
    const s = st;
    s.t += n; s.scroll += dscroll;
    s.bt += n;
    if (s.fade) s.fade = Math.max(0, s.fade - n);
    if (s.bt >= BIOME_TICKS) { s.bt = 0; s.prevBiome = s.biome; s.biome = (s.biome + 1) % BIOMES.length; s.fade = FADE; }
  }
  function bgLoop() {
    // strip off: scene drifts slowly at 6 fps, no runner
    bgTimer = 0;
    if (on || document.hidden || !bcv) return;
    advanceScene(2, 1); drawBg();
    bgTimer = setTimeout(bgLoop, 1000 / 6);
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
    const x = Math.round(fx), y = H - 9;
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
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ix(o, a, k) { k = k || 'x'; const p = o['p' + k]; return p == null ? o[k] : lerp(p, o[k], a); }
  function hurtStage(hp, max) {
    const r = max ? hp / max : 1;
    return r > 0.7 ? 0 : r > 0.4 ? 1 : r > 0.2 ? 2 : 3;
  }
  function degradeHero(img, stage) {
    if (!stage || !img) return img;
    const key = '_hurt' + stage;
    if (img[key]) return img[key];
    const o = document.createElement('canvas'); o.width = img.width; o.height = img.height;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(20,8,6,' + [0, 0.18, 0.32, 0.48][stage] + ')';
    x.fillRect(0, 0, o.width, o.height);
    x.fillStyle = stage >= 2 ? 'rgba(8,4,2,0.85)' : 'rgba(30,16,10,0.7)';
    const scratches = [[18, 16, 8, 1], [22, 28, 1, 6], [28, 22, 6, 1], [16, 36, 5, 1], [30, 40, 1, 7], [20, 12, 1, 5], [14, 44, 7, 1], [26, 18, 4, 1]];
    for (let i = 0; i < (stage === 1 ? 3 : stage === 2 ? 6 : 8); i++) { const d = scratches[i]; x.fillRect(d[0], d[1], d[2], d[3]); }
    if (stage >= 2) {
      x.fillStyle = 'rgba(80,16,12,0.35)';
      [[24, 32, 3, 2], [20, 44, 2, 2], [28, 26, 2, 3]].forEach(d => x.fillRect(d[0], d[1], d[2], d[3]));
      x.globalCompositeOperation = 'destination-out';
      [[10, 48, 3, 2], [8, 54, 4, 2], [12, 58, 3, 2], [9, 42, 2, 2]].forEach(d => x.fillRect(d[0], d[1], d[2], d[3]));
      if (stage >= 3) [[32, 50, 3, 2], [14, 30, 2, 3], [28, 14, 3, 1]].forEach(d => x.fillRect(d[0], d[1], d[2], d[3]));
    }
    return (img[key] = o);
  }
  const poseCache = new Map();
  function padCanvas(src, px, py) {
    const o = document.createElement('canvas'); o.width = src.width + px * 2; o.height = src.height + py * 2;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, px, py);
    return o;
  }
  function waveShift(src, phase, amp, freq) {
    const pad = Math.ceil(Math.abs(amp) + 2);
    const o = document.createElement('canvas'); o.width = src.width + pad * 2; o.height = src.height;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    const w = src.width, h = src.height;
    for (let y = 0; y < h; y++) {
      const dx = Math.round(Math.sin(phase * 0.5 + y * freq) * amp);
      x.drawImage(src, 0, y, w, 1, pad + dx, y, w, 1);
    }
    return o;
  }
  function cloakDrift(src, phase) {
    const pad = 4;
    const o = document.createElement('canvas'); o.width = src.width + pad * 2; o.height = src.height + 4;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    const w = src.width, h = src.height, mid = Math.round(h * 0.35);
    x.drawImage(src, 0, 0, w, mid, pad, 2, w, mid);
    for (let y = mid; y < h; y++) {
      const dx = Math.round(Math.sin(phase * 0.35 + (y - mid) * 0.2) * (2 + (y - mid) / 8));
      x.drawImage(src, 0, y, w, 1, pad + dx, 2 + y, w, 1);
    }
    return o;
  }
  function strideShift(src, phase, heavy, scurry) {
    const pad = 5;
    const o = document.createElement('canvas'); o.width = src.width + pad * 2; o.height = src.height + pad;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    const tau = phase * (heavy ? 0.35 : scurry ? 0.85 : 0.55);
    const bob = Math.round(Math.abs(Math.sin(tau)) * (heavy ? 2 : 1));
    const mid = (src.width / 2) | 0;
    const legY = Math.round(src.height * 0.55);
    const lift0 = Math.max(0, Math.round(Math.sin(tau) * (heavy ? 3 : scurry ? 2 : 2)));
    const lift1 = Math.max(0, Math.round(-Math.sin(tau) * (heavy ? 3 : scurry ? 2 : 2)));
    const ox0 = Math.round(Math.cos(tau) * (heavy ? 1 : 2));
    const ox1 = -ox0;
    x.drawImage(src, 0, 0, src.width, legY, pad, pad - bob, src.width, legY);
    x.drawImage(src, 0, legY, mid, src.height - legY, pad + ox0, pad + legY - bob - lift0, mid, src.height - legY);
    x.drawImage(src, mid, legY, src.width - mid, src.height - legY, pad + mid + ox1, pad + legY - bob - lift1, src.width - mid, src.height - legY);
    return o;
  }
  function flashCopy(src) {
    const f = document.createElement('canvas'); f.width = src.width; f.height = src.height;
    const fx = f.getContext('2d'); fx.drawImage(src, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#fff6e0'; fx.fillRect(0, 0, f.width, f.height);
    return f;
  }
  function posedMon(spr, m, a, moving, view) {
    const gait = (MON[m.type] && MON[m.type].gait) || 'walk';
    const phase = (m.walk || 0) + a;
    const frame = moving ? ((phase * (gait === 'lumber' ? 0.5 : gait === 'scurry' ? 1.4 : 1)) | 0) % 8 : 0;
    const key = (m.type || '') + '|' + (m.tier | 0) + (m.elite ? 'e' : '') + '|' + view + '|' + gait + '|' + (moving ? frame : 'idle');
    let hit = poseCache.get(key);
    if (hit) return hit;
    const src = view === 'front' ? (spr.front || spr.c) : spr.c;
    let c = src, dy = 0;
    if (moving && !m.dead) {
      if (gait === 'hover') {
        c = padCanvas(src, 2, 4);
        dy = Math.round(Math.sin(phase * 0.45) * 3) - 2;
      } else if (gait === 'drift') {
        c = cloakDrift(src, phase);
        dy = Math.round(Math.sin(phase * 0.3) * 2) - 1;
      } else if (gait === 'slither') {
        c = waveShift(src, phase, 2.4, 0.35);
      } else if (gait === 'scuttle') {
        c = waveShift(src, phase * 1.4, 1.6, 0.7);
        dy = -((frame % 2) ? 1 : 0);
      } else if (gait === 'lumber' || gait === 'walk' || gait === 'scurry') {
        c = strideShift(src, phase, gait === 'lumber', gait === 'scurry');
      }
    }
    const out = { c, f: c === src ? ((view === 'front' ? spr.frontF : spr.f) || spr.f) : flashCopy(c), w: c.width, h: c.height, dy };
    if (poseCache.size > 160) poseCache.clear();
    poseCache.set(key, out);
    return out;
  }
  function draw() {
    const s = st, a = s.alpha || 0;
    g.clearRect(0, 0, W, H);
    const scStep = s.mode === 'run' ? (heroLoco(s) === 'walk' ? 1 : 2) : 0;
    if (!bgOn) { const bgOf = (L) => { tiled(L.sky, 0, H - L.TH); tiled(L.far, (s.scroll + a * scStep) * 0.2, H - L.TH); tiled(L.mid, (s.scroll + a * scStep) * 0.55, H - L.TH); }; fadeDraw(bgOf, H); }
    fadeDraw(L => tiled(L.fl, s.scroll + a * scStep, H - 9), H);
    if (s.fire) drawFire(s.fire.x, s.t);
    const loc = heroLoco(s);
    const gaitSpd = loc === 'run' ? 1.5 : loc === 'walk' ? 1 : 0.4;
    const gaitFrame = Math.floor((s.gaitF || 0) + a * gaitSpd);
    const amt = faceAmt(s, a);
    const baseFront = heroSprite(s.pose);
    let frontImg = baseFront, hy = HERO_Y;
    if (s.mode === 'rest') frontImg = sitOf(baseFront);
    const eq = heroEq(), rar = rarity(eqNow());
    const sideImg = (P().heroCanvasSide) ? P().heroCanvasSide(eq, rar.best, rar.color, loc === 'idle' ? 'idle' : loc, gaitFrame) : baseFront;
    const useSide = amt < 0.5 && s.mode !== 'rest' && s.mode !== 'potion' && s.mode !== 'band' && !s.pose;
    let img = useSide ? sideImg : frontImg;
    img = degradeHero(img, hurtStage(s.hp, s.max));
    const hx = s.heroX + (s.lunge ? 3 * Math.min(1, s.lunge - a * 0 + 0) / 3 : 0);
    const hx2 = s.heroX + (s.lunge ? 3 : 0);
    const ax = (useSide && img._ax != null) ? img._ax : (img.width / 2);
    const plant = hx2 + 24;
    const sx = amt < 0.5 ? lerp(1, 0.12, amt / 0.5) : lerp(0.12, 1, (amt - 0.5) / 0.5);
    const dw = Math.max(1, Math.round(img.width * sx));
    const dx = Math.round(plant - (ax / img.width) * dw);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, dx, hy, dw, img.height);
    if (s.flashH) { g.globalAlpha = 0.55 * Math.min(1, s.flashH / 2); g.drawImage(whiteOf(img), dx, hy, dw, img.height); g.globalAlpha = 1; }
    if (s.mode === 'potion') {
      const p = Math.min(1, s.potion / 5), fx = hx2 + 16, fy = Math.round(hy + 34 - p * 18);
      g.fillStyle = '#0c0705'; g.fillRect(fx - 1, fy - 3, 5, 7);
      g.fillStyle = '#c8b8a0'; g.fillRect(fx + 1, fy - 3, 1, 1); g.fillStyle = '#8a6a4a'; g.fillRect(fx + 1, fy - 2, 1, 1);
      g.fillStyle = '#b01c1c'; g.fillRect(fx, fy - 1, 3, 4); g.fillStyle = '#ff7070'; g.fillRect(fx, fy - 1, 1, 2); g.fillStyle = '#ffd0d0'; g.fillRect(fx, fy - 1, 1, 1);
    }
    if (s.mode === 'band') {
      const ax = hx2 + 30, ay = hy + 28, ang = (s.potion + a) * 0.7;
      g.fillStyle = '#e8dcc0';
      for (let i = 0; i < 6; i++) {
        const t = ang - i * 0.45;
        g.fillRect(Math.round(ax + Math.cos(t) * 5), Math.round(ay + Math.sin(t) * 3), 2, 1);
      }
      g.fillStyle = '#c8b898';
      g.fillRect(Math.round(ax + Math.cos(ang) * 5), Math.round(ay + Math.sin(ang) * 3 + 1), 3, 1);
    }
    bar(hx2 + 14, 2, 20, s.hp / s.max, s.hp / s.max > 0.4 ? '#50d050' : '#e0a030');
    const m = s.mon;
    if (m) {
      const spr = monCanvas(m.type, { tier: m.tier, elite: m.elite });
      const mw = m.w || spr.w, mh = m.h || spr.h;
      const mx = Math.round(ix(m, a) - (m.lunge ? 3 : 0) + (m.hurt ? ((m.hurt % 2) ? 1 : -1) : 0));
      const ground = H - 8;
      const amtM = faceAmt(m, a);
      const movingMon = !m.dead && ((s.mode === 'run') || (s.mode === 'fight' && m.x > (s.heroX + 40 + 8)));
      const posed = posedMon(spr, m, a, movingMon, amtM < 0.5 ? 'side' : 'front');
      const iw = posed.w, ih = posed.h;
      const sxm = amtM < 0.5 ? lerp(1, 0.12, amtM / 0.5) : lerp(0.12, 1, (amtM - 0.5) / 0.5);
      const dwm = Math.max(1, Math.round(iw * sxm));
      const dxm = Math.round(mx + mw / 2 - dwm / 2);
      const dym = ground - ih + (posed.dy || 0);
      if (!m.dead || m.dead < 3) {
        if (m.elite || m.boss || (m.tier | 0) >= 2) {
          const gr = g.createRadialGradient(mx + mw / 2, dym + ih / 2, 2, mx + mw / 2, dym + ih / 2, ih * 0.85);
          const c = m.boss ? '170,100,255' : m.elite ? '255,200,80' : (m.tier >= 3 ? '255,90,40' : '160,80,220');
          gr.addColorStop(0, 'rgba(' + c + ',.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
          g.fillStyle = gr; g.fillRect(mx - mh, dym - mh / 2, mw + mh * 2, mh * 2);
        }
        g.imageSmoothingEnabled = false;
        g.globalAlpha = m.dead ? Math.max(0, 1 - m.dead / 3) : 1;
        g.drawImage(posed.c, dxm, dym, dwm, ih);
        if (m.flash || m.dead) { g.globalAlpha = m.dead ? 0.5 : 0.65; g.drawImage(posed.f, dxm, dym, dwm, ih); }
        g.globalAlpha = 1;
      }
      if (!m.dead && (s.mode === 'fight' || m.boss || m.elite)) bar(mx + mw / 2 - 8, Math.max(2, dym - 5), 16, Math.max(0, m.hp / m.max), m.boss ? '#b070ff' : m.elite ? '#ffc040' : '#d04030');
    }
    for (const f of s.fx) {
      const ft = f.t + a;
      if (f.k === 'slash') {
        const down = f.style === 'down';
        const col = ['#ffffff', '#ffe8b0', '#e0b060', '#c08040', '#8a4a20'][f.t] || '#8a4a20';
        g.fillStyle = col;
        for (let i = 0; i < 16; i++) {
          const a0 = down ? (-1.7 + i * 0.2 + ft * 0.22) : (-0.4 + i * 0.16 + ft * 0.2);
          for (const r of [12, 14, 16]) { if (r === 16 && (i < 3 || i > 12)) continue; g.fillRect(Math.round(f.x + Math.cos(a0) * r), Math.round(f.y + (down ? 2 : 6) + Math.sin(a0) * (down ? r * 0.85 : r * 0.55)), 1, 1); }
        }
      } else if (f.k === 'bash') {
        const r = 3 + ft * 3;
        g.fillStyle = 'rgba(230,210,160,' + (1 - ft / f.life) + ')';
        for (let i = 0; i < 10; i++) { const ang = i * 0.63; g.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r * 0.6), 2, 1); }
        if (ft < 2) { g.fillStyle = '#fff6e0'; g.fillRect(f.x - 2, f.y - 2, 5, 5); }
      } else if (f.k === 'shot') {
        const p = Math.min(1, (ft + 1) / 3), x0 = f.x + (f.tx - f.x) * (p - 0.33), x1 = f.x + (f.tx - f.x) * p;
        g.fillStyle = '#ffe080'; g.fillRect(Math.round(x0), f.y, Math.max(1, Math.round(x1 - x0)), 1);
        g.fillStyle = '#fff6d0'; g.fillRect(Math.round(x1) - 2, f.y, 2, 1);
      } else if (f.k === 'boltshot') {
        const p = Math.min(1, ft / f.life), x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p;
        g.fillStyle = f.col[2]; g.fillRect(Math.round(x) - 2, Math.round(y), 3, 1);
        g.fillStyle = f.col[0]; g.fillRect(Math.round(x), Math.round(y) - 1, 2, 3);
        g.fillStyle = '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else if (f.k === 'orb') {
        const p = Math.min(1, ft / f.life), x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p;
        const pulse = 2 + ((s.t + a) % 2);
        const grd = g.createRadialGradient(x, y, 0, x, y, 5 + pulse);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.4, f.col[0]); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(x - 8, y - 8, 16, 16);
        g.fillStyle = f.col[1]; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      } else if (f.k === 'grenade') {
        const p = Math.min(1, ft / f.life);
        const x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p - Math.sin(p * Math.PI) * 22;
        g.fillStyle = '#1a140c'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        g.fillStyle = '#3a4a20'; g.fillRect(Math.round(x), Math.round(y), 2, 2);
        g.fillStyle = '#8a2a10'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
      } else if (f.k === 'boom') {
        const r = 4 + ft * 3, fade = 1 - ft / f.life;
        g.fillStyle = 'rgba(255,240,200,' + (0.7 * fade) + ')';
        g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,140,40,' + fade + ')';
        for (let i = 0; i < 12; i++) {
          const ang = i * 0.52 + ft * 0.2, rr = r * (0.5 + (i % 3) * 0.2);
          g.fillRect(Math.round(f.x + Math.cos(ang) * rr), Math.round(f.y + Math.sin(ang) * rr * 0.7), 2, 2);
        }
        g.fillStyle = 'rgba(40,30,24,' + fade + ')';
        for (let i = 0; i < 6; i++) g.fillRect(Math.round(f.x + Math.cos(i * 1.1) * r * 0.8), Math.round(f.y + Math.sin(i * 1.1) * r * 0.5 - ft), 2, 1);
        if (ft < 2) { g.fillStyle = '#fffbe8'; g.fillRect(f.x - 3, f.y - 3, 7, 7); }
      } else if (f.k === 'blood') {
        const x = ix(f, a), y = ix(f, a, 'y');
        g.fillStyle = f.t < 2 ? '#6a1810' : '#4a0c0c';
        g.globalAlpha = Math.max(0, 1 - ft / f.life);
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (f.t < 3) g.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
        g.globalAlpha = 1;
      } else if (f.k === 'bolt') {
        if (ft < 4) {
          const fade = f.t ? 1 : 0;
          for (let i = 0; i < f.pts.length - 1; i++) {
            const [x0, y0] = f.pts[i], [x1, y1] = f.pts[i + 1], n = Math.max(1, Math.ceil(Math.abs(x1 - x0)));
            for (let j = 0; j <= n; j++) {
              const x = Math.round(x0 + (x1 - x0) * j / n), y = Math.round(y0 + (y1 - y0) * j / n);
              g.fillStyle = f.col[2]; g.fillRect(x, y - 1, 1, 3);
              g.fillStyle = f.col[1 + fade]; g.fillRect(x, y, 1, 1);
              if (!fade && j % 2) { g.fillStyle = f.col[0]; g.fillRect(x, y, 1, 1); }
            }
          }
        }
        if (ft < 2) { const [x, y] = f.pts[0]; g.fillStyle = f.col[0]; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = f.col[1]; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); }
      } else if (f.k === 'zap') {
        const r = 2 + ft * 2; g.fillStyle = f.col;
        for (let i = 0; i < 8; i++) { const ang = i * 0.785 + ft; g.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r), 1, 1); }
        if (ft < 1) { g.fillStyle = '#ffffff'; g.fillRect(f.x - 1, f.y - 1, 3, 3); }
      } else if (f.k === 'flash') {
        g.fillStyle = '#fff2a0'; g.fillRect(f.x, f.y - 1, 3, 3); g.fillStyle = '#ffb040'; g.fillRect(f.x + 3, f.y, 2, 1); g.fillRect(f.x + 1, f.y - 2, 1, 1); g.fillRect(f.x + 1, f.y + 2, 1, 1);
      } else if (f.k === 'block') {
        g.fillStyle = '#a8c8ff'; for (let i = 0; i < 6; i++) g.fillRect(f.x + ((i * 3) % 5), f.y - 6 + i * 2, 1, 1);
      } else if (f.k === 'poof') {
        const r = f.r * (0.4 + ft / f.life);
        for (let i = 0; i < 14; i++) {
          const ang = i / 14 * Math.PI * 2 + i, rr = r * (0.6 + ((i * 7) % 5) / 10);
          g.fillStyle = i % 3 ? 'rgba(150,140,130,' + (1 - ft / f.life) + ')' : 'rgba(230,220,200,' + (1 - ft / f.life) + ')';
          g.fillRect(Math.round(f.x + Math.cos(ang) * rr), Math.round(f.y + Math.sin(ang) * rr * 0.7), 2, 2);
        }
      }
    }
    for (const c of s.coins) { const x = ix(c, a), y = ix(c, a, 'y'); g.fillStyle = '#5a3a08'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = (s.t + c.t) % 2 ? '#ffe070' : '#d8a030'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
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
    bgSize();
    if (st) { st.heroX = Math.max(6, Math.min(40, Math.round(W * 0.08))); if (st.mon && st.mon.x > W + 4) st.mon.x = W + 4; draw(); drawBg(); }
  }
  const STEP = 1000 / FPS;
  function loop(ts) {
    raf = 0;
    if (!on || document.hidden) return;
    if (!lastTs) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    if (dt > 250) dt = 250;
    acc += dt;
    let stepped = 0;
    while (acc >= STEP) { tick(); acc -= STEP; stepped++; if (stepped > 6) { acc = 0; break; } }
    if (st) st.alpha = acc / STEP;
    draw();
    if (stepped && !(st.t & 1)) drawBg();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (document.hidden) return;
    if (!on) { if (!bgTimer && bcv) { drawBg(); if (!reduced()) bgTimer = setTimeout(bgLoop, 1000 / 6); } return; }
    if (raf || timer) return;
    if (reduced()) { if (st) st.alpha = 0; draw(); drawBg(); return; }
    lastTs = 0; acc = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (timer) clearTimeout(timer); timer = 0;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (bgTimer) clearTimeout(bgTimer); bgTimer = 0;
    lastTs = 0;
  }
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
    window.addEventListener('resize', () => size());
    window.addEventListener('pl-class', () => { if (st && g) draw(); });
  }
  function apply() {
    on = enabled() && !!window.PLPixel;
    document.documentElement.classList.toggle('battle-on', on);
    const b = document.getElementById('bat');
    if (b) { b.classList.toggle('off', !on); b.setAttribute('aria-label', on ? 'Battle on' : 'Battle off'); }
    mount(); bgMount(); stop();
    if (!st) st = freshState();
    if (on) {
      wrap.hidden = false;
      size(); killEl.textContent = '☠ ' + bstats.kills;
      draw(); start();
    } else { wrap.hidden = true; size(); document.documentElement.style.setProperty('--strip-h', '0px'); start(); }
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
    stats(eq, level, cls) { return stats(eq || eqNow(), level || lvl(), cls); },
    kills() { return bstats; },
    reset() { bstats = { kills: 0, elites: 0, gold: 0 }; saveStats(); localStorage.removeItem(STAT_KEY); st = freshState(); if (cv) { size(); if (killEl) killEl.textContent = '☠ 0'; } },
    // preview hook: freeze a scene for screenshots
    _scene(opts) {
      st = freshState(); size(); Object.assign(st, opts.st || {});
      if (opts.mon) {
        const m = MON[opts.mon] || MON.rat;
        const spr = monCanvas(opts.mon, opts.opts || {});
        st.mon = Object.assign({ type: opts.mon, x: st.heroX + 47, px: st.heroX + 47, hp: m.hp, max: m.hp, flash: 0, lunge: 0, dead: 0, walk: 0, hurt: 0, w: spr.w, h: spr.h, tier: 0, elite: false, boss: !!m.boss }, opts.monSt || {});
      }
      stop(); draw(); drawBg();
    },
    _tick(n) { for (let i = 0; i < n; i++) tick(); if (st) st.alpha = 0; draw(); drawBg(); },
    _bg() { drawBg(); },
    _state() { return st; },
    _mon(t, opts) { return monCanvas(t, opts).c; },
    _stop() { stop(); },
    _moves() { return { warrior: MOVES.warrior.slice(), mage: MOVES.mage.slice(), shooter: MOVES.shooter.slice(), heals: ['potion', 'rest', 'band'] }; },
    _forceCls(c) { if (st) st.forceCls = c || null; },
    _forceMove(m) { if (st) st.forceMove = m || null; },
    _forceHeal(mode) { if (st) startHeal(mode); },
    _hurtHero(frac) { if (st) { const S = stats(eqNow(), lvl()); st.max = S.hp; st.hp = Math.max(1, Math.round(S.hp * frac)); } },
    _spawn(type, opts) {
      if (!st) st = freshState();
      const m = spawn(type || 'rat');
      if (opts) Object.assign(m, opts);
      if (m.x == null) m.x = st.heroX + 50;
      return m;
    },
    _cycleAttacks() {
      stop();
      if (!st) st = freshState();
      size();
      const S0 = stats(eqNow(), lvl());
      st.max = S0.hp; st.hp = S0.hp; st.fx = []; st.nums = []; st.coins = [];
      const out = {};
      const clsOf = { overhead: 'warrior', sweep: 'warrior', bash: 'warrior', bolt: 'mage', chain: 'mage', orb: 'mage', single: 'shooter', burst: 'shooter', grenade: 'shooter' };
      for (const mv of MOVES.warrior.concat(MOVES.mage, MOVES.shooter)) {
        st.forceCls = clsOf[mv];
        st.mode = 'fight'; st.seq = null; st.seqI = 0; st.atkT = 0; st.pose = ''; st.fx = []; st.lunge = 0;
        const base = MON.rat;
        const spr = monCanvas('rat', { tier: 0 });
        st.mon = { type: 'rat', x: st.heroX + 90, px: st.heroX + 90, hp: 9999, max: 9999, dmg: 1, elite: false, boss: false, tier: 0, w: spr.w, h: spr.h, flash: 0, lunge: 0, dead: 0, walk: 0, hurt: 0 };
        st.forceMove = mv;
        const kinds = [];
        const seen = {};
        let started = false;
        for (let i = 0; i < 60; i++) {
          tick();
          if (st.move === mv && st.seq) started = true;
          for (const f of st.fx) { const k = f.k + (f.style ? ':' + f.style : ''); if (!seen[k]) { seen[k] = 1; kinds.push(k); } }
          if (started && st.seq && st.seqI >= st.seq.length) {
            st.atkT = 99;
            const flying = st.fx.some(f => f.k === 'grenade' || f.k === 'orb' || f.k === 'boltshot');
            if (!flying) break;
          }
        }
        out[mv] = { kinds, move: st.move, hpLeft: st.mon && st.mon.hp };
      }
      st.forceCls = null; st.forceMove = null;
      return out;
    },
    _cycleHeals() {
      stop();
      if (!st) st = freshState();
      const S0 = stats(eqNow(), lvl());
      const out = {};
      for (const mode of ['potion', 'rest', 'band']) {
        st.max = S0.hp; st.hp = Math.max(1, Math.round(S0.hp * 0.25)); st.mon = null; st.fx = [];
        startHeal(mode);
        const startHp = st.hp;
        for (let i = 0; i < 70; i++) tick();
        out[mode] = { ended: st.mode === 'run', healed: st.hp > startHp, hp: st.hp, max: st.max };
      }
      return out;
    },
    _forceLoco(l) { if (st) st.forceLoco = l || null; },
    _cycleMoves() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      const snap = () => ({ mode: st.mode, loco: heroLoco(st), facing: st.facing, turn: st.turn || 0, turnTo: st.turnTo, gaitF: st.gaitF || 0, monFacing: st.mon && st.mon.facing, monTurn: st.mon && (st.mon.turn || 0), monType: st.mon && st.mon.type });
      const out = { hero: {}, mons: {} };
      for (const cls of ['warrior', 'shooter', 'mage']) {
        st.forceCls = cls; st.mon = null; st.mode = 'run'; st.facing = 'side'; st.turn = 0; st.turnTo = 'side'; st.gaitF = 0; st.coolWalk = 0;
        const rec = {};
        for (const loco of ['walk', 'run', 'idle']) {
          st.forceLoco = loco; st.loco = loco; st.mode = loco === 'idle' ? 'fight' : 'run';
          if (loco === 'idle') { st.mon = { type: 'rat', x: st.heroX + 30, px: st.heroX + 30, hp: 9, max: 9, dmg: 1, elite: false, boss: false, tier: 0, w: 8, h: 8, flash: 0, lunge: 0, dead: 0, walk: 0, hurt: 0, facing: 'front', turn: 0, turnTo: 'front' }; }
          const frames = [];
          for (let i = 0; i < 10; i++) { tick(); try { draw(); } catch (e) { rec.error = String(e); break; } frames.push(snap().loco); }
          rec[loco] = { loco: st.loco, facing: st.facing, frames };
        }
        st.forceLoco = 'idle'; st.loco = 'idle'; st.mode = 'potion'; st.potion = 0; st.mon = null; st.facing = 'side'; st.turn = 0; st.turnTo = 'side';
        beginTurn(st, 'front');
        const turns = [];
        for (let i = 0; i < 8; i++) { tickTurn(st); turns.push({ facing: st.facing, turn: st.turn, amt: faceAmt(st, 0) }); }
        rec.turnFront = { facing: st.facing, steps: turns };
        beginTurn(st, 'side');
        const back = [];
        for (let i = 0; i < 8; i++) { tickTurn(st); back.push({ facing: st.facing, turn: st.turn, amt: faceAmt(st, 0) }); }
        rec.turnSide = { facing: st.facing, steps: back };
        st.mode = 'run'; st.potion = 0; st.forceLoco = null;
        // render one side canvas per class to prove pixels exist
        try {
          const c = P().heroCanvasSide({ _cls: cls }, 0, null, 'run', 2);
          const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data;
          let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) lit++;
          rec.sidePixels = lit; rec.sideSize = [c.width, c.height]; rec.anchor = c._ax;
        } catch (e) { rec.sideError = String(e); }
        out.hero[cls] = rec;
      }
      st.forceCls = null; st.forceLoco = null;
      for (const type of Object.keys(MON)) {
        const rec = { gait: MON[type].gait };
        try {
          const spr = monCanvas(type, { tier: 0 });
          rec.side = [spr.w, spr.h]; rec.hasFront = !!(spr.front && spr.front !== spr.c);
          rec.front = [spr.fw || spr.front.width, spr.fh || spr.front.height];
          const fake = { type, walk: 6, tier: 0, elite: false, dead: 0, flash: 0, facing: 'side', turn: 0, turnTo: 'side' };
          const p1 = posedMon(spr, fake, 0, true, 'side');
          rec.posed = [p1.w, p1.h];
          fake.walk = 10;
          const p2 = posedMon(spr, fake, 0, true, 'side');
          rec.animChanged = p1.c !== p2.c;
          beginMonTurn(fake, 'front');
          rec.turnStarts = fake.turn > 0 && fake.turnTo === 'front';
        } catch (e) { rec.error = String(e); }
        out.mons[type] = rec;
      }
      return out;
    }
  };
})();
