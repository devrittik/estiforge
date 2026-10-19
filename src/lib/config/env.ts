import { z } from "zod";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LLM_PROVIDER: z.enum(["local", "hosted"]).default("local"),
    LLM_BASE_URL: z.string().min(1),
    LLM_API_KEY: z.string().optional().default(""),
    LLM_MODEL: z.string().min(1),
    MONGODB_MODE: z.enum(["local", "atlas"]),
    MONGODB_LOCAL_URI: z.string().optional().default(""),
    MONGODB_ATLAS_URI: z.string().optional().default(""),
    DEBUG_LOGS: z.enum(["true", "false"]).default("false"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    VOICE_STT_ENABLED: z.enum(["true", "false"]).default("false"),
    VOICE_STT_ENGINE: z.string().min(1).default("whisper.cpp"),
    VOICE_STT_MODEL_PATH: z.string().min(1).default("./models/whisper-tiny"),
    VOICE_STT_URL: z.string().default("http://127.0.0.1:8178"),
    VOICE_TTS_ENABLED: z.enum(["true", "false"]).default("false"),
    SESSION_SECRET: z.string().min(32),
  })
  .superRefine((env, ctx) => {
    if (!/^https?:\/\//.test(env.VOICE_STT_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["VOICE_STT_URL"],
        message: "must be an http(s) URL",
      });
    }

    if (!/^https?:\/\//.test(env.LLM_BASE_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_BASE_URL"],
        message: "must be an http(s) URL",
      });
    }

    if (env.LLM_PROVIDER === "hosted" && env.LLM_API_KEY.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_API_KEY"],
        message: "is required when LLM_PROVIDER=hosted",
      });
    }

    if (env.MONGODB_MODE === "local" && !env.MONGODB_LOCAL_URI.startsWith("mongodb")) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_LOCAL_URI"],
        message: "must be a mongodb URI when MONGODB_MODE=local",
      });
    }

    if (env.MONGODB_MODE === "atlas" && !env.MONGODB_ATLAS_URI.startsWith("mongodb")) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_ATLAS_URI"],
        message: "must be a mongodb URI when MONGODB_MODE=atlas",
      });
    }
  });

export type AppEnv = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid configuration: ${issues.join("; ")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

let cached: AppEnv | undefined;

export function parseEnv(source: Record<string, string | undefined>): AppEnv {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    throw new ConfigError(issues);
  }
  return result.data;
}

export function getEnv(): AppEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}
