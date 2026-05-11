"use client";

import Link from "next/link";
import {
  Compass,
  User,
  Sparkles,
  FolderOpen,
  Briefcase,
  History,
  Network,
  NotebookPen,
  BarChart3,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";

export function CareerSubmenuGrid() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const localeSlug = useLocaleSlug();

  const items = [
    {
      href: "/career/compass",
      label: copy.submenu.compass,
      icon: <Compass className="h-5 w-5" />,
    },
    {
      href: "/career/profile",
      label: copy.submenu.profile,
      icon: <User className="h-5 w-5" />,
    },
    {
      href: "/career/coach",
      label: copy.submenu.coach,
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      href: "/career/vault",
      label: copy.submenu.vault,
      icon: <FolderOpen className="h-5 w-5" />,
    },
    {
      href: "/career/pipeline",
      label: copy.submenu.pipeline,
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      href: "/career/timeline",
      label: copy.submenu.timeline,
      icon: <History className="h-5 w-5" />,
    },
    {
      href: "/career/network",
      label: copy.submenu.network,
      icon: <Network className="h-5 w-5" />,
    },
    {
      href: "/career/journal",
      label: copy.submenu.journal,
      icon: <NotebookPen className="h-5 w-5" />,
    },
    {
      href: "/career/analytics",
      label: copy.submenu.analytics,
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ];

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.sections.submenus}
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={withLocalePrefix(localeSlug, it.href)}
              className="group flex flex-col items-center gap-1 rounded-xl border bg-background/50 p-2 text-center transition-colors hover:bg-accent/40"
              aria-label={it.label}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                {it.icon}
              </span>
              <span className="text-[11px] font-medium leading-tight">
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
