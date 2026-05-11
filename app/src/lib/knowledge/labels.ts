/**
 * Centralized source-type → presentation mapping.
 *
 * One place to keep label / icon / accent / category in sync across:
 *   - Add Knowledge modal detection badge
 *   - KnowledgeCard overlay
 *   - KnowledgeDetailSheet header
 *   - KnowledgeFilterBar / Sidebar
 *   - Any future analytics / grouping UI
 *
 * Icons are names from `lucide-react`; consumers resolve them at render time.
 */

import type {
  KnowledgeCategory,
  SourceType,
} from "@/types/knowledge-source";

export type SourceTypeAccent = {
  /** Tailwind classes for a light subtle background. */
  bg: string;
  /** Tailwind classes for dark-mode subtle background. */
  darkBg: string;
  /** Tailwind text color for the label. */
  text: string;
  /** Tailwind dark-mode text color. */
  darkText: string;
  /** Tailwind border color. */
  border: string;
  /** Lucide icon name rendered by the UI layer. */
  iconName: LucideIconName;
};

export type LucideIconName =
  | "Newspaper"
  | "PlayCircle"
  | "Film"
  | "MessageSquare"
  | "Instagram"
  | "Facebook"
  | "Flame"
  | "Github"
  | "FileCode"
  | "Code2"
  | "Languages"
  | "FileText"
  | "BookOpen"
  | "Hash"
  | "FileType2"
  | "Mic"
  | "Paperclip"
  | "Link2"
  | "Image"
  | "Music"
  | "FileSpreadsheet"
  | "Presentation"
  | "Archive";

export type SourceTypeInfo = {
  sourceType: SourceType;
  label: string;
  category: KnowledgeCategory;
  accent: SourceTypeAccent;
  /** Whether Ask-the-Document / Ask-the-Video chat is applicable. */
  askEnabled: boolean;
  /** Whether a meaningful in-app preview exists. */
  supportsPreview: boolean;
  /** Default display mode when both preview & source exist. */
  defaultDisplayMode: "preview" | "source";
};

/** Accent palette per category so siblings read as a family. */
const ACCENTS = {
  article: {
    bg: "bg-teal-50",
    darkBg: "dark:bg-teal-900/30",
    text: "text-teal-700",
    darkText: "dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-900/60",
  },
  video: {
    bg: "bg-orange-50",
    darkBg: "dark:bg-orange-900/30",
    text: "text-orange-700",
    darkText: "dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-900/60",
  },
  youtubeShorts: {
    bg: "bg-rose-50",
    darkBg: "dark:bg-rose-900/30",
    text: "text-rose-700",
    darkText: "dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-900/60",
  },
  x: {
    bg: "bg-slate-100",
    darkBg: "dark:bg-slate-800/50",
    text: "text-slate-700",
    darkText: "dark:text-slate-200",
    border: "border-slate-300 dark:border-slate-700",
  },
  facebook: {
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/30",
    text: "text-blue-700",
    darkText: "dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900/60",
  },
  instagram: {
    bg: "bg-pink-50",
    darkBg: "dark:bg-pink-900/30",
    text: "text-pink-700",
    darkText: "dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-900/60",
  },
  threads: {
    bg: "bg-zinc-100",
    darkBg: "dark:bg-zinc-800/50",
    text: "text-zinc-700",
    darkText: "dark:text-zinc-200",
    border: "border-zinc-300 dark:border-zinc-700",
  },
  reddit: {
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-900/30",
    text: "text-amber-700",
    darkText: "dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900/60",
  },
  github: {
    bg: "bg-violet-50",
    darkBg: "dark:bg-violet-900/30",
    text: "text-violet-700",
    darkText: "dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900/60",
  },
  code: {
    bg: "bg-indigo-50",
    darkBg: "dark:bg-indigo-900/30",
    text: "text-indigo-700",
    darkText: "dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-900/60",
  },
  markdown: {
    bg: "bg-emerald-50",
    darkBg: "dark:bg-emerald-900/30",
    text: "text-emerald-700",
    darkText: "dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900/60",
  },
  html: {
    bg: "bg-cyan-50",
    darkBg: "dark:bg-cyan-900/30",
    text: "text-cyan-700",
    darkText: "dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-900/60",
  },
  note: {
    bg: "bg-gray-100",
    darkBg: "dark:bg-gray-800/50",
    text: "text-gray-700",
    darkText: "dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
  },
  file: {
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/30",
    text: "text-blue-700",
    darkText: "dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900/60",
  },
  audio: {
    bg: "bg-violet-50",
    darkBg: "dark:bg-violet-900/30",
    text: "text-violet-700",
    darkText: "dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900/60",
  },
  image: {
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-900/30",
    text: "text-amber-700",
    darkText: "dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900/60",
  },
} as const;

const SOURCE_TYPE_REGISTRY: Record<SourceType, SourceTypeInfo> = {
  article_url: {
    sourceType: "article_url",
    label: "Article",
    category: "article",
    accent: { ...ACCENTS.article, iconName: "Newspaper" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  youtube_video: {
    sourceType: "youtube_video",
    label: "YouTube Video",
    category: "video",
    accent: { ...ACCENTS.video, iconName: "PlayCircle" },
    askEnabled: true,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  youtube_shorts: {
    sourceType: "youtube_shorts",
    label: "YouTube Shorts",
    category: "video",
    accent: { ...ACCENTS.youtubeShorts, iconName: "Film" },
    askEnabled: true,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_x_post: {
    sourceType: "social_x_post",
    label: "X Post",
    category: "social_media",
    accent: { ...ACCENTS.x, iconName: "MessageSquare" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_facebook_post: {
    sourceType: "social_facebook_post",
    label: "Facebook Post",
    category: "social_media",
    accent: { ...ACCENTS.facebook, iconName: "Facebook" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_facebook_video_post: {
    sourceType: "social_facebook_video_post",
    label: "Facebook Video Post",
    category: "social_media",
    accent: { ...ACCENTS.facebook, iconName: "Facebook" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_instagram_post: {
    sourceType: "social_instagram_post",
    label: "Instagram Post",
    category: "social_media",
    accent: { ...ACCENTS.instagram, iconName: "Instagram" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_instagram_reel: {
    sourceType: "social_instagram_reel",
    label: "Instagram Reel",
    category: "social_media",
    accent: { ...ACCENTS.instagram, iconName: "Instagram" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_threads_post: {
    sourceType: "social_threads_post",
    label: "Threads Post",
    category: "social_media",
    accent: { ...ACCENTS.threads, iconName: "MessageSquare" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  social_reddit_post: {
    sourceType: "social_reddit_post",
    label: "Reddit Post",
    category: "social_media",
    accent: { ...ACCENTS.reddit, iconName: "Flame" },
    askEnabled: false,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  github_repository: {
    sourceType: "github_repository",
    label: "GitHub Repository",
    category: "repository",
    accent: { ...ACCENTS.github, iconName: "Github" },
    askEnabled: true,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  html_input: {
    sourceType: "html_input",
    label: "HTML",
    category: "markup",
    accent: { ...ACCENTS.html, iconName: "FileCode" },
    askEnabled: true,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  markdown_input: {
    sourceType: "markdown_input",
    label: "Markdown",
    category: "markup",
    accent: { ...ACCENTS.markdown, iconName: "BookOpen" },
    askEnabled: true,
    supportsPreview: true,
    defaultDisplayMode: "preview",
  },
  code_python: {
    sourceType: "code_python",
    label: "Python",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_javascript: {
    sourceType: "code_javascript",
    label: "JavaScript",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_typescript: {
    sourceType: "code_typescript",
    label: "TypeScript",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_java: {
    sourceType: "code_java",
    label: "Java",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_php: {
    sourceType: "code_php",
    label: "PHP",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_css: {
    sourceType: "code_css",
    label: "CSS",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_sql: {
    sourceType: "code_sql",
    label: "SQL",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_bash: {
    sourceType: "code_bash",
    label: "Shell",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  code_json: {
    sourceType: "code_json",
    label: "JSON",
    category: "code",
    accent: { ...ACCENTS.code, iconName: "Code2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  plain_text: {
    sourceType: "plain_text",
    label: "Plain Text",
    category: "note",
    accent: { ...ACCENTS.note, iconName: "FileText" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  file_upload: {
    sourceType: "file_upload",
    label: "File",
    category: "file",
    accent: { ...ACCENTS.file, iconName: "Paperclip" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  voice_memo: {
    sourceType: "voice_memo",
    label: "Voice Memo",
    category: "audio",
    accent: { ...ACCENTS.audio, iconName: "Mic" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
  url_other: {
    sourceType: "url_other",
    label: "Link",
    category: "article",
    accent: { ...ACCENTS.article, iconName: "Link2" },
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
  },
};

export const KNOWLEDGE_CATEGORY_ORDER: KnowledgeCategory[] = [
  "article",
  "video",
  "social_media",
  "repository",
  "code",
  "markup",
  "audio",
  "image",
  "note",
  "file",
];

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  article: "Articles",
  video: "Videos",
  social_media: "Social Media",
  repository: "Repositories",
  code: "Code",
  markup: "Markup",
  audio: "Audio",
  image: "Images",
  note: "Notes",
  file: "Files",
};

export function getCategoryLabel(category: KnowledgeCategory | undefined): string {
  if (!category) return CATEGORY_LABELS.note;
  return CATEGORY_LABELS[category] ?? category;
}

export function getSourceTypeInfo(sourceType: SourceType | undefined | null): SourceTypeInfo {
  if (!sourceType) return SOURCE_TYPE_REGISTRY.plain_text;
  return SOURCE_TYPE_REGISTRY[sourceType] ?? SOURCE_TYPE_REGISTRY.plain_text;
}

export const SOURCE_TYPE_INFO_LIST: SourceTypeInfo[] = Object.values(SOURCE_TYPE_REGISTRY);

/**
 * Build an accent className bundle for a badge / chip / card overlay.
 * Consumers can destructure or join.
 */
export function buildAccentClassName(info: SourceTypeInfo): string {
  const a = info.accent;
  return [a.bg, a.darkBg, a.text, a.darkText, a.border].join(" ");
}
