import { describe, expect, it } from "vitest";

import { ConfigError, parseEnv } from "@/lib/config/env";

const validLocal = {
  NODE_ENV: "test",
  LLM_PROVIDER: "local",
  LLM_BASE_URL: "http://127.0.0.1:8080/v1",
  LLM_API_KEY: "",
  LLM_MODEL: "your-model-alias",
  MONGODB_MODE: "local",
  MONGODB_LOCAL_URI: "mongodb://127.0.0.1:27017/estiforge",
  MONGODB_ATLAS_URI: "",
  DEBUG_LOGS: "true",
  LOG_LEVEL: "debug",
  VOICE_STT_ENABLED: "true",
  VOICE_STT_ENGINE: "whisper.cpp",
  VOICE_STT_MODEL_PATH: "./models/whisper-tiny",
  VOICE_TTS_ENABLED: "false",
  SESSION_SECRET: "test-session-secret-at-least-32-characters",
};

describe("parseEnv", () => {
  it("accepts the local example configuration", () => {
    const env = parseEnv(validLocal);
    expect(env.LLM_PROVIDER).toBe("local");
    expect(env.MONGODB_MODE).toBe("local");
    expect(env.MONGODB_LOCAL_URI).toContain("estiforge");
  });

  it("requires an Atlas URI only when Atlas is selected", () => {
    expect(() =>
      parseEnv({
        ...validLocal,
        MONGODB_MODE: "atlas",
        MONGODB_ATLAS_URI: "",
        LLM_API_KEY: "super-secret-key",
      }),
    ).toThrow(ConfigError);

    try {
      parseEnv({
        ...validLocal,
        MONGODB_MODE: "atlas",
        MONGODB_ATLAS_URI: "",
        LLM_API_KEY: "super-secret-key",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toContain("MONGODB_ATLAS_URI");
      expect((error as ConfigError).message).not.toContain("super-secret-key");
    }
  });

  it("requires an API key only for the hosted language model", () => {
    expect(() =>
      parseEnv({
        ...validLocal,
        LLM_PROVIDER: "hosted",
        LLM_API_KEY: "",
      }),
    ).toThrow(/LLM_API_KEY/);

    const env = parseEnv({
      ...validLocal,
      LLM_PROVIDER: "hosted",
      LLM_API_KEY: "present",
    });
    expect(env.LLM_PROVIDER).toBe("hosted");
  });

  it("keeps the local database URI when Atlas is not selected", () => {
    const env = parseEnv({
      ...validLocal,
      MONGODB_ATLAS_URI: "",
    });
    expect(env.MONGODB_MODE).toBe("local");
    expect(env.MONGODB_LOCAL_URI.startsWith("mongodb://")).toBe(true);
  });
});
