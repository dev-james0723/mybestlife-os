export const spacing = {
  pagePadding: "p-6",
  sectionGap: "space-y-8",
  cardGap: "gap-4",
  fieldGap: "space-y-3",
  inlineGap: "gap-2",
  tightGap: "gap-1",
} as const;

export const typography = {
  display: "text-2xl font-bold tracking-tight",
  heading: "text-lg font-semibold",
  subheading: "text-base font-medium",
  body: "text-sm",
  label: "text-sm font-medium",
  caption: "text-xs text-muted-foreground",
} as const;

export const statusColors = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  planning: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  captured: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  reviewed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  text: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  voice: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  Testing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Active: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  Retired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Wishlist: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  Free: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  Freemium: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  Paid: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  Subscription: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
} as const;

export const priorityColors = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
  "Must-have": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  "Nice-to-have": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  Optional: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
} as const;
