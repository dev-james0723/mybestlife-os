"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioFocusSelector, type AudioFocusOptionCard } from "@/components/document-oracle/audio-summary/AudioFocusSelector";
import { AudioSummaryPlayer } from "@/components/document-oracle/audio-summary/AudioSummaryPlayer";
import { AudioTranscript, type AudioChapter } from "@/components/document-oracle/audio-summary/AudioTranscript";
import { VoiceSelector } from "@/components/document-oracle/audio-summary/VoiceSelector";

type FocusApi = {
  document_summary: string;
  focus_options: AudioFocusOptionCard[];
};

type HistoryItem = {
  id: string;
  audio_url: string;
  transcript: string | null;
  chapters: unknown;
  source_pages: number[];
  source_sections: string[];
  created_at: string;
};

export function DocOracleAudioSummaryPanel(props: {
  documentId: string;
  enabled: boolean;
  onOpenSourcePage?: (page: number) => void;
}) {
  const [focus, setFocus] = useState<FocusApi | null>(null);
  const [focusErr, setFocusErr] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [voice, setVoice] = useState<"male" | "female">("female");
  const [format, setFormat] = useState<"single_host" | "two_hosts">("single_host");
  const [duration, setDuration] = useState<"short" | "medium" | "long">("medium");
  const [language, setLanguage] = useState<"auto" | "en" | "zh-Hant">("auto");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    audio_url: string;
    transcript: string;
    chapters: AudioChapter[];
    source_pages: number[];
    source_sections: string[];
    duration_seconds: number;
    provider: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const selectedOptions = useMemo(() => {
    const opts = focus?.focus_options ?? [];
    return opts.filter((o) => selected.has(o.id));
  }, [focus, selected]);

  const loadFocus = useCallback(async () => {
    if (!props.enabled) return;
    setFocusLoading(true);
    setFocusErr(null);
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(props.documentId)}/audio-summary/focus-options`, {
        method: "POST",
      });
      const data = (await res.json()) as FocusApi & { error?: string; detail?: string };
      if (!res.ok) {
        setFocusErr(data.detail || data.error || `HTTP ${res.status}`);
        setFocus(null);
        return;
      }
      setFocus({
        document_summary: data.document_summary,
        focus_options: data.focus_options ?? [],
      });
    } catch {
      setFocusErr("Network error loading audio focus options.");
      setFocus(null);
    } finally {
      setFocusLoading(false);
    }
  }, [props.documentId, props.enabled]);

  const loadHistory = useCallback(async () => {
    if (!props.enabled) return;
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(props.documentId)}/audio-summary/history`);
      const data = (await res.json()) as { items?: HistoryItem[] };
      if (res.ok && Array.isArray(data.items)) setHistory(data.items);
    } catch {
      /* ignore */
    }
  }, [props.documentId, props.enabled]);

  useEffect(() => {
    void loadFocus();
    void loadHistory();
  }, [loadFocus, loadHistory]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const generate = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(props.documentId)}/audio-summary/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus_option_ids: selectedOptions.map((s) => s.id),
          selected_focus_options: selectedOptions,
          custom_focus: custom,
          voice_gender: voice,
          format,
          duration,
          language,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        detail?: string;
        audio_url?: string;
        transcript?: string;
        chapters?: unknown;
        source_pages?: number[];
        source_sections?: string[];
        duration_seconds?: number;
        provider?: string;
      };
      if (!res.ok) {
        setErr(json.detail || json.error || `HTTP ${res.status}`);
        return;
      }
      if (!json.audio_url || typeof json.transcript !== "string") {
        setErr("Unexpected server response.");
        return;
      }
      const chaptersRaw = Array.isArray(json.chapters) ? json.chapters : [];
      const chapters: AudioChapter[] = chaptersRaw
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
        .map((c) => ({
          title: typeof c.title === "string" ? c.title : "Chapter",
          text: typeof c.text === "string" ? c.text : "",
          source_pages: Array.isArray(c.source_pages)
            ? c.source_pages.filter((x): x is number => typeof x === "number")
            : undefined,
        }));
      setResult({
        audio_url: json.audio_url,
        transcript: json.transcript,
        chapters,
        source_pages: json.source_pages ?? [],
        source_sections: json.source_sections ?? [],
        duration_seconds: json.duration_seconds ?? 0,
        provider: json.provider ?? "unknown",
      });
      void loadHistory();
    } catch {
      setErr("Network error while generating audio.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = !props.enabled || focusLoading;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 text-[13px] text-muted-foreground">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Audio Summary</h2>
        <p className="text-[12px] leading-relaxed">Generate a hosted audio briefing from this PDF.</p>
      </header>

      {!props.enabled ? <p>Complete extraction to unlock audio summaries.</p> : null}

      {focusErr ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-50">
          {focusErr}
        </div>
      ) : null}
      {focusLoading ? <p className="text-[12px]">Preparing audio focus suggestions…</p> : null}

      {focus?.document_summary ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document summary</p>
          <div className="rounded-2xl border border-border bg-muted/35 p-4 text-[12px] leading-relaxed">{focus.document_summary}</div>
        </section>
      ) : null}

      <AudioFocusSelector options={focus?.focus_options ?? []} selectedIds={selected} onToggle={toggle} disabled={disabled} />

      <VoiceSelector value={voice} onChange={setVoice} disabled={disabled || busy} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Format</p>
          <div className="flex flex-col gap-2">
            {(
              [
                { id: "single_host" as const, label: "Single host" },
                { id: "two_hosts" as const, label: "Two-host conversation" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={disabled || busy}
                onClick={() => setFormat(o.id)}
                className={`rounded-xl border px-3 py-2 text-left text-[12px] font-medium transition ${
                  format === o.id
                    ? "border-[#C8E53A]/70 bg-[#C8E53A]/12 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-white/18"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
          <div className="flex flex-col gap-2">
            {(
              [
                { id: "short" as const, label: "Short · 1–2 min" },
                { id: "medium" as const, label: "Medium · 3–5 min" },
                { id: "long" as const, label: "Long · 6–10 min" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={disabled || busy}
                onClick={() => setDuration(o.id)}
                className={`rounded-xl border px-3 py-2 text-left text-[12px] font-medium transition ${
                  duration === o.id
                    ? "border-[#C8E53A]/70 bg-[#C8E53A]/12 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-white/18"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Language</p>
        <select
          value={language}
          disabled={disabled || busy}
          onChange={(e) => setLanguage(e.target.value as "auto" | "en" | "zh-Hant")}
          className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-[12px] text-foreground"
        >
          <option value="auto">Auto</option>
          <option value="en">English</option>
          <option value="zh-Hant">Traditional Chinese</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="audio-custom">
          What should the audio summary focus on?
        </label>
        <textarea
          id="audio-custom"
          value={custom}
          disabled={disabled || busy}
          onChange={(e) => setCustom(e.target.value)}
          rows={3}
          placeholder="Optional extra guidance…"
          className="w-full resize-y rounded-xl border border-border bg-muted/50 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {err ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-50">{err}</div>
      ) : null}

      <button
        type="button"
        disabled={disabled || busy || (selected.size === 0 && !custom.trim())}
        onClick={() => void generate()}
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#C8E53A] px-4 text-[13px] font-semibold text-[#0d0d0d] shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Writing script and generating audio…" : "Generate Audio Summary"}
      </button>

      {result ? (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            Provider: {result.provider} · approx. {Math.max(1, Math.round(result.duration_seconds))} s
          </p>
          <AudioSummaryPlayer src={result.audio_url} />
          <AudioTranscript
            transcript={result.transcript}
            chapters={result.chapters}
            sourcePages={result.source_pages}
            sourceSections={result.source_sections}
            onOpenSourcePage={props.onOpenSourcePage}
          />
        </div>
      ) : null}

      {history.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent audio</p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-muted/30 p-3">
                <AudioSummaryPlayer src={h.audio_url} />
                {h.transcript ? (
                  <p className="mt-2 line-clamp-3 text-[11px] text-muted-foreground">{h.transcript}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
