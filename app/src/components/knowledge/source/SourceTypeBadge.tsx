"use client";

import {
  Archive,
  BookOpen,
  Camera,
  Code2,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType2,
  Film,
  Flame,
  GitBranch,
  Hash,
  Image as ImageIcon,
  Languages,
  Link2,
  MessageSquare,
  Mic,
  Music,
  Newspaper,
  Paperclip,
  PlayCircle,
  Presentation,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getSourceTypeInfo,
  type LucideIconName,
  type SourceTypeInfo,
} from "@/lib/knowledge/labels";
import type { SourceType } from "@/types/knowledge-source";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<LucideIconName, IconComponent> = {
  Newspaper,
  PlayCircle,
  Film,
  MessageSquare,
  Instagram: Camera, // lucide v1 has no brand Instagram icon — Camera is the closest metaphor
  Facebook: ThumbsUp, // lucide v1 has no brand Facebook icon — ThumbsUp stands in
  Flame,
  Github: GitBranch, // lucide v1 has no brand Github icon — GitBranch conveys the same idea
  FileCode,
  Code2,
  Languages,
  FileText,
  BookOpen,
  Hash,
  FileType2,
  Mic,
  Paperclip,
  Link2,
  Image: ImageIcon,
  Music,
  FileSpreadsheet,
  Presentation,
  Archive,
};

export type SourceTypeBadgeProps = {
  /** Pass a sourceType to resolve the default label/accent, or an
   *  explicit `info` to render a specific preset. */
  sourceType?: SourceType;
  info?: SourceTypeInfo;
  /** Overrides the registry label when provided (e.g. provider-specific
   *  social labels that vary by subtype). */
  labelOverride?: string;
  size?: "xs" | "sm";
  className?: string;
  /**
   * `onMedia`: high-contrast glass pill for overlays on thumbnails.
   * `default`: registry accent (sidebar / body).
   */
  appearance?: "default" | "onMedia";
};

export function SourceTypeBadge({
  sourceType,
  info: explicitInfo,
  labelOverride,
  size = "sm",
  className,
  appearance = "default",
}: SourceTypeBadgeProps) {
  const info = explicitInfo ?? getSourceTypeInfo(sourceType);
  const Icon = ICON_MAP[info.accent.iconName];
  const label = labelOverride ?? info.label;

  if (appearance === "onMedia") {
    return (
      <span
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-white/[0.18] bg-black/45 font-medium text-white shadow-[0_2px_8px_rgba(0,0,0,0.16)] backdrop-blur-md",
          size === "xs" ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-[11px]",
          className,
        )}
      >
        <Icon
          className={cn(size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5", "shrink-0 text-white/95")}
        />
        <span className="min-w-0 truncate">{label}</span>
      </span>
    );
  }

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        size === "xs" ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-[11px]",
        info.accent.bg,
        info.accent.darkBg,
        info.accent.text,
        info.accent.darkText,
        info.accent.border,
        className,
      )}
    >
      <Icon className={cn(size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5", "shrink-0")} />
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}
