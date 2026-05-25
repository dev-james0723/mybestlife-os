"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";

export type WizardFooterProps = {
  ui: CareerMirrorUiCopy;
  /** Whether a Back action is available. */
  canBack: boolean;
  /** Whether the current step can be skipped. */
  canSkip: boolean;
  /** When true, the primary button finishes the wizard instead of advancing. */
  isLast: boolean;
  /** Disable Next/Finish (e.g. a required answer is missing). */
  nextDisabled?: boolean;
  /** Show a spinner + finishing copy on the primary button. */
  finishing?: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onSaveAndExit: () => void;
  onFinish: () => void;
  className?: string;
};

/**
 * Sticky footer that lives INSIDE the dialog/sheet scroll container
 * (`position: sticky; bottom: 0`) — never page-fixed — so it stays above the
 * device keyboard. Includes safe-area bottom padding for notched devices.
 */
export function WizardFooter({
  ui,
  canBack,
  canSkip,
  isLast,
  nextDisabled,
  finishing,
  onBack,
  onSkip,
  onNext,
  onSaveAndExit,
  onFinish,
  className,
}: WizardFooterProps) {
  return (
    <div
      data-slot="wizard-footer"
      className={cn(
        "sticky bottom-0 z-10 -mx-4 mt-2 flex items-center gap-2 border-t border-black/8 bg-background/85 px-4 pt-3 backdrop-blur-md dark:border-white/10",
        "pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {canBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} disabled={finishing}>
            {ui.buttons.back}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveAndExit}
          disabled={finishing}
        >
          {ui.buttons.saveAndExit}
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {canSkip ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={finishing}
          >
            {ui.buttons.skip}
          </Button>
        ) : null}
        {isLast ? (
          <Button
            variant="gradient-pink"
            size="sm"
            onClick={onFinish}
            disabled={nextDisabled || finishing}
          >
            {finishing ? (
              <>
                <Loader2 className="animate-spin" />
                {ui.buttons.finishing}
              </>
            ) : (
              ui.buttons.finish
            )}
          </Button>
        ) : (
          <Button
            variant="gradient-pink"
            size="sm"
            onClick={onNext}
            disabled={nextDisabled || finishing}
          >
            {ui.buttons.next}
          </Button>
        )}
      </div>
    </div>
  );
}

export default WizardFooter;
