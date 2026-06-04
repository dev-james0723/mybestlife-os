import {
  myBestLifeOsMenuIcons,
  type MyBestLifeOsMenuIcon,
} from "@/components/icons/my-best-life-os-menu-icons";

const menuIcons = myBestLifeOsMenuIcons;

export type NavItem = {
  /** Stable key for i18n (matches first path segment, e.g. `/tasks` → `tasks`). */
  itemId: string;
  title: string;
  url: string;
  icon: MyBestLifeOsMenuIcon;
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
  icon: MyBestLifeOsMenuIcon;
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
    icon: menuIcons["category:commandCenter"],
    items: [
      { itemId: "dashboard", title: "Dashboard", url: "/dashboard", icon: menuIcons["item:dashboard"] },
      { itemId: "brain", title: "Brain", url: "/brain", icon: menuIcons["item:brain"] },
      { itemId: "daily-planner", title: "Daily Planner", url: "/daily-planner", icon: menuIcons["item:daily-planner"] },
      { itemId: "tasks", title: "Tasks", url: "/tasks", icon: menuIcons["item:tasks"] },
      { itemId: "weekly-review", title: "Weekly Review", url: "/weekly-review", icon: menuIcons["item:weekly-review"] },
      { itemId: "calendar", title: "Calendar", url: "/calendar", icon: menuIcons["item:calendar"] },
      { itemId: "weather", title: "Weather", url: "/weather", icon: menuIcons["item:weather"] },
      { itemId: "signals", title: "Signals", url: "/signals", icon: menuIcons["item:signals"] },
      { itemId: "analytics", title: "Analytics", url: "/analytics", icon: menuIcons["item:analytics"] },
      { itemId: "finance", title: "Finance", url: "/finance", icon: menuIcons["item:finance"] },
    ],
  },
  {
    categoryId: "self",
    title: "Self",
    icon: menuIcons["category:self"],
    items: [
      { itemId: "about-me", title: "About Me", url: "/about-me", icon: menuIcons["item:about-me"] },
      { itemId: "grateful-things", title: "Grateful Things", url: "/grateful-things", icon: menuIcons["item:grateful-things"] },
      { itemId: "quote-library", title: "Quote Library", url: "/quote-library", icon: menuIcons["item:quote-library"] },
      { itemId: "bucket-list", title: "Bucket List", url: "/bucket-list", icon: menuIcons["item:bucket-list"] },
      { itemId: "health", title: "Health", url: "/health", icon: menuIcons["item:health"] },
      { itemId: "habits", title: "Habits & Routines", url: "/habits", icon: menuIcons["item:habits"] },
      { itemId: "journal", title: "Journal", url: "/journal", icon: menuIcons["item:journal"] },
    ],
  },
  {
    categoryId: "relationship",
    title: "People",
    icon: menuIcons["category:relationship"],
    items: [
      {
        itemId: "relationship",
        title: "Relationships",
        url: "/relationship",
        icon: menuIcons["item:relationship"],
        searchParams: { tab: "relationship" },
      },
      {
        itemId: "role-model",
        title: "Role Model",
        url: "/relationship",
        icon: menuIcons["item:role-model"],
        searchParams: { tab: "role-model" },
      },
    ],
  },
  {
    categoryId: "career",
    title: "Career",
    icon: menuIcons["category:career"],
    items: [
      { itemId: "career", title: "Home Page", url: "/career", icon: menuIcons["item:career"] },
      {
        itemId: "career-compass",
        title: "Compass",
        url: "/career/compass",
        icon: menuIcons["item:career-compass"],
      },
      {
        itemId: "career-profile",
        title: "Profile",
        url: "/career/profile",
        icon: menuIcons["item:career-profile"],
      },
      {
        itemId: "career-vault",
        title: "Career Vault",
        url: "/career/vault",
        icon: menuIcons["item:career-vault"],
      },
      {
        itemId: "career-coach",
        title: "AI Career Coach",
        url: "/career/coach",
        icon: menuIcons["item:career-coach"],
      },
      {
        itemId: "career-pipeline",
        title: "Pipeline",
        url: "/career/pipeline",
        icon: menuIcons["item:career-pipeline"],
      },
      {
        itemId: "career-timeline",
        title: "Timeline",
        url: "/career/timeline",
        icon: menuIcons["item:career-timeline"],
      },
      {
        itemId: "career-network",
        title: "Network",
        url: "/career/network",
        icon: menuIcons["item:career-network"],
      },
      {
        itemId: "career-journal",
        title: "Journal",
        url: "/career/journal",
        icon: menuIcons["item:career-journal"],
      },
      {
        itemId: "career-analytics",
        title: "Analytics",
        url: "/career/analytics",
        icon: menuIcons["item:career-analytics"],
      },
    ],
  },
  {
    categoryId: "goalsExecution",
    title: "Build & Execute",
    icon: menuIcons["category:goalsExecution"],
    items: [
      { itemId: "goals", title: "Goals", url: "/goals", icon: menuIcons["item:goals"] },
      { itemId: "projects", title: "Projects", url: "/projects", icon: menuIcons["item:projects"] },
    ],
  },
  {
    categoryId: "resources",
    title: "Resources",
    icon: menuIcons["category:resources"],
    items: [
      {
        itemId: "assets",
        title: "Assets",
        url: "/resources",
        icon: menuIcons["item:assets"],
        searchParams: { tab: "assets" },
      },
      {
        itemId: "documents",
        title: "Documents",
        url: "/resources",
        icon: menuIcons["item:documents"],
        searchParams: { tab: "documents" },
      },
      { itemId: "software-vault", title: "Software Vault", url: "/vault", icon: menuIcons["item:software-vault"] },
    ],
  },
  {
    categoryId: "knowledge",
    title: "Knowledge",
    icon: menuIcons["category:knowledge"],
    items: [
      { itemId: "knowledge-base", title: "Knowledge Base", url: "/knowledge-base", icon: menuIcons["item:knowledge-base"] },
      { itemId: "ai-knowledge", title: "AI Knowledge", url: "/ai-knowledge", icon: menuIcons["item:ai-knowledge"] },
      { itemId: "mind-council", title: "Mind Council", url: "/mind-council", icon: menuIcons["item:mind-council"] },
      { itemId: "ideas", title: "Idea Capture", url: "/ideas", icon: menuIcons["item:ideas"] },
    ],
  },
  {
    categoryId: "learning",
    title: "Learning",
    icon: menuIcons["category:learning"],
    items: [{ itemId: "japanese-study", title: "Japanese Study", url: "/japanese-study", icon: menuIcons["item:japanese-study"] }],
  },
];
