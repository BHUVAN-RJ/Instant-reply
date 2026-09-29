// OpenRouter key and model (set from the toolbar popup) and the learning switch (settings page).
// Only the service worker reads the key.

export const DEFAULT_MODEL = "z-ai/glm-5.3";
export const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key";

export interface Settings {
  apiKey: string;
  model: string;
  /** Learn the voice from change requests and edits made before sending. */
  learning: boolean;
}

const SETTINGS_KEY = "settings";

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { apiKey: "", model: DEFAULT_MODEL, learning: true, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}
