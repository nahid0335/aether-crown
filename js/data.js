// Core Data Models: Elements, Tokens, 8-Stat Schema (CR cap 100%), Star/Level Caps & Skills
export const ELEM_ICON = { fire: '🔥', grass: '🌿', water: '💧' };
export const ELEM_ART = { fire: 'assets/fire.jpg', grass: 'assets/grass.jpg', water: 'assets/water.jpg' };
export function getHeroArt(heroId) { return `assets/heroes/${heroId}.jpg`; }

// Fire > Grass > Water > Fire (+25% outgoing, -15% incoming)
export function getElementalMultiplier(a, d) {
  if ((a === 'fire' && d === 'grass') || (a === 'grass' && d === 'water') || (a === 'water' && d === 'fire')) return 1.25;
  if ((d === 'fire' && a === 'grass') || (d === 'grass' && a === 'water') || (d === 'water' && a === 'fire')) return 0.85;
  return 1.0;
}

export const TOKENS = {
  bronze: { id: 'bronze', name: 'Bronze Sigil', weights: { common: 0.84, uncommon: 0.14, rare: 0.02 }, cycleSize: 100, maxLegendPerCycle: 0, fragmentsPerToken: 100 },
  silver: { id: 'silver', name: 'Silver Relic', weights: { rare: 0.82, epic: 0.17, legend: 0.01 }, cycleSize: 200, maxLegendPerCycle: 4, fragmentsPerToken: 100 },
  gold: { id: 'gold', name: 'Gold Crown', weights: { epic: 0.94, legend: 0.06 }, cycleSize: 100, maxLegendPerCycle: 10, fragmentsPerToken: 100 },
  platinum: { id: 'platinum', name: 'Platinum Eclipse', weights: { legend: 1.0 }, cycleSize: 1, maxLegendPerCycle: 1 }
};

export const HERO_SUMMON_FRAGMENT_COST = 100;
export const REST_AREA_MAX_SLOTS = 5;

export function getMaxLv(star) {
  return Math.min(60, star * 10);
}

// 8 stats: hp, def, atk, spd, acc, res, cr (capped at 1.0 / 100%), cd
// Lead skills appear ONLY on Epic and Legend
export const HEROES = [
  { id: 'c_ember', name: 'Ember Imp', rarity: 'common', element: 'fire', baseStats: { hp: 95, atk: 20, def: 8, spd: 102, acc: 0.05, res: 0.05, cr: 0.06, cd: 1.50 }, skills: [{ id: 's1', name: 'Spark Bite', type: 'active', unlockStar: 1, mult: 1.05, cd: 0 }] },
  { id: 'c_sprout', name: 'Moss Sprout', rarity: 'common', element: 'grass', baseStats: { hp: 115, atk: 16, def: 13, spd: 94, acc: 0.05, res: 0.08, cr: 0.05, cd: 1.50 }, skills: [{ id: 's1', name: 'Vine Tap', type: 'active', unlockStar: 1, mult: 1.0, cd: 0 }] },
  { id: 'c_droplet', name: 'Tide Slime', rarity: 'common', element: 'water', baseStats: { hp: 105, atk: 18, def: 11, spd: 98, acc: 0.06, res: 0.06, cr: 0.05, cd: 1.50 }, skills: [{ id: 's1', name: 'Splash', type: 'active', unlockStar: 1, mult: 1.0, cd: 0 }] },
  { id: 'u_pyrofox', name: 'Cinder Fox', rarity: 'uncommon', element: 'fire', baseStats: { hp: 125, atk: 27, def: 11, spd: 112, acc: 0.10, res: 0.08, cr: 0.09, cd: 1.55 }, skills: [{ id: 's1', name: 'Flame Dash', type: 'active', unlockStar: 1, mult: 1.05, cd: 0 }, { id: 's2', name: 'Scorch Tail', type: 'active', unlockStar: 2, mult: 1.45, cd: 2, staminaSteal: 15 }] },
  { id: 'u_thorn', name: 'Thorn Stag', rarity: 'uncommon', element: 'grass', baseStats: { hp: 150, atk: 22, def: 17, spd: 100, acc: 0.08, res: 0.12, cr: 0.07, cd: 1.50 }, skills: [{ id: 's1', name: 'Antler Strike', type: 'active', unlockStar: 1, mult: 1.0, cd: 0 }, { id: 's2', name: 'Bark Guard', type: 'passive', unlockStar: 2, defBonusPct: 0.15 }] },
  { id: 'r_blazehound', name: 'Blaze Hound', rarity: 'rare', element: 'fire', baseStats: { hp: 170, atk: 38, def: 16, spd: 118, acc: 0.14, res: 0.10, cr: 0.12, cd: 1.60 }, skills: [{ id: 's1', name: 'Fang Ember', type: 'active', unlockStar: 1, mult: 1.05, cd: 0 }, { id: 's2', name: 'Inferno Rush', type: 'active', unlockStar: 2, mult: 1.6, cd: 2, staminaBoostSelf: 25 }, { id: 's3', name: 'Bloodlust', type: 'passive', unlockStar: 3, crBonus: 0.10, cdBonus: 0.20 }] },
  { id: 'r_sylph', name: 'Verdant Sylph', rarity: 'rare', element: 'grass', baseStats: { hp: 185, atk: 32, def: 19, spd: 116, acc: 0.15, res: 0.16, cr: 0.10, cd: 1.55 }, skills: [{ id: 's1', name: 'Leaf Dart', type: 'active', unlockStar: 1, mult: 1.0, cd: 0 }, { id: 's2', name: 'Tailwind Gift', type: 'active', unlockStar: 2, healPct: 0.25, staminaGiveAlly: 30, cd: 3 }, { id: 's3', name: 'Breeze Aura', type: 'passive', unlockStar: 3, spdBonus: 10 }] },
  { id: 'r_glacier', name: 'Frost Drake', rarity: 'rare', element: 'water', baseStats: { hp: 205, atk: 34, def: 23, spd: 106, acc: 0.16, res: 0.15, cr: 0.10, cd: 1.55 }, skills: [{ id: 's1', name: 'Ice Claw', type: 'active', unlockStar: 1, mult: 1.0, cd: 0 }, { id: 's2', name: 'Chilling Roar', type: 'active', unlockStar: 2, mult: 1.4, speedDebuff: 0.2, cd: 3 }, { id: 's3', name: 'Glacial Shell', type: 'passive', unlockStar: 3, defBonusPct: 0.2, resBonus: 0.10 }] },
  { id: 'e_ignis', name: 'Ignis Valkyrie', rarity: 'epic', element: 'fire', baseStats: { hp: 235, atk: 54, def: 22, spd: 126, acc: 0.20, res: 0.16, cr: 0.15, cd: 1.70 }, skills: [{ id: 's1', name: 'Sun Spear', type: 'active', unlockStar: 1, mult: 1.1, cd: 0 }, { id: 's2', name: 'Blazing Dive', type: 'active', unlockStar: 2, mult: 1.75, cd: 2 }, { id: 's3', name: 'Siphon Heat', type: 'active', unlockStar: 3, mult: 1.45, staminaSteal: 30, cd: 3 }, { id: 's4', name: 'Valkyrie Lead', type: 'lead', unlockStar: 4, teamAtkPct: 0.18, teamSpd: 8 }] },
  { id: 'e_leviathan', name: 'Abyssal Lancer', rarity: 'epic', element: 'water', baseStats: { hp: 250, atk: 50, def: 25, spd: 124, acc: 0.24, res: 0.18, cr: 0.14, cd: 1.65 }, skills: [{ id: 's1', name: 'Tidal Thrust', type: 'active', unlockStar: 1, mult: 1.05, cd: 0 }, { id: 's2', name: 'Riptide Surge', type: 'active', unlockStar: 2, mult: 1.65, speedBuff: 0.2, cd: 3 }, { id: 's3', name: 'Deep Current', type: 'passive', unlockStar: 3, staminaPerTurn: 12 }, { id: 's4', name: 'Oceanic Lead', type: 'lead', unlockStar: 4, teamSpd: 14, teamAcc: 0.10 }] },
  { id: 'l_solaris', name: 'Solaris, Ash Phoenix', rarity: 'legend', element: 'fire', baseStats: { hp: 320, atk: 74, def: 28, spd: 135, acc: 0.28, res: 0.22, cr: 0.20, cd: 1.85 }, skills: [{ id: 's1', name: 'Ember Talon', type: 'active', unlockStar: 1, mult: 1.15, cd: 0 }, { id: 's2', name: 'Solar Drain', type: 'active', unlockStar: 2, mult: 1.75, staminaSteal: 35, cd: 2 }, { id: 's3', name: 'Phoenix Haste', type: 'passive', unlockStar: 3, spdBonus: 18 }, { id: 's4', name: 'Supernova', type: 'active', unlockStar: 4, mult: 2.5, aoe: true, cd: 4 }, { id: 's5', name: 'Apex Flame Lead', type: 'lead', unlockStar: 5, teamAtkPct: 0.25, teamSpd: 12, teamCr: 0.08 }] },
  { id: 'l_yggdrasil', name: 'Sylvara, Worldwarden', rarity: 'legend', element: 'grass', baseStats: { hp: 380, atk: 60, def: 38, spd: 124, acc: 0.25, res: 0.30, cr: 0.15, cd: 1.75 }, skills: [{ id: 's1', name: 'Root Lash', type: 'active', unlockStar: 1, mult: 1.1, cd: 0 }, { id: 's2', name: 'Vital Bloom', type: 'active', unlockStar: 2, healPct: 0.35, staminaGiveAlly: 40, cd: 3 }, { id: 's3', name: 'Living Bark', type: 'passive', unlockStar: 3, defBonusPct: 0.28, resBonus: 0.12 }, { id: 's4', name: 'Verdant Judgment', type: 'active', unlockStar: 4, mult: 2.2, speedDebuff: 0.25, cd: 4 }, { id: 's5', name: 'Worldtree Lead', type: 'lead', unlockStar: 5, teamHpPct: 0.25, teamSpd: 10, teamRes: 0.15 }] },
  { id: 'l_poseidon', name: 'Nereus, Tide Sovereign', rarity: 'legend', element: 'water', baseStats: { hp: 340, atk: 68, def: 32, spd: 132, acc: 0.30, res: 0.24, cr: 0.18, cd: 1.80 }, skills: [{ id: 's1', name: 'Trident Arc', type: 'active', unlockStar: 1, mult: 1.15, cd: 0 }, { id: 's2', name: 'Tidal Accelerate', type: 'active', unlockStar: 2, staminaGiveAll: 30, speedBuff: 0.25, cd: 3 }, { id: 's3', name: 'Maelstrom Core', type: 'passive', unlockStar: 3, crBonus: 0.15, cdBonus: 0.25 }, { id: 's4', name: 'Abyssal Tempest', type: 'active', unlockStar: 4, mult: 2.35, staminaSteal: 25, aoe: true, cd: 4 }, { id: 's5', name: 'Sovereign Lead', type: 'lead', unlockStar: 5, teamSpd: 20, teamAtkPct: 0.15 }] }
];

export function createDefaultState() {
  return {
    tokens: { bronze: 1000, silver: 500, gold: 300, platinum: 10 },
    tokenFragments: { bronze: 50, silver: 20, gold: 0 },
    heroFragments: {},
    instances: [],
    squad: [],
    restArea: [],
    luck: 0,
    cycles: { bronze: { pulls: 0, uncommon: 0, rare: 0 }, silver: { pulls: 0, legend: 0 }, gold: { pulls: 0, legend: 0 } },
    stage: 1
  };
}
