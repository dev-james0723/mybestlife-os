"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MindCouncilRichTextProps = {
  source: string;
  className?: string;
};

/** Safe, compact GitHub-flavoured Markdown for AI chat responses. */
export function MindCouncilRichText({ source, className }: MindCouncilRichTextProps) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-none break-words text-sm leading-6 text-foreground/92",
        "[&_a]:font-medium [&_a]:text-lime-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-lime-300",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-lime-400/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded-md [&_code]:bg-slate-950/[0.07] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.86em] dark:[&_code]:bg-white/10",
        "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:font-heading [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_hr]:my-4 [&_hr]:border-slate-200/80 dark:[&_hr]:border-white/10",
        "[&_li]:my-1 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-2",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200/80 [&_pre]:bg-slate-950/[0.05] [&_pre]:p-3 [&_pre]:text-xs dark:[&_pre]:border-white/10 dark:[&_pre]:bg-black/20 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_strong]:font-semibold [&_table]:my-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
        "[&_td]:border [&_td]:border-slate-200/80 [&_td]:px-2.5 [&_td]:py-1.5 dark:[&_td]:border-white/10",
        "[&_th]:border [&_th]:border-slate-200/80 [&_th]:bg-slate-950/[0.04] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-white/10 dark:[&_th]:bg-white/[0.05]",
        "[&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_>:first-child]:mt-0 [&_>:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Prevent model-authored Markdown from loading remote tracking pixels.
          img: ({ alt }) => <span className="text-xs text-muted-foreground">[{alt || "image"}]</span>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
