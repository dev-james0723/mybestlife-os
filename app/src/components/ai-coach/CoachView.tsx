"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Library, Search, Plus, Settings2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import { CareerHelpPanel, CareerSectionPanel } from "@/components/career/career-page-ui";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  useCustomPrompts,
  useDeleteCustomPrompt,
  usePromptFavorites,
  useRecentPromptUsage,
  useSystemPromptTemplates,
  useToggleTemplateFavorite,
} from "@/hooks/use-ai-coach";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { useAICoachStore } from "@/stores/ai-coach-store";
import type {
  AnyPrompt,
  CareerCoachTab,
  CareerCoachCategoryFilter,
  PromptCategory,
  SystemPromptTemplate,
  UserCustomPrompt,
} from "@/types/ai-coach";
import { getLocalizedTitle } from "@/lib/prompts/compiler";
import { PromptCard } from "./PromptCard";
import { PromptCategoryFilter } from "./PromptCategoryFilter";
import { PromptGrid } from "./PromptGrid";
import { CoachEmptyState } from "./EmptyState";
import { ProfileBanner } from "./ProfileBanner";
import { CustomPromptModal } from "./CustomPromptModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function toSystemAny(t: SystemPromptTemplate): AnyPrompt {
  return {
    kind: "system",
    id: t.id,
    slug: t.slug,
    icon: t.icon,
    category: t.category,
    title_i18n: t.title_i18n,
    description_i18n: t.description_i18n,
    prompt_i18n: t.prompt_i18n,
    required_variables: t.required_variables,
    optional_variables: t.optional_variables,
    attachment_categories: t.attachment_categories,
    template: t,
  };
}

function toCustomAny(c: UserCustomPrompt): AnyPrompt {
  return {
    kind: "custom",
    id: c.id,
    icon: c.icon,
    title: c.title,
    prompt_body: c.prompt_body,
    tags: c.tags,
    required_variables: c.required_variables,
    optional_variables: c.optional_variables,
    attachment_categories: c.attachment_categories,
    is_favorite: c.is_favorite,
    usage_count: c.usage_count,
    custom: c,
  };
}

export function CoachView() {
  const language = useAppStore((s) => s.language);
  const copy = getAICoachCopy(language);
  const localeSlug = useLocaleSlug();
  const sp = useSearchParams();
  const preselectFileId = sp.get("fileId");
  const preselectCategory = sp.get("category");

  const systemQuery = useSystemPromptTemplates();
  const customQuery = useCustomPrompts();
  const favoritesQuery = usePromptFavorites();
  const recentQuery = useRecentPromptUsage(10);
  const profileQuery = useCareerProfile();
  const toggleFav = useToggleTemplateFavorite();
  const deleteCustom = useDeleteCustomPrompt();

  const {
    lastTab,
    lastCategory,
    searchQuery,
    createCustomOpen,
    editingCustomId,
    setTab,
    setCategory,
    setSearchQuery,
    openCreateCustom,
    closeCreateCustom,
    startEditCustom,
  } = useAICoachStore();

  const [pendingDelete, setPendingDelete] = useState<UserCustomPrompt | null>(
    null,
  );

  // Sync category filter from URL search param without an effect: track the
  // last applied value and push it into the store during render when it changes.
  const [appliedPreselect, setAppliedPreselect] = useState<string | null>(null);
  if (preselectCategory && preselectCategory !== appliedPreselect) {
    setAppliedPreselect(preselectCategory);
    setCategory(preselectCategory as CareerCoachCategoryFilter);
  }

  const loading = systemQuery.isLoading || customQuery.isLoading;

  const allPrompts: AnyPrompt[] = useMemo(() => {
    const sys = (systemQuery.data ?? []).map(toSystemAny);
    const cust = (customQuery.data ?? []).map(toCustomAny);
    return [...sys, ...cust];
  }, [systemQuery.data, customQuery.data]);

  const favoriteTemplateIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((f) => f.template_id)),
    [favoritesQuery.data],
  );

  const isFavoriteFor = (p: AnyPrompt) =>
    p.kind === "system"
      ? favoriteTemplateIds.has(p.id)
      : p.kind === "custom"
        ? p.is_favorite
        : false;

  const recentOrder = useMemo(() => {
    const ids = (recentQuery.data ?? []).map(
      (r) => r.template_id ?? r.custom_prompt_id,
    );
    return new Map<string, number>(ids.map((id, i) => [id as string, i]));
  }, [recentQuery.data]);

  const counts = useMemo(() => {
    const c: Record<PromptCategory | "all", number> = {
      all: allPrompts.length,
      resume: 0,
      interview: 0,
      discovery: 0,
      transition: 0,
      growth: 0,
      branding: 0,
      application: 0,
      other: 0,
    };
    for (const p of allPrompts) {
      const cat: PromptCategory =
        p.kind === "system" ? p.category : "other";
      c[cat] += 1;
    }
    return c;
  }, [allPrompts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matchesCategory = (p: AnyPrompt) => {
      if (lastCategory === "all") return true;
      const cat: PromptCategory = p.kind === "system" ? p.category : "other";
      return cat === lastCategory;
    };

    const matchesSearch = (p: AnyPrompt) => {
      if (!q) return true;
      const title = getLocalizedTitle(p, language).toLowerCase();
      if (title.includes(q)) return true;
      if (p.kind === "system") {
        const desc = (p.description_i18n[language] ?? "").toLowerCase();
        if (desc.includes(q)) return true;
      } else {
        if (p.prompt_body.toLowerCase().includes(q)) return true;
        if (p.tags.some((t) => t.toLowerCase().includes(q))) return true;
      }
      return false;
    };

    const matchesTab = (p: AnyPrompt, tab: CareerCoachTab) => {
      if (tab === "all") return true;
      if (tab === "favorites") {
        return p.kind === "system"
          ? favoriteTemplateIds.has(p.id)
          : p.is_favorite;
      }
      // recent
      return recentOrder.has(p.id);
    };

    return allPrompts.filter(
      (p) => matchesCategory(p) && matchesSearch(p) && matchesTab(p, lastTab),
    );
  }, [allPrompts, searchQuery, lastCategory, lastTab, language, recentOrder, favoriteTemplateIds]);

  const sorted = useMemo(() => {
    if (lastTab === "recent") {
      return [...filtered].sort(
        (a, b) =>
          (recentOrder.get(a.id) ?? 999) - (recentOrder.get(b.id) ?? 999),
      );
    }
    return filtered;
  }, [filtered, lastTab, recentOrder]);

  if (loading) return <LoadingPage />;

  const profile = profileQuery.data;
  const profileIsThin =
    !profile ||
    (!profile.current_role &&
      !profile.industry &&
      profile.top_skills.length === 0 &&
      !profile.career_goals);

  const settingsHref = withLocalePrefix(localeSlug, "/settings/ai-preferences");
  const profileHref = withLocalePrefix(localeSlug, "/career/coach/profile");

  const buildUseHref = (p: AnyPrompt) => {
    const qs = new URLSearchParams();
    qs.set("kind", p.kind);
    if (preselectFileId) qs.set("fileId", preselectFileId);
    return withLocalePrefix(
      localeSlug,
      `/career/coach/${p.id}/use?${qs.toString()}`,
    );
  };

  const handleToggleFav = (p: AnyPrompt) => {
    if (p.kind === "system") {
      toggleFav.mutate({
        templateId: p.id,
        next: !favoriteTemplateIds.has(p.id),
      });
    } else if (p.kind === "custom") {
      // Toggling custom = flip is_favorite via update
      import("@/lib/repositories/prompt-library").then((m) =>
        m.promptLibraryRepository.updateCustomPrompt(p.id, {
          is_favorite: !p.is_favorite,
        }),
      );
      // Let react-query refetch
      customQuery.refetch();
    }
  };

  const crumbLink = withLocalePrefix(localeSlug, "/career");

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <>
          <OSControl
            render={<Link href={settingsHref} aria-label={copy.settings.title} />}
            className="gap-2"
          >
            <Settings2 className="size-4" aria-hidden />
            <span className="hidden sm:inline">{copy.settings.title}</span>
            <span className="sm:hidden">Settings</span>
          </OSControl>
          <OSPrimaryAction className="gap-2" onClick={openCreateCustom}>
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{copy.customCta.create.replace(/^\+\s*/, "")}</span>
            <span className="sm:hidden">{copy.customCta.create.replace(/^\+\s*/, "")}</span>
          </OSPrimaryAction>
        </>
      }
    >
      <nav className="text-xs text-muted-foreground">
        <Link href={crumbLink} className="inline-flex min-h-11 min-w-11 items-center rounded-md hover:underline sm:min-h-6 sm:min-w-6 sm:px-1">
          {copy.breadcrumb.career}
        </Link>{" "}
        / <span className="text-foreground">{copy.breadcrumb.coach}</span>
      </nav>

      <CareerHelpPanel icon={Library} title="Prompt library, not a chat room">
        Choose a proven career workflow, attach context from your profile or Vault,
        then dispatch the finished prompt to the AI tool you prefer.
      </CareerHelpPanel>

      {profileIsThin ? <ProfileBanner copy={copy} editHref={profileHref} /> : null}

      <CareerSectionPanel
        title="Find the right career action"
        description="Search by use case or filter by resume, interview, discovery, transition, growth, branding, and application work."
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-11 rounded-xl border-white/50 bg-white/68 pl-9 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            aria-label={copy.searchPlaceholder}
          />
        </div>
      </CareerSectionPanel>

      <Tabs
        value={lastTab}
        onValueChange={(v) => setTab(v as CareerCoachTab)}
      >
        <TabsList className="h-12 w-full sm:h-8 sm:w-fit">
          <TabsTrigger className="h-11 px-3 sm:h-[calc(100%-1px)] sm:px-1.5" value="all">
            {copy.tabs.all}
          </TabsTrigger>
          <TabsTrigger className="h-11 px-3 sm:h-[calc(100%-1px)] sm:px-1.5" value="favorites">
            {copy.tabs.favorites}
          </TabsTrigger>
          <TabsTrigger className="h-11 px-3 sm:h-[calc(100%-1px)] sm:px-1.5" value="recent">
            {copy.tabs.recent}
          </TabsTrigger>
        </TabsList>

        <div className="my-3">
          <PromptCategoryFilter
            copy={copy}
            selected={lastCategory}
            counts={counts}
            onSelect={(c: CareerCoachCategoryFilter) => setCategory(c)}
          />
        </div>

        <TabsContent value={lastTab}>
          {sorted.length === 0 ? (
            <CoachEmptyState
              title={
                lastTab === "favorites"
                  ? copy.empty.noFavorites
                  : lastTab === "recent"
                    ? copy.empty.noRecent
                    : searchQuery
                      ? copy.empty.noResults
                      : copy.empty.noPrompts
              }
              icon={<Sparkles className="h-5 w-5" />}
            />
          ) : (
            <PromptGrid>
              {sorted.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  locale={language}
                  copy={copy}
                  isFavorite={isFavoriteFor(p)}
                  usageCount={p.kind === "custom" ? p.usage_count : undefined}
                  useHref={buildUseHref(p)}
                  onToggleFavorite={() => handleToggleFav(p)}
                  onEdit={
                    p.kind === "custom"
                      ? () => startEditCustom(p.id)
                      : undefined
                  }
                  onDelete={
                    p.kind === "custom"
                      ? () => setPendingDelete(p.custom)
                      : undefined
                  }
                />
              ))}
            </PromptGrid>
          )}
        </TabsContent>
      </Tabs>

      <CustomPromptModal
        open={createCustomOpen}
        editingId={editingCustomId}
        copy={copy}
        onClose={closeCreateCustom}
      />

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.custom.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? copy.custom.deleteConfirmDescription(pendingDelete.title)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.custom.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCustom.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                try {
                  await deleteCustom.mutateAsync(pendingDelete.id);
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              {deleteCustom.isPending
                ? copy.custom.deleting
                : copy.custom.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
