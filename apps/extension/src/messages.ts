import type { DraftRequest, VoiceProfile } from "@instant-reply/core";

// Protocol between the Gmail content script, the settings page and the service worker.

export type Message =
  | { type: "draft"; request: DraftRequest }
  | { type: "set-active"; threadId: string; active: boolean }
  | { type: "sent"; threadId: string; sentText: string }
  | { type: "open-settings" }
  | { type: "voice-get" }
  | { type: "voice-chat"; message: string }
  | { type: "voice-learn" }
  | { type: "voice-reset" }
  | { type: "set-learning"; enabled: boolean }
  | { type: "stats-get" }
  | { type: "stats-update"; change: { name?: string; sharing?: boolean } }
  | { type: "job-status"; thread: string }
  | { type: "job-done"; thread: string };

/** The job tagger's label on a thread ("to do", "applied", ...; "" for none), or why it is unknown. */
export type JobResponse = { ok: true; label: string } | { ok: false; error: string };

export type DraftResponse =
  | { ok: true; draft: string }
  | { ok: false; error: "no-key" | "failed"; detail?: string };

/** Everything the settings page shows. */
export interface VoiceOverview {
  voice: VoiceProfile;
  baseRules: string[];
  learning: boolean;
  hasKey: boolean;
}

export type VoiceResponse =
  | { ok: true; overview: VoiceOverview; reply?: string; changed?: boolean }
  | { ok: false; error: "no-key" | "failed"; detail?: string };

/** What the popup shows about shared usage counts. */
export interface StatsView {
  name: string;
  sharing: boolean;
  totals: { refactors: number; sent: number };
  /** False when the build has no stats URL, so nothing can be shared. */
  enabled: boolean;
  owner: string;
}
