// Which look Instant Reply wears inside Gmail. Chosen in the toolbar popup, read by the content script.
// Kept apart from the settings object so the content script never reads the API key.

export type Look = "fragpunk" | "beach";
export const LOOK_KEY = "look";
export const DEFAULT_LOOK: Look = "fragpunk";

export function asLook(value: unknown): Look {
  return value === "beach" ? "beach" : DEFAULT_LOOK;
}

export async function getLook(): Promise<Look> {
  return asLook((await chrome.storage.local.get(LOOK_KEY))[LOOK_KEY]);
}

export async function setLook(look: Look): Promise<void> {
  await chrome.storage.local.set({ [LOOK_KEY]: look });
}
