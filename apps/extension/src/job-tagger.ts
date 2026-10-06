import type { JobResponse } from "./messages";

// Client for the job tagger's web app (tools/job-tagger/Code.gs, doPost), used by the "To do done"
// button. Sends only Gmail's thread id and the shared token; the tagger looks the thread up itself.

export const TAGGER_URL: string = import.meta.env.VITE_TAGGER_URL ?? "";
const TAGGER_TOKEN: string = import.meta.env.VITE_TAGGER_TOKEN ?? "";
const TIMEOUT_MS = 20_000;

export async function askTagger(
  action: "status" | "done",
  thread: string,
  doFetch: typeof fetch = (...args) => fetch(...args),
): Promise<JobResponse> {
  if (!TAGGER_URL || !TAGGER_TOKEN) return { ok: false, error: "not set up" };
  try {
    // text/plain keeps it a simple request; Apps Script answers through a redirect fetch follows.
    const response = await doFetch(TAGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ token: TAGGER_TOKEN, action, thread }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json()) as JobResponse;
    return body && typeof body.ok === "boolean" ? body : { ok: false, error: "bad reply" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
