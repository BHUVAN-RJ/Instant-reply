/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script web app that receives usage counts (docs/STATS.md). Set in apps/extension/.env.local. */
  readonly VITE_STATS_URL?: string;
  /** Job tagger web app (tools/job-tagger/Code.gs, doPost) behind the "To do done" button. */
  readonly VITE_TAGGER_URL?: string;
  /** Same value as the tagger's TAGGER_TOKEN script property. */
  readonly VITE_TAGGER_TOKEN?: string;
}
