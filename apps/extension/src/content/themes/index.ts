import type { ThemePack } from "../theme/contract";
import beach from "./beach";
import fragpunk from "./fragpunk";

// Every theme pack the content script can wear. Adding a theme: follow docs/THEMES.md, then add it
// here and its meta in ../../theme-list.ts.
export const THEMES: readonly ThemePack[] = [fragpunk, beach];

export function themeById(id: string): ThemePack {
  return THEMES.find((t) => t.meta.id === id) ?? THEMES[0];
}
