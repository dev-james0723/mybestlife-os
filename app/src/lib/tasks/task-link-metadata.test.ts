import { describe, expect, it } from "vitest";

import {
  addTaskReferenceTag,
  parseTaskLinkMetadata,
  removeTaskReferenceTag,
  stripTaskLinkMetadataSections,
} from "./task-link-metadata";

const NOTE_ID = "ad8b8a3a-a52b-4687-b1f1-180968380c6b";
const IDEA_ID = "f2dd1562-45ec-4dc0-b322-ead142962bbc";
const KNOWLEDGE_ID = "2ccfca19-1c8f-451b-b0e2-60ee8349c629";

describe("parseTaskLinkMetadata", () => {
  it("separates valid reference tags from user-visible tags and deduplicates ids", () => {
    expect(
      parseTaskLinkMetadata(
        [
          "creative",
          `note:${NOTE_ID}`,
          `note:${NOTE_ID}`,
          "idea:not-a-uuid",
          `Note:${NOTE_ID}`,
        ],
        null,
      ),
    ).toEqual({
      userVisibleTags: ["creative", "idea:not-a-uuid", `Note:${NOTE_ID}`],
      noteIds: [NOTE_ID],
      ideaIds: [],
      knowledgeIds: [],
    });
  });

  it("unions reference ids from legacy description sections with tag references", () => {
    const description = [
      "Prepare the meeting notes.",
      `Related notes: ${NOTE_ID}, ${NOTE_ID.toUpperCase()}`,
      `Related ideas: ${IDEA_ID}`,
      `Related knowledge: ${KNOWLEDGE_ID}`,
    ].join("\n\n");

    expect(parseTaskLinkMetadata([`idea:${IDEA_ID}`], description)).toEqual({
      userVisibleTags: [],
      noteIds: [NOTE_ID],
      ideaIds: [IDEA_ID],
      knowledgeIds: [KNOWLEDGE_ID],
    });
  });
});

describe("stripTaskLinkMetadataSections", () => {
  it("removes valid legacy reference sections without deleting user content", () => {
    const description = [
      "Prepare the meeting notes.",
      "Bring the draft agenda.",
      `Related notes: ${NOTE_ID}`,
      "Related ideas: brainstorm after lunch",
      `Related knowledge: ${KNOWLEDGE_ID}`,
    ].join("\n\n");

    expect(stripTaskLinkMetadataSections(description)).toBe(
      [
        "Prepare the meeting notes.",
        "Bring the draft agenda.",
        "Related ideas: brainstorm after lunch",
      ].join("\n\n"),
    );
  });

  it("returns null when the description contains only link metadata", () => {
    expect(
      stripTaskLinkMetadataSections(`Related ideas: ${IDEA_ID}`),
    ).toBeNull();
    expect(stripTaskLinkMetadataSections(null)).toBeNull();
  });
});

describe("task reference tag helpers", () => {
  it("adds a normalized reference once and ignores invalid ids", () => {
    const tags = addTaskReferenceTag(
      ["creative"],
      "idea",
      IDEA_ID.toUpperCase(),
    );

    expect(tags).toEqual(["creative", `idea:${IDEA_ID}`]);
    expect(addTaskReferenceTag(tags, "idea", IDEA_ID)).toEqual(tags);
    expect(addTaskReferenceTag(tags, "note", "not-a-uuid")).toEqual(tags);
  });

  it("removes only matching valid reference tags", () => {
    const tags = [
      "creative",
      `idea:${IDEA_ID}`,
      `idea:${IDEA_ID.toUpperCase()}`,
      `knowledge:${IDEA_ID}`,
      "idea:not-a-uuid",
    ];

    expect(removeTaskReferenceTag(tags, "idea", IDEA_ID)).toEqual([
      "creative",
      `knowledge:${IDEA_ID}`,
      "idea:not-a-uuid",
    ]);
    expect(removeTaskReferenceTag(tags, "idea", "not-a-uuid")).toEqual(tags);
  });
});
