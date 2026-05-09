// Slam Goal — destructible materials.
//
// Phase 4 expands the Street Pitch material set per design doc §3.1:
// cardboard (cheap and easy), wood (baseline), corrugated tin
// (medium HP but light, deflects readily). `enemy` stays as the
// stand-in target until Phase 5 adds the proper enemy line-up.
//
// `hp` is the cumulative impact damage threshold above which a body
// breaks. Damage is computed at contact time as `impulse * IMPACT_DAMAGE_SCALE`
// (see app/game.tsx) so HP values calibrate against typical impact
// impulses (10-100 kg·m/s for a Striker shot at full pull).

export interface Material {
  id: string;
  /** Cumulative impact-energy threshold for destruction. */
  hp: number;
  /** Box2D density. */
  density: number;
  friction: number;
  restitution: number;
  /** Skia color — Phase 5 swaps for sprites. */
  color: string;
  /** Score awarded on destruction. */
  scoreOnDestroy: number;
  /** Optional fragments to spawn on destruction. Phase 4 wires the
   *  particle layer; Phase 3 uses this only for the score. */
  fragments?: number;
}

const MATERIALS: readonly Material[] = [
  // Cardboard — cheap, breaks on a glancing tap. Stack-fillers,
  // crowd-the-funnel obstacles. Density < 1 so cardboard tips and
  // tumbles under modest impact.
  {
    id: "cardboard",
    hp: 30,
    density: 0.6,
    friction: 0.6,
    restitution: 0.05,
    color: "#d4a373",
    scoreOnDestroy: 50,
    fragments: 2,
  },
  // Wood — Street Pitch baseline. Heavier than cardboard, rewards
  // direct hits.
  {
    id: "wood",
    hp: 80,
    density: 1.5,
    friction: 0.5,
    restitution: 0.2,
    color: "#a47148",
    scoreOnDestroy: 100,
    fragments: 3,
  },
  // Corrugated tin — light + bouncy. Easy to deflect into other
  // structures, which makes for ricochet style bonuses.
  {
    id: "tin",
    hp: 60,
    density: 0.9,
    friction: 0.3,
    restitution: 0.5,
    color: "#9ca3af",
    scoreOnDestroy: 150,
    fragments: 4,
  },
  // Enemy stand-in — bouncy ball that yields big points on knockout.
  // Phase 5 replaces with the proper enemy line-up.
  {
    id: "enemy",
    hp: 40,
    density: 1,
    friction: 0.4,
    restitution: 0.6,
    color: "#ef476f",
    scoreOnDestroy: 500,
    fragments: 5,
  },
  // Boss enemy — Street Pitch's Captain. Big, heavy, lots of HP,
  // big bounty. Used in level 12 (the World 1 boss). Phase 5b's art
  // pass will give him a proper sprite + idle anim.
  {
    id: "boss_captain",
    hp: 320,
    density: 4,
    friction: 0.5,
    restitution: 0.3,
    color: "#7f0000",
    scoreOnDestroy: 3000,
    fragments: 8,
  },
  // Shipping container — large, heavy static piece used in the boss
  // level to gate access to the captain + goal pipes. Indestructible
  // (very high HP) so the player has to route shots around it.
  {
    id: "container",
    hp: 9999,
    density: 5,
    friction: 0.7,
    restitution: 0.05,
    color: "#5a4a3a",
    scoreOnDestroy: 0,
  },
];

export function getMaterialById(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id);
}

export { MATERIALS };
