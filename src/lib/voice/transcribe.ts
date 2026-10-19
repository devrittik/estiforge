import type { AppEnv } from "@/lib/config/env";

export class VoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceError";
  }
}

const maxBytes = 2_500_000;
let queue: Promise<unknown> = Promise.resolve();

export async function transcribeWav(
  wav: ArrayBuffer,
  env: Pick<AppEnv, "VOICE_STT_ENABLED" | "VOICE_STT_ENGINE" | "VOICE_STT_URL">,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (env.VOICE_STT_ENABLED !== "true") {
    throw new VoiceError("Voice input is turned off. Type the description.");
  }
  if (env.VOICE_STT_ENGINE !== "whisper.cpp") {
    throw new VoiceError("Only the local whisper.cpp service is supported. Type the description.");
  }
  if (wav.byteLength === 0 || wav.byteLength > maxBytes) {
    throw new VoiceError("The recording is empty or longer than one minute. Try a shorter description.");
  }

  const run = queue.then(() => requestTranscript(wav, env, fetchImpl));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function requestTranscript(
  wav: ArrayBuffer,
  env: Pick<AppEnv, "VOICE_STT_URL">,
  fetchImpl: typeof fetch,
): Promise<string> {
  const base = env.VOICE_STT_URL || "http://127.0.0.1:8178";
  const endpoint = new URL("inference", base.endsWith("/") ? base : `${base}/`);
  const form = new FormData();
  form.set("file", new Blob([wav], { type: "audio/wav" }), "audio.wav");
  form.set("response_format", "json");
  form.set("temperature", "0");

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new VoiceError("The whisper.cpp service could not be reached. Type the description.");
  }
  if (!response.ok) {
    throw new VoiceError(`The whisper.cpp service returned status ${response.status}. Type the description.`);
  }
  const body = (await response.json().catch(() => null)) as { text?: unknown; result?: unknown } | null;
  const transcript = typeof body?.text === "string" ? body.text : typeof body?.result === "string" ? body.result : "";
  const trimmed = transcript.trim();
  if (trimmed === "") {
    throw new VoiceError("No speech was recognized. Edit the description or try again.");
  }
  return trimmed.slice(0, 4000);
}
