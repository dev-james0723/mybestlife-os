"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileText,
  History,
  NotebookPen,
  Network,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { OSControl, OSDialogSurface } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { useCareerEvents } from "@/hooks/use-career-events";
import { useCareerDecisions } from "@/hooks/use-career-decisions";
import { useCareerNetworkNodes } from "@/hooks/use-career-network";

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  group: "files" | "opportunities" | "contacts" | "events" | "decisions";
  href: string;
  keywords: string;
};

export function OmnisearchTrigger() {
  const [open, setOpen] = useState(false);
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).omnisearch;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <OSControl
        onClick={() => setOpen(true)}
        aria-label={copy.trigger}
        className="gap-2"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{copy.trigger}</span>
      </OSControl>
      <OmnisearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function OmnisearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).omnisearch;
  const localeSlug = useLocaleSlug();
  const [query, setQuery] = useState("");

  const filesQ = useCareerVaultFiles();
  const oppsQ = useCareerOpportunities();
  const eventsQ = useCareerEvents();
  const decisionsQ = useCareerDecisions();
  const nodesQ = useCareerNetworkNodes();

  const items = useMemo<SearchItem[]>(() => {
    const out: SearchItem[] = [];
    for (const f of filesQ.data ?? []) {
      out.push({
        id: `file-${f.id}`,
        title: f.filename,
        subtitle: f.category,
        group: "files",
        href: withLocalePrefix(localeSlug, `/career/vault?file=${f.id}`),
        keywords: [
          f.filename,
          f.category,
          f.description ?? "",
          (f.tags ?? []).join(" "),
        ].join(" "),
      });
    }
    for (const o of oppsQ.data ?? []) {
      out.push({
        id: `opp-${o.id}`,
        title: `${o.role_title} — ${o.company_name}`,
        subtitle: o.stage,
        group: "opportunities",
        href: withLocalePrefix(localeSlug, `/career/pipeline/${o.id}`),
        keywords: [o.role_title, o.company_name, o.stage, o.location ?? ""]
          .join(" "),
      });
    }
    for (const n of nodesQ.data ?? []) {
      out.push({
        id: `node-${n.id}`,
        title: n.name,
        subtitle: n.subtitle ?? n.role_title ?? n.node_type,
        group: "contacts",
        href: withLocalePrefix(localeSlug, `/career/network?node=${n.id}`),
        keywords: [
          n.name,
          n.subtitle ?? "",
          n.role_title ?? "",
          n.industry ?? "",
          (n.tags ?? []).join(" "),
        ].join(" "),
      });
    }
    for (const e of eventsQ.data ?? []) {
      out.push({
        id: `event-${e.id}`,
        title: e.title,
        subtitle: e.event_type,
        group: "events",
        href: withLocalePrefix(localeSlug, `/career/timeline?event=${e.id}`),
        keywords: [
          e.title,
          e.description ?? "",
          e.organization ?? "",
          e.event_type,
        ].join(" "),
      });
    }
    for (const d of decisionsQ.data ?? []) {
      out.push({
        id: `decision-${d.id}`,
        title: d.title,
        subtitle: d.decision_type ?? undefined,
        group: "decisions",
        href: withLocalePrefix(localeSlug, `/career/journal?decision=${d.id}`),
        keywords: [
          d.title,
          d.decision_type ?? "",
          d.context ?? "",
          d.decision ?? "",
        ].join(" "),
      });
    }
    return out;
  }, [
    filesQ.data,
    oppsQ.data,
    nodesQ.data,
    eventsQ.data,
    decisionsQ.data,
    localeSlug,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "subtitle", "keywords"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items],
  );

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 40);
    return fuse.search(query).map((r) => r.item);
  }, [fuse, items, query]);

  const grouped = useMemo(() => {
    const g: Record<SearchItem["group"], SearchItem[]> = {
      files: [],
      opportunities: [],
      contacts: [],
      events: [],
      decisions: [],
    };
    for (const it of results) g[it.group].push(it);
    return g;
  }, [results]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const quickActions = [
    {
      key: "dashboard",
      label: copy.quickActions.openDashboard,
      icon: BarChart3,
      href: "/career",
    },
    {
      key: "timeline",
      label: copy.quickActions.openTimeline,
      icon: History,
      href: "/career/timeline",
    },
    {
      key: "network",
      label: copy.quickActions.openNetwork,
      icon: Network,
      href: "/career/network",
    },
    {
      key: "analytics",
      label: copy.quickActions.openAnalytics,
      icon: BarChart3,
      href: "/career/analytics",
    },
    {
      key: "new-opp",
      label: copy.quickActions.newOpportunity,
      icon: Plus,
      href: "/career/pipeline?new=1",
    },
    {
      key: "new-event",
      label: copy.quickActions.newEvent,
      icon: CalendarDays,
      href: "/career/timeline?new=1",
    },
    {
      key: "new-decision",
      label: copy.quickActions.newDecision,
      icon: NotebookPen,
      href: "/career/journal?new=1",
    },
    {
      key: "new-contact",
      label: copy.quickActions.newContact,
      icon: Users,
      href: "/career/network?new=1",
    },
  ];

  const groupIcons: Record<SearchItem["group"], typeof FileText> = {
    files: FileText,
    opportunities: Briefcase,
    contacts: User,
    events: History,
    decisions: NotebookPen,
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setQuery("");
        onOpenChange(v);
      }}
    >
      <OSDialogSurface
        size="xl"
        className="overflow-hidden p-0"
        showCloseButton={false}
      >
        <Command className="border-0 bg-transparent" shouldFilter={false}>
          <div className="flex items-center border-b border-slate-200/70 px-3 dark:border-white/10">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={copy.placeholder}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[min(60vh,32rem)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {copy.noResults}
            </Command.Empty>

            {!query.trim() && (
              <Command.Group heading={copy.groups.quickActions}>
                {quickActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Command.Item
                      key={a.key}
                      value={`qa-${a.key}-${a.label}`}
                      onSelect={() =>
                        go(withLocalePrefix(localeSlug, a.href))
                      }
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors aria-selected:bg-white/72 aria-selected:text-foreground dark:aria-selected:bg-white/[0.08]"
                    >
                      <Icon
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden
                      />
                      <span>{a.label}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {(["opportunities", "files", "contacts", "events", "decisions"] as const).map(
              (group) => {
                const arr = grouped[group];
                if (arr.length === 0) return null;
                const Icon = groupIcons[group];
                return (
                  <Command.Group key={group} heading={copy.groups[group]}>
                    {arr.slice(0, 10).map((it) => (
                      <Command.Item
                        key={it.id}
                        value={`${it.id}-${it.title}`}
                        onSelect={() => go(it.href)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors aria-selected:bg-white/72 aria-selected:text-foreground dark:aria-selected:bg-white/[0.08]"
                      >
                        <Icon
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{it.title}</div>
                          {it.subtitle && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {it.subtitle}
                            </div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              },
            )}
          </Command.List>
        </Command>
      </OSDialogSurface>
    </Dialog>
  );
}
