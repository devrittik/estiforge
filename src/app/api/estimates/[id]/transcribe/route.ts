import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { getEnv } from "@/lib/config/env";
import { getOwnedEstimate } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { VoiceError, transcribeWav } from "@/lib/voice/transcribe";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const estimate = await getOwnedEstimate(user.id, id);
  if (!estimate) {
    return NextResponse.json({ message: "Estimate not found." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ message: "Record a clip before transcribing." }, { status: 400 });
  }
  if (audio.type !== "" && audio.type !== "audio/wav" && audio.type !== "audio/wave") {
    return NextResponse.json({ message: "The recording must be a WAV file." }, { status: 400 });
  }

  try {
    const transcript = await transcribeWav(await audio.arrayBuffer(), getEnv());
    logger.info(
      {
        module: "voice",
        operation: "transcribe",
        userId: user.id,
        estimateId: id,
        bytes: audio.size,
        accepted: true,
      },
      "transcript created",
    );
    return NextResponse.json({ transcript });
  } catch (error) {
    const message = error instanceof VoiceError ? error.message : "The recording could not be transcribed.";
    logger.info(
      {
        module: "voice",
        operation: "transcribe",
        userId: user.id,
        estimateId: id,
        bytes: audio.size,
        accepted: false,
        errorName: error instanceof Error ? error.name : "Error",
      },
      "transcript failed",
    );
    return NextResponse.json({ message }, { status: 422 });
  }
}
