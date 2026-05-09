// Slam Goal — footballer roster.
//
// Phase 4 ships the full Street Pitch line-up of 5 (per the design
// doc §4.2). Phase 5 adds the rest of World 1's roster + ability
// upgrades.
//
// Stats use the doc's PWR / ACC / ABL / DUR (1-5) shorthand. Concrete
// physics values (radius, density, restitution) are tuned per
// footballer rather than derived from stats — playtesting taught us
// that the "feel" budget is small and a derivation formula tends to
// flatten distinctions.
//
// Abilities split into two categories:
//   • Passive (applied at launch / body creation): powerShot,
//     header, goalie. Player doesn't trigger; the footballer's
//     intrinsic stats produce the effect.
//   • Active (tap to trigger mid-flight, once per shot):
//     bananaKick, splitShot. Game screen shows an ability button
//     while the ball is in flight; tap fires the effect via
//     applyAbility().

export type AbilityId =
  | "powerShot"
  | "bananaKick"
  | "splitShot"
  | "header"
  | "goalie";

export interface FootballerStats {
  /** Power — launch impulse multiplier. 1-5, design doc §4.2. */
  pwr: number;
  /** Accuracy — trajectory preview length / aim assist. */
  acc: number;
  /** Ability cooldown / strength tier. */
  abl: number;
  /** Durability — body density / resistance to deflection. */
  dur: number;
}

export interface Footballer {
  id: string;
  name: string;
  /** Body radius in meters. */
  radius: number;
  /** Box2D body density. Higher = more impact damage. */
  density: number;
  /** Bounciness. */
  restitution: number;
  friction: number;
  /** Skia color string — Phase 5 swaps for sprite sheets. */
  color: string;
  stats: FootballerStats;
  ability: AbilityId;
}

const FOOTBALLERS: readonly Footballer[] = [
  {
    id: "striker_sam",
    name: "Striker Sam",
    radius: 0.28,
    density: 4,
    restitution: 0.35,
    friction: 0.4,
    color: "#ffd166",
    stats: { pwr: 4, acc: 3, abl: 3, dur: 3 },
    ability: "powerShot",
  },
  {
    id: "banana_belle",
    name: "Banana Belle",
    radius: 0.26,
    density: 3.2,
    restitution: 0.4,
    friction: 0.4,
    color: "#06d6a0",
    stats: { pwr: 3, acc: 4, abl: 4, dur: 2 },
    ability: "bananaKick",
  },
  {
    id: "split_steve",
    name: "Split Steve",
    radius: 0.26,
    density: 3,
    restitution: 0.4,
    friction: 0.4,
    color: "#4cc9f0",
    stats: { pwr: 3, acc: 3, abl: 5, dur: 2 },
    ability: "splitShot",
  },
  {
    id: "header_hank",
    name: "Header Hank",
    radius: 0.36,
    density: 8,
    restitution: 0.18,
    friction: 0.5,
    color: "#bb88ff",
    stats: { pwr: 5, acc: 2, abl: 2, dur: 5 },
    ability: "header",
  },
  {
    id: "goalie_greg",
    name: "Goalie Greg",
    radius: 0.32,
    density: 3,
    restitution: 0.85,
    friction: 0.3,
    color: "#ff9f1c",
    stats: { pwr: 3, acc: 3, abl: 2, dur: 4 },
    ability: "goalie",
  },
];

export function getFootballerById(id: string): Footballer | undefined {
  return FOOTBALLERS.find((f) => f.id === id);
}

/** The default footballer used when a level doesn't specify one. */
export const DEFAULT_FOOTBALLER_ID = "striker_sam";

/** Returns true if the ability needs an in-flight tap to fire.
 *  Passive abilities (powerShot, header, goalie) just bake into
 *  the launch / body stats; active abilities (bananaKick, splitShot)
 *  surface as an ability button while the ball is in flight. */
export function isActiveAbility(a: AbilityId): boolean {
  return a === "bananaKick" || a === "splitShot";
}

/** Launch-velocity multiplier for the footballer's passive
 *  modifiers. Striker's Power Shot adds 30 % at launch; the rest
 *  use 1.0 unless playtesting flips them. */
export function launchVelocityMultiplier(f: Footballer): number {
  if (f.ability === "powerShot") return 1.3;
  return 1.0;
}

export { FOOTBALLERS };

