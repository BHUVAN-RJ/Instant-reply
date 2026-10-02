/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script web app that receives usage counts (docs/STATS.md). Set in apps/extension/.env.local. */
  readonly VITE_STATS_URL?: string;
}
