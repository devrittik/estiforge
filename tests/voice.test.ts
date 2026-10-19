import { describe, expect, it } from "vitest";

import { encodeWav } from "@/lib/voice/wav";
import { transcribeWav, VoiceError } from "@/lib/voice/transcribe";

const env = {
  VOICE_STT_ENABLED: "true" as const,
  VOICE_STT_ENGINE: "whisper.cpp",
  VOICE_STT_URL: "http://127.0.0.1:8178",
};

describe("voice transcription", () => {
  it("writes a 16 kHz mono WAV header", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1]), 16_000);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new DataView(wav).getUint32(24, true)).toBe(16_000);
    expect(new DataView(wav).getUint16(22, true)).toBe(1);
  });

  it("posts the clip to whisper.cpp as a file field without setting the multipart header", async () => {
    const transcript = await transcribeWav(encodeWav(new Float32Array([0.1, -0.1]), 16_000), env, async (input, init) => {
      expect(String(input)).toBe("http://127.0.0.1:8178/inference");
      expect(init?.headers).toBeUndefined();
      const form = init?.body as FormData;
      const file = form.get("file");
      expect(file).toBeInstanceOf(Blob);
      expect((file as File).name).toBe("audio.wav");
      expect((file as File).type).toBe("audio/wav");
      return Response.json({ text: "  twelve light points  " });
    });
    expect(transcript).toBe("twelve light points");
  });

  it("does not call the service when voice input is off", async () => {
    await expect(
      transcribeWav(encodeWav(new Float32Array([0.2]), 16_000), { ...env, VOICE_STT_ENABLED: "false" }, () => {
        throw new Error("fetch should not run");
      }),
    ).rejects.toBeInstanceOf(VoiceError);
  });

  it("reports an unreachable service without including the model path", async () => {
    try {
      await transcribeWav(encodeWav(new Float32Array([0.2]), 16_000), env, () => {
        throw new Error("connect ECONNREFUSED ./models/whisper-tiny");
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(VoiceError);
      expect((error as Error).message).toContain("could not be reached");
      expect((error as Error).message).not.toContain("whisper-tiny");
    }
  });
});
