"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type MouseEvent,
  type ReactNode,
} from "react";

import { DistractionGateDialog } from "@/components/daily-planner/focus/distraction-gate-dialog";
import { useDistractionGate } from "@/hooks/use-distraction-gate";
import { useLowStimulationMode } from "@/hooks/use-low-stimulation-mode";
import { useAppStore } from "@/stores/app-store";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

type FocusNavigationContextValue = {
  shouldGateRoute: (route: string) => boolean;
  requestRoute: (route: string) => boolean;
  handleLinkClick: (route: string, event: MouseEvent<HTMLElement>) => boolean;
};

const FocusNavigationContext = createContext<FocusNavigationContextValue | null>(null);

export function FocusRealityBoundary({ children }: { children: ReactNode }) {
  const language = useAppStore((state) => state.language);
  const copy = useMemo(() => getDailyPlannerUiCopy(language), [language]);
  const gate = useDistractionGate();
  useLowStimulationMode();

  const handleLinkClick = useCallback(
    (route: string, event: MouseEvent<HTMLElement>) => {
      if (!gate.shouldGateRoute(route)) return true;
      event.preventDefault();
      event.stopPropagation();
      gate.requestRoute(route);
      return false;
    },
    [gate],
  );

  const value = useMemo<FocusNavigationContextValue>(
    () => ({
      shouldGateRoute: gate.shouldGateRoute,
      requestRoute: gate.requestRoute,
      handleLinkClick,
    }),
    [gate.requestRoute, gate.shouldGateRoute, handleLinkClick],
  );

  return (
    <FocusNavigationContext.Provider value={value}>
      {children}
      <DistractionGateDialog
        copy={copy}
        pendingGate={gate.pendingGate}
        activeSession={gate.activeSession}
        delaySeconds={gate.delaySeconds}
        onReturnToFocus={gate.returnToFocus}
        onCaptureNoteAndReturn={gate.captureNoteAndReturn}
        onContinueIntentionally={gate.continueIntentionally}
        onAbandonFocusAndContinue={gate.abandonFocusAndContinue}
      />
    </FocusNavigationContext.Provider>
  );
}

export function useFocusNavigation() {
  return useContext(FocusNavigationContext);
}
