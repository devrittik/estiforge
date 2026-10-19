import { describe, expect, it } from "vitest";

import { extractRequirements } from "@/lib/ai/extract";
import { parseModelJson } from "@/lib/ai/extraction";
import { modelFromEnv, type ChatMessage } from "@/lib/ai/provider";
import type { AppEnv } from "@/lib/config/env";

const valid = {
  summary: "Twelve light points were stated.",
  supported: true,
  unsupportedReason: "",
  missing: ["Cable length was not stated."],
  explanation: "electrical.point-quantity counts the light points. No total is calculated here.",
  lines: [{ catalogueCode: "light-point", count: 12, length: null }],
};

describe("requirement extraction", () => {
  it("keeps stated counts and records a missing length", () => {
    const parsed = parseModelJson(JSON.stringify(valid));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.suggestion.lines).toEqual([
      {
        catalogueCode: "light-point",
        count: 12,
        length: null,
        terminationCount: null,
        extraPerTermination: null,
      },
    ]);
    expect(parsed.suggestion.missing).toContain("Cable length was not stated.");
  });

  it("rejects a response that includes a price or total", () => {
    const parsed = parseModelJson(JSON.stringify({ ...valid, total: 1440 }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.message).toContain("price");
    }
  });

  it("drops a point line when the count was not stated", () => {
    const parsed = parseModelJson(
      JSON.stringify({
        ...valid,
        lines: [{ catalogueCode: "socket", count: null, length: null }],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.suggestion.lines).toHaveLength(0);
      expect(parsed.suggestion.missing.join(" ")).toContain("Socket outlet");
    }
  });

  it("retries once and then tells the user to enter quantities", async () => {
    const calls: ChatMessage[][] = [];
    const result = await extractRequirements("twelve lights", {
      provider: "local",
      async complete(messages) {
        calls.push(messages);
        return calls.length === 1 ? "not json" : JSON.stringify(valid);
      },
    });
    expect(calls).toHaveLength(2);
    expect(result.ok).toBe(true);
  });

  it("does not send a bearer token for a local model without a key", async () => {
    let authorization: string | null = null;
    const env = {
      LLM_PROVIDER: "local",
      LLM_BASE_URL: "http://127.0.0.1:8080/v1",
      LLM_API_KEY: "",
      LLM_MODEL: "test-model",
    } as AppEnv;
    const model = modelFromEnv(env, async (input, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      expect(String(input)).toBe("http://127.0.0.1:8080/v1/chat/completions");
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid) } }] }));
    });
    await model.complete([{ role: "user", content: "twelve lights" }]);
    expect(authorization).toBeNull();
  });

  it("sends the hosted key and keeps it out of the error", async () => {
    const env = {
      LLM_PROVIDER: "hosted",
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "super-secret-key",
      LLM_MODEL: "hosted-model",
    } as AppEnv;
    const model = modelFromEnv(env, async (_input, init) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer super-secret-key");
      return new Response("nope", { status: 503 });
    });
    await expect(model.complete([{ role: "user", content: "twelve lights" }])).rejects.toSatisfy(
      (error: Error) => error.message.includes("hosted") && !error.message.includes("super-secret-key"),
    );
  });
});
