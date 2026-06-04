"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "unsupported"
  | "permission-denied"
  | "error";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type UseSpeechRecognitionOptions = {
  lang?: string;
  onTranscript?: (transcript: string) => void;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getSpeechSupportSnapshot() {
  return Boolean(getSpeechRecognitionConstructor());
}

function subscribeSpeechSupport() {
  return () => {};
}

export function useSpeechRecognition({
  lang = "en-US",
  onTranscript,
}: UseSpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const shouldEmitOnEndRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    () => false,
  );

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = "";
    shouldEmitOnEndRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const stopListening = useCallback(() => {
    shouldEmitOnEndRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current?.abort();
    finalTranscriptRef.current = "";
    shouldEmitOnEndRef.current = true;
    setTranscript("");
    setInterimTranscript("");
    setError(null);

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
        setTranscript(finalTranscriptRef.current);
      }
      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = (event) => {
      const reason = event.error ?? event.message ?? "speech-recognition-error";
      setError(reason);
      shouldEmitOnEndRef.current = false;
      setStatus(reason === "not-allowed" || reason === "service-not-allowed" ? "permission-denied" : "error");
    };

    recognition.onend = () => {
      const finalText = finalTranscriptRef.current.trim();
      recognitionRef.current = null;
      setInterimTranscript("");
      setStatus((current) =>
        current === "permission-denied" || current === "error" ? current : "idle",
      );
      if (shouldEmitOnEndRef.current && finalText) {
        onTranscriptRef.current?.(finalText);
      }
      shouldEmitOnEndRef.current = false;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start speech recognition.";
      setError(message);
      setStatus("error");
      recognitionRef.current = null;
    }
  }, [lang]);

  return {
    error,
    interimTranscript,
    isListening: status === "listening",
    isSupported,
    reset,
    startListening,
    status: !isSupported && status === "idle" ? "unsupported" : status,
    stopListening,
    transcript,
  };
}
