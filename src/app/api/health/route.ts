import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse, connection } from "next/server";

import { getEnv } from "@/lib/config/env";
import { childLogger } from "@/lib/logging/logger";

function readVersion(): string {
  const file = path.join(process.cwd(), "package.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { version?: string };
  return parsed.version ?? "0.1.0";
}

const version = readVersion();

export async function GET() {
  await connection();
  const requestId = randomUUID();
  const env = getEnv();
  const log = childLogger({ module: "health", operation: "check", requestId });

  log.info(
    {
      llmProvider: env.LLM_PROVIDER,
      mongodbMode: env.MONGODB_MODE,
    },
    "health check",
  );

  return NextResponse.json(
    {
      status: "ok",
      version,
      llmProvider: env.LLM_PROVIDER,
      mongodbMode: env.MONGODB_MODE,
      voiceSttEnabled: env.VOICE_STT_ENABLED === "true",
      voiceTtsEnabled: env.VOICE_TTS_ENABLED === "true",
    },
    {
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}
