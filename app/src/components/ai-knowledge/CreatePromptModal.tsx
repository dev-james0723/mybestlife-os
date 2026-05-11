"use client";

import { useState } from "react";
import { PencilLine, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { cn } from "@/lib/utils";
import { BlankPromptForm } from "@/components/ai-knowledge/BlankPromptForm";
import { PromptCreatorWizard } from "@/components/ai-knowledge/prompt-wizard/PromptCreatorWizard";

export type CreatePromptModalStep = "pick" | "manual" | "wizard";

export type CreatePromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the modal opens, start on this step (default: choice screen). */
  initialStep?: CreatePromptModalStep;
  /** After a prompt is saved successfully (manual or wizard). */
  onCreated?: () => void;
};

export function CreatePromptModal({
  open,
  onOpenChange,
  initialStep = "pick",
  onCreated,
}: CreatePromptModalProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const c = ui.create;

  const [step, setStep] = useState<CreatePromptModalStep>(initialStep);

  const handleClose = (next: boolean) => {
    if (!next) {
      setStep("pick");
    }
    onOpenChange(next);
  };

  const handleCreated = () => {
    onCreated?.();
    handleClose(false);
  };

  const title =
    step === "pick"
      ? c.modalTitle
      : step === "manual"
        ? ui.createWizard.blankPageTitle
        : ui.createWizard.pageTitle;

  const description =
    step === "pick" ? c.modalDescription : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="3xl"
        className="max-h-[min(92vh,880px)] overflow-y-auto overflow-x-hidden gap-3 sm:p-6"
      >
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {title}
          </DialogTitle>
          {description ? (
            <p className="text-sm text-muted-foreground font-normal">
              {description}
            </p>
          ) : null}
        </DialogHeader>

        {step === "pick" ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 pt-1">
            <article
              className={cn(
                "flex flex-col gap-3 rounded-[20px] border border-white/15 bg-white/[0.06] p-4 sm:p-5",
                "shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150",
                "transition duration-200 hover:border-white/25 hover:-translate-y-px",
                "dark:bg-white/[0.07]",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/80 ring-1 ring-white/10">
                  <PencilLine className="h-5 w-5 text-white/90" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold leading-tight">
                    {c.addManually}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {c.manualCardDescription}
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-1">
                <Button
                  type="button"
                  className={cn(
                    "w-full font-semibold text-white shadow-md transition duration-150",
                    "bg-[#0c2344] hover:bg-[#0f2d52] hover:scale-[1.01] active:scale-[0.99]",
                    "border border-white/12 focus-visible:ring-offset-background",
                  )}
                  onClick={() => setStep("manual")}
                >
                  {c.addManually}
                </Button>
              </div>
            </article>

            <article
              className={cn(
                "flex flex-col gap-3 rounded-[20px] border border-white/15 bg-white/[0.06] p-4 sm:p-5",
                "shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150",
                "transition duration-200 hover:border-white/25 hover:-translate-y-px",
                "dark:bg-white/[0.07]",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3a1216] ring-1 ring-white/12">
                  <Sparkles className="h-5 w-5 text-rose-50/95" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold leading-tight">
                    {c.addWithWizard}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {c.wizardCardDescription}
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-1">
                <Button
                  type="button"
                  className={cn(
                    "w-full font-semibold text-white shadow-md transition duration-150",
                    "bg-[#4a1218] hover:bg-[#5c1620] hover:scale-[1.01] active:scale-[0.99]",
                    "border border-white/12 focus-visible:ring-offset-background",
                  )}
                  onClick={() => setStep("wizard")}
                >
                  {c.addWithWizard}
                </Button>
              </div>
            </article>
          </div>
        ) : step === "manual" ? (
          <BlankPromptForm
            variant="embedded"
            onBack={() => setStep("pick")}
            onSuccess={handleCreated}
          />
        ) : (
          <PromptCreatorWizard
            variant="embedded"
            onCancel={() => setStep("pick")}
            onSuccess={handleCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
