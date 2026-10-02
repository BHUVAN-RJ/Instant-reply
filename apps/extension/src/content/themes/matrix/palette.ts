import type { ColorRoles } from "../../theme/contract";

// The Matrix palette (DESIGN.md, "Fonts and colours").

export const GLASS = "#020a04";
export const TERM = "#06140a";
export const DIM = "#0f5c22";
export const MID = "#009e2a";
export const PH = "#00ff41";
export const WHITE = "#d9ffe0";
export const DEEP = "#0d2412";
export const CODE_LIGHT = "#00a82d";
export const HOT_LIGHT = "#007a20";

export const ROLES: ColorRoles = { edge: DEEP, accent: PH, strong: MID, onStrong: "#000000" };

export const TERMINAL = `"IR Terminal", "VT323", ui-monospace, monospace`;
export const OCR = `"IR OCR", "OCR A Std", "OCR A Extended", ui-monospace, Menlo, monospace`;

/** Mirrored half width katakana, digits and a few symbols: the code. */
export const KANA = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789Z:.=*+-<>¦";
/** What a decoding letter jumbles through before it locks. */
export const MIXED = KANA + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&@";
/** What a label scrambles through on hover: VT323 is monospace, so the width holds. */
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const pick = (set: string) => () => set[(Math.random() * set.length) | 0];
export const pickKana = pick(KANA);
export const pickMixed = pick(MIXED);
export const pickLetter = pick(LETTERS);
