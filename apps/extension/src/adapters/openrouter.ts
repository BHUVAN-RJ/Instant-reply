import type { LlmProvider } from "@instant-reply/core";

// LlmProvider port backed by OpenRouter's chat completions API.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;

// Email text only goes to hosts that keep nothing (zdr), never train on it, and are not
// Chinese companies or their Singapore arms (headquarters per OpenRouter's /providers list,
// checked 2026-10-01). Fallbacks stay within these rules; if no host qualifies, the request fails.
const BLOCKED_HOSTS = [
  "alibaba", "baidu", "deepseek", "minimax", "moonshotai", "nex-agi", "seed",
  "siliconflow", "stepfun", "streamlake", "tencent", "xiaomi", "z-ai",
];
export const PRIVATE_ROUTING = {
  zdr: true,
  data_collection: "deny",
  ignore: BLOCKED_HOSTS,
} as const;

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
        body: JSON.stringify({ model: options.model, messages, provider: PRIVATE_ROUTING }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) {
        throw new Error(`No private host is serving ${options.model} right now (no data kept, no training, no Chinese hosts). Try again later or pick another model.`);
      }
      if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const content: unknown = (await response.json())?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("OpenRouter returned no draft");
      return content.trim();
    },
  };
}
