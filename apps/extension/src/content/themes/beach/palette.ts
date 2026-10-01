// Beach palettes. Which one shows follows the clock in California (the friend this look is for),
// read when Refactor is pressed and held for the whole wave. There is no setting to override it.

export type PaletteId = "lagoon" | "hibiscus" | "sunset" | "night";

export interface Palette {
  // buttons, card and icons
  sea: string; sea2: string; lt: string; ltSoft: string; ltMix: string;
  coral: string; coralD: string; onCoral: string; leaf: string; leafD: string;
  wood: string; woodD: string; woodL: string; cream: string; flower: string; flower2: string; ink: string;
  /** Strong enough to read on white and on dark cards, under white text: selection, text cursor, hand. */
  select: string;
  // the wave
  water: { far: string; mid: string; deep: string; abyss: string; foam: string; glow: string | null };
  sand: string; wet: string; grain: [string, string, string];
}

const mix = (hex: string, withWhite: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * withWhite));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

function palette(p: Omit<Palette, "ltMix">): Palette {
  return { ...p, ltMix: mix(p.lt, 0.25) };
}

export const PALETTES: Record<PaletteId, Palette> = {
  lagoon: palette({
    sea: "#0b6fa4", sea2: "#19b3c9", lt: "#7ee6e8", ltSoft: "#e3f8f8", coral: "#ff7a59", coralD: "#d9573a", onCoral: "#ffffff",
    leaf: "#2e9d6a", leafD: "#1d6e49", wood: "#b07a47", woodD: "#6b4526", woodL: "#e2b688", cream: "#fff8ea", flower: "#ff7a59", flower2: "#ffd23f", ink: "#12384a", select: "#e0512f",
    water: { far: "#bff3f1", mid: "#2cc1d3", deep: "#0a6fa0", abyss: "#07496e", foam: "#ffffff", glow: null },
    sand: "#f7e6c4", wet: "#d6b88a", grain: ["#e6cc9a", "#fff7e4", "#d9bd8c"],
  }),
  hibiscus: palette({
    sea: "#0a8a8e", sea2: "#19c3d6", lt: "#c8fbe9", ltSoft: "#e7f8ef", coral: "#ff4f81", coralD: "#c02a55", onCoral: "#ffffff",
    leaf: "#1f9d6b", leafD: "#146b48", wood: "#a0703f", woodD: "#6e4a28", woodL: "#e0b584", cream: "#fffaf0", flower: "#ff4f81", flower2: "#ffd23f", ink: "#0f4b3b", select: "#d6245a",
    water: { far: "#c8fbe9", mid: "#1fc6c9", deep: "#0a8a8e", abyss: "#065a63", foam: "#ffffff", glow: null },
    sand: "#faebd2", wet: "#dcc39a", grain: ["#ecd3a8", "#fff8ea", "#f3c9c9"],
  }),
  sunset: palette({
    sea: "#c65b3a", sea2: "#ff8a3d", lt: "#ffd3a1", ltSoft: "#fbecd6", coral: "#ff5f7e", coralD: "#c9405c", onCoral: "#ffffff",
    leaf: "#5c7a2e", leafD: "#3d5220", wood: "#8a5a34", woodD: "#4a2c1d", woodL: "#d9a574", cream: "#fff4e0", flower: "#ff5f7e", flower2: "#ffb347", ink: "#4a2c1d", select: "#d63d5e",
    water: { far: "#ffd3a1", mid: "#f08a6f", deep: "#b44d4a", abyss: "#6e2a33", foam: "#fff4e0", glow: null },
    sand: "#f6dab2", wet: "#cc9c6c", grain: ["#e7c290", "#fff1dc", "#d7ab7a"],
  }),
  night: palette({
    sea: "#12325e", sea2: "#1d5a8a", lt: "#6ff3ff", ltSoft: "#e6f3ff", coral: "#ffd98a", coralD: "#c9a24a", onCoral: "#2f1f12",
    leaf: "#2c6b5a", leafD: "#1a4538", wood: "#6b4a2f", woodD: "#2f1f12", woodL: "#b08455", cream: "#fff4d6", flower: "#ffd98a", flower2: "#ffd98a", ink: "#0b1e3a", select: "#b8780f",
    water: { far: "#3b6fae", mid: "#16427e", deep: "#0b2752", abyss: "#050f24", foam: "#c9fdff", glow: "#6ff3ff" },
    sand: "#dedde8", wet: "#a8abc4", grain: ["#c9c8d9", "#f4f3fb", "#b7b8cf"],
  }),
};

/** 5 to 11 lagoon, 11 to 17 hibiscus, 17 to 20 sunset, otherwise night, by the clock in California. */
export function californiaPalette(date = new Date()): PaletteId {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(date)) % 24;
  if (hour >= 5 && hour < 11) return "lagoon";
  if (hour >= 11 && hour < 17) return "hibiscus";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}
