import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Archive,
  Bookmark,
  Clock,
  FileText,
  Filter,
  Lightbulb,
  Link2,
  Mic,
  Paperclip,
  Share2,
  Sparkles,
  Star,
  Tag,
  Tags,
  Unlink,
} from "lucide-react";
import type { IdeaQuickFilterIconKey } from "@/lib/ideas/quick-filters";

export const IDEA_QUICK_FILTER_ICON_COMPONENTS: Record<
  IdeaQuickFilterIconKey,
  LucideIcon
> = {
  clock: Clock,
  alertCircle: AlertCircle,
  tag: Tag,
  tagOff: Tags,
  link: Link2,
  unlink: Unlink,
  archive: Archive,
  filter: Filter,
  file: FileText,
  sparkles: Sparkles,
  bookmark: Bookmark,
  star: Star,
  lightbulb: Lightbulb,
  mic: Mic,
  share: Share2,
  paperclip: Paperclip,
};
