import { THEME_LIST } from "./theme-list";

// How Instant Reply looks inside Gmail: the theme, and whether drafts carry the "New" mark. Chosen in the
// toolbar popup, read by the content script. Kept apart from the settings object so the content script
// never reads the API key.

export const LOOK_KEY = "look";
export const DEFAULT_LOOK = THEME_LIST[0].id;

export function asLook(value: unknown): string {
  return THEME_LIST.some((t) => t.id === value) ? (value as string) : DEFAULT_LOOK;
}

export async function getLook(): Promise<string> {
  return asLook((await chrome.storage.local.get(LOOK_KEY))[LOOK_KEY]);
}

export async function setLook(look: string): Promise<void> {
  await chrome.storage.local.set({ [LOOK_KEY]: look });
}

// The "New" mark shows on the first few Refactors so the flow is clear, then only if turned on.

export const NEW_MARK_KEY = "newMark";
export const NEW_MARK_INTRO = 3;

export interface NewMark {
  /** How many Refactors have shown the mark so far. */
  shown: number;
  /** Show it on every Refactor. */
  always: boolean;
}

export function asNewMark(value: unknown): NewMark {
  const v = (value ?? {}) as Partial<NewMark>;
  return { shown: Number.isFinite(v.shown) ? Math.max(0, Number(v.shown)) : 0, always: v.always === true };
}

export function showsNew(mark: NewMark): boolean {
  return mark.always || mark.shown < NEW_MARK_INTRO;
}

/** The mark after one more Refactor that showed it. */
export function countShown(mark: NewMark): NewMark {
  return { ...mark, shown: mark.shown + 1 };
}

export async function getNewMark(): Promise<NewMark> {
  return asNewMark((await chrome.storage.local.get(NEW_MARK_KEY))[NEW_MARK_KEY]);
}

export async function setNewMark(mark: NewMark): Promise<void> {
  await chrome.storage.local.set({ [NEW_MARK_KEY]: mark });
}

// The band behind the To line of an inline reply (FragPunk's ink bar, Beach's lagoon water) is loud, so
// it is off unless turned on in the popup. Off, the To line stays plain Gmail and the rest of the theme
// still dresses the box. New emails and popped out replies always keep their thin line under Subject.

export const HEAD_BAND_KEY = "headBand";

export async function getHeadBand(): Promise<boolean> {
  return (await chrome.storage.local.get(HEAD_BAND_KEY))[HEAD_BAND_KEY] === true;
}

export async function setHeadBand(on: boolean): Promise<void> {
  await chrome.storage.local.set({ [HEAD_BAND_KEY]: on });
}
