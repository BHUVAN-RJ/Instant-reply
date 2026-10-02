import { BASE_RULES, createAgent, forgetOldData, type Agent, type Thread } from "@instant-reply/core";
import { createChromeStore } from "../adapters/chrome-store";
import { createOpenRouter } from "../adapters/openrouter";
import type { DraftResponse, Message, StatsView, VoiceOverview, VoiceResponse } from "../messages";
import { contextProviders, eventSinks } from "../plugins";
import { getIdentity, resolvedName, resolvedSignature } from "../identity";
import { getSettings, saveSettings } from "../settings";
import { STATS_KEY, STATS_OWNER, STATS_URL, createStats, type StatsState } from "../stats";

// Service worker: the composition root. Wires the core agent to Chrome storage,
// OpenRouter and any plugins, and is the only place that touches the API key.

const store = createChromeStore();

const stats = createStats({
  url: STATS_URL,
  load: async () => (await chrome.storage.local.get(STATS_KEY))[STATS_KEY] as Partial<StatsState> | undefined,
  save: (state) => chrome.storage.local.set({ [STATS_KEY]: state }),
  fallbackName: async () => resolvedName(await getIdentity()),
});
const sinks = [...eventSinks, stats.sink];
// Anything left from a failed send goes out when the worker wakes.
void stats.flush();
// Email text older than 30 days is forgotten each time the worker wakes.
void forgetOldData(store, Date.now()).catch((error) => console.error("[instant-reply] forgetting old data failed", error));

async function agentFromSettings(): Promise<Agent | null> {
  const settings = await getSettings();
  if (!settings.apiKey) return null;
  return createAgent({ store, llm: createOpenRouter(settings), contextProviders, eventSinks: sinks, learning: settings.learning });
}

/** Toggling, recording sends and reading the voice need no key, so they use an agent without a model. */
async function offlineAgent(): Promise<Agent> {
  const { learning } = await getSettings();
  return createAgent({
    store,
    llm: { complete: () => Promise.reject(new Error("no model configured")) },
    contextProviders,
    eventSinks: sinks,
    learning,
  });
}

/**
 * Name: typed on the settings page, else the page's, else last seen. Signature: the one Gmail put in this
 * box (it stays there), else typed, else last seen.
 */
async function withIdentity(thread: Thread): Promise<Thread> {
  const identity = await getIdentity();
  return {
    ...thread,
    userName: identity.name?.trim() || thread.userName || identity.seenName || undefined,
    userSignature: thread.userSignature || resolvedSignature(identity) || undefined,
  };
}

async function draft(msg: Extract<Message, { type: "draft" }>): Promise<DraftResponse> {
  const agent = await agentFromSettings();
  if (!agent) return { ok: false, error: "no-key" };
  try {
    return { ok: true, ...(await agent.draft({ ...msg.request, thread: await withIdentity(msg.request.thread) })) };
  } catch (error) {
    console.error("[instant-reply] draft failed", error);
    return { ok: false, error: "failed", detail: String(error) };
  }
}

async function overview(): Promise<VoiceOverview> {
  const settings = await getSettings();
  return { voice: await store.getVoice(), baseRules: BASE_RULES, learning: settings.learning, hasKey: Boolean(settings.apiKey) };
}

/** Settings page actions. The ones that need the model report a missing key instead of failing. */
async function voice(msg: Message): Promise<VoiceResponse> {
  try {
    switch (msg.type) {
      case "voice-get":
        return { ok: true, overview: await overview() };
      case "set-learning":
        await saveSettings({ ...(await getSettings()), learning: msg.enabled });
        return { ok: true, overview: await overview() };
      case "voice-reset":
        await (await offlineAgent()).resetVoice();
        return { ok: true, overview: await overview() };
      case "voice-learn":
      case "voice-chat": {
        const agent = await agentFromSettings();
        if (!agent) return { ok: false, error: "no-key" };
        if (msg.type === "voice-learn") {
          await agent.learn();
          return { ok: true, overview: await overview() };
        }
        const { reply, changed } = await agent.chatAboutVoice(msg.message);
        return { ok: true, overview: await overview(), reply, changed };
      }
      default:
        return { ok: false, error: "failed", detail: `unknown message ${msg.type}` };
    }
  } catch (error) {
    console.error("[instant-reply] settings action failed", error);
    return { ok: false, error: "failed", detail: String(error) };
  }
}

/** Sends are compared with the last draft; learning itself needs the model, so it waits for a key. */
async function sent(msg: Extract<Message, { type: "sent" }>): Promise<void> {
  const agent = (await agentFromSettings()) ?? (await offlineAgent());
  await agent.recordSent(msg.threadId, msg.sentText);
}

function statsView(state: StatsState): StatsView {
  return { name: state.name, sharing: state.sharing, totals: state.totals, enabled: Boolean(STATS_URL), owner: STATS_OWNER };
}

async function openSettings(): Promise<void> {
  try {
    await chrome.action.openPopup();
  } catch {
    await chrome.tabs.create({ url: chrome.runtime.getURL("src/popup/index.html") });
  }
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  switch (msg.type) {
    case "draft":
      void draft(msg).then(sendResponse);
      return true;
    case "set-active":
      void offlineAgent()
        .then((agent) => agent.setActive(msg.threadId, msg.active))
        .then(sendResponse);
      return true;
    case "sent":
      void sent(msg).catch((error) => console.error("[instant-reply] recording a send failed", error));
      return false;
    case "open-settings":
      void openSettings();
      return false;
    case "voice-get":
    case "voice-chat":
    case "voice-learn":
    case "voice-reset":
    case "set-learning":
      void voice(msg).then(sendResponse);
      return true;
    case "stats-get":
      void stats.get().then((state) => sendResponse(statsView(state)));
      return true;
    case "stats-update":
      void stats.update(msg.change).then((state) => sendResponse(statsView(state)));
      return true;
  }
});
