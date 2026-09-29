import type { LlmProvider } from "@instant-reply/core";

// LlmProvider port backed by OpenRouter's chat completions API.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;

export function createOpenRouter(options: { apiKey: string; model: string }): LlmProvider {
  return {
    async complete(messages) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Instant Reply",
        },
        body: JSON.stringify({ model: options.model, messages }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const content: unknown = (await response.json())?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("OpenRouter returned no draft");
      return content.trim();
    },
  };
}
