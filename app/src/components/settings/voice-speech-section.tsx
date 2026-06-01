"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Circle,
  Headphones,
  Loader2,
  Mic2,
  Play,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TtsPreset, TtsPresetId, TtsVoiceMode } from "@/lib/ai/tts-presets";
import { DEFAULT_TTS_PRESET_ID, TTS_PRESETS } from "@/lib/ai/tts-presets";
import { cn } from "@/lib/utils";

type VoiceProfile = {
  id: string;
  label: string;
  reference_transcript: string | null;
  created_at: string;
  mime_type: string | null;
};

type TtsSettingsResponse = {
  provider: string;
  configured: boolean;
  preferences: {
    voice_mode: TtsVoiceMode;
    preset_id: TtsPresetId;
    active_voice_profile_id: string | null;
  };
  voiceProfiles: VoiceProfile[];
  presets?: TtsPreset[];
  runtime?: {
    ok: boolean;
    modelLoaded?: boolean;
    error?: string;
  };
};

type RecorderState =
  | "idle"
  | "permission_request"
  | "recording"
  | "stopped_ready"
  | "upload_success"
  | "upload_failure";

const MIN_RECORDING_BYTES = 800;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.error === "string") return payload.error;
  return fallback;
}

function supportsMediaRecorder(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function pickAudioMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const min = Math.floor(whole / 60)
    .toString()
    .padStart(2, "0");
  const sec = (whole % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function extensionFromMimeType(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  return "webm";
}

function fileFromRecording(blob: Blob, mimeType: string): File {
  const ext = extensionFromMimeType(mimeType);
  return new File([blob], `voice-recording-${Date.now()}.${ext}`, { type: mimeType });
}

export function VoiceSpeechSection() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const recordingPreviewUrlRef = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [voiceModeDraft, setVoiceModeDraft] = useState<TtsVoiceMode | null>(null);
  const [presetIdDraft, setPresetIdDraft] = useState<TtsPresetId | null>(null);
  const [activeProfileIdDraft, setActiveProfileIdDraft] = useState<string | null | undefined>(
    undefined,
  );
  const [label, setLabel] = useState("My voice");
  const [referenceTranscript, setReferenceTranscript] = useState("");
  const [consent, setConsent] = useState(false);

  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["tts-preferences"],
    queryFn: async (): Promise<TtsSettingsResponse> => {
      const response = await fetch("/api/settings/tts-preferences", {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(errorMessage(payload, "Could not load voice settings"));
      return payload as TtsSettingsResponse;
    },
  });

  const settings = settingsQuery.data ?? null;
  const loading = settingsQuery.isLoading;
  const canRecord = supportsMediaRecorder();
  const voiceMode = voiceModeDraft ?? settings?.preferences.voice_mode ?? "preset";
  const presetId = presetIdDraft ?? settings?.preferences.preset_id ?? DEFAULT_TTS_PRESET_ID;
  const activeProfileId =
    activeProfileIdDraft !== undefined
      ? activeProfileIdDraft
      : settings?.preferences.active_voice_profile_id ?? null;
  const presets = settings?.presets?.length ? settings.presets : TTS_PRESETS;
  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === presetId) ?? presets[0],
    [presetId, presets],
  );

  const statusMessage = useMemo(() => {
    if (!settings?.configured) return "VoxCPM not configured";
    if (settings.runtime?.ok === false) return "VoxCPM sidecar unreachable";
    if (settings.runtime?.ok === true && !settings.runtime.modelLoaded) {
      return "VoxCPM model warming up";
    }
    return "VoxCPM connected";
  }, [settings]);

  const stopRecordingTimer = useCallback(() => {
    if (!recordingTimerRef.current) return;
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  }, []);

  const stopStreamTracks = useCallback(() => {
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

  const releaseRecordingResources = useCallback(() => {
    stopRecordingTimer();
    stopStreamTracks();
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = 0;
    if (recordingPreviewUrlRef.current) {
      URL.revokeObjectURL(recordingPreviewUrlRef.current);
      recordingPreviewUrlRef.current = null;
    }
  }, [stopRecordingTimer, stopStreamTracks]);

  function replaceRecordedPreviewUrl(nextUrl: string | null) {
    if (recordingPreviewUrlRef.current) {
      URL.revokeObjectURL(recordingPreviewUrlRef.current);
    }
    recordingPreviewUrlRef.current = nextUrl;
    setRecordedPreviewUrl(nextUrl);
  }

  function clearRecording(keepStatus: RecorderState = "idle") {
    releaseRecordingResources();
    setRecordingSeconds(0);
    setRecordedBlob(null);
    setRecordedMimeType("audio/webm");
    setRecordedPreviewUrl(null);
    if (keepStatus !== "upload_failure" && keepStatus !== "upload_success") {
      setRecorderError(null);
    }
    setRecorderState(keepStatus);
  }

  function resetRecordingState() {
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
    clearRecording("idle");
  }

  useEffect(
    () => () => {
      releaseRecordingResources();
    },
    [releaseRecordingResources],
  );

  async function savePreferences(next?: {
    mode?: TtsVoiceMode;
    preset?: TtsPresetId;
    profileId?: string | null;
  }) {
    const nextMode = next?.mode ?? voiceMode;
    const nextPreset = next?.preset ?? presetId;
    const nextProfileId = next?.profileId ?? activeProfileId;
    if (nextMode === "reference_clone" && !nextProfileId) {
      toast.error("Record or upload a voice sample first.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings/tts-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          voiceMode: nextMode,
          presetId: nextPreset,
          activeVoiceProfileId: nextProfileId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(errorMessage(payload, "Could not save voice settings"));
      setVoiceModeDraft(nextMode);
      setPresetIdDraft(nextPreset);
      setActiveProfileIdDraft(nextProfileId);
      toast.success("Voice settings saved");
      await settingsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save voice settings");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVoiceProfile(fileFromRecorder?: File) {
    const file = fileFromRecorder ?? fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose or record audio first.");
      return;
    }
    if (!consent) {
      toast.error("Confirm that this is your own voice before upload.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("referenceAudio", file);
      form.set("label", label);
      form.set("referenceTranscript", referenceTranscript);
      form.set("consent", "true");

      const response = await fetch("/api/settings/tts-voice-profiles", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(errorMessage(payload, "Could not upload voice sample"));
      }

      toast.success("Voice sample saved and selected");
      setReferenceTranscript("");
      setConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      setVoiceModeDraft(null);
      setPresetIdDraft(null);
      setActiveProfileIdDraft(undefined);
      setRecorderError(null);
      clearRecording("upload_success");
      await settingsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not upload voice sample";
      if (fileFromRecorder) {
        setRecorderState("upload_failure");
        setRecorderError(message);
      }
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadRecordedVoice() {
    if (!recordedBlob) {
      toast.error("No recording found. Record your voice first.");
      return;
    }
    const recordedFile = fileFromRecording(recordedBlob, recordedMimeType);
    await uploadVoiceProfile(recordedFile);
  }

  async function startRecording() {
    if (!canRecord) {
      setRecorderState("upload_failure");
      setRecorderError("Recording is not supported in this browser.");
      return;
    }
    if (uploading || saving) return;

    setRecorderError(null);
    setRecorderState("permission_request");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      clearRecording("idle");
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecorderState("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        stopStreamTracks();
        const finalMimeType =
          recorder.mimeType || pickAudioMimeType() || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type: finalMimeType });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        if (blob.size < MIN_RECORDING_BYTES) {
          setRecorderState("upload_failure");
          setRecorderError("Recording is too short. Please record at least 2-3 seconds.");
          return;
        }
        setRecordedMimeType(finalMimeType);
        setRecordedBlob(blob);
        replaceRecordedPreviewUrl(URL.createObjectURL(blob));
        setRecorderState("stopped_ready");
      };

      recorder.start(300);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 250);
    } catch (error) {
      stopRecordingTimer();
      stopStreamTracks();
      mediaRecorderRef.current = null;
      const domError = error as DOMException;
      if (domError?.name === "NotAllowedError" || domError?.name === "PermissionDeniedError") {
        setRecorderError("Microphone permission was denied.");
      } else {
        setRecorderError("Could not start recording. Check microphone access and try again.");
      }
      setRecorderState("upload_failure");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      recorder.stop();
    } catch {
      stopRecordingTimer();
      stopStreamTracks();
      mediaRecorderRef.current = null;
      setRecorderState("upload_failure");
      setRecorderError("Recording stopped unexpectedly. Please try again.");
    }
  }

  async function deleteProfile(profileId: string) {
    const response = await fetch(`/api/settings/tts-voice-profiles/${profileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      toast.error(errorMessage(payload, "Could not delete voice profile"));
      return;
    }
    toast.success("Voice profile deleted");
    resetRecordingState();
    setVoiceModeDraft(null);
    setPresetIdDraft(null);
    setActiveProfileIdDraft(undefined);
    await settingsQuery.refetch();
  }

  async function generatePreview() {
    setPreviewing(true);
    try {
      const response = await fetch("/api/settings/tts-preferences/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language: activePreset?.language ?? "auto",
          text:
            activePreset?.language === "zh-Hant"
              ? "呢個係你嘅 Life OS 語音預覽。語氣應該清晰、平靜，而且似你自己。"
              : "This is your Life OS voice preview. It should sound clear, calm, and personal.",
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isRecord(payload) || typeof payload.audioDataUrl !== "string") {
        throw new Error(errorMessage(payload, "Could not generate voice preview"));
      }
      setAudioUrl(payload.audioDataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate voice preview");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle>Voice & Speech</CardTitle>
            <CardDescription>
              Use VoxCPM for every app-generated audio clip. Choose a preset voice or clone from
              your own reference sample.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              statusMessage === "VoxCPM connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            )}
          >
            <Volume2 className="size-3.5" />
            {statusMessage}
          </span>
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading..." : `Provider: ${settings?.provider ?? "voxcpm"}`}
          </span>
        </div>

        {settingsQuery.isError ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            {settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : "Voice settings could not load. Please retry after checking TTS setup."}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={voiceMode === "preset" ? "default" : "outline"}
            className="justify-start gap-2"
            onClick={() => {
              resetRecordingState();
              setVoiceModeDraft("preset");
              void savePreferences({ mode: "preset", profileId: null });
            }}
            disabled={saving || loading}
          >
            <Volume2 className="size-4" />
            Preset voice
          </Button>
          <Button
            type="button"
            variant={voiceMode === "reference_clone" ? "default" : "outline"}
            className="justify-start gap-2"
            onClick={() => {
              setVoiceModeDraft("reference_clone");
              if (activeProfileId) {
                void savePreferences({ mode: "reference_clone", profileId: activeProfileId });
              } else {
                toast.message("Use my voice enabled. Upload or record a sample to activate it.");
              }
            }}
            disabled={saving || loading}
          >
            <Mic2 className="size-4" />
            Use my voice
          </Button>
        </div>

        <div className="grid gap-1.5">
          <Label>Preset voice</Label>
          <Select
            value={presetId}
            onValueChange={(value) => {
              const next = value as TtsPresetId;
              resetRecordingState();
              setPresetIdDraft(next);
              void savePreferences({ mode: "preset", preset: next, profileId: null });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings?.voiceProfiles?.length ? (
          <div className="grid gap-2">
            <Label>Saved voice samples</Label>
            {settings.voiceProfiles.map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3",
                  activeProfileId === profile.id && "border-primary/40 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => {
                    setActiveProfileIdDraft(profile.id);
                    setVoiceModeDraft("reference_clone");
                    void savePreferences({ mode: "reference_clone", profileId: profile.id });
                  }}
                >
                  <p className="truncate text-sm font-medium">{profile.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                    {profile.reference_transcript ? " · transcript saved" : ""}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void deleteProfile(profile.id)}
                  title="Delete voice profile"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tts-voice-label">Voice label</Label>
            <Input
              id="tts-voice-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tts-reference-audio">Reference audio file</Label>
            <Input
              id="tts-reference-audio"
              ref={fileRef}
              type="file"
              accept="audio/wav,audio/mpeg,audio/mp4,audio/webm,audio/ogg"
            />
            <p className="text-xs text-muted-foreground">
              Best result: 10-30 seconds of clean speech, no music, no background noise.
            </p>
          </div>

          {voiceMode === "reference_clone" ? (
            <div className="grid gap-2 rounded-lg border border-dashed border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Record in browser</Label>
                <span className="text-xs text-muted-foreground">
                  {recorderState === "recording"
                    ? `Recording ${formatDuration(recordingSeconds)}`
                    : recorderState === "permission_request"
                      ? "Requesting microphone permission..."
                      : recorderState === "stopped_ready"
                        ? "Recording ready to upload"
                        : recorderState === "upload_success"
                          ? "Recording uploaded"
                          : recorderState === "upload_failure"
                            ? "Recording failed"
                            : "Idle"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={recorderState === "recording" ? "secondary" : "outline"}
                  className="gap-2"
                  onClick={() => {
                    if (recorderState === "recording") {
                      stopRecording();
                    } else {
                      void startRecording();
                    }
                  }}
                  disabled={!canRecord || uploading || recorderState === "permission_request"}
                >
                  {recorderState === "permission_request" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : recorderState === "recording" ? (
                    <Square className="size-4" />
                  ) : (
                    <Mic2 className="size-4" />
                  )}
                  {recorderState === "recording" ? "Stop recording" : "Record"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void uploadRecordedVoice()}
                  disabled={!recordedBlob || uploading || !consent}
                >
                  <Upload className="size-4" />
                  {uploading ? "Uploading..." : "Upload recording"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => clearRecording("idle")}
                  disabled={!recordedBlob && recorderState !== "upload_failure"}
                >
                  <Trash2 className="size-4" />
                  Delete recording
                </Button>
              </div>

              {!canRecord ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Browser recording is unavailable here. Upload a file instead.
                </p>
              ) : null}
              {recorderError ? (
                <p className="text-xs text-rose-700 dark:text-rose-300">{recorderError}</p>
              ) : null}
              {recorderState === "recording" ? (
                <p className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-300">
                  <Circle className="size-2.5 fill-current stroke-current" />
                  Live recording • {formatDuration(recordingSeconds)}
                </p>
              ) : null}
              {recordedPreviewUrl ? (
                <audio controls src={recordedPreviewUrl} className="w-full" />
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="tts-reference-transcript">Reference transcript optional</Label>
            <Textarea
              id="tts-reference-transcript"
              value={referenceTranscript}
              onChange={(event) => setReferenceTranscript(event.target.value)}
              placeholder="Paste exactly what was spoken in the sample for stronger cloning."
              rows={3}
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
              className="mt-0.5"
            />
            <span>
              I confirm this is my own voice, or I have explicit permission to use this voice
              sample for private TTS in this app.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void uploadVoiceProfile()}
              disabled={uploading}
            >
              <Upload className="size-4" />
              {uploading ? "Uploading..." : "Upload voice sample"}
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void generatePreview()}
              disabled={previewing || !settings?.configured}
            >
              <Play className="size-4" />
              {previewing ? "Generating..." : "Test voice"}
            </Button>
          </div>
          {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
