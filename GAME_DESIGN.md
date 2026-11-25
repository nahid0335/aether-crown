Aether Crown — Game Design & Architecture (GAME_DESIGN.md)
Reference specification for Aether Crown, a single-file browser Turn-Based Gacha RPG (index.html) hosted on GitHub Pages with Firebase Auth & Cloud Firestore persistence.


________________


1. Tech Stack & Hosting
* Frontend: Single self-contained index.html (Tailwind CSS via CDN + vanilla ES6/module JavaScript).
* Persistence: localStorage (aether_crown_save_v1) + Firebase v10.14.1 (Google Sign-In + Cloud Firestore at users/{uid}).
* Golden Rule for Edits: Never remove firebaseConfig, saveState(), or window.applyCloudState(). Always merge new state fields with defaults (Object.assign(defaultState, cloudData)) so existing player saves never break.


________________


2. Gacha & Token Economy
* 5 Rarities: common (1 skill), uncommon (2 skills), rare (3 skills), epic (4 skills), legend (5 skills).
* 4 Token Tiers:
   1. Bronze Sigil (bronze): Pulls Common / Uncommon / Rare. Per 100-pull cycle: guarantees 10 Uncommon and 1 Rare.
   2. Silver Relic (silver): Pulls Rare / Epic / Legend. Per 200-pull cycle: guarantees 1 Legend, hard-capped at max 4 Legends.
   3. Gold Crown (gold): Pulls Epic / Legend. Per 100-pull cycle: guarantees 1 Legend, hard-capped at max 10 Legends.
   4. Platinum Eclipse (platinum): Pulls 100% Legend. Currently obtainable only by upgrading 100 Gold Crowns.
* Fragments & 100×100 Upgrade Chain:
   * 100 Token Fragments → 1 Token (for Bronze, Silver, Gold).
   * 100 Bronze Sigils → 1 Silver Relic (100 × 100 Bronze fragments).
   * 100 Silver Relics → 1 Gold Crown.
   * 100 Gold Crowns → 1 Platinum Eclipse.
* Monster Fragments: Every pull awards Monster Fragments; collecting 100 fragments of a monster lets the player directly summon it. Partial fragments cannot be used in battle.
* Cumulative Luck: Increases by a small % on non-Legend Silver/Gold pulls (never jumping to 100%, capped at 50%) to boost extra Legend odds within cycle caps. Clearing Boss stages also has a low random chance (5%) to permanently grant +1% Luck.


________________


3. Monster Progression, 8 Stats & Skills
* 8 Stats: hp, def, atk, spd, acc, res, cr (capped at 1.0 / 100%), cd (uncapped).
* Star Rank & Level Cap (Max Lv 60):
   * Every pulled monster starts at 1★, Level 1.
   * Max level by Star Rank: 1★ = 10, 2★ = 20, 3★ = 30, 4★ = 40, 5★ = 50, 6★ = 60.
* Evolution (Star Upgrade):
   * At max level for Star S, sacrifice S + 1 fodder monsters of Star S (e.g., 2 × 1★ monsters to reach 2★).
   * Evolved monster resets to Level 1 at Star S + 1 with higher stat scaling and unlocks its next skill.
* Skills:
   * Skill count by rarity: Common 1, Uncommon 2, Rare 3, Epic 4, Legend 5.
   * Skill types: active, passive, and lead (Lead skills appear ONLY on Epic and Legend; active when placed in Squad Slot 1).
* EXP Sources: Boss stages, Resource stages, and Rest Area (strictly limited to 5 slots, gaining 50% passive EXP per stage clear).


________________


4. Stamina-Based Turn-Order Combat
* Elemental Triangle: Fire > Grass > Water > Fire (1.25× outgoing / 0.85× incoming; same/neutral 1.0×).
* Stamina Turn Gauge (0–100): Each tick, every living unit gains Stamina proportional to spd * speedMod. The first unit to reach 100 acts next.
* Stamina Manipulation: Active/passive skills can Steal enemy Stamina, Give/Boost ally or self Stamina, or apply Speed Up / Slow buffs (checked via acc vs res).
* Damage Formula: ATK * SkillMult * (100 / (100 + TargetDEF)) * ElementalMult * (Crit ? CD : 1.0).


________________


5. Core state Schema
{
  "tokens": { "bronze": 100, "silver": 3, "gold": 1, "platinum": 0 },
  "tokenFragments": { "bronze": 50, "silver": 20, "gold": 0 },
  "heroFragments": {},
  "instances": [{ "uid": "m_1", "heroId": "l_solaris", "star": 1, "level": 1, "exp": 0 }],
  "squad": ["m_1"],
  "restArea": [],
  "luck": 0,
  "cycles": {
    "bronze": { "pulls": 0, "uncommon": 0, "rare": 0 },
    "silver": { "pulls": 0, "legend": 0 },
    "gold": { "pulls": 0, "legend": 0 }
  },
  "stage": 1
}
