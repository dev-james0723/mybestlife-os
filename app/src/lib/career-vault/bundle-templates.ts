import type {
  BundleTemplateDefinition,
  BundleTemplateKey,
} from "@/types/career-vault";

/**
 * Built-in bundle templates. `custom` is intentionally last so we can show
 * the branded presets first and the blank starter at the end.
 *
 * Copy (titles / cover-title text) is resolved from i18n at render time; the
 * definition here only captures the non-localized configuration.
 */
export const BUNDLE_TEMPLATES: BundleTemplateDefinition[] = [
  {
    type: "grad_school",
    icon: "🎓",
    suggestedCategories: ["resume", "reference", "credential", "portfolio"],
  },
  {
    type: "tech_job",
    icon: "💼",
    suggestedCategories: ["resume", "cover_letter", "portfolio"],
  },
  {
    type: "speaking",
    icon: "🎤",
    suggestedCategories: ["bio", "photo", "portfolio"],
  },
  {
    type: "funding",
    icon: "💰",
    suggestedCategories: ["resume", "portfolio", "reference", "credential"],
  },
  {
    type: "custom",
    icon: "🗂️",
    suggestedCategories: [],
  },
];

export function getBundleTemplate(
  key: BundleTemplateKey | null | undefined,
): BundleTemplateDefinition {
  return (
    BUNDLE_TEMPLATES.find((t) => t.type === key) ??
    BUNDLE_TEMPLATES[BUNDLE_TEMPLATES.length - 1]
  );
}
