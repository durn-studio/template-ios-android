import { Vec2 } from "planck";

import { addBody, type Body, type World } from "@/lib/physics";
import type { Footballer } from "@/constants/footballers";

// Ability handlers — invoked when the player taps the ability
// button mid-flight. Each takes the current set of active footballer
// bodies and returns the next set (which may add or remove members).
//
// Box2D safety: body destruction inside a step is forbidden, so
// these run from PhysicsCanvas's onAfterStep callback. Spawning new
// bodies inside a step is allowed.
//
// Phase 4 implements bananaKick + splitShot. Header / Goalie /
// PowerShot are passive (baked into launch velocity or body stats)
// and don't appear here.

interface AbilityCtx {
  world: World;
  balls: Set<Body>;
  footballer: Footballer;
}

/** Banana Kick: lateral impulse perpendicular to current velocity.
 *  Sign is biased toward +Y (downward curve) so the trajectory
 *  bends downward — feels like a topspin shot. */
function applyBananaKick(ctx: AbilityCtx): Set<Body> {
  const next = new Set(ctx.balls);
  for (const ball of ctx.balls) {
    const v = ball.getLinearVelocity();
    const speed = Math.hypot(v.x, v.y);
    if (speed < 0.01) continue;
    // Perpendicular vector (rotated +90°): (-vy, vx). For a ball
    // travelling up-right (vx>0, vy<0), this gives (-vy, vx) =
    // (+, +) — i.e. down and right. Adds a downward curve.
    const perpX = -v.y / speed;
    const perpY = v.x / speed;
    // Impulse magnitude scales with footballer's ABL stat so
    // higher-tier banana-kickers curve harder.
    const impulseMag = ctx.footballer.stats.abl * 1.5;
    const mass = ball.getMass();
    ball.applyLinearImpulse(
      Vec2(perpX * impulseMag * mass, perpY * impulseMag * mass),
      ball.getPosition(),
      true,
    );
  }
  return next;
}

/** Split Shot: replace each active ball with three balls — one
 *  continuing straight, two angled at ±SPLIT_ANGLE. Each child
 *  inherits the parent's footballer stats but is cheaper to render
 *  + scores at reduced bounty (handled by ball userData id). */
const SPLIT_ANGLE = 0.32; // ~18° from centre

function applySplitShot(ctx: AbilityCtx): Set<Body> {
  const next = new Set<Body>();
  for (const ball of ctx.balls) {
    const v = ball.getLinearVelocity();
    const speed = Math.hypot(v.x, v.y);
    if (speed < 0.01) {
      // No velocity — preserve the ball as-is rather than spawning
      // three stationary copies.
      next.add(ball);
      continue;
    }
    const pos = ball.getPosition();
    // Tear down the parent first so the three children don't
    // immediately collide with it.
    ctx.world.destroyBody(ball);
    for (const angle of [-SPLIT_ANGLE, 0, SPLIT_ANGLE]) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const childVx = v.x * c - v.y * s;
      const childVy = v.x * s + v.y * c;
      // Slight forward offset so the children don't overlap each
      // other on spawn.
      const child = addBody(ctx.world, {
        shape: "circle",
        position: { x: pos.x + 0.05 * c, y: pos.y + 0.05 * s },
        radius: ctx.footballer.radius * 0.8,
        density: ctx.footballer.density,
        friction: ctx.footballer.friction,
        restitution: ctx.footballer.restitution,
        color: ctx.footballer.color,
        id: "ball",
      });
      child.setLinearVelocity(Vec2(childVx, childVy));
      next.add(child);
    }
  }
  return next;
}

/** Dispatch the footballer's active ability against the current
 *  ball set. Returns the next ball set; caller swaps the ref. */
export function applyAbility(ctx: AbilityCtx): Set<Body> {
  switch (ctx.footballer.ability) {
    case "bananaKick":
      return applyBananaKick(ctx);
    case "splitShot":
      return applySplitShot(ctx);
    case "powerShot":
    case "header":
    case "goalie":
      // Passive abilities — no mid-flight effect.
      return ctx.balls;
  }
}
