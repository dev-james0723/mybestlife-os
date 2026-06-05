import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildLifeAgentContextPacket } from "@/lib/life-agent/context-builder";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import type {
  LifeAgentChatRequestBody,
  LifeAgentChatResponseBody,
} from "@/lib/life-agent/chat-types";
import { getLifeAgentModelProvider } from "@/lib/life-agent/model-provider";
import {
  clampChatHistory,
  clampMessageContent,
  clampSystemPrompt,
} from "@/lib/life-agent/prompt-budget";
import { buildLifeAgentSystemPrompt } from "@/lib/life-agent/system-prompt";
import { getLifeAgentCharacterById } from "@/lib/life-agent/character-presets";
import { profileInputFromCharacterId } from "@/lib/life-agent/profile-from-preset";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import {
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentConversation,
  type LifeAgentMessage,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
  type LifeAgentProfile,
} from "@/types/life-agent";

const MODES: LifeAgentMode[] = ["companion", "orchestrator", "operator", "mirror"];
const MAX_HISTORY_TURNS = 10;

const ChatBodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  mode: z.enum(["companion", "orchestrator", "operator", "mirror"]).optional(),
  characterId: z.string().min(1).max(64).optional(),
  locale: z.string().optional(),
  temporaryPermissions: z.record(z.string(), z.boolean()).optional(),
});

export type RunLifeAgentChatParams = {
  supabase: SupabaseClient;
  userId: string;
  body: unknown;
};

export type RunLifeAgentChatResult =
  | { ok: true; data: LifeAgentChatResponseBody }
  | { ok: false; status: number; error: string; detail?: string };

function sessionGrantsFromTemporary(
  temporary?: Partial<Record<LifeAgentPermissionDomain, boolean>>,
): LifeAgentPermissionDomain[] {
  if (!temporary) return [];
  return LIFE_AGENT_PERMISSION_DOMAINS.filter((d) => temporary[d] === true);
}

async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<LifeAgentProfile | null> {
  const { data } = await supabase
    .from("life_agent_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as LifeAgentProfile | null) ?? null;
}

async function loadPermissions(
  supabase: SupabaseClient,
  userId: string,
): Promise<LifeAgentPermission[]> {
  const { data, error } = await supabase
    .from("life_agent_permissions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as LifeAgentPermission[];
}

async function ensureConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  mode: LifeAgentMode,
  characterId: string,
  titleSeed: string,
): Promise<LifeAgentConversation> {
  if (conversationId) {
    const { data, error } = await supabase
      .from("life_agent_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error("conversation_not_found");
    }
    return data as LifeAgentConversation;
  }

  const { data, error } = await supabase
    .from("life_agent_conversations")
    .insert({
      user_id: userId,
      title: titleSeed.slice(0, 80),
      mode,
      character_id: characterId,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data as LifeAgentConversation;
}

async function insertMessage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  extras?: {
    metadata_json?: Record<string, unknown> | null;
    memory_used_json?: unknown;
  },
): Promise<LifeAgentMessage> {
  const { data, error } = await supabase
    .from("life_agent_messages")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      role,
      content,
      metadata_json: extras?.metadata_json ?? null,
      memory_used_json: extras?.memory_used_json ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LifeAgentMessage;
}

const CHAT_HISTORY_FETCH_LIMIT = 50;

async function loadChatHistory(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<LifeAgentMessage[]> {
  const { data, error } = await supabase
    .from("life_agent_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY_FETCH_LIMIT);
  if (error) throw error;
  return ((data ?? []) as LifeAgentMessage[]).reverse();
}

export async function runLifeAgentChat(
  params: RunLifeAgentChatParams,
): Promise<RunLifeAgentChatResult> {
  const parsed = ChatBodySchema.safeParse(params.body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "invalid_body", detail: parsed.error.message };
  }

  const body: LifeAgentChatRequestBody = {
    ...parsed.data,
    locale: parsed.data.locale ? parseAppLocale(parsed.data.locale) : undefined,
    temporaryPermissions: parsed.data.temporaryPermissions as
      | Partial<Record<LifeAgentPermissionDomain, boolean>>
      | undefined,
  };

  const message = body.message.trim();
  const warnings: string[] = [];

  try {
    let profile = await loadProfile(params.supabase, params.userId);
    const characterId =
      body.characterId ?? profile?.character_id ?? getLifeAgentCharacterById("aura")?.id ?? "aura";

    if (!profile && body.characterId) {
      const presetInput = profileInputFromCharacterId(characterId);
      const { data: created } = await params.supabase
        .from("life_agent_profiles")
        .upsert({ user_id: params.userId, ...presetInput }, { onConflict: "user_id" })
        .select()
        .single();
      profile = (created as LifeAgentProfile) ?? profile;
    }

    const mode: LifeAgentMode =
      body.mode && MODES.includes(body.mode) ? body.mode : "companion";

    const conversation = await ensureConversation(
      params.supabase,
      params.userId,
      body.conversationId,
      mode,
      characterId,
      message,
    );

    const effectiveMode = body.mode ?? conversation.mode ?? "companion";
    const effectiveCharacter = body.characterId ?? conversation.character_id ?? characterId;

    if (body.mode && body.mode !== conversation.mode) {
      await params.supabase
        .from("life_agent_conversations")
        .update({ mode: body.mode, updated_at: new Date().toISOString() })
        .eq("id", conversation.id)
        .eq("user_id", params.userId);
    }

    if (body.characterId && body.characterId !== conversation.character_id) {
      await params.supabase
        .from("life_agent_conversations")
        .update({ character_id: body.characterId, updated_at: new Date().toISOString() })
        .eq("id", conversation.id)
        .eq("user_id", params.userId);
    }

    await insertMessage(params.supabase, params.userId, conversation.id, "user", message);

    const permissionRows = await loadPermissions(params.supabase, params.userId);
    const sessionGrants = sessionGrantsFromTemporary(body.temporaryPermissions);

    const contextPacket = await buildLifeAgentContextPacket({
      supabase: params.supabase,
      userId: params.userId,
      mode: effectiveMode,
      userMessage: message,
      permissionRows,
      sessionGrants,
    });

    if (contextPacket.omittedDomains.some((o) => o.reason === "ask_every_time")) {
      warnings.push("Some domains require permission — grant access in settings to include them.");
    }

    const locale: AppLocale = body.locale ?? parseAppLocale("en");

    const allMessages = await loadChatHistory(
      params.supabase,
      params.userId,
      conversation.id,
    );
    const historyMessages = allMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(0, -1)
      .slice(-MAX_HISTORY_TURNS * 2);

    const history = clampChatHistory(
      historyMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    );

    const systemInstruction = clampSystemPrompt(
      buildLifeAgentSystemPrompt({
        mode: effectiveMode,
        profile,
        characterId: effectiveCharacter,
        contextPacket,
        locale,
      }),
    );

    const provider = getLifeAgentModelProvider();
    let modelOutput;
    try {
      modelOutput = await provider.generateText({
        systemInstruction,
        userText: `User message:\n${clampMessageContent(message)}`,
        history,
        temperature: 0.55,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      if (detail === "gemini_api_key_missing") {
        const fallbackReply =
          locale === "zh-TW" || locale === "zh-CN"
            ? "我現在無法連到 AI 模型（尚未設定 API 金鑰）。你仍然可以查看 Life Brief、Open Loops 與權限設定；設定好金鑰後再跟我對話即可。"
            : "I can't reach the AI model right now (API key not configured). You can still use Life Brief, Open Loops, and permissions here — once a key is set, chat will work again.";
        warnings.push("ai_unavailable");
        await insertMessage(params.supabase, params.userId, conversation.id, "assistant", fallbackReply, {
          metadata_json: { fallback: true, reason: "gemini_api_key_missing" },
          memory_used_json: contextPacket.memoryUsed,
        });
        await params.supabase
          .from("life_agent_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversation.id);
        return {
          ok: true,
          data: {
            conversationId: conversation.id,
            reply: fallbackReply,
            mode: effectiveMode,
            characterId: effectiveCharacter,
            intent: contextPacket.intent,
            memoryUsed: contextPacket.memoryUsed,
            suggestedActions: [],
            actionPreviews: [],
            modelUsed: "fallback",
            warnings,
          },
        };
      }
      return { ok: false, status: 502, error: "model_failed", detail };
    }

    const suggestedActions = modelOutput.suggestedActions.map((a) => ({
      ...a,
      id: a.id || randomUUID(),
    }));

    const { previews: actionPreviews, invalidCount } =
      await createPreviewsFromModelSuggestions(
        params.supabase,
        params.userId,
        suggestedActions.map((a) => ({
          type: a.type,
          title: a.title,
          description: a.description,
          payload: a.payload,
        })),
        conversation.id,
        sessionGrants,
      );

    let reply = modelOutput.reply;
    const actionsNeedStructuring =
      suggestedActions.length > 0 && actionPreviews.length === 0;
    if (actionsNeedStructuring) {
      reply = `${reply}\n\n_I can help turn this into actions, but I need to structure them first._`;
      warnings.push("Some suggested actions could not be validated.");
    } else if (invalidCount > 0) {
      warnings.push(`${invalidCount} suggested action(s) were skipped due to validation or permissions.`);
    }

    await insertMessage(params.supabase, params.userId, conversation.id, "assistant", reply, {
      metadata_json: {
        intent: contextPacket.intent,
        mode: effectiveMode,
        characterId: effectiveCharacter,
        modelUsed: modelOutput.modelUsed,
        suggestedActions,
        actionPreviews,
      },
      memory_used_json: contextPacket.memoryUsed,
    });

    await params.supabase
      .from("life_agent_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return {
      ok: true,
      data: {
        conversationId: conversation.id,
        reply,
        mode: effectiveMode,
        characterId: effectiveCharacter,
        intent: contextPacket.intent,
        memoryUsed: contextPacket.memoryUsed,
        suggestedActions,
        actionPreviews,
        actionsNeedStructuring: actionsNeedStructuring || undefined,
        modelUsed: modelOutput.modelUsed,
        warnings: warnings.length ? warnings : undefined,
      },
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (detail === "conversation_not_found") {
      return { ok: false, status: 404, error: "conversation_not_found" };
    }
    console.error("[life-agent/chat]", detail);
    return { ok: false, status: 500, error: "chat_failed", detail };
  }
}
