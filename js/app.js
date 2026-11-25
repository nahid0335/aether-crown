import { ELEM_ICON, getHeroArt, TOKENS, HEROES, createDefaultState, getMaxLv } from './data.js';
import { createInst, pullOnce } from './gacha.js';
import { getLeadBonuses, computeStats, grantExp, getElementalMultiplier } from './combat.js';
import { initFirebaseSync } from './firebase.js';

let state = createDefaultState();
try {
  const saved = localStorage.getItem('aether_crown_save_v1');
  if (saved) state = Object.assign(state, JSON.parse(saved));
} catch (e) {}

function saveState() {
  try { localStorage.setItem('aether_crown_save_v1', JSON.stringify(state)); } catch (e) {}
  if (typeof window.cloudSyncSave === 'function') window.cloudSyncSave(state);
}

let audioCtx = null, isMuted = false;
function tone(freq, dur = 0.1, type = 'sine', vol = 0.06) {
  if (isMuted) return;
  if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); }
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(vol, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
}


const RARITY_COLOR = {
  common: { text: 'text-slate-300', border: 'border-slate-400/60', bg: 'bg-slate-800/80' },
  uncommon: { text: 'text-emerald-300', border: 'border-emerald-400/70', bg: 'bg-emerald-950/40' },
  rare: { text: 'text-sky-300', border: 'border-sky-400/80', bg: 'bg-sky-950/40' },
  epic: { text: 'text-violet-300', border: 'border-violet-400/85', bg: 'bg-violet-950/45' },
  legend: { text: 'text-amber-300', border: 'border-amber-400', bg: 'bg-amber-950/50' }
};

function openCharDetail(hero, star = 1, level = 1) {
  const rc = RARITY_COLOR[hero.rarity];
  const card = document.getElementById('char-detail-card');
  card.className = `glass rounded-2xl max-w-md w-full p-5 flex flex-col gap-3 border-2 ${rc.border}`;
  document.getElementById('cd-img').src = getHeroArt(hero.id);
  document.getElementById('cd-elem').textContent = ELEM_ICON[hero.element];
  document.getElementById('cd-name').textContent = hero.name;
  document.getElementById('cd-stars').textContent = '★'.repeat(star);
  document.getElementById('cd-rarity').className = `text-[11px] font-bold uppercase tracking-wider ${rc.text}`;
  document.getElementById('cd-rarity').textContent = `${hero.rarity} · Lv ${level}/${getMaxLv(star)}`;
  const st = computeStats({ uid: 'preview', heroId: hero.id, star, level });
  document.getElementById('cd-stats').innerHTML = `
    <span>HP ${st.maxHp}</span><span>ATK ${st.atk}</span><span>DEF ${st.def}</span><span>SPD ${st.spd}</span>
    <span>ACC ${Math.round(st.acc*100)}%</span><span>RES ${Math.round(st.res*100)}%</span><span>CR ${Math.round(st.cr*100)}%</span><span>CD ${Math.round(st.cd*100)}%</span>
  `;
  document.getElementById('cd-skills').innerHTML = hero.skills.map(sk => {
    const unlocked = star >= sk.unlockStar;
    return `<div class="rounded-lg p-2 bg-slate-900/80 border ${unlocked ? 'border-slate-700 text-slate-200' : 'border-slate-800 text-slate-500'}">
      <div class="font-semibold">${unlocked ? '✓' : '🔒 ' + '★'.repeat(sk.unlockStar)} [${sk.type.toUpperCase()}] ${sk.name}</div>
    </div>`;
  }).join('');
  document.getElementById('char-detail-modal').classList.remove('hidden');
}

let selectedTier = 'bronze', currentTab = 'home', dexFilter = 'all', evolveTargetUid = null, evolveFodder = new Set();
let battle = { active: false, auto: false, allies: [], enemies: [], actor: null, targetIdx: 0, type: 'boss' };

function renderHUD() {
  document.getElementById('hud-bronze').textContent = state.tokens.bronze;
  document.getElementById('hud-silver').textContent = state.tokens.silver;
  document.getElementById('hud-gold').textContent = state.tokens.gold;
  document.getElementById('hud-platinum').textContent = state.tokens.platinum;
  document.getElementById('hud-luck').textContent = `${state.luck}%`;
  document.getElementById('nav-roster').textContent = state.instances.length;
  document.getElementById('nav-dex').textContent = HEROES.length;
  document.getElementById('nav-rest').textContent = state.restArea.length;
  document.getElementById('nav-stage').textContent = state.stage;
  document.getElementById('battle-stage').textContent = state.stage;
}

function renderSummon() {
  const cfg = TOKENS[selectedTier];
  const cyc = state.cycles[selectedTier];
  document.querySelectorAll('.tier-btn').forEach(b => {
    b.classList.toggle('border-2', b.dataset.tier === selectedTier);
    b.classList.toggle('border-indigo-400', b.dataset.tier === selectedTier);
  });
  if (selectedTier === 'platinum') {
    document.getElementById('cycle-info').textContent = 'Crafted Token (100 Gold Crowns)';
    document.getElementById('cycle-cap-info').textContent = '100% Guaranteed Legend';
  } else {
    document.getElementById('cycle-info').textContent = `Cycle: ${cyc.pulls} / ${cfg.cycleSize}`;
    document.getElementById('cycle-cap-info').textContent = selectedTier === 'bronze'
      ? `Uncommon: ${cyc.uncommon}/10 · Rare: ${cyc.rare}/1`
      : `Legends this cycle: ${cyc.legend} / ${cfg.maxLegendPerCycle}`;
  }
  document.getElementById('serial-bronze').textContent = state.tokens.bronze;
  document.getElementById('serial-silver').textContent = state.tokens.silver;
  document.getElementById('serial-gold').textContent = state.tokens.gold;
  document.getElementById('serial-platinum').textContent = state.tokens.platinum;
  document.getElementById('summon-luck-label').textContent = `${state.luck}%`;
  document.getElementById('frag-bronze').textContent = state.tokenFragments.bronze;
  document.getElementById('frag-silver').textContent = state.tokenFragments.silver;
  document.getElementById('frag-gold').textContent = state.tokenFragments.gold;

  const list = document.getElementById('hero-frag-list');
  list.innerHTML = '';
  const entries = Object.entries(state.heroFragments).filter(([, v]) => v > 0);
  if (!entries.length) {
    list.innerHTML = '<div class="text-slate-500">Pull tokens to collect Monster Fragments.</div>';
  } else {
    entries.forEach(([hid, cnt]) => {
      const h = HEROES.find(x => x.id === hid);
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-slate-900/70 rounded-lg px-2.5 py-1.5';
      row.innerHTML = `<span>${ELEM_ICON[h.element]} ${h.name} (${cnt}/100)</span>
        <button data-hsummon="${hid}" ${cnt >= 100 ? '' : 'disabled'} class="btn-tap px-2 py-0.5 rounded bg-emerald-600 disabled:opacity-35 text-white font-semibold">Summon</button>`;
      list.appendChild(row);
    });
    list.querySelectorAll('[data-hsummon]').forEach(b => b.addEventListener('click', () => {
      const hid = b.dataset.hsummon;
      if ((state.heroFragments[hid] || 0) >= 100) {
        state.heroFragments[hid] -= 100;
        const inst = createInst(hid);
        state.instances.push(inst);
        if (state.squad.length < 3) state.squad.push(inst.uid);
        saveState(); renderAll();
      }
    }));
  }
}

function renderRoster() {
  const squadInsts = state.squad.map(uid => state.instances.find(m => m.uid === uid)).filter(Boolean);
  const leadBonuses = getLeadBonuses(squadInsts);
  document.getElementById('squad-names').textContent = squadInsts.length
    ? squadInsts.map((m, i) => `${i === 0 ? '[Lead] ' : ''}${HEROES.find(h => h.id === m.heroId).name}`).join(', ')
    : 'None';

  const grid = document.getElementById('roster-grid');
  grid.innerHTML = '';
  if (!state.instances.length) {
    grid.innerHTML = '<div class="col-span-full glass rounded-xl p-6 text-center text-xs text-slate-400">No monsters yet. Pull Bronze/Silver/Gold tokens first!</div>';
    return;
  }
  state.instances.slice().sort((a, b) => b.star - a.star || b.level - a.level).forEach(inst => {
    const t = HEROES.find(h => h.id === inst.heroId);
    const st = computeStats(inst, state.squad.includes(inst.uid) ? leadBonuses : {});
    const maxLv = getMaxLv(inst.star);
    const inSquad = state.squad.includes(inst.uid);
    const isLead = state.squad[0] === inst.uid;
    const canEvolve = inst.star < 6 && inst.level >= maxLv;

    const card = document.createElement('div');
    card.className = `glass rounded-xl border p-3 flex flex-col gap-2 r-${t.rarity}`;
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2"><img src="${getHeroArt(t.id)}" alt="${t.name}" class="w-10 h-10 rounded-lg object-cover border border-amber-400/40" /><div><div class="flex items-center gap-2"><img src="${getHeroArt(t.id)}" alt="${t.name}" class="w-10 h-10 rounded-lg object-cover border border-sky-400/40" /><div><div class="text-sm font-bold text-white">${ELEM_ICON[t.element]} ${t.name}</div>
          <div class="text-[11px] text-amber-300">${'★'.repeat(inst.star)} · Lv ${inst.level}/${maxLv} · <span class="uppercase text-slate-300">${t.rarity}</span></div>
        </div></div>
        ${isLead ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[10px] font-bold">LEAD</span>' : ''}
      </div>
      <div class="grid grid-cols-4 gap-1 text-[10px] bg-slate-950/60 rounded-lg p-1.5 font-mono text-slate-300">
        <span>HP ${st.maxHp}</span><span>ATK ${st.atk}</span><span>DEF ${st.def}</span><span>SPD ${st.spd}</span>
        <span>ACC ${Math.round(st.acc*100)}%</span><span>RES ${Math.round(st.res*100)}%</span><span>CR ${Math.round(st.cr*100)}%</span><span>CD ${Math.round(st.cd*100)}%</span>
      </div>
      <div class="text-[10px] text-slate-400 space-y-0.5">
        ${t.skills.map(s => `<div class="${inst.star >= s.unlockStar ? 'text-slate-200' : 'text-slate-600'}">${inst.star >= s.unlockStar ? '✓' : '🔒 ' + s.unlockStar + '★'} [${s.type.toUpperCase()}] ${s.name}</div>`).join('')}
      </div>
      <div class="flex gap-1.5 mt-auto">
        <button data-sq="${inst.uid}" class="btn-tap flex-1 py-1 rounded-lg text-xs font-semibold ${inSquad ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'}">${inSquad ? 'In Squad' : '+ Squad'}</button>
        <button data-ld="${inst.uid}" class="btn-tap px-2 py-1 rounded-lg text-xs bg-indigo-700/70 hover:bg-indigo-600 text-white">Set Lead</button>
        <button data-ev="${inst.uid}" ${canEvolve ? '' : 'disabled'} class="btn-tap px-2 py-1 rounded-lg text-xs font-bold bg-amber-600 disabled:opacity-35 text-white">Evolve</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-sq]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.sq;
    const i = state.squad.indexOf(id);
    if (i !== -1) state.squad.splice(i, 1);
    else { if (state.squad.length >= 3) state.squad.pop(); state.squad.push(id); }
    saveState(); renderAll();
  }));
  grid.querySelectorAll('[data-ld]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.ld;
    state.squad = [id, ...state.squad.filter(x => x !== id)].slice(0, 3);
    saveState(); renderAll();
  }));
  grid.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => openEvolveModal(b.dataset.ev)));
}

function openEvolveModal(uid) {
  evolveTargetUid = uid; evolveFodder.clear();
  const target = state.instances.find(m => m.uid === uid);
  const need = target.star + 1;
  document.getElementById('evolve-title').textContent = `Evolve ${HEROES.find(h => h.id === target.heroId).name} to ${target.star + 1}★`;
  document.getElementById('evolve-desc').textContent = `Select ${need} monsters of ${target.star}★ as fodder. Result resets to Lv 1 at ${target.star + 1}★.`;
  const list = document.getElementById('evolve-fodder-list');
  list.innerHTML = '';
  const candidates = state.instances.filter(m => m.uid !== uid && m.star === target.star);
  if (candidates.length < need) {
    list.innerHTML = `<div class="text-rose-400">Need ${need} ${target.star}★ monsters (you have ${candidates.length}).</div>`;
  } else {
    candidates.forEach(c => {
      const h = HEROES.find(x => x.id === c.heroId);
      const row = document.createElement('label');
      row.className = 'flex items-center justify-between bg-slate-900 rounded-lg px-3 py-1.5 cursor-pointer';
      row.innerHTML = `<span>${ELEM_ICON[h.element]} ${h.name} (${c.star}★ Lv${c.level})</span><input type="checkbox" value="${c.uid}" />`;
      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) evolveFodder.add(c.uid); else evolveFodder.delete(c.uid);
      });
      list.appendChild(row);
    });
  }
  document.getElementById('evolve-modal').classList.remove('hidden');
}

function renderDex() {
  const grid = document.getElementById('dex-grid');
  grid.innerHTML = '';
  HEROES.filter(h => dexFilter === 'all' || h.element === dexFilter).forEach(t => {
    const ownedCount = state.instances.filter(m => m.heroId === t.id).length;
    const frags = state.heroFragments[t.id] || 0;
    const st = t.baseStats;
    const card = document.createElement('div');
    card.className = `glass rounded-xl border p-3 flex flex-col gap-2 r-${t.rarity}`;
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="text-sm font-bold text-white">${ELEM_ICON[t.element]} ${t.name}</div>
          <div class="text-[11px] uppercase text-amber-300">${t.rarity} · Base ★</div>
        </div></div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${ownedCount > 0 ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-800 text-slate-400'}">${ownedCount > 0 ? `Owned ×${ownedCount}` : 'Not Summoned'}</span>
      </div>
      <div class="grid grid-cols-4 gap-1 text-[10px] bg-slate-950/60 rounded-lg p-1.5 font-mono text-slate-300">
        <span>HP ${st.hp}</span><span>ATK ${st.atk}</span><span>DEF ${st.def}</span><span>SPD ${st.spd}</span>
        <span>ACC ${Math.round(st.acc*100)}%</span><span>RES ${Math.round(st.res*100)}%</span><span>CR ${Math.round(st.cr*100)}%</span><span>CD ${Math.round(st.cd*100)}%</span>
      </div>
      <div class="text-[10px] text-slate-300 space-y-0.5">${t.skills.map(sk => `<div><span class="text-indigo-300">[${sk.unlockStar}★ ${sk.type.toUpperCase()}]</span> ${sk.name}</div>`).join('')}</div>
      <div class="flex items-center justify-between mt-auto pt-1 border-t border-slate-800/80 text-xs">
        <span class="text-slate-400">Fragments: <strong class="text-white">${frags}</strong>/100</span>
        <button data-dex-summon="${t.id}" ${frags >= 100 ? '' : 'disabled'} class="btn-tap px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 text-[11px] font-bold text-white">Summon (100)</button>
      </div>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('[data-dex-summon]').forEach(b => b.addEventListener('click', () => {
    const hid = b.dataset.dexSummon;
    if ((state.heroFragments[hid] || 0) >= 100) {
      state.heroFragments[hid] -= 100;
      const inst = createInst(hid);
      state.instances.push(inst);
      if (state.squad.length < 3) state.squad.push(inst.uid);
      saveState(); renderAll();
    }
  }));
}

function renderRestArea() {
  document.getElementById('rest-count-badge').textContent = `${state.restArea.length} / 5`;
  const grid = document.getElementById('rest-grid');
  grid.innerHTML = '';
  state.instances.forEach(inst => {
    const h = HEROES.find(x => x.id === inst.heroId);
    const resting = state.restArea.includes(inst.uid);
    const card = document.createElement('div');
    card.className = `rounded-xl border p-2.5 flex items-center justify-between text-xs ${resting ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/60'}`;
    card.innerHTML = `<div><div class="font-bold text-white">${ELEM_ICON[h.element]} ${h.name}</div><div class="text-[11px] text-slate-400">${inst.star}★ Lv ${inst.level}/${getMaxLv(inst.star)}</div></div>
      <button class="btn-tap px-2.5 py-1 rounded-lg font-semibold ${resting ? 'bg-rose-700 text-white' : 'bg-emerald-700 text-white'}">${resting ? 'Remove' : 'Rest'}</button>`;
    card.querySelector('button').addEventListener('click', () => {
      if (resting) state.restArea = state.restArea.filter(id => id !== inst.uid);
      else if (state.restArea.length < 5) state.restArea.push(inst.uid);
      saveState(); renderAll();
    });
    grid.appendChild(card);
  });
}

function logBattle(msg, cls = 'text-slate-300') {
  const el = document.getElementById('battle-log');
  const d = document.createElement('div'); d.className = cls; d.textContent = msg;
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

function startBattle(type) {
  const sq = state.squad.map(id => state.instances.find(m => m.uid === id)).filter(Boolean);
  if (!sq.length) { logBattle('Add at least 1 monster to Squad in My Monsters first!', 'text-rose-400'); return; }
  battle.active = true; battle.type = type; battle.targetIdx = 0;
  const lead = getLeadBonuses(sq);
  battle.allies = sq.map(inst => ({ ...computeStats(inst, lead), isPlayer: true }));
  const els = ['fire', 'grass', 'water'], stg = state.stage;
  battle.enemies = type === 'boss'
    ? [
        { uid: 'e_boss', name: `Stage ${stg} Boss`, element: els[stg % 3], isPlayer: false, maxHp: 220 + stg * 90, hp: 220 + stg * 90, atk: 24 + stg * 7, def: 12 + stg * 3, spd: 112 + stg * 2, acc: 0.15, res: 0.15, cr: 0.1, cd: 1.5, stamina: 0, speedMod: 1, speedModTurns: 0, cooldowns: {}, skills: [{ id: 'b1', name: 'Boss Crush', type: 'active', mult: 1.2, cd: 0 }] },
        { uid: 'e_add', name: 'Aether Guard', element: els[(stg + 1) % 3], isPlayer: false, maxHp: 130 + stg * 45, hp: 130 + stg * 45, atk: 18 + stg * 5, def: 10 + stg * 2, spd: 104, acc: 0.1, res: 0.1, cr: 0.08, cd: 1.5, stamina: 0, speedMod: 1, speedModTurns: 0, cooldowns: {}, skills: [{ id: 'a1', name: 'Guard Hit', type: 'active', mult: 1.0, cd: 0 }] }
      ]
    : [{ uid: 'e_res1', name: 'Crystal Slime', element: els[stg % 3], isPlayer: false, maxHp: 140 + stg * 40, hp: 140 + stg * 40, atk: 16 + stg * 4, def: 8 + stg * 2, spd: 98, acc: 0.05, res: 0.05, cr: 0.05, cd: 1.5, stamina: 0, speedMod: 1, speedModTurns: 0, cooldowns: {}, skills: [{ id: 'r1', name: 'Crystal Bump', type: 'active', mult: 1.0, cd: 0 }] }];
  document.getElementById('battle-log').innerHTML = '';
  logBattle(`${type === 'boss' ? 'Boss' : 'Resource'} Battle started!`, 'text-amber-300');
  nextTurn();
}

function nextTurn() {
  if (!battle.active) return;
  if (battle.enemies.every(e => e.hp <= 0)) { finishBattle(true); return; }
  if (battle.allies.every(a => a.hp <= 0)) { finishBattle(false); return; }
  const all = [...battle.allies, ...battle.enemies].filter(u => u.hp > 0);
  let guard = 0, actor = null;
  while (guard++ < 400 && !actor) {
    const ready = all.filter(u => u.stamina >= 100);
    if (ready.length) {
      ready.sort((a, b) => b.stamina - a.stamina);
      actor = ready[0]; actor.stamina -= 100;
      Object.keys(actor.cooldowns).forEach(k => { if (actor.cooldowns[k] > 0) actor.cooldowns[k] -= 1; });
      if (actor.speedModTurns > 0 && --actor.speedModTurns === 0) actor.speedMod = 1.0;
      if (actor.stamTurn) actor.stamina = Math.min(100, actor.stamina + actor.stamTurn);
    } else {
      all.forEach(u => { u.stamina += Math.max(20, u.spd * u.speedMod) * 0.1; });
    }
  }
  battle.actor = actor;
  renderBattle();
  if (!actor.isPlayer) setTimeout(() => runEnemyTurn(actor), 350);
  else if (battle.auto) setTimeout(() => {
    const usable = actor.skills.filter(s => s.type === 'active' && !(actor.cooldowns[s.id] > 0));
    usePlayerSkill(usable[usable.length - 1]);
  }, 300);
}

function runEnemyTurn(actor) {
  if (!battle.active) return;
  const alive = battle.allies.filter(a => a.hp > 0);
  if (!alive.length) { finishBattle(false); return; }
  const target = alive[Math.floor(Math.random() * alive.length)];
  const dmg = Math.max(1, Math.round(actor.atk * 1.05 * (100 / (100 + target.def)) * getElementalMultiplier(actor.element, target.element)));
  target.hp = Math.max(0, target.hp - dmg);
  tone(220, 0.08, 'sawtooth', 0.04);
  logBattle(`${actor.name} attacked ${target.name} for ${dmg} dmg.`, 'text-rose-300');
  nextTurn();
}

function usePlayerSkill(skill) {
  if (!battle.active || !battle.actor || !battle.actor.isPlayer) return;
  const actor = battle.actor;
  if (skill.cd) actor.cooldowns[skill.id] = skill.cd;
  if (skill.healPct) {
    const hurt = battle.allies.filter(a => a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) { const h = Math.round(hurt.maxHp * skill.healPct); hurt.hp = Math.min(hurt.maxHp, hurt.hp + h); logBattle(`${actor.name} healed ${hurt.name} +${h} HP.`, 'text-emerald-300'); }
  }
  if (skill.staminaGiveAlly) {
    const ally = battle.allies.filter(a => a.hp > 0 && a.uid !== actor.uid).sort((a, b) => b.stamina - a.stamina)[0] || actor;
    ally.stamina = Math.min(100, ally.stamina + skill.staminaGiveAlly);
    logBattle(`${ally.name} +${skill.staminaGiveAlly} Stamina!`, 'text-sky-300');
  }
  if (skill.staminaGiveAll) battle.allies.filter(a => a.hp > 0).forEach(a => a.stamina = Math.min(100, a.stamina + skill.staminaGiveAll));
  if (skill.staminaBoostSelf) actor.stamina = Math.min(100, actor.stamina + skill.staminaBoostSelf);
  if (skill.speedBuff) { actor.speedMod = 1 + skill.speedBuff; actor.speedModTurns = 2; }
  if (skill.mult) {
    const aliveE = battle.enemies.filter(e => e.hp > 0);
    const primary = battle.enemies[battle.targetIdx] && battle.enemies[battle.targetIdx].hp > 0 ? battle.enemies[battle.targetIdx] : aliveE[0];
    const targets = skill.aoe ? aliveE : [primary].filter(Boolean);
    targets.forEach(t => {
      const isCrit = Math.random() < actor.cr;
      const dmg = Math.max(1, Math.round(actor.atk * skill.mult * (100 / (100 + t.def)) * getElementalMultiplier(actor.element, t.element) * (isCrit ? actor.cd : 1)));
      t.hp = Math.max(0, t.hp - dmg);
      tone(isCrit ? 680 : 460, 0.09, 'triangle', 0.05);
      logBattle(`${actor.name} used ${skill.name} on ${t.name}: ${dmg}${isCrit ? ' CRIT!' : ''}`, 'text-sky-300');
      if (skill.staminaSteal && t.hp > 0 && Math.random() < Math.max(0.15, 0.75 + actor.acc - t.res)) {
        const st = Math.min(t.stamina, skill.staminaSteal); t.stamina -= st; actor.stamina = Math.min(100, actor.stamina + st);
      }
      if (skill.speedDebuff && t.hp > 0 && Math.random() < Math.max(0.15, 0.75 + actor.acc - t.res)) {
        t.speedMod = Math.max(0.5, 1 - skill.speedDebuff); t.speedModTurns = 2;
      }
    });
  }
  nextTurn();
}

function finishBattle(won) {
  battle.active = false;
  if (won) {
    const exp = battle.type === 'boss' ? 45 * state.stage : 35 * state.stage;
    state.instances.filter(m => state.squad.includes(m.uid)).forEach(m => grantExp(m, exp));
    state.instances.filter(m => state.restArea.slice(0, 5).includes(m.uid)).forEach(m => grantExp(m, Math.round(exp * 0.5)));
    if (battle.type === 'boss') {
      const bF = 35 + state.stage * 8, sF = 12 + state.stage * 3, gF = state.stage >= 3 ? 5 + state.stage : 2;
      state.tokenFragments.bronze += bF; state.tokenFragments.silver += sF; state.tokenFragments.gold += gF;
      const luckDrop = Math.random() < 0.05;
      if (luckDrop) state.luck = Math.min(50, +(state.luck + 1).toFixed(2));
      state.stage += 1;
      logBattle(`BOSS CLEARED! +${exp} EXP, +${bF}🥉 +${sF}🥈 +${gF}👑 frags${luckDrop ? ' +1% LUCK!' : ''}`, 'text-emerald-400 font-bold');
    } else {
      const bF = 25 + state.stage * 5;
      state.tokenFragments.bronze += bF;
      logBattle(`Resource Cleared! +${exp} EXP, +${bF}🥉 frags`, 'text-emerald-400 font-bold');
    }
    tone(880, 0.2, 'sine', 0.07);
    saveState();
  } else {
    logBattle('Defeat! Level up or Evolve your monsters.', 'text-rose-400 font-bold');
  }
  renderAll();
}

function renderBattle() {
  const aEl = document.getElementById('arena-allies'); aEl.innerHTML = '';
  battle.allies.forEach(u => {
    const active = battle.actor && battle.actor.uid === u.uid;
    aEl.innerHTML += `<div class="rounded-lg p-2 border ${active ? 'border-indigo-400 bg-indigo-950/40' : 'border-slate-800 bg-slate-900/70'} text-xs">
      <div class="flex justify-between font-bold"><span>${ELEM_ICON[u.element]} ${u.name}</span><span>HP ${u.hp}/${u.maxHp}</span></div>
      <div class="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden"><div class="h-full bg-emerald-400" style="width:${Math.round(u.hp/u.maxHp*100)}%"></div></div>
      <div class="flex justify-between text-[10px] text-amber-300 mt-1"><span>Stamina: ${Math.round(u.stamina)}/100</span><span>SPD ${Math.round(u.spd * u.speedMod)}</span></div>
    </div>`;
  });
  const eEl = document.getElementById('arena-enemies'); eEl.innerHTML = '';
  battle.enemies.forEach((u, idx) => {
    const div = document.createElement('div');
    div.className = `rounded-lg p-2 border cursor-pointer text-xs ${idx === battle.targetIdx ? 'border-rose-400 bg-rose-950/30' : 'border-slate-800 bg-slate-900/70'}`;
    div.innerHTML = `<div class="flex justify-between font-bold"><span>${ELEM_ICON[u.element]} ${u.name}</span><span>HP ${u.hp}/${u.maxHp}</span></div>
      <div class="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden"><div class="h-full bg-rose-500" style="width:${Math.round(u.hp/u.maxHp*100)}%"></div></div>
      <div class="flex justify-between text-[10px] text-amber-300 mt-1"><span>Stamina: ${Math.round(u.stamina)}/100</span><span>SPD ${Math.round(u.spd * u.speedMod)}</span></div>`;
    div.addEventListener('click', () => { battle.targetIdx = idx; renderBattle(); });
    eEl.appendChild(div);
  });
  const sb = document.getElementById('skill-buttons'); sb.innerHTML = '';
  if (battle.active && battle.actor && battle.actor.isPlayer) {
    document.getElementById('turn-actor-label').textContent = `${battle.actor.name}'s Turn:`;
    battle.actor.skills.filter(s => s.type === 'active').forEach(s => {
      const cd = battle.actor.cooldowns[s.id] || 0;
      const b = document.createElement('button');
      b.disabled = cd > 0;
      b.className = 'btn-tap px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white';
      b.textContent = cd > 0 ? `${s.name} (CD ${cd})` : s.name;
      b.addEventListener('click', () => usePlayerSkill(s));
      sb.appendChild(b);
    });
  } else {
    document.getElementById('turn-actor-label').textContent = battle.active ? 'Enemy Turn...' : 'Start a Boss or Resource battle above.';
  }
}


function renderHome() {
  const stageEl = document.getElementById('lobby-squad-stage');
  const titleEl = document.getElementById('home-lead-title');
  const infoEl = document.getElementById('home-lead-info');
  const dockBadge = document.getElementById('dock-tokens-badge');
  dockBadge.textContent = `${state.tokens.bronze + state.tokens.silver + state.tokens.gold + state.tokens.platinum} Tokens`;

  const squadInsts = state.squad.map(uid => state.instances.find(m => m.uid === uid)).filter(Boolean);
  stageEl.innerHTML = '';

  if (!squadInsts.length) {
    stageEl.innerHTML = `<button data-nav-dyn="summon" class="float-hero glass rounded-3xl p-6 border-2 border-amber-400/50 flex flex-col items-center gap-2 shadow-2xl">
      <span class="text-5xl">👑</span>
      <span class="font-rpg text-xs font-bold text-amber-300 uppercase tracking-widest">Astral Altar</span>
    </button>`;
    stageEl.querySelector('[data-nav-dyn]').addEventListener('click', () => navigateTo('summon'));
    titleEl.textContent = 'Summon Your First Hero';
    infoEl.textContent = 'Tap Summon below to pull Bronze, Silver, or Gold Crown tokens.';
  } else {
    squadInsts.forEach((inst, i) => {
      const h = HEROES.find(x => x.id === inst.heroId);
      const isLead = i === 0;
      const card = document.createElement('div');
      card.className = `float-hero relative flex flex-col items-center cursor-pointer ${isLead ? 'scale-110 z-10' : 'opacity-95 scale-95'}`;
      card.style.animationDelay = `${i * 0.45}s`;
      card.innerHTML = `
        <div class="w-20 h-24 sm:w-28 sm:h-32 rounded-xl overflow-hidden border-2 ${isLead ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]' : 'border-slate-500/70 shadow-xl'} bg-slate-950 relative">
          <img src="${getHeroArt(h.id)}" alt="${h.name}" class="w-full h-full object-cover" />
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-1.5 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-white truncate">${h.name}</div>
            <div class="text-[9px] text-amber-300">${'★'.repeat(inst.star)} Lv.${inst.level}</div>
          </div>
          ${isLead ? '<span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold">LEAD</span>' : ''}
        </div>
      `;
      card.addEventListener('click', () => navigateTo('roster'));
      stageEl.appendChild(card);
    });
    const lead = HEROES.find(x => x.id === squadInsts[0].heroId);
    titleEl.textContent = `${lead.name} — Ready for Stage ${state.stage}`;
    infoEl.textContent = `${squadInsts.length}/3 Heroes Deployed · Tap Battle to fight or My Heroes to evolve`;
  }
}

function navigateTo(tab) {
  currentTab = tab;
  ['home', 'summon', 'roster', 'dex', 'rest', 'battle'].forEach(t => {
    document.getElementById(`view-${t}`).classList.toggle('hidden', t !== currentTab);
  });
}

function renderAll() { renderHUD(); renderHome(); renderSummon(); renderRoster(); renderDex(); renderRestArea(); renderBattle(); }

// Wire events
document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.nav)));
document.querySelectorAll('.dex-filter-btn').forEach(b => b.addEventListener('click', () => {
  dexFilter = b.dataset.dexFilter;
  document.querySelectorAll('.dex-filter-btn').forEach(x => x.classList.remove('bg-indigo-600', 'text-white'));
  b.classList.add('bg-indigo-600', 'text-white');
  renderDex();
}));
document.querySelectorAll('.tier-btn').forEach(b => b.addEventListener('click', () => { selectedTier = b.dataset.tier; renderSummon(); }));

function handlePull(n) {
  const res = [];
  for (let i = 0; i < n; i++) { const r = pullOnce(state, selectedTier); if (!r) break; res.push(r); }
  const msg = document.getElementById('summon-msg');
  if (!res.length) { msg.textContent = 'Not enough tokens for this tier!'; return; }
  msg.textContent = `Summoned ${res.length}x ${TOKENS[selectedTier].name}!`;
  tone(540, 0.15, 'triangle', 0.07);
  saveState(); renderAll();

  const burst = document.getElementById('summon-burst');
  burst.classList.remove('hidden', 'summon-burst-anim');
  void burst.offsetWidth;
  burst.classList.add('summon-burst-anim');

  setTimeout(() => {
    burst.classList.add('hidden');
    const grid = document.getElementById('pull-modal-grid'); grid.innerHTML = '';
    res.slice(0, 20).forEach(r => {
      const rc = RARITY_COLOR[r.hero.rarity];
      const card = document.createElement('button');
      card.className = `btn-tap rounded-xl border-2 ${rc.border} ${rc.bg} p-2 flex flex-col items-center text-center gap-1 cursor-pointer`;
      card.innerHTML = `
        <div class="relative w-full aspect-square rounded-lg overflow-hidden">
          <img src="${getHeroArt(r.hero.id)}" alt="${r.hero.name}" class="w-full h-full object-cover" />
          <span class="absolute top-1 left-1 text-xs bg-slate-950/75 rounded-full px-1">${ELEM_ICON[r.hero.element]}</span>
        </div>
        <div class="text-[11px] font-bold ${rc.text} truncate w-full">${r.hero.name}</div>
        <div class="text-xs text-amber-300 tracking-tighter">${'★'.repeat(r.inst.star)}</div>
      `;
      card.addEventListener('click', () => openCharDetail(r.hero, r.inst.star, r.inst.level));
      grid.appendChild(card);
    });
    document.getElementById('pull-modal-title').textContent = `Summoned ${res.length} Hero${res.length > 1 ? 'es' : ''} (Click any card for details)`;
    document.getElementById('pull-modal').classList.remove('hidden');
  }, 420);
}

document.getElementById('btn-pull-1').addEventListener('click', () => handlePull(1));
document.getElementById('btn-pull-10').addEventListener('click', () => handlePull(10));
document.getElementById('btn-pull-100').addEventListener('click', () => handlePull(100));
document.getElementById('btn-close-pull').addEventListener('click', () => document.getElementById('pull-modal').classList.add('hidden'));

['bronze', 'silver', 'gold'].forEach(t => {
  document.getElementById(`craft-${t}`).addEventListener('click', () => {
    if (state.tokenFragments[t] >= 100) { state.tokenFragments[t] -= 100; state.tokens[t] += 1; saveState(); renderAll(); }
  });
  document.getElementById(`up-${t}`).addEventListener('click', () => {
    const next = t === 'bronze' ? 'silver' : t === 'silver' ? 'gold' : 'platinum';
    if (state.tokens[t] >= 100) { state.tokens[t] -= 100; state.tokens[next] += 1; saveState(); renderAll(); }
  });
});

document.getElementById('btn-cancel-evolve').addEventListener('click', () => document.getElementById('evolve-modal').classList.add('hidden'));
document.getElementById('btn-confirm-evolve').addEventListener('click', () => {
  const target = state.instances.find(m => m.uid === evolveTargetUid);
  if (!target || evolveFodder.size !== target.star + 1) return;
  state.instances = state.instances.filter(m => !evolveFodder.has(m.uid));
  state.squad = state.squad.filter(id => !evolveFodder.has(id));
  state.restArea = state.restArea.filter(id => !evolveFodder.has(id));
  target.star += 1; target.level = 1; target.exp = 0;
  document.getElementById('evolve-modal').classList.add('hidden');
  saveState(); renderAll();
});

document.getElementById('btn-start-boss').addEventListener('click', () => startBattle('boss'));
document.getElementById('btn-start-res').addEventListener('click', () => startBattle('resource'));
document.getElementById('btn-auto').addEventListener('click', () => {
  battle.auto = !battle.auto;
  document.getElementById('btn-auto').textContent = `Auto: ${battle.auto ? 'ON' : 'OFF'}`;
  if (battle.auto && battle.active && battle.actor && battle.actor.isPlayer) {
    const usable = battle.actor.skills.filter(s => s.type === 'active' && !(battle.actor.cooldowns[s.id] > 0));
    usePlayerSkill(usable[usable.length - 1]);
  }
});
document.getElementById('btn-mute').addEventListener('click', () => {
  isMuted = !isMuted; document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
});

initFirebaseSync({
  getState: () => state,
  applyCloudState: (cloudData) => {
    if (!cloudData || typeof cloudData !== 'object') return;
    state = Object.assign(createDefaultState(), cloudData);
    try { localStorage.setItem('aether_crown_save_v1', JSON.stringify(state)); } catch (e) {}
    renderAll();
  }
});


document.getElementById('btn-close-char').addEventListener('click', () => document.getElementById('char-detail-modal').classList.add('hidden'));
document.getElementById('tab-sum-pull').addEventListener('click', () => {
  document.getElementById('panel-sum-pull').classList.remove('hidden');
  document.getElementById('panel-sum-craft').classList.add('hidden');
  document.getElementById('tab-sum-pull').className = 'flex-1 py-1.5 rounded-md bg-indigo-600 text-white';
  document.getElementById('tab-sum-craft').className = 'flex-1 py-1.5 rounded-md text-slate-300';
});
document.getElementById('tab-sum-craft').addEventListener('click', () => {
  document.getElementById('panel-sum-craft').classList.remove('hidden');
  document.getElementById('panel-sum-pull').classList.add('hidden');
  document.getElementById('tab-sum-craft').className = 'flex-1 py-1.5 rounded-md bg-indigo-600 text-white';
  document.getElementById('tab-sum-pull').className = 'flex-1 py-1.5 rounded-md text-slate-300';
});

window.onload = () => renderAll();
