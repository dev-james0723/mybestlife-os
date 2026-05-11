"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type Props = {
  source: string;
  className?: string;
  /** Passes through to the content wrapper for scroll containers. */
  style?: React.CSSProperties;
};

/**
 * Renders markdown with GitHub-style comfortable reading defaults.
 * Links open in a new tab with safe `rel`.
 */
export function MarkdownPreview({ source, className, style }: Props) {
  return (
    <div
      className={cn(
        "prose-knowledge max-w-none text-sm leading-relaxed",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/40 [&_pre]:p-3 [&_pre]:text-xs",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
        "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold",
        "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_h4]:mb-1.5 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-semibold",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg",
        "[&_hr]:my-4 [&_hr]:border-border/60",
        "[&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
        "[&_table_th]:border [&_table_th]:border-border/50 [&_table_th]:px-2 [&_table_th]:py-1 [&_table_th]:text-left [&_table_th]:font-medium",
        "[&_table_td]:border [&_table_td]:border-border/50 [&_table_td]:px-2 [&_table_td]:py-1",
        "[&_p]:my-2",
        className,
      )}
      style={style}
    >
      <ReactMarkdown
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
