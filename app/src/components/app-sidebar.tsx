"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type MouseEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { stripLeadingLocaleFromPathname, withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import { ChevronDown, ChevronRight, LogOut, Settings, ChevronsUpDown, Sprout } from "lucide-react";
import { LifeOsLogo } from "@/components/branding/life-os-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TodayCompanionPanel } from "@/components/sidebar/TodayCompanionPanel";
import { LiquidNavIcon } from "@/components/liquid-icons/LiquidNavIcon";
import { useFocusNavigation } from "@/components/daily-planner/focus/focus-reality-boundary";
import { navigationCategories, type NavCategory } from "@/lib/constants/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-settings";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { getThemedCategoryLabel, getThemedItemLabel } from "@/lib/theme-labels";
import { getSidebarFooterCopy } from "@/lib/i18n/sidebar-ui";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { getAppDisplayName } from "@/lib/i18n/app-brand";
import { cn } from "@/lib/utils";
import { useSsrSafeReducedMotion } from "@/hooks/use-ssr-safe-reduced-motion";
import { useCurrentTime } from "@/hooks/use-current-time";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { UiTheme } from "@/types/database";
import type { ColorMode } from "@/types/database";
import type { LiquidIconTargetType } from "@/lib/liquid-icons/navigation-assets";

/**
 * IconWell — wraps a Lucide-style icon in a span that the default theme
 * styles as a 32px rounded well (see `[data-glass-icon-well]` in
 * globals.css). Under other themes the wrapper is an inert inline span
 * so the original inline-icon layout is preserved byte-for-byte.
 */
type IconComponent = ComponentType<{ className?: string }>;
function IconWell({
  icon,
  targetType,
  targetId,
  uiTheme,
  colorMode,
}: {
  icon: IconComponent;
  targetType: LiquidIconTargetType;
  targetId: string;
  uiTheme: UiTheme;
  colorMode: ColorMode;
}) {
  return (
    <span data-glass-icon-well>
      <LiquidNavIcon
        fallbackIcon={icon}
        targetType={targetType}
        targetId={targetId}
        uiTheme={uiTheme}
        colorMode={colorMode}
        className="h-4 w-4"
      />
    </span>
  );
}

/**
 * Framer Motion variants for the default theme's liquid-glass sidebar.
 * Only applied when `uiTheme === "default"`; other themes render the
 * plain Fragment/primitives with no motion wrapping at all.
 */
const navContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};
const navItemVariants: Variants = {
  hidden: { x: -12, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};
const navItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.01 } },
};

/**
 * Conditional motion wrappers. Under the default theme we use Framer
 * Motion; under other themes we render an inert Fragment/div so layout
 * and behavior stay byte-identical to before the glass treatment.
 */
type StaggerContainerProps = {
  enabled: boolean;
  children: React.ReactNode;
};
function StaggerContainer({ enabled, children }: StaggerContainerProps) {
  if (!enabled) return <>{children}</>;
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={navContainerVariants}
      className="flex flex-col"
    >
      {children}
    </motion.div>
  );
}
type StaggerItemProps = {
  enabled: boolean;
  variants: Variants;
  children: React.ReactNode;
};
function StaggerItem({ enabled, variants, children }: StaggerItemProps) {
  if (!enabled) return <>{children}</>;
  return (
    <motion.div variants={variants}>{children}</motion.div>
  );
}

/** Every primary nav category — keeps the sidebar list complete (incl. Resources). */
const PRIORITY_CATEGORIES: string[] = [
  "commandCenter",
  "self",
  "relationship",
  "career",
  "goalsExecution",
  "resources",
  "knowledge",
  "learning",
];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const NAV_STAGGER_DELAY_MS = 150;
const NAV_STAGGER_CHILD_MS = 60;
const NAV_STAGGER_ITEM_MS = 300;

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );
  const localeSlug = useLocaleSlug();
  const pathWithoutLocale = stripLeadingLocaleFromPathname(pathname);
  const { setOpenMobile } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const language = useAppStore((s) => s.language);
  const { uiTheme, colorMode } = useTheme();
  const focusNavigation = useFocusNavigation();
  const footer = getSidebarFooterCopy(language);
  const tui = getThemeUiCopy(language);
  const prefersReducedMotion = useSsrSafeReducedMotion();
  const currentTime = useCurrentTime();
  // Motion wrappers only engage under the `default` theme. Other themes
  // get the plain Fragment/div fallback so their existing visuals and
  // layout are literally byte-identical to before.
  const isGlassTheme = uiTheme === "default";
  const ItemVariants = prefersReducedMotion
    ? navItemVariantsReduced
    : navItemVariants;

  const isNewUser =
    !profile?.created_at ||
    currentTime.getTime() - new Date(profile.created_at).getTime() < SEVEN_DAYS_MS;

  const { priorityCategories, secondaryCategories } = useMemo(() => {
    const focusAreas = profile?.focus_areas ?? [];
    const categoryMatchesFocus = (c: (typeof navigationCategories)[number]) =>
      focusAreas.some(
        (fa) =>
          c.categoryId === fa ||
          c.items.some((item) => item.itemId === fa) ||
          (c.categoryId === "learning" && fa === "garden")
      );
    const priority = navigationCategories.filter(
      (c) => PRIORITY_CATEGORIES.includes(c.categoryId) || categoryMatchesFocus(c)
    );
    const priorityIds = new Set(priority.map((c) => c.categoryId));
    const secondary = navigationCategories.filter((c) => !priorityIds.has(c.categoryId));
    return { priorityCategories: priority, secondaryCategories: secondary };
  }, [profile?.focus_areas]);

  const [showMore, setShowMore] = useState(!isNewUser);
  const [showCompanionPanel, setShowCompanionPanel] = useState(false);
  const toggleShowMore = useCallback(() => setShowMore((prev) => !prev), []);
  const menuItemsReady = !authLoading && (!user || !profileLoading);
  const visibleStaggerItemCount = priorityCategories.length + (showMore ? secondaryCategories.length : 0);
  const companionRevealDelayMs =
    isGlassTheme && !prefersReducedMotion
      ? NAV_STAGGER_DELAY_MS +
        Math.max(0, visibleStaggerItemCount - 1) * NAV_STAGGER_CHILD_MS +
        NAV_STAGGER_ITEM_MS
      : 0;

  useEffect(() => {
    if (!menuItemsReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- visibility mirrors async menu readiness.
      setShowCompanionPanel(false);
      return;
    }

    if (companionRevealDelayMs === 0) {
      setShowCompanionPanel(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowCompanionPanel(true);
    }, companionRevealDelayMs);

    return () => window.clearTimeout(timer);
  }, [companionRevealDelayMs, menuItemsReady]);

  const closeMobileSidebar = useCallback(() => setOpenMobile(false), [setOpenMobile]);
  const closeMobileSidebarAfterNavigation = useCallback(() => {
    window.setTimeout(() => setOpenMobile(false), 0);
  }, [setOpenMobile]);
  const handleSidebarNavigate = useCallback(
    (href: string, event: MouseEvent<HTMLElement>) => {
      if (focusNavigation?.handleLinkClick(href, event) === false) return;
      closeMobileSidebarAfterNavigation();
    },
    [closeMobileSidebarAfterNavigation, focusNavigation],
  );

  const metadataFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const metadataName =
    typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const metadataAvatar =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;
  const userName = profile?.full_name || metadataFullName || metadataName || user?.email || "User";
  const userEmail = profile?.email || user?.email || "";
  const userAvatar = profile?.avatar_url ?? metadataAvatar;
  const userInitialsSeed = userName !== "User" ? userName : userEmail;
  const userInitials =
    userInitialsSeed
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-3">
              <LifeOsLogo />
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
                {getAppDisplayName(language)}
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <StaggerContainer enabled={isGlassTheme}>
          {priorityCategories.map((category) => (
            <StaggerItem
              key={category.categoryId}
              enabled={isGlassTheme}
              variants={ItemVariants}
            >
              <CategoryGroup
                category={category}
                localeSlug={localeSlug}
                pathWithoutLocale={pathWithoutLocale}
                currentSearch={currentSearch}
                uiTheme={uiTheme}
                colorMode={colorMode}
                language={language}
                onNavigate={handleSidebarNavigate}
              />
              {category.categoryId === "learning" ? (
                <GardenNavButton
                  localeSlug={localeSlug}
                  pathWithoutLocale={pathWithoutLocale}
                  onNavigate={handleSidebarNavigate}
                  uiTheme={uiTheme}
                  colorMode={colorMode}
                  language={language}
                />
              ) : null}
            </StaggerItem>
          ))}
        </StaggerContainer>

        {secondaryCategories.length > 0 && (
          <>
            <SidebarSeparator className="my-1" />
            <div className="px-3 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground"
                onClick={toggleShowMore}
                data-focus-hideable
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`} />
                {showMore ? tui.showLess : tui.showMore}
              </Button>
            </div>
            {showMore && (
              <StaggerContainer enabled={isGlassTheme}>
                {secondaryCategories.map((category) => (
                  <StaggerItem
                    key={category.categoryId}
                    enabled={isGlassTheme}
                    variants={ItemVariants}
                  >
                    <CategoryGroup
                      category={category}
                      localeSlug={localeSlug}
                      pathWithoutLocale={pathWithoutLocale}
                      currentSearch={currentSearch}
                      uiTheme={uiTheme}
                      colorMode={colorMode}
                      language={language}
                      onNavigate={handleSidebarNavigate}
                    />
                    {category.categoryId === "learning" ? (
                      <GardenNavButton
                        localeSlug={localeSlug}
                        pathWithoutLocale={pathWithoutLocale}
                        onNavigate={handleSidebarNavigate}
                        uiTheme={uiTheme}
                        colorMode={colorMode}
                        language={language}
                      />
                    ) : null}
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </>
        )}

        {showCompanionPanel ? <TodayCompanionPanel onNavigate={handleSidebarNavigate} /> : null}
      </SidebarContent>

      <SidebarFooter className="shrink-0 group-data-[collapsible=icon]:hidden">
        <SidebarSeparator className="my-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-open:bg-sidebar-accent"
                    aria-label={`${userName} account menu`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left text-sm leading-tight">
                      <span className="font-medium truncate">{userName}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {userEmail}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                className="w-56"
                align="end"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem
                  render={<Link href={withLocalePrefix(localeSlug, "/settings")} />}
                  onClick={closeMobileSidebar}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {footer.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    closeMobileSidebar();
                    void signOut();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {footer.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

type CategoryGroupProps = {
  category: NavCategory;
  localeSlug: LocaleUrlSlug;
  pathWithoutLocale: string;
  currentSearch: Record<string, string>;
  uiTheme: UiTheme;
  colorMode: ColorMode;
  language: AppLocale;
  onNavigate: (href: string, event: MouseEvent<HTMLElement>) => void;
};

function buildHrefWithSearch(
  base: string,
  searchParams: Record<string, string> | undefined,
): string {
  if (!searchParams) return base;
  const entries = Object.entries(searchParams);
  if (entries.length === 0) return base;
  const qs = new URLSearchParams(entries).toString();
  return `${base}?${qs}`;
}

function searchParamsMatch(
  current: Record<string, string>,
  required: Record<string, string> | undefined,
): boolean {
  if (!required) return true;
  return Object.entries(required).every(([key, value]) => current[key] === value);
}

function CategoryGroup({
  category,
  localeSlug,
  pathWithoutLocale,
  currentSearch,
  uiTheme,
  colorMode,
  language,
  onNavigate,
}: CategoryGroupProps) {
  const label = getThemedCategoryLabel(category.categoryId, uiTheme, language);

  // Leaf category: the category itself is the destination — render a single
  // link row instead of a collapsible group. Avoids the "Crew Network ▶ Crew
  // Network" duplication that would otherwise appear when a category has only
  // one same-named child.
  if (category.url && category.items.length === 0) {
    const href = withLocalePrefix(localeSlug, category.url);
    const isActive =
      pathWithoutLocale === category.url ||
      pathWithoutLocale.startsWith(`${category.url}/`);
    return (
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={href} />}
              isActive={isActive}
              onClick={(event) => onNavigate(href, event)}
            >
              <IconWell
                icon={category.icon}
                targetType="category"
                targetId={category.categoryId}
                uiTheme={uiTheme}
                colorMode={colorMode}
              />
              <span className="font-semibold">{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Hybrid category: expandable AND linkable. The label opens the destination
  // page (e.g. /resources for the tabbed Resources view) while the chevron
  // independently toggles the sub-item list. Only engages when `category.url`
  // is set AND there are children.
  const isHybrid = Boolean(category.url && category.items.length > 0);

  if (isHybrid && category.url) {
    const href = withLocalePrefix(localeSlug, category.url);
    const isActive =
      pathWithoutLocale === category.url ||
      pathWithoutLocale.startsWith(`${category.url}/`);

    return (
      <SidebarGroup>
        <Collapsible defaultOpen={false} className="group/collapsible">
          <SidebarMenuItem>
            <div className="flex w-full items-center">
              <SidebarMenuButton
                render={<Link href={href} />}
                isActive={isActive}
                onClick={(event) => onNavigate(href, event)}
                className="flex-1"
              >
                <IconWell
                  icon={category.icon}
                  targetType="category"
                  targetId={category.categoryId}
                  uiTheme={uiTheme}
                  colorMode={colorMode}
                />
                <span className="font-semibold">{label}</span>
              </SidebarMenuButton>
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Toggle ${label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                }
              >
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </div>
          </SidebarMenuItem>
          <CollapsibleContent>
            <SidebarMenuSub>
              {category.items.map((item) => {
                const localizedBase = withLocalePrefix(localeSlug, item.url);
                const sublinkHref = buildHrefWithSearch(localizedBase, item.searchParams);
                const pathMatches =
                  pathWithoutLocale === item.url ||
                  pathWithoutLocale.startsWith(`${item.url}/`);
                const itemActive =
                  pathMatches && searchParamsMatch(currentSearch, item.searchParams);
                return (
                  <SidebarMenuSubItem key={item.itemId}>
                    <SidebarMenuSubButton
                      render={<Link href={sublinkHref} />}
                      isActive={itemActive}
                      onClick={(event) => onNavigate(sublinkHref, event)}
                    >
                      <IconWell
                        icon={item.icon}
                        targetType="nav_item"
                        targetId={item.itemId}
                        uiTheme={uiTheme}
                        colorMode={colorMode}
                      />
                      <span>
                        {getThemedItemLabel(item.itemId, uiTheme, language)}
                      </span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <Collapsible defaultOpen={false} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger
            render={
              <SidebarMenuButton>
                <IconWell
                  icon={category.icon}
                  targetType="category"
                  targetId={category.categoryId}
                  uiTheme={uiTheme}
                  colorMode={colorMode}
                />
                <span className="font-semibold">{label}</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            }
          />
        </SidebarMenuItem>
        <CollapsibleContent>
          <SidebarMenuSub>
            {category.items.map((item) => {
              const localizedBase = withLocalePrefix(localeSlug, item.url);
              const href = buildHrefWithSearch(localizedBase, item.searchParams);
              const pathMatches =
                pathWithoutLocale === item.url ||
                pathWithoutLocale.startsWith(`${item.url}/`);
              const isActive =
                pathMatches && searchParamsMatch(currentSearch, item.searchParams);
              return (
                <SidebarMenuSubItem key={item.itemId}>
                  <SidebarMenuSubButton
                    render={<Link href={href} />}
                    isActive={isActive}
                    onClick={(event) => onNavigate(href, event)}
                  >
                    <IconWell
                      icon={item.icon}
                      targetType="nav_item"
                      targetId={item.itemId}
                      uiTheme={uiTheme}
                      colorMode={colorMode}
                    />
                    <span>
                      {getThemedItemLabel(item.itemId, uiTheme, language)}
                    </span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

type GardenNavButtonProps = {
  localeSlug: LocaleUrlSlug;
  pathWithoutLocale: string;
  onNavigate: (href: string, event: MouseEvent<HTMLElement>) => void;
  uiTheme: UiTheme;
  colorMode: ColorMode;
  language: AppLocale;
};

function GardenNavButton({
  localeSlug,
  pathWithoutLocale,
  onNavigate,
  uiTheme,
  colorMode,
  language,
}: GardenNavButtonProps) {
  const href = withLocalePrefix(localeSlug, "/garden");
  const isActive =
    pathWithoutLocale === "/garden" || pathWithoutLocale.startsWith("/garden/");

  return (
    <SidebarGroup className="p-2 pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <Link
            href={href}
            onClick={(event) => onNavigate(href, event)}
            data-glass-garden-cta
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors",
              "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
              isActive && "ring-2 ring-emerald-400/90 ring-offset-2 ring-offset-sidebar"
            )}
          >
            <LiquidNavIcon
              fallbackIcon={Sprout}
              targetType="cta"
              targetId="garden"
              uiTheme={uiTheme}
              colorMode={colorMode}
              className="h-6 w-6"
            />
            <span>{getThemedItemLabel("garden", uiTheme, language)}</span>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
