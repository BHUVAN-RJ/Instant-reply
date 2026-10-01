import type { SwooshContext, ThemePack } from "./contract";
import { reducedMotion } from "./shared";

// Runs a theme's swoosh. Holds the rules every theme gets for free: reduced motion skips the animation,
// the draft is written exactly once, and a phase that throws never loses the draft.

/** Starts the theme's "before" loop; returns the stop function. */
export function startThinking(pack: ThemePack, ctx: SwooshContext): () => void {
  if (reducedMotion()) return () => {};
  try {
    return pack.swoosh.before(ctx);
  } catch (error) {
    console.error("[instant-reply] swoosh before", error);
    return () => {};
  }
}

/** Writes the draft under the theme's "during", then runs "after". Resolves once the draft is readable. */
export async function playSwoosh(pack: ThemePack, ctx: SwooshContext, write: () => void): Promise<void> {
  let written = false;
  const once = () => {
    if (written) return;
    written = true;
    write();
  };
  if (reducedMotion()) return once();
  try {
    const state = await pack.swoosh.during(ctx, once);
    once();
    pack.swoosh.after(ctx, state);
  } catch (error) {
    console.error("[instant-reply] swoosh", error);
    once();
  }
}
