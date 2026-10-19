export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getEnv } = await import("./lib/config/env");
  const { logger } = await import("./lib/logging/logger");

  try {
    const env = getEnv();
    logger.info(
      {
        module: "config",
        operation: "validate",
        nodeEnv: env.NODE_ENV,
        llmProvider: env.LLM_PROVIDER,
        mongodbMode: env.MONGODB_MODE,
        logLevel: env.LOG_LEVEL,
        debugLogs: env.DEBUG_LOGS,
      },
      "configuration validated",
    );
  } catch (error) {
    logger.error(
      { module: "config", operation: "validate", err: error },
      "configuration invalid",
    );
    throw error;
  }
}
