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

function bestRarity(eq) {
  let best = 0, color = null;
  for (const slot in eq) {
    const it = ITEM_BY_ID[eq[slot]];
    if (it && RARITY[it.rarity].rank > best) { best = RARITY[it.rarity].rank; color = RARITY[it.rarity].color; }
  }
  return { rank: best, color: color };
}

// Hero and item art are pixel sprites drawn by px.js (PLPixel); these wrappers keep the old call sites.
function heroSvg(eq, size, cropSlot) {
  eq = eq || (xpState && xpState.equipped) || {};
  const rare = bestRarity(eq);
  const src = window.PLPixel ? PLPixel.hero(eq, cropSlot ? 0 : rare.rank, cropSlot ? null : rare.color, cropSlot || '') : '';
  const cls = 'hero-svg hero-px' + (cropSlot ? ' hero-ico' : '') + (!cropSlot && rare.rank >= 5 ? ' leg' : '') + (!cropSlot && rare.rank === 4 ? ' relic' : '');
  return '<img class="' + cls + '" src="' + src + '" alt="" draggable="false"' + (size ? ' data-size="' + size + '"' : '') + '>';
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

function chestSvg(frame, color) {
  const src = window.PLPixel ? PLPixel.chest(frame | 0, color || '') : '';
  return '<img class="chest-svg chest-px" src="' + src + '" alt="" draggable="false">';
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
  over.innerHTML = '<div class="cheststage shake" style="--rar:' + rar.color + '">' + chestSvg(0, rar.color) + '<div class="chest-sparks"></div></div>';
  document.body.append(over);
  const stage = over.querySelector('.cheststage');
  const sparks = over.querySelector('.chest-sparks');
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i');
    const a = (Math.PI * 2 * i) / 14, d = 34 + Math.random() * 44;
    p.style.setProperty('--dx', Math.cos(a) * d + 'px');
    p.style.setProperty('--dy', Math.sin(a) * d - 24 + 'px');
    p.style.animationDelay = (0.32 + Math.random() * 0.25) + 's';
    sparks.append(p);
  }
  const img = () => stage.querySelector('.chest-px');
  setTimeout(() => { const i = img(); if (i) i.src = PLPixel.chest(1, rar.color); }, 260);
  setTimeout(() => { const i = img(); if (i) i.src = PLPixel.chest(2, rar.color); stage.classList.remove('shake'); stage.classList.add('open'); }, 400);
  setTimeout(() => {
    over.innerHTML = '<div class="chestreveal" style="--rar:' + rar.color + '">' +
      miniItemSvg(item) +
      '<b>' + esc(item.name) + '</b>' +
      '<span class="rartag" style="color:' + rar.color + '">' + rar.name + (dup ? ' · Duplicate' : '') + '</span>' +
      '<button type="button" class="big">Take it</button></div>';
    over.querySelector('button').onclick = () => { over.remove(); renderDock(); };
  }, 1150);
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
      (n ? '<img class="chestico" src="' + (window.PLPixel ? PLPixel.chest(0, '') : '') + '" alt="">' : '') + 'Reliquary Chest' + (n ? '<span class="chestbadge">' + n + '</span>' : '') +
    '</button>' +
    '<button type="button" id="herobtn" class="herobtn' + (function () { const r = bestRarity(xpState.equipped); return r.rank >= 5 ? ' leg' : r.rank === 4 ? ' relic' : ''; })() + '" aria-label="Open Armory">' + heroSvg(xpState.equipped, 90) + '<span class="herohit"></span></button>';
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
