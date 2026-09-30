// Who the user is, for sign-offs: their name and email signature. Seen on the Gmail page (the account
// button, a signature Gmail put in a reply box) and kept, so replies without one still know it. What the
// user types on the settings page wins over what was seen. Kept apart from the settings object so the
// content script never reads the API key.

export interface Identity {
  /** Typed by the user on the settings page. */
  name?: string;
  signature?: string;
  /** Last seen in Gmail. */
  seenName?: string;
  seenSignature?: string;
}

export const IDENTITY_KEY = "identity";

export async function getIdentity(): Promise<Identity> {
  return ((await chrome.storage.local.get(IDENTITY_KEY))[IDENTITY_KEY] as Identity | undefined) ?? {};
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await chrome.storage.local.set({ [IDENTITY_KEY]: identity });
}

/** Records what the page shows, writing only on change. */
export async function noteSeen(seen: Pick<Identity, "seenName" | "seenSignature">): Promise<void> {
  const current = await getIdentity();
  const next = { ...current };
  if (seen.seenName) next.seenName = seen.seenName;
  if (seen.seenSignature) next.seenSignature = seen.seenSignature;
  if (next.seenName !== current.seenName || next.seenSignature !== current.seenSignature) await saveIdentity(next);
}

export const resolvedName = (i: Identity): string => (i.name || i.seenName || "").trim();
export const resolvedSignature = (i: Identity): string => (i.signature || i.seenSignature || "").trim();
