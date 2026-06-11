"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  Globe,
  Info,
  Moon,
  RotateCcw,
  Share2,
  Shield,
  SlidersHorizontal,
  Sun,
  Tag,
  Type,
  User,
  MapPin,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGoogleCalendarPlannerStatus } from "@/hooks/use-google-calendar-planner";
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
import { Button } from "@/components/ui/button";
import {
  OSControl,
  OSPrimaryAction,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useFocusPreferences,
  useUpdateFocusPreferences,
} from "@/hooks/use-focus-preferences";
import { ProfileAvatarField } from "@/components/settings/profile-avatar-field";
import { SocialIntegrationsSection } from "@/components/settings/social-integrations-section";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { WallpaperSwitcher } from "@/components/liquid-glass/wallpaper-picker";
import { IconPackSwitcher } from "@/components/settings/icon-pack-switcher";
import { VoiceSpeechSection } from "@/components/settings/voice-speech-section";
import { OSBuddySettingsSection } from "@/components/settings/os-buddy-settings-section";
import type {
  UserProfile,
  BlockMinutesOption,
  QuickSaveDefaultDestination,
} from "@/types/database";
import {
  APP_LOCALES,
  LOCALE_FLAG_EMOJI,
  LOCALE_SELECT_LABELS,
  parseAppLocale,
} from "@/lib/i18n/app-locale";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
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
  const searchParams = useSearchParams();
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
  const { data: gcalStatus, refetch: refetchGcal } = useGoogleCalendarPlannerStatus();
  const { data: focusPreferences } = useFocusPreferences();
  const updateFocusPreferences = useUpdateFocusPreferences();
  const [googleCalendarBusy, setGoogleCalendarBusy] = useState(false);

  const locale = useAppStore((s) => s.language);
  const setAppLanguage = useAppStore((s) => s.setLanguage);
  const { colorMode, setColorMode } = useTheme();
  const ui = useMemo(() => getSettingsUiCopy(locale), [locale]);
  const tui = useMemo(() => getThemeUiCopy(locale), [locale]);
  const focusUi = useMemo(() => getDailyPlannerUiCopy(locale), [locale]);

  const [language, setLanguage] = useState<UserProfile["language"]>("en");
  const [timezone, setTimezone] = useState(PROFILE_TIMEZONE_AUTO);
  const [motto, setMotto] = useState("");
  const [fontSizePref, setFontSizePref] = useState<UserProfile["font_size_pref"]>("medium");
  const [greetingTone, setGreetingTone] = useState<UserProfile["greeting_tone"]>("friendly");
  const [blockMinutes, setBlockMinutes] = useState<BlockMinutesOption>(10);
  const [blockMinutesChanged, setBlockMinutesChanged] = useState(false);
  const [weatherLocationBusy, setWeatherLocationBusy] = useState(false);
  const [quickSaveEnabled, setQuickSaveEnabled] = useState(false);
  const [quickSaveDestination, setQuickSaveDestination] =
    useState<QuickSaveDefaultDestination>("review");
  const [quickSaveRequireReview, setQuickSaveRequireReview] = useState(true);
  const [lowStimulationModeEnabled, setLowStimulationModeEnabled] = useState(true);
  const [distractionGateEnabled, setDistractionGateEnabled] = useState(true);
  const [urgeSurfingDelaySeconds, setUrgeSurfingDelaySeconds] = useState("10");
  const [defaultFocusMinutes, setDefaultFocusMinutes] = useState("50");
  const [breakReminderMinutes, setBreakReminderMinutes] = useState("50");
  const [aiAccessRequiresIntention, setAiAccessRequiresIntention] = useState(true);
  const [showActualTimelineOverlay, setShowActualTimelineOverlay] = useState(true);
  const [highStimulationRoutesText, setHighStimulationRoutesText] = useState("");

  useEffect(() => {
    if (!profile) return;
    startTransition(() => {
      setLanguage(profile.language);
      setTimezone(profile.timezone?.trim() || PROFILE_TIMEZONE_AUTO);
      setMotto(profile.motto ?? "");
      setFontSizePref(profile.font_size_pref);
      setGreetingTone(profile.greeting_tone);
      setBlockMinutes(profile.block_minutes ?? 10);
      setBlockMinutesChanged(false);
      setQuickSaveEnabled(profile.quick_save_enabled);
      setQuickSaveDestination(profile.quick_save_default_destination);
      setQuickSaveRequireReview(profile.quick_save_require_review);
    });
  }, [profile]);

  useEffect(() => {
    if (!focusPreferences) return;
    startTransition(() => {
      setLowStimulationModeEnabled(focusPreferences.low_stimulation_mode_enabled);
      setDistractionGateEnabled(focusPreferences.distraction_gate_enabled);
      setUrgeSurfingDelaySeconds(String(focusPreferences.urge_surfing_delay_seconds));
      setDefaultFocusMinutes(String(focusPreferences.default_focus_minutes));
      setBreakReminderMinutes(String(focusPreferences.break_reminder_minutes));
      setAiAccessRequiresIntention(focusPreferences.ai_access_requires_intention);
      setShowActualTimelineOverlay(focusPreferences.show_actual_timeline_overlay);
      setHighStimulationRoutesText(focusPreferences.high_stimulation_routes.join("\n"));
    });
  }, [focusPreferences]);

  const tzList = useMemo(() => timezoneChoices(profile?.timezone), [profile?.timezone]);

  const colorModeOptions = useMemo(
    () =>
      [
        { value: "light" as const, label: tui.dayMode, icon: Sun },
        { value: "dark" as const, label: tui.nightMode, icon: Moon },
      ] as const,
    [tui.dayMode, tui.nightMode]
  );
  const colorModeItems = useMemo(
    () =>
      colorModeOptions.map(({ value, label, icon }) => ({
        id: value,
        label,
        icon,
      })),
    [colorModeOptions],
  );
  const blockMinuteItems = useMemo(
    () =>
      ([5, 10, 15, 20, 30] as const).map((mins) => ({
        id: String(mins),
        label: `${mins} ${ui.blockMinutesUnit}`,
      })),
    [ui.blockMinutesUnit],
  );
  const fontSizeItems = useMemo(
    () =>
      [
        { id: "small" as const, label: tui.fontSizeSmall },
        { id: "medium" as const, label: tui.fontSizeMedium },
        { id: "large" as const, label: tui.fontSizeLarge },
      ],
    [tui.fontSizeSmall, tui.fontSizeMedium, tui.fontSizeLarge],
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

  const handleSaveQuickSave = async () => {
    await updateProfile.mutateAsync({
      quick_save_enabled: quickSaveEnabled,
      quick_save_default_destination: quickSaveDestination,
      quick_save_require_review: quickSaveRequireReview,
    });
  };

  const handleSaveFocusPreferences = async () => {
    const routes = highStimulationRoutesText
      .split(/[\n,]/)
      .map((route) => route.trim())
      .filter(Boolean);
    await updateFocusPreferences.mutateAsync({
      low_stimulation_mode_enabled: lowStimulationModeEnabled,
      distraction_gate_enabled: distractionGateEnabled,
      urge_surfing_delay_seconds: Math.max(0, Math.round(Number(urgeSurfingDelaySeconds) || 0)),
      default_focus_minutes: Math.max(5, Math.round(Number(defaultFocusMinutes) || 50)),
      break_reminder_minutes: Math.max(5, Math.round(Number(breakReminderMinutes) || 50)),
      ai_access_requires_intention: aiAccessRequiresIntention,
      show_actual_timeline_overlay: showActualTimelineOverlay,
      high_stimulation_routes: routes,
    });
    toast.success(ui.toastPreferencesSaved);
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

  const handleGoogleCalendarConnect = (opts?: { switchAccount?: boolean }) => {
    const q = new URLSearchParams();
    q.set("returnTo", pathname);
    if (opts?.switchAccount) q.set("switchAccount", "1");
    window.location.href = `/api/google/calendar/connect?${q.toString()}`;
  };

  const handleGoogleCalendarDisconnect = async () => {
    setGoogleCalendarBusy(true);
    try {
      const res = await fetch("/api/google/calendar/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await refetchGcal();
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-planner-status"] });
      toast.success(ui.googleCalendarDisconnectedToast);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui.googleCalendarConnectFailed);
    } finally {
      setGoogleCalendarBusy(false);
    }
  };

  const handleGoogleCalendarSyncNow = async () => {
    setGoogleCalendarBusy(true);
    try {
      const res = await fetch("/api/google/calendar/sync-now", {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "sync_failed");
      await refetchGcal();
      toast.success(ui.googleCalendarSyncNowToast);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui.googleCalendarConnectFailed);
    } finally {
      setGoogleCalendarBusy(false);
    }
  };

  const handleGoogleCalendarTogglePause = async () => {
    if (!gcalStatus?.connected) return;
    setGoogleCalendarBusy(true);
    try {
      const res = await fetch("/api/google/calendar/sync-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ syncEnabled: !gcalStatus.syncEnabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refetchGcal();
      toast.success(ui.googleCalendarPreferencesSavedToast);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui.googleCalendarConnectFailed);
    } finally {
      setGoogleCalendarBusy(false);
    }
  };

  useEffect(() => {
    const ok = searchParams.get("google_cal");
    const err = searchParams.get("google_cal_err");
    if (ok !== "connected" && !err) return;

    let cancelled = false;
    void (async () => {
      if (ok === "connected") {
        await queryClient.invalidateQueries({ queryKey: ["google-calendar-planner-status"] });
        const res = await refetchGcal();
        if (!cancelled && res.isError) {
          toast.error(
            `${ui.googleCalendarConnectFailed}: ${res.error instanceof Error ? res.error.message : String(res.error)}`,
            { id: "gcal-settings-oauth" },
          );
        } else if (!cancelled) {
          toast.success(ui.googleCalendarConnectedToast, { id: "gcal-settings-oauth" });
        }
      } else if (err && !cancelled) {
        toast.error(`${ui.googleCalendarConnectFailed}: ${err}`, { id: "gcal-settings-oauth" });
      }
      if (!cancelled) {
        router.replace(pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refetchGcal, queryClient, ui.googleCalendarConnectedToast, ui.googleCalendarConnectFailed]);

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
              <OSControl
                type="button"
                variant="secondary"
                onClick={() => {
                  void refetchProfile();
                  void refetchNotifications();
                }}
              >
                {ui.settingsRetry}
              </OSControl>
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
      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <ThemeSwitcher />
          <WallpaperSwitcher />
          <IconPackSwitcher />
          <VoiceSpeechSection />
          <OSBuddySettingsSection />
        </div>

        <div className="min-w-0 space-y-6">
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
              <OSSegmentedControl
                items={colorModeItems}
                value={colorMode}
                onValueChange={setColorMode}
                ariaLabel={tui.dayNightMode}
                className="w-full max-w-md [&>button]:flex-1"
                layoutId="settings-color-mode-active-pill"
              />
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
                <OSControl
                  type="button"
                  size="sm"
                  osSize="compact"
                  className="shrink-0"
                  disabled={weatherLocationBusy}
                  onClick={() => void handleWeatherLocationFromDevice()}
                >
                  {weatherLocationBusy ? ui.weatherLocationSaving : ui.weatherLocationUseDevice}
                </OSControl>
              </div>
            </FieldRow>

            <Separator />
            <FieldRow icon={Clock} label={ui.blockMinutesLabel}>
              <OSSegmentedControl
                items={blockMinuteItems}
                value={String(blockMinutes)}
                onValueChange={(value) => {
                  const mins = Number(value) as BlockMinutesOption;
                  setBlockMinutesChanged(mins !== (profile?.block_minutes ?? 10));
                  setBlockMinutes(mins);
                }}
                ariaLabel={ui.blockMinutesLabel}
                className="w-full max-w-md [&>button]:flex-1"
                layoutId="settings-block-minutes-active-pill"
              />
              {blockMinutesChanged && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {ui.blockMinutesNextDayWarning}
                </p>
              )}
            </FieldRow>

            <Separator />
            <div className="flex justify-end">
              <OSPrimaryAction onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? ui.saving : ui.savePreferences}
              </OSPrimaryAction>
            </div>
          </CardContent>
          </Card>

          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <CardTitle>{focusUi.focusRealityTitle}</CardTitle>
                <CardDescription>{focusUi.focusPrivacyNote}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{focusUi.lowStimulationMode}</p>
              </div>
              <Checkbox
                checked={lowStimulationModeEnabled}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setLowStimulationModeEnabled(checked);
                }}
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{focusUi.distractionGate}</p>
              </div>
              <Checkbox
                checked={distractionGateEnabled}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setDistractionGateEnabled(checked);
                }}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldRow icon={Shield} label={focusUi.urgeSurfing}>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={urgeSurfingDelaySeconds}
                  onChange={(event) => setUrgeSurfingDelaySeconds(event.target.value)}
                  className="max-w-md tabular-nums"
                />
              </FieldRow>
              <FieldRow icon={Clock} label={focusUi.deepWorkLabel}>
                <Input
                  type="number"
                  min={5}
                  inputMode="numeric"
                  value={defaultFocusMinutes}
                  onChange={(event) => setDefaultFocusMinutes(event.target.value)}
                  className="max-w-md tabular-nums"
                />
              </FieldRow>
              <FieldRow icon={Clock} label={focusUi.breaksLabel}>
                <Input
                  type="number"
                  min={5}
                  inputMode="numeric"
                  value={breakReminderMinutes}
                  onChange={(event) => setBreakReminderMinutes(event.target.value)}
                  className="max-w-md tabular-nums"
                />
              </FieldRow>
            </div>

            <FieldRow icon={Shield} label={focusUi.blockedRoutes}>
              <Textarea
                value={highStimulationRoutesText}
                onChange={(event) => setHighStimulationRoutesText(event.target.value)}
                placeholder={focusUi.blockedRoutesPlaceholder}
                rows={5}
                className="max-w-md"
              />
            </FieldRow>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{focusUi.aiAccessRequiresIntention}</p>
              </div>
              <Checkbox
                checked={aiAccessRequiresIntention}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setAiAccessRequiresIntention(checked);
                }}
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">{focusUi.actualTimeline}</p>
              </div>
              <Checkbox
                checked={showActualTimelineOverlay}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setShowActualTimelineOverlay(checked);
                }}
              />
            </label>

            <Separator />
            <div className="flex justify-end">
              <OSPrimaryAction
                type="button"
                onClick={() => void handleSaveFocusPreferences()}
                disabled={updateFocusPreferences.isPending}
              >
                {updateFocusPreferences.isPending ? ui.saving : ui.savePreferences}
              </OSPrimaryAction>
            </div>
          </CardContent>
          </Card>

          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>快捷儲存 / Quick Save</CardTitle>
                <CardDescription>
                  用手機的分享功能，將連結、文字、圖片或檔案快速儲存到 Knowledge Base 或
                  Idea Capture。
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">開啟快捷儲存</p>
                <p className="text-xs text-muted-foreground">
                  This enables Quick Save for your account. The phone Share Sheet target appears
                  only after the PWA is installed.
                </p>
              </div>
              <Checkbox
                checked={quickSaveEnabled}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setQuickSaveEnabled(checked);
                }}
              />
            </label>

            <FieldRow icon={Share2} label="預設儲存位置 / Default destination">
              <Select
                value={quickSaveDestination}
                onValueChange={(v) => {
                  if (v === "review" || v === "knowledge" || v === "idea") {
                    setQuickSaveDestination(v);
                  }
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="review">Ask every time / Review first</SelectItem>
                  <SelectItem value="knowledge">Knowledge Base</SelectItem>
                  <SelectItem value="idea">Idea Capture</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <p className="font-medium">每次儲存前先讓我確認</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, shared content opens a lightweight review screen before saving.
                </p>
              </div>
              <Checkbox
                checked={quickSaveRequireReview}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") setQuickSaveRequireReview(checked);
                }}
              />
            </label>

            <Separator />

            <div className="space-y-2 rounded-lg border bg-muted/25 p-3 text-sm">
              <p className="font-medium">Setup instructions</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Open My Best Life OS on your phone</li>
                <li>Add it to Home Screen / Install app</li>
                <li>
                  Then use Share → My Best Life OS from apps like X, Instagram, Facebook,
                  Safari, Chrome, etc.
                </li>
              </ol>
            </div>

            <div className="flex justify-end">
              <OSPrimaryAction
                type="button"
                onClick={() => void handleSaveQuickSave()}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? ui.saving : "Save Quick Save"}
              </OSPrimaryAction>
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
            {gcalStatus?.connected ? (
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm space-y-1">
                <p className="font-medium text-foreground">
                  {gcalStatus.email
                    ? `${ui.googleCalendarTitle}: ${gcalStatus.email}`
                    : ui.googleCalendarTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {gcalStatus.syncEnabled ? "Sync enabled" : "Sync paused"} · Pending:{" "}
                  {gcalStatus.pendingCount} · Errors: {gcalStatus.errorCount} · Conflicts:{" "}
                  {gcalStatus.conflictCount} · Removed in Google: {gcalStatus.remoteDeletedCount}
                </p>
                {gcalStatus.watchExpiration ? (
                  <p className="text-[11px] text-muted-foreground">
                    Webhook channel expires: {new Date(gcalStatus.watchExpiration).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not connected — timed tasks stay local only.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {gcalStatus?.connected ? (
                <>
                  <OSControl
                    type="button"
                    variant="secondary"
                    disabled
                    className="cursor-default opacity-90"
                  >
                    {ui.googleCalendarConnectedButton}
                  </OSControl>
                  <OSControl
                    type="button"
                    disabled={googleCalendarBusy}
                    onClick={() => handleGoogleCalendarConnect({ switchAccount: true })}
                  >
                    {ui.googleCalendarSwitchAccount}
                  </OSControl>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={googleCalendarBusy}
                    onClick={() => void handleGoogleCalendarDisconnect()}
                  >
                    {ui.googleCalendarDisconnect}
                  </Button>
                </>
              ) : (
                <OSPrimaryAction
                  type="button"
                  onClick={() => handleGoogleCalendarConnect()}
                  disabled={googleCalendarBusy}
                >
                  {googleCalendarBusy ? ui.googleCalendarConnecting : ui.googleCalendarConnect}
                </OSPrimaryAction>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {gcalStatus?.connected ? (
                <>
                  <OSControl
                    type="button"
                    disabled={googleCalendarBusy}
                    onClick={() => void handleGoogleCalendarSyncNow()}
                  >
                    {ui.googleCalendarSyncNow}
                  </OSControl>
                  <OSControl
                    type="button"
                    disabled={googleCalendarBusy}
                    onClick={() => void handleGoogleCalendarTogglePause()}
                  >
                    {gcalStatus.syncEnabled ? ui.googleCalendarPauseSync : ui.googleCalendarResumeSync}
                  </OSControl>
                </>
              ) : null}
              <OSControl render={<Link href={dailyPlannerHref} />} className="inline-flex no-underline">
                {ui.googleCalendarGoPlanner}
              </OSControl>
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
              <OSSegmentedControl
                items={fontSizeItems}
                value={fontSizePref}
                onValueChange={setFontSizePref}
                ariaLabel={tui.fontSizeLabel}
                className="w-full max-w-md [&>button]:flex-1"
                layoutId="settings-font-size-active-pill"
              />
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
              <OSControl
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => void handleRestartOnboarding()}
                disabled={updateProfile.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {tui.restartOnboarding}
              </OSControl>
              <OSPrimaryAction onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? ui.saving : ui.savePreferences}
              </OSPrimaryAction>
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
      </div>
    </PageShell>
  );
}
