import { HEROES, getElementalMultiplier, getMaxLv } from './data.js';

export function getLeadBonuses(squadInsts) {
  if (!squadInsts.length) return {};
  const t = HEROES.find(h => h.id === squadInsts[0].heroId);
  if (t.rarity !== 'epic' && t.rarity !== 'legend') return {};
  return t.skills.find(s => s.type === 'lead' && squadInsts[0].star >= s.unlockStar) || {};
}

export function computeStats(inst, lead = {}) {
  const t = HEROES.find(h => h.id === inst.heroId);
  const mult = (1 + (inst.star - 1) * 0.28) * (1 + (inst.level - 1) * 0.06);
  const unlocked = t.skills.filter(s => inst.star >= s.unlockStar);
  let defPct = 0, spdFlat = lead.teamSpd || 0, accFlat = lead.teamAcc || 0, resFlat = lead.teamRes || 0, crFlat = lead.teamCr || 0, cdFlat = 0, stamTurn = 0;
  unlocked.forEach(s => {
    if (s.type === 'passive') {
      if (s.defBonusPct) defPct += s.defBonusPct;
      if (s.spdBonus) spdFlat += s.spdBonus;
      if (s.resBonus) resFlat += s.resBonus;
      if (s.crBonus) crFlat += s.crBonus;
      if (s.cdBonus) cdFlat += s.cdBonus;
      if (s.staminaPerTurn) stamTurn += s.staminaPerTurn;
    }
  });
  return {
    uid: inst.uid, heroId: inst.heroId, name: t.name, element: t.element, rarity: t.rarity, star: inst.star, level: inst.level,
    maxHp: Math.round(t.baseStats.hp * mult * (1 + (lead.teamHpPct || 0))),
    hp: Math.round(t.baseStats.hp * mult * (1 + (lead.teamHpPct || 0))),
    atk: Math.round(t.baseStats.atk * mult * (1 + (lead.teamAtkPct || 0))),
    def: Math.round(t.baseStats.def * mult * (1 + defPct)),
    spd: Math.round(t.baseStats.spd + (inst.star - 1) * 4 + spdFlat),
    acc: +(t.baseStats.acc + (inst.star - 1) * 0.02 + accFlat).toFixed(2),
    res: +(t.baseStats.res + (inst.star - 1) * 0.02 + resFlat).toFixed(2),
    cr: Math.min(1.0, +(t.baseStats.cr + crFlat).toFixed(2)),
    cd: +(t.baseStats.cd + cdFlat).toFixed(2),
    stamina: 0, speedMod: 1.0, speedModTurns: 0, stamTurn, skills: unlocked, cooldowns: {}
  };
}

export function grantExp(inst, amt) {
  const maxLv = getMaxLv(inst.star);
  if (inst.level >= maxLv) return;
  inst.exp += amt;
  while (inst.level < maxLv) {
    const req = Math.round(30 * inst.level * (1 + (inst.star - 1) * 0.45));
    if (inst.exp >= req) { inst.exp -= req; inst.level += 1; } else break;
  }
  if (inst.level >= maxLv) inst.exp = 0;
}

export { getElementalMultiplier };
