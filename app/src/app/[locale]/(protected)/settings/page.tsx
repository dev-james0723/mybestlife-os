"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  Globe,
  Info,
  Moon,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sun,
  Tag,
  Type,
  User,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useProfile,
  useUpdateProfile,
  useUploadProfileAvatar,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-settings";
import { ProfileAvatarField } from "@/components/settings/profile-avatar-field";
import { SocialIntegrationsSection } from "@/components/settings/social-integrations-section";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import type { UserProfile, BlockMinutesOption } from "@/types/database";
import {
  APP_LOCALES,
  LOCALE_FLAG_EMOJI,
  LOCALE_SELECT_LABELS,
  parseAppLocale,
} from "@/lib/i18n/app-locale";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/constants/app-meta";
import { settingsRepository } from "@/lib/repositories/settings";
import { requestDeviceGeolocation } from "@/lib/weather/openweather";
import { getAppDisplayName } from "@/lib/i18n/app-brand";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { replacePathnameLocaleSlug } from "@/lib/i18n/locale-path";
import { appLocaleToUrlSlug } from "@/lib/i18n/locale-slug";

const languageOptions = APP_LOCALES.map((value) => ({
  value,
  label: LOCALE_SELECT_LABELS[value],
}));

/** Stored in `profiles.timezone`; UI uses device tz via `Intl` when this is set. */
const PROFILE_TIMEZONE_AUTO = "auto";

const timezoneOptions = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function timezoneChoices(profileTz: string | undefined) {
  const set = new Set(timezoneOptions);
  const tz = profileTz?.trim();
  if (tz && tz !== PROFILE_TIMEZONE_AUTO) set.add(tz);
  const iana = [...set].sort((a, b) => a.localeCompare(b));
  return [PROFILE_TIMEZONE_AUTO, ...iana];
}

function timezoneSelectLabel(tz: string, automaticLabel: string) {
  return tz === PROFILE_TIMEZONE_AUTO ? automaticLabel : tz;
}

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Label>{label}</Label>
      </div>
      {children}
    </div>
  );
}

function formatPinnedWeatherLocation(profile: UserProfile | undefined): string {
  if (!profile) return "";
  if (profile.weather_city?.trim()) return profile.weather_city.trim();
  if (profile.weather_lat != null && profile.weather_lon != null) {
    return `${profile.weather_lat.toFixed(2)}, ${profile.weather_lon.toFixed(2)}`;
  }
  return "";
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const dailyPlannerHref = useLocalizedPath("/daily-planner");
  const privacyHref = useLocalizedPath("/privacy");
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadProfileAvatar();
  const {
    data: notifications,
    isLoading: notifLoading,
    isError: notifError,
    refetch: refetchNotifications,
  } = useNotificationPreferences();
  const updateNotifications = useUpdateNotificationPreferences();
  const { startGoogleCalendarAccessFlow } = useAuth();
  const [googleCalendarBusy, setGoogleCalendarBusy] = useState(false);

  const locale = useAppStore((s) => s.language);
  const setAppLanguage = useAppStore((s) => s.setLanguage);
  const { colorMode, setColorMode } = useTheme();
  const ui = useMemo(() => getSettingsUiCopy(locale), [locale]);
  const tui = useMemo(() => getThemeUiCopy(locale), [locale]);

  const [language, setLanguage] = useState<UserProfile["language"]>("en");
  const [theme, setTheme] = useState<UserProfile["theme"]>("light");
  const [timezone, setTimezone] = useState(PROFILE_TIMEZONE_AUTO);
  const [motto, setMotto] = useState("");
  const [fontSizePref, setFontSizePref] = useState<UserProfile["font_size_pref"]>("medium");
  const [greetingTone, setGreetingTone] = useState<UserProfile["greeting_tone"]>("friendly");
  const [blockMinutes, setBlockMinutes] = useState<BlockMinutesOption>(10);
  const [blockMinutesChanged, setBlockMinutesChanged] = useState(false);
  const [weatherLocationBusy, setWeatherLocationBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setLanguage(profile.language);
    setTheme(profile.theme);
    setTimezone(profile.timezone?.trim() || PROFILE_TIMEZONE_AUTO);
    setMotto(profile.motto ?? "");
    setFontSizePref(profile.font_size_pref);
    setGreetingTone(profile.greeting_tone);
    setBlockMinutes(profile.block_minutes ?? 10);
    setBlockMinutesChanged(false);
  }, [profile]);

  const tzList = useMemo(() => timezoneChoices(profile?.timezone), [profile?.timezone]);

  const colorModeOptions = useMemo(
    () =>
      [
        { value: "light" as const, label: tui.dayMode, icon: Sun },
        { value: "dark" as const, label: tui.nightMode, icon: Moon },
      ] as const,
    [tui.dayMode, tui.nightMode]
  );

  const handleSaveProfile = async () => {
    const saved = await updateProfile.mutateAsync({
      language,
      // Keep legacy `theme` in sync with the day/night control (context), not only the stale form state.
      theme: colorMode,
      timezone,
      color_mode: colorMode,
      motto: motto || null,
      font_size_pref: fontSizePref,
      greeting_tone: greetingTone,
      block_minutes: blockMinutes,
    });
    const nextLocale = parseAppLocale(saved.language);
    setAppLanguage(nextLocale);
    router.replace(replacePathnameLocaleSlug(pathname, appLocaleToUrlSlug(nextLocale)));
  };

  const handleRestartOnboarding = async () => {
    await updateProfile.mutateAsync({ onboarding_completed: false });
    window.location.reload();
  };

  const handleNotifChange = async (
    key: "task_reminders" | "daily_summary" | "study_streak_reminders",
    checked: boolean
  ) => {
    await updateNotifications.mutateAsync({ [key]: checked });
  };

  const handleWeatherLocationFromDevice = async () => {
    setWeatherLocationBusy(true);
    try {
      const c = await requestDeviceGeolocation();
      if (!c) {
        toast.error(ui.weatherLocationDeniedOrUnavailable);
        return;
      }
      await settingsRepository.updateProfile({
        weather_lat: c.lat,
        weather_lon: c.lon,
        weather_city: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(ui.weatherLocationSaved);
    } catch {
      toast.error(ui.toastPreferencesFailed);
    } finally {
      setWeatherLocationBusy(false);
    }
  };

  const handleGoogleCalendarConnect = async () => {
    setGoogleCalendarBusy(true);
    try {
      await startGoogleCalendarAccessFlow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui.googleCalendarConnectFailed);
    } finally {
      setGoogleCalendarBusy(false);
    }
  };

  if (profileLoading || notifLoading) return <LoadingPage />;

  const loadFailed = profileError || notifError || !profile || !notifications;
  if (loadFailed) {
    return (
      <PageShell title={ui.pageTitle} description={ui.pageDescription}>
        <div className="max-w-2xl">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle>{ui.settingsLoadErrorTitle}</CardTitle>
              <CardDescription>{ui.settingsLoadErrorDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void refetchProfile();
                  void refetchNotifications();
                }}
              >
                {ui.settingsRetry}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
      preHeader={
        <div className="flex justify-center -mb-2">
          <ProfileAvatarField profile={profile} ui={ui} uploadAvatar={uploadAvatar} />
        </div>
      }
    >
      <div className="space-y-6 max-w-2xl">
        <ThemeSwitcher />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{ui.userPreferencesTitle}</CardTitle>
                <CardDescription>{ui.userPreferencesDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldRow icon={Globe} label={ui.languageLabel}>
              <Select
                value={language}
                onValueChange={(v) => {
                  if (v !== null) setLanguage(parseAppLocale(v));
                }}
                itemToStringLabel={(v) => LOCALE_SELECT_LABELS[parseAppLocale(String(v))]}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue>
                    {(val) => {
                      const loc = parseAppLocale(String(val));
                      return (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="text-lg leading-none shrink-0" aria-hidden>
                            {LOCALE_FLAG_EMOJI[loc]}
                          </span>
                          <span className="truncate">{LOCALE_SELECT_LABELS[loc]}</span>
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none" aria-hidden>
                          {LOCALE_FLAG_EMOJI[o.value]}
                        </span>
                        <span>{o.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow icon={Sun} label={tui.dayNightMode}>
              <div className="flex gap-2">
                {colorModeOptions.map(({ value, label, icon: ModeIcon }) => (
                  <Button
                    key={value}
                    variant={colorMode === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setColorMode(value)}
                    className="gap-2"
                  >
                    <ModeIcon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </FieldRow>

            <FieldRow icon={Clock} label={ui.timezoneLabel}>
              <Select
                value={timezone}
                onValueChange={(v) => {
                  if (v !== null) setTimezone(v);
                }}
                itemToStringLabel={(v) =>
                  timezoneSelectLabel(String(v), ui.timezoneAutomatic)
                }
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue>
                    {(val) => timezoneSelectLabel(String(val), ui.timezoneAutomatic)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tzList.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {timezoneSelectLabel(tz, ui.timezoneAutomatic)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow icon={MapPin} label={ui.weatherLocationTitle}>
              <p className="text-xs text-muted-foreground max-w-md">
                {ui.weatherLocationDescription}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between max-w-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">{ui.weatherLocationCurrent}: </span>
                  <span className="font-medium tabular-nums">
                    {formatPinnedWeatherLocation(profile) || ui.weatherLocationNotSet}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={weatherLocationBusy}
                  onClick={() => void handleWeatherLocationFromDevice()}
                >
                  {weatherLocationBusy ? ui.weatherLocationSaving : ui.weatherLocationUseDevice}
                </Button>
              </div>
            </FieldRow>

            <Separator />
            <FieldRow icon={Clock} label={ui.blockMinutesLabel}>
              <div className="flex flex-wrap gap-2">
                {([5, 10, 15, 20, 30] as const).map((mins) => (
                  <Button
                    key={mins}
                    variant={blockMinutes === mins ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (mins !== (profile?.block_minutes ?? 10)) {
                        setBlockMinutesChanged(true);
                      } else {
                        setBlockMinutesChanged(false);
                      }
                      setBlockMinutes(mins);
                    }}
                  >
                    {mins} {ui.blockMinutesUnit}
                  </Button>
                ))}
              </div>
              {blockMinutesChanged && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {ui.blockMinutesNextDayWarning}
                </p>
              )}
            </FieldRow>

            <Separator />
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? ui.saving : ui.savePreferences}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{ui.notificationsTitle}</CardTitle>
                <CardDescription>{ui.notificationsDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{ui.taskRemindersTitle}</p>
                <p className="text-xs text-muted-foreground">{ui.taskRemindersDescription}</p>
              </div>
              <Checkbox
                checked={notifications?.task_reminders ?? false}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    void handleNotifChange("task_reminders", checked);
                  }
                }}
                disabled={updateNotifications.isPending}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{ui.dailySummaryTitle}</p>
                <p className="text-xs text-muted-foreground">{ui.dailySummaryDescription}</p>
              </div>
              <Checkbox
                checked={notifications?.daily_summary ?? false}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    void handleNotifChange("daily_summary", checked);
                  }
                }}
                disabled={updateNotifications.isPending}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{ui.studyStreakTitle}</p>
                <p className="text-xs text-muted-foreground">{ui.studyStreakDescription}</p>
              </div>
              <Checkbox
                checked={notifications?.study_streak_reminders ?? false}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    void handleNotifChange("study_streak_reminders", checked);
                  }
                }}
                disabled={updateNotifications.isPending}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{ui.googleCalendarTitle}</CardTitle>
                <CardDescription>{ui.googleCalendarDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{ui.googleCalendarPlannerBlurb}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleGoogleCalendarConnect()}
                disabled={googleCalendarBusy}
              >
                {googleCalendarBusy ? ui.googleCalendarConnecting : ui.googleCalendarConnect}
              </Button>
              <Link
                href={dailyPlannerHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "inline-flex no-underline",
                )}
              >
                {ui.googleCalendarGoPlanner}
              </Link>
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/25 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{ui.googleCalendarSetupTitle}</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>{ui.googleCalendarSetupStepSupabase}</li>
                <li>{ui.googleCalendarSetupStepGoogleCloud}</li>
                <li>{ui.googleCalendarSetupStepConsent}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{tui.personalizationTitle}</CardTitle>
                <CardDescription>{tui.personalizationDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldRow icon={Type} label={tui.mottoLabel}>
              <Input
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder={tui.mottoPlaceholder}
                maxLength={80}
                className="max-w-md"
              />
            </FieldRow>

            <FieldRow icon={Type} label={tui.fontSizeLabel}>
              <div className="flex gap-2">
                {([
                  { value: "small" as const, label: tui.fontSizeSmall },
                  { value: "medium" as const, label: tui.fontSizeMedium },
                  { value: "large" as const, label: tui.fontSizeLarge },
                ]).map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={fontSizePref === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontSizePref(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </FieldRow>

            <FieldRow icon={Type} label={tui.greetingToneLabel}>
              <Select
                value={greetingTone}
                onValueChange={(v) => {
                  if (v) setGreetingTone(v as UserProfile["greeting_tone"]);
                }}
                itemToStringLabel={(v) => String(v)}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([
                    { value: "friendly" as const, label: tui.greetingToneFriendly },
                    { value: "motivational" as const, label: tui.greetingToneMotivational },
                    { value: "minimal" as const, label: tui.greetingToneMinimal },
                    { value: "poetic" as const, label: tui.greetingTonePoetic },
                  ]).map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <Separator />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => void handleRestartOnboarding()}
                disabled={updateProfile.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {tui.restartOnboarding}
              </Button>
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? ui.saving : ui.savePreferences}
              </Button>
            </div>
          </CardContent>
        </Card>

        <SocialIntegrationsSection />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{ui.aboutSectionTitle}</CardTitle>
                <CardDescription>{ui.aboutSectionDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-base font-semibold tracking-tight">
                {getAppDisplayName(locale)}
              </p>
            </div>

            <Link
              href={privacyHref}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{ui.privacyPolicyLink}</p>
                  <p className="text-xs text-muted-foreground">{ui.privacyPolicyHint}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-medium">{ui.versionLabel}</span>
              </div>
              <span className="tabular-nums text-muted-foreground">{APP_VERSION}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
