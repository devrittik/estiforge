import "server-only";

import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

export const REDACT_PATHS = [
  "password",
  "*.password",
  "apiKey",
  "*.apiKey",
  "LLM_API_KEY",
  "MONGODB_ATLAS_URI",
  "MONGODB_LOCAL_URI",
  "authorization",
  "headers.authorization",
  "req.headers.authorization",
  "cookie",
  "*.cookie",
  "session",
  "*.session",
  "SESSION_SECRET",
  "passwordHash",
  "*.passwordHash",
];

const LEVEL_RANK: Record<string, number> = {
  silent: -1,
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

export function resolveLogLevel(input: { logLevel?: string; debugLogs?: string }): string {
  const configured = input.logLevel && input.logLevel.length > 0 ? input.logLevel : "info";
  if (input.debugLogs !== "true" || configured === "silent" || configured === "trace") {
    return configured;
  }
  return (LEVEL_RANK[configured] ?? LEVEL_RANK.info) < LEVEL_RANK.debug ? "debug" : configured;
}

export function createLogger(options?: {
  level?: string;
  destination?: DestinationStream;
  pretty?: boolean;
}): Logger {
  const level =
    options?.level ??
    resolveLogLevel({
      logLevel: process.env.LOG_LEVEL,
      debugLogs: process.env.DEBUG_LOGS,
    });

  const loggerOptions: LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: "estiforge" },
    redact: {
      paths: REDACT_PATHS,
      censor: "[Redacted]",
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };

  if (options?.pretty) {
    return pino({
      ...loggerOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      },
    });
  }

  return options?.destination ? pino(loggerOptions, options.destination) : pino(loggerOptions);
}

export const logger = createLogger({
  pretty: process.env.NODE_ENV === "development",
});

export function childLogger(fields: {
  module: string;
  operation: string;
  requestId?: string;
}) {
  return logger.child(fields);
}
