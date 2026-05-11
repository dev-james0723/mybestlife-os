"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  source: string;
  language?: string;
  className?: string;
  /** Expose copy action (defaults to true). */
  showCopy?: boolean;
  /** Optional label shown above the code (e.g. language badge). */
  label?: string;
};

/**
 * Read-only code block with consistent scroll/line-wrap behaviour and a
 * copy-to-clipboard affordance. No syntax highlighting dependency on
 * purpose — we keep it pure monospace for performance + predictability;
 * markdown/HTML previews handle rendered output separately.
 */
export function CodeBlock({ source, language, className, showCopy = true, label }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [source]);

  return (
    <div className={cn("relative overflow-hidden rounded-md border bg-muted/40", className)}>
      {(label || showCopy) && (
        <div className="flex shrink-0 items-center justify-between border-b bg-muted/60 px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label ?? language ?? ""}
          </span>
          {showCopy && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={copy}
              aria-label="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}
      <pre className="max-h-[60vh] min-h-0 overflow-auto p-3 text-xs leading-relaxed">
        <code className="font-mono whitespace-pre-wrap break-words">{source}</code>
      </pre>
    </div>
  );
}
