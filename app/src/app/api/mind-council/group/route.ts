import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getPresetSkillById } from "@/lib/mind-council/preset-skills";
import {
  invokeMindCouncilSynthesis,
  invokeMindSkill,
  mindCouncilPublicDisclaimer,
} from "@/lib/mind-council/skill-runtime";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(json)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userMessage = typeof json.userMessage === "string" ? json.userMessage.trim() : "";
  if (!userMessage) {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  const rawIds = json.skillIds;
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: "skillIds must be an array" }, { status: 400 });
  }

  const skillIds = rawIds
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = [...new Set(skillIds)];
  if (unique.length < 2 || unique.length > 5) {
    return NextResponse.json({ error: "Select between 2 and 5 advisors" }, { status: 400 });
  }

  const skills = unique.map((id) => ({ id, skill: getPresetSkillById(id) }));
  if (skills.some((s) => !s.skill)) {
    return NextResponse.json({ error: "One or more skillIds are unknown" }, { status: 404 });
  }

  const locale = parseAppLocale(json.locale);
  const contents = [{ role: "user" as const, parts: [{ text: userMessage }] }];

  try {
    const replies = await Promise.all(
      skills.map(async ({ skill }) => {
        const s = skill!;
        const result = await invokeMindSkill({
          skillProvider: s.skillProvider,
          skillId: s.skillId,
          agentId: s.agentId,
          lensTitle: s.lensTitle,
          systemPromptHint: s.systemPromptHint,
          locale,
          contents,
        });
        return {
          skillId: s.skillId,
          lensTitle: s.lensTitle,
          reply: result.text,
          modelUsed: result.modelUsed,
          source: result.source,
        };
      }),
    );

    const syn = await invokeMindCouncilSynthesis({
      locale,
      userMessage,
      advisorSnippets: replies.map((r) => ({ lensTitle: r.lensTitle, reply: r.reply })),
    });

    const disclaimer = mindCouncilPublicDisclaimer("Mind Council group session");

    return NextResponse.json({
      replies,
      synthesis: syn.text,
      synthesisModelUsed: syn.modelUsed,
      disclaimer,
    });
  } catch (e) {
    console.error("[mind-council/group]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Group council failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
