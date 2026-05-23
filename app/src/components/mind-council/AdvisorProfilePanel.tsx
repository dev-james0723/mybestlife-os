"use client";

import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";

type AdvisorProfilePanelProps = {
  skill: MindSkill | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ui: MindCouncilUiCopy;
  onOpenChat: () => void;
};

export function AdvisorProfilePanel({ skill, open, onOpenChange, ui, onOpenChat }: AdvisorProfilePanelProps) {
  if (!skill) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 bg-card/50 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <AdvisorPortrait
              skill={skill}
              className="h-16 w-16 shadow-lg"
              pixelSize={64}
              rounded="rounded-2xl"
            />
            <div className="min-w-0">
              <SheetTitle className="text-left text-lg">{skill.lensTitle}</SheetTitle>
              <SheetDescription className="text-left">{ui.disclaimerShort}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-4 p-5 text-sm">
          <p className="text-muted-foreground">{skill.lensSubtitle}</p>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            {ui.disclaimerPanel}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.createHintLabel}
            </h4>
            <p className="rounded-xl bg-background/80 p-3 text-xs leading-relaxed">{skill.systemPromptHint}</p>
          </div>
          {skill.skillSource ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skill package
              </h4>
              <p className="rounded-xl bg-background/80 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{skill.skillSource.repo}</span>
                {skill.skillSource.note ? (
                  <>
                    <br />
                    {skill.skillSource.note}
                  </>
                ) : null}
                {skill.skillSource.url.startsWith("http") ? (
                  <>
                    <br />
                    <a
                      href={skill.skillSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      View upstream
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>
        <SheetFooter className="border-t border-border/60 p-4">
          <Button type="button" className="w-full rounded-2xl" onClick={onOpenChat}>
            {ui.profileOpenChat}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
