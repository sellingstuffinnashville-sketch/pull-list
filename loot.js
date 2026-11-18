// Reliquary chests + Armory. Original names and inline SVG only (no trademarked terms, no copied art).
'use strict';

const CLASSES = {
  warrior: { name: 'Warrior', blurb: 'Plate and steel', slots: { helm: 'Helm', pauldrons: 'Pauldrons', armor: 'Armor', weapon: 'Weapon', pack: 'Pack', cape: 'Cape', base: 'Base' } },
  shooter: { name: 'Shooter', blurb: 'Guns and carapace', slots: { helm: 'Helmet', pauldrons: 'Shoulders', armor: 'Armor', weapon: 'Gun', pack: 'Pack', cape: 'Coat', base: 'Base' } },
  mage: { name: 'Mage', blurb: 'Staff and warp fire', slots: { helm: 'Hood', pauldrons: 'Mantle', armor: 'Robe', weapon: 'Staff', pack: 'Tome', cape: 'Cloak', base: 'Base' } }
};
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
  { id: 'wep-rifle', cls: 'shooter', slot: 'weapon', name: 'Heavy Slug Rifle', rarity: 'common' },
  { id: 'wep-axe', slot: 'weapon', name: 'Toothed Axe', rarity: 'uncommon' },
  { id: 'wep-maul', slot: 'weapon', name: 'Crackling Maul', rarity: 'uncommon' },
  { id: 'wep-carbine', cls: 'shooter', slot: 'weapon', name: 'Drum-Fed Carbine', rarity: 'uncommon' },
  { id: 'wep-rune', slot: 'weapon', name: 'Rune-Tooth Blade', rarity: 'rare' },
  { id: 'wep-sun', cls: 'shooter', slot: 'weapon', name: 'Sunburst Pistol', rarity: 'rare' },
  { id: 'wep-glaive', slot: 'weapon', name: 'Burning Glaive', rarity: 'relic' },
  { id: 'wep-slug', cls: 'shooter', slot: 'weapon', name: 'Mass-Slug Cannon', rarity: 'relic' },
  { id: 'wep-storm', slot: 'weapon', name: 'Storm-Head Hammer', rarity: 'legendary' },
  { id: 'wep-siege', cls: 'shooter', slot: 'weapon', name: 'Siege Repeater', rarity: 'legendary' },
  { id: 'pack-iron', slot: 'pack', name: 'Iron Supply Pack', rarity: 'common' },
  { id: 'pack-banner', slot: 'pack', name: 'Tattered Battle Banner', rarity: 'uncommon' },
  { id: 'pack-rack', slot: 'pack', name: 'Spiked Trophy Rack', rarity: 'uncommon' },
  { id: 'pack-censer', slot: 'pack', name: 'Incense Censer Pack', rarity: 'rare' },
  { id: 'pack-skull', slot: 'pack', name: 'Hovering Skull Familiar', rarity: 'relic' },
  { id: 'cape-ash', slot: 'cape', name: 'Tattered Ash Cape', rarity: 'common' },
  { id: 'cape-crimson', slot: 'cape', name: 'Crimson Cape', rarity: 'uncommon' },
  { id: 'cape-night', slot: 'cape', name: 'Gold-Trimmed Night Cape', rarity: 'rare' },
  { id: 'base-rubble', cls: 'all', slot: 'base', name: 'Rubble Base', rarity: 'common' },
  { id: 'base-gear', cls: 'all', slot: 'base', name: 'Brass Gear Base', rarity: 'uncommon' },
  { id: 'base-skulls', cls: 'all', slot: 'base', name: 'Skull-Strewn Base', rarity: 'rare' },
  // Shooter pool (grimdark gunner); the guns above are his too
  { id: 'wep-revolver', cls: 'shooter', slot: 'weapon', name: 'Heavy Revolver', rarity: 'common' },
  { id: 'wep-boltc', cls: 'shooter', slot: 'weapon', name: 'Bolt Carbine', rarity: 'rare' },
  { id: 'sh-helm-cap', cls: 'shooter', slot: 'helm', name: 'Field Cap', rarity: 'common' },
  { id: 'sh-helm-flak', cls: 'shooter', slot: 'helm', name: 'Flak Helmet', rarity: 'common' },
  { id: 'sh-helm-mask', cls: 'shooter', slot: 'helm', name: 'Rebreather Mask', rarity: 'uncommon' },
  { id: 'sh-helm-visor', cls: 'shooter', slot: 'helm', name: 'Carapace Visor Helm', rarity: 'rare' },
  { id: 'sh-helm-peak', cls: 'shooter', slot: 'helm', name: 'Officer\'s Peaked Cap', rarity: 'relic' },
  { id: 'sh-helm-sun', cls: 'shooter', slot: 'helm', name: 'Sun-Warden Helm', rarity: 'legendary' },
  { id: 'sh-paul-pad', cls: 'shooter', slot: 'pauldrons', name: 'Flak Pads', rarity: 'common' },
  { id: 'sh-paul-plate', cls: 'shooter', slot: 'pauldrons', name: 'Carapace Shoulders', rarity: 'uncommon' },
  { id: 'sh-paul-stripe', cls: 'shooter', slot: 'pauldrons', name: 'Marksman Plates', rarity: 'rare' },
  { id: 'sh-paul-gilt', cls: 'shooter', slot: 'pauldrons', name: 'Gilded Epaulettes', rarity: 'relic' },
  { id: 'sh-arm-flak', cls: 'shooter', slot: 'armor', name: 'Flak Vest', rarity: 'common' },
  { id: 'sh-arm-quilt', cls: 'shooter', slot: 'armor', name: 'Padded Flak Coat', rarity: 'common' },
  { id: 'sh-arm-carapace', cls: 'shooter', slot: 'armor', name: 'Carapace Armor', rarity: 'uncommon' },
  { id: 'sh-arm-urban', cls: 'shooter', slot: 'armor', name: 'Urban Carapace', rarity: 'uncommon' },
  { id: 'sh-arm-storm', cls: 'shooter', slot: 'armor', name: 'Storm Carapace', rarity: 'rare' },
  { id: 'sh-arm-gilt', cls: 'shooter', slot: 'armor', name: 'Gilded Carapace', rarity: 'relic' },
  { id: 'sh-arm-halo', cls: 'shooter', slot: 'armor', name: 'Sun-Warden Carapace', rarity: 'legendary' },
  { id: 'sh-pack-ammo', cls: 'shooter', slot: 'pack', name: 'Ammo Satchel', rarity: 'common' },
  { id: 'sh-pack-vox', cls: 'shooter', slot: 'pack', name: 'Vox Pack', rarity: 'uncommon' },
  { id: 'sh-pack-rack', cls: 'shooter', slot: 'pack', name: 'Grenade Rack', rarity: 'rare' },
  { id: 'sh-pack-drone', cls: 'shooter', slot: 'pack', name: 'Spotter Drone', rarity: 'relic' },
  { id: 'sh-cape-coat', cls: 'shooter', slot: 'cape', name: 'Field Greatcoat', rarity: 'common' },
  { id: 'sh-cape-camo', cls: 'shooter', slot: 'cape', name: 'Camo Cloak', rarity: 'uncommon' },
  { id: 'sh-cape-officer', cls: 'shooter', slot: 'cape', name: 'Black Officer\'s Coat', rarity: 'rare' },
  // Mage pool (hooded psychic caster)
  { id: 'mg-helm-hood', cls: 'mage', slot: 'helm', name: 'Deep Hood', rarity: 'common' },
  { id: 'mg-helm-cowl', cls: 'mage', slot: 'helm', name: 'Rune Cowl', rarity: 'uncommon' },
  { id: 'mg-helm-circlet', cls: 'mage', slot: 'helm', name: 'Silver Circlet', rarity: 'uncommon' },
  { id: 'mg-helm-crystal', cls: 'mage', slot: 'helm', name: 'Crystal-Spined Hood', rarity: 'rare' },
  { id: 'mg-helm-mask', cls: 'mage', slot: 'helm', name: 'Seer\'s Silver Mask', rarity: 'relic' },
  { id: 'mg-helm-crown', cls: 'mage', slot: 'helm', name: 'Crown of Warp Fire', rarity: 'legendary' },
  { id: 'mg-paul-fur', cls: 'mage', slot: 'pauldrons', name: 'Fur Mantle', rarity: 'common' },
  { id: 'mg-paul-bone', cls: 'mage', slot: 'pauldrons', name: 'Bone Mantle', rarity: 'uncommon' },
  { id: 'mg-paul-crystal', cls: 'mage', slot: 'pauldrons', name: 'Crystal Spaulders', rarity: 'rare' },
  { id: 'mg-paul-gilt', cls: 'mage', slot: 'pauldrons', name: 'Gilded Mantle', rarity: 'relic' },
  { id: 'mg-arm-grey', cls: 'mage', slot: 'armor', name: 'Ash-Grey Robe', rarity: 'common' },
  { id: 'mg-arm-blue', cls: 'mage', slot: 'armor', name: 'Novice Robe', rarity: 'common' },
  { id: 'mg-arm-bone', cls: 'mage', slot: 'armor', name: 'Bone-Bead Robe', rarity: 'uncommon' },
  { id: 'mg-arm-violet', cls: 'mage', slot: 'armor', name: 'Warp-Stitched Robe', rarity: 'uncommon' },
  { id: 'mg-arm-crimson', cls: 'mage', slot: 'armor', name: 'Crimson Seer Robe', rarity: 'rare' },
  { id: 'mg-arm-star', cls: 'mage', slot: 'armor', name: 'Star-Woven Robe', rarity: 'relic' },
  { id: 'mg-arm-eye', cls: 'mage', slot: 'armor', name: 'Robe of the Golden Eye', rarity: 'legendary' },
  { id: 'mg-wep-stick', cls: 'mage', slot: 'weapon', name: 'Gnarled Staff', rarity: 'common' },
  { id: 'mg-wep-iron', cls: 'mage', slot: 'weapon', name: 'Iron Force Staff', rarity: 'common' },
  { id: 'mg-wep-skull', cls: 'mage', slot: 'weapon', name: 'Skull-Topped Staff', rarity: 'uncommon' },
  { id: 'mg-wep-orb', cls: 'mage', slot: 'weapon', name: 'Orb Staff', rarity: 'uncommon' },
  { id: 'mg-wep-crystal', cls: 'mage', slot: 'weapon', name: 'Crystal Staff', rarity: 'rare' },
  { id: 'mg-wep-sword', cls: 'mage', slot: 'weapon', name: 'Force Sword', rarity: 'rare' },
  { id: 'mg-wep-eye', cls: 'mage', slot: 'weapon', name: 'Staff of the Open Eye', rarity: 'relic' },
  { id: 'mg-wep-storm', cls: 'mage', slot: 'weapon', name: 'Warp-Storm Staff', rarity: 'legendary' },
  { id: 'mg-pack-scrolls', cls: 'mage', slot: 'pack', name: 'Scroll Case', rarity: 'common' },
  { id: 'mg-pack-candles', cls: 'mage', slot: 'pack', name: 'Candle Rack', rarity: 'uncommon' },
  { id: 'mg-pack-tome', cls: 'mage', slot: 'pack', name: 'Chained Tome', rarity: 'rare' },
  { id: 'mg-pack-grimoire', cls: 'mage', slot: 'pack', name: 'Floating Grimoire', rarity: 'relic' },
  { id: 'mg-cape-grey', cls: 'mage', slot: 'cape', name: 'Wanderer\'s Cloak', rarity: 'common' },
  { id: 'mg-cape-star', cls: 'mage', slot: 'cape', name: 'Star Cloak', rarity: 'uncommon' },
  { id: 'mg-cape-void', cls: 'mage', slot: 'cape', name: 'Void-Black Cloak', rarity: 'rare' }
];
const ITEM_BY_ID = {};
ITEMS.forEach(i => { if (!i.cls) i.cls = 'warrior'; ITEM_BY_ID[i.id] = i; });

function lootEnsure() {
  if (!xpState.chestAwarded || typeof xpState.chestAwarded !== 'object') xpState.chestAwarded = {};
  if (!xpState.levelChests || typeof xpState.levelChests !== 'object') xpState.levelChests = {};
  if (!xpState.inventory || typeof xpState.inventory !== 'object') xpState.inventory = {};
  if (!xpState.equipped || typeof xpState.equipped !== 'object') xpState.equipped = {};
  if (typeof xpState.chests !== 'number' || xpState.chests < 0) xpState.chests = 0;
  if (!CLASSES[xpState.cls]) xpState.cls = 'warrior';
  if (!xpState.classes || typeof xpState.classes !== 'object') xpState.classes = {};
  if (!xpState.classesV) {
    // one-time: guns now belong to the Shooter, so move any the Warrior found over to him
    xpState.classesV = 1;
    if (xpState.cls === 'warrior') {
      const sh = xpState.classes.shooter || (xpState.classes.shooter = { inventory: {}, equipped: {} });
      for (const id in xpState.inventory) {
        const it = ITEM_BY_ID[id];
        if (it && it.cls === 'shooter') {
          sh.inventory[id] = (sh.inventory[id] || 0) + xpState.inventory[id];
          delete xpState.inventory[id];
          if (xpState.equipped.weapon === id) { delete xpState.equipped.weapon; if (!sh.equipped.weapon) sh.equipped.weapon = id; }
        }
      }
    }
  }
}
function curClass() { return (xpState && CLASSES[xpState.cls]) ? xpState.cls : 'warrior'; }
function classItem(i, cls) { return i.cls === (cls || curClass()) || i.cls === 'all'; }
function setClass(c) {
  if (!CLASSES[c]) return;
  lootEnsure();
  const cur = curClass();
  if (c === cur) return;
  xpState.classes[cur] = { inventory: xpState.inventory, equipped: xpState.equipped };
  const nx = xpState.classes[c] || { inventory: {}, equipped: {} };
  xpState.inventory = nx.inventory || {};
  xpState.equipped = nx.equipped || {};
  delete xpState.classes[c];
  xpState.cls = c;
  lootSave();
  renderDock();
  try { document.dispatchEvent(new CustomEvent('pl-class')); } catch (e) {}
}
function classEquipped(c) {
  if (c === curClass()) return xpState.equipped || {};
  return ((xpState.classes || {})[c] || {}).equipped || {};
}
function classPickerHtml() {
  lootEnsure();
  return '<div class="classpick" role="radiogroup" aria-label="Class">' + Object.keys(CLASSES).map(c => {
    const on = c === curClass();
    return '<button type="button" role="radio" aria-checked="' + on + '" class="classbtn' + (on ? ' on' : '') + '" data-cls="' + c + '">' +
      heroSvg(Object.assign({ _cls: c }, classEquipped(c)), 60, 'portrait') + '<b>' + CLASSES[c].name + '</b><small>' + CLASSES[c].blurb + '</small></button>';
  }).join('') + '</div>';
}
function wireClassPicker(root) {
  root.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => {
    setClass(b.dataset.cls);
    const box = root.querySelector('.classpick');
    if (box) box.outerHTML = classPickerHtml();
    wireClassPicker(root);
  });
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
  const portrait = cropSlot === 'portrait';
  if (portrait) cropSlot = '';
  if (!eq._cls) eq = Object.assign({ _cls: curClass() }, eq);
  const rare = bestRarity(eq);
  const src = window.PLPixel ? PLPixel.hero(eq, cropSlot ? 0 : rare.rank, cropSlot ? null : rare.color, cropSlot || '') : '';
  const cls = 'hero-svg hero-px' + (cropSlot ? ' hero-ico' : '') + (portrait ? ' hero-portrait' : '') + (!cropSlot && rare.rank >= 5 ? ' leg' : '') + (!cropSlot && rare.rank === 4 ? ' relic' : '');
  return '<img class="' + cls + '" src="' + src + '" alt="" draggable="false"' + (size ? ' data-size="' + size + '"' : '') + '>';
}

const ITEM_RR = { common: 1, uncommon: 2, rare: 3, relic: 4, legendary: 5 };
const SLOT_BONUS = {
  weapon: { atk: 4, crit: 2 },
  armor: { def: 2, hp: 4 },
  helm: { def: 2, hp: 2 },
  pauldrons: { def: 2 },
  cape: { def: 1, hp: 2 },
  pack: { atk: 1, spd: 1 },
  base: { def: 1 }
};
function itemBonuses(item) {
  const rk = ITEM_RR[item && item.rarity] || 0;
  const base = SLOT_BONUS[item && item.slot] || {};
  const out = {};
  for (const k in base) out[k] = base[k] * rk;
  return out;
}
function itemBonusLabel(item) {
  const b = itemBonuses(item);
  const order = [['atk', 'ATK'], ['def', 'DEF'], ['hp', 'HP'], ['spd', 'SPD'], ['crit', 'CRIT']];
  const parts = [];
  for (const [k, lab] of order) if (b[k]) parts.push('+' + b[k] + ' ' + lab);
  return parts.join(', ');
}
function itemBonusHtml(item) {
  const lab = itemBonusLabel(item);
  return lab ? '<span class="itembonus">' + lab + '</span>' : '';
}

function miniItemSvg(item) {
  return heroSvg({ _cls: item.cls === 'all' ? curClass() : item.cls, [item.slot]: item.id }, 88, item.slot);
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
  let pool = ITEMS.filter(i => i.rarity === rarity && classItem(i));
  if (!pool.length) pool = ITEMS.filter(i => i.rarity === 'common' && classItem(i));
  return pool[Math.floor(Math.random() * pool.length)];
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
      itemBonusHtml(item) +
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
    (window.PLBattle && PLBattle.active() ? '' : '<button type="button" id="herobtn" class="herobtn' + (function () { const r = bestRarity(xpState.equipped); return r.rank >= 5 ? ' leg' : r.rank === 4 ? ' relic' : ''; })() + '" aria-label="Open Armory">' + heroSvg(xpState.equipped, 90) + '<span class="herohit"></span></button>');
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
    '<div class="armstats" id="armstats"></div>' +
    '<div class="armslots" id="armslots"></div>' +
    '<div class="armlist" id="armlist"></div>' +
    '</div>';
  document.body.append(el);
  let slot = 'helm';
  const paint = () => {
    $('#armprev').innerHTML = heroSvg(xpState.equipped, 240);
    if (window.PLBattle) {
      const st = PLBattle.stats(xpState.equipped, xpState.level), k = PLBattle.kills();
      $('#armstats').innerHTML = '<span>HP <b>' + st.hp + '</b></span><span>ATK <b>' + st.atk + '</b></span><span>DEF <b>' + (st.def != null ? st.def : st.arm) + '</b></span><span>SPD <b>' + (st.spd || 0) + '</b></span><span>CRIT <b>' + (st.crit || 0) + '%</b></span><span>Kills <b>' + k.kills + '</b></span>' + (k.elites ? '<span>Elites <b>' + k.elites + '</b></span>' : '');
    }
    $('#armslots').innerHTML = LOOT_SLOTS.map(([id, lab0]) => {
      const lab = CLASSES[curClass()].slots[id] || lab0;
      const on = slot === id ? ' on' : '';
      const eq = ITEM_BY_ID[xpState.equipped[id]];
      return '<button type="button" class="armslot' + on + '" data-slot="' + id + '">' + lab + (eq ? '<small>' + esc(eq.name) + '</small>' : '<small>Empty</small>') + '</button>';
    }).join('');
    const owned = ITEMS.filter(i => i.slot === slot && classItem(i) && (xpState.inventory[i.id] || 0) > 0);
    $('#armlist').innerHTML = owned.length ? owned.map(i => {
      const rar = RARITY[i.rarity];
      const n = xpState.inventory[i.id] || 0;
      const on = xpState.equipped[slot] === i.id;
      return '<div class="armitem' + (on ? ' on' : '') + '" style="--rar:' + rar.color + '">' +
        '<div class="armico">' + miniItemSvg(i) + '</div>' +
        '<div><b>' + esc(i.name) + '</b><span class="rartag" style="color:' + rar.color + '">' + rar.name +
        (n > 1 ? ' · Duplicate ×' + n : '') + '</span>' + itemBonusHtml(i) + '</div>' +
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

window.PLLoot = { award: awardChest, awardLevels: awardLevelChests, init: initLoot, render: renderDock, svg: heroSvg, setClass: setClass, cls: curClass, picker: classPickerHtml, wirePicker: wireClassPicker, itemBonuses: itemBonuses, itemBonusLabel: itemBonusLabel };
