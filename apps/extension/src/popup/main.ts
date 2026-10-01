import { asLook, getHeadBand, getLook, getNewMark, setHeadBand, setLook, setNewMark } from "../appearance";
import { THEME_LIST } from "../theme-list";
import { DEFAULT_MODEL, OPENROUTER_KEY_URL, getSettings, saveSettings } from "../settings";

const form = document.querySelector<HTMLFormElement>("#form")!;
const keyInput = document.querySelector<HTMLInputElement>("#key")!;
const modelInput = document.querySelector<HTMLInputElement>("#model")!;
const savedHint = document.querySelector<HTMLParagraphElement>("#saved-hint")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save")!;
const removeButton = document.querySelector<HTMLButtonElement>("#remove")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;

function showStatus(text: string, kind: "ok" | "error" | "" = ""): void {
  status.textContent = text;
  status.className = kind;
}

function mask(key: string): string {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function render(): Promise<void> {
  const settings = await getSettings();
  modelInput.value = settings.model;
  keyInput.value = "";
  savedHint.textContent = settings.apiKey ? `Saved: ${mask(settings.apiKey)}` : "No key saved yet.";
  removeButton.disabled = !settings.apiKey;
}

/** Asks OpenRouter whether the key is real before storing it. */
async function keyIsValid(key: string): Promise<boolean> {
  const response = await fetch(OPENROUTER_KEY_URL, { headers: { Authorization: `Bearer ${key}` } });
  return response.status !== 401 && response.status !== 403;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const current = await getSettings();
  const apiKey = keyInput.value.trim() || current.apiKey;
  const model = modelInput.value.trim() || DEFAULT_MODEL;
  if (!apiKey) return showStatus("Paste your OpenRouter key first.", "error");

  saveButton.disabled = true;
  showStatus("Checking key...");
  try {
    if (apiKey !== current.apiKey && !(await keyIsValid(apiKey))) {
      return showStatus("OpenRouter rejected this key.", "error");
    }
    await saveSettings({ ...current, apiKey, model });
    showStatus("Saved.", "ok");
    await render();
  } catch {
    showStatus("Could not reach OpenRouter. Check your connection.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

removeButton.addEventListener("click", async () => {
  const current = await getSettings();
  await saveSettings({ ...current, apiKey: "" });
  showStatus("Key removed.", "ok");
  await render();
});

document.querySelector("#voice")!.addEventListener("click", () => void chrome.runtime.openOptionsPage());

// The theme switches live in every open Gmail tab.
const lookInputs = THEME_LIST.map((theme) => {
  const input = Object.assign(document.createElement("input"), { type: "radio", name: "look", value: theme.id });
  const label = document.createElement("label");
  label.append(input, ` ${theme.name}`);
  document.querySelector("#looks")!.append(label);
  input.addEventListener("change", () => void setLook(asLook(input.value)));
  return input;
});
void getLook().then((look) => lookInputs.forEach((input) => (input.checked = input.value === look)));

// "New" shows on the first few drafts either way; this keeps it on after that.
const newMarkInput = document.querySelector<HTMLInputElement>("#new-mark")!;
void getNewMark().then((mark) => (newMarkInput.checked = mark.always));
newMarkInput.addEventListener("change", async () => void setNewMark({ ...(await getNewMark()), always: newMarkInput.checked }));

// The theme's band behind the To line of replies: off by default, applies live in open Gmail tabs.
const headBandInput = document.querySelector<HTMLInputElement>("#head-band")!;
void getHeadBand().then((on) => (headBandInput.checked = on));
headBandInput.addEventListener("change", () => void setHeadBand(headBandInput.checked));

void render();
