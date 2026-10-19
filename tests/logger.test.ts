import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger, resolveLogLevel } from "@/lib/logging/logger";

function captureLogger(level = "debug") {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ level, destination: stream });
  return { lines, logger };
}

describe("logger", () => {
  it("raises info logs to debug when DEBUG_LOGS is true", () => {
    expect(resolveLogLevel({ logLevel: "info", debugLogs: "true" })).toBe("debug");
    expect(resolveLogLevel({ logLevel: "trace", debugLogs: "true" })).toBe("trace");
    expect(resolveLogLevel({ logLevel: "warn", debugLogs: "false" })).toBe("warn");
  });

  it("writes timestamp, level, module, operation, and request id", () => {
    const { lines, logger } = captureLogger();
    logger.info(
      { module: "health", operation: "check", requestId: "req-1" },
      "health check",
    );

    const entry = JSON.parse(lines.join("")) as {
      time: string;
      level: string;
      module: string;
      operation: string;
      requestId: string;
      msg: string;
    };

    expect(entry.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.level).toBe("info");
    expect(entry.module).toBe("health");
    expect(entry.operation).toBe("check");
    expect(entry.requestId).toBe("req-1");
    expect(entry.msg).toBe("health check");
  });

  it("redacts passwords, keys, and database URIs", () => {
    const { lines, logger } = captureLogger();
    logger.info(
      {
        module: "auth",
        operation: "login",
        password: "plain-text-password",
        LLM_API_KEY: "sk-live",
        MONGODB_LOCAL_URI: "mongodb://user:pass@localhost/estiforge",
      },
      "login attempt",
    );

    const raw = lines.join("");
    expect(raw).not.toContain("plain-text-password");
    expect(raw).not.toContain("sk-live");
    expect(raw).not.toContain("mongodb://user:pass@localhost/estiforge");
    expect(raw).toContain("[Redacted]");
  });
});
