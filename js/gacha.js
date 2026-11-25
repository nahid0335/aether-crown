import { TOKENS, HEROES, HERO_SUMMON_FRAGMENT_COST } from './data.js';

let uidSeq = Date.now();
export function createInst(heroId, star = 1) {
  return { uid: `m_${uidSeq++}`, heroId, star, level: 1, exp: 0 };
}

function pickHero(rarity) {
  const p = HEROES.filter(h => h.rarity === rarity);
  return p[Math.floor(Math.random() * p.length)];
}

export function rollSummonStar(rarity, luck) {
  const r = Math.random();
  const luckBoost = Math.min(0.015, (luck || 0) * 0.0003);
  if (rarity === 'legend' || rarity === 'epic') {
    if (r < 0.004 + luckBoost) return 5;
    if (r < 0.024 + luckBoost) return 4;
    if (r < 0.085) return 3;
    if (r < 0.230) return 2;
    return 1;
  }
  if (rarity === 'rare') {
    if (r < 0.003 + luckBoost * 0.5) return 4;
    if (r < 0.022) return 3;
    if (r < 0.110) return 2;
    return 1;
  }
  if (r < 0.002) return 3;
  if (r < 0.030) return 2;
  return 1;
}

// 1 pull = 1 Character Fragment (does NOT grant the character yet)
export function pullOnce(state, tokenId) {
  const cfg = TOKENS[tokenId];
  if (!cfg || (state.tokens[tokenId] || 0) < 1) return null;
  state.tokens[tokenId] -= 1;

  let rarity = null;
  if (tokenId === 'platinum') {
    rarity = 'legend';
  } else {
    const cyc = state.cycles[tokenId];
    cyc.pulls += 1;
    const rem = cfg.cycleSize - cyc.pulls;
    if (tokenId === 'bronze') {
      if (cyc.rare < 1 && rem === 0) rarity = 'rare';
      else if (cyc.uncommon < 10 && rem < 10 - cyc.uncommon) rarity = 'uncommon';
      else {
        const r = Math.random();
        rarity = r < cfg.weights.rare ? 'rare' : r < cfg.weights.rare + cfg.weights.uncommon ? 'uncommon' : 'common';
      }
      if (rarity === 'uncommon') cyc.uncommon += 1;
      if (rarity === 'rare') cyc.rare += 1;
      if (cyc.pulls >= cfg.cycleSize) state.cycles.bronze = { pulls: 0, uncommon: 0, rare: 0 };
    } else {
      if (cyc.legend === 0 && rem === 0) rarity = 'legend';
      else if (cyc.legend < cfg.maxLegendPerCycle) {
        const chance = Math.min(0.35, cfg.weights.legend + Math.min(0.25, state.luck * 0.005));
        if (Math.random() < chance) rarity = 'legend';
      }
      if (!rarity) rarity = tokenId === 'silver' ? (Math.random() < 0.17 / 0.99 ? 'epic' : 'rare') : 'epic';
      if (rarity === 'legend') { cyc.legend += 1; state.luck = Math.max(0, Math.floor(state.luck * 0.4)); }
      else { state.luck = Math.min(50, +(state.luck + (tokenId === 'gold' ? 0.8 : 0.4)).toFixed(2)); }
      if (cyc.pulls >= cfg.cycleSize) state.cycles[tokenId] = { pulls: 0, legend: 0 };
    }
  }

  const hero = pickHero(rarity);
  state.heroFragments[hero.id] = (state.heroFragments[hero.id] || 0) + 1;
  return { hero, frags: 1 };
}

// 100 Hero Fragments = 1 Summon (creates a copy & rolls 1-5★)
export function summonFromFragments(state, heroId) {
  if ((state.heroFragments[heroId] || 0) < HERO_SUMMON_FRAGMENT_COST) return null;
  const hero = HEROES.find(h => h.id === heroId);
  if (!hero) return null;
  state.heroFragments[heroId] -= HERO_SUMMON_FRAGMENT_COST;
  const star = rollSummonStar(hero.rarity, state.luck);
  const inst = createInst(hero.id, star);
  state.instances.push(inst);
  if (state.squad.length < 3) state.squad.push(inst.uid);
  return { hero, inst };
}
