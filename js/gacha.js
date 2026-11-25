import { TOKENS, HEROES } from './data.js';

let uidSeq = Date.now();
export function createInst(heroId) {
  return { uid: `m_${uidSeq++}`, heroId, star: 1, level: 1, exp: 0 };
}

function pickHero(rarity) {
  const p = HEROES.filter(h => h.rarity === rarity);
  return p[Math.floor(Math.random() * p.length)];
}

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
  const inst = createInst(hero.id);
  state.instances.push(inst);
  if (state.squad.length < 3) state.squad.push(inst.uid);
  const frags = rarity === 'legend' ? 15 : rarity === 'epic' ? 10 : rarity === 'rare' ? 6 : 4;
  state.heroFragments[hero.id] = (state.heroFragments[hero.id] || 0) + frags;
  return { hero, inst, frags };
}
