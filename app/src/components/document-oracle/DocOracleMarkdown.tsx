"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function knowledgeFilesApiHref(filePath: string): string {
  return `/api/knowledge-files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

function isKnowledgeStoragePath(src: string): boolean {
  const s = src.trim();
  if (!s || s.startsWith("http") || s.startsWith("data:") || s.startsWith("/")) return false;
  return /^[0-9a-f-]{36}\//i.test(s);
}

type Props = {
  source: string;
  className?: string;
};

/**
 * Sanitized GitHub-flavored markdown for Doc Oracle (dark surfaces).
 */
export function DocOracleMarkdown({ source, className }: Props) {
  return (
    <div
      className={cn(
        "doc-oracle-md max-w-none text-[13px] leading-relaxed text-white/85",
        "[&_a]:text-[#C8E53A] [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-[#e8f6a8]",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-black/30 [&_pre]:p-3 [&_pre]:text-[12px]",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white",
        "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#C8E53A]/35 [&_blockquote]:pl-3 [&_blockquote]:text-white/70",
        "[&_img]:my-3 [&_img]:max-h-[420px] [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10",
        "[&_hr]:my-5 [&_hr]:border-white/15",
        "[&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:rounded-xl [&_table]:border [&_table]:border-white/12",
        "[&_thead]:bg-white/[0.06]",
        "[&_th]:border [&_th]:border-white/12 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:text-white/90",
        "[&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-[12.5px] [&_td]:text-white/80",
        "[&_p]:my-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => {
            const { href, children, ...rest } = props;
            return (
              <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img: (props) => {
            const { src, alt, ...rest } = props;
            const s = typeof src === "string" ? src : "";
            const resolved = s && isKnowledgeStoragePath(s) ? knowledgeFilesApiHref(s) : s;
            // eslint-disable-next-line @next/next/no-img-element -- sanitized markdown; private bucket via proxy
            return <img {...rest} src={resolved || undefined} alt={typeof alt === "string" ? alt : ""} />;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
