import type { CreateRoleModelInput } from "@/lib/repositories/role-models";
import type { Relationship } from "@/types/database";
import type { RelationshipSocialPlatform } from "@/types/relationship";

/** Case/whitespace-insensitive key used to avoid duplicate Role Model rows. */
export function normalizeRoleModelName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Seed a Role Model profile from the fields already captured for a person. */
export function relationshipToRoleModelInput(
  relationship: Relationship,
): CreateRoleModelInput {
  // Relationship-upload photos live in a different bucket and are cleaned up
  // when the relationship is deleted. Only reuse external URLs that will not
  // leave the Role Model with a broken image later.
  const reusablePhoto = isRelationshipBucketUrl(relationship.photo_url)
    ? null
    : relationship.photo_url;

  return {
    name: relationship.person_name.trim(),
    source_relationship_id: relationship.id,
    photo_url: reusablePhoto,
    image_url: reusablePhoto,
    category: relationship.category,
    tags: [...relationship.tags],
    links: relationship.social_links.map((link) => ({
      label: socialPlatformLabel(link.platform),
      url: link.url,
      kind: "social" as const,
    })),
    notes: relationship.general_notes,
    is_favorite: relationship.is_favorite,
    linked_project_ids: [...relationship.linked_project_ids],
    linked_goal_ids: [...relationship.linked_goal_ids],
    linked_note_ids: [...relationship.linked_note_ids],
  };
}

function isRelationshipBucketUrl(url: string | null): boolean {
  return Boolean(
    url?.includes("/storage/v1/object/public/relationship-photos/"),
  );
}

function socialPlatformLabel(platform: RelationshipSocialPlatform): string {
  const labels: Record<RelationshipSocialPlatform, string> = {
    linkedin: "LinkedIn",
    instagram: "Instagram",
    x: "X",
    facebook: "Facebook",
    threads: "Threads",
    youtube: "YouTube",
    tiktok: "TikTok",
    github: "GitHub",
    website: "Website",
    other: "Other",
  };
  return labels[platform];
}
