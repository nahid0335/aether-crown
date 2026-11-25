import { TOKENS, HEROES, HERO_SUMMON_FRAGMENT_COST } from './data.js';

let uidSeq = Date.now();
export function createInst(heroId, star = 1) {
  return { uid: `m_${uidSeq++}`, heroId, star, level: 1, exp: 0 };
}

function pickHero(rarity) {
  const p = HEROES.filter(h => h.rarity === rarity);
  return p[Math.floor(Math.random() * p.length)];
}

export function rollSummonStar(rarity, state) {
  const r = Math.random();
  const sLuck = state.starLuck || 0;
  const luckBonus = Math.min(0.03, sLuck * 0.001); // max +3% at 30 starLuck
  let star = 1;
  if (rarity === 'legend' || rarity === 'epic') {
    if (r < 0.004 + luckBonus * 0.4) star = 5;
    else if (r < 0.022 + luckBonus) star = 4;
    else if (r < 0.080 + luckBonus * 1.5) star = 3;
    else if (r < 0.220 + luckBonus * 2.0) star = 2;
  } else if (rarity === 'rare') {
    if (r < 0.003 + luckBonus * 0.5) star = 4;
    else if (r < 0.022 + luckBonus) star = 3;
    else if (r < 0.110 + luckBonus * 1.5) star = 2;
  } else {
    if (r < 0.002) star = 3;
    else if (r < 0.030 + luckBonus) star = 2;
  }

  if (star >= 4) state.starLuck = 0;
  else if (star === 1) state.starLuck = Math.min(30, +(sLuck + 1).toFixed(1));
  return star;
}

// 1 pull = 1 Character Fragment. pullLuck resets to 0 on any Legend fragment!
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
        // Gentle luck boost (base 1% silver / 6% gold + up to +4% from pullLuck, reset on Legend!)
        const luckBoost = Math.min(0.04, (state.pullLuck || 0) * 0.001);
        const chance = cfg.weights.legend + luckBoost;
        if (Math.random() < chance) rarity = 'legend';
      }
      if (!rarity) rarity = tokenId === 'silver' ? (Math.random() < 0.17 / 0.99 ? 'epic' : 'rare') : 'epic';
      if (rarity === 'legend') {
        cyc.legend += 1;
        state.pullLuck = 0; // Reset pull luck when getting Legend fragment!
      } else {
        state.pullLuck = Math.min(40, +((state.pullLuck || 0) + (tokenId === 'gold' ? 0.35 : 0.15)).toFixed(2));
      }
      if (cyc.pulls >= cfg.cycleSize) state.cycles[tokenId] = { pulls: 0, legend: 0 };
    }
  }

  const hero = pickHero(rarity);
  state.heroFragments[hero.id] = (state.heroFragments[hero.id] || 0) + 1;
  return { hero, frags: 1 };
}

export function summonFromFragments(state, heroId) {
  if ((state.heroFragments[heroId] || 0) < HERO_SUMMON_FRAGMENT_COST) return null;
  const hero = HEROES.find(h => h.id === heroId);
  if (!hero) return null;
  state.heroFragments[heroId] -= HERO_SUMMON_FRAGMENT_COST;
  const star = rollSummonStar(hero.rarity, state);
  const inst = createInst(hero.id, star);
  state.instances.push(inst);
  if (state.squad.length < 3) state.squad.push(inst.uid);
  return { hero, inst };
}
