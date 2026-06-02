"use client";

import { useEffect, useRef, type ChangeEvent, type RefObject } from "react";
import { Camera, UserRound } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  OSFrostedPanel,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { useAboutMe, useUpsertAboutMe, useUploadAboutMeProfileImage } from "@/hooks/use-about-me";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { cn } from "@/lib/utils";

type SectionKey =
  | "instruction_manual"
  | "core_values"
  | "mission"
  | "personality_insights";

export default function AboutMePage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).aboutMe;
  const { data, isLoading } = useAboutMe();
  const upsert = useUpsertAboutMe();
  const uploadProfileImage = useUploadAboutMeProfileImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const instructionRef = useRef<RichTextEditorHandle>(null);
  const coreValuesRef = useRef<RichTextEditorHandle>(null);
  const missionRef = useRef<RichTextEditorHandle>(null);
  const personalityRef = useRef<RichTextEditorHandle>(null);

  const sections: { key: SectionKey; title: string; description: string; multiline: boolean }[] = [
    {
      key: "instruction_manual",
      title: ui.instructionManualTitle,
      description: ui.instructionManualDescription,
      multiline: true,
    },
    {
      key: "core_values",
      title: ui.coreValuesTitle,
      description: ui.coreValuesDescription,
      multiline: true,
    },
    {
      key: "mission",
      title: ui.missionTitle,
      description: ui.missionDescription,
      multiline: true,
    },
    {
      key: "personality_insights",
      title: ui.personalityInsightsTitle,
      description: ui.personalityInsightsDescription,
      multiline: true,
    },
  ];

  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => {
      instructionRef.current?.setHtml(data.instruction_manual ?? "");
      coreValuesRef.current?.setHtml(data.core_values ?? "");
      missionRef.current?.setHtml(data.mission ?? "");
      personalityRef.current?.setHtml(data.personality_insights ?? "");
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  const htmlOrNull = (ref: RefObject<RichTextEditorHandle | null>) => {
    const html = ref.current?.getHtml() ?? "";
    const text = ref.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return null;
    return html.trim() || text;
  };

  const onProfileImagePick = () => {
    fileInputRef.current?.click();
  };

  const onProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadProfileImage.mutate(file);
  };

  const saveSection = async (key: SectionKey) => {
    const payload: Record<string, string | null> = {};
    if (key === "instruction_manual") {
      payload.instruction_manual = htmlOrNull(instructionRef);
    }
    if (key === "core_values") {
      payload.core_values = htmlOrNull(coreValuesRef);
    }
    if (key === "mission") {
      payload.mission = htmlOrNull(missionRef);
    }
    if (key === "personality_insights") {
      payload.personality_insights = htmlOrNull(personalityRef);
    }
    await upsert.mutateAsync(payload);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
    >
      <div className="space-y-6 max-w-3xl">
        <OSFrostedPanel className="space-y-4 p-4 sm:p-5">
          <div className="space-y-1.5">
            <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
              {ui.profileImageTitle}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {ui.profileImageDescription}
            </p>
          </div>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onProfileImageChange}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onProfileImagePick}
                disabled={uploadProfileImage.isPending}
                aria-label={ui.profileImageAriaLabel}
                title={ui.profileImageAriaLabel}
                className={cn(
                  "group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  uploadProfileImage.isPending && "pointer-events-none opacity-60"
                )}
              >
                <Avatar className="size-28 ring-2 ring-border">
                  <AvatarImage src={data?.profile_image_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-muted">
                    <UserRound className="size-12 text-muted-foreground" aria-hidden />
                  </AvatarFallback>
                  <AvatarBadge
                    className="size-9 border-2 border-background bg-primary text-primary-foreground shadow-sm [&>svg]:size-4"
                    aria-hidden
                  >
                    <Camera />
                  </AvatarBadge>
                </Avatar>
              </button>
              <p className="text-sm text-muted-foreground">{ui.profileImageFileHint}</p>
            </div>
          </div>
        </OSFrostedPanel>

        {sections.map((s) => (
          <OSSolidPanel key={s.key} className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1.5">
              <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
                {s.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{s.description}</p>
            </div>
            <div className="space-y-4">
              {s.multiline ? (
                <RichTextEditor
                  ref={
                    s.key === "instruction_manual"
                      ? instructionRef
                      : s.key === "core_values"
                        ? coreValuesRef
                        : s.key === "mission"
                          ? missionRef
                          : personalityRef
                  }
                  initialHtml=""
                  placeholder={ui.writeSectionPlaceholder(s.title)}
                  minHeightClass="min-h-[160px]"
                />
              ) : null}
              <OSPrimaryAction
                type="button"
                className="w-full sm:w-fit"
                onClick={() => saveSection(s.key)}
                disabled={upsert.isPending}
              >
                {upsert.isPending ? ui.saving : ui.saveSection(s.title)}
              </OSPrimaryAction>
            </div>
          </OSSolidPanel>
        ))}
      </div>
    </PageShell>
  );
}
