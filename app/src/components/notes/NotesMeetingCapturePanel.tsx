"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Download,
  FileText,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "permission" | "recording" | "ready" | "error";

export type MeetingCaptureInput = {
  title: string;
  transcript: string;
  todoList: string;
  audioDurationSeconds: number;
  source: "live" | "zoom-import" | "mixed";
  template: MeetingTemplate;
};

type MeetingTemplate =
  | "auto"
  | "one-on-one"
  | "project-sync"
  | "client-call"
  | "standup"
  | "decision";

type NotesMeetingCapturePanelProps = {
  copy: NotesUiCopy;
  focusSignal: number;
  isPending?: boolean;
  locale: AppLocale;
  onSaveMeeting: (input: MeetingCaptureInput) => Promise<void>;
};

const MIN_RECORDING_BYTES = 800;

function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function getMediaRecorderSupport() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function subscribeMediaRecorderSupport() {
  return () => {};
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function languageForLocale(locale: AppLocale) {
  if (locale === "zh-TW" || locale === "zh-CN") return "zh-HK";
  return "en-US";
}

function transcriptionFileName(mimeType: string) {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "meeting-recording.m4a";
  return "meeting-recording.webm";
}

export function NotesMeetingCapturePanel({
  copy,
  focusSignal,
  isPending,
  locale,
  onSaveMeeting,
}: NotesMeetingCapturePanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [todoList, setTodoList] = useState("");
  const [template, setTemplate] = useState<MeetingTemplate>("auto");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const canRecord = useSyncExternalStore(
    subscribeMediaRecorderSupport,
    getMediaRecorderSupport,
    () => false,
  );
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState("audio/webm");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [hasLiveInput, setHasLiveInput] = useState(false);

  const appendTranscript = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setHasLiveInput(true);
    setTranscript((prev) => (prev.trim() ? `${prev.trim()}\n${clean}` : clean));
  }, []);

  const voice = useVoiceCapture({
    lang: languageForLocale(locale),
    onFinal: appendTranscript,
  });

  const isCaptureActive = recorderState === "recording" || voice.isRecording;
  const source: MeetingCaptureInput["source"] = hasLiveInput
    ? todoList.trim()
      ? "mixed"
      : "live"
    : "zoom-import";

  const canSave = Boolean(transcript.trim() || todoList.trim());
  const liveStatus = useMemo(() => {
    if (recorderState === "recording") return `${copy.meetingCapture.recording} ${formatDuration(recordingSeconds)}`;
    if (voice.isRecording) return copy.meetingCapture.listening;
    if (recorderState === "ready") return copy.meetingCapture.audioReady;
    return copy.meetingCapture.localPrivacy;
  }, [copy.meetingCapture, recorderState, recordingSeconds, voice.isRecording]);

  useEffect(() => {
    if (focusSignal > 0) {
      rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [focusSignal]);

  const stopTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // noop
      }
    }
  }, []);

  const replaceAudioUrl = useCallback((nextUrl: string | null) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
  }, []);

  const resetRecording = useCallback(() => {
    stopTimer();
    stopStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    setRecordingSeconds(0);
    setAudioBlob(null);
    setAudioMimeType("audio/webm");
    replaceAudioUrl(null);
    setRecorderState("idle");
  }, [replaceAudioUrl, stopStream, stopTimer]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          // noop
        }
      }
      resetRecording();
    };
  }, [resetRecording]);

  async function startCapture() {
    if (isCaptureActive) return;
    setError(null);

    if (!consentConfirmed) {
      setError(copy.meetingCapture.consentDescription);
      return;
    }

    if (voice.supported) {
      voice.start();
    }

    if (!canRecord) {
      if (!voice.supported) setError(copy.meetingCapture.recordingUnsupported);
      return;
    }

    setRecorderState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = pickAudioMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      resetRecording();
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecorderState("recording");
      setHasLiveInput(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopTimer();
        stopStream();
        const finalMimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        if (blob.size < MIN_RECORDING_BYTES) {
          setRecorderState("idle");
          return;
        }
        setAudioMimeType(finalMimeType);
        setAudioBlob(blob);
        replaceAudioUrl(URL.createObjectURL(blob));
        setRecorderState("ready");
      };

      recorder.start(300);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      stopTimer();
      stopStream();
      mediaRecorderRef.current = null;
      setRecorderState("error");
      setError(copy.meetingCapture.microphoneError);
    }
  }

  function stopCapture() {
    voice.stop();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        stopTimer();
        stopStream();
        mediaRecorderRef.current = null;
        setRecorderState("error");
      }
    }
  }

  async function transcribeAudio() {
    if (!audioBlob || transcribing) return;
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("audio", audioBlob, transcriptionFileName(audioMimeType));
      const response = await fetch("/api/ai/notes/transcribe", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "transcription-failed");
      }
      const text = typeof payload.transcript === "string" ? payload.transcript.trim() : "";
      if (!text) throw new Error("empty-transcript");
      appendTranscript(text);
      toast.success(copy.meetingCapture.transcriptAppended);
    } catch {
      setError(copy.meetingCapture.transcriptionUnavailable);
    } finally {
      setTranscribing(false);
    }
  }

  function clearAll() {
    if (isCaptureActive) stopCapture();
    setTitle("");
    setTranscript("");
    setTodoList("");
    setTemplate("auto");
    setConsentConfirmed(false);
    setError(null);
    setHasLiveInput(false);
    resetRecording();
  }

  async function saveMeeting() {
    if (!canSave || isPending) {
      setError(copy.meetingCapture.emptyMeeting);
      return;
    }
    if (isCaptureActive) stopCapture();
    await onSaveMeeting({
      title: title.trim(),
      transcript: transcript.trim(),
      todoList: todoList.trim(),
      audioDurationSeconds: recordingSeconds,
      source,
      template,
    });
    toast.success(copy.meetingCapture.saved);
    clearAll();
  }

  return (
    <div ref={rootRef} data-notes-reveal>
      <OSFrostedPanel className="overflow-hidden p-0">
      <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Radio className="h-4 w-4 text-primary" />
              {copy.meetingCapture.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.meetingCapture.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "bg-background/55",
                isCaptureActive && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
              )}
            >
              {copy.meetingCapture.liveLabel}
            </Badge>
            <Badge variant="outline" className="bg-background/55">
              <Upload className="h-3 w-3" />
              {copy.meetingCapture.zoomImportLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(220px,0.78fr)_minmax(0,1.22fr)]">
        <div className="space-y-3 border-b border-black/5 p-3 dark:border-white/10 lg:border-b-0 lg:border-r">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.meetingCapture.meetingTitleLabel}
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.meetingCapture.meetingTitlePlaceholder}
              className="bg-background/45"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.meetingCapture.templateLabel}
            </label>
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value as MeetingTemplate)}
              className="h-11 w-full rounded-lg border border-input bg-background/45 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8"
            >
              <option value="auto">{copy.meetingCapture.templateAuto}</option>
              <option value="one-on-one">{copy.meetingCapture.templateOneOnOne}</option>
              <option value="project-sync">{copy.meetingCapture.templateProjectSync}</option>
              <option value="client-call">{copy.meetingCapture.templateClientCall}</option>
              <option value="standup">{copy.meetingCapture.templateStandup}</option>
              <option value="decision">{copy.meetingCapture.templateDecision}</option>
            </select>
          </div>

          <label className="flex gap-3 rounded-lg border border-black/8 bg-background/40 p-3 text-left dark:border-white/10 dark:bg-white/[0.035]">
            <Checkbox
              checked={consentConfirmed}
              onCheckedChange={(value) => setConsentConfirmed(value === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">
                {copy.meetingCapture.consentTitle}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {copy.meetingCapture.consentCheckLabel}
              </span>
            </span>
          </label>

          <div className="rounded-lg border border-black/8 bg-background/40 p-3 dark:border-white/10 dark:bg-white/[0.035]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">
                  {liveStatus}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {voice.supported
                    ? copy.meetingCapture.localPrivacy
                    : copy.meetingCapture.speechUnsupported}
                </p>
              </div>
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/35",
                  isCaptureActive && "animate-pulse bg-red-500",
                  recorderState === "ready" && "bg-emerald-500",
                )}
              />
            </div>
            {voice.error && !error ? (
              <p className="mt-2 text-xs text-destructive">
                {voice.error === "unsupported"
                  ? copy.meetingCapture.speechUnsupported
                  : copy.meetingCapture.microphoneError}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {isCaptureActive ? (
              <OSControl
                type="button"
                onClick={stopCapture}
                className="justify-center border-red-500/25 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300"
              >
                <MicOff className="h-4 w-4" />
                {copy.meetingCapture.stopRecording}
              </OSControl>
            ) : (
              <OSPrimaryAction
                type="button"
                onClick={() => void startCapture()}
                disabled={!consentConfirmed || (!canRecord && !voice.supported)}
                className="justify-center"
              >
                <Mic className="h-4 w-4" />
                {copy.meetingCapture.startRecording}
              </OSPrimaryAction>
            )}
            <OSControl
              type="button"
              onClick={() => void transcribeAudio()}
              disabled={!audioBlob || transcribing}
              className="justify-center"
            >
              <Sparkles className="h-4 w-4" />
              {transcribing
                ? copy.meetingCapture.transcribingAudio
                : copy.meetingCapture.transcribeAudio}
            </OSControl>
            <OSPrimaryAction
              type="button"
              onClick={() => void saveMeeting()}
              disabled={!canSave || isPending}
              className="justify-center"
            >
              <Save className="h-4 w-4" />
              {copy.meetingCapture.saveAndReview}
            </OSPrimaryAction>
            <OSControl type="button" onClick={clearAll} className="justify-center">
              <RotateCcw className="h-4 w-4" />
              {copy.meetingCapture.clear}
            </OSControl>
          </div>

          {audioUrl ? (
            <div className="space-y-2 rounded-lg border border-black/8 bg-background/40 p-3 dark:border-white/10 dark:bg-white/[0.035]">
              <audio controls src={audioUrl} className="h-9 w-full" />
              <a
                href={audioUrl}
                download={transcriptionFileName(audioMimeType)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <Download className="h-3.5 w-3.5" />
                {copy.meetingCapture.downloadAudio}
              </a>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                {copy.meetingCapture.transcriptLabel}
              </label>
              <Badge variant="ghost" className="bg-background/45">
                <FileText className="h-3 w-3" />
                {source}
              </Badge>
            </div>
            <Textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder={copy.meetingCapture.transcriptPlaceholder}
              className="min-h-36 resize-y border-transparent bg-background/45 text-sm leading-6 shadow-inner shadow-black/[0.025] dark:bg-white/[0.045]"
            />
            {voice.interim ? (
              <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">
                {voice.interim}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.meetingCapture.todoLabel}
            </label>
            <Textarea
              value={todoList}
              onChange={(event) => setTodoList(event.target.value)}
              placeholder={copy.meetingCapture.todoPlaceholder}
              className="min-h-24 resize-y border-transparent bg-background/45 text-sm leading-6 shadow-inner shadow-black/[0.025] dark:bg-white/[0.045]"
            />
          </div>
        </div>
      </div>
      </OSFrostedPanel>
    </div>
  );
}
