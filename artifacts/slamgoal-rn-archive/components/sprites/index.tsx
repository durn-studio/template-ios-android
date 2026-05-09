// Slam Goal — sprite system entry point.
//
// Re-exports the registry's public API and triggers per-category
// sprite modules to register themselves at module load. The actual
// registry storage lives in ./registry to break the otherwise-
// cyclic import graph.

export {
  registerSprite,
  getSprite,
  type SpriteOpts,
  type SpriteFn,
} from "./registry";

// Side-effect imports — each module's registerSprite() calls run
// at top level when the file is first evaluated.
import "./footballers";
import "./enemies";
import "./materials";

export { SceneBackdrop, SlingshotRig, GoalPost } from "./scene";
