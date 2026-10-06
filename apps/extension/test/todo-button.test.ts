import { afterEach, describe, expect, it, vi } from "vitest";
import { placeButton } from "../src/content/todo-button";

// The floating "To do done" button: where it sits, and how it talks to the job tagger.

describe("To do done button", () => {
  const size = { width: 130, height: 36 };
  const viewport = { width: 1440, height: 900 };

  it("starts on the right, a third of the way down", () => {
    expect(placeButton(undefined, size, viewport)).toEqual({ left: 1440 - 130 - 24, top: 300 });
  });

  it("stays where it was dragged, but never off screen", () => {
    expect(placeButton({ left: 200, top: 500 }, size, viewport)).toEqual({ left: 200, top: 500 });
    expect(placeButton({ left: 5000, top: -40 }, size, viewport)).toEqual({ left: 1440 - 130 - 8, top: 8 });
    // A window made smaller pulls a saved spot back in.
    expect(placeButton({ left: 1300, top: 850 }, size, { width: 800, height: 600 })).toEqual({ left: 800 - 130 - 8, top: 600 - 36 - 8 });
  });
});

describe("job tagger client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does nothing without a tagger URL and token", async () => {
    vi.stubEnv("VITE_TAGGER_URL", "");
    const { askTagger } = await import("../src/job-tagger");
    const fetch = vi.fn();
    expect(await askTagger("status", "abc123", fetch)).toEqual({ ok: false, error: "not set up" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends only the thread id, the action and the token", async () => {
    vi.stubEnv("VITE_TAGGER_URL", "https://script.google.com/macros/s/x/exec");
    vi.stubEnv("VITE_TAGGER_TOKEN", "secret");
    const { askTagger } = await import("../src/job-tagger");
    const fetch = vi.fn(async () => new Response('{"ok":true,"label":""}'));
    expect(await askTagger("done", "abc123", fetch as unknown as typeof globalThis.fetch)).toEqual({ ok: true, label: "" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://script.google.com/macros/s/x/exec");
    expect(JSON.parse(String(init.body))).toEqual({ token: "secret", action: "done", thread: "abc123" });
  });
});
