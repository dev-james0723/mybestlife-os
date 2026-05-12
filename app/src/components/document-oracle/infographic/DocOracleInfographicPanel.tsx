"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InfographicStyle } from "@/lib/document-brain/infographicStyles";
import { GeneratedInfographicViewer } from "@/components/document-oracle/infographic/GeneratedInfographicViewer";
import { InfographicAspectRatioSelector } from "@/components/document-oracle/infographic/InfographicAspectRatioSelector";
import type { InfographicFocusOptionCard } from "@/components/document-oracle/infographic/InfographicFocusSelector";
import { InfographicFocusSelector } from "@/components/document-oracle/infographic/InfographicFocusSelector";
import { InfographicStyleSelector } from "@/components/document-oracle/infographic/InfographicStyleSelector";

type FocusApiResponse = {
  document_type: string;
  summary: string;
  focus_options: InfographicFocusOptionCard[];
};

export function DocOracleInfographicPanel(props: {
  documentId: string;
  enabled: boolean;
}) {
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "4:3" | "1:1">("16:9");
  const [style, setStyle] = useState<InfographicStyle>("executive_brief");
  const [language, setLanguage] = useState<"auto" | "en" | "zh-Hant">("auto");
  const [customFocus, setCustomFocus] = useState("");
  const [focusData, setFocusData] = useState<FocusApiResponse | null>(null);
  const [focusErr, setFocusErr] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    image_url: string;
    prompt_used: string;
    model: string;
    aspect_ratio: string;
    style: InfographicStyle;
  } | null>(null);

  const selectedOptions = useMemo(() => {
    const opts = focusData?.focus_options ?? [];
    return opts.filter((o) => selected.has(o.id));
  }, [focusData, selected]);

  const loadFocus = useCallback(async () => {
    if (!props.enabled) return;
    setFocusLoading(true);
    setFocusErr(null);
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(props.documentId)}/infographic/focus-options`, {
        method: "POST",
      });
      const data = (await res.json()) as FocusApiResponse & { error?: string; detail?: string };
      if (!res.ok) {
        setFocusErr(data.detail || data.error || `HTTP ${res.status}`);
        setFocusData(null);
        return;
      }
      setFocusData({
        document_type: data.document_type,
        summary: data.summary,
        focus_options: data.focus_options ?? [],
      });
    } catch {
      setFocusErr("Network error loading focus options.");
      setFocusData(null);
    } finally {
      setFocusLoading(false);
    }
  }, [props.documentId, props.enabled]);

  useEffect(() => {
    void loadFocus();
  }, [loadFocus]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const generate = async () => {
    setGenErr(null);
    setGenBusy(true);
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(props.documentId)}/infographic/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aspect_ratio: aspect,
          style,
          language,
          custom_focus: customFocus,
          focus_option_ids: selectedOptions.map((s) => s.id),
          selected_focus_options: selectedOptions,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        image_url?: string;
        prompt_used?: string;
        model?: string;
        aspect_ratio?: string;
        style?: InfographicStyle;
      };
      if (!res.ok) {
        setGenErr(json.detail || json.error || `HTTP ${res.status}`);
        return;
      }
      if (!json.image_url || !json.prompt_used || !json.model || !json.style) {
        setGenErr("Unexpected response from server.");
        return;
      }
      setResult({
        image_url: json.image_url,
        prompt_used: json.prompt_used,
        model: json.model,
        aspect_ratio: json.aspect_ratio ?? aspect,
        style: json.style,
      });
    } catch {
      setGenErr("Network error during generation.");
    } finally {
      setGenBusy(false);
    }
  };

  const disabled = !props.enabled || focusLoading;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 text-[13px] text-muted-foreground">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Infographic</h2>
        <p className="text-[12px] leading-relaxed">Turn this document into a shareable visual summary.</p>
      </header>

      {!props.enabled ? (
        <p>Complete document extraction to unlock infographic generation.</p>
      ) : null}

      {focusErr ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-50">
          {focusErr}
        </div>
      ) : null}

      {focusLoading ? <p className="text-[12px]">Analyzing document for infographic angles…</p> : null}

      {focusData?.summary ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document summary</p>
          <div className="rounded-2xl border border-border bg-muted/35 p-4 text-[12px] leading-relaxed text-muted-foreground">
            {focusData.summary}
          </div>
        </section>
      ) : null}

      <InfographicFocusSelector options={focusData?.focus_options ?? []} selectedIds={selected} onToggle={toggle} disabled={disabled} />

      <div className="grid gap-4 sm:grid-cols-2">
        <InfographicAspectRatioSelector value={aspect} onChange={setAspect} disabled={disabled || genBusy} />
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Language</p>
          <select
            value={language}
            disabled={disabled || genBusy}
            onChange={(e) => setLanguage(e.target.value as "auto" | "en" | "zh-Hant")}
            className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-[12px] text-foreground"
          >
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="zh-Hant">Traditional Chinese</option>
          </select>
        </div>
      </div>

      <InfographicStyleSelector value={style} onChange={setStyle} disabled={disabled || genBusy} />

      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="infographic-custom">
          Anything specific you want the infographic to focus on?
        </label>
        <textarea
          id="infographic-custom"
          value={customFocus}
          disabled={disabled || genBusy}
          onChange={(e) => setCustomFocus(e.target.value)}
          rows={3}
          placeholder="Tell Doc Oracle what the infographic should focus on…"
          className="w-full resize-y rounded-xl border border-border bg-muted/50 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {genErr ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-50">{genErr}</div>
      ) : null}

      <button
        type="button"
        disabled={disabled || genBusy || (selected.size === 0 && !customFocus.trim())}
        onClick={() => void generate()}
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#C8E53A] px-4 text-[13px] font-semibold text-[#0d0d0d] shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {genBusy ? "Designing document infographic…" : "Generate Infographic"}
      </button>

      {result ? (
        <GeneratedInfographicViewer
          imageUrl={result.image_url}
          aspectRatio={result.aspect_ratio}
          style={result.style}
          model={result.model}
          promptUsed={result.prompt_used}
          busy={genBusy}
          onRegenerate={() => void generate()}
          onOpenImage={() => window.open(result.image_url, "_blank", "noopener,noreferrer")}
          onCopyPrompt={async () => {
            try {
              await navigator.clipboard.writeText(result.prompt_used);
            } catch {
              /* ignore */
            }
          }}
          onDownload={async () => {
            try {
              const r = await fetch(result.image_url);
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `infographic-${props.documentId.slice(0, 8)}.png`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              /* ignore */
            }
          }}
        />
      ) : null}
    </div>
  );
}
