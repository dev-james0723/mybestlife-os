import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BookOpen,
  Sparkles,
  Zap,
  CalendarCheck,
  StickyNote,
  Target,
  CalendarClock,
  Brain,
  BarChart3,
  Activity,
  Lightbulb,
  Heart,
  Smile,
  User,
  ListChecks,
  BookMarked,
  Library,
  Package,
  Rocket,
  CalendarDays,
  Briefcase,
  FolderOpen,
  Sparkle,
  Wallet,
  Users,
  UserCircle,
  Star,
  Archive,
  FileText,
  Quote,
  Compass,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  /** Stable key for i18n (matches first path segment, e.g. `/tasks` → `tasks`). */
  itemId: string;
  title: string;
  url: string;
  icon: LucideIcon;
  /**
   * Optional query parameters appended to `url` when navigating. Also used by
   * the sidebar to determine the active state for items that share the same
   * pathname but differ by query (e.g. sub-tabs within a single page).
   */
  searchParams?: Record<string, string>;
};

export type NavCategory = {
  /** Stable key for i18n. */
  categoryId: string;
  title: string;
  icon: LucideIcon;
  /**
   * When set, the category itself is a navigation link (no children expansion).
   * Use for top-level destinations that don't have a meaningful list of sibling
   * pages — the row renders as a plain link instead of a collapsible group.
   */
  url?: string;
  items: NavItem[];
};

export const navigationCategories: NavCategory[] = [
  {
    categoryId: "commandCenter",
    title: "Command Center",
    icon: Zap,
    items: [
      { itemId: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { itemId: "brain", title: "Brain", url: "/brain", icon: Brain },
      { itemId: "daily-planner", title: "Daily Planner", url: "/daily-planner", icon: CalendarClock },
      { itemId: "tasks", title: "Tasks", url: "/tasks", icon: CheckSquare },
      { itemId: "weekly-review", title: "Weekly Review", url: "/weekly-review", icon: CalendarCheck },
      { itemId: "calendar", title: "Calendar", url: "/calendar", icon: CalendarDays },
      { itemId: "analytics", title: "Analytics", url: "/analytics", icon: BarChart3 },
      { itemId: "finance", title: "Finance", url: "/finance", icon: Wallet },
    ],
  },
  {
    categoryId: "self",
    title: "Self",
    icon: Smile,
    items: [
      { itemId: "about-me", title: "About Me", url: "/about-me", icon: User },
      { itemId: "grateful-things", title: "Grateful Things", url: "/grateful-things", icon: Heart },
      { itemId: "quote-library", title: "Quote Library", url: "/quote-library", icon: Quote },
      { itemId: "bucket-list", title: "Bucket List", url: "/bucket-list", icon: Compass },
      { itemId: "health", title: "Health", url: "/health", icon: Activity },
      { itemId: "habits", title: "Habits & Routines", url: "/habits", icon: ListChecks },
      { itemId: "journal", title: "Journal", url: "/journal", icon: BookMarked },
    ],
  },
  {
    categoryId: "relationship",
    title: "People",
    icon: Users,
    items: [
      {
        itemId: "relationship",
        title: "Relationships",
        url: "/relationship",
        icon: UserCircle,
        searchParams: { tab: "relationship" },
      },
      {
        itemId: "role-model",
        title: "Role Model",
        url: "/relationship",
        icon: Star,
        searchParams: { tab: "role-model" },
      },
    ],
  },
  {
    categoryId: "career",
    title: "Career",
    icon: Briefcase,
    items: [
      { itemId: "career", title: "Career", url: "/career", icon: Briefcase },
      {
        itemId: "career-vault",
        title: "Career Vault",
        url: "/career/vault",
        icon: FolderOpen,
      },
      {
        itemId: "career-coach",
        title: "AI Career Coach",
        url: "/career/coach",
        icon: Sparkle,
      },
    ],
  },
  {
    categoryId: "goalsExecution",
    title: "Build & Execute",
    icon: Rocket,
    items: [
      { itemId: "goals", title: "Goals", url: "/goals", icon: Target },
      { itemId: "projects", title: "Projects", url: "/projects", icon: FolderKanban },
    ],
  },
  {
    categoryId: "resources",
    title: "Resources",
    icon: Archive,
    items: [
      {
        itemId: "assets",
        title: "Assets",
        url: "/resources",
        icon: Package,
        searchParams: { tab: "assets" },
      },
      {
        itemId: "documents",
        title: "Documents",
        url: "/resources",
        icon: FileText,
        searchParams: { tab: "documents" },
      },
    ],
  },
  {
    categoryId: "knowledge",
    title: "Knowledge",
    icon: Library,
    items: [
      { itemId: "notes", title: "Notes", url: "/notes", icon: StickyNote },
      { itemId: "knowledge-base", title: "Knowledge Base", url: "/knowledge-base", icon: Brain },
      { itemId: "ai-knowledge", title: "AI Knowledge", url: "/ai-knowledge", icon: Sparkles },
      { itemId: "ideas", title: "Idea Capture", url: "/ideas", icon: Lightbulb },
      { itemId: "software-vault", title: "Software Vault", url: "/vault", icon: Package },
    ],
  },
  {
    categoryId: "learning",
    title: "Learning",
    icon: BookOpen,
    items: [{ itemId: "japanese-study", title: "Japanese Study", url: "/japanese-study", icon: BookOpen }],
  },
];
