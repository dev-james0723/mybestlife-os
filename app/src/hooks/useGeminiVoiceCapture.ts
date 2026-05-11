"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Ignore accidental one-tap noise blobs. */
const MIN_BLOB_BYTES = 800;

function pickAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

export function isGeminiVoiceCaptureSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

async function postTranscription(blob: Blob, signal: AbortSignal): Promise<string> {
  const ext = blob.type.includes("mp4") ? "recording.m4a" : "recording.webm";
  const form = new FormData();
  form.set("audio", blob, ext);
  const res = await fetch("/api/idea-capture/transcribe", {
    method: "POST",
    body: form,
    signal,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  if (!res.ok) {
    const msg = typeof rec.error === "string" ? rec.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return typeof rec.transcript === "string" ? rec.transcript.trim() : "";
}

export type UseGeminiVoiceCaptureOptions = {
  onFinal: (text: string) => void;
};

export function useGeminiVoiceCapture({ onFinal }: UseGeminiVoiceCaptureOptions) {
  const [supported, setSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelTokenRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const isRecordingRef = useRef(false);
  const abortControllersRef = useRef<AbortController[]>([]);

  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    setSupported(isGeminiVoiceCaptureSupported());
  }, []);

  const cleanupStream = useCallback(() => {
    const s = streamRef.current;
    streamRef.current = null;
    if (!s) return;
    for (const t of s.getTracks()) {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const abortInFlightUploads = useCallback(() => {
    for (const ac of abortControllersRef.current) {
      try {
        ac.abort();
      } catch {
        /* ignore */
      }
    }
    abortControllersRef.current = [];
  }, []);

  const invalidate = useCallback(() => {
    cancelTokenRef.current += 1;
    abortInFlightUploads();
    setTranscribing(false);
  }, [abortInFlightUploads]);

  const stop = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        cleanupStream();
        recorderRef.current = null;
      }
    } else {
      cleanupStream();
      recorderRef.current = null;
    }
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (!isGeminiVoiceCaptureSupported()) {
      setError("unsupported");
      return;
    }
    if (isRecordingRef.current) return;

    setError(null);
    cancelTokenRef.current += 1;
    const recordingSession = cancelTokenRef.current;
    abortInFlightUploads();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recordingSession !== cancelTokenRef.current) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }

      streamRef.current = stream;
      mimeTypeRef.current = pickAudioMimeType();
      const mimeType = mimeTypeRef.current;

      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { mimeType });
      } catch {
        setError("start-failed");
        cleanupStream();
        return;
      }

      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        cleanupStream();
        recorderRef.current = null;

        void (async () => {
          if (recordingSession !== cancelTokenRef.current) return;
          if (blob.size < MIN_BLOB_BYTES) return;

          const ac = new AbortController();
          abortControllersRef.current.push(ac);
          setTranscribing(true);
          try {
            const text = await postTranscription(blob, ac.signal);
            if (recordingSession !== cancelTokenRef.current) return;
            if (text) onFinalRef.current(text);
          } catch (e) {
            if ((e as DOMException | undefined)?.name === "AbortError") return;
            if (recordingSession !== cancelTokenRef.current) return;
            const msg =
              e instanceof Error ? e.message : typeof e === "string" ? e : "transcribe-error";
            setError(msg);
          } finally {
            const i = abortControllersRef.current.indexOf(ac);
            if (i >= 0) abortControllersRef.current.splice(i, 1);
            setTranscribing(false);
          }
        })();
      };

      recorderRef.current = rec;
      isRecordingRef.current = true;
      setIsRecording(true);
      try {
        rec.start();
      } catch {
        setError("start-failed");
        isRecordingRef.current = false;
        setIsRecording(false);
        recorderRef.current = null;
        cleanupStream();
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("not-allowed");
      } else {
        setError("start-failed");
      }
    }
  }, [abortInFlightUploads, cleanupStream]);

  useEffect(
    () => () => {
      invalidate();
      isRecordingRef.current = false;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      cleanupStream();
    },
    [cleanupStream, invalidate],
  );

  return {
    supported,
    isRecording,
    interim: "",
    transcribing,
    error,
    start,
    stop,
    invalidate,
  } as const;
}
