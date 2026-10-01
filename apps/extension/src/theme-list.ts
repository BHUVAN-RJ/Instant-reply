import type { ThemeMeta } from "./content/theme/contract";
import { meta as beach } from "./content/themes/beach/meta";
import { meta as fragpunk } from "./content/themes/fragpunk/meta";

// The themes offered in the popup, without their styles or animations. The first is the default.
// Must list the same themes, in the same order, as content/themes/index.ts (a test checks).
export const THEME_LIST: readonly ThemeMeta[] = [fragpunk, beach];
