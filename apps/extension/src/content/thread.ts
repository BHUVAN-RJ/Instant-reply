import type { ThreadMessage } from "@instant-reply/core";
import { renderedText } from "./text";

// Gmail source adapter: reads a thread from the page into the core Thread contract.
// Selectors are documented in docs/gmail-dom.md.

/** Quoted history, trimmed-content toggles and security banners are noise for the agent. */
const NOISE = ".gmail_quote, .adL, .yj6qo, [id*='pfptBanner']";
const EXPAND_TIMEOUT_MS = 4000;

function collapsedCount(root: HTMLElement): number {
  return root.querySelectorAll('div[role="listitem"][aria-expanded="false"]').length;
}

/** Collapsed messages only carry a snippet, so open them all first. */
async function expandAll(root: HTMLElement): Promise<void> {
  if (collapsedCount(root) === 0) return;
  const button = root.querySelector<HTMLElement>('button[aria-label="Expand all"], button[jsname="tRarif"]');
  if (!button) return;
  button.click();
  const deadline = Date.now() + EXPAND_TIMEOUT_MS;
  while (collapsedCount(root) > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function readMessage(message: HTMLElement, userEmail: string): ThreadMessage {
  const sender = message.querySelector<HTMLElement>(".gD");
  const name = sender?.getAttribute("name") ?? "";
  const email = sender?.getAttribute("email") ?? "";
  const body = message.querySelector<HTMLElement>(".a3s")?.cloneNode(true) as HTMLElement | undefined;
  body?.querySelectorAll(NOISE).forEach((node) => node.remove());
  return {
    from: email ? `${name} <${email}>` : name,
    fromUser: Boolean(userEmail) && email === userEmail,
    to: [...message.querySelectorAll(".g2")].map((el) => el.getAttribute("email") ?? "").filter(Boolean),
    date: message.querySelector(".g3")?.getAttribute("title") ?? "",
    body: body ? renderedText(body) : "",
  };
}

export async function readMessages(heading: HTMLElement, userEmail: string): Promise<ThreadMessage[]> {
  const root = heading.closest<HTMLElement>('[role="main"]');
  if (!root) return [];
  await expandAll(root);
  return [...root.querySelectorAll<HTMLElement>("div.adn[data-message-id]")].map((m) => readMessage(m, userEmail));
}
