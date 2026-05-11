/** Sub-tab identifiers for the Relationship container. URL `?tab=` value. */
export const RELATIONSHIP_SUB_TABS = ["relationship", "role-model"] as const;

export type RelationshipSubTab = (typeof RELATIONSHIP_SUB_TABS)[number];

export const DEFAULT_SUB_TAB: RelationshipSubTab = "relationship";

export function isRelationshipSubTab(value: unknown): value is RelationshipSubTab {
  return (
    typeof value === "string" &&
    (RELATIONSHIP_SUB_TABS as readonly string[]).includes(value)
  );
}

/** Resolve any incoming `?tab=` value to a valid sub-tab, falling back to the default. */
export function resolveSubTab(raw: string | null | undefined): RelationshipSubTab {
  return isRelationshipSubTab(raw) ? raw : DEFAULT_SUB_TAB;
}
