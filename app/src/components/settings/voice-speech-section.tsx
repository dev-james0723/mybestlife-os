"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Mic2, Play, Trash2, Upload, Volume2 } from "lucide-react";
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.error === "string") return payload.error;
  return fallback;
}

export function VoiceSpeechSection() {
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  async function savePreferences(next?: Partial<{ mode: TtsVoiceMode; preset: TtsPresetId; profileId: string | null }>) {
    const nextMode = next?.mode ?? voiceMode;
    const nextPreset = next?.preset ?? presetId;
    const nextProfileId = next?.profileId ?? activeProfileId;
    if (nextMode === "reference_clone" && !nextProfileId) {
      toast.error("Upload or select a voice sample first.");
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

  async function uploadVoiceProfile() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose an audio file first.");
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
      if (!response.ok) throw new Error(errorMessage(payload, "Could not upload voice sample"));
      toast.success("Voice sample saved");
      setReferenceTranscript("");
      setConsent(false);
      setVoiceModeDraft(null);
      setPresetIdDraft(null);
      setActiveProfileIdDraft(undefined);
      if (fileRef.current) fileRef.current.value = "";
      await settingsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload voice sample");
    } finally {
      setUploading(false);
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
              Use VoxCPM for every app-generated audio clip. Choose a preset voice or clone from your own reference sample.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              settings?.configured
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            )}
          >
            <Volume2 className="size-3.5" />
            {settings?.configured ? "VoxCPM connected" : "VoxCPM not configured"}
          </span>
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading..." : `Provider: ${settings?.provider ?? "voxcpm"}`}
          </span>
        </div>
        {settingsQuery.isError ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            Voice settings could not load. Apply the VoxCPM TTS migration, then reload Settings.
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={voiceMode === "preset" ? "default" : "outline"}
            className="justify-start gap-2"
            onClick={() => {
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
              void savePreferences({ mode: "reference_clone" });
            }}
            disabled={saving || loading || !activeProfileId}
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
            <Label htmlFor="tts-reference-audio">Reference audio</Label>
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
              I confirm this is my own voice, or I have explicit permission to use this voice sample for private TTS in this app.
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
