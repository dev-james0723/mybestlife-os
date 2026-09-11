"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { CouncilWorkspace } from "./CouncilWorkspace";
import { SkillChatRoom } from "./SkillChatRoom";
import { AdvisorProfilePanel } from "./AdvisorProfilePanel";
import { CreateSkillModal } from "./CreateSkillModal";
import { useAppStore } from "@/stores/app-store";
import { getMindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { PRESET_MIND_SKILLS } from "@/lib/mind-council/preset-skills";
import { neuralSkillToMindSkill, useGenerateNeuralSkill, useRoleModelMindSkills } from "@/hooks/use-role-model-neural-skills";
import { roleModelsRepository } from "@/lib/repositories/role-models";
import { roleModelNeuralSkillsRepository } from "@/lib/repositories/role-model-neural-skills";
import { createCouncilSkill, type CreateCouncilSkillInput } from "@/lib/mind-council/create-council-skill";
import type { MindSkill } from "@/lib/mind-council/types";

function loadCustomFromStorage(): MindSkill[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem("mind-council-custom-skills-v1") ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is MindSkill => typeof x === "object" && x !== null && "skillId" in x) : [];
  } catch { return []; }
}
export function MindCouncilExperience() {
  const locale = parseAppLocale(useAppStore((s) => s.language));
  const ui = getMindCouncilUiCopy(locale);
  const generate = useGenerateNeuralSkill();
  const queryClient = useQueryClient();
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const { skills: roleModelSkills, isLoading: roleModelSkillsLoading } = useRoleModelMindSkills();
  const [customSkills, setCustomSkills] = useState<MindSkill[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser-only legacy advisors after mount
    setCustomSkills(loadCustomFromStorage());
  }, []);
  const allSkills = useMemo(() => [...PRESET_MIND_SKILLS, ...roleModelSkills, ...customSkills], [roleModelSkills, customSkills]);
  const [chatSkill, setChatSkill] = useState<MindSkill | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();
  const [profileSkill, setProfileSkill] = useState<MindSkill | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const openChat = useCallback((skill: MindSkill) => { setChatPrompt(undefined); setChatSkill(skill); setChatOpen(true); }, []);
  const openProfile = useCallback((skill: MindSkill) => { setProfileSkill(skill); setProfileOpen(true); }, []);
  const handledDeepLink = useRef<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- explicit navigation into an existing advisor chat */
    const id = searchParams.get("skill");
    if (!id || searchParams.get("mode") !== "chat") return;
    const signature = `${id}:${searchParams.get("prompt") ?? ""}`;
    if (handledDeepLink.current === signature) return;
    const target = allSkills.find((s) => s.skillId === id);
    if (!target) {
      if (id.startsWith("custom-") && roleModelSkillsLoading) return;
      handledDeepLink.current = signature; toast.error("That advisor is not available."); router.replace(pathname, { scroll: false }); return;
    }
    handledDeepLink.current = signature;
    setChatSkill(target); setChatPrompt(searchParams.get("prompt") ?? undefined); setChatOpen(true);
    router.replace(pathname, { scroll: false });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, allSkills, roleModelSkillsLoading, router, pathname]);
  const onCreateSkill = useCallback(async (payload: CreateCouncilSkillInput) => {
    const saved = await createCouncilSkill(payload, { getRoleModels: roleModelsRepository.getAll,
      createRoleModel: roleModelsRepository.create, getSkills: roleModelNeuralSkillsRepository.getAll, generate: generate.mutateAsync });
    void queryClient.invalidateQueries({ queryKey: ["role-models"] });
    void queryClient.invalidateQueries({ queryKey: ["role-model-neural-skills"] });
    setCreateOpen(false); openChat(neuralSkillToMindSkill(saved));
  }, [generate.mutateAsync, queryClient, openChat]);
  return <PageShell title={ui.pageTitle} description={ui.pageDescription}>
    <div className="min-w-0 pb-12"><CouncilWorkspace skills={allSkills} ui={ui} locale={locale} onChat={openChat} onProfile={openProfile} onCreateAdvisor={() => setCreateOpen(true)} /></div>
    <SkillChatRoom key={chatSkill?.skillId ?? "none"} open={chatOpen} onOpenChange={(open) => {
      setChatOpen(open); if (!open) { setChatSkill(null); setChatPrompt(undefined); }
    }} skill={chatSkill} ui={ui} locale={locale} initialPrompt={chatPrompt} />
    <AdvisorProfilePanel skill={profileSkill} open={profileOpen} onOpenChange={setProfileOpen} ui={ui}
      onOpenChat={() => { if (profileSkill) { openChat(profileSkill); setProfileOpen(false); } }} />
    <CreateSkillModal open={createOpen} onOpenChange={setCreateOpen} ui={ui} onCreate={onCreateSkill} />
  </PageShell>;
}
