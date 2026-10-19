"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { encodeWav, joinSamples } from "@/lib/voice/wav";

const maxSeconds = 60;

export function VoiceCapture({
  estimateId,
  enabled,
  onTranscript,
}: {
  estimateId: string;
  enabled: boolean;
  onTranscript: (transcript: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const chunks = useRef<Float32Array[]>([]);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimer = useRef<number | null>(null);

  async function start() {
    setMessage(null);
    chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext({ sampleRate: 16_000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silent = context.createGain();
      silent.gain.value = 0;
      processor.onaudioprocess = (event) => {
        chunks.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      setRecording(true);
      stopTimer.current = window.setTimeout(() => {
        void finish("Recording stopped at one minute.");
      }, maxSeconds * 1000);
    } catch {
      setMessage("Microphone access was blocked. Type the description.");
    }
  }

  async function finish(note?: string) {
    if (stopTimer.current !== null) {
      window.clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    const context = contextRef.current;
    const sampleRate = context?.sampleRate ?? 16_000;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    contextRef.current = null;
    await context?.close().catch(() => undefined);
    setRecording(false);

    const samples = joinSamples(chunks.current);
    chunks.current = [];
    if (samples.length === 0) {
      setMessage("The recording was empty. Type the description.");
      return;
    }
    const wav = encodeWav(samples, sampleRate);
    const form = new FormData();
    form.set("audio", new Blob([wav], { type: "audio/wav" }), "description.wav");
    const response = await fetch(`/api/estimates/${estimateId}/transcribe`, { method: "POST", body: form });
    const body = (await response.json().catch(() => null)) as { transcript?: string; message?: string } | null;
    if (!response.ok || !body?.transcript) {
      setMessage(body?.message ?? "The recording could not be transcribed. Type the description.");
      return;
    }
    onTranscript(body.transcript);
    setMessage(note ?? "Transcript added. Edit it before suggesting quantities.");
  }

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">Voice input is turned off. Type the description.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {recording ? (
          <Button type="button" variant="outline" onClick={() => void finish()}>
            Stop
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => void start()}>
            Record
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        The transcript is editable. English, Hindi, Bengali, and mixed speech have not been verified against this
        whisper.cpp setup.
      </p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
