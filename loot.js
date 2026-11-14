// Reliquary chests + Armory. Original names and inline SVG only (no trademarked terms, no copied art).
'use strict';

const LOOT_SLOTS = [
  ['helm', 'Helm'],
  ['pauldrons', 'Pauldrons'],
  ['armor', 'Armor'],
  ['weapon', 'Weapon'],
  ['pack', 'Pack'],
  ['cape', 'Cape'],
  ['base', 'Base']
];
const RARITY = {
  common: { rank: 1, color: '#9a958c', name: 'Common' },
  uncommon: { rank: 2, color: '#5a9a4a', name: 'Uncommon' },
  rare: { rank: 3, color: '#4a8ad8', name: 'Rare' },
  relic: { rank: 4, color: '#9a5ad8', name: 'Relic' },
  legendary: { rank: 5, color: '#e8c76a', name: 'Legendary' }
};
const RARITY_WEIGHTS = [['common', 50], ['uncommon', 28], ['rare', 14], ['relic', 6], ['legendary', 2]];

const ITEMS = [
  { id: 'helm-iron', slot: 'helm', name: 'Iron Visor Helm', rarity: 'common' },
  { id: 'helm-crest', slot: 'helm', name: 'Crested Helm', rarity: 'uncommon' },
  { id: 'helm-laurel', slot: 'helm', name: 'Laurelled Helm', rarity: 'rare' },
  { id: 'helm-skull', slot: 'helm', name: 'Skull-Faced Helm', rarity: 'rare' },
  { id: 'helm-horn', slot: 'helm', name: 'Horned War Helm', rarity: 'uncommon' },
  { id: 'helm-mask', slot: 'helm', name: 'Gilded Death Mask', rarity: 'relic' },
  { id: 'helm-phoenix', slot: 'helm', name: 'Phoenix-Crest Helm', rarity: 'legendary' },
  { id: 'paul-iron', slot: 'pauldrons', name: 'Iron Pauldrons', rarity: 'common' },
  { id: 'paul-spike', slot: 'pauldrons', name: 'Spiked Pauldrons', rarity: 'uncommon' },
  { id: 'paul-gilt', slot: 'pauldrons', name: 'Gilded Pauldrons', rarity: 'rare' },
  { id: 'paul-bone', slot: 'pauldrons', name: 'Bone-Trimmed Pauldrons', rarity: 'rare' },
  { id: 'paul-sun', slot: 'pauldrons', name: 'Sunburst Pauldrons', rarity: 'relic' },
  { id: 'arm-iron', slot: 'armor', name: 'Iron Plate', rarity: 'common' },
  { id: 'arm-brass', slot: 'armor', name: 'Brass-Trimmed Plate', rarity: 'common' },
  { id: 'arm-bone', slot: 'armor', name: 'Bone-White Plate', rarity: 'uncommon' },
  { id: 'arm-night', slot: 'armor', name: 'Night-Black Plate', rarity: 'uncommon' },
  { id: 'arm-blood', slot: 'armor', name: 'Blood-Red Plate', rarity: 'rare' },
  { id: 'arm-gilt', slot: 'armor', name: 'Gilded Plate', rarity: 'relic' },
  { id: 'arm-halo', slot: 'armor', name: 'Gold-Halo Warplate', rarity: 'legendary' },
  { id: 'wep-blade', slot: 'weapon', name: 'Iron Combat Blade', rarity: 'common' },
  { id: 'wep-rifle', slot: 'weapon', name: 'Heavy Slug Rifle', rarity: 'common' },
  { id: 'wep-axe', slot: 'weapon', name: 'Toothed Axe', rarity: 'uncommon' },
  { id: 'wep-maul', slot: 'weapon', name: 'Crackling Maul', rarity: 'uncommon' },
  { id: 'wep-rune', slot: 'weapon', name: 'Rune-Tooth Blade', rarity: 'rare' },
  { id: 'wep-sun', slot: 'weapon', name: 'Sunburst Pistol', rarity: 'rare' },
  { id: 'wep-glaive', slot: 'weapon', name: 'Burning Glaive', rarity: 'relic' },
  { id: 'wep-storm', slot: 'weapon', name: 'Storm-Head Hammer', rarity: 'legendary' },
  { id: 'pack-iron', slot: 'pack', name: 'Iron Supply Pack', rarity: 'common' },
  { id: 'pack-banner', slot: 'pack', name: 'Tattered Battle Banner', rarity: 'uncommon' },
  { id: 'pack-rack', slot: 'pack', name: 'Spiked Trophy Rack', rarity: 'uncommon' },
  { id: 'pack-censer', slot: 'pack', name: 'Incense Censer Pack', rarity: 'rare' },
  { id: 'pack-skull', slot: 'pack', name: 'Hovering Skull Familiar', rarity: 'relic' },
  { id: 'cape-ash', slot: 'cape', name: 'Tattered Ash Cape', rarity: 'common' },
  { id: 'cape-crimson', slot: 'cape', name: 'Crimson Cape', rarity: 'uncommon' },
  { id: 'cape-night', slot: 'cape', name: 'Gold-Trimmed Night Cape', rarity: 'rare' },
  { id: 'base-rubble', slot: 'base', name: 'Rubble Base', rarity: 'common' },
  { id: 'base-gear', slot: 'base', name: 'Brass Gear Base', rarity: 'uncommon' },
  { id: 'base-skulls', slot: 'base', name: 'Skull-Strewn Base', rarity: 'rare' }
];
const ITEM_BY_ID = {};
ITEMS.forEach(i => { ITEM_BY_ID[i.id] = i; });

function lootEnsure() {
  if (!xpState.chestAwarded || typeof xpState.chestAwarded !== 'object') xpState.chestAwarded = {};
  if (!xpState.levelChests || typeof xpState.levelChests !== 'object') xpState.levelChests = {};
  if (!xpState.inventory || typeof xpState.inventory !== 'object') xpState.inventory = {};
  if (!xpState.equipped || typeof xpState.equipped !== 'object') xpState.equipped = {};
  if (typeof xpState.chests !== 'number' || xpState.chests < 0) xpState.chests = 0;
}
function lootSave() {
  lootEnsure();
  if (typeof persistXp === 'function') persistXp();
  else localStorage.setItem(XP_KEY, JSON.stringify(xpState));
}

function s(tag, a, inner) {
  let h = '<' + tag;
  for (const k in a) if (a[k] != null) h += ' ' + k + '="' + a[k] + '"';
  return inner != null ? h + '>' + inner + '</' + tag + '>' : h + '/>';
}

let _hid = 0;
const SC = '#1c120c', SW = 1.15;
function url(id, n) { return 'url(#' + id + '-' + n + ')'; }
function stops(arr) {
  return arr.map(t => s('stop', { offset: t[0], 'stop-color': t[1], 'stop-opacity': t[2] })).join('');
}
function lg(id, n, x1, y1, x2, y2, arr) {
  return s('linearGradient', { id: id + '-' + n, x1: x1, y1: y1, x2: x2, y2: y2 }, stops(arr));
}
function rg(id, n, cx, cy, r, arr) {
  return s('radialGradient', { id: id + '-' + n, cx: cx, cy: cy, r: r }, stops(arr));
}
function filt(id, n, blur) {
  return s('filter', { id: id + '-' + n, x: '-80%', y: '-80%', width: '260%', height: '260%' },
    s('feGaussianBlur', { stdDeviation: blur, result: 'b' }) +
    s('feMerge', {}, s('feMergeNode', { in: 'b' }) + s('feMergeNode', { in: 'SourceGraphic' })));
}
function heroDefs(id) {
  return s('defs', {},
    lg(id, 'iron', '0', '0', '1', '1', [['0%', '#9a9590'], ['32%', '#4e4944'], ['68%', '#1a1816'], ['100%', '#7a7570']]) +
    lg(id, 'ironV', '0', '0', '0', '1', [['0%', '#8a8580'], ['40%', '#3c3834'], ['100%', '#141210']]) +
    lg(id, 'gold', '0', '0', '1', '1', [['0%', '#f8ecb8'], ['22%', '#e8c76a'], ['55%', '#8a6e34'], ['82%', '#4a3814'], ['100%', '#f0d878']]) +
    lg(id, 'goldV', '0', '0', '0', '1', [['0%', '#f0d878'], ['45%', '#c4a35a'], ['100%', '#5a4218']]) +
    lg(id, 'brass', '0', '0', '1', '1', [['0%', '#e8c878'], ['40%', '#b08a3a'], ['80%', '#5a4210'], ['100%', '#d4b060']]) +
    lg(id, 'bone', '0', '0', '0', '1', [['0%', '#f4ece0'], ['40%', '#d4cbb4'], ['80%', '#8a8070'], ['100%', '#ece4d4']]) +
    lg(id, 'blood', '0', '0', '1', '1', [['0%', '#b03030'], ['40%', '#6e1414'], ['78%', '#2a0808'], ['100%', '#8a2020']]) +
    lg(id, 'night', '0', '0', '1', '1', [['0%', '#2c2c40'], ['40%', '#12121a'], ['80%', '#07070c'], ['100%', '#28243c']]) +
    lg(id, 'halo', '0', '0', '1', '1', [['0%', '#fff6c8'], ['28%', '#e8c76a'], ['70%', '#8a6e34'], ['100%', '#fff0b0']]) +
    lg(id, 'pale', '0', '0', '1', '1', [['0%', '#eee8de'], ['40%', '#c8c0b4'], ['75%', '#6a655c'], ['100%', '#ddd6cc']]) +
    lg(id, 'robe', '0', '0', '0', '1', [['0%', '#8a6238'], ['48%', '#5a3e24'], ['100%', '#2a1a0e']]) +
    lg(id, 'fold', '0', '0', '1', '0', [['0%', '#2a1a0e', '.55'], ['100%', '#2a1a0e', '0']]) +
    lg(id, 'crimson', '0', '0', '0', '1', [['0%', '#9a2828'], ['45%', '#5a1010'], ['100%', '#220808']]) +
    lg(id, 'ash', '0', '0', '0', '1', [['0%', '#6e6a64'], ['50%', '#3a3834'], ['100%', '#181614']]) +
    lg(id, 'capeN', '0', '0', '0', '1', [['0%', '#2a2438'], ['50%', '#100e18'], ['100%', '#08060c']]) +
    lg(id, 'skin', '0', '0', '0', '1', [['0%', '#e2ba96'], ['50%', '#c4a07a'], ['100%', '#8a6a4a']]) +
    lg(id, 'hair', '0', '0', '1', '0', [['0%', '#4a2a14'], ['100%', '#160804']]) +
    lg(id, 'rust', '0', '0', '0', '1', [['0%', '#b06a38'], ['50%', '#7a4a28'], ['100%', '#3a2010']]) +
    lg(id, 'steel', '0', '0', '0', '1', [['0%', '#d8dce0'], ['35%', '#8a9098'], ['70%', '#3a3e44'], ['100%', '#c8ccd0']]) +
    lg(id, 'parch', '0', '0', '0', '1', [['0%', '#ead8b0'], ['100%', '#9a8864']]) +
    lg(id, 'wood', '0', '0', '0', '1', [['0%', '#8a5a30'], ['100%', '#3a2010']]) +
    rg(id, 'wax', '0.35', '0.3', '0.7', [['0%', '#d05050'], ['65%', '#7a1010'], ['100%', '#3a0808']]) +
    rg(id, 'riv', '0.32', '0.28', '0.7', [['0%', '#d0ccc8'], ['50%', '#6a6560'], ['100%', '#181614']]) +
    rg(id, 'shadow', '0.5', '0.5', '0.5', [['0%', '#000', '.55'], ['100%', '#000', '0']]) +
    rg(id, 'lens', '0.4', '0.32', '0.6', [['0%', '#fff8d0', '.95'], ['45%', '#e8c76a', '.65'], ['100%', '#e8c76a', '0']]) +
    rg(id, 'lensC', '0.4', '0.32', '0.6', [['0%', '#f0ffff', '.95'], ['45%', '#6ad0e8', '.65'], ['100%', '#4a8ad8', '0']]) +
    filt(id, 'fGlow', '1.7') +
    filt(id, 'fGlowS', '2.5')
  );
}
function riv(id, x, y, r) {
  return s('circle', { cx: x, cy: y, r: r || 1.1, fill: url(id, 'riv'), stroke: SC, 'stroke-width': 0.45 });
}
function rivs(id, pts) { return pts.map(p => riv(id, p[0], p[1], p[2])).join(''); }
function ao(cx, cy, rx, ry, op) {
  return s('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: '#000', opacity: op || 0.3 });
}
function seal(id, x, y, rot) {
  return s('g', { transform: 'translate(' + x + ',' + y + ') rotate(' + (rot || 8) + ')' },
    s('path', { d: 'M0 2 L2.6 17 L0.5 14.5 L-0.7 19 L-1.3 14.5 L-2.6 17 L0 2 Z', fill: url(id, 'parch'), stroke: SC, 'stroke-width': 0.45 }) +
    s('circle', { cx: 0, cy: 0, r: 2.6, fill: url(id, 'wax'), stroke: SC, 'stroke-width': 0.5 }) +
    s('circle', { cx: -0.5, cy: -0.6, r: 0.75, fill: '#e08080', opacity: 0.45 })
  );
}
function plate(id, armorId) {
  return url(id, ({ 'arm-iron': 'iron', 'arm-brass': 'iron', 'arm-bone': 'pale', 'arm-night': 'night', 'arm-blood': 'blood', 'arm-gilt': 'iron', 'arm-halo': 'halo' }[armorId] || 'iron'));
}
function trim(id, armorId) {
  return url(id, ({ 'arm-iron': 'ironV', 'arm-brass': 'brass', 'arm-bone': 'bone', 'arm-night': 'gold', 'arm-blood': 'goldV', 'arm-gilt': 'gold', 'arm-halo': 'gold' }[armorId] || 'ironV'));
}

function drawBase(id, hid) {
  let h = s('ellipse', { cx: 50, cy: 132, rx: 38, ry: 8, fill: url(hid, 'shadow') });
  if (id === 'base-gear') {
    const teeth = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10, x = 50 + Math.cos(a) * 28, y = 131 + Math.sin(a) * 6.2;
      teeth.push(s('rect', { x: x - 2.2, y: y - 1.4, width: 4.4, height: 2.8, rx: 0.4, fill: url(hid, 'brass'), stroke: SC, 'stroke-width': 0.5, transform: 'rotate(' + (a * 180 / Math.PI) + ' ' + x + ' ' + y + ')' }));
    }
    h += s('ellipse', { cx: 50, cy: 131, rx: 26, ry: 6.2, fill: url(hid, 'brass'), stroke: SC, 'stroke-width': SW }) +
      teeth.join('') +
      s('ellipse', { cx: 50, cy: 131, rx: 8, ry: 2.4, fill: 'none', stroke: url(hid, 'gold'), 'stroke-width': 1.4 });
  } else if (id === 'base-skulls') {
    const sk = (x, y, sc) => s('g', { transform: 'translate(' + x + ',' + y + ') scale(' + sc + ')' },
      s('ellipse', { cx: 0, cy: 0, rx: 6, ry: 6.5, fill: url(hid, 'bone'), stroke: SC, 'stroke-width': 0.7 }) +
      s('circle', { cx: -2.1, cy: -0.4, r: 1.4, fill: '#1c120c' }) +
      s('circle', { cx: 2.1, cy: -0.4, r: 1.4, fill: '#1c120c' }) +
      s('path', { d: 'M-1.6 3 H1.6', stroke: SC, 'stroke-width': 0.7 }) +
      ao(0, 3, 3, 1.4, 0.2)
    );
    h += s('ellipse', { cx: 50, cy: 131, rx: 30, ry: 6, fill: '#2a2218', stroke: SC, 'stroke-width': 0.7 }) +
      sk(28, 129, 1) + sk(50, 130.5, 0.9) + sk(70, 129, 1.05);
  } else if (id === 'base-rubble') {
    h += s('ellipse', { cx: 50, cy: 131, rx: 30, ry: 6, fill: '#2c2620', stroke: SC, 'stroke-width': 0.7 }) +
      s('path', { d: 'M22 130 L28 124 L36 131 L24 133 Z', fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': 0.6 }) +
      s('path', { d: 'M60 131 L70 123 L80 130 L72 134 Z', fill: url(hid, 'ash'), stroke: SC, 'stroke-width': 0.6 }) +
      s('path', { d: 'M40 132 L48 126 L54 132 Z', fill: '#3a342c', stroke: SC, 'stroke-width': 0.5 });
  }
  return h;
}

function drawCape(id, hid) {
  if (!id) return '';
  const fill = id === 'cape-crimson' ? 'crimson' : id === 'cape-night' ? 'capeN' : 'ash';
  const tattered = id === 'cape-ash';
  const hem = tattered
    ? 'L72 118 L66 112 L62 120 L56 112 L50 122 L44 112 L38 120 L32 112 L26 118 L20 104'
    : 'L70 116 Q50 126 20 104';
  let h = s('path', { d: 'M28 50 Q50 42 72 50 L' + (tattered ? hem.replace(/^L/, '') : '70 116 Q50 126 20 104') + ' Z', fill: url(hid, fill), stroke: SC, 'stroke-width': SW });
  h += s('path', { d: 'M40 54 Q46 80 38 112', fill: 'none', stroke: '#000', 'stroke-width': 3, opacity: 0.22 });
  h += s('path', { d: 'M60 54 Q56 82 62 112', fill: 'none', stroke: '#000', 'stroke-width': 2.4, opacity: 0.18 });
  if (id === 'cape-night') {
    h += s('path', { d: 'M29 52 Q50 44 71 52', fill: 'none', stroke: url(hid, 'gold'), 'stroke-width': 2 });
    h += s('path', { d: 'M22 100 Q50 122 68 114', fill: 'none', stroke: url(hid, 'gold'), 'stroke-width': 1.2, opacity: 0.8 });
  }
  if (tattered) h += s('path', { d: 'M26 118 L22 128 L28 118 M62 120 L66 130 L58 118', fill: url(hid, fill), stroke: SC, 'stroke-width': 0.6 });
  return h;
}

function drawPack(id, hid) {
  if (!id) return '';
  if (id === 'pack-banner') {
    return s('rect', { x: 16, y: 28, width: 2.8, height: 70, rx: 0.6, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M19 30 H46 L41 50 H19 Z', fill: url(hid, 'crimson'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M19 50 H40 L36 66 H19 Z', fill: url(hid, 'crimson'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M24 34 Q30 42 26 48 M32 34 Q38 44 34 54', fill: 'none', stroke: '#000', 'stroke-width': 1.5, opacity: 0.25 }) +
      s('path', { d: 'M41 50 L46 48 L43 58', fill: url(hid, 'crimson'), stroke: SC, 'stroke-width': 0.5 });
  }
  if (id === 'pack-rack') {
    return s('rect', { x: 18, y: 50, width: 16, height: 16, rx: 1, fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M21 50 L18 30 L24 50 M26 50 L28 26 L30 50 M32 50 L36 32 L34 50', fill: 'none', stroke: url(hid, 'steel'), 'stroke-width': 1.6 }) +
      rivs(hid, [[21, 54], [31, 54], [21, 62], [31, 62]]);
  }
  if (id === 'pack-censer') {
    return s('rect', { x: 18, y: 50, width: 16, height: 12, rx: 1.5, fill: url(hid, 'brass'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M22 62 L20 86', stroke: url(hid, 'gold'), 'stroke-width': 1.1, fill: 'none' }) +
      s('path', { d: 'M30 62 L32 86', stroke: url(hid, 'gold'), 'stroke-width': 1.1, fill: 'none' }) +
      s('ellipse', { cx: 26, cy: 90, rx: 6, ry: 7, fill: url(hid, 'brass'), stroke: SC, 'stroke-width': SW }) +
      s('ellipse', { cx: 26, cy: 88, rx: 3, ry: 2, fill: url(hid, 'goldV') }) +
      s('circle', { cx: 22, cy: 78, r: 1.6, fill: url(hid, 'lens'), opacity: 0.7, filter: url(hid, 'fGlow') }) +
      s('circle', { cx: 30, cy: 72, r: 1.2, fill: url(hid, 'lens'), opacity: 0.5, filter: url(hid, 'fGlow') }) +
      rivs(hid, [[21, 54], [31, 54]]);
  }
  if (id === 'pack-iron') {
    return s('rect', { x: 16, y: 48, width: 20, height: 22, rx: 1.5, fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M16 54 H36', stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M18 48 C14 60 14 70 20 70', fill: 'none', stroke: url(hid, 'iron'), 'stroke-width': 1.6 }) +
      rivs(hid, [[20, 52], [32, 52], [20, 64], [32, 64]]);
  }
  if (id === 'pack-skull') {
    return s('rect', { x: 16, y: 48, width: 22, height: 24, rx: 2, fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
      s('ellipse', { cx: 27, cy: 60, rx: 7, ry: 8, fill: url(hid, 'bone'), stroke: SC, 'stroke-width': 0.8 }) +
      s('circle', { cx: 24, cy: 58, r: 1.6, fill: '#0c0806' }) +
      s('circle', { cx: 30, cy: 58, r: 1.6, fill: '#0c0806' }) +
      s('path', { d: 'M18 48 C14 62 14 74 22 76', fill: 'none', stroke: url(hid, 'iron'), 'stroke-width': 1.6 }) +
      rivs(hid, [[20, 52], [32, 52]]);
  }
  return '';
}
function drawFamiliar(id, hid) {
  if (id !== 'pack-skull') return '';
  return s('g', { transform: 'translate(80,28) rotate(-8)' },
    s('ellipse', { cx: 0, cy: 4, rx: 7, ry: 3.5, fill: url(hid, 'shadow'), opacity: 0.4 }) +
    s('ellipse', { cx: 0, cy: 0, rx: 7.6, ry: 8.6, fill: url(hid, 'bone'), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M-4 -6 Q0 -2 2 -7', fill: 'none', stroke: '#6a5040', 'stroke-width': 0.6 }) +
    ao(0, 3, 5, 3, 0.22) +
    s('ellipse', { cx: -2.6, cy: -1.2, rx: 2.4, ry: 2.8, fill: '#0c0806' }) +
    s('ellipse', { cx: 2.6, cy: -1.2, rx: 2.4, ry: 2.8, fill: '#0c0806' }) +
    s('circle', { cx: -2.6, cy: -1, r: 0.8, fill: url(hid, 'lens'), opacity: 0.7, filter: url(hid, 'fGlow') }) +
    s('circle', { cx: 2.6, cy: -1, r: 0.8, fill: url(hid, 'lens'), opacity: 0.7, filter: url(hid, 'fGlow') }) +
    s('path', { d: 'M-1.6 3.2 H1.6 V5.2 H-1.6 Z', fill: '#1c120c' }) +
    s('path', { d: 'M-4 5.4 L-2.5 7.2 L-1 5.4 L0 7.4 L1 5.4 L2.5 7.2 L4 5.4', fill: 'none', stroke: SC, 'stroke-width': 0.7 })
  );
}

function drawPeonBody(hid) {
  const sk = url(hid, 'skin');
  return ao(50, 132, 18, 5, 0.28) +
    s('path', { d: 'M42 92 L46 92 L45 124 L39 124 Z', fill: url(hid, 'robe'), stroke: SC, 'stroke-width': 0.9 }) +
    s('path', { d: 'M56 92 L60 92 L63 124 L56 124 Z', fill: url(hid, 'robe'), stroke: SC, 'stroke-width': 0.9 }) +
    s('path', { d: 'M38 122 L48 122 L49 130 L36 130 Z', fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.7 }) +
    s('path', { d: 'M54 122 L66 122 L67 130 L53 130 Z', fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.7 }) +
    s('path', { d: 'M38 50 L62 48 L70 98 L62 96 L56 108 L50 98 L44 110 L38 96 L28 102 Z', fill: url(hid, 'robe'), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M40 70 Q48 84 42 100', fill: 'none', stroke: '#000', 'stroke-width': 3.2, opacity: 0.22 }) +
    s('path', { d: 'M46 64 L54 78 L44 84 Z', fill: url(hid, 'fold') }) +
    s('path', { d: 'M36 78 L64 76', fill: 'none', stroke: url(hid, 'wood'), 'stroke-width': 1.6 }) +
    s('path', { d: 'M48 76 L50 88', stroke: '#3a2010', 'stroke-width': 1 }) +
    s('path', { d: 'M30 54 L36 52 L34 82 L26 84 Z', fill: sk, stroke: SC, 'stroke-width': 0.8 }) +
    s('path', { d: 'M64 52 L70 50 L80 84 L72 86 Z', fill: sk, stroke: SC, 'stroke-width': 0.8 }) +
    s('path', { d: 'M46 46 L54 46 L55 56 L45 56 Z', fill: sk, stroke: SC, 'stroke-width': 0.8 });
}

function drawBody(armorId, hid) {
  if (!armorId) return drawPeonBody(hid);
  const p = plate(hid, armorId), t = trim(hid, armorId);
  let h = '';
  if (armorId === 'arm-halo') {
    h += s('ellipse', { cx: 50, cy: 28, rx: 26, ry: 8, fill: 'none', stroke: url(hid, 'gold'), 'stroke-width': 2.2, opacity: 0.85, filter: url(hid, 'fGlow') });
  }
  h += s('path', { d: 'M36 96 L42 96 L44 124 L32 124 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M58 96 L64 96 L68 124 L56 124 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M30 122 L46 122 L47 131 L29 131 Z', fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M54 122 L70 122 L71 131 L53 131 Z', fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M38 108 L42 108 L43 116 L37 116 Z', fill: t }) +
    s('path', { d: 'M58 108 L62 108 L63 116 L57 116 Z', fill: t }) +
    s('path', { d: 'M34 84 L66 84 L70 98 L30 98 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M32 52 L68 52 L72 86 L28 86 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M40 48 L60 48 L64 58 L36 58 Z', fill: t, stroke: SC, 'stroke-width': 0.9 }) +
    s('path', { d: 'M48 56 L52 56 L53 82 L47 82 Z', fill: t, opacity: 0.9 }) +
    s('path', { d: 'M36 58 L40 78', fill: 'none', stroke: '#fff', 'stroke-width': 1.6, opacity: 0.22 }) +
    ao(50, 86, 16, 5, 0.28) +
    ao(28, 70, 6, 8, 0.22) +
    ao(72, 70, 6, 8, 0.22) +
    s('path', { d: 'M22 58 L36 54 L38 78 L20 86 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M78 58 L64 54 L62 78 L80 86 Z', fill: p, stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M20 84 L36 80 L34 98 L18 98 Z', fill: p, stroke: SC, 'stroke-width': 1 }) +
    s('path', { d: 'M80 84 L64 80 L66 96 L82 92 Z', fill: p, stroke: SC, 'stroke-width': 1 }) +
    rivs(hid, [[36, 60], [64, 60], [38, 78], [62, 78], [40, 90], [60, 90], [38, 114], [62, 114]]);
  if (armorId === 'arm-gilt' || armorId === 'arm-halo') {
    h += s('path', { d: 'M32 52 L68 52 L66 56 L34 56 Z', fill: url(hid, 'gold') }) +
      s('path', { d: 'M34 84 L66 84 L64 88 L36 88 Z', fill: url(hid, 'gold') }) +
      seal(hid, 42, 70, -12) + (armorId === 'arm-halo' ? seal(hid, 58, 72, 10) : '');
  }
  if (armorId === 'arm-brass') {
    h += s('path', { d: 'M32 52 L68 52', fill: 'none', stroke: url(hid, 'brass'), 'stroke-width': 2 }) +
      s('path', { d: 'M30 84 L70 84', fill: 'none', stroke: url(hid, 'brass'), 'stroke-width': 1.8 });
  }
  if (armorId === 'arm-bone') {
    h += s('path', { d: 'M44 58 Q50 70 44 80 M56 58 Q50 70 56 80', fill: 'none', stroke: url(hid, 'bone'), 'stroke-width': 1.3, opacity: 0.8 });
  }
  return h;
}

function drawPauldrons(id, hid) {
  if (!id) return '';
  const fill = (id === 'paul-gilt' || id === 'paul-sun') ? 'gold' : id === 'paul-bone' ? 'bone' : 'iron';
  const L = 'M6 62 Q8 40 30 40 L38 52 L36 74 Q8 76 6 62 Z';
  const R = 'M94 62 Q92 40 70 40 L62 52 L64 74 Q92 76 94 62 Z';
  let h = s('path', { d: L, fill: url(hid, fill), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: R, fill: url(hid, fill), stroke: SC, 'stroke-width': SW }) +
    ao(22, 68, 10, 5, 0.25) + ao(78, 68, 10, 5, 0.25) +
    rivs(hid, [[16, 50], [28, 48], [18, 64], [72, 48], [84, 50], [82, 64]]);
  if (id === 'paul-spike') {
    h += s('path', { d: 'M14 42 L20 22 L26 42 M74 42 L80 22 L86 42', fill: url(hid, 'steel'), stroke: SC, 'stroke-width': SW });
  }
  if (id === 'paul-gilt') {
    h += s('path', { d: 'M8 46 L34 48', fill: 'none', stroke: url(hid, 'goldV'), 'stroke-width': 1.6 }) +
      s('path', { d: 'M66 48 L92 46', fill: 'none', stroke: url(hid, 'goldV'), 'stroke-width': 1.6 }) +
      seal(hid, 22, 72, -14) + seal(hid, 78, 72, 12);
  }
  if (id === 'paul-bone') {
    h += s('path', { d: 'M10 50 Q22 44 34 52 M66 52 Q78 44 90 50', fill: 'none', stroke: url(hid, 'bone'), 'stroke-width': 2 });
  }
  if (id === 'paul-sun') {
    const rays = (cx) => {
      let r = '';
      for (let i = 0; i < 5; i++) {
        const a = -110 + i * 30, rad = a * Math.PI / 180;
        r += s('path', { d: 'M' + cx + ' 48 L' + (cx + Math.cos(rad) * 16) + ' ' + (48 + Math.sin(rad) * 14), stroke: url(hid, 'gold'), 'stroke-width': 1.4, fill: 'none' });
      }
      return r;
    };
    h += rays(22) + rays(78);
  }
  return h;
}

function drawPeonHead(armored, hid) {
  const sk = url(hid, 'skin');
  let h = '';
  // Gaunt face first so the hood can wrap over it
  h += s('ellipse', { cx: 50, cy: 34, rx: 9.5, ry: 11.5, fill: sk, stroke: SC, 'stroke-width': SW }) +
    ao(50, 40, 6, 4, 0.28) +
    s('path', { d: 'M42 30 Q46 18 50 20 Q54 18 58 30 Q52 24 50 24 Q48 24 42 30', fill: url(hid, 'hair'), stroke: SC, 'stroke-width': 0.6 }) +
    s('path', { d: 'M43 28 L40 22 M57 28 L60 21 M48 20 L47 16 M52 20 L54 16', stroke: url(hid, 'hair'), 'stroke-width': 1.1, fill: 'none' }) +
    s('path', { d: 'M44 30 Q46 32 48 30', fill: 'none', stroke: '#1c120c', 'stroke-width': 0.7, opacity: 0.45 }) +
    s('path', { d: 'M52 30 Q54 32 56 30', fill: 'none', stroke: '#1c120c', 'stroke-width': 0.7, opacity: 0.45 }) +
    s('circle', { cx: 46.2, cy: 33, r: 1.15, fill: '#1c120c' }) +
    s('circle', { cx: 53.8, cy: 33, r: 1.15, fill: '#1c120c' }) +
    s('path', { d: 'M47 40 Q50 40.5 53 40', fill: 'none', stroke: '#5a3828', 'stroke-width': 0.8 }) +
    s('path', { d: 'M45 42 Q50 44 55 42', fill: 'none', stroke: '#3a2418', 'stroke-width': 0.5, opacity: 0.5 });
  if (!armored) {
    h += s('path', { d: 'M32 50 Q26 20 50 10 Q74 20 68 50 L62 50 Q60 34 54 24 Q50 20 46 24 Q40 34 38 50 Z', fill: url(hid, 'robe'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M40 48 Q50 28 60 48', fill: 'none', stroke: '#120c0a', 'stroke-width': 3, opacity: 0.35 }) +
      s('path', { d: 'M36 24 Q42 16 50 14', fill: 'none', stroke: url(hid, 'fold'), 'stroke-width': 1.4, opacity: 0.7 });
  }
  return h;
}

function drawHelm(id, armorId, hid) {
  if (!id) return drawPeonHead(!!armorId, hid);
  const goldish = id === 'helm-mask' || id === 'helm-phoenix';
  const fill = goldish ? 'gold' : id === 'helm-skull' ? 'bone' : 'iron';
  let h = s('path', { d: 'M32 42 Q30 12 50 8 Q70 12 68 42 L64 50 L36 50 Z', fill: url(hid, fill), stroke: SC, 'stroke-width': SW }) +
    s('path', { d: 'M36 42 L64 42 L62 50 L38 50 Z', fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': 0.8 }) +
    ao(50, 48, 12, 4, 0.25);
  if (id === 'helm-iron' || id === 'helm-crest' || id === 'helm-laurel' || id === 'helm-horn' || id === 'helm-phoenix') {
    h += s('rect', { x: 38, y: 26, width: 24, height: 5, rx: 1, fill: '#0c0a08', stroke: SC, 'stroke-width': 0.5 }) +
      s('rect', { x: 39, y: 27, width: 22, height: 3, rx: 0.6, fill: url(hid, id === 'helm-phoenix' ? 'lens' : 'lensC'), opacity: 0.85, filter: url(hid, 'fGlow') });
  }
  if (id === 'helm-crest' || id === 'helm-phoenix') {
    const c = id === 'helm-phoenix' ? 'gold' : 'blood';
    h += s('path', { d: 'M46 12 L50 0 L54 12 Q58 8 56 14 L50 8 L44 14 Q42 8 46 12 Z', fill: url(hid, c), stroke: SC, 'stroke-width': SW });
    if (id === 'helm-phoenix') h += s('path', { d: 'M50 0 Q60 10 54 16', fill: url(hid, 'blood'), stroke: SC, 'stroke-width': 0.8 }) + rivs(hid, [[50, 18], [40, 22], [60, 22]]);
  }
  if (id === 'helm-laurel') {
    h += s('path', { d: 'M32 24 Q22 30 30 42 M68 24 Q78 30 70 42', fill: 'none', stroke: '#4a8a3a', 'stroke-width': 2.2 }) +
      s('path', { d: 'M30 26 L26 22 M28 32 L22 30 M32 38 L26 40 M70 26 L74 22 M72 32 L78 30 M68 38 L74 40', stroke: '#3a6a2a', 'stroke-width': 1.4, fill: 'none' });
  }
  if (id === 'helm-horn') {
    h += s('path', { d: 'M32 22 L14 6 L18 20 L32 30 Z', fill: url(hid, 'bone'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M68 22 L86 6 L82 20 L68 30 Z', fill: url(hid, 'bone'), stroke: SC, 'stroke-width': SW }) +
      ao(20, 14, 4, 3, 0.2) + ao(80, 14, 4, 3, 0.2);
  }
  if (id === 'helm-skull' || id === 'helm-mask') {
    h += s('ellipse', { cx: 50, cy: 30, rx: 14, ry: 16, fill: url(hid, fill), stroke: SC, 'stroke-width': 0.8 }) +
      s('circle', { cx: 44, cy: 28, r: 3.2, fill: '#0c0a08' }) +
      s('circle', { cx: 56, cy: 28, r: 3.2, fill: '#0c0a08' }) +
      s('circle', { cx: 44, cy: 28, r: 1.5, fill: url(hid, 'lens'), filter: url(hid, 'fGlow') }) +
      s('circle', { cx: 56, cy: 28, r: 1.5, fill: url(hid, 'lens'), filter: url(hid, 'fGlow') }) +
      s('path', { d: 'M46 37 H54 V40 H46 Z', fill: '#1c120c' }) +
      s('path', { d: 'M44 40.5 L46 44 L48 40.5 L50 44.5 L52 40.5 L54 44 L56 40.5', fill: 'none', stroke: SC, 'stroke-width': 0.75 });
    if (id === 'helm-mask') h += s('path', { d: 'M32 20 Q50 10 68 20', fill: 'none', stroke: url(hid, 'goldV'), 'stroke-width': 1.6 }) + seal(hid, 62, 46, 12);
  }
  if (id === 'helm-iron') h += rivs(hid, [[38, 18], [62, 18], [36, 36], [64, 36]]);
  if (id === 'helm-phoenix') h += seal(hid, 36, 44, -16) + seal(hid, 64, 44, 16);
  return h;
}

function teeth(x1, y1, x2, y2, n, hid) {
  let h = '', dx = (x2 - x1) / n, dy = (y2 - y1) / n;
  const px = -(y2 - y1) / n, py = (x2 - x1) / n;
  const len = Math.hypot(px, py) || 1;
  const ux = px / len * 3.2, uy = py / len * 3.2;
  for (let i = 0; i < n; i++) {
    const x = x1 + dx * (i + 0.5), y = y1 + dy * (i + 0.5);
    h += s('path', { d: 'M' + (x - dx * 0.3) + ' ' + (y - dy * 0.3) + ' L' + (x + ux) + ' ' + (y + uy) + ' L' + (x + dx * 0.3) + ' ' + (y + dy * 0.3) + ' Z', fill: url(hid, 'steel'), stroke: SC, 'stroke-width': 0.4 });
  }
  return h;
}

function drawWeapon(id, hid) {
  const g = (inner) => s('g', { transform: 'translate(80,88)' }, inner);
  if (!id) {
    return g(
      s('rect', { x: -1.5, y: -2, width: 3.2, height: 28, rx: 0.6, fill: url(hid, 'rust'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M-6 -4 L8 -4 L7 4 L10 7 L0 12 L-8 7 L-5 4 Z', fill: url(hid, 'rust'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M-1 8 L1 14', stroke: '#3a2010', 'stroke-width': 0.7 })
    );
  }
  if (id === 'wep-blade' || id === 'wep-rune') {
    return g(
      s('rect', { x: -1.6, y: 0, width: 3.2, height: 16, rx: 0.5, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('rect', { x: -5, y: -3, width: 10, height: 4, rx: 0.6, fill: url(hid, 'iron'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M-3 -3 L3 -3 L2 -36 L0 -42 L-2 -36 Z', fill: url(hid, 'steel'), stroke: SC, 'stroke-width': SW }) +
      (id === 'wep-rune'
        ? teeth(-2, -8, -2, -34, 7, hid) + s('path', { d: 'M0 -8 V-32 M-2 -18 H2 M-2 -26 H2', fill: 'none', stroke: url(hid, 'lensC'), 'stroke-width': 0.8, filter: url(hid, 'fGlow') })
        : s('path', { d: 'M0 -6 L0 -34', stroke: '#fff', 'stroke-width': 0.7, opacity: 0.3 }))
    );
  }
  if (id === 'wep-axe') {
    return g(
      s('rect', { x: -1.6, y: -16, width: 3.2, height: 36, rx: 0.5, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M1.6 -14 L20 -20 L22 -6 L20 2 L1.6 4 Z', fill: url(hid, 'iron'), stroke: SC, 'stroke-width': SW }) +
      teeth(20, -18, 20, 0, 6, hid) +
      rivs(hid, [[6, -8]])
    );
  }
  if (id === 'wep-maul') {
    return g(
      s('rect', { x: -1.6, y: -2, width: 3.2, height: 22, rx: 0.5, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('rect', { x: -8, y: -20, width: 16, height: 18, rx: 1.5, fill: url(hid, 'iron'), stroke: url(hid, 'lensC'), 'stroke-width': 1.3 }) +
      s('path', { d: 'M-4 -22 L-6 -30 M0 -20 L0 -32 M4 -22 L6 -30', stroke: url(hid, 'lensC'), 'stroke-width': 1.2, fill: 'none', filter: url(hid, 'fGlowS') }) +
      rivs(hid, [[-4, -12], [4, -12]])
    );
  }
  if (id === 'wep-sun') {
    return g(
      s('rect', { x: -2, y: -4, width: 18, height: 7, rx: 1.2, fill: url(hid, 'iron'), stroke: SC, 'stroke-width': SW }) +
      s('rect', { x: -6, y: -2, width: 6, height: 10, rx: 0.8, fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': 0.8 }) +
      s('circle', { cx: 18, cy: -0.5, r: 4.2, fill: url(hid, 'lens'), filter: url(hid, 'fGlowS') }) +
      s('circle', { cx: 18, cy: -0.5, r: 2, fill: '#fff8d0', opacity: 0.8 })
    );
  }
  if (id === 'wep-rifle') {
    return g(
      s('rect', { x: -8, y: -3, width: 36, height: 5, rx: 0.8, fill: url(hid, 'ironV'), stroke: SC, 'stroke-width': SW }) +
      s('rect', { x: -4, y: 2, width: 8, height: 12, rx: 0.8, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('rect', { x: 22, y: -5, width: 10, height: 3.2, rx: 0.5, fill: url(hid, 'iron'), stroke: SC, 'stroke-width': 0.6 }) +
      s('rect', { x: 6, y: 2, width: 5, height: 8, fill: url(hid, 'iron'), stroke: SC, 'stroke-width': 0.5 }) +
      rivs(hid, [[4, -0.5], [16, -0.5]])
    );
  }
  if (id === 'wep-glaive') {
    return g(
      s('rect', { x: -1.3, y: -28, width: 2.6, height: 48, rx: 0.5, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M0 -28 L16 -42 L10 -16 L0 -20 Z', fill: url(hid, 'steel'), stroke: SC, 'stroke-width': SW }) +
      s('path', { d: 'M8 -36 L20 -48 L14 -28', fill: url(hid, 'lens'), opacity: 0.7, filter: url(hid, 'fGlowS'), stroke: url(hid, 'gold'), 'stroke-width': 0.6 })
    );
  }
  if (id === 'wep-storm') {
    return g(
      s('rect', { x: -2, y: -6, width: 4, height: 26, rx: 0.6, fill: url(hid, 'wood'), stroke: SC, 'stroke-width': 0.8 }) +
      s('path', { d: 'M-16 -8 L-12 -32 L12 -32 L16 -8 L8 -4 L-8 -4 Z', fill: url(hid, 'iron'), stroke: url(hid, 'gold'), 'stroke-width': 1.4 }) +
      s('path', { d: 'M-8 -32 L-11 -46 L-5 -34 M0 -32 L0 -50 M8 -32 L11 -46 L5 -34', stroke: url(hid, 'lens'), 'stroke-width': 1.5, fill: 'none', filter: url(hid, 'fGlowS') }) +
      s('circle', { cx: 0, cy: -18, r: 4.2, fill: 'none', stroke: url(hid, 'gold'), 'stroke-width': 1.1 }) +
      s('path', { d: 'M-16 -16 H16', stroke: url(hid, 'gold'), 'stroke-width': 0.8 }) +
      rivs(hid, [[-8, -16], [8, -16], [0, -10]])
    );
  }
  return '';
}

function drawHand(armored, hid) {
  if (armored) {
    return s('g', { transform: 'translate(80,88)' },
      s('ellipse', { cx: 0, cy: 2, rx: 5.5, ry: 4.5, fill: url(hid, 'iron'), stroke: SC, 'stroke-width': SW }) +
      riv(hid, -1, 1, 0.8)
    );
  }
  return s('g', { transform: 'translate(80,88)' },
    s('ellipse', { cx: 0, cy: 2, rx: 4.2, ry: 3.4, fill: url(hid, 'skin'), stroke: SC, 'stroke-width': 0.8 })
  );
}

function bestRarity(eq) {
  let best = 0, color = null;
  for (const slot in eq) {
    const it = ITEM_BY_ID[eq[slot]];
    if (it && RARITY[it.rarity].rank > best) { best = RARITY[it.rarity].rank; color = RARITY[it.rarity].color; }
  }
  return { rank: best, color: color };
}

const ICON_CROP = {
  helm: '22 0 56 58',
  pauldrons: '0 34 100 52',
  armor: '16 16 68 118',
  weapon: '54 16 56 118',
  pack: '8 16 44 96',
  'pack-skull': '8 8 90 92',
  cape: '10 20 80 116',
  base: '10 114 80 26'
};

function heroSvg(eq, size, cropSlot) {
  eq = eq || (xpState && xpState.equipped) || {};
  const hid = 'h' + (++_hid);
  const w = size || 90, h = Math.round(w * 1.4);
  const rare = bestRarity(eq);
  const vb = (cropSlot === 'pack' && eq.pack && ICON_CROP[eq.pack]) || (cropSlot && ICON_CROP[cropSlot]) || '0 0 100 140';
  const cls = 'hero-svg' + (rare.rank >= 5 ? ' leg' : '');
  const glow = (!cropSlot && rare.color) ? s('ellipse', { cx: 50, cy: 70, rx: 40, ry: 58, fill: rare.color, opacity: 0.14 }) : '';
  const sheen = (!cropSlot && rare.rank >= 5) ? s('ellipse', { class: 'leg-sheen', cx: 44, cy: 58, rx: 22, ry: 40, fill: url(hid, 'gold'), opacity: 0.12, 'pointer-events': 'none' }) : '';
  let inner = '';
  if (cropSlot === 'base') inner = drawBase(eq.base, hid);
  else if (cropSlot === 'cape') inner = drawCape(eq.cape, hid);
  else if (cropSlot === 'pack') inner = drawPack(eq.pack, hid) + drawFamiliar(eq.pack, hid);
  else if (cropSlot === 'armor') inner = drawBody(eq.armor, hid);
  else if (cropSlot === 'pauldrons') inner = drawBody(eq.armor || 'arm-iron', hid) + drawPauldrons(eq.pauldrons, hid);
  else if (cropSlot === 'helm') inner = drawHelm(eq.helm, eq.armor || 'arm-iron', hid);
  else if (cropSlot === 'weapon') inner = drawWeapon(eq.weapon, hid) + drawHand(true, hid);
  else {
    inner = drawBase(eq.base, hid) + drawCape(eq.cape, hid) + drawPack(eq.pack, hid) +
      drawBody(eq.armor, hid) + drawPauldrons(eq.pauldrons, hid) + drawHelm(eq.helm, eq.armor, hid) +
      drawWeapon(eq.weapon, hid) + drawHand(!!eq.armor, hid) + drawFamiliar(eq.pack, hid);
  }
  return s('svg', { class: cls, xmlns: 'http://www.w3.org/2000/svg', viewBox: vb, width: w, height: cropSlot ? Math.round(w * 1.15) : h, 'aria-hidden': 'true' },
    heroDefs(hid) + glow + inner + sheen
  );
}

function miniItemSvg(item) {
  return heroSvg({ [item.slot]: item.id }, 88, item.slot);
}


function rarityWeights() {
  const boost = Math.min(15, Math.max(0, ((xpState && xpState.level) || 1) - 1));
  const rest = 50;
  return RARITY_WEIGHTS.map(([r, w]) => r === 'common' ? [r, 50 - boost] : [r, w + boost * (w / rest)]);
}
function rollItem() {
  const n = Math.random() * 100;
  let acc = 0, rarity = 'common';
  for (const [r, w] of rarityWeights()) { acc += w; if (n < acc) { rarity = r; break; } }
  const pool = ITEMS.filter(i => i.rarity === rarity);
  return (pool.length ? pool : ITEMS.filter(i => i.rarity === 'common'))[Math.floor(Math.random() * (pool.length || 1))];
}

function obtainItem(item) {
  lootEnsure();
  const was = xpState.inventory[item.id] || 0;
  xpState.inventory[item.id] = was + 1;
  const cur = ITEM_BY_ID[xpState.equipped[item.slot]];
  if (!cur || RARITY[item.rarity].rank > RARITY[cur.rarity].rank) xpState.equipped[item.slot] = item.id;
  lootSave();
  return was > 0;
}

function awardLevelChests(fromLevel, toLevel) {
  lootEnsure();
  let n = 0;
  for (let L = (fromLevel | 0) + 1; L <= (toLevel | 0); L++) {
    const key = String(L);
    if (xpState.levelChests[key]) continue;
    xpState.levelChests[key] = 1;
    xpState.chests += 1;
    n++;
  }
  if (!n) return;
  lootSave();
  renderDock();
  showChestToast();
}
function awardChest(carKey) {
  lootEnsure();
  if (carKey && xpState.chestAwarded[carKey]) return;
  if (carKey) xpState.chestAwarded[carKey] = 1;
  xpState.chests += 1;
  lootSave();
  renderDock();
  showChestToast();
}

function showChestToast() {
  document.querySelectorAll('.chesttoast').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'chesttoast';
  el.textContent = 'Reliquary Chest earned';
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.remove(), 1800);
}

function playChestOpen() {
  if (typeof sfxReady !== 'function' || !sfxReady()) return;
  const t = actx.currentTime;
  tone('sine', 90, t, 0.35, 0.2, 140);
  burst(t, 0.25, 0.2, 400, 80);
  tone('triangle', 180, t + 0.12, 0.3, 0.12, 90);
  [[880, 0.22, 0.16], [1174, 0.3, 0.14], [1568, 0.38, 0.18], [2340, 0.46, 0.12]].forEach(([f, dly, vol]) => {
    tone('sine', f, t + dly, 0.35, vol, f * 0.96);
  });
}

function chestSvg(open) {
  return s('svg', { class: 'chest-svg', viewBox: '0 0 120 100', width: 180, height: 150, 'aria-hidden': 'true' },
    s('ellipse', { cx: 60, cy: 88, rx: 40, ry: 6, fill: '#000', opacity: 0.4 }) +
    (open ? s('ellipse', { cx: 60, cy: 48, rx: 34, ry: 20, fill: '#e8c76a', opacity: 0.45, class: 'chest-glow' }) : '') +
    s('rect', { x: 20, y: 48, width: 80, height: 36, rx: 3, fill: '#5a3e14', stroke: '#c4a35a', 'stroke-width': 2 }) +
    s('rect', { x: 56, y: 58, width: 8, height: 10, rx: 1, fill: '#c4a35a', stroke: '#0a0806' }) +
    s('g', { class: open ? 'chest-lid open' : 'chest-lid', style: 'transform-origin:60px 48px' },
      s('path', { d: 'M18 50 Q60 18 102 50 L96 50 Q60 28 24 50 Z', fill: '#6e4a18', stroke: '#c4a35a', 'stroke-width': 2 }) +
      s('rect', { x: 54, y: 34, width: 12, height: 8, fill: '#c4a35a', stroke: '#0a0806' })
    )
  );
}

function openChest() {
  lootEnsure();
  if (xpState.chests < 1) return;
  xpState.chests -= 1;
  const item = rollItem();
  const dup = obtainItem(item);
  renderDock();
  playChestOpen();
  const rar = RARITY[item.rarity];
  const over = document.createElement('div');
  over.className = 'chestover';
  over.innerHTML = '<div class="cheststage">' + chestSvg(false) + '<div class="chest-sparks"></div></div>';
  document.body.append(over);
  const sparks = over.querySelector('.chest-sparks');
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('i');
    const a = (Math.PI * 2 * i) / 12, d = 30 + Math.random() * 40;
    p.style.setProperty('--dx', Math.cos(a) * d + 'px');
    p.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px');
    p.style.animationDelay = (0.25 + Math.random() * 0.25) + 's';
    sparks.append(p);
  }
  setTimeout(() => {
    const stage = over.querySelector('.cheststage');
    if (stage) stage.innerHTML = chestSvg(true) + '<div class="chest-sparks"></div>' + sparks.outerHTML;
  }, 160);
  setTimeout(() => {
    over.innerHTML = '<div class="chestreveal" style="--rar:' + rar.color + '">' +
      miniItemSvg(item) +
      '<b>' + esc(item.name) + '</b>' +
      '<span class="rartag" style="color:' + rar.color + '">' + rar.name + (dup ? ' · Duplicate' : '') + '</span>' +
      '<button type="button" class="big">Take it</button></div>';
    over.querySelector('button').onclick = () => { over.remove(); renderDock(); };
  }, 850);
  over.addEventListener('click', ev => { if (ev.target === over && over.querySelector('.chestreveal')) { over.remove(); renderDock(); } });
}

function renderDock() {
  lootEnsure();
  let dock = $('#herodock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'herodock';
    dock.className = 'herodock';
    document.body.append(dock);
  }
  const n = xpState.chests | 0;
  dock.innerHTML =
    '<button type="button" id="chestbtn" class="chestbtn"' + (n ? '' : ' hidden') + ' aria-label="Open Reliquary Chest">' +
      'Reliquary Chest' + (n ? '<span class="chestbadge">' + n + '</span>' : '') +
    '</button>' +
    '<button type="button" id="herobtn" class="herobtn" aria-label="Open Armory">' + heroSvg(xpState.equipped, 90) + '</button>';
  const cb = $('#chestbtn'), hb = $('#herobtn');
  if (cb) cb.onclick = openChest;
  if (hb) hb.onclick = openArmory;
}

function openArmory() {
  lootEnsure();
  document.querySelectorAll('.armory').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'armory';
  el.innerHTML = '<div class="armbox">' +
    '<header class="armhd"><h2>Armory</h2><button type="button" class="hdrbtn" data-arm-close="1">Close</button></header>' +
    '<div class="armprev" id="armprev"></div>' +
    '<div class="armslots" id="armslots"></div>' +
    '<div class="armlist" id="armlist"></div>' +
    '</div>';
  document.body.append(el);
  let slot = 'helm';
  const paint = () => {
    $('#armprev').innerHTML = heroSvg(xpState.equipped, 240);
    $('#armslots').innerHTML = LOOT_SLOTS.map(([id, lab]) => {
      const on = slot === id ? ' on' : '';
      const eq = ITEM_BY_ID[xpState.equipped[id]];
      return '<button type="button" class="armslot' + on + '" data-slot="' + id + '">' + lab + (eq ? '<small>' + esc(eq.name) + '</small>' : '<small>Empty</small>') + '</button>';
    }).join('');
    const owned = ITEMS.filter(i => i.slot === slot && (xpState.inventory[i.id] || 0) > 0);
    $('#armlist').innerHTML = owned.length ? owned.map(i => {
      const rar = RARITY[i.rarity];
      const n = xpState.inventory[i.id] || 0;
      const on = xpState.equipped[slot] === i.id;
      return '<div class="armitem' + (on ? ' on' : '') + '" style="--rar:' + rar.color + '">' +
        '<div class="armico">' + miniItemSvg(i) + '</div>' +
        '<div><b>' + esc(i.name) + '</b><span class="rartag" style="color:' + rar.color + '">' + rar.name +
        (n > 1 ? ' · Duplicate ×' + n : '') + '</span></div>' +
        '<button type="button" data-eq="' + i.id + '">' + (on ? 'Unequip' : 'Equip') + '</button></div>';
    }).join('') : '<p class="small">No relics in this slot yet. Finish a car to earn a Reliquary Chest.</p>';
    $('#armslots').onclick = ev => { const b = ev.target.closest('[data-slot]'); if (b) { slot = b.dataset.slot; paint(); } };
    $('#armlist').onclick = ev => {
      const b = ev.target.closest('[data-eq]'); if (!b) return;
      const it = ITEM_BY_ID[b.dataset.eq]; if (!it) return;
      if (xpState.equipped[it.slot] === it.id) delete xpState.equipped[it.slot];
      else xpState.equipped[it.slot] = it.id;
      lootSave();
      paint();
      renderDock();
    };
  };
  paint();
  el.addEventListener('click', ev => {
    if (ev.target === el || ev.target.closest('[data-arm-close]')) el.remove();
  });
}

function initLoot() {
  lootEnsure();
  renderDock();
  try {
    if (/(?:^|[?&])debug=chest(?:&|$)/.test(location.search || '')) awardChest('');
  } catch (e) {}
}

window.PLLoot = { award: awardChest, awardLevels: awardLevelChests, init: initLoot, render: renderDock, svg: heroSvg };
