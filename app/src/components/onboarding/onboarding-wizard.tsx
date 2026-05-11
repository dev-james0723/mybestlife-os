"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";
import { settingsRepository } from "@/lib/repositories/settings";
import { requestDeviceGeolocation } from "@/lib/weather/openweather";
import { useAppStore } from "@/stores/app-store";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { Step1Welcome } from "./step-1-welcome";
import { Step2Theme } from "./step-2-theme";
import { Step3FocusAreas } from "./step-3-focus-areas";
import { Step4Goals } from "./step-4-goals";
import { Step5BlockMinutes } from "./step-5-block-minutes";
import { Step6QuickTasks } from "./step-6-quick-tasks";
import { Step7Ready } from "./step-7-ready";
import type { UiTheme, BlockMinutesOption, QuickTaskDef } from "@/types/database";
import {
  getOnboardingSaveErrorHint,
  logSupabaseClientError,
} from "@/lib/utils/onboarding-save-error-hint";

const TOTAL_STEPS = 7;

type OnboardingWizardProps = {
  onComplete?: () => void;
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const dashboardHref = useLocalizedPath("/dashboard");
  const queryClient = useQueryClient();
  const { setUiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getThemeUiCopy(language), [language]);
  const [step, setStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState<UiTheme>("default");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [goalName, setGoalName] = useState("");
  const [blockMinutes, setBlockMinutes] = useState<BlockMinutesOption>(10);
  const [quickTasks, setQuickTasks] = useState<QuickTaskDef[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  /** Prevents double-tap before React re-renders `disabled` on the button (stacked toasts). */
  const completingRef = useRef(false);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handleThemeSelect = useCallback(
    (theme: UiTheme) => {
      setSelectedTheme(theme);
      setUiTheme(theme);
    },
    [setUiTheme]
  );

  const handleComplete = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setIsCompleting(true);
    try {
      const deviceCoords = await requestDeviceGeolocation();
      // Avoid useUpdateProfile here: its onError toast would stack with our copy on failure.
      await settingsRepository.updateProfile({
        ...(deviceCoords
          ? {
              weather_lat: deviceCoords.lat,
              weather_lon: deviceCoords.lon,
              weather_city: null,
            }
          : {}),
        ui_theme: selectedTheme,
        focus_areas: focusAreas,
        block_minutes: blockMinutes,
        quick_tasks: quickTasks.length > 0 ? quickTasks : null,
        onboarding_completed: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      onComplete?.();
      router.push(dashboardHref);
    } catch (e) {
      logSupabaseClientError("[onboarding] updateProfile failed", e);
      const hint = getOnboardingSaveErrorHint(e, ui);
      if (hint) {
        toast.error(ui.onboardingSaveFailed, { description: hint });
      } else {
        toast.error(ui.onboardingSaveFailed);
      }
    } finally {
      completingRef.current = false;
      setIsCompleting(false);
    }
  }, [
    selectedTheme,
    focusAreas,
    blockMinutes,
    quickTasks,
    onComplete,
    router,
    dashboardHref,
    queryClient,
    ui,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/95 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4">
        <div className="mb-6 flex justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl sm:p-8">
          {step === 1 && <Step1Welcome onNext={next} ui={ui} />}
          {step === 2 && (
            <Step2Theme
              selected={selectedTheme}
              onSelect={handleThemeSelect}
              onNext={next}
              onBack={prev}
              locale={language}
              ui={ui}
            />
          )}
          {step === 3 && (
            <Step3FocusAreas
              selected={focusAreas}
              onChange={setFocusAreas}
              onNext={next}
              onBack={prev}
              ui={ui}
            />
          )}
          {step === 4 && (
            <Step4Goals
              goalName={goalName}
              onGoalNameChange={setGoalName}
              onNext={next}
              onBack={prev}
              ui={ui}
            />
          )}
          {step === 5 && (
            <Step5BlockMinutes
              selected={blockMinutes}
              onSelect={setBlockMinutes}
              onNext={next}
              onBack={prev}
              ui={ui}
            />
          )}
          {step === 6 && (
            <Step6QuickTasks
              tasks={quickTasks}
              onChange={setQuickTasks}
              onNext={next}
              onBack={prev}
              ui={ui}
            />
          )}
          {step === 7 && (
            <Step7Ready
              onComplete={handleComplete}
              onBack={prev}
              isCompleting={isCompleting}
              ui={ui}
            />
          )}
        </div>
      </div>
    </div>
  );
}
