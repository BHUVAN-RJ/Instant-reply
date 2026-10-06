import { describe, expect, it } from "vitest";
import { shouldRestore } from "../src/content/scroll-guard";

// The inbox stays where I scrolled it when Gmail jumps it to the top on its own.

describe("scroll guard", () => {
  const jump = { from: 1800, to: 0, sameView: true, sinceInputMs: 5000 };

  it("undoes a jump to the top that I did not make", () => {
    expect(shouldRestore(jump)).toBe(true);
  });

  it("leaves my own scrolling alone", () => {
    expect(shouldRestore({ ...jump, sinceInputMs: 200 })).toBe(false);
  });

  it("leaves a new view alone (opening a thread, another label)", () => {
    expect(shouldRestore({ ...jump, sameView: false })).toBe(false);
  });

  it("ignores small moves and lists that were near the top anyway", () => {
    expect(shouldRestore({ ...jump, to: 900 })).toBe(false);
    expect(shouldRestore({ ...jump, from: 120 })).toBe(false);
  });
});
