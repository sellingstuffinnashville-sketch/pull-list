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
    } },
    bat: { k: 2.7, name: 'Cave Bat', hp: 8, dmg: 2, w: 18, h: 12, min: 1, wt: 10, speed: 1.5, gait: 'flap', pack: true, fly: true, draw(S) {
      // Dark leathery wings with scalloped edges and finger bones (not blue triangles).
      S.P({ round: true });
      S.poly([[8, 5], [1, 2], [0, 5], [2, 8], [5, 7], [8, 6]], 'dirt');
      S.poly([[8, 5], [17, 2], [18, 5], [16, 8], [13, 7], [10, 6]], 'dirt');
      S.P({ flat: true });
      S.line(8, 5, 1, 2, 'leather', 1); S.line(8, 5, 0, 5, 'leather', 0); S.line(8, 5, 2, 8, 'leather', 0);
      S.line(8, 5, 17, 2, 'leather', 1); S.line(8, 5, 18, 5, 'leather', 0); S.line(8, 5, 16, 8, 'leather', 0);
      S.P({ round: true }); S.ell(9, 6.2, 2.4, 2.2, 'fur');
      S.P({ round: true }); S.ell(7, 5.2, 2.2, 1.8, 'fur');
      S.P(); S.poly([[6, 4], [4.6, 0], [7.2, 4]], 'fur'); S.poly([[8, 4], [9.6, 0], [9.4, 4]], 'fur');
      S.P({ flat: true, nocs: true }); S.px(6, 5, 'glowR'); S.px(5, 6, 'skin', 2);
      S.P({ flat: true }); S.px(8, 8, 'fur', 1); S.px(10, 8, 'fur', 1);
    } },
    botfly: { k: 2.5, name: 'Acid Botfly', hp: 14, dmg: 3, w: 16, h: 12, min: 2, wt: 12, speed: 1.25, gait: 'flap', fly: true, ranged: true, shot: 'acid', range: 108, draw(S) {
      S.P({ round: true }); S.ell(9, 3.2, 4.2, 2.2, 'ash'); S.ell(12, 3.6, 3.2, 1.8, 'ash');
      S.P({ round: true, shine: true }); S.ell(10, 7.2, 5, 3.2, 'sick');
      S.P({ round: true }); S.ell(6, 7, 3, 2.6, 'sick');
      S.P({ round: true }); S.ell(3.4, 6.5, 2.2, 2, 'fur');
      S.P({ flat: true, nocs: true }); S.px(2, 6, 'glowR'); S.px(3, 6, 'glowY'); S.px(12, 7, 'glowG');
      S.P({ flat: true }); S.line(2, 7, 0, 9, 'sick', 1); S.px(0, 9, 'glowG');
      S.P({ flat: true }); S.line(7, 10, 6, 12, 'void', 0); S.line(10, 10, 10, 12, 'void', 0); S.line(13, 9, 14, 12, 'void', 0);
    } },
    archer: { k: 1.6, name: 'Skeleton Archer', hp: 20, dmg: 4, w: 18, h: 28, min: 2, wt: 14, speed: 0.95, gait: 'walk', ranged: true, shot: 'arrow', range: 120, draw(S) {
      S.P({ shine: true }); S.ell(9, 4.5, 3.4, 3.6, 'bone'); S.rect(7, 7, 4, 2, 'bone');
      S.P({ flat: true, nocs: true }); S.px(7, 4, 'void'); S.px(10, 4, 'void'); S.px(7, 4, 'glowR'); S.px(8, 8, 'void');
      S.P(); S.rect(9, 9, 1, 9, 'bone');
      S.P({ flat: true }); for (let y = 10; y < 16; y += 2) S.line(6, y, 12, y, 'bone', 2);
      S.P(); S.rect(7, 17, 5, 2, 'bone');
      S.P({ flat: true }); S.line(8, 19, 7, 27, 'bone', 2); S.line(11, 19, 13, 27, 'bone', 1);
      S.P(); S.line(12, 11, 15, 14, 'bone', 2);
      S.P(); S.rect(13, 10, 3, 8, 'leather');
      S.P({ flat: true }); S.line(14, 9, 14, 6, 'wood', 1); S.line(15, 9, 16, 6, 'wood', 0);
      S.P({ flat: true }); S.line(2, 8, 0, 16, 'wood', 2); S.line(0, 16, 2, 22, 'wood', 2);
      S.P({ flat: true, nocs: true }); S.line(2, 8, 2, 22, 'bone', 0);
      S.P(); S.line(4, 12, 2, 16, 'bone', 2);
    } },
    spider: { k: 2.8, name: 'Grave Spider', hp: 9, dmg: 2, w: 16, h: 10, min: 1, wt: 10, speed: 1.35, gait: 'scuttle', pack: true, draw(S) {
      S.P({ flat: true }); for (let k = 0; k < 4; k++) { S.line(5 + k * 2, 5, 1 + k * 2, 9, 'void', 1); S.line(8 + k * 2, 5, 12 + k * 2, 9, 'void', 0); }
      S.P({ round: true }); S.ell(8, 5, 4.2, 3, 'void'); S.ell(4, 5, 2.2, 2, 'void');
      S.P({ flat: true, nocs: true }); S.px(3, 4, 'glowR'); S.px(5, 4, 'glowR');
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
    },
    bat(S, k) {
      const q = v => Math.round(v * k);
      S.px(q(6), q(5), 'glowR'); S.px(q(5), q(1), 'fur'); S.px(q(9), q(1), 'fur');
      S.line(q(8), q(5), q(2), q(8), 'leather', -2); S.line(q(8), q(5), q(16), q(8), 'leather', -2);
    },
    botfly(S, k) {
      const q = v => Math.round(v * k);
      S.px(q(2), q(6), 'glowR'); S.px(q(12), q(7), 'glowG'); S.px(q(11), q(8), 'sick');
      S.px(q(0), q(9), 'glowG');
    },
    archer(S, k) {
      const q = v => Math.round(v * k);
      S.line(q(8), q(1.6), q(9), q(3.6), 'bone', -2); S.px(q(7), q(7.5), 'void'); S.px(q(9), q(7.5), 'void');
      S.line(q(2), q(10), q(2), q(20), 'wood', 2);
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
    },
    bat(S) {
      S.P({ round: true });
      S.poly([[8, 5], [1, 3], [0, 6], [3, 8], [7, 6]], 'dirt');
      S.poly([[8, 5], [15, 3], [16, 6], [13, 8], [9, 6]], 'dirt');
      S.P({ flat: true });
      S.line(8, 5, 1, 3, 'leather', 1); S.line(8, 5, 0, 6, 'leather', 0);
      S.line(8, 5, 15, 3, 'leather', 1); S.line(8, 5, 16, 6, 'leather', 0);
      S.P({ round: true }); S.ell(8, 6.2, 2.6, 2.4, 'fur');
      S.P(); S.poly([[6, 4], [5, 1], [7, 4]], 'fur'); S.poly([[9, 4], [11, 1], [10, 4]], 'fur');
      S.P({ flat: true, nocs: true }); S.px(6, 5, 'glowR'); S.px(9, 5, 'glowR');
    },
    botfly(S) {
      S.P({ round: true }); S.ell(6, 3.2, 3.4, 2, 'ash'); S.ell(10, 3.2, 3.4, 2, 'ash');
      S.P({ round: true, shine: true }); S.ell(8, 7, 4.6, 3.4, 'sick');
      S.P({ round: true }); S.ell(8, 5.2, 2.8, 2.2, 'fur');
      S.P({ flat: true, nocs: true }); S.px(6, 5, 'glowR'); S.px(9, 5, 'glowR'); S.px(8, 8, 'glowG');
      S.P({ flat: true }); S.line(5, 10, 4, 12, 'void', 0); S.line(8, 10, 8, 12, 'void', 0); S.line(11, 10, 12, 12, 'void', 0);
    },
    archer(S) {
      S.P({ shine: true }); S.ell(9, 4.5, 4, 3.8, 'bone');
      S.P({ flat: true, nocs: true }); S.px(7, 4, 'void'); S.px(10, 4, 'void'); S.px(7, 4, 'glowR'); S.px(10, 4, 'glowR'); S.px(8, 7, 'void');
      S.P(); S.rect(8, 8, 3, 8, 'bone');
      S.P({ flat: true }); for (let y = 10; y < 16; y += 2) S.line(5, y, 13, y, 'bone', 2);
      S.P(); S.rect(5, 17, 8, 2, 'bone');
      S.P({ flat: true }); S.line(6, 19, 5, 26, 'bone', 2); S.line(12, 19, 13, 26, 'bone', 1);
      S.P(); S.rect(3, 10, 3, 8, 'leather'); S.rect(12, 10, 3, 8, 'leather');
      S.P({ flat: true }); S.line(2, 8, 2, 6, 'wood', 1); S.line(15, 8, 15, 6, 'wood', 1);
      S.P(); S.line(4, 11, 1, 16, 'wood', 2); S.line(13, 11, 16, 16, 'wood', 1);
    },
    spider(S) {
      S.P({ flat: true }); for (let k = 0; k < 3; k++) { S.line(6 + k * 3, 6, 4 + k * 3, 9, 'void', 1); S.line(8 + k * 3, 6, 12 + k * 3, 9, 'void', 0); }
      S.P({ round: true }); S.ell(8, 5, 4, 3, 'void');
      S.P({ flat: true, nocs: true }); S.px(6, 4, 'glowR'); S.px(9, 4, 'glowR');
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
    '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', ',': '000000000010100',
    "'": '010010000000000', '?': '111001010000010', '!': '010010010000010', ':': '000010000010000',
    A: '010101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100111100111',
    F: '111100111100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', J: '001001001101111',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '101111111101101', O: '111101101101111',
    P: '111101111100100', Q: '111101101111001', R: '110101110101101', S: '111100111001111', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111',
    a: '000011101101111', b: '100110101101110', c: '000111100100111', d: '001011101101011', e: '000111111100111',
    f: '011010111010010', g: '011101011001111', h: '100110101101101', i: '010000010010010', j: '001000001001110',
    k: '100101110101101', l: '110010010010011', m: '000111111101101', n: '000110101101101', o: '000111101101111',
    p: '000110101110100', q: '000011101011001', r: '000110100100100', s: '000011110001110', t: '010111010010011',
    u: '000101101101111', v: '000101101101010', w: '000101101111101', x: '000101010101000', y: '000101101011111',
    z: '000111010100111'
  };
  function text(g, str, x, y, col) {
    x = Math.round(x); y = Math.round(y);
    for (let pass = 0; pass < 2; pass++) {
      g.fillStyle = pass ? col : '#0c0705';
      let cx = x;
      for (const ch of String(str)) {
        const gl = GLYPH[ch] || GLYPH[ch.toUpperCase && ch.toUpperCase()];
        if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') {
          const px = cx + (i % 3), py = y + ((i / 3) | 0);
          if (pass) g.fillRect(px, py, 1, 1); else g.fillRect(px - 1, py - 1, 3, 3);
        }
        cx += 4;
      }
    }
  }
  function measureText(str) { return Math.max(0, String(str).length * 4 - 1); }
  function wrapText(str, maxW) {
    const maxC = Math.max(1, Math.floor((maxW + 1) / 4));
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const nxt = cur ? cur + ' ' + w : w;
      if (nxt.length > maxC && cur) { lines.push(cur); cur = w; }
      else cur = nxt;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawBubble(ctx, cx, top, msg) {
    const lines = wrapText(msg, 92);
    const tw = Math.max.apply(null, lines.map(measureText));
    const th = lines.length * 7 - 2, bw = tw + 6, bh = th + 6;
    const x = Math.round(Math.max(2, Math.min(W - bw - 2, cx - bw / 2)));
    const y = Math.round(Math.max(1, top - bh - 4));
    ctx.fillStyle = '#0c0705'; ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#1a120e'; ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    const tx = Math.round(Math.max(x + 2, Math.min(x + bw - 4, cx)));
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(tx, y + bh, 3, 3);
    ctx.fillStyle = '#1a120e'; ctx.fillRect(tx, y + bh - 1, 2, 2);
    lines.forEach((ln, i) => text(ctx, ln, x + 3, y + 3 + i * 7, '#f0e6c8'));
  }

  // ---------- background layers ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const TW = 192;
  const BIOMES = ['plains', 'forest', 'ruins', 'cave'];
  const BIOME_TICKS = FPS * 170, FADE = 30;
  const BIOME_MON = {
    plains: { skel: 1.3, cult: 1.2, rat: 0.8, rustknight: 1.4, spider: 0.6, archer: 1.7, botfly: 0.5 }, forest: { mut: 1.8, rat: 1.3, crawl: 1.3, wisp: 1.6, wraith: 1.2, bat: 1.4, spider: 1.5, botfly: 1.8, archer: 0.8 },
    ruins: { cult: 2, skel: 1.6, brute: 1.6, rustknight: 1.8, wraith: 1.1, spider: 0.8, archer: 1.8, botfly: 0.9 }, cave: { rat: 2, crawl: 1.8, wyrm: 1.5, wisp: 1.2, bat: 1.8, spider: 1.2, botfly: 1.5, archer: 0.6 }
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
  function oak(f, x, top, bottom, rad, col, trunk) {
    const ty = bottom - 8;
    px(f, x - 1, top + rad, trunk || '#24180e', 3, Math.max(1, ty - (top + rad)));
    const r = Math.max(4, rad | 0);
    for (let y = -r; y <= r; y++) for (let xx = -r; xx <= r; xx++) {
      const d = xx * xx * 0.7 + y * y;
      if (d <= r * r) px(f, x + xx, top + r + y, col);
    }
    px(f, x - 2, bottom - 2, trunk || '#24180e', 5, 2);
  }
  function bareTree(f, x, top, bottom, col) {
    px(f, x, top + 8, col, 2, bottom - 2 - (top + 8));
    px(f, x - 1, bottom - 3, col, 4, 2);
    px(f, x, top + 10, col, 1, 1); px(f, x - 4, top + 12, col, 5, 1); px(f, x + 2, top + 16, col, 6, 1);
    px(f, x - 5, top + 11, col, 1, 4); px(f, x + 7, top + 15, col, 1, 4); px(f, x - 2, top + 20, col, 1, 5);
  }
  function burnedTree(f, x, top, bottom) {
    bareTree(f, x, top, bottom, '#1a120c');
    px(f, x, top + 8, '#2a1a12', 2, 6);
    px(f, x, top + 6, '#3a2a22');
    if (((x + bottom) & 1) === 0) { px(f, x + 1, top + 10, '#7a2c14'); px(f, x, top + 9, '#5a2010'); }
  }
  function stump(f, x, y, w) {
    w = w || 6;
    px(f, x, y - 5, '#3a2a1a', w, 5); px(f, x, y - 5, '#5a4630', w, 1); px(f, x + 1, y - 4, '#6a5440', w - 2, 1);
    px(f, x, y - 5, '#24180e', 1, 5); px(f, x + w - 1, y - 5, '#1a120c', 1, 5);
  }
  function fallenLog(f, x, y, len) {
    len = len || 16;
    px(f, x, y - 3, '#3a2a1a', len, 3); px(f, x, y - 3, '#5a4630', len, 1); px(f, x + len - 1, y - 3, '#24180e', 1, 3);
    px(f, x, y - 2, '#2a1e12', 1, 2);
  }
  function bush(f, x, y, w, col) {
    w = w || 7;
    for (let i = 0; i < w; i++) {
      const h = 2 + ((i * 3 + x) % 4);
      px(f, x + i, y - h, col || '#1a2a14', 1, h);
    }
  }
  function silHouse(g, x, gnd, col, w, h) {
    w = w || 16; h = h || 18;
    px(g, x, gnd - h, col, w, h);
    for (let y = 0; y < 7; y++) px(g, x - 1 + (y >> 1), gnd - h - 7 + y, col, Math.max(2, w + 2 - y), 1);
    px(g, x + 3, gnd - h + 6, '#0a0605', 3, 4);
  }
  function silTower(g, x, gnd, col) {
    px(g, x, gnd - 28, col, 2, 28); px(g, x + 10, gnd - 28, col, 2, 28);
    px(g, x - 2, gnd - 40, col, 16, 12); px(g, x + 1, gnd - 44, col, 2, 4);
  }
  function silPole(g, x, gnd, col) {
    px(g, x, gnd - 36, col, 2, 36); px(g, x - 6, gnd - 34, col, 16, 1);
    for (let i = 0; i < 14; i++) px(g, x - 6 - i, gnd - 34 + (i % 3 === 0 ? 1 : 0), col);
  }
  function silHospital(g, x, gnd, col) {
    px(g, x, gnd - 26, col, 28, 26);
    px(g, x + 12, gnd - 20, '#6a1810', 4, 10); px(g, x + 9, gnd - 17, '#6a1810', 10, 4);
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
      silTower(f, 40, H, '#1a1014'); silHouse(f, 110, H, '#1a1014', 18, 16); silPole(f, 160, H, '#140e10');
      silHouse(m, 24, H - 8, '#1e1a14', 20, 18); silPole(m, 80, H - 8, '#1a140e'); silTower(m, 140, H - 8, '#1a140e');
      px(g2, 0, 0, '#3a2a1a', TW, 9); px(g2, 0, 0, '#5a6a2a', TW, 2); px(g2, 0, 2, '#3a4a1e', TW, 1);
      for (let k = 0; k < 120; k++) { const x = r() * TW; px(g2, x, 0, '#7a8a3a'); if (k % 3 === 0) px(g2, x + 1, 0, '#90a048'); }
      for (let k = 0; k < 90; k++) px(g2, r() * TW, 3 + r() * 6, ['#4a3622', '#2a1e12', '#5a4630'][(r() * 3) | 0], 1 + ((r() * 2) | 0));
      for (let k = 0; k < 40; k++) { const x = (r() * TW) | 0; px(m, x, H - 10, '#5a6a2a'); px(m, x + 1, H - 11, '#7a8a3a'); px(m, x + 2, H - 10, '#4a5a22'); }
    } else if (name === 'forest') {
      skyGrad(f0, TH, [[0, '#030408'], [Y0 - 200, '#04060c'], [Y0 - 90, '#070c12'], [Y0, '#0c1416'], [Y0 + H * 0.7, '#18241e'], [TH, '#22301e']]);
      tw = stars(f0, r, 4, Y0 - 40, Math.round(TH * 0.24), 0.9);
      // far silhouettes: mixed pines, oaks, dead and burned trees at varying depth
      for (let k = 0; k < 14; k++) pine(f, (r() * TW) | 0, -80 + ((r() * 60) | 0), H, 8 + ((r() * 7) | 0), '#080e12');
      for (let k = 0; k < 8; k++) oak(f, (r() * TW) | 0, -50 + ((r() * 40) | 0), H, 8 + ((r() * 6) | 0), '#0a1410', '#120e0a');
      for (let k = 0; k < 10; k++) pine(f, (r() * TW) | 0, -18 + ((r() * 36) | 0), H, 6 + ((r() * 6) | 0), k % 2 ? '#0c1610' : '#101c14');
      for (let k = 0; k < 6; k++) oak(f, (r() * TW) | 0, -16 + ((r() * 24) | 0), H, 7 + ((r() * 5) | 0), k % 2 ? '#122016' : '#0e1a12', '#1a140e');
      for (let k = 0; k < 5; k++) bareTree(f, (r() * TW) | 0, -30 + ((r() * 20) | 0), H, '#16100c');
      for (let k = 0; k < 3; k++) burnedTree(f, (r() * TW) | 0, -24 + ((r() * 16) | 0), H);
      // mid: nearer mixed stand, undergrowth, stumps and fallen logs
      for (let k = 0; k < 3; k++) {
        const x = 6 + k * 62 + ((r() * 16) | 0), w = 5 + ((r() * 4) | 0), crown = -78 - ((r() * 36) | 0);
        pine(m, x + (w >> 1), crown, crown + 80, 15 + ((r() * 5) | 0), '#0c1610'); pine(m, x + (w >> 1) + 1, crown + 4, crown + 80, 13, '#09110c');
        px(m, x, crown + 44, '#1e140e', w, H - 8 - crown - 44); px(m, x, crown + 44, '#2e2216', 2, H - 8 - crown - 44); px(m, x + w - 1, crown + 44, '#0e0a08', 1, H - 8 - crown - 44);
        px(m, x - 2, H - 10, '#1e140e', w + 4, 2);
      }
      for (let k = 0; k < 2; k++) {
        const x = 36 + k * 70 + ((r() * 14) | 0);
        oak(m, x, -64 - ((r() * 28) | 0), H - 8, 12 + ((r() * 5) | 0), k ? '#16301c' : '#122818', '#2a1c12');
      }
      for (let k = 0; k < 2; k++) bareTree(m, 20 + k * 90 + ((r() * 20) | 0), -40, H - 8, '#2a1c14');
      burnedTree(m, 100 + ((r() * 30) | 0), -36, H - 8);
      for (let k = 0; k < 3; k++) stump(m, (r() * TW) | 0, H - 8, 5 + ((r() * 3) | 0));
      for (let k = 0; k < 3; k++) fallenLog(m, (r() * (TW - 20)) | 0, H - 8, 12 + ((r() * 10) | 0));
      for (let k = 0; k < 14; k++) bush(m, (r() * TW) | 0, H - 8, 5 + ((r() * 6) | 0), ['#1a2a14', '#24341a', '#152216'][(r() * 3) | 0]);
      silHouse(m, 48, H - 8, '#1a140e', 18, 14); silPole(m, 130, H - 8, '#16100c');
      { const x = 22; px(m, x, H - 16, '#3a2a1a', 2, 8); px(m, x - 3, H - 18, '#4a3a28', 8, 6); px(m, x + 5, H - 17, '#7a2020', 2, 3); }
      { const x = 160; px(m, x, H - 8, '#5a4030', 6, 3); px(m, x + 8, H - 7, '#3a2a1a', 8, 2); }
      px(g2, 0, 0, '#1e2414', TW, 9); px(g2, 0, 0, '#2e4a1e', TW, 1);
      for (let k = 0; k < 150; k++) px(g2, r() * TW, 1 + r() * 8, ['#26341a', '#14180e', '#3a2a1a', '#1a2212'][(r() * 4) | 0], 1 + ((r() * 2) | 0));
      for (let k = 0; k < 8; k++) { const x = (r() * TW) | 0; px(g2, x, 2, '#3a2416', 6, 1); px(g2, x + 5, 3, '#3a2416', 3, 1); }
      for (let k = 0; k < 10; k++) { const x = (r() * TW) | 0; px(g2, x, 0, '#1a2a14', 1, 2 + ((r() * 2) | 0)); }
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
      silHospital(f, 20, H, '#140a08'); silTower(f, 150, H, '#140a08'); silPole(m, 16, H - 8, '#2a1a14'); silPole(m, 170, H - 8, '#2a1a14'); silHouse(m, 90, H - 8, '#2a1c18', 22, 16);
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
    return { mode: 'run', t: 0, scroll: 0, hp: 1, max: 1, heroX: 22, mon: null, mons: [], spawn: 40, fx: [], nums: [], coins: [], fire: null, atkT: 0, monT: 0, pose: '', lunge: 0, flashH: 0, potion: 0, eqKey: '', biome: 0, bt: 0, seq: null, seqI: 0, move: '', forceMove: null, forceCls: null, forceLoco: null, forcePack: null, alpha: 0, loco: 'run', facing: 'side', turn: 0, turnTo: 'side', gaitF: 0, coolWalk: 0, props: [], nextProp: 30, digCd: 24, digT: 0, hopT: 0, hopY: 0, leap: null, toast: null, npc: null, npcCd: 200, greetT: 0, deathCd: 0, healCd: 0, fightXp: 0, awardXp: undefined, noDeath: false };
  }
  function eqNow() { return (typeof xpState !== 'undefined' && xpState.equipped) || {}; }
  function lvl() { return (typeof xpState !== 'undefined' && xpState.level) || 1; }
  function rarity(eq) {
    let best = 0, color = null;
    for (const k in eq) { const it = ITEM_BY_ID[eq[k]]; if (it && RR[it.rarity] > best) { best = RR[it.rarity]; color = RARITY[it.rarity].color; } }
    return { best, color };
  }
  function heroEq() { const e = Object.assign({ _cls: clsNow() }, eqNow()); delete e.base; return e; }

  function isRangedMon(m) {
    const t = (m && typeof m === 'object') ? m.type : m;
    return !!(MON[t] && MON[t].ranged);
  }
  function monShotKind(m) { const t = (m && m.type) || m; return (MON[t] && MON[t].shot) || ''; }
  function monRangeOf(m) { const t = (m && m.type) || m; return (MON[t] && MON[t].range) || 0; }
  function monIsFly(t) { const m = MON[t] || {}; return !!(m.fly || m.gait === 'flap' || m.gait === 'hover'); }
  function clsEncounterBias(type) {
    const cls = clsNow();
    const ranged = isRangedMon(type);
    if (cls === 'warrior') return ranged ? 0.42 : 1.45;
    if (cls === 'shooter' || cls === 'mage') return ranged ? 2.15 : 0.62;
    return 1;
  }
  function pickMonster() {
    const L = lvl();
    if (Math.random() < (L >= 3 ? 0.06 : 0.025)) return (L >= 8 && Math.random() < 0.45) ? 'lich' : 'boss';
    const pool = Object.keys(MON).filter(k => MON[k].wt && MON[k].min <= L);
    const bm = BIOME_MON[BIOMES[st ? st.biome : 0]] || {};
    let tot = 0; const ws = pool.map(k => { const w = Math.max(2, MON[k].wt + (k === 'rat' ? -Math.min(20, L * 2) : MON[k].min * Math.min(L, 10) * 0.4)) * (bm[k] || 1) * clsEncounterBias(k); tot += w; return w; });
    let n = Math.random() * tot;
    for (let i = 0; i < pool.length; i++) { n -= ws[i]; if (n <= 0) return pool[i]; }
    return pool[0] || 'rat';
  }
  const PACKS = {
    rats: { type: 'rat', n: [3, 5], leader: 'mut' },
    bats: { type: 'bat', n: [4, 6], leader: 'wisp' },
    spiders: { type: 'spider', n: [3, 5], leader: 'crawl' },
    botflies: { type: 'botfly', n: [3, 5], leader: 'botfly', ranged: true },
    archers: { type: 'archer', n: [2, 3], ranged: true }
  };
  function pickPackKind() {
    const keys = Object.keys(PACKS);
    const cls = clsNow();
    let tot = 0;
    const ws = keys.map(k => {
      const p = PACKS[k];
      let w = 1;
      if (cls === 'warrior') w *= p.ranged ? 0.32 : (k === 'bats' ? 0.8 : 1.45);
      else w *= p.ranged ? 1.8 : (k === 'bats' ? 1.15 : 0.5);
      tot += w; return w;
    });
    let n = Math.random() * tot;
    for (let i = 0; i < keys.length; i++) { n -= ws[i]; if (n <= 0) return keys[i]; }
    return keys[0];
  }
  function allMons(s) {
    s = s || st;
    if (s && s.mons && s.mons.length) return s.mons;
    return (s && s.mon) ? [s.mon] : [];
  }
  function living(s) { return allMons(s).filter(m => m && !m.dead); }
  function syncPrimary(s) {
    s = s || st;
    const live = living(s);
    s.mon = live[0] || null;
    if (!live.length && allMons(s).every(m => !m || m.dead > 7)) s.mons = [];
  }
  function packCenter(s) {
    const ms = living(s);
    if (!ms.length) return { x: (s.heroX || 22) + 50, y: H - 16 };
    let x = 0, y = 0;
    for (const m of ms) { const mid = monMid(m); x += mid.x; y += mid.y; }
    return { x: x / ms.length, y: y / ms.length };
  }
  function makeMon(type, opts) {
    opts = opts || {};
    const L = opts.level != null ? opts.level : lvl();
    const base = MON[type] || MON.rat;
    const elite = !!opts.elite;
    const leader = !!opts.leader;
    const tier = opts.tier != null ? opts.tier : pickTier(L, !!base.boss);
    const spr = monCanvas(type, { tier, elite: elite || leader });
    const hp = Math.round(base.hp * (1 + 0.22 * (L - 1)) * (1 + 0.18 * tier) * (elite ? 2.4 : 1) * (leader ? 1.6 : 1));
    const dmg = base.dmg * (1 + 0.12 * (L - 1)) * (1 + 0.1 * tier) * (elite ? 1.35 : 1) * (leader ? 1.2 : 1);
    const yOff = opts.yOff != null ? opts.yOff : (monIsFly(type) ? -7 : 0);
    return { type, x: opts.x != null ? opts.x : W + 4, px: opts.x != null ? opts.x : W + 4, hp, max: hp, dmg, elite, leader, boss: !!base.boss, tier, w: spr.w, h: spr.h, flash: 0, lunge: 0, dead: 0, walk: opts.walk || 0, hurt: 0, facing: 'front', turn: 0, turnTo: 'front', spawnFace: opts.spawnFace != null ? opts.spawnFace : 6, yOff, shotT: 2 + ((Math.random() * 6) | 0) };
  }
  function setMons(list) {
    st.mons = list;
    st.mon = list[0] || null;
    return st.mon;
  }
  function spawnOne(forced) {
    const type = forced || pickMonster(), L = (st && st.forceLevel) || lvl();
    const base = MON[type] || MON.rat;
    const elite = !base.boss && !forced && Math.random() < (0.06 + Math.min(0.08, L * 0.008));
    const m = makeMon(type, { elite, level: L });
    return setMons([m]);
  }
  function spawnPack(kind, withLeader) {
    const spec = PACKS[kind] || PACKS.rats;
    const L = (st && st.forceLevel) || lvl();
    const n0 = spec.n[0], n1 = spec.n[1];
    const n = n0 + ((Math.random() * (n1 - n0 + 1)) | 0);
    const list = [];
    const fly = monIsFly(spec.type);
    for (let i = 0; i < n; i++) {
      list.push(makeMon(spec.type, { level: L, x: W + 8 + i * (fly ? 9 : 11) + ((Math.random() * 4) | 0), walk: (i * 3) % 8, spawnFace: 5 + (i % 3), yOff: fly ? -6 - ((i * 5) % 10) : 0 }));
    }
    if (withLeader && spec.leader) {
      const lead = makeMon(spec.leader, { level: L, leader: true, x: W + 8 + n * 11 + 6, spawnFace: 6, yOff: 0 });
      list.push(lead);
    }
    return setMons(list);
  }
  function spawn(forced) {
    if (forced && PACKS[forced]) return spawnPack(forced, !!(st && st.forcePack === 'leader'));
    if (forced) return spawnOne(forced);
    if (st && st.forcePack) {
      const kind = st.forcePack === 'leader' ? 'rats' : st.forcePack;
      const lead = st.forcePack === 'leader';
      st.forcePack = null;
      return spawnPack(kind, lead);
    }
    const L = lvl();
    if (Math.random() < (L >= 2 ? 0.34 : 0.26)) {
      const kind = pickPackKind();
      return spawnPack(kind, Math.random() < 0.3 && L >= 3);
    }
    return spawnOne();
  }
  function nextGap() { return Math.round(FPS * (18 - Math.min(8, lvl() * 0.5)) * (0.6 + Math.random() * 0.8)); }
  function atkKind(eq) {
    const c = clsNow();
    if (c === 'shooter') return 'ranged';
    if (c === 'mage') return 'bolt';
    return GUNS[eq.weapon] ? 'ranged' : 'melee';
  }
  function foeEngageDist() {
    let r = 0;
    for (const m of living(st)) r = Math.max(r, monRangeOf(m));
    return r;
  }
  function engageDist(eq) {
    const kind = atkKind(eq);
    const pack = living(st).length >= 2;
    const want = kind === 'ranged' ? 128 : kind === 'bolt' ? 116 : (pack ? 28 : 8);
    const foe = foeEngageDist();
    return Math.min(Math.max(want, foe ? foe - 8 : 0), Math.max(8, W - (st ? st.heroX : 22) - 48));
  }
  function closeDist() { return 8; }
  function addNum(x, y, v, col) { st.nums.push({ x, y, v, col, t: 0 }); }
  function heroSprite(pose) {
    const eq = heroEq(), r = rarity(eqNow());
    return P().heroCanvas(eq, r.best, r.color, pose || '');
  }
  const MOVES = {
    warrior: ['overhead', 'sweep', 'bash', 'cleave'],
    mage: ['bolt', 'chain', 'orb', 'blast'],
    shooter: ['single', 'burst', 'grenade']
  };
  const SOLO_MOVES = {
    warrior: ['overhead', 'sweep', 'bash'],
    mage: ['bolt', 'chain', 'orb'],
    shooter: ['single', 'burst', 'grenade']
  };
  function pickMove(kind, dist) {
    if (st && st.forceMove) { const m = st.forceMove; st.forceMove = null; return m; }
    const c = clsNow();
    const pack = living(st).length >= 2;
    if (pack) {
      if (c === 'warrior' || kind === 'melee') return 'cleave';
      if (c === 'mage' || kind === 'bolt') return Math.random() < 0.55 ? 'chain' : 'blast';
      return 'grenade';
    }
    if (kind === 'melee' || c === 'warrior') return SOLO_MOVES.warrior[(Math.random() * 3) | 0];
    if (kind === 'bolt' || c === 'mage') {
      if (dist > 84) return Math.random() < 0.88 ? 'bolt' : 'chain';
      if (dist > 46) return Math.random() < 0.7 ? 'chain' : (Math.random() < 0.55 ? 'bolt' : 'orb');
      return Math.random() < 0.68 ? 'orb' : 'chain';
    }
    if (dist > 90) return 'single';
    if (dist > 50) return Math.random() < 0.72 ? 'burst' : 'single';
    return Math.random() < 0.58 ? 'grenade' : 'burst';
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
      case 'cleave': return [{ wait: 3, pose: 'raise', leap: 1 }, { wait: 3, pose: 'sweep', hit: 'cleave', lunge: 2 }, { wait: R(7), pose: '' }];
      case 'blast': return [{ wait: 4, pose: 'cast' }, { wait: 2, pose: 'cast', hit: 'blast' }, { wait: R(8), pose: '' }];
      default: return [{ wait: 2, pose: 'raise' }, { wait: 2, pose: '', hit: 'slashSweep', lunge: 2 }, { wait: R(5), pose: '' }];
    }
  }
  function buildSeqAt(move, S, dist) {
    const seq = buildSeq(move, S);
    if (move === 'single' && dist > 90) return [{ wait: 2, pose: 'aim' }, { wait: 2, pose: 'aim', hit: 'shot' }, { wait: recoverWait(S, 5), pose: '' }];
    return seq;
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
    const targets = living(s);
    if (!targets.length && !(m && !m.dead)) return;
    if (!m || m.dead) m = targets[0];
    if (!m) return;
    const muz = muzzle(s, eq), mid = monMid(m), col = mageCol(eq), pack = packCenter(s);
    const dist = Math.max(8, mid.x - muz.x);
    if (hit === 'slashDown') { s.fx.push({ k: 'slash', style: 'down', x: s.heroX + 34, y: HERO_Y + 16, t: 0, life: 5 }); impact(s, m, S, 1, true); }
    else if (hit === 'slashSweep') { s.fx.push({ k: 'slash', style: 'sweep', x: s.heroX + 36, y: HERO_Y + 24, t: 0, life: 5 }); impact(s, m, S, 1, true); }
    else if (hit === 'bash') { s.fx.push({ k: 'bash', x: mid.x - 6, y: mid.y, t: 0, life: 5 }); impact(s, m, S, 1.1, true); m.x += 4; }
    else if (hit === 'cleave') {
      s.fx.push({ k: 'slash', style: 'spin', x: pack.x, y: pack.y, t: 0, life: 7 });
      for (const t of living(s)) { impact(s, t, S, 1.05, true); t.x += 3; }
    }
    else if (hit === 'bolt') s.fx.push({ k: 'boltshot', x: muz.x, y: muz.y, tx: mid.x, ty: mid.y, t: 0, life: Math.max(3, Math.round(dist / 22)), dmg: rollDmg(S, 0.75), col, mon: m, small: dist > 70 });
    else if (hit === 'chain') {
      let px0 = muz.x, py0 = muz.y;
      const chain = targets.length ? targets : [m];
      for (const t of chain) {
        const tm = monMid(t);
        const pts = [[px0, py0]]; const n = 6;
        for (let i = 1; i < n; i++) pts.push([px0 + (tm.x - px0) * i / n, py0 + (tm.y - py0) * i / n + (Math.random() * 12 - 6)]);
        pts.push([tm.x, tm.y]);
        s.fx.push({ k: 'bolt', pts, col, t: 0, life: 5 });
        lightningArcs(s, tm.x, tm.y, col);
        impact(s, t, S, targets.length > 1 ? 0.95 : 1.15, false);
        px0 = tm.x; py0 = tm.y;
      }
    }
    else if (hit === 'orb') s.fx.push({ k: 'orb', x: muz.x, y: muz.y, tx: mid.x, ty: mid.y, t: 0, life: Math.max(6, Math.round(dist / 12)), dmg: rollDmg(S, 1.3), col, mon: m });
    else if (hit === 'blast') {
      s.fx.push({ k: 'blast', x: pack.x, y: pack.y, t: 0, life: 8, col });
      for (const t of (targets.length ? targets : [m])) {
        const tm = monMid(t);
        lightningArcs(s, tm.x, tm.y, col);
        impact(s, t, S, 1.2, false);
      }
    }
    else if (hit === 'shot') { s.fx.push({ k: 'shot', x: muz.x, y: muz.y, tx: mid.x, t: 0, life: Math.max(3, Math.round(dist / 40)) }); s.fx.push({ k: 'flash', x: muz.x, y: muz.y, t: 0, life: 2 }); impact(s, m, S, dist > 90 ? 0.5 : 0.65, true); }
    else if (hit === 'grenade') s.fx.push({ k: 'grenade', x: muz.x, y: muz.y, tx: pack.x, ty: H - 10, t: 0, life: 10, dmg: rollDmg(S, targets.length > 1 ? 1.15 : 1.5), mon: m });
  }
  function heroHitDmg(s, mon) {
    const S = stats(eqNow(), lvl());
    const md = (mon && mon.dmg) || ((MON[mon && mon.type] || MON.rat).dmg);
    return Math.max(1, Math.round(s.max * (0.045 + 0.016 * md) * (mon && (mon.elite || mon.leader) ? 1.4 : 1) * (0.7 + Math.random() * 0.6) * (1 - S.def / (S.def + 40))));
  }
  function applyHeroHit(s, d, src) {
    const canDie = s.forceDeath || (!s.noDeath && (s.deathCd || 0) <= 0 && src && ((src.boss || src.elite || src.leader) ? Math.random() < 0.18 : Math.random() < 0.045));
    if ((canDie && s.hp - d < s.max * 0.15) || s.forceDeath) {
      s.hp = 0; s.flashH = 5; addNum(s.heroX + 20, 18, d, '#ff6050'); s.forceDeath = false; startDeath(s, src); return true;
    }
    if (s.hp - d < s.max * 0.08 && !s.forceDeath && Math.random() < 0.35) {
      addNum(s.heroX + 18, 18, 'BLOCK', '#a8c8ff'); s.fx.push({ k: 'block', x: s.heroX + 36, y: 34, t: 0, life: 3 });
      return false;
    }
    s.hp = Math.max(0, s.hp - d); s.flashH = 3; addNum(s.heroX + 20, 18, d, '#ff6050');
    if (s.hp <= 0) { s.hp = 0; startDeath(s, src); return true; }
    return false;
  }
  function heroProjectileHit(s, f) {
    const hx = s.heroX + 24, hy = HERO_Y + 28;
    const acid = f.k === 'acid';
    if (acid) {
      s.fx.push({ k: 'acidSplash', x: hx, y: hy, t: 0, life: 7 });
      for (let i = 0; i < 5; i++) s.fx.push({ k: 'acidDrop', x: hx + Math.random() * 8 - 3, y: hy + Math.random() * 6 - 2, vx: Math.random() * 1.4 - 0.4, vy: -0.6 - Math.random(), t: 0, life: 5 });
    } else {
      s.fx.push({ k: 'arrowHit', x: hx + 4, y: hy, t: 0, life: 4 });
      splat(s, { x: hx - 6, w: 12, h: 20, yOff: -10 }, 3);
    }
    applyHeroHit(s, f.dmg || 2, f.mon || null);
  }
  function fireMonShot(s, mon) {
    const mid = monMid(mon);
    const hx = s.heroX + 22, hy = HERO_Y + 26;
    const kind = monShotKind(mon) || 'arrow';
    const dist = Math.max(8, mid.x - hx);
    const dmg = heroHitDmg(s, mon);
    mon.lunge = 2;
    if (kind === 'acid') {
      s.fx.push({ k: 'acid', x: mid.x - 4, y: mid.y + 2, x0: mid.x - 4, y0: mid.y + 2, tx: hx + 4, ty: hy + 2, t: 0, life: Math.max(6, Math.round(dist / 14)), dmg, mon, arc: 12 + Math.random() * 8 });
    } else {
      s.fx.push({ k: 'arrow', x: mid.x - 2, y: mid.y, x0: mid.x - 2, y0: mid.y, tx: hx + 6, ty: hy, t: 0, life: Math.max(4, Math.round(dist / 22)), dmg, mon });
    }
  }
  function tickMonShots(s) {
    if (s.mode !== 'fight') return;
    for (const mon of living(s)) {
      if (!isRangedMon(mon) || mon.dead) continue;
      const dist = mon.x - (s.heroX + 40);
      if (dist > (monRangeOf(mon) || 110) + 12) continue;
      mon.shotT = (mon.shotT || 0) - 1;
      if (mon.shotT > 0) continue;
      mon.shotT = (mon.boss ? 9 : 11) + ((Math.random() * 5) | 0);
      fireMonShot(s, mon);
    }
  }
  function startLeap(s) {
    const mid = packCenter(s);
    const to = Math.max(6, Math.min(90, mid.x - (s.heroX + 24) - 6));
    s.leap = { t: 0, life: 10, to };
  }
  function leapOff(s, a) {
    if (!s.leap) return 0;
    const t = (s.leap.t + (a || 0)) / s.leap.life;
    const p = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
    return s.leap.to * Math.max(0, Math.min(1, p));
  }
  function startAttack(s, eq, S, m) {
    const kind = atkKind(eq);
    const live = living(s);
    if (!m || m.dead) m = live[0];
    if (!m) return;
    const dist = m.x - (s.heroX + 40);
    const move = pickMove(kind, dist);
    s.move = move;
    s.seq = buildSeqAt(move, S, dist);
    s.seqI = 0;
    s.atkT = s.seq[0].wait;
    s.pose = s.seq[0].pose || '';
    if (s.seq[0].lunge) s.lunge = s.seq[0].lunge;
    if (s.seq[0].leap) startLeap(s);
    if (s.seq[0].hit) fireHit(s, eq, S, m, s.seq[0].hit);
  }

  // ---------- simulation (fixed 12 ticks per second, drawn on rAF) ----------
  function snap(s) {
    for (const m of allMons(s)) m.px = m.x;
    s.fx.forEach(f => { f.px = f.x; f.py = f.y; });
    s.coins.forEach(c => { c.px = c.x; c.py = c.y; });
  }
  function tickFx(s, S) {
    const cur = s.fx;
    s.fx = [];
    for (const f of cur) {
      f.t++;
      if (f.k === 'blood' || f.k === 'acidDrop') { f.x += f.vx; f.y += f.vy; f.vy += 0.45; }
      if ((f.k === 'boltshot' || f.k === 'orb') && f.t >= f.life) {
        const m = (f.mon && !f.mon.dead && st.mon === f.mon) ? f.mon : (st.mon && !st.mon.dead ? st.mon : null);
        if (m && f.dmg) {
          hurtMon(s, m, f.dmg.d, f.dmg.crit);
          if (f.k === 'orb') lightningArcs(s, f.tx, f.ty, f.col);
          else s.fx.push({ k: 'zap', x: f.tx, y: f.ty, col: f.col[1], t: 0, life: 3 });
        }
      }
      if (f.k === 'grenade' && f.t >= f.life) {
        s.fx.push({ k: 'boom', x: f.tx, y: f.ty, t: 0, life: 8 });
        const hit = living(s);
        for (const t of hit) {
          const mid = monMid(t);
          const dx = mid.x - f.tx, dy = mid.y - f.ty;
          if (dx * dx + dy * dy < 40 * 40 && f.dmg) { hurtMon(s, t, f.dmg.d, f.dmg.crit); splat(s, t, 3); }
        }
      }
      if ((f.k === 'acid' || f.k === 'arrow') && !f.hitHero) {
        const life = Math.max(1, f.life || 1);
        const p = Math.min(1, f.t / life);
        const arc = f.k === 'acid' ? Math.sin(p * Math.PI) * (f.arc || 14) : p * p * 3;
        f.x = f.x0 + (f.tx - f.x0) * p;
        f.y = f.y0 + (f.ty - f.y0) * p - arc;
        if (f.t >= life) {
          f.hitHero = 1;
          heroProjectileHit(s, f);
        }
      }
      if (f.k === 'acidSplash') { /* hold */ }
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
    s.mode = 'run'; s.potion = 0; s.pose = ''; s.leap = null; s.hopT = 0; s.hopY = 0; s.digT = 0;
    if (walkFirst) { s.coolWalk = 12; s.loco = 'walk'; } else s.loco = s.coolWalk ? 'walk' : 'run';
    beginTurn(s, 'side');
  }

  // ---------- wasteland / woods / cave props ----------
  const PROP = {
    car: { w: 52, h: 24 }, carbrush: { w: 54, h: 26 }, bike: { w: 32, h: 18 }, bus: { w: 78, h: 30 },
    gas: { w: 92, h: 54, rare: 1, set: 1, cool: 10 },
    house: { w: 70, h: 46, set: 1, cool: 8, mid: 1 },
    hospital: { w: 96, h: 52, rare: 1, set: 1, cool: 12, mid: 1 },
    diner: { w: 84, h: 38, set: 1, cool: 9, mid: 1 },
    church: { w: 62, h: 56, set: 1, cool: 10, mid: 1 },
    watertower: { w: 36, h: 58, set: 1, cool: 10, mid: 1 },
    billboard: { w: 72, h: 42, set: 1, cool: 8, mid: 1 },
    cabin: { w: 64, h: 36, set: 1, cool: 8 },
    boulder: { w: 26, h: 16, hop: 1, cool: 3 },
    skeleton: { w: 28, h: 10, cool: 4 },
    rubble: { w: 28, h: 14, dig: 1, cool: 3 },
    debris: { w: 16, h: 9, cool: 3 },
    deadtree: { w: 22, h: 36, cool: 3 },
    sign: { w: 18, h: 24, cool: 5 },
    barrel: { w: 12, h: 15, cool: 4 },
    mailbox: { w: 14, h: 18, cool: 7 },
    stump: { w: 14, h: 10, cool: 3 },
    log: { w: 28, h: 10, cool: 3 },
    bush: { w: 16, h: 11, fg: 1, cool: 2 },
    fence: { w: 40, h: 16, cool: 4 },
    pole: { w: 40, h: 50, mid: 1, cool: 5 },
    minecart: { w: 28, h: 18, cool: 4 },
    lantern: { w: 12, h: 22, glow: 1, cool: 4 },
    crystal: { w: 16, h: 20, glow: 1, cool: 4 },
    cavein: { w: 44, h: 28, hop: 1, cool: 5 },
    stalactite: { w: 14, h: 26, hang: 1, mid: 1, cool: 3 },
    bones: { w: 24, h: 12, dig: 1, cool: 4 }
  };
  function propWeights(biome) {
    const name = BIOMES[biome] || 'plains';
    if (name === 'forest') return [
      ['cabin', 1.5], ['carbrush', 1.4], ['house', 0.45], ['church', 0.22],
      ['skeleton', 0.9], ['rubble', 1.2], ['deadtree', 1.6], ['stump', 1.3], ['log', 1.3],
      ['boulder', 1.0], ['debris', 0.9], ['bush', 1.3], ['fence', 0.8], ['pole', 0.45],
      ['mailbox', 0.3], ['sign', 0.4], ['barrel', 0.4]
    ];
    if (name === 'cave') return [
      ['boulder', 2.0], ['cavein', 1.4], ['minecart', 1.3], ['stalactite', 1.6],
      ['crystal', 1.3], ['lantern', 1.1], ['skeleton', 1.2], ['bones', 1.3],
      ['rubble', 1.5], ['debris', 1.0], ['barrel', 0.6]
    ];
    if (name === 'ruins') return [
      ['house', 0.7], ['hospital', 0.28], ['church', 0.32], ['diner', 0.22],
      ['billboard', 0.4], ['watertower', 0.25], ['bus', 0.5], ['car', 1.5], ['bike', 0.9],
      ['gas', 0.16], ['cabin', 0.2], ['pole', 0.8], ['fence', 0.7], ['sign', 0.7],
      ['barrel', 0.9], ['rubble', 1.4], ['debris', 1.2], ['skeleton', 1.2], ['mailbox', 0.2],
      ['boulder', 0.6], ['deadtree', 0.4]
    ];
    // plains / wasteland / town
    return [
      ['car', 1.8], ['bike', 1.2], ['bus', 0.45], ['gas', 0.22], ['house', 0.4],
      ['hospital', 0.16], ['diner', 0.22], ['church', 0.18], ['watertower', 0.22],
      ['billboard', 0.3], ['boulder', 1.1], ['skeleton', 1.0], ['rubble', 1.4],
      ['debris', 1.1], ['deadtree', 0.8], ['sign', 0.8], ['barrel', 0.9],
      ['mailbox', 0.4], ['fence', 0.8], ['pole', 0.7]
    ];
  }
  function shuffleBag(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0, t = list[i]; list[i] = list[j]; list[j] = t;
    }
    for (let i = 1; i < list.length; i++) {
      if (list[i] === list[i - 1]) {
        for (let j = i + 1; j < list.length; j++) if (list[j] !== list[i - 1]) {
          const t = list[i]; list[i] = list[j]; list[j] = t; break;
        }
      }
    }
    return list;
  }
  function refillPropBag(s) {
    const bag = [];
    for (const [k, w] of propWeights(s.biome)) {
      const n = Math.max(1, Math.round(w * 3));
      for (let i = 0; i < n; i++) bag.push(k);
    }
    s.propBag = shuffleBag(bag);
  }
  function pickPropType(s, avoidRare) {
    if (!s.propBag || !s.propBag.length) refillPropBag(s);
    const cool = s.propCool || (s.propCool = {});
    const recent = s.recentProps || (s.recentProps = []);
    const last = recent[recent.length - 1];
    const bag = s.propBag;
    for (let tries = 0; tries < bag.length; tries++) {
      const k = bag.shift();
      const meta = PROP[k] || {};
      if (avoidRare && (meta.rare || meta.set)) { bag.push(k); continue; }
      if (k === last) { bag.push(k); continue; }
      if ((cool[k] || 0) > 0) { bag.push(k); continue; }
      if (recent.slice(-3).includes(k)) { bag.push(k); continue; }
      return k;
    }
    const wts = propWeights(s.biome);
    return (wts.find(p => p[0] !== last) || wts[0])[0];
  }
  const propCache = {};
  const C = {
    ink: '#0c0705', rust: '#5a2a18', rustH: '#8a4a28', rustL: '#3a1a10',
    ash: '#3a3230', ashH: '#5a524e', ashL: '#1e1a18', bone: '#d6caae', boneH: '#efe6d0', boneL: '#8a7a60',
    char: '#1a140e', dirt: '#3a2a1a', moss: '#1a2a14', mossH: '#2a4a1e',
    metal: '#4a4440', metalH: '#7a746c', metalL: '#2a2420', wood: '#3a2a1a', woodH: '#5a4630', woodL: '#24180e',
    glass: '#1a100c', glow: '#ff8a2a', cross: '#c01818', sand: '#6a5a40'
  };
  function inkOutline(c) {
    const x = c.getContext('2d'), w = c.width, h = c.height;
    const src = x.getImageData(0, 0, w, h), d = src.data;
    const out = x.createImageData(w, h), o = out.data;
    const A = i => d[i * 4 + 3];
    const solid = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && A(yy * w + xx) > 20;
    for (let y = 0; y < h; y++) for (let x0 = 0; x0 < w; x0++) {
      const i = y * w + x0, p = i * 4;
      if (A(i) > 20) { o[p] = d[p]; o[p + 1] = d[p + 1]; o[p + 2] = d[p + 2]; o[p + 3] = d[p + 3]; }
      else if (solid(x0 - 1, y) || solid(x0 + 1, y) || solid(x0, y - 1) || solid(x0, y + 1)) {
        o[p] = 12; o[p + 1] = 7; o[p + 2] = 5; o[p + 3] = 255;
      }
    }
    x.putImageData(out, 0, 0);
    return c;
  }
  function paintProp(type, v) {
    const key = type + '|' + (v | 0);
    if (propCache[key]) return propCache[key];
    const meta = PROP[type] || PROP.debris;
    const pad = 1, c = mkc(meta.w + pad * 2, meta.h + pad * 2), x = c.getContext('2d');
    c._pad = pad;
    const gnd = meta.h + pad, o = pad;
    const P = (xx, yy, col, w, h) => px(x, o + xx, yy, col, w, h);
    const box3 = (xx, yy, w, h, mid, hi, sh) => {
      P(xx, yy, mid, w, h);
      if (h > 1) P(xx, yy, hi, Math.max(1, w - 1), 1);
      if (w > 1) P(xx, yy + 1, hi, 1, Math.max(1, h - 2));
      if (w > 1) P(xx + w - 1, yy, sh || C.ink, 1, h);
      if (h > 1) P(xx, yy + h - 1, sh || C.ink, w, 1);
    };
    const wheel = (cx, cy, r, smashed) => {
      P(cx - r, cy - r, C.char, r * 2, r * 2);
      P(cx - r + 1, cy - r + 1, smashed ? C.rustL : C.metalL, r * 2 - 2, r * 2 - 2);
      P(cx - 1, cy - 1, C.metalH, 2, 2);
      if (smashed) { P(cx + r - 2, cy, C.rust, 3, 2); P(cx - r, cy + r - 1, C.ash, 3, 1); }
    };
    const windw = (xx, yy, w, h, smashed, lit) => {
      P(xx, yy, lit ? '#3a2010' : C.glass, w, h);
      P(xx, yy, C.char, w, 1); P(xx, yy, C.char, 1, h);
      if (smashed) {
        P(xx + 1, yy + 1, '#2a1810', 1, h - 2);
        P(xx + w - 2, yy + 2, C.boneL, 1, 2);
        P(xx + (w >> 1), yy + 1, C.ink, 1, h - 1);
      } else {
        P(xx + 1, yy + 1, lit ? '#ffb060' : '#3a2820', 1, 1);
      }
    };
    const rustStreak = (xx, yy, h) => { P(xx, yy, C.rust, 1, h); if (h > 3) P(xx, yy + 2, C.rustL, 1, h - 2); };
    const v0 = v | 0, dmg = v0 % 3, pal = (v0 >> 1) % 2;
    const body = pal ? C.ash : C.rust, bodyH = pal ? C.ashH : C.rustH, bodyL = pal ? C.ashL : C.rustL;

    if (type === 'car' || type === 'carbrush') {
      P(6, gnd - 1, C.char, 40, 1);
      box3(4, gnd - 10, 44, 8, body, bodyH, bodyL);
      box3(14, gnd - 20, 22, 10, body, bodyH, bodyL);
      P(14, gnd - 21, bodyL, 22, 1);
      P(12, gnd - 10, body, 4, 3); P(36, gnd - 10, body, 3, 3);
      windw(16, gnd - 19, 8, 6, 1, 0); windw(26, gnd - 19, 8, 6, dmg !== 0, 0);
      P(15, gnd - 13, C.char, 20, 1);
      wheel(12, gnd - 4, 4, 0);
      if (dmg === 2) { P(40, gnd - 5, C.rust, 5, 2); P(42, gnd - 3, C.metalL, 4, 1); }
      else wheel(40, gnd - 4, 4, dmg === 1);
      P(3, gnd - 8, bodyL, 3, 3); P(46, gnd - 8, bodyL, 3, 2);
      P(5, gnd - 9, dmg ? C.char : '#c8a050', 3, 2); P(45, gnd - 9, '#5a2010', 3, 2);
      rustStreak(10, gnd - 16, 6); rustStreak(34, gnd - 18, 8);
      P(22, gnd - 11, C.rustH, 2, 1); P(8, gnd - 7, C.char, 1, 1); P(30, gnd - 8, C.char, 1, 1);
      if (type === 'carbrush') {
        for (let i = 0; i < 14; i++) P(6 + i * 3, gnd - (8 + (i + dmg) % 5), (i % 2) ? C.moss : C.mossH, 2, 3 + (i % 3));
        P(20, gnd - 22, C.mossH, 3, 4); P(32, gnd - 18, C.moss, 4, 5);
      }
    } else if (type === 'bike') {
      P(3, gnd - 1, C.char, 26, 1);
      wheel(6, gnd - 5, 5, 0); wheel(24, gnd - 5, 5, dmg === 2);
      P(8, gnd - 10, C.metal, 14, 2); P(10, gnd - 12, body, 8, 3); P(11, gnd - 13, bodyH, 6, 1);
      P(20, gnd - 16, C.metal, 2, 7); P(18, gnd - 17, C.metalH, 6, 2); P(22, gnd - 18, C.char, 3, 2);
      P(8, gnd - 11, C.rust, 3, 1); P(12, gnd - 9, C.metalL, 4, 1);
      rustStreak(14, gnd - 12, 4);
    } else if (type === 'bus') {
      P(4, gnd - 1, C.char, 70, 1);
      box3(2, gnd - 22, 74, 18, body, bodyH, bodyL);
      box3(8, gnd - 28, 62, 8, body, bodyH, bodyL);
      P(4, gnd - 16, pal ? '#3a2010' : '#4a3020', 70, 3);
      for (let i = 0; i < 7; i++) windw(10 + i * 8, gnd - 26, 6, 6, (i + dmg) % 3 !== 0, 0);
      windw(4, gnd - 14, 6, 8, 1, 0);
      P(2, gnd - 12, C.char, 4, 6);
      wheel(16, gnd - 4, 4, 0); wheel(28, gnd - 4, 4, 0); wheel(58, gnd - 4, 4, dmg === 2); wheel(68, gnd - 4, 4, 0);
      P(30, gnd - 30, C.char, 18, 3); P(32, gnd - 29, C.ashH, 14, 1);
      rustStreak(20, gnd - 20, 10); rustStreak(50, gnd - 24, 12);
    } else if (type === 'gas') {
      P(2, gnd - 2, '#2a2218', 88, 2);
      P(6, gnd - 3, '#1a140e', 20, 1); P(36, gnd - 3, '#1a140e', 20, 1);
      box3(8, gnd - 24, 12, 20, C.ash, C.ashH, C.ashL);
      box3(36, gnd - 24, 12, 20, C.ash, C.ashH, C.ashL);
      P(10, gnd - 20, C.char, 8, 8); P(38, gnd - 20, C.char, 8, 8);
      P(12, gnd - 18, dmg ? C.char : C.glow, 4, 3); P(40, gnd - 17, C.rust, 4, 2);
      P(18, gnd - 16, C.char, 1, 10); P(46, gnd - 14, C.char, 1, 8);
      P(17, gnd - 8, C.metalL, 3, 2); P(45, gnd - 7, C.metalL, 3, 2);
      box3(58, gnd - 28, 26, 26, C.wood, C.woodH, C.woodL);
      windw(62, gnd - 22, 8, 7, 1, dmg === 0);
      P(74, gnd - 16, C.char, 6, 10);
      P(8, gnd - 40, C.metalL, 3, 16); P(52, gnd - 40, C.metalL, 3, 16);
      box3(6, gnd - 44, 52, 5, C.rust, C.rustH, C.rustL);
      if (dmg === 2) { P(40, gnd - 48, C.rustL, 16, 4); P(48, gnd - 50, C.rust, 8, 3); }
      else { P(8, gnd - 48, C.metal, 48, 4); P(10, gnd - 50, C.metalL, 3, 3); P(50, gnd - 50, C.metalL, 3, 3); }
      P(18, gnd - 43, '#5a2010', 16, 3); P(20, gnd - 42, C.glow, 3, 1);
      rustStreak(14, gnd - 38, 12); rustStreak(60, gnd - 26, 14);
      P(4, gnd - 8, C.ash, 5, 5); P(28, gnd - 6, C.rust, 4, 3);
    } else if (type === 'house' || type === 'cabin') {
      const w = type === 'cabin' ? 56 : 62, wall = type === 'cabin' ? C.wood : (pal ? C.ash : '#4a3a30');
      const wallH = type === 'cabin' ? C.woodH : (pal ? C.ashH : '#6a5440'), wallL = type === 'cabin' ? C.woodL : C.char;
      P(4, gnd - 1, C.char, w, 1);
      box3(4, gnd - 24, w, 23, wall, wallH, wallL);
      if (type === 'cabin') { for (let i = 0; i < 10; i++) P(5, gnd - 4 - i * 2, C.woodL, w - 2, 1); }
      for (let i = 0; i < (w / 2 | 0) + 4; i++) {
        const yy = gnd - 24 - (i < w / 4 ? i : ((w / 2 | 0) + 3 - i));
        if (yy < 2) continue;
        P(2 + i * 2, yy, dmg === 2 && i > 18 ? C.char : C.rustL, 4, 3);
        P(3 + i * 2, yy, C.rust, 2, 2);
      }
      if (dmg === 2) { P(w - 10, gnd - 28, C.char, 12, 8); P(w - 8, gnd - 22, wallL, 8, 6); }
      P(10, gnd - 14, C.char, 8, 12); P(12, gnd - 12, wallL, 4, 8);
      windw(24, gnd - 16, 8, 7, dmg !== 1, 0);
      if (type === 'house') windw(40, gnd - 16, 8, 7, 1, 0);
      P(w - 8, gnd - 36, wallL, 5, 10); P(w - 7, gnd - 38, C.char, 3, 3); P(w - 6, gnd - 40, C.ash, 1, 3);
      P(8, gnd - 6, C.moss, 10, 4); P(w - 14, gnd - 8, C.mossH, 8, 5);
    } else if (type === 'hospital') {
      P(4, gnd - 1, C.char, 88, 1);
      box3(4, gnd - 36, 88, 35, pal ? '#4a4440' : '#4a3e3a', '#6a6058', C.char);
      box3(20, gnd - 48, 40, 12, pal ? '#4a4440' : '#4a3e3a', '#6a6058', C.char);
      P(36, gnd - 46, '#efe6d0', 10, 10); P(38, gnd - 44, C.cross, 6, 6); P(40, gnd - 48, C.cross, 2, 10); P(36, gnd - 42, C.cross, 10, 2);
      for (let r = 0; r < 3; r++) for (let c0 = 0; c0 < 8; c0++) windw(8 + c0 * 10, gnd - 14 - r * 10, 6, 6, (c0 + r + dmg) % 3 !== 0, (c0 + r) % 7 === 0);
      P(2, gnd - 16, C.ash, 14, 6); P(4, gnd - 20, C.ashH, 10, 4);
      P(70, gnd - 12, C.char, 8, 11);
      if (dmg) { P(80, gnd - 30, C.char, 10, 12); P(82, gnd - 18, C.ash, 8, 8); }
      rustStreak(16, gnd - 34, 16); rustStreak(60, gnd - 40, 20);
    } else if (type === 'diner') {
      P(4, gnd - 1, C.char, 76, 1);
      box3(4, gnd - 22, 76, 20, '#5a3030', '#7a4848', '#3a1818');
      box3(8, gnd - 30, 50, 8, '#d0d4d8', '#f0f2f4', '#6a7074');
      for (let i = 0; i < 5; i++) windw(8 + i * 10, gnd - 18, 8, 8, (i + dmg) % 2, 0);
      P(62, gnd - 16, C.char, 8, 12);
      P(20, gnd - 36, C.char, 4, 8); P(16, gnd - 40, '#7a1818', 36, 8);
      P(18, gnd - 38, dmg ? C.ashH : C.glow, 8, 4); P(32, gnd - 38, '#ffe0a0', 14, 4);
      rustStreak(12, gnd - 22, 10); P(70, gnd - 8, C.moss, 6, 5);
    } else if (type === 'church') {
      P(8, gnd - 1, C.char, 44, 1);
      box3(8, gnd - 28, 44, 27, pal ? C.ash : '#4a443c', pal ? C.ashH : '#6a6458', C.char);
      P(24, gnd - 50, pal ? C.ash : '#4a443c', 12, 22); P(22, gnd - 52, pal ? C.ashH : '#6a6458', 16, 4);
      for (let y = 0; y < 10; y++) P(26 + (y >> 1), gnd - 52 - y, C.char, 8 - y, 1);
      P(29, gnd - 64, C.bone, 2, 5); P(27, gnd - 62, C.bone, 6, 2);
      if (dmg === 2) P(30, gnd - 58, C.char, 4, 6);
      P(26, gnd - 16, C.char, 8, 14); P(28, gnd - 14, C.woodL, 4, 10);
      P(16, gnd - 24, C.glass, 8, 10); P(18, gnd - 22, '#3a2018', 4, 6); P(19, gnd - 20, dmg ? C.char : '#6a2010', 2, 4);
      P(36, gnd - 22, C.glass, 6, 6);
      rustStreak(12, gnd - 26, 12);
    } else if (type === 'watertower') {
      P(8, gnd - 1, C.char, 20, 1);
      P(8, gnd - 32, C.metalL, 3, 31); P(24, gnd - 32, C.metalL, 3, 31);
      P(10, gnd - 24, C.metal, 16, 2); P(10, gnd - 16, C.metal, 16, 2); P(10, gnd - 8, C.metal, 16, 2);
      box3(4, gnd - 48, 28, 18, C.rust, C.rustH, C.rustL);
      P(6, gnd - 50, C.metal, 24, 3); P(16, gnd - 54, C.metalL, 3, 4);
      rustStreak(8, gnd - 46, 14); rustStreak(22, gnd - 44, 16);
      P(10, gnd - 40, C.rustH, 4, 1);
    } else if (type === 'billboard') {
      P(10, gnd - 1, C.char, 4, 1); P(56, gnd - 1, C.char, 4, 1);
      P(10, gnd - 24, C.metalL, 3, 23); P(56, gnd - 24, C.metalL, 3, 23);
      if (dmg === 2) P(56, gnd - 20, C.metal, 2, 10);
      box3(4, gnd - 40, 64, 20, '#3a342c', '#5a5248', C.char);
      P(8, gnd - 36, dmg ? '#4a3020' : '#4a2030', 24, 12);
      P(34, gnd - 34, '#2a3a28', 26, 10);
      if (dmg) { P(20, gnd - 38, C.char, 10, 8); P(40, gnd - 28, '#3a342c', 16, 4); }
      P(6, gnd - 22, C.metal, 4, 8);
    } else if (type === 'boulder') {
      P(2, gnd - 1, C.char, 22, 1);
      P(3, gnd - 8, '#3a342c', 20, 8); P(6, gnd - 13, '#4a443c', 14, 7); P(9, gnd - 16, '#5a544a', 8, 4);
      P(4, gnd - 10, '#6a6458', 6, 3); P(3, gnd - 8, C.char, 2, 7); P(20, gnd - 7, '#2a2420', 3, 6);
      P(12, gnd - 11, C.char, 1, 5); P(8, gnd - 6, C.moss, 5, 3);
    } else if (type === 'skeleton' || type === 'bones') {
      const b = C.bone, bh = C.boneH;
      if (type === 'bones') {
        P(2, gnd - 3, b, 8, 2); P(10, gnd - 5, b, 10, 3); P(6, gnd - 8, bh, 6, 5); P(7, gnd - 10, b, 5, 3);
        P(8, gnd - 9, C.ink); P(10, gnd - 9, C.ink); P(18, gnd - 4, b, 5, 2); P(4, gnd - 6, b, 2, 4);
      } else {
        P(2, gnd - 6, b, 6, 5); P(3, gnd - 7, bh, 4, 2); P(3, gnd - 5, C.ink); P(5, gnd - 5, C.ink); P(4, gnd - 3, C.ink, 2, 1);
        P(8, gnd - 4, b, 12, 2); P(9, gnd - 6, b, 1, 3); P(11, gnd - 7, b); P(13, gnd - 6, b); P(15, gnd - 5, b);
        P(8, gnd - 3, b, 3, 2); P(18, gnd - 3, b, 8, 2); P(22, gnd - 5, b, 2, 3);
      }
    } else if (type === 'rubble') {
      P(1, gnd - 1, C.char, 26, 1);
      P(2, gnd - 5, C.ash, 16, 4); P(6, gnd - 9, '#4a403a', 12, 5); P(10, gnd - 13, C.rust, 8, 5);
      P(1, gnd - 4, C.char, 5, 3); P(18, gnd - 7, C.wood, 8, 3); P(20, gnd - 8, C.woodH, 6, 1);
      P(14, gnd - 6, C.bone, 3, 2); P(4, gnd - 8, C.metal, 4, 2); P(22, gnd - 5, '#5a4030', 5, 4);
    } else if (type === 'debris') {
      P(1, gnd - 3, C.rust, 7, 2); P(6, gnd - 6, C.ash, 5, 5); P(10, gnd - 3, C.char, 5, 2); P(4, gnd - 4, C.metalH, 3, 1);
    } else if (type === 'deadtree') {
      P(9, 4, C.char, 3, gnd - 6); P(8, 6, C.woodL, 2, gnd - 10); P(8, gnd - 4, C.char, 6, 4);
      P(3, 8, C.char, 7, 2); P(2, 7, C.char, 2, 8); P(12, 12, C.char, 8, 2); P(18, 11, C.char, 2, 8);
      P(7, 18, C.char, 2, 8); P(4, 16, C.char, 6, 1); if (dmg) P(10, 5, '#3a2a22', 2, 5);
    } else if (type === 'sign') {
      P(8, 6, C.rust, 2, gnd - 7); P(2, 2, C.wood, 14, 10); P(3, 3, C.woodH, 12, 1); P(3, 4, C.rustL, 12, 7);
      P(5, 6, C.char, 8, 3); P(10, 10, C.rust, 2, 3);
    } else if (type === 'barrel') {
      box3(1, gnd - 13, 10, 12, C.rust, C.rustH, C.rustL);
      P(1, gnd - 13, C.metal, 10, 1); P(1, gnd - 8, C.metal, 10, 1); P(1, gnd - 3, C.metal, 10, 1);
      P(3, gnd - 11, C.char, 6, 2); if (dmg === 2) P(8, gnd - 6, C.rustL, 4, 4);
    } else if (type === 'mailbox') {
      P(6, gnd - 12, C.woodL, 2, 11); P(5, gnd - 13, C.wood, 4, 2);
      box3(2, gnd - 18, 10, 7, dmg ? C.ash : '#4a3a28', C.sand, C.char);
      P(3, gnd - 16, C.char, 5, 3); P(11, gnd - 17, dmg ? C.ashH : C.cross, 2, 4);
    } else if (type === 'stump') {
      box3(2, gnd - 8, 10, 8, C.wood, C.woodH, C.woodL);
      P(3, gnd - 8, '#6a5440', 8, 2); P(4, gnd - 7, '#8a7460', 6, 1); P(5, gnd - 7, C.woodL, 4, 1);
      P(1, gnd - 3, C.woodL, 3, 3); P(10, gnd - 4, C.moss, 4, 3);
    } else if (type === 'log') {
      box3(1, gnd - 6, 26, 5, C.wood, C.woodH, C.woodL);
      P(0, gnd - 5, '#24180e', 2, 4); P(25, gnd - 5, '#5a4630', 2, 3); P(8, gnd - 7, C.moss, 6, 2);
    } else if (type === 'bush') {
      for (let i = 0; i < 14; i++) P(1 + i, gnd - (4 + (i * 3 + v0) % 6), (i + v0) % 2 ? C.moss : C.mossH, 1, 4 + (i % 3));
    } else if (type === 'fence') {
      for (let i = 0; i < 4; i++) { const xx = 2 + i * 10; P(xx, gnd - 14, C.wood, 2, 13); P(xx, gnd - 14, C.woodH, 2, 1); }
      P(1, gnd - 11, C.woodH, 37, 2); P(1, gnd - 6, C.wood, 37, 2);
      if (dmg) { P(20, gnd - 12, C.char, 8, 2); P(22, gnd - 8, C.woodL, 2, 6); }
    } else if (type === 'pole') {
      P(16, 2, C.woodL, 3, gnd - 3); P(16, 2, C.woodH, 1, gnd - 3);
      P(8, 6, C.wood, 20, 2); P(8, 5, C.metal, 2, 3); P(26, 5, C.metal, 2, 3);
      P(18, 10, C.metalL, 5, 6); P(19, 11, C.rust, 3, 3);
      for (let i = 0; i < 30; i++) P(0 + i, 7 + ((i * i) % 5 === 0 ? 1 : 0), C.char);
      for (let i = 0; i < 10; i++) P(28 + i, 7 + (i % 3), C.char);
    } else if (type === 'minecart') {
      P(1, gnd - 2, C.metalL, 26, 1); P(2, gnd - 3, C.char, 24, 1);
      box3(3, gnd - 14, 22, 10, C.rust, C.rustH, C.rustL);
      P(4, gnd - 12, C.char, 8, 5); P(14, gnd - 11, C.ash, 8, 4);
      wheel(8, gnd - 4, 3, 0); wheel(20, gnd - 4, 3, dmg === 2);
      P(2, gnd - 16, C.metal, 3, 4); P(23, gnd - 16, C.metal, 3, 4);
      if (dmg) { P(18, gnd - 18, C.rust, 8, 5); P(20, gnd - 16, C.ash, 6, 4); }
    } else if (type === 'lantern') {
      P(5, gnd - 8, C.woodL, 2, 8); P(3, gnd - 18, C.metal, 6, 10);
      P(4, gnd - 16, '#c06020', 4, 6); P(5, gnd - 15, '#ffe080', 2, 4);
      P(3, gnd - 19, C.metalH, 6, 2); P(4, gnd - 21, C.metal, 4, 2);
    } else if (type === 'crystal') {
      P(4, gnd - 14, '#6a2aa0', 4, 12); P(5, gnd - 18, '#c070ff', 3, 8); P(6, gnd - 20, '#e8c0ff', 1, 6);
      P(8, gnd - 10, '#20708a', 3, 8); P(9, gnd - 12, '#60d8ff', 2, 6);
      P(2, gnd - 8, '#4a2060', 3, 6); P(3, gnd - 4, C.ash, 10, 3);
    } else if (type === 'cavein') {
      P(2, gnd - 1, C.char, 40, 1);
      P(2, gnd - 10, '#3a3028', 18, 10); P(12, gnd - 18, '#4a4036', 16, 12); P(22, gnd - 14, '#2a2420', 18, 13);
      P(8, gnd - 22, '#5a5046', 12, 8); P(28, gnd - 24, '#3a342c', 10, 10);
      P(6, gnd - 12, '#6a6458', 5, 4); P(20, gnd - 8, C.woodL, 3, 8); P(32, gnd - 10, C.wood, 3, 6);
      P(4, gnd - 6, C.moss, 6, 3);
    } else if (type === 'stalactite') {
      for (let y = 0; y < 24; y++) {
        const ww = Math.max(1, Math.round(8 * (1 - y / 24)));
        P(7 - (ww >> 1), pad + y, y < 4 ? '#3a3028' : (y < 12 ? '#2a2420' : '#1a1612'), ww, 1);
        if (ww > 2) P(7 - (ww >> 1), pad + y, '#4a4036', 1, 1);
      }
      P(6, pad + 22, '#5aa8c8');
    } else {
      P(1, gnd - 3, C.ash, 8, 3);
    }
    inkOutline(c);
    if (type === 'lantern' || type === 'crystal') {
      const gx = type === 'lantern' ? o + 6 : o + 7, gy = type === 'lantern' ? gnd - 14 : gnd - 12;
      const col = type === 'lantern' ? 'rgba(255,160,40,0.35)' : 'rgba(180,80,255,0.35)';
      const grd = x.createRadialGradient(gx, gy, 1, gx, gy, 10);
      grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grd; x.fillRect(gx - 10, gy - 10, 20, 20);
    }
    return (propCache[key] = c);
  }
  function seedProps(s) {
    if (!s.props) s.props = [];
    if (s.nextProp == null) s.nextProp = s.scroll + 40;
    if (!s.propCool) s.propCool = {};
    if (!s.recentProps) s.recentProps = [];
    let guard = 0;
    while (s.nextProp < s.scroll + W + 110 && guard++ < 10) {
      const recentSet = s.props.some(p => PROP[p.k] && PROP[p.k].set && p.wx > s.scroll - 80);
      const type = pickPropType(s, recentSet);
      const meta = PROP[type] || PROP.debris;
      let par = 1;
      if (meta.hang || meta.mid || (meta.set && Math.random() < 0.7)) par = 0.5 + Math.random() * 0.12;
      else if (meta.fg || Math.random() < 0.12) par = 1.12;
      else if ((type === 'deadtree' || type === 'pole' || type === 'sign') && Math.random() < 0.35) par = 0.55;
      const gap = (meta.rare || meta.set ? 140 : 28) + ((Math.random() * (meta.rare || meta.set ? 220 : 90)) | 0);
      const sc = meta.set || meta.hang ? (0.9 + Math.random() * 0.14) : (0.85 + Math.random() * 0.28);
      const p0 = { k: type, wx: s.nextProp, v: (Math.random() * 6) | 0, par, w: meta.w, h: meta.h, hop: !!meta.hop, dig: !!meta.dig, hang: !!meta.hang, glow: !!meta.glow, flip: Math.random() < 0.5, sc, yOff: meta.hang ? 0 : (par < 0.9 ? -2 : 0) };
      s.props.push(p0);
      for (const ck in s.propCool) if (s.propCool[ck] > 0) s.propCool[ck]--;
      s.propCool[type] = meta.cool || (meta.rare || meta.set ? 8 : 3);
      s.recentProps.push(type); if (s.recentProps.length > 8) s.recentProps.shift();
      s.nextProp += Math.round((meta.w * sc) + gap);
    }
    s.props = s.props.filter(p => p.wx - s.scroll * (p.par || 1) > -120);
    if (s.props.length > 22) s.props = s.props.slice(-22);
  }
  function addProp(s, type, opts) {
    opts = opts || {};
    const meta = PROP[type] || PROP.debris;
    const p0 = { k: type, wx: opts.wx != null ? opts.wx : s.scroll + (opts.x != null ? opts.x : W - 10), v: opts.v || 0, par: opts.par || (meta.hang || meta.mid ? 0.55 : 1), w: meta.w, h: meta.h, hop: !!meta.hop, dig: !!meta.dig, hang: !!meta.hang, glow: !!meta.glow, flip: !!opts.flip, sc: opts.sc || 1, yOff: meta.hang ? 0 : 0 };
    if (!s.props) s.props = [];
    s.props.push(p0);
    return p0;
  }
  function propScreenX(p, scroll, a, step) {
    return p.wx - (scroll + (a || 0) * (step || 0)) * (p.par || 1);
  }
  function propDrawSize(p) {
    const sc = p.sc || 1;
    return { dw: Math.round(p.w * sc), dh: Math.round(p.h * sc) };
  }
  function drawProps(ctx, scroll, a, step, layer) {
    if (!st || !st.props) return;
    const ground = (ctx === bg && BH) ? BH - 8 : H - 8;
    for (const p of st.props) {
      const fg = (p.par || 1) > 1.05;
      const mid = (p.par || 1) < 0.9;
      if (layer === 'fg' && !fg) continue;
      if (layer === 'mid' && !mid) continue;
      if (layer === 'ground' && (fg || mid)) continue;
      const c = paintProp(p.k, p.v);
      const x = Math.round(propScreenX(p, scroll, a, step));
      const { dw, dh } = propDrawSize(p);
      const pad = c._pad || 0;
      if (x + dw < -6 || x > W + 6) continue;
      const y = p.hang ? (p.yOff || 0) : (ground - dh + (p.hopY || 0) + (p.yOff || 0));
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      if (p.flip) { ctx.translate(x + dw, 0); ctx.scale(-1, 1); ctx.drawImage(c, -pad, y - pad, dw + pad * 2, dh + pad * 2); }
      else ctx.drawImage(c, x - pad, y - pad, dw + pad * 2, dh + pad * 2);
      ctx.restore();
    }
  }
  function startHop(s, prop) {
    s.mode = 'hop'; s.hopT = 0; s.hopOf = prop; s.hopY = 0; s.loco = 'climb'; s.pose = '';
    if (prop) prop.used = 1;
    beginTurn(s, 'side');
  }
  function startDig(s, prop) {
    s.mode = 'dig'; s.digT = 0; s.digOf = prop; s.loco = 'dig'; s.pose = ''; s.toast = null;
    if (prop) prop.looted = 1;
    beginTurn(s, 'side');
  }
  function tryFieldEvents(s) {
    if (s.mode !== 'run' || s.forceLoco) return;
    if (s.npc && s.npc.mode === 'approach' && s.npc.x < s.heroX + 90) return;
    if (living(s).some(m => m.x < s.heroX + 150)) return;
    const plant = s.heroX + 28;
    for (const p of (s.props || [])) {
      if (p.used || p.looted || p.hang) continue;
      if ((p.par || 1) < 0.9 || (p.par || 1) > 1.05) continue;
      const sx = propScreenX(p, s.scroll, 0, 0);
      const { dw } = propDrawSize(p);
      if (p.hop && !p.used && sx < plant + 14 && sx + dw > plant + 2) { startHop(s, p); return; }
      if (p.dig && !p.looted && (s.digCd || 0) <= 0 && sx < plant + 12 && sx + dw > plant && (s.forceDig || Math.random() < 0.34)) {
        s.forceDig = false;
        startDig(s, p);
        return;
      }
    }
  }

  // ---------- wanderer NPC ----------
  const GREETINGS = [
    'Good day to you.',
    'Nice day for a fallout.',
    'Stay safe out there.',
    'Watch the roads.',
    'Seen any gas?',
    "Don't drink the rust water.",
    'War never ended, huh.',
    'Keep that scrap close.',
    "Bats're worse after dark.",
    'You lookin for parts too?',
    "Sky's a little too red today.",
    'If you find ammo, share.',
    "Town's gone. Keep walkin.",
    'Nice hat, stranger.',
    'May your tires hold.',
    'Heard a lich up north.',
    'Rad-free greetings, friend.'
  ];
  const CLS_GREET = {
    warrior: ['Happy hunting.', 'Steel holds, friend.', 'Save me a swing.', 'The road still needs a blade.', 'Keep your guard up.'],
    shooter: ['Happy hunting.', 'Keep your powder dry.', 'Heard shots west of here.', "Ammo's worth more than gold.", 'Watch the ridgeline.'],
    mage: ['Happy hunting.', 'Walk lightly, the warp is thin.', 'The ash speaks today.', 'Mind the storms.', 'A spark to you, traveler.']
  };
  const NPC_PALS = [
    { coat: '#4a3020', hi: '#6a4a30', hat: '#3a2a18' },
    { coat: '#3a2a48', hi: '#5a4a68', hat: '#2a1a28' },
    { coat: '#3a4a28', hi: '#5a6a38', hat: '#2a3a18' },
    { coat: '#4a2a28', hi: '#6a4840', hat: '#2a1614' },
    { coat: '#2a2a32', hi: '#4a4a58', hat: '#1a1a22' },
    { coat: '#4a3a22', hi: '#6a5830', hat: '#3a2a14' }
  ];
  const NPC_BUILDS = ['short', 'avg', 'tall', 'stocky'];
  const NPC_HEADS = ['hood', 'mask', 'hat', 'wrap', 'none'];
  function wandererEq(cls) {
    const starter = {
      warrior: { weapon: 'wep-blade', armor: 'arm-iron', helm: 'helm-iron' },
      shooter: { weapon: 'wep-rifle', armor: 'sh-arm-flak', helm: 'sh-helm-flak', cape: 'sh-cape-coat' },
      mage: { weapon: 'mg-wep-stick', armor: 'mg-arm-grey', helm: 'mg-helm-hood', cape: 'mg-cape-grey' }
    };
    let saved = {};
    try { if (typeof classEquipped === 'function') saved = classEquipped(cls) || {}; } catch (e) {}
    return Object.assign({ _cls: cls }, starter[cls] || {}, saved);
  }
  const npcCache = {};
  function paintHaul(P, kind, ox, gnd) {
    if (kind === 'cart') {
      P(ox + 2, gnd - 5, '#2a2a2c', 5, 5); P(ox + 15, gnd - 5, '#2a2a2c', 5, 5);
      P(ox + 3, gnd - 4, '#7a7a80', 3, 3); P(ox + 16, gnd - 4, '#7a7a80', 3, 3);
      P(ox + 1, gnd - 16, '#6a6a72', 21, 2);
      P(ox + 1, gnd - 24, '#6a6a72', 21, 1);
      P(ox + 1, gnd - 24, '#5a5a62', 1, 10); P(ox + 21, gnd - 24, '#5a5a62', 1, 10);
      P(ox + 7, gnd - 23, '#4a4a52', 1, 8); P(ox + 14, gnd - 23, '#4a4a52', 1, 8);
      P(ox + 3, gnd - 20, '#8a5a20', 5, 4); P(ox + 10, gnd - 22, '#5a3a30', 6, 6);
      P(ox + 9, gnd - 26, '#4a6a8a', 3, 4); P(ox + 16, gnd - 19, '#6a4020', 4, 3);
      P(ox + 22, gnd - 24, '#5a5a62', 7, 1); P(ox + 28, gnd - 24, '#5a5a62', 1, 12);
    } else if (kind === 'wagon') {
      P(ox + 4, gnd - 7, '#2a1a10', 6, 6); P(ox + 22, gnd - 7, '#2a1a10', 6, 6);
      P(ox + 5, gnd - 6, '#6a4a28', 4, 4); P(ox + 23, gnd - 6, '#6a4a28', 4, 4);
      P(ox + 3, gnd - 16, '#5a3a20', 26, 10);
      P(ox + 4, gnd - 15, '#7a5a30', 24, 3);
      P(ox + 6, gnd - 22, '#6a3a20', 6, 6); P(ox + 13, gnd - 26, '#4a4a48', 8, 10);
      P(ox + 20, gnd - 21, '#8a5a28', 7, 5); P(ox + 16, gnd - 28, '#3a5a2a', 4, 4);
      P(ox + 11, gnd - 18, '#c8b070', 3, 2);
      P(ox, gnd - 12, '#4a2a14', 8, 2);
    }
  }
  function paintNpc(look, wave, frame) {
    look = look || {};
    const pal = look.pal | 0, build = look.build || 'avg', head = look.head || 'hat';
    const packed = !!look.pack, haul = look.haul || '';
    const key = [pal, build, head, packed ? 1 : 0, haul, wave ? 'w' : 's', frame & 3].join('|');
    if (npcCache[key]) return npcCache[key];
    const wide = haul === 'cart' || haul === 'wagon';
    const c = mkc(wide ? 64 : 28, 48), x = c.getContext('2d'), gnd = 47;
    const P = (xx, yy, col, w, h) => px(x, xx, yy, col, w, h);
    const pal0 = NPC_PALS[((pal % NPC_PALS.length) + NPC_PALS.length) % NPC_PALS.length];
    const coat = pal0.coat, coatH = pal0.hi, hat = pal0.hat, skin = '#c8a070', boot = '#2a1a12';
    const shortB = build === 'short', tallB = build === 'tall', stock = build === 'stocky';
    const bodyH = tallB ? 14 : shortB ? 8 : 10;
    const torsoH = tallB ? 13 : shortB ? 9 : 11;
    const legH = tallB ? 10 : shortB ? 5 : stock ? 6 : 8;
    const bw = stock ? 13 : tallB ? 9 : 10;
    const ox = haul === 'cart' ? 30 : haul === 'wagon' ? 6 : 2;
    const liftL = wave ? 0 : ((frame & 2) ? 2 : 0), liftR = wave ? 0 : ((frame & 2) ? 0 : 2);
    if (haul === 'cart') paintHaul(P, 'cart', 1, gnd);
    P(ox + 7, gnd - legH + liftL, boot, stock ? 5 : 4, legH);
    P(ox + 7 + Math.max(5, bw - 5), gnd - legH + liftR, boot, stock ? 5 : 4, legH);
    P(ox + 6, gnd - legH - bodyH, coat, bw, bodyH); P(ox + 7, gnd - legH - bodyH, coatH, 2, bodyH);
    P(ox + 5, gnd - legH - bodyH - torsoH, coat, bw + 2, torsoH); P(ox + 6, gnd - legH - bodyH - torsoH + 1, coatH, 3, torsoH - 3);
    if (packed) {
      P(ox + 5 + bw, gnd - legH - bodyH - torsoH + 3, '#3a2a1a', 6, 9);
      P(ox + 6 + bw, gnd - legH - bodyH - torsoH + 4, '#5a3a22', 4, 6);
      P(ox + 6 + bw, gnd - legH - bodyH - torsoH + 2, '#2a1a10', 4, 2);
    }
    const armY = gnd - legH - bodyH - Math.floor(torsoH * 0.45);
    if (wave) { P(ox + 1, armY - 6, coat, 5, 4); P(ox, armY - 10, skin, 4, 5); P(ox - 1, armY - 12, skin, 3, 3); }
    else { P(ox + 3, armY, coat, 3, 8); P(ox + 2, armY + 6, skin, 3, 3); }
    const hx = ox + 8, hy = gnd - legH - bodyH - torsoH - 6;
    P(hx, hy, skin, 6, 6); P(hx + 1, hy + 1, '#d8b080', 4, 3); P(hx + 2, hy + 3, '#3a2010'); P(hx + 4, hy + 3, '#3a2010');
    if (head === 'hood') {
      P(hx - 1, hy - 4, hat, 8, 6); P(hx - 2, hy, hat, 10, 4); P(hx - 1, hy + 3, hat, 2, 4); P(hx + 6, hy + 3, hat, 2, 4);
    } else if (head === 'mask') {
      P(hx - 1, hy - 2, '#2a2a28', 8, 3); P(hx, hy + 1, '#3a3a38', 6, 4);
      P(hx + 1, hy + 2, '#7a9088', 2, 2); P(hx + 4, hy + 2, '#7a9088', 2, 2);
      P(hx + 1, hy + 4, '#4a4a48', 5, 3); P(hx, hy + 6, '#3a3a38', 3, 3);
    } else if (head === 'wrap') {
      P(hx - 1, hy - 3, hat, 8, 3); P(hx, hy + 3, '#d8c8a0', 6, 3); P(hx - 1, hy + 2, '#c8b890', 8, 2);
    } else if (head === 'none') {
      P(hx, hy - 2, '#3a2010', 6, 3); P(hx + 5, hy - 3, '#3a2010', 2, 3);
    } else {
      P(hx - 2, hy - 4, hat, 10, 4); P(hx - 3, hy - 3, hat, 12, 2); P(hx + 1, hy - 6, hat, 4, 3);
    }
    if (!packed && !haul) { P(ox + 14, gnd - legH - bodyH - 4, '#5a3a20', 2, 14); P(ox + 13, gnd - 8, '#4a2a18', 3, 2); }
    if (haul === 'wagon') paintHaul(P, 'wagon', ox + bw + 8, gnd);
    inkOutline(c);
    c._plant = ox + 8;
    c._headY = hy;
    return (npcCache[key] = c);
  }
  function otherClasses(heroCls) {
    return ['warrior', 'shooter', 'mage'].filter(c => c !== (heroCls || clsNow()));
  }
  function spawnNpc(s, opts) {
    opts = opts || {};
    const heroCls = clsNow();
    const others = otherClasses(heroCls);
    let kind = opts.kind, cls = opts.cls || null;
    if (!kind && cls) kind = 'cls';
    if (!kind && !opts.look) {
      if (opts.forceCls || (!opts.noClass && Math.random() < 0.28)) { kind = 'cls'; cls = cls || others[(Math.random() * others.length) | 0] || 'mage'; }
      else kind = 'wanderer';
    }
    kind = kind || 'wanderer';
    const linePool = (kind === 'cls' && CLS_GREET[cls]) ? CLS_GREET[cls] : GREETINGS;
    s.npc = {
      x: opts.x != null ? opts.x : W + 10,
      mode: 'approach',
      t: 0,
      gaitF: 0,
      wave: 0,
      kind,
      cls: kind === 'cls' ? cls : null,
      pal: opts.pal != null ? opts.pal : ((Math.random() * NPC_PALS.length) | 0),
      build: opts.build || NPC_BUILDS[(Math.random() * NPC_BUILDS.length) | 0],
      head: opts.head || NPC_HEADS[(Math.random() * NPC_HEADS.length) | 0],
      pack: opts.pack != null ? !!opts.pack : Math.random() < 0.58,
      haul: opts.haul != null ? opts.haul : (kind === 'cls' ? null : (Math.random() < 0.22 ? (Math.random() < 0.5 ? 'cart' : 'wagon') : null)),
      line: opts.line || linePool[(Math.random() * linePool.length) | 0]
    };
    return s.npc;
  }
  function tickNpc(s) {
    if (s.npcCd > 0) s.npcCd--;
    if (!s.npc) {
      if (s.mode === 'run' && s.npcCd <= 0 && !s.forceLoco && !s.noDeath) {
        if (s.forceNpc || Math.random() < 0.035) {
          if (!living(s).some(m => m.x < s.heroX + 170)) spawnNpc(s);
          else if (!s.forceNpc) s.npcCd = 24;
        }
      }
      return;
    }
    const n = s.npc;
    n.t++;
    if (s.mode === 'fight' || s.mode === 'death') {
      n.mode = 'leave';
    }
    if (n.mode === 'approach') {
      n.gaitF++;
      n.x -= n.haul ? 1.5 : 2;
      if (n.x <= s.heroX + 50) {
        if (s.mode !== 'run' || living(s).some(m => m.x < s.heroX + 150)) n.mode = 'leave';
        else {
          n.mode = 'wave'; n.t = 0; n.wave = 0;
          s.mode = 'greet'; s.greetT = 0; s.loco = 'idle'; s.pose = '';
          beginTurn(s, 'side');
        }
      }
    } else if (n.mode === 'wave') {
      n.wave++; s.greetT = (s.greetT || 0) + 1;
      if (n.wave >= 30) { n.mode = 'leave'; n.t = 0; if (s.mode === 'greet') goRun(s, true); }
    } else {
      n.gaitF++;
      n.x -= 2.5;
    }
    if (n.x < (n.haul || n.kind === 'cls' ? -80 : -36)) { s.npc = null; s.npcCd = 380 + ((Math.random() * 260) | 0); s.forceNpc = false; }
  }
  function drawNpc(ctx, s, a) {
    if (!s.npc) return;
    const n = s.npc;
    const frame = ((n.gaitF || 0) + (a || 0)) | 0;
    ctx.imageSmoothingEnabled = false;
    if (n.kind === 'cls' && n.cls && P().heroCanvasSide) {
      const eq = wandererEq(n.cls);
      const loco = n.mode === 'wave' ? 'idle' : 'walk';
      const c = P().heroCanvasSide(eq, 0, null, loco, frame);
      const ax = c._ax != null ? c._ax : (c.width / 2);
      const plant = Math.round(n.x + 16);
      const y = HERO_Y;
      ctx.save();
      ctx.translate(plant, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(c, -ax, y);
      ctx.restore();
      if (n.mode === 'wave' && n.line) drawBubble(ctx, plant - 6, y + 8, n.line);
      return;
    }
    const c = paintNpc(n, n.mode === 'wave', frame);
    const plant = c._plant || 12;
    const x = Math.round(n.x - plant + 8), y = H - 8 - c.height + 2;
    ctx.drawImage(c, x, y);
    if (n.mode === 'wave' && n.line) drawBubble(ctx, x + plant, y + (c._headY || 8), n.line);
  }
  function drawWaveArm(ctx, plant, hy, t) {
    const up = Math.round(Math.sin(t * 0.8) * 2);
    const x = Math.round(plant + 8), y = Math.round(hy + 16 + up);
    ctx.fillStyle = '#0c0705'; ctx.fillRect(x - 1, y - 8, 4, 12);
    ctx.fillStyle = '#c8a070'; ctx.fillRect(x, y - 7, 2, 10);
    ctx.fillStyle = '#d8b080'; ctx.fillRect(x, y - 8, 3, 3);
  }

  // ---------- death / Valeria spirit ----------
  const DEATH_LINES = [
    'Do you want to live forever?',
    'Get up, wanderer.',
    'It is not your time.',
    'The grave can wait.',
    'Rise. The road is not finished.'
  ];
  let spiritCan = null;
  function paintSpirit() {
    if (spiritCan) return spiritCan;
    const c = mkc(28, 48), x = c.getContext('2d'), gnd = 46;
    const P = (xx, yy, col, w, h) => px(x, xx, yy, col, w, h);
    P(10, 18, '#d8c890', 10, 16); P(11, 17, '#f0e8c0', 8, 4);
    P(8, 20, '#e8dcb0', 4, 12); P(18, 22, '#e8dcb0', 6, 14);
    P(11, 32, '#c8b878', 3, 12); P(16, 32, '#c8b878', 3, 12);
    P(11, 8, '#f8e0a0', 8, 10); P(12, 9, '#fff6d0', 6, 6); P(13, 11, '#3a2010'); P(16, 11, '#3a2010');
    P(10, 6, '#f0d878', 10, 5); P(8, 8, '#f0d878', 4, 8); P(18, 7, '#f8e8a0', 5, 10);
    P(20, 16, '#e8d070', 2, 16); P(19, 14, '#fff0b0', 3, 3);
    P(6, 16, 'rgba(255,230,160,0.0)', 1, 1);
    inkOutline(c);
    const grd = x.createRadialGradient(14, 22, 2, 14, 22, 20);
    grd.addColorStop(0, 'rgba(255,230,140,0.28)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = grd; x.fillRect(0, 0, 28, 48);
    x.globalCompositeOperation = 'source-over';
    return (spiritCan = c);
  }
  function startDeath(s, slayer) {
    s.mode = 'death'; s.deathT = 0; s.deathPhase = 'fall'; s.deathAng = 0; s.deathY = 0;
    s.deathLine = DEATH_LINES[(Math.random() * DEATH_LINES.length) | 0];
    s.spiritY = -36; s.spiritA = 0; s.pose = ''; s.seq = null; s.leap = null; s.loco = 'idle';
    s.hp = 0; s.flashH = 5; s.fire = null;
    if (s.npc) { s.npc.mode = 'leave'; s.npc.wave = 0; }
    beginTurn(s, 'side');
    for (const m of allMons(s)) { m.noScore = 1; }
    if (s.fightXp && typeof xpState !== 'undefined' && typeof persistXp === 'function' && s.awardXp !== false) {
      const claw = s.fightXp | 0;
      if (claw && !(s.fightLeveled)) {
        xpState.xp = Math.max(0, xpState.xp - claw);
        if (typeof levelFromXp === 'function') xpState.level = levelFromXp(xpState.xp);
        persistXp();
        if (typeof renderXpBar === 'function') renderXpBar();
      }
    }
    s.fightXp = 0;
  }
  function tickDeath(s) {
    s.deathT++;
    s.loco = 'idle';
    beginTurn(s, 'side');
    const t = s.deathT;
    if (s.deathPhase === 'fall') {
      s.deathAng = Math.min(1, t / 8);
      s.deathY = Math.min(10, t * 1.2);
      if (t >= 8) { s.deathPhase = 'lie'; s.deathT = 0; s.deathAng = 1; s.deathY = 10; }
    } else if (s.deathPhase === 'lie') {
      if (t >= 14) { s.deathPhase = 'spirit'; s.deathT = 0; }
    } else if (s.deathPhase === 'spirit') {
      s.spiritA = Math.min(1, t / 6);
      s.spiritY = -36 + Math.min(40, t * 2.4);
      if (t >= 18) { s.deathPhase = 'speak'; s.deathT = 0; }
    } else if (s.deathPhase === 'speak') {
      s.spiritA = 1; s.spiritY = 4;
      if (t >= 26) { s.deathPhase = 'raise'; s.deathT = 0; }
    } else if (s.deathPhase === 'raise') {
      s.spiritA = Math.max(0, 1 - t / 14);
      s.deathAng = Math.max(0, 1 - t / 12);
      s.deathY = Math.max(0, 10 - t);
      if (t === 1) {
        const S = stats(eqNow(), lvl());
        s.max = S.hp; s.hp = Math.max(1, Math.round(S.hp * 0.4));
      }
      if (t >= 16) {
        s.deathPhase = 'done';
        s.mon = null; s.mons = []; s.spawn = nextGap();
        s.deathCd = 220;
        s.spiritA = 0;
        goRun(s, true);
      }
    }
    for (const mon of allMons(s)) {
      if (!mon.dead) { mon.dead = 1; mon.scored = 1; mon.noScore = 1; }
      else mon.dead++;
    }
  }

  // ---------- battle XP ----------
  function killXp(s, mon) {
    if (mon.boss) return 5 + ((Math.random() * 3) | 0);
    if (mon.elite || mon.leader) return 4 + ((Math.random() * 2) | 0);
    if (s.mons && s.mons.length > 1) return 1;
    return 1 + ((Math.random() * 3) | 0);
  }
  function awardBattleXp(s, mon, amount) {
    if (!amount || !s || s.awardXp === false) return 0;
    addNum((mon && mon.x) || s.heroX + 40, 12, '+' + amount + ' XP', '#b8ff70');
    if (typeof xpState === 'undefined') return 0;
    const oldLevel = xpState.level || 1;
    xpState.xp = (xpState.xp | 0) + amount;
    s.fightXp = (s.fightXp || 0) + amount;
    if (typeof levelFromXp === 'function') xpState.level = levelFromXp(xpState.xp);
    if (typeof persistXp === 'function') persistXp();
    if (typeof renderXpBar === 'function') renderXpBar();
    if (xpState.level > oldLevel) {
      s.fightLeveled = 1;
      if (window.PLLoot && window.PLLoot.awardLevels) window.PLLoot.awardLevels(oldLevel, xpState.level);
      if (typeof playLevelUp === 'function') setTimeout(() => { playLevelUp(); if (typeof showLevelUp === 'function') showLevelUp(xpState.level); }, 200);
    }
    return amount;
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
    if (s.leap) { s.leap.t++; if (s.leap.t >= s.leap.life) s.leap = null; }
    if (s.toast) { s.toast.t++; if (s.toast.t > 16) s.toast = null; }
    if (s.digCd > 0) s.digCd--;
    if (s.deathCd > 0) s.deathCd--;
    if (s.healCd > 0) s.healCd--;
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
    for (const m of allMons(s)) { if (m.hurt) m.hurt--; if (m.flash) m.flash--; if (m.lunge) m.lunge--; tickTurn(m); }
    tickTurn(s);
    const stepFor = loco => loco === 'walk' || loco === 'dig' || loco === 'climb' ? 1 : (loco === 'idle' ? 0 : 2);
    const moving = (step) => {
      step = step || 0;
      if (step) {
        s.scroll += step;
        if (++s.bt >= BIOME_TICKS) { s.bt = 0; s.prevBiome = s.biome; s.biome = (s.biome + 1) % BIOMES.length; s.fade = FADE; }
        if (s.fire) s.fire.x -= step;
      }
      if (s.fire && s.fire.x < -20) s.fire = null;
      seedProps(s);
    };
    const approachMons = (step) => {
      for (const m of living(s)) {
        m.walk++;
        if (m.spawnFace > 0) { m.spawnFace--; if (m.spawnFace <= 0) beginMonTurn(m, 'side'); }
        else if (m.facing === 'front' && !m.turn) beginMonTurn(m, 'side');
        m.x -= step + (MON[m.type] || MON.rat).speed;
      }
    };
    const live = living(s);
    const closest = live.length ? live.reduce((a, b) => a.x < b.x ? a : b) : null;
    if (s.mode === 'run') {
      if (s.coolWalk > 0) s.coolWalk--;
      if (!closest) s.loco = (s.coolWalk || s.forceLoco === 'walk') ? 'walk' : 'run';
      else s.loco = (closest.x - heroFront - engageDist(eq) <= 64) ? 'walk' : 'run';
      if (s.forceLoco) s.loco = s.forceLoco;
      const step = stepFor(heroLoco(s));
      s.gaitF = (s.gaitF || 0) + (heroLoco(s) === 'run' ? 1.5 : 1);
      moving(step);
      beginTurn(s, 'side');
      if (!closest && !allMons(s).some(m => m && m.dead && m.dead <= 7)) { if (--s.spawn <= 0) spawn(); }
      else if (closest) {
        approachMons(step);
        if (closest.x <= heroFront + engageDist(eq)) {
          const kind = atkKind(eq);
          const ranged = kind === 'ranged' || kind === 'bolt';
          s.mode = 'fight'; s.atkT = TURN_N + 1; s.monT = 6; s.seq = null; s.pose = ''; s.fightXp = 0; s.fightLeveled = 0;
          if (ranged && closest.x > heroFront + 40) { s.loco = 'walk'; beginTurn(s, 'side'); for (const m of live) beginMonTurn(m, 'side'); }
          else { s.loco = 'idle'; beginTurn(s, 'front'); for (const m of live) beginMonTurn(m, 'front'); }
        }
      }
      tryFieldEvents(s);
      tickNpc(s);
    } else if (s.mode === 'hop') {
      s.hopT++;
      const life = 12;
      const p = Math.min(1, s.hopT / life);
      s.hopY = -Math.sin(p * Math.PI) * ((s.hopOf && (s.hopOf.h * (s.hopOf.sc || 1))) || 14) - 4;
      s.loco = s.hopT < 3 ? 'climb' : 'hop';
      if (s.forceLoco) s.loco = s.forceLoco;
      s.gaitF = (s.gaitF || 0) + 1.2;
      moving(2);
      beginTurn(s, 'side');
      if (s.hopT >= life) goRun(s, true);
    } else if (s.mode === 'dig') {
      s.digT++;
      s.loco = 'dig';
      s.gaitF = (s.gaitF || 0) + 1;
      beginTurn(s, 'side');
      moving(0);
      if (s.digT < 12 && s.digT % 2 === 0) {
        const pile = s.digOf ? propScreenX(s.digOf, s.scroll, 0, 0) + 8 : s.heroX + 36;
        s.fx.push({ k: 'dirt', x: pile, y: H - 12, vx: 0.6 + Math.random(), vy: -1.4 - Math.random(), t: 0, life: 6 });
      }
      if (s.digT === 13) {
        const pile = s.digOf ? propScreenX(s.digOf, s.scroll, 0, 0) + 8 : s.heroX + 36;
        s.fx.push({ k: 'glint', x: pile, y: H - 16, tx: s.heroX + 22, ty: HERO_Y + 38, t: 0, life: 8 });
        bstats.gold += 1; saveStats();
        addNum(s.heroX + 16, 10, 'SCRAP', '#ffe070');
        s.toast = { msg: 'SCRAP', t: 0 };
      }
      if (s.digT >= 18) { s.digCd = 90; goRun(s, true); }
    } else if (s.mode === 'greet') {
      s.loco = 'idle'; s.gaitF += 0.3;
      beginTurn(s, 'side');
      const scHold = s.scroll;
      moving(0);
      s.scroll = scHold;
      tickNpc(s);
    } else if (s.mode === 'death') {
      moving(0);
      tickDeath(s);
    } else if (s.mode === 'fight') {
      const kind = atkKind(eq);
      const ranged = kind === 'ranged' || kind === 'bolt';
      const m = closest || s.mon;
      for (const mon of allMons(s)) {
        if (mon.dead === 1 && !mon.scored) {
          mon.scored = 1;
          if (!mon.noScore) {
            bstats.kills++; if (mon.elite || mon.boss || mon.leader) bstats.elites++;
            saveStats(); if (killEl) killEl.textContent = '☠ ' + bstats.kills;
            awardBattleXp(s, mon, killXp(s, mon));
          }
        }
        if (mon.dead) mon.dead++;
      }
      if (allMons(s).length && allMons(s).every(mon => mon.dead > 7)) {
        s.mon = null; s.mons = []; s.spawn = nextGap(); s.seq = null; s.pose = ''; s.leap = null;
        if (s.hp < s.max * 0.16 || (s.hp < s.max * 0.32 && (s.healCd || 0) <= 0 && Math.random() < 0.4)) startHeal(); else goRun(s, true);
        return;
      }
      if (!m || (m.dead && !living(s).length)) return;
      const foe = closest || m;
      const dist = foe.x - heroFront;
      const close = heroFront + closeDist();
      const foesRanged = living(s).some(isRangedMon);
      const meleeHero = !ranged;
      const stillClosing = meleeHero && foesRanged && foe.x > close + 8;
      s.dodgeY = 0;
      if (stillClosing) {
        // Warrior charges / weaves in under fire.
        s.loco = s.forceLoco || 'run';
        beginTurn(s, 'side');
        moving(2); s.gaitF += 1.5;
        s.dodgeY = Math.sin((s.t || 0) * 0.9) * 2;
        for (const mon of living(s)) {
          mon.walk++;
          mon.x -= 2; // keep screen-space with the charge scroll
          if (isRangedMon(mon) && mon.x < heroFront + (monRangeOf(mon) || 110) - 4) mon.x += 0.35;
          else if (!isRangedMon(mon) && mon.x > close) mon.x -= (MON[mon.type] || MON.rat).speed * 0.5;
          beginMonTurn(mon, 'side');
        }
      } else if (ranged && dist > 40) {
        s.loco = s.forceLoco || (dist > 70 ? 'walk' : 'idle');
        beginTurn(s, 'side');
        const step = s.loco === 'walk' ? 1 : 0;
        if (step) { moving(step); s.gaitF += 1; } else s.gaitF += 0.4;
        for (const mon of living(s)) {
          mon.walk++;
          mon.x -= (step + (MON[mon.type] || MON.rat).speed * (isRangedMon(mon) ? 0.25 : 0.7));
          beginMonTurn(mon, 'side');
        }
      } else {
        s.loco = s.forceLoco || 'idle';
        s.gaitF += 0.4;
        beginTurn(s, 'front');
        for (const mon of living(s)) {
          if (isRangedMon(mon) && mon.x < close + 36) { beginMonTurn(mon, 'front'); }
          else if (mon.x > close) { mon.x -= (MON[mon.type] || MON.rat).speed * 0.7; mon.walk++; beginMonTurn(mon, mon.x > close + 6 ? 'side' : 'front'); }
          else beginMonTurn(mon, 'front');
        }
      }
      tickMonShots(s);
      if (s.mode === 'death') return;
      const charging = stillClosing;
      const turningIn = s.turn && s.turnTo === 'front' && !(ranged && dist > 40) && !charging;
      if (charging) {
        s.seq = null; s.pose = '';
      } else if (!s.seq || s.seqI >= s.seq.length) {
        if (!turningIn && --s.atkT <= 0) startAttack(s, eq, S, foe);
      } else if (--s.atkT <= 0) {
        s.seqI++;
        if (s.seqI < s.seq.length) {
          const step = s.seq[s.seqI];
          s.atkT = step.wait; s.pose = step.pose || '';
          if (step.lunge) s.lunge = step.lunge;
          if (step.leap) startLeap(s);
          if (step.hit) fireHit(s, eq, S, foe, step.hit);
        }
      }
      if (!living(s).length) return;
      const strikers = living(s).filter(m => !isRangedMon(m) && m.x <= close + 2);
      if (strikers.length && --s.monT <= 0) {
        const striker = strikers.reduce((a, b) => a.x < b.x ? a : b);
        s.monT = striker.boss ? 9 : (living(s).length > 2 ? 8 : 10); striker.lunge = 2;
        if (applyHeroHit(s, heroHitDmg(s, striker), striker)) return;
      }
    } else if (s.mode === 'potion') {
      s.potion++; s.pose = '';
      if ((s.potion === 8 || s.potion === 13) && s.hp < s.max) { const h = Math.max(1, Math.ceil(s.max * 0.12)); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 14 + (s.potion % 4) * 2, 12, '+' + h, '#70ff70'); }
      if (s.potion > 16) goRun(s, true);
    } else if (s.mode === 'rest') {
      s.potion++; s.pose = '';
      if ((s.potion === 16 || s.potion === 32 || s.potion === 48) && s.hp < s.max) { const h = Math.max(1, Math.ceil(s.max * 0.08)); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 16, 18, '+' + h, '#70ff70'); }
      if (s.potion > 56 || (s.hp >= s.max && s.potion > 30)) goRun(s, true);
    } else if (s.mode === 'band') {
      s.potion++; s.pose = 'band';
      if ((s.potion === 8 || s.potion === 14) && s.hp < s.max) { const h = Math.max(1, Math.ceil(s.max * 0.10)); s.hp = Math.min(s.max, s.hp + h); addNum(s.heroX + 16, 14, '+' + h, '#70ff70'); }
      if (s.potion > 18) { goRun(s, true); s.pose = ''; }
    }
  }
  function startHeal(forced) {
    st.potion = 0; st.seq = null; st.pose = ''; st.fire = null; st.loco = 'idle'; st.leap = null; st.hopY = 0; st.healCd = 240;
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
  function flapWings(src, phase, buzz) {
    const pad = 7, rate = buzz ? 1.4 : 0.9;
    const o = document.createElement('canvas'); o.width = src.width + 4; o.height = src.height + pad * 2;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    const w = src.width, h = src.height, mid = (w / 2) | 0, body = Math.max(3, Math.round(w * 0.18));
    const lift = Math.sin(phase * rate);
    const sy = 1 - lift * 0.32;
    const pivot = Math.round(h * 0.4);
    const dh = Math.max(3, Math.round(h * sy));
    const dy = pad + pivot - Math.round(pivot * sy);
    // Flap each wing as a unit so the membrane stays intact.
    x.drawImage(src, 0, 0, mid - body, h, 2, dy, mid - body, dh);
    x.drawImage(src, mid + body, 0, w - (mid + body), h, 2 + mid + body, dy, w - (mid + body), dh);
    x.drawImage(src, mid - body, 0, body * 2, h, 2 + mid - body, pad, body * 2, h);
    return o;
  }
  function posedMon(spr, m, a, moving, view) {
    const gait = (MON[m.type] && MON[m.type].gait) || 'walk';
    const phase = (m.walk || 0) + a;
    const frame = moving ? ((phase * (gait === 'lumber' ? 0.5 : gait === 'scurry' ? 1.4 : gait === 'flap' ? 1.3 : 1)) | 0) % 8 : 0;
    const key = (m.type || '') + '|' + (m.tier | 0) + (m.elite ? 'e' : '') + '|' + view + '|' + gait + '|' + (moving ? frame : 'idle');
    let hit = poseCache.get(key);
    if (hit) return hit;
    const src = view === 'front' ? (spr.front || spr.c) : spr.c;
    let c = src, dy = 0;
    if (moving && !m.dead) {
      if (gait === 'flap') {
        c = flapWings(src, phase, m.type === 'botfly' ? 1.6 : 1);
        dy = Math.round(Math.sin(phase * (m.type === 'botfly' ? 0.8 : 0.5)) * 2) - 3;
      } else if (gait === 'hover') {
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
    const scStep = (s.mode === 'run' || s.mode === 'hop') ? (heroLoco(s) === 'walk' || heroLoco(s) === 'climb' ? 1 : 2) : (s.mode === 'fight' && heroLoco(s) === 'walk' ? 1 : 0);
    if (!bgOn) { const bgOf = (L) => { tiled(L.sky, 0, H - L.TH); tiled(L.far, (s.scroll + a * scStep) * 0.2, H - L.TH); tiled(L.mid, (s.scroll + a * scStep) * 0.55, H - L.TH); }; fadeDraw(bgOf, H); }
    fadeDraw(L => tiled(L.fl, s.scroll + a * scStep, H - 9), H);
    drawProps(g, s.scroll, a, scStep, 'mid');
    drawProps(g, s.scroll, a, scStep, 'ground');
    if (s.fire) drawFire(s.fire.x, s.t);
    const loc = heroLoco(s);
    const gaitSpd = loc === 'run' || loc === 'hop' ? 1.5 : loc === 'walk' || loc === 'dig' || loc === 'climb' ? 1 : 0.4;
    const gaitFrame = Math.floor((s.gaitF || 0) + a * gaitSpd);
    const amt = faceAmt(s, a);
    const baseFront = heroSprite(s.pose);
    let frontImg = baseFront, hy = HERO_Y + Math.round((s.hopY || 0) + (s.dodgeY || 0));
    if (s.mode === 'rest') frontImg = sitOf(baseFront);
    const eq = heroEq(), rar = rarity(eqNow());
    const sideLoco = (loc === 'idle' && s.mode !== 'dig' && s.mode !== 'hop') ? 'idle' : loc;
    const sideImg = (P().heroCanvasSide) ? P().heroCanvasSide(eq, rar.best, rar.color, sideLoco, gaitFrame) : baseFront;
    const healFront = s.mode === 'rest' || s.mode === 'potion' || s.mode === 'band';
    const useSide = amt < 0.5 && !healFront;
    let img = useSide ? sideImg : frontImg;
    img = degradeHero(img, hurtStage(s.hp, s.max));
    const hx = s.heroX + (s.lunge ? 3 * Math.min(1, s.lunge - a * 0 + 0) / 3 : 0) + leapOff(s, a);
    const hx2 = s.heroX + (s.lunge ? 3 : 0) + leapOff(s, a);
    const ax = (useSide && img._ax != null) ? img._ax : (img.width / 2);
    const plant = hx2 + 24;
    const sx = amt < 0.5 ? lerp(1, 0.12, amt / 0.5) : lerp(0.12, 1, (amt - 0.5) / 0.5);
    const dw = Math.max(1, Math.round(img.width * sx));
    const dx = Math.round(plant - (ax / img.width) * dw);
    g.imageSmoothingEnabled = false;
    if (s.mode === 'death' && (s.deathAng || 0) > 0.02) {
      const ground = H - 8;
      g.save();
      g.translate(Math.round(plant), ground - 2);
      g.rotate((s.deathAng || 0) * Math.PI * 0.5);
      g.drawImage(img, -Math.round((ax / img.width) * dw), -img.height + 2 + Math.round(s.deathY || 0), dw, img.height);
      if (s.flashH) { g.globalAlpha = 0.55 * Math.min(1, s.flashH / 2); g.drawImage(whiteOf(img), -Math.round((ax / img.width) * dw), -img.height + 2 + Math.round(s.deathY || 0), dw, img.height); g.globalAlpha = 1; }
      g.restore();
    } else {
      g.drawImage(img, dx, hy, dw, img.height);
      if (s.flashH) { g.globalAlpha = 0.55 * Math.min(1, s.flashH / 2); g.drawImage(whiteOf(img), dx, hy, dw, img.height); g.globalAlpha = 1; }
    }
    if (s.mode === 'greet' && s.npc && s.npc.mode === 'wave') drawWaveArm(g, plant, hy, (s.greetT || 0) + a);
    if (s.mode === 'death' && (s.deathPhase === 'spirit' || s.deathPhase === 'speak' || s.deathPhase === 'raise') && (s.spiritA || 0) > 0) {
      const sp = paintSpirit();
      const sx0 = Math.round(plant + 10), sy0 = Math.round((s.spiritY || 0) + 2);
      g.globalAlpha = Math.max(0.15, s.spiritA);
      g.drawImage(sp, sx0, sy0);
      g.globalAlpha = 1;
      if (s.deathPhase === 'speak' && s.deathLine) drawBubble(g, sx0 + 14, sy0 + 6, s.deathLine);
    }
    if (s.mode === 'death' && s.deathPhase === 'raise') {
      const p = Math.min(1, (s.deathT || 0) / 12);
      const gr = g.createRadialGradient(plant, H - 20, 2, plant, H - 20, 18 + p * 16);
      gr.addColorStop(0, 'rgba(255,240,160,' + (0.55 * (1 - p * 0.3)) + ')');
      gr.addColorStop(1, 'rgba(255,240,160,0)');
      g.fillStyle = gr; g.fillRect(plant - 30, H - 50, 60, 50);
    }
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
    for (const m of allMons(s)) {
      const spr = monCanvas(m.type, { tier: m.tier, elite: m.elite || m.leader });
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
      const dym = ground - ih + (posed.dy || 0) + (m.yOff || 0);
      if (!m.dead || m.dead < 8) {
        if (m.elite || m.boss || m.leader || (m.tier | 0) >= 2) {
          const gr = g.createRadialGradient(mx + mw / 2, dym + ih / 2, 2, mx + mw / 2, dym + ih / 2, ih * 0.85);
          const c = m.boss ? '170,100,255' : (m.elite || m.leader) ? '255,200,80' : (m.tier >= 3 ? '255,90,40' : '160,80,220');
          gr.addColorStop(0, 'rgba(' + c + ',.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
          g.fillStyle = gr; g.fillRect(mx - mh, dym - mh / 2, mw + mh * 2, mh * 2);
        }
        g.imageSmoothingEnabled = false;
        g.globalAlpha = m.dead ? Math.max(0, 1 - m.dead / 7) : 1;
        g.drawImage(posed.c, dxm, dym, dwm, ih);
        if (m.flash || m.dead) { g.globalAlpha = m.dead ? 0.5 : 0.65; g.drawImage(posed.f, dxm, dym, dwm, ih); }
        g.globalAlpha = 1;
      }
      if (!m.dead && (s.mode === 'fight' || m.boss || m.elite || m.leader)) bar(mx + mw / 2 - 8, Math.max(2, dym - 5), 16, Math.max(0, m.hp / m.max), m.boss ? '#b070ff' : (m.elite || m.leader) ? '#ffc040' : '#d04030');
    }
    for (const f of s.fx) {
      const ft = f.t + a;
      if (f.k === 'slash') {
        const col = ['#ffffff', '#ffe8b0', '#e0b060', '#c08040', '#8a4a20'][f.t] || '#8a4a20';
        g.fillStyle = col;
        if (f.style === 'spin') {
          const r = 8 + ft * 3;
          for (let i = 0; i < 20; i++) {
            const a0 = i * 0.31 + ft * 0.5;
            g.fillRect(Math.round(f.x + Math.cos(a0) * r), Math.round(f.y + Math.sin(a0) * r * 0.55), 2, 1);
            g.fillRect(Math.round(f.x + Math.cos(a0) * (r - 3)), Math.round(f.y + Math.sin(a0) * (r - 3) * 0.55), 1, 1);
          }
        } else {
          const down = f.style === 'down';
          for (let i = 0; i < 16; i++) {
            const a0 = down ? (-1.7 + i * 0.2 + ft * 0.22) : (-0.4 + i * 0.16 + ft * 0.2);
            for (const r of [12, 14, 16]) { if (r === 16 && (i < 3 || i > 12)) continue; g.fillRect(Math.round(f.x + Math.cos(a0) * r), Math.round(f.y + (down ? 2 : 6) + Math.sin(a0) * (down ? r * 0.85 : r * 0.55)), 1, 1); }
          }
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
        const sz = f.small ? 1 : 2;
        g.fillStyle = f.col[2]; g.fillRect(Math.round(x) - sz, Math.round(y), 1 + sz, 1);
        g.fillStyle = f.col[0]; g.fillRect(Math.round(x), Math.round(y) - (sz > 1 ? 1 : 0), sz, sz + 1);
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
      } else if (f.k === 'blast') {
        const r = 6 + ft * 5, fade = 1 - ft / f.life, col = f.col || ['#e8ffff', '#60e0ff', '#2060a0'];
        g.fillStyle = col[1];
        for (let i = 0; i < 18; i++) {
          const ang = i * 0.35 + ft * 0.25, rr = r * (0.7 + (i % 3) * 0.15);
          g.globalAlpha = fade;
          g.fillRect(Math.round(f.x + Math.cos(ang) * rr), Math.round(f.y + Math.sin(ang) * rr * 0.7), 2, 2);
        }
        g.globalAlpha = fade * 0.7; g.fillStyle = col[0];
        g.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 5, 5);
        g.globalAlpha = 1;
        if (ft < 2) { g.fillStyle = '#ffffff'; g.fillRect(f.x - 3, f.y - 3, 7, 7); }
      } else if (f.k === 'dirt') {
        const x = f.x + (f.vx || 0) * ft, y = f.y + (f.vy || 0) * ft + 0.35 * ft * ft;
        g.fillStyle = '#5a4630'; g.fillRect(Math.round(x), Math.round(y), 2, 1);
        g.fillStyle = '#3a2a1a'; g.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
      } else if (f.k === 'glint') {
        const p = Math.min(1, ft / f.life);
        const x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p - Math.sin(p * Math.PI) * 8;
        g.fillStyle = '#fff6d0'; g.fillRect(Math.round(x), Math.round(y), 2, 2);
        g.fillStyle = '#ffe070'; g.fillRect(Math.round(x) - 1, Math.round(y), 1, 1);
        if (p > 0.7) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); }
      } else if (f.k === 'flash') {
        g.fillStyle = '#fff2a0'; g.fillRect(f.x, f.y - 1, 3, 3); g.fillStyle = '#ffb040'; g.fillRect(f.x + 3, f.y, 2, 1); g.fillRect(f.x + 1, f.y - 2, 1, 1); g.fillRect(f.x + 1, f.y + 2, 1, 1);
      } else if (f.k === 'block') {
        g.fillStyle = '#a8c8ff'; for (let i = 0; i < 6; i++) g.fillRect(f.x + ((i * 3) % 5), f.y - 6 + i * 2, 1, 1);
      } else if (f.k === 'acid') {
        const x = Math.round(f.x), y = Math.round(f.y);
        g.fillStyle = '#7ad830'; g.fillRect(x - 1, y - 1, 3, 3);
        g.fillStyle = '#d8ff70'; g.fillRect(x, y, 2, 2);
        g.fillStyle = 'rgba(120,220,40,0.45)'; g.fillRect(x - 2, y - 2, 5, 4);
      } else if (f.k === 'acidSplash') {
        const r = 3 + ft * 2, fade = 1 - ft / f.life;
        g.globalAlpha = fade;
        g.fillStyle = '#6ec020';
        for (let i = 0; i < 10; i++) {
          const ang = i * 0.63 + ft * 0.2;
          g.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r * 0.7), 2, 2);
        }
        g.fillStyle = '#e8ff80'; g.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
        g.globalAlpha = 1;
      } else if (f.k === 'acidDrop') {
        const x = f.x + (f.vx || 0) * ft, y = f.y + (f.vy || 0) * ft + 0.35 * ft * ft;
        g.fillStyle = '#8ae030'; g.fillRect(Math.round(x), Math.round(y), 2, 2);
        g.fillStyle = '#e8ff90'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else if (f.k === 'arrow') {
        const p = Math.min(1, ft / Math.max(1, f.life));
        const x0 = f.x0 + (f.tx - f.x0) * Math.max(0, p - 0.18), x1 = f.x, y1 = f.y;
        const y0 = f.y0 + (f.ty - f.y0) * Math.max(0, p - 0.18);
        g.strokeStyle = '#c8b48a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.fillStyle = '#e8d8b0'; g.fillRect(Math.round(x1) - 2, Math.round(y1) - 1, 3, 2);
        g.fillStyle = '#8a2a1a'; g.fillRect(Math.round(x1) - 3, Math.round(y1) - 1, 1, 2);
      } else if (f.k === 'arrowHit') {
        g.fillStyle = '#fff6e0'; g.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
        g.fillStyle = '#c04030'; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
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
    drawProps(g, s.scroll, a, scStep, 'fg');
    drawNpc(g, s, a);
    if (s.toast) text(g, s.toast.msg, s.heroX + 8, 8, '#ffe070');
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
      if (opts && m) Object.assign(m, opts);
      if (m && m.x == null) m.x = st.heroX + 50;
      return m;
    },
    _spawnPack(kind, leader) {
      if (!st) st = freshState();
      return spawnPack(kind || 'rats', !!leader);
    },
    _spawnProp(type, opts) {
      if (!st) st = freshState();
      seedProps(st);
      return addProp(st, type || 'rubble', opts || { x: st.heroX + 36 });
    },
    _forceDig() { if (st) { const p = (st.props || []).find(q => q.dig && !q.looted) || addProp(st, 'rubble', { x: st.heroX + 32 }); st.forceDig = true; startDig(st, p); } },
    _forceHop() { if (st) { const p = (st.props || []).find(q => q.hop && !q.used) || addProp(st, 'boulder', { x: st.heroX + 30 }); startHop(st, p); } },
    _pickMoveAt(dist, packN) {
      if (!st) st = freshState();
      if (packN) {
        st.mons = [];
        for (let i = 0; i < packN; i++) st.mons.push({ type: 'rat', x: st.heroX + 40 + dist + i * 8, hp: 8, max: 8, dead: 0, w: 8, h: 8 });
        st.mon = st.mons[0];
      } else { st.mons = []; st.mon = { type: 'rat', x: st.heroX + 40 + dist, hp: 20, max: 20, dead: 0, w: 8, h: 8 }; }
      const mv = pickMove(atkKind(eqNow()), dist);
      return { move: mv, pack: living(st).length, dist };
    },
    _cycleAttacks() {
      stop();
      if (!st) st = freshState();
      size();
      st.noDeath = 1; st.awardXp = false;
      const S0 = stats(eqNow(), lvl());
      st.max = S0.hp; st.hp = S0.hp; st.fx = []; st.nums = []; st.coins = [];
      const out = {};
      const clsOf = { overhead: 'warrior', sweep: 'warrior', bash: 'warrior', cleave: 'warrior', bolt: 'mage', chain: 'mage', orb: 'mage', blast: 'mage', single: 'shooter', burst: 'shooter', grenade: 'shooter' };
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
      st.noDeath = 1; st.awardXp = false;
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
      st.noDeath = 1; st.awardXp = false;
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
    },
    _cycleProps() {
      stop();
      if (!st) st = freshState();
      st.noDeath = 1; st.awardXp = false;
      if (!cv) { try { size(); } catch (e) {} }
      st.props = []; st.scroll = 0; st.nextProp = 0; st.mode = 'run'; st.mon = null; st.mons = [];
      const types = Object.keys(PROP);
      const spawned = [];
      let x = st.heroX + 20;
      for (const t of types) {
        const p0 = addProp(st, t, { x: x, v: 0 });
        spawned.push({ type: t, w: p0.w, h: p0.h, hop: !!p0.hop, dig: !!p0.dig });
        x += (p0.w || 16) + 8;
      }
      let error = null;
      try { draw(); } catch (e) { error = String(e); }
      const drawn = st.props.map(p => ({ type: p.k, sx: Math.round(propScreenX(p, st.scroll, 0, 0)), onscreen: propScreenX(p, st.scroll, 0, 0) < W }));
      return { types, spawned, drawn, count: st.props.length, error };
    },
    _cycleDig() {
      stop();
      if (!st) st = freshState();
      st.noDeath = 1; st.awardXp = false;
      if (!cv) { try { size(); } catch (e) {} }
      const gold0 = bstats.gold;
      st.mode = 'run'; st.mon = null; st.mons = []; st.fx = []; st.nums = [];
      const p0 = addProp(st, 'rubble', { x: st.heroX + 32 });
      startDig(st, p0);
      const frames = [];
      for (let i = 0; i < 22; i++) {
        tick();
        try { draw(); } catch (e) { return { error: String(e), frames }; }
        frames.push({ mode: st.mode, loco: heroLoco(st), digT: st.digT, toast: !!(st.toast), fx: st.fx.map(f => f.k) });
      }
      return { ended: st.mode === 'run', gold: bstats.gold > gold0, toasted: frames.some(f => f.toast || (f.fx || []).includes('glint')), dug: frames.some(f => f.mode === 'dig'), dirt: frames.some(f => (f.fx || []).includes('dirt')), frames: frames.length };
    },
    _cycleHop() {
      stop();
      if (!st) st = freshState();
      st.noDeath = 1; st.awardXp = false;
      if (!cv) { try { size(); } catch (e) {} }
      st.mode = 'run'; st.mon = null; st.mons = [];
      const p0 = addProp(st, 'boulder', { x: st.heroX + 30 });
      startHop(st, p0);
      let maxY = 0;
      for (let i = 0; i < 16; i++) {
        tick();
        try { draw(); } catch (e) { return { error: String(e) }; }
        if (Math.abs(st.hopY || 0) > maxY) maxY = Math.abs(st.hopY || 0);
      }
      return { ended: st.mode === 'run', hopped: maxY >= 6, maxY };
    },
    _cyclePacks() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.noDeath = 1; st.awardXp = false;
      const collect = (ticks, forceCls, forceMove, kind, leader) => {
        st.forceCls = forceCls;
        if (kind) spawnPack(kind, !!leader);
        const n = living(st).length, hasLeader = allMons(st).some(m => m.leader);
        st.mode = 'fight'; st.seq = null; st.seqI = 0; st.atkT = 0; st.fx = []; st.pose = ''; st.move = ''; st.forceMove = forceMove; st.leap = null;
        const kinds = [], seen = {};
        let first = '';
        for (let i = 0; i < ticks; i++) {
          tick();
          if (!first && st.move) first = st.move;
          for (const f of st.fx) { const k = f.k + (f.style ? ':' + f.style : ''); if (!seen[k]) { seen[k] = 1; kinds.push(k); } }
        }
        return { n, leader: hasLeader, kinds, move: first || st.move };
      };
      const out = {};
      out.rats = collect(24, 'warrior', 'cleave', 'rats', true);
      out.bats = collect(24, 'warrior', 'cleave', 'bats', false);
      out.spiders = collect(24, 'warrior', 'cleave', 'spiders', false);
      out.shooter = collect(30, 'shooter', 'grenade', 'rats', false);
      out.mage = collect(24, 'mage', 'blast', 'bats', false);
      st.forceCls = null; st.forceMove = null;
      return out;
    },
    _cycleRange() {
      stop();
      if (!st) st = freshState();
      st.noDeath = 1; st.awardXp = false;
      const out = { mage: {}, shooter: {} };
      st.forceCls = 'mage';
      out.mage.far = this._pickMoveAt(110, 0).move;
      out.mage.mid = this._pickMoveAt(60, 0).move;
      out.mage.close = this._pickMoveAt(20, 0).move;
      out.mage.pack = this._pickMoveAt(40, 4).move;
      st.forceCls = 'shooter';
      out.shooter.far = this._pickMoveAt(120, 0).move;
      out.shooter.mid = this._pickMoveAt(65, 0).move;
      out.shooter.close = this._pickMoveAt(20, 0).move;
      out.shooter.pack = this._pickMoveAt(40, 4).move;
      st.forceCls = 'warrior';
      out.warrior = { solo: this._pickMoveAt(20, 0).move, pack: this._pickMoveAt(20, 4).move };
      st.forceCls = null;
      return out;
    },
    _propTypes() { return Object.keys(PROP); },
    _forceNpc(line, opts) {
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.mode = 'run'; st.mon = null; st.mons = []; st.forceNpc = true;
      const o = Object.assign({ x: st.heroX + 52, line: line || null }, opts || {});
      if (typeof line === 'object' && line && !opts) { Object.assign(o, line); if (!o.line) o.line = null; }
      return spawnNpc(st, o);
    },
    _cycleNpc() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.noDeath = 1; st.awardXp = false;
      st.mode = 'run'; st.mon = null; st.mons = []; st.spawn = 9999; st.props = []; st.npc = null; st.npcCd = 0;
      const n0 = this._forceNpc('Good day to you.');
      const frames = [];
      let waved = false, left = false, line = n0 && n0.line, greetSeen = false, scrollAtGreet = null, scrollEndGreet = null;
      for (let i = 0; i < 80; i++) {
        const wasGreet = st.mode === 'greet';
        const sc = st.scroll;
        tick();
        try { draw(); } catch (e) { return { error: String(e), frames: frames.length }; }
        frames.push({ mode: st.mode, npc: st.npc && st.npc.mode });
        if (st.mode === 'greet') greetSeen = true;
        if (wasGreet && st.mode === 'greet') {
          if (scrollAtGreet == null) scrollAtGreet = sc;
          scrollEndGreet = st.scroll;
        }
        if (st.npc && st.npc.mode === 'wave') waved = true;
        if (st.npc && st.npc.mode === 'leave') left = true;
        if (!st.npc && waved) break;
      }
      return { waved, left, ended: !st.npc || st.mode === 'run', line, greetMode: greetSeen, scrollMovedDuringGreet: !!(scrollAtGreet != null && scrollEndGreet != null && scrollEndGreet > scrollAtGreet), frames: frames.length, error: null };
    },
    _forceDeath(line) {
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.noDeath = false; st.forceDeath = false;
      startDeath(st, { boss: 1 });
      if (line) st.deathLine = line;
      try { draw(); } catch (e) { return { error: String(e) }; }
      return { mode: st.mode, phase: st.deathPhase, line: st.deathLine };
    },
    _cycleDeath() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.awardXp = false;
      const S0 = stats(eqNow(), lvl());
      st.max = S0.hp; st.hp = 1;
      const phases = [];
      this._forceDeath('Do you want to live forever?');
      let line = st.deathLine, raised = false, hp = 0;
      for (let i = 0; i < 120; i++) {
        tick();
        try { draw(); } catch (e) { return { error: String(e), phases }; }
        if (st.deathPhase && phases[phases.length - 1] !== st.deathPhase) phases.push(st.deathPhase);
        if (st.deathPhase === 'raise' || st.mode === 'run') { raised = true; hp = st.hp; }
        if (st.mode === 'run' && raised) break;
      }
      return { ended: st.mode === 'run', phases, line, raised, hp, hpFrac: st.max ? +(hp / st.max).toFixed(2) : 0, hasSpeak: phases.indexOf('speak') >= 0, hasSpirit: phases.indexOf('spirit') >= 0, error: null };
    },
    _awardKillXp(kind) {
      if (!st) st = freshState();
      st.awardXp = true;
      const mon = { type: kind === 'boss' ? 'boss' : kind === 'elite' ? 'mut' : 'rat', x: st.heroX + 50, boss: kind === 'boss', elite: kind === 'elite', leader: kind === 'leader' };
      if (kind === 'pack') { st.mons = [{ type: 'rat' }, mon]; }
      const n = killXp(st, mon);
      const xp0 = (typeof xpState !== 'undefined' && xpState.xp) || 0;
      awardBattleXp(st, mon, n);
      return { n, gained: ((typeof xpState !== 'undefined' && xpState.xp) || 0) - xp0 };
    },
    _monTypes() { return Object.keys(MON); },
    _cycleNpcLooks() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      st.noDeath = 1; st.awardXp = false; st.spawn = 9999; st.mon = null; st.mons = []; st.props = [];
      const variants = [
        { build: 'short', head: 'hood', pack: true, pal: 1 },
        { build: 'tall', head: 'mask', pack: true, pal: 4 },
        { build: 'stocky', head: 'hat', pack: false, pal: 2, haul: 'cart' },
        { build: 'avg', head: 'wrap', pack: true, pal: 5, haul: 'wagon' },
        { build: 'avg', head: 'none', pack: false, pal: 0 }
      ];
      const looks = [];
      let error = null;
      for (const v of variants) {
        st.mode = 'run';
        const n = this._forceNpc('Nice day for a fallout.', Object.assign({ kind: 'wanderer', noClass: 1 }, v));
        st.mode = 'greet'; n.mode = 'wave'; n.wave = 8; st.greetT = 8; st.loco = 'idle';
        try { draw(); } catch (e) { error = String(e); break; }
        looks.push({ build: n.build, head: n.head, pack: !!n.pack, haul: n.haul || null, pal: n.pal, kind: n.kind, line: n.line });
      }
      const classes = {};
      const hero = clsNow();
      for (const c of otherClasses(hero)) {
        st.mode = 'run';
        const n = this._forceNpc(null, { kind: 'cls', cls: c });
        st.mode = 'greet'; n.mode = 'wave'; n.wave = 8; st.greetT = 8; st.loco = 'idle';
        try { draw(); } catch (e) { error = String(e); break; }
        classes[c] = { cls: n.cls, kind: n.kind, line: n.line, hasLine: !!(n.line), notHero: n.cls !== hero };
      }
      return { looks, classes, hero, builds: Array.from(new Set(looks.map(l => l.build))), heads: Array.from(new Set(looks.map(l => l.head))), hauls: looks.map(l => l.haul).filter(Boolean), error };
    },
    _cycleRangedFoes() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      const out = {};
      st.noDeath = 1; st.awardXp = false;
      const S0 = stats(eqNow(), lvl());
      for (const type of ['botfly', 'archer']) {
        st.max = S0.hp; st.hp = S0.hp; st.fx = []; st.nums = []; st.coins = [];
        st.mode = 'fight'; st.loco = 'idle'; st.seq = null; st.pose = ''; st.forceLoco = 'idle';
        st.forceCls = 'shooter';
        const m = makeMon(type, { x: st.heroX + 90, yOff: MON[type].fly ? -6 : 0 });
        m.shotT = 0; m.facing = 'side'; m.turn = 0; m.turnTo = 'side';
        setMons([m]);
        const hp0 = st.hp;
        const kinds = [];
        let hit = false, error = null;
        for (let i = 0; i < 28; i++) {
          try { tick(); draw(); } catch (e) { error = String(e); break; }
          for (const f of st.fx) if (f.k && kinds.indexOf(f.k) < 0) kinds.push(f.k);
          if (st.hp < hp0) hit = true;
        }
        out[type] = { hit, hpDropped: hp0 - st.hp, kinds, exists: !!MON[type], ranged: !!MON[type].ranged, shot: MON[type].shot, error };
      }
      // warrior must close on a ranged foe while taking fire
      st.forceCls = 'warrior'; st.forceLoco = null;
      st.max = S0.hp; st.hp = S0.hp; st.fx = []; st.nums = [];
      const ar = makeMon('archer', { x: st.heroX + 110 });
      ar.shotT = 0; ar.facing = 'side'; ar.turn = 0; ar.turnTo = 'side';
      setMons([ar]);
      st.mode = 'fight'; st.seq = null; st.atkT = 8; st.monT = 8;
      const x0 = ar.x, scroll0 = st.scroll, hp1 = st.hp;
      let closed = false, fire = false, error = null, dodge = false;
      for (let i = 0; i < 40; i++) {
        try { tick(); draw(); } catch (e) { error = String(e); break; }
        const live = living(st)[0];
        const dist = live ? live.x - (st.heroX + 40) : 0;
        if (st.fx.some(f => f.k === 'arrow' || f.k === 'arrowHit')) fire = true;
        if (st.hp < hp1) fire = true;
        if (st.dodgeY) dodge = true;
        if (live && dist <= 16) { closed = true; break; }
        if (st.mode === 'death') break;
      }
      const live = living(st)[0];
      out.warriorCharge = { closed, fire, dodge, dist: live ? live.x - (st.heroX + 40) : 0, hpDropped: hp1 - st.hp, scrollMoved: st.scroll > scroll0, error };
      st.forceCls = null; st.forceLoco = null;
      return out;
    },
    _healPolicy() {
      stop();
      if (!st) st = freshState();
      if (!cv) { try { size(); } catch (e) {} }
      const S0 = stats(eqNow(), lvl());
      st.noDeath = 1; st.awardXp = false; st.healCd = 0;
      // digging scrap must not heal
      st.max = S0.hp; st.hp = Math.max(1, Math.round(S0.hp * 0.5));
      const hpDig = st.hp;
      const p0 = addProp(st, 'rubble', { x: st.heroX + 32 });
      startDig(st, p0);
      for (let i = 0; i < 22; i++) tick();
      const digHealed = st.hp > hpDig;
      // mid-health fight end should not auto-heal
      st.max = S0.hp; st.hp = Math.round(S0.hp * 0.5); st.healCd = 0;
      st.mode = 'fight'; st.mons = [{ type: 'rat', x: st.heroX + 40, hp: 0, max: 8, dead: 8, scored: 1, noScore: 1, w: 8, h: 8 }];
      st.mon = st.mons[0]; st.seq = null;
      tick();
      const midAuto = st.mode === 'potion' || st.mode === 'rest' || st.mode === 'band';
      // critically low can start a heal
      st.max = S0.hp; st.hp = Math.max(1, Math.round(S0.hp * 0.1)); st.healCd = 0;
      st.mode = 'fight'; st.mons = [{ type: 'rat', x: st.heroX + 40, hp: 0, max: 8, dead: 8, scored: 1, noScore: 1, w: 8, h: 8 }];
      st.mon = st.mons[0]; st.seq = null;
      tick();
      const lowHeal = st.mode === 'potion' || st.mode === 'rest' || st.mode === 'band';
      // heals are partial, not a full restore
      const amounts = {};
      for (const mode of ['potion', 'rest', 'band']) {
        st.max = S0.hp; st.hp = Math.max(1, Math.round(S0.hp * 0.25)); st.mon = null; st.mons = []; st.fx = [];
        const startHp = st.hp;
        startHeal(mode);
        for (let i = 0; i < 80; i++) { tick(); if (st.mode === 'run') break; }
        amounts[mode] = { gained: st.hp - startHp, frac: +((st.hp - startHp) / S0.hp).toFixed(3), full: st.hp >= S0.hp, ended: st.mode === 'run' };
      }
      return { digHealed, midAuto, lowHeal, amounts, max: S0.hp };
    },
    _classSpawns(cls, n) {
      if (!st) st = freshState();
      const prev = st.forceCls;
      st.forceCls = cls || 'warrior';
      const counts = {};
      for (let i = 0; i < (n || 80); i++) {
        const t = pickMonster();
        counts[t] = (counts[t] || 0) + 1;
      }
      st.forceCls = prev;
      const ranged = Object.keys(counts).filter(isRangedMon).reduce((a, k) => a + counts[k], 0);
      return { cls: cls || 'warrior', counts, ranged, total: n || 80, rangedFrac: +((ranged / (n || 80)).toFixed(3)) };
    }
  };
})();
