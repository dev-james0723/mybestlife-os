import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bookmark,
  Clock,
  Code2,
  FileText,
  Filter,
  GitBranch,
  Globe2,
  Image,
  Link2,
  Sparkles,
  Star,
  Tag,
  Users,
  Video,
} from "lucide-react";
import type { KnowledgeQuickFilterIconKey } from "@/lib/knowledge/quick-filters";

export const KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS: Record<
  KnowledgeQuickFilterIconKey,
  LucideIcon
> = {
  clock: Clock,
  users: Users,
  gitBranch: GitBranch,
  image: Image,
  link: Link2,
  sparkles: Sparkles,
  alertTriangle: AlertTriangle,
  filter: Filter,
  tag: Tag,
  file: FileText,
  video: Video,
  code: Code2,
  bookmark: Bookmark,
  star: Star,
  globe: Globe2,
};
