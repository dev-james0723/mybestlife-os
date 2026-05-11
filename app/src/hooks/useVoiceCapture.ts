"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings — the DOM lib ships none for SpeechRecognition.
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

type SpeechRecognitionErrorEvent = { error: string };

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceCaptureState = {
  supported: boolean;
  isRecording: boolean;
  interim: string;
  error: string | null;
};

export type UseVoiceCaptureOptions = {
  lang?: string;
  onFinal: (text: string) => void;
};

export function useVoiceCapture({ lang, onFinal }: UseVoiceCaptureOptions) {
  const [supported, setSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped — safe to ignore */
      }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    if (recognitionRef.current) return; // already running

    const rec = new Ctor();
    rec.lang = lang ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        onFinalRef.current(finalText.trim());
        setInterim("");
      } else {
        setInterim(interimText);
      }
    };

    rec.onerror = (e) => {
      // Benign outcomes that the Web Speech API reports via onerror:
      //   * "no-speech" — user tapped mic then stayed silent; not an error.
      //   * "aborted"   — user (or code) called stop(); expected.
      // Surfacing these as toasts is noisy and confusing.
      const benign = e.error === "no-speech" || e.error === "aborted";
      if (!benign) setError(e.error || "recognition-error");
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setError(null);
    setInterim("");
    setIsRecording(true);
    try {
      rec.start();
    } catch {
      setError("start-failed");
      setIsRecording(false);
      recognitionRef.current = null;
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return { supported, isRecording, interim, error, start, stop } as const;
}
