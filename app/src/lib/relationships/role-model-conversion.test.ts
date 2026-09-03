import { describe, expect, it } from "vitest";
import type { Relationship } from "@/types/database";
import {
  normalizeRoleModelName,
  relationshipToRoleModelInput,
} from "./role-model-conversion";

function relationship(
  partial: Partial<Relationship> = {},
): Relationship {
  return {
    id: "relationship-1",
    user_id: "user-1",
    person_name: "Ada Lovelace",
    photo_url: "https://example.com/ada.jpg",
    category: "mentor",
    relationship_strength: "strong",
    email: null,
    phone: null,
    social_links: [
      { platform: "linkedin", url: "https://linkedin.com/in/ada" },
    ],
    last_contact_date: null,
    last_interaction_notes: null,
    next_action: null,
    next_action_date: null,
    commitments_made: null,
    preferences_and_details: null,
    general_notes: "A private note",
    tags: ["computing"],
    linked_project_id: "project-1",
    linked_project_ids: ["project-1", "project-2"],
    linked_goal_ids: ["goal-1"],
    linked_note_ids: ["note-1"],
    linked_idea_ids: ["idea-1"],
    is_favorite: true,
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    ...partial,
  };
}

describe("relationshipToRoleModelInput", () => {
  it("carries reusable profile, social, favorite, and supported links", () => {
    expect(relationshipToRoleModelInput(relationship())).toMatchObject({
      name: "Ada Lovelace",
      source_relationship_id: "relationship-1",
      photo_url: "https://example.com/ada.jpg",
      category: "mentor",
      tags: ["computing"],
      links: [
        {
          label: "LinkedIn",
          url: "https://linkedin.com/in/ada",
          kind: "social",
        },
      ],
      notes: "A private note",
      is_favorite: true,
      linked_project_ids: ["project-1", "project-2"],
      linked_goal_ids: ["goal-1"],
      linked_note_ids: ["note-1"],
    });
  });

  it("does not share a relationship-owned upload that may later be deleted", () => {
    const input = relationship({
      photo_url:
        "https://example.supabase.co/storage/v1/object/public/relationship-photos/user/rel/photo.jpg",
    });

    expect(relationshipToRoleModelInput(input)).toMatchObject({
      photo_url: null,
      image_url: null,
    });
  });
});

describe("normalizeRoleModelName", () => {
  it("normalizes case and repeated whitespace", () => {
    expect(normalizeRoleModelName("  Ada   LOVELACE ")).toBe("ada lovelace");
  });
});
