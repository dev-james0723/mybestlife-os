"use client";

export type AudioChapter = {
  title: string;
  text: string;
  source_pages?: number[];
};

export function AudioTranscript(props: {
  transcript: string;
  chapters: AudioChapter[];
  sourcePages: number[];
  sourceSections: string[];
  onOpenSourcePage?: (page: number) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transcript</p>
        <div className="mt-2 max-h-[min(40vh,360px)] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
          {props.transcript}
        </div>
      </div>

      {props.chapters.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chapters</p>
          <ul className="mt-2 space-y-2">
            {props.chapters.map((c, i) => (
              <li key={`${c.title}-${i}`} className="rounded-xl border border-border bg-muted/35 p-3">
                <p className="text-[12px] font-semibold text-foreground">{c.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{c.text}</p>
                {c.source_pages?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.source_pages.map((p) => (
                      <button data-control-variant="outline"
                        key={p}
                        type="button"
                        disabled={!props.onOpenSourcePage}
                        onClick={() => props.onOpenSourcePage?.(p)}
                        className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-foreground hover:border-primary/40 disabled:cursor-default disabled:opacity-60"
                      >
                        p.{p}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {props.sourcePages.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source pages</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {props.sourcePages.map((p) => (
              <button data-control-variant="outline"
                key={p}
                type="button"
                disabled={!props.onOpenSourcePage}
                onClick={() => props.onOpenSourcePage?.(p)}
                className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] text-foreground hover:border-primary/40 disabled:cursor-default disabled:opacity-60"
              >
                p.{p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {props.sourceSections.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source sections</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted-foreground">
            {props.sourceSections.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
