import type { AppEnv } from "@/lib/config/env";
import { getEnv } from "@/lib/config/env";

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export type TextModel = {
  provider: "local" | "hosted";
  complete(messages: ChatMessage[]): Promise<string>;
};

export function modelFromEnv(env: AppEnv = getEnv(), fetchImpl: typeof fetch = fetch): TextModel {
  return {
    provider: env.LLM_PROVIDER,
    async complete(messages) {
      const endpoint = new URL(
        "chat/completions",
        env.LLM_BASE_URL.endsWith("/") ? env.LLM_BASE_URL : `${env.LLM_BASE_URL}/`,
      );
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (env.LLM_API_KEY.trim() !== "") {
        headers.authorization = `Bearer ${env.LLM_API_KEY}`;
      }
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: env.LLM_MODEL,
            temperature: 0,
            response_format: { type: "json_object" },
            messages,
          }),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw new LlmError(`The ${env.LLM_PROVIDER} model could not be reached. Enter the quantities manually.`);
      }
      if (!response.ok) {
        throw new LlmError(
          `The ${env.LLM_PROVIDER} model returned status ${response.status}. Enter the quantities manually.`,
        );
      }
      const body = (await response.json().catch(() => null)) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      } | null;
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new LlmError("The model returned an empty response. Enter the quantities manually.");
      }
      return content;
    },
  };
}
