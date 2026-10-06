// Keeps the inbox where I scrolled it. When labels change from elsewhere (the job tagger labelling
// or archiving threads), Gmail redraws the list and jumps it back to the top. A jump to the top that
// I did not ask for (no wheel, key, click or touch just before, same view) is undone.

const QUIET_MS = 1000; // a jump this long after my last input is not mine
const FAR_PX = 200; // only a list scrolled at least this far is worth putting back
const TOP_PX = 50;

export interface Jump {
  from: number;
  to: number;
  sameView: boolean;
  sinceInputMs: number;
}

export function shouldRestore(jump: Jump): boolean {
  return jump.sameView && jump.sinceInputMs > QUIET_MS && jump.from >= FAR_PX && jump.to < TOP_PX;
}

export function initScrollGuard(): void {
  let lastInput = 0;
  const mark = () => {
    lastInput = Date.now();
  };
  for (const type of ["wheel", "keydown", "pointerdown", "touchstart"]) {
    addEventListener(type, mark, { capture: true, passive: true });
  }

  const last = new WeakMap<Element, { top: number; view: string }>();
  addEventListener(
    "scroll",
    (event) => {
      const el = event.target instanceof Element ? event.target : document.scrollingElement;
      if (!el) return;
      const view = location.hash;
      const before = last.get(el);
      const top = el.scrollTop;
      if (
        before &&
        shouldRestore({ from: before.top, to: top, sameView: before.view === view, sinceInputMs: Date.now() - lastInput })
      ) {
        // Gmail may redraw once more after the jump, so put it back now and on the next frame.
        el.scrollTop = before.top;
        requestAnimationFrame(() => {
          if (el.scrollTop < TOP_PX) el.scrollTop = before.top;
        });
        return;
      }
      last.set(el, { top, view });
    },
    { capture: true, passive: true },
  );
}
