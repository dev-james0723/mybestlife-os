import { describe, expect, it } from "vitest";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import {
  canExecuteAction,
  canPreviewAction,
  domainForActionType,
} from "@/lib/life-agent/action-permissions";
import { validateModelSuggestion, validateActionPreviewInput } from "@/lib/life-agent/action-validator";
import type { LifeAgentPermission } from "@/types/life-agent";

function perm(
  domain: LifeAgentPermission["domain"],
  access_level: LifeAgentPermission["access_level"],
): LifeAgentPermission {
  return {
    id: `p-${domain}`,
    user_id: "u1",
    domain,
    access_level,
    created_at: "",
    updated_at: "",
  };
}

describe("life-agent action permissions", () => {
  it("maps action types to domains", () => {
    expect(domainForActionType("create_task")).toBe("tasks");
    expect(domainForActionType("draft_message")).toBe("notes");
  });

  it("blocks preview when domain is off or read_only", () => {
    const permissions = resolveLifeAgentPermissions("u1", [
      perm("tasks", "off"),
      perm("notes", "read_only"),
    ]);
    expect(canPreviewAction(permissions, "tasks")).toBe(false);
    expect(canPreviewAction(permissions, "notes")).toBe(false);
  });

  it("allows preview and execute for suggest_actions after confirm path", () => {
    const permissions = resolveLifeAgentPermissions("u1", [perm("tasks", "suggest_actions")]);
    expect(canPreviewAction(permissions, "tasks")).toBe(true);
    expect(canExecuteAction(permissions, "tasks")).toBe(true);
  });

  it("blocks preview and execute when domain is read_only", () => {
    const permissions = resolveLifeAgentPermissions("u1", [perm("tasks", "read_only")]);
    expect(canPreviewAction(permissions, "tasks")).toBe(false);
    expect(canExecuteAction(permissions, "tasks")).toBe(false);
  });
});

describe("life-agent action validator", () => {
  it("validates create_task from model suggestion", () => {
    const result = validateModelSuggestion({
      type: "create_task",
      title: "Send repertoire plan",
      description: "Follow up with Lori about the festival set list",
      payload: { title: "Send repertoire plan to Lori" },
    });
    expect(result?.actionType).toBe("create_task");
    expect(result?.envelope.domain).toBe("tasks");
  });

  it("rejects invalid relationship update without id", () => {
    const result = validateModelSuggestion({
      type: "update_relationship",
      title: "Follow up",
      description: "Call Lori",
      payload: { next_action: "Call Lori" },
    });
    expect(result).toBeNull();
  });

  it("maps save_note alias to create_note", () => {
    const result = validateModelSuggestion({
      type: "save_note",
      title: "Meeting notes",
      description: "Key points from call",
    });
    expect(result?.actionType).toBe("create_note");
  });

  it("validates draft_message without sending", () => {
    const result = validateActionPreviewInput(
      "draft_message",
      "Email Lori",
      "Draft follow-up",
      { body: "Hi Lori, here is the plan…" },
    );
    expect(result?.actionType).toBe("draft_message");
    expect(result?.envelope.riskLevel).toBe("low");
  });
});
