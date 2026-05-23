import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getPresetSkillById } from "@/lib/mind-council/preset-skills";
import { invokeMindSkill, mindCouncilPublicDisclaimer } from "@/lib/mind-council/skill-runtime";
import type { ChatMessageRole, MindSkill } from "@/lib/mind-council/types";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toGeminiContents(messages: { role: ChatMessageRole; content: string }[]) {
  return messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
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

  const skillId = typeof json.skillId === "string" ? json.skillId.trim() : "";
  if (!skillId) {
    return NextResponse.json({ error: "skillId is required" }, { status: 400 });
  }

  let skill: MindSkill | undefined = getPresetSkillById(skillId);
  if (!skill && skillId.startsWith("custom-")) {
    const customLensTitle =
      typeof json.customLensTitle === "string" ? json.customLensTitle.trim() : "";
    const customSystemHint =
      typeof json.customSystemHint === "string" ? json.customSystemHint.trim() : "";
    if (!customLensTitle || !customSystemHint) {
      return NextResponse.json(
        { error: "customLensTitle and customSystemHint are required for custom-* skills" },
        { status: 400 },
      );
    }
    const titled = customLensTitle.toLowerCase().includes("lens")
      ? customLensTitle
      : `${customLensTitle}–inspired Lens`;
    skill = {
      skillId,
      agentId: skillId,
      skillProvider: "custom",
      status: "ready",
      category: "philosophy",
      lensTitle: titled,
      lensSubtitle: "User-authored interpretive lens.",
      systemPromptHint: customSystemHint,
      avatarGradient: ["#64748b", "#94a3b8"],
    };
  }
  if (!skill) {
    return NextResponse.json({ error: "Unknown skill" }, { status: 404 });
  }

  const rawMessages = json.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const messages: { role: ChatMessageRole; content: string }[] = [];
  for (const m of rawMessages) {
    if (!isRecord(m)) continue;
    const role = m.role === "user" || m.role === "assistant" ? m.role : null;
    const content = typeof m.content === "string" ? m.content : "";
    if (!role || !content.trim()) continue;
    messages.push({ role, content });
  }

  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return NextResponse.json({ error: "Last message must be a non-empty user message" }, { status: 400 });
  }

  const locale = parseAppLocale(json.locale);
  const contents = toGeminiContents(messages);

  try {
    const result = await invokeMindSkill({
      skillProvider: skill.skillProvider,
      skillId: skill.skillId,
      agentId: skill.agentId,
      lensTitle: skill.lensTitle,
      systemPromptHint: skill.systemPromptHint,
      locale,
      contents,
    });

    const disclaimer = mindCouncilPublicDisclaimer(skill.lensTitle);

    return NextResponse.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      source: result.source,
      skillPackageLoaded: result.skillPackageLoaded ?? false,
      disclaimer,
    });
  } catch (e) {
    console.error("[mind-council/chat]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Mind skill invocation failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
