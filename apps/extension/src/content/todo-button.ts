import type { JobResponse, Message } from "../messages";

// "Done" button: floats over Gmail while an open thread carries the job tagger's TO DO
// label, and takes that label off when clicked (through the tagger, so it is not read as a wrong tag).
// It can be dragged anywhere; the spot is remembered. Neutral look, not themed.

export const TODO_POSITION_KEY = "todoButtonPosition";
const MARGIN = 8;
const DRAG_THRESHOLD = 4;

export interface Point {
  left: number;
  top: number;
}

/** Keeps the button fully on screen; with no saved spot it sits on the right, a third of the way down. */
export function placeButton(
  saved: Point | undefined,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): Point {
  const wanted = saved ?? { left: viewport.width - size.width - 24, top: Math.round(viewport.height / 3) };
  const maxLeft = Math.max(MARGIN, viewport.width - size.width - MARGIN);
  const maxTop = Math.max(MARGIN, viewport.height - size.height - MARGIN);
  return {
    left: Math.min(Math.max(wanted.left, MARGIN), maxLeft),
    top: Math.min(Math.max(wanted.top, MARGIN), maxTop),
  };
}

const STYLE = `
  :host { all: initial; }
  button {
    position: fixed; z-index: 2147483000; width: 56px; height: 56px; padding: 0;
    border: 1px solid #dadce0; border-radius: 4px;
    background: #fff; color: #1f1f1f; font: 500 13px/1 "Google Sans", Roboto, Arial, sans-serif;
    box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3), 0 4px 8px rgba(60, 64, 67, 0.15);
    cursor: grab; user-select: none; touch-action: none;
    transition: background 150ms, border-color 150ms, box-shadow 150ms, color 150ms;
  }
  button:hover { background: #f6f8f6; }
  button:active { cursor: grabbing; }
  /* Clicked: glows green while the label comes off, then goes away. */
  button.working, button.done {
    background: #16a765; border-color: #16a765; color: #fff; cursor: progress;
    box-shadow: 0 0 0 3px rgba(22, 167, 101, 0.35), 0 0 18px 6px rgba(22, 167, 101, 0.55);
  }
  button.failed { border-color: #d93025; box-shadow: 0 0 0 3px rgba(217, 48, 37, 0.35); }
  @media (prefers-color-scheme: dark) {
    button { background: #2d2e30; color: #e8eaed; border-color: #5f6368; }
    button:hover { background: #35363a; }
  }
`;

function visibleThreadId(): string {
  for (const heading of document.querySelectorAll<HTMLElement>("h2.hP[data-legacy-thread-id]")) {
    if (heading.offsetParent !== null) return heading.dataset.legacyThreadId ?? "";
  }
  return "";
}

function ask(message: Message): Promise<JobResponse> {
  return chrome.runtime.sendMessage(message).catch((error: unknown) => ({ ok: false, error: String(error) }) as JobResponse);
}

export function initTodoButton(): void {
  const host = document.createElement("div");
  host.dataset.irTodo = "";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  const button = document.createElement("button");
  button.type = "button";
  button.title = "Take the TO DO label off this thread. Drag to move.";
  button.textContent = "Done";
  root.append(style, button);
  button.hidden = true;
  document.body.append(host);

  let saved: Point | undefined;
  let shownFor = "";
  let current = "";
  const status = new Map<string, string>(); // thread id -> label key, for this page load

  const place = () => {
    const rect = button.getBoundingClientRect();
    const spot = placeButton(saved, { width: rect.width || 56, height: rect.height || 56 }, { width: innerWidth, height: innerHeight });
    button.style.left = `${spot.left}px`;
    button.style.top = `${spot.top}px`;
  };
  void chrome.storage.local.get(TODO_POSITION_KEY).then((stored) => {
    saved = stored[TODO_POSITION_KEY] as Point | undefined;
    place();
  });
  addEventListener("resize", place);

  const show = (thread: string) => {
    shownFor = thread;
    button.hidden = false;
    place();
  };
  const hide = () => {
    shownFor = "";
    button.hidden = true;
  };

  async function check(): Promise<void> {
    const thread = visibleThreadId();
    if (thread === current) return;
    current = thread;
    if (shownFor && shownFor !== thread) hide();
    if (!thread) return;
    if (!status.has(thread)) {
      const answer = await ask({ type: "job-status", thread });
      if (!answer.ok) {
        console.warn("[instant-reply] job tagger status failed", answer.error);
        return;
      }
      status.set(thread, answer.label);
    }
    if (current === thread && status.get(thread) === "to do") show(thread);
  }

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void check(), 300);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  addEventListener("hashchange", schedule);
  schedule();

  // Drag anywhere; a press that barely moves is a click.
  let start: { x: number; y: number; left: number; top: number } | null = null;
  let dragged = false;
  button.addEventListener("pointerdown", (event) => {
    const rect = button.getBoundingClientRect();
    start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    dragged = false;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragged = true;
    saved = { left: start.left + dx, top: start.top + dy };
    place();
  });
  button.addEventListener("pointerup", () => {
    if (start && dragged && saved) void chrome.storage.local.set({ [TODO_POSITION_KEY]: saved });
    start = null;
  });

  button.addEventListener("click", async () => {
    if (dragged || button.classList.contains("working")) return;
    const thread = shownFor;
    if (!thread) return;
    button.classList.remove("failed");
    button.classList.add("working");
    const answer = await ask({ type: "job-done", thread });
    button.classList.remove("working");
    if (answer.ok && answer.label !== "to do") {
      status.set(thread, answer.label);
      button.classList.add("done");
      setTimeout(() => {
        button.classList.remove("done");
        if (shownFor === thread) hide();
      }, 600);
      return;
    }
    console.warn("[instant-reply] job tagger done failed", answer.ok ? "still To do" : answer.error);
    button.classList.add("failed");
    setTimeout(() => button.classList.remove("failed"), 2500);
  });
}
