import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BookOpen,
  Sparkles,
  Zap,
  CalendarCheck,
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
  Home,
  History,
  Network,
  NotebookPen,
  Users2,
  Wallet,
  Users,
  UserCircle,
  Star,
  Archive,
  FileText,
  Quote,
  Compass,
  CloudSun,
  Radar,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import {
  FINANCE_ENABLED,
  HEALTH_ENABLED,
  LEARNING_ENABLED,
  LIFE_COMPANION_ENABLED,
  NOTES_ENABLED,
  WEEKLY_REVIEW_ENABLED,
} from "@/lib/features";

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

const lifeCompanionNavItems: NavItem[] = LIFE_COMPANION_ENABLED
  ? [
      {
        itemId: "life-agent",
        title: "Life Companion",
        url: "/life-agent",
        icon: HeartHandshake,
      },
    ]
  : [];

const notesNavItems: NavItem[] = NOTES_ENABLED
  ? [{ itemId: "notes", title: "Notes", url: "/notes", icon: NotebookPen }]
  : [];

const financeNavItems: NavItem[] = FINANCE_ENABLED
  ? [{ itemId: "finance", title: "Finance", url: "/finance", icon: Wallet }]
  : [];

const healthNavItems: NavItem[] = HEALTH_ENABLED
  ? [{ itemId: "health", title: "Health", url: "/health", icon: Activity }]
  : [];

const weeklyReviewNavItems: NavItem[] = WEEKLY_REVIEW_ENABLED
  ? [
      {
        itemId: "weekly-review",
        title: "Weekly Review",
        url: "/weekly-review",
        icon: CalendarCheck,
      },
    ]
  : [];

const learningNavCategories: NavCategory[] = LEARNING_ENABLED
  ? [
      {
        categoryId: "learning",
        title: "Learning",
        icon: BookOpen,
        items: [
          {
            itemId: "japanese-study",
            title: "Japanese Study",
            url: "/japanese-study",
            icon: BookOpen,
          },
        ],
      },
    ]
  : [];

export const navigationCategories: NavCategory[] = [
  {
    categoryId: "commandCenter",
    title: "Command Center",
    icon: Zap,
    items: [
      { itemId: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { itemId: "brain", title: "Brain", url: "/brain", icon: Brain },
      ...lifeCompanionNavItems,
      { itemId: "daily-planner", title: "Daily Planner", url: "/daily-planner", icon: CalendarClock },
      { itemId: "tasks", title: "Tasks", url: "/tasks", icon: CheckSquare },
      ...notesNavItems,
      ...weeklyReviewNavItems,
      { itemId: "calendar", title: "Calendar", url: "/calendar", icon: CalendarDays },
      { itemId: "weather", title: "Weather", url: "/weather", icon: CloudSun },
      { itemId: "signals", title: "Signals", url: "/signals", icon: Radar },
      { itemId: "analytics", title: "Analytics", url: "/analytics", icon: BarChart3 },
      ...financeNavItems,
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
      ...healthNavItems,
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
      { itemId: "career", title: "Home Page", url: "/career", icon: Home },
      {
        itemId: "career-compass",
        title: "Compass",
        url: "/career/compass",
        icon: Compass,
      },
      {
        itemId: "career-profile",
        title: "Profile",
        url: "/career/profile",
        icon: User,
      },
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
      {
        itemId: "career-pipeline",
        title: "Pipeline",
        url: "/career/pipeline",
        icon: Briefcase,
      },
      {
        itemId: "career-timeline",
        title: "Timeline",
        url: "/career/timeline",
        icon: History,
      },
      {
        itemId: "career-network",
        title: "Network",
        url: "/career/network",
        icon: Network,
      },
      {
        itemId: "career-journal",
        title: "Journal",
        url: "/career/journal",
        icon: NotebookPen,
      },
      {
        itemId: "career-analytics",
        title: "Analytics",
        url: "/career/analytics",
        icon: BarChart3,
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
      { itemId: "software-vault", title: "Software Vault", url: "/vault", icon: Package },
    ],
  },
  {
    categoryId: "knowledge",
    title: "Knowledge",
    icon: Library,
    items: [
      { itemId: "knowledge-base", title: "Knowledge Base", url: "/knowledge-base", icon: Brain },
      { itemId: "ai-knowledge", title: "AI Knowledge", url: "/ai-knowledge", icon: Sparkles },
      { itemId: "mind-council", title: "Mind Council", url: "/mind-council", icon: Users2 },
      { itemId: "ideas", title: "Idea Capture", url: "/ideas", icon: Lightbulb },
    ],
  },
  ...learningNavCategories,
];
