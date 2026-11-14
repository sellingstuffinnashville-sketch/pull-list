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
function iron() { return '#3a3530'; }
function stroke() { return { stroke: '#0a0806', 'stroke-width': 1 }; }

function drawBase(id) {
  if (id === 'base-gear') {
    return s('ellipse', { cx: 40, cy: 112, rx: 30, ry: 7, fill: '#5a3e14', stroke: '#c4a35a', 'stroke-width': 1.2 }) +
      s('circle', { cx: 28, cy: 111, r: 5, fill: 'none', stroke: '#c4a35a', 'stroke-width': 1.4 }) +
      s('circle', { cx: 52, cy: 111, r: 4, fill: 'none', stroke: '#8a6e34', 'stroke-width': 1.2 });
  }
  if (id === 'base-skulls') {
    return s('ellipse', { cx: 40, cy: 112, rx: 30, ry: 7, fill: '#2a2418', stroke: '#0a0806' }) +
      s('circle', { cx: 26, cy: 110, r: 3.4, fill: '#d8d0c0' }) +
      s('circle', { cx: 40, cy: 111, r: 3, fill: '#c8c0b0' }) +
      s('circle', { cx: 54, cy: 110, r: 3.2, fill: '#d8d0c0' });
  }
  if (id === 'base-rubble') {
    return s('ellipse', { cx: 40, cy: 112, rx: 30, ry: 7, fill: '#3a342c', stroke: '#0a0806' }) +
      s('rect', { x: 22, y: 108, width: 8, height: 5, fill: '#5a5248', transform: 'rotate(-12 26 110)' }) +
      s('rect', { x: 48, y: 108, width: 10, height: 4, fill: '#4a443c', transform: 'rotate(10 53 110)' });
  }
  return s('ellipse', { cx: 40, cy: 112, rx: 26, ry: 5.5, fill: '#1a1612', opacity: 0.7 });
}
function drawCape(id) {
  if (!id) return '';
  const col = id === 'cape-crimson' ? '#6e1414' : id === 'cape-night' ? '#121018' : '#4a463e';
  const trim = id === 'cape-night' ? '#c4a35a' : id === 'cape-crimson' ? '#3a0a0a' : '#2a2824';
  return s('path', { d: 'M24 34 Q40 28 56 34 L66 96 Q40 108 14 96 Z', fill: col, stroke: trim, 'stroke-width': id === 'cape-night' ? 1.6 : 1 }) +
    (id === 'cape-ash' ? s('path', { d: 'M18 88 L22 96 L16 94 Z M60 86 L66 96 L58 94 Z', fill: col, stroke: trim }) : '');
}
function drawPack(id) {
  if (id === 'pack-banner') {
    return s('rect', { x: 18, y: 20, width: 2.4, height: 58, fill: '#2a2418', stroke: '#0a0806' }) +
      s('path', { d: 'M20 22 H42 L38 34 H20 Z', fill: '#6e1414', stroke: '#0a0806' }) +
      s('path', { d: 'M20 34 H36 L32 44 H20 Z', fill: '#4a0e0e', stroke: '#0a0806' });
  }
  if (id === 'pack-rack') {
    return s('rect', { x: 22, y: 36, width: 10, height: 14, fill: '#2a2418', stroke: '#0a0806' }) +
      s('path', { d: 'M24 36 L22 24 L26 36 M30 36 L32 22 L34 36', fill: 'none', stroke: '#8a8680', 'stroke-width': 1.4 });
  }
  if (id === 'pack-censer') {
    return s('rect', { x: 22, y: 38, width: 10, height: 10, rx: 1, fill: '#4a3a18', stroke: '#c4a35a' }) +
      s('path', { d: 'M24 48 L23 62 M30 48 L31 62', fill: 'none', stroke: '#c4a35a', 'stroke-width': 1 }) +
      s('circle', { cx: 27, cy: 64, r: 4, fill: '#3a2a10', stroke: '#c4a35a' }) +
      s('circle', { cx: 24, cy: 58, r: 1.2, fill: '#e8c76a', opacity: 0.7 }) +
      s('circle', { cx: 30, cy: 54, r: 1, fill: '#e8c76a', opacity: 0.5 });
  }
  if (id === 'pack-iron') {
    return s('rect', { x: 20, y: 36, width: 14, height: 18, rx: 1, fill: '#2a2622', stroke: '#0a0806' }) +
      s('rect', { x: 22, y: 38, width: 10, height: 4, fill: '#1a1612' });
  }
  return '';
}
function drawFamiliar(id) {
  if (id !== 'pack-skull') return '';
  return s('g', { transform: 'translate(58,18)' },
    s('ellipse', { cx: 0, cy: 0, rx: 7, ry: 8, fill: '#d8d0c0', stroke: '#0a0806' }) +
    s('circle', { cx: -2.5, cy: -1, r: 1.6, fill: '#1a0a0a' }) +
    s('circle', { cx: 2.5, cy: -1, r: 1.6, fill: '#1a0a0a' }) +
    s('path', { d: 'M-2 3 H2', stroke: '#0a0806', 'stroke-width': 1 })
  );
}
function armorColor(id) {
  return {
    'arm-iron': '#4a4540',
    'arm-brass': '#4a4540',
    'arm-bone': '#d8d0c0',
    'arm-night': '#16141c',
    'arm-blood': '#6e1414',
    'arm-gilt': '#8a6e34',
    'arm-halo': '#c4a35a'
  }[id] || '#3a3530';
}
function armorTrim(id) {
  return {
    'arm-brass': '#b08a3a',
    'arm-bone': '#8a8070',
    'arm-gilt': '#e8c76a',
    'arm-halo': '#fff3c0',
    'arm-blood': '#3a0a0a',
    'arm-night': '#4a4558'
  }[id] || '#1a1612';
}
function drawBody(armorId) {
  const c = armorColor(armorId);
  const t = armorTrim(armorId);
  const leg = '#2e2a26';
  return s('rect', { x: 27, y: 74, width: 11, height: 28, rx: 2, fill: leg, stroke: '#0a0806' }) +
    s('rect', { x: 42, y: 74, width: 11, height: 28, rx: 2, fill: leg, stroke: '#0a0806' }) +
    s('rect', { x: 25, y: 100, width: 15, height: 8, rx: 1, fill: '#1a1612', stroke: '#0a0806' }) +
    s('rect', { x: 40, y: 100, width: 15, height: 8, rx: 1, fill: '#1a1612', stroke: '#0a0806' }) +
    s('rect', { x: 28, y: 66, width: 24, height: 10, rx: 1, fill: c, stroke: '#0a0806' }) +
    s('path', { d: 'M26 36 L54 36 L56 66 L24 66 Z', fill: c, stroke: '#0a0806' }) +
    s('rect', { x: 36, y: 40, width: 8, height: 22, rx: 1, fill: t, opacity: 0.85 }) +
    (armorId === 'arm-halo' ? s('circle', { cx: 40, cy: 48, r: 16, fill: 'none', stroke: '#fff3c0', 'stroke-width': 1.4, opacity: 0.7 }) : '') +
    s('rect', { x: 14, y: 38, width: 12, height: 30, rx: 2, fill: c, stroke: '#0a0806' }) +
    s('rect', { x: 54, y: 38, width: 12, height: 26, rx: 2, fill: c, stroke: '#0a0806' }) +
    s('rect', { x: 36, y: 30, width: 8, height: 7, fill: c, stroke: '#0a0806' });
}
function drawPauldrons(id) {
  const c = id === 'paul-gilt' || id === 'paul-sun' ? '#c4a35a' : id === 'paul-bone' ? '#d8d0c0' : id === 'paul-spike' ? '#4a4540' : '#3a3530';
  const trim = id === 'paul-bone' ? '#d8d0c0' : id === 'paul-gilt' || id === 'paul-sun' ? '#e8c76a' : '#1a1612';
  let h = s('rect', { x: 10, y: 30, width: 18, height: 14, rx: 3, fill: c, stroke: '#0a0806' }) +
    s('rect', { x: 52, y: 30, width: 18, height: 14, rx: 3, fill: c, stroke: '#0a0806' });
  if (id === 'paul-spike') {
    h += s('path', { d: 'M14 30 L19 18 L24 30 M56 30 L61 18 L66 30', fill: trim, stroke: '#0a0806' });
  }
  if (id === 'paul-gilt') {
    h += s('rect', { x: 16, y: 43, width: 3, height: 7, fill: '#d8d0c0', stroke: '#8a6e34' }) +
      s('rect', { x: 61, y: 43, width: 3, height: 7, fill: '#d8d0c0', stroke: '#8a6e34' });
  }
  if (id === 'paul-sun') {
    h += s('path', { d: 'M19 30 L19 20 M15 32 L10 24 M23 32 L28 24 M61 30 L61 20 M57 32 L52 24 M65 32 L70 24', fill: 'none', stroke: '#e8c76a', 'stroke-width': 1.3 });
  }
  return h;
}
function drawHelm(id) {
  const c = id === 'helm-mask' || id === 'helm-phoenix' ? '#c4a35a' : id === 'helm-skull' ? '#c8c0b0' : '#3a3530';
  let h = s('rect', { x: 28, y: 10, width: 24, height: 22, rx: 4, fill: c, stroke: '#0a0806' }) +
    s('rect', { x: 32, y: 18, width: 16, height: 4, fill: '#0a0806' });
  if (id === 'helm-crest' || id === 'helm-phoenix') {
    const cc = id === 'helm-phoenix' ? '#6e1414' : '#8a1a1a';
    h += s('path', { d: 'M38 10 L40 0 L42 10 Z', fill: cc, stroke: '#0a0806' }) +
      s('path', { d: 'M40 0 Q46 6 42 10', fill: cc, stroke: '#0a0806' });
  }
  if (id === 'helm-laurel') {
    h += s('path', { d: 'M28 16 Q20 20 26 28 M52 16 Q60 20 54 28', fill: 'none', stroke: '#5a9a4a', 'stroke-width': 2 });
  }
  if (id === 'helm-horn') {
    h += s('path', { d: 'M28 14 L16 4 L30 18 M52 14 L64 4 L50 18', fill: '#d8d0c0', stroke: '#0a0806' });
  }
  if (id === 'helm-skull' || id === 'helm-mask') {
    h += s('circle', { cx: 36, cy: 19, r: 2.1, fill: '#0a0806' }) +
      s('circle', { cx: 44, cy: 19, r: 2.1, fill: '#0a0806' }) +
      s('path', { d: 'M36 25 H44', stroke: '#0a0806', 'stroke-width': 1.2 });
  }
  if (id === 'helm-iron' || !id) {
    h += s('rect', { x: 30, y: 12, width: 20, height: 6, fill: '#2a2622' });
  }
  return h;
}
function drawWeapon(id) {
  if (!id) return '';
  const right = 'translate(58,44)';
  if (id === 'wep-blade' || id === 'wep-rune') {
    const blade = id === 'wep-rune' ? '#b0c0d0' : '#8a8680';
    return s('g', { transform: right },
      s('rect', { x: 4, y: 8, width: 3, height: 18, fill: '#3a2a18', stroke: '#0a0806' }) +
      s('rect', { x: 1, y: 6, width: 9, height: 3, fill: '#4a4540', stroke: '#0a0806' }) +
      s('path', { d: 'M5.5 6 L8 -16 L3 -16 Z', fill: blade, stroke: '#0a0806' }) +
      (id === 'wep-rune' ? s('path', { d: 'M5.5 -2 V-12 M3 -8 H8', fill: 'none', stroke: '#4a8ad8', 'stroke-width': 0.8 }) : '')
    );
  }
  if (id === 'wep-axe') {
    return s('g', { transform: right },
      s('rect', { x: 5, y: -8, width: 3, height: 36, fill: '#3a2a18', stroke: '#0a0806' }) +
      s('path', { d: 'M8 -6 L22 -2 L22 8 L8 6 Z', fill: '#6a6560', stroke: '#0a0806' }) +
      s('path', { d: 'M22 -2 L24 0 L24 6 L22 8', fill: 'none', stroke: '#0a0806' })
    );
  }
  if (id === 'wep-maul') {
    return s('g', { transform: right },
      s('rect', { x: 5, y: 0, width: 3, height: 28, fill: '#3a2a18', stroke: '#0a0806' }) +
      s('rect', { x: 0, y: -10, width: 13, height: 12, rx: 1, fill: '#4a4540', stroke: '#4a8ad8' }) +
      s('path', { d: 'M2 -12 L4 -16 M11 -12 L13 -16 M6.5 -10 V-18', stroke: '#8ab0e8', 'stroke-width': 1 })
    );
  }
  if (id === 'wep-sun') {
    return s('g', { transform: right },
      s('rect', { x: 2, y: 6, width: 16, height: 6, rx: 1, fill: '#4a4540', stroke: '#0a0806' }) +
      s('rect', { x: 0, y: 7, width: 5, height: 8, fill: '#2a2622', stroke: '#0a0806' }) +
      s('circle', { cx: 18, cy: 9, r: 3, fill: '#c4a35a', stroke: '#e8c76a' })
    );
  }
  if (id === 'wep-rifle') {
    return s('g', { transform: right },
      s('rect', { x: -4, y: 8, width: 34, height: 4, fill: '#3a3530', stroke: '#0a0806' }) +
      s('rect', { x: 0, y: 12, width: 6, height: 10, fill: '#2a2418', stroke: '#0a0806' }) +
      s('rect', { x: 26, y: 7, width: 8, height: 3, fill: '#2a2622' })
    );
  }
  if (id === 'wep-glaive') {
    return s('g', { transform: right },
      s('rect', { x: 6, y: -20, width: 2.4, height: 50, fill: '#3a2a18', stroke: '#0a0806' }) +
      s('path', { d: 'M7 -20 L18 -28 L14 -10 L7 -12 Z', fill: '#c45a2a', stroke: '#e8c76a' })
    );
  }
  if (id === 'wep-storm') {
    return s('g', { transform: right },
      s('rect', { x: 5, y: 0, width: 4, height: 28, fill: '#3a2a18', stroke: '#0a0806' }) +
      s('rect', { x: -4, y: -14, width: 22, height: 16, rx: 1, fill: '#4a4540', stroke: '#e8c76a', 'stroke-width': 1.4 }) +
      s('path', { d: 'M7 -14 V-24 L10 -18 L7 -24', fill: 'none', stroke: '#e8c76a', 'stroke-width': 1.2 })
    );
  }
  return '';
}

function bestRarity(eq) {
  let best = 0, color = null;
  for (const slot in eq) {
    const it = ITEM_BY_ID[eq[slot]];
    if (it && RARITY[it.rarity].rank > best) { best = RARITY[it.rarity].rank; color = RARITY[it.rarity].color; }
  }
  return color;
}

function heroSvg(eq, size) {
  eq = eq || (xpState && xpState.equipped) || {};
  const w = size || 90, h = Math.round(w * 1.35);
  const glow = bestRarity(eq);
  return s('svg', { class: 'hero-svg', viewBox: '0 0 80 120', width: w, height: h, 'aria-hidden': 'true' },
    (glow ? s('ellipse', { cx: 40, cy: 64, rx: 34, ry: 48, fill: glow, opacity: 0.18 }) : '') +
    drawBase(eq.base) +
    drawCape(eq.cape) +
    drawPack(eq.pack) +
    drawBody(eq.armor) +
    drawPauldrons(eq.pauldrons) +
    drawHelm(eq.helm) +
    drawWeapon(eq.weapon) +
    drawFamiliar(eq.pack)
  );
}

function miniItemSvg(item) {
  const eq = {};
  eq[item.slot] = item.id;
  return heroSvg(eq, 72);
}

function rollItem() {
  const n = Math.random() * 100;
  let acc = 0, rarity = 'common';
  for (const [r, w] of RARITY_WEIGHTS) { acc += w; if (n < acc) { rarity = r; break; } }
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
    $('#armprev').innerHTML = heroSvg(xpState.equipped, 160);
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

window.PLLoot = { award: awardChest, init: initLoot, render: renderDock };
