"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ExternalLink } from "lucide-react";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { gsap, registerGSAP } from "@/lib/motion/register-gsap";
import { cn } from "@/lib/utils";

registerGSAP();

const primaryActionBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground shadow-sm transition-[background,transform] duration-150 ease-out hover:bg-primary/90 active:translate-y-px";

export function DocOracleSourcePreview(props: {
  filePath: string | null | undefined;
  previewPage: number | null;
  className?: string;
}) {
  const { filePath, previewPage, className } = props;
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion);
        const frame = root.querySelector<HTMLElement>("[data-doc-oracle-source-frame]");
        const meta = root.querySelector<HTMLElement>("[data-doc-oracle-source-meta]");
        if (reduceMotion) {
          gsap.set([frame, meta].filter(Boolean), { autoAlpha: 1, clearProps: "transform,filter" });
          return;
        }
        if (frame) {
          gsap.fromTo(
            frame,
            { autoAlpha: 0.58, y: 8, scale: 0.992, filter: "blur(3px)" },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.34,
              ease: "power3.out",
              overwrite: "auto",
              clearProps: "transform,filter",
            },
          );
        }
        if (meta) {
          gsap.fromTo(
            meta,
            { autoAlpha: 0, y: -3 },
            { autoAlpha: 1, y: 0, duration: 0.22, ease: "power2.out", overwrite: "auto", clearProps: "transform" },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [filePath, previewPage], revertOnUpdate: true },
  );

  if (!filePath) {
    return (
      <div className={cn("rounded-2xl border border-border bg-muted/50 p-4 text-[13px] text-muted-foreground", className)}>
        No source file on record.
      </div>
    );
  }

  const base = knowledgeFilesApiHref(filePath);
  const iframeSrc =
    previewPage != null && previewPage > 0 ? `${base}#page=${previewPage}` : base;
  const openHref = previewPage != null && previewPage > 0 ? `${base}#page=${previewPage}` : base;

  return (
    <div ref={rootRef} className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source preview</p>
        <a
          href={openHref}
          target="_blank"
          rel="noreferrer"
          className={cn(primaryActionBtn, "no-underline")}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {previewPage != null && previewPage > 0 ? `Open source at page ${previewPage}` : "Open source"}
        </a>
      </div>
      <div data-doc-oracle-source-frame className="min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-border bg-muted sm:min-h-[280px] md:min-h-[360px]">
        <iframe title="Section source PDF" src={iframeSrc} className="h-full min-h-[220px] w-full bg-neutral-900 sm:min-h-[280px] md:min-h-[360px]" />
      </div>
      {previewPage != null && previewPage > 0 ? (
        <p data-doc-oracle-source-meta className="text-[11px] text-muted-foreground">
          PDF viewers vary: if the preview does not jump, use the button above for page {previewPage}.
        </p>
      ) : null}
    </div>
  );
}
