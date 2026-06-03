"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageShell } from "@/components/shared/page-shell";
import { MindCouncilHero } from "@/components/mind-council/MindCouncilHero";
import { ReadySkillsSection } from "@/components/mind-council/ReadySkillsSection";
import { AdvisorRecommendationPanel } from "@/components/mind-council/AdvisorRecommendationPanel";
import { CurrentCouncilBar } from "@/components/mind-council/CurrentCouncilBar";
import { SkillLibrary } from "@/components/mind-council/SkillLibrary";
import { SkillChatRoom } from "@/components/mind-council/SkillChatRoom";
import { GroupCouncilPanel } from "@/components/mind-council/GroupCouncilPanel";
import { CreateSkillModal } from "@/components/mind-council/CreateSkillModal";
import { AdvisorProfilePanel } from "@/components/mind-council/AdvisorProfilePanel";
import { useAppStore } from "@/stores/app-store";
import { getMindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { PRESET_MIND_SKILLS, getFeaturedPresetSkills } from "@/lib/mind-council/preset-skills";
import { useRoleModelMindSkills } from "@/hooks/use-role-model-neural-skills";
import type { MindSkill } from "@/lib/mind-council/types";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import {
  OSMotionPanel,
  OSFrostedPanel,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";

const CUSTOM_KEY = "mind-council-custom-skills-v1";

function loadCustomFromStorage(): MindSkill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is MindSkill => typeof x === "object" && x !== null && "skillId" in x) as MindSkill[];
  } catch {
    return [];
  }
}

function saveCustomToStorage(skills: MindSkill[]) {
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(skills));
  } catch {
    /* ignore */
  }
}

export function MindCouncilExperience() {
  const language = useAppStore((s) => s.language);
  const locale = parseAppLocale(language);
  const ui = getMindCouncilUiCopy(locale);

  const [heroInput, setHeroInput] = useState("");
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [customSkills, setCustomSkills] = useState<MindSkill[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { skills: roleModelSkills, isLoading: roleModelSkillsLoading } =
    useRoleModelMindSkills();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local lenses after mount (avoids SSR/localStorage mismatch)
    setCustomSkills(loadCustomFromStorage());
  }, []);

  // Persistent Role Model Neural Skills join the preset + local custom lenses
  // so "Talk To {name}" deep links resolve and they appear in the library.
  const allSkills = useMemo(
    () => [...PRESET_MIND_SKILLS, ...roleModelSkills, ...customSkills],
    [roleModelSkills, customSkills],
  );

  const councilMembers = useMemo(
    () => councilIds.map((id) => allSkills.find((s) => s.skillId === id)).filter(Boolean) as MindSkill[],
    [councilIds, allSkills],
  );

  const councilFull = councilIds.length >= 5;

  const refreshRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await fetch("/api/mind-council/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: heroInput, locale }),
      });
      const json = (await res.json()) as {
        recommendedSkillIds?: string[];
        rationale?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Recommend failed");
      setRecommendedIds(json.recommendedSkillIds ?? []);
      setRationale(json.rationale ?? "");
    } catch {
      toast.error("Could not refresh recommendations.");
    } finally {
      setRecLoading(false);
    }
  }, [heroInput, locale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRecLoading(true);
      try {
        const res = await fetch("/api/mind-council/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: heroInput, locale }),
        });
        const json = (await res.json()) as {
          recommendedSkillIds?: string[];
          rationale?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Recommend failed");
        if (!cancelled) {
          setRecommendedIds(json.recommendedSkillIds ?? []);
          setRationale(json.rationale ?? "");
        }
      } catch {
        if (!cancelled) toast.error("Could not refresh recommendations.");
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally omit heroInput: recommendations refresh on mount / locale change / button only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const addToCouncil = useCallback(
    (skill: MindSkill) => {
      setCouncilIds((prev) => {
        if (prev.includes(skill.skillId)) return prev;
        if (prev.length >= 5) {
          toast.message(ui.toastCouncilFull);
          return prev;
        }
        return [...prev, skill.skillId];
      });
    },
    [ui.toastCouncilFull],
  );

  const removeFromCouncil = useCallback((skillId: string) => {
    setCouncilIds((prev) => prev.filter((id) => id !== skillId));
  }, []);

  const addRecommendationsToCouncil = useCallback(() => {
    setCouncilIds((prev) => {
      const next = [...prev];
      for (const id of recommendedIds) {
        if (next.length >= 5) break;
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }, [recommendedIds]);

  const [chatSkill, setChatSkill] = useState<MindSkill | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);
  const [profileSkill, setProfileSkill] = useState<MindSkill | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSession, setGroupSession] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const openChat = useCallback((skill: MindSkill) => {
    setChatSkill(skill);
    setChatOpen(true);
  }, []);

  const openProfile = useCallback((skill: MindSkill) => {
    setProfileSkill(skill);
    setProfileOpen(true);
  }, []);

  // -------------------------------------------------------------------------
  // Deep-link support: /mind-council?skill=<id>&mode=chat&prompt=...&source=...
  // -------------------------------------------------------------------------
  const handledDeepLink = useRef<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- opening chat is a deliberate response to a URL deep link */
    const skillId = searchParams.get("skill");
    const mode = searchParams.get("mode");
    if (!skillId || mode !== "chat") return;

    // De-dupe so we don't re-open on every render while the param lingers.
    const signature = `${skillId}:${searchParams.get("prompt") ?? ""}`;
    if (handledDeepLink.current === signature) return;

    // Role-model skills load async; wait for them before declaring "unknown".
    const target = allSkills.find((s) => s.skillId === skillId);
    if (!target) {
      if (skillId.startsWith("custom-") && roleModelSkillsLoading) return;
      handledDeepLink.current = signature;
      toast.error("That lens isn't available — opening the library instead.");
      router.replace(pathname, { scroll: false });
      return;
    }

    handledDeepLink.current = signature;
    const prompt = searchParams.get("prompt");
    setChatSkill(target);
    setChatPrompt(prompt ?? undefined);
    setChatOpen(true);
    // Strip params so a refresh/close doesn't reopen unexpectedly.
    router.replace(pathname, { scroll: false });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, allSkills, roleModelSkillsLoading, router, pathname]);

  const openCouncil = useCallback(() => {
    if (councilIds.length < 2) {
      toast.message(ui.toastNeedTwoAdvisors);
      return;
    }
    const nonPreset = councilIds.some((id) => id.startsWith("custom-"));
    if (nonPreset) {
      toast.message(
        "Group council currently uses preset advisors only. Remove custom lenses from the bar.",
      );
      return;
    }
    setGroupSession((s) => s + 1);
    setGroupOpen(true);
  }, [councilIds, ui.toastNeedTwoAdvisors]);

  const onCreateSkill = useCallback((payload: { lensTitle: string; systemPromptHint: string }) => {
    const id = `custom-${crypto.randomUUID()}`;
    const skill: MindSkill = {
      skillId: id,
      agentId: id,
      skillProvider: "custom",
      status: "ready",
      category: "philosophy",
      lensTitle: payload.lensTitle,
      lensSubtitle: "Your locally stored interpretive lens.",
      systemPromptHint: payload.systemPromptHint,
      avatarGradient: ["#334155", "#cbd5e1"],
    };
    setCustomSkills((prev) => {
      const n = [...prev, skill];
      saveCustomToStorage(n);
      return n;
    });
    toast.success("Saved to this browser.");
  }, []);

  return (
    <PageShell title={ui.pageTitle} description={ui.pageDescription}>
      <OSMotionPanel className="space-y-10 pb-16">
        <MindCouncilHero
          ui={ui}
          value={heroInput}
          onChange={setHeroInput}
          onChip={() => {}}
          onRecommend={() => void refreshRecommendations()}
          onAskCouncil={openCouncil}
        />

        <OSSolidPanel className="border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-none">
          {ui.disclaimerPanel}
        </OSSolidPanel>

        <ReadySkillsSection
          ui={ui}
          skills={getFeaturedPresetSkills()}
          councilIds={councilIds}
          councilFull={councilFull}
          onChat={openChat}
          onAddCouncil={addToCouncil}
          onProfile={openProfile}
        />

        <AdvisorRecommendationPanel
          ui={ui}
          recommendedIds={recommendedIds}
          rationale={rationale || ui.recommendTopicHint}
          loading={recLoading}
          onRefresh={() => void refreshRecommendations()}
          onAddAll={addRecommendationsToCouncil}
        />

        <CurrentCouncilBar ui={ui} members={councilMembers} onRemove={removeFromCouncil} />

        <SkillLibrary
          ui={ui}
          skills={allSkills}
          councilIds={councilIds}
          councilFull={councilFull}
          onChat={openChat}
          onAddCouncil={addToCouncil}
          onProfile={openProfile}
        />

        <OSFrostedPanel className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{ui.createSkillTitle}</h2>
            <p className="text-sm text-muted-foreground">{ui.createSkillSubtitle}</p>
          </div>
          <OSPrimaryAction type="button" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            {ui.createSkillTitle}
          </OSPrimaryAction>
        </OSFrostedPanel>
      </OSMotionPanel>

      <SkillChatRoom
        key={chatSkill?.skillId ?? "none"}
        open={chatOpen}
        onOpenChange={(v) => {
          setChatOpen(v);
          if (!v) {
            setChatSkill(null);
            setChatPrompt(undefined);
          }
        }}
        skill={chatSkill}
        ui={ui}
        locale={locale}
        initialPrompt={chatPrompt}
      />

      <AdvisorProfilePanel
        skill={profileSkill}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        ui={ui}
        onOpenChat={() => {
          if (profileSkill) {
            setChatSkill(profileSkill);
            setChatOpen(true);
            setProfileOpen(false);
          }
        }}
      />

      <GroupCouncilPanel
        key={groupSession}
        open={groupOpen}
        onOpenChange={setGroupOpen}
        ui={ui}
        locale={locale}
        councilSkillIds={councilIds}
        defaultQuestion={heroInput}
      />

      <CreateSkillModal open={createOpen} onOpenChange={setCreateOpen} ui={ui} onCreate={onCreateSkill} />
    </PageShell>
  );
}
