import type {
  AITool,
  CareerProfile,
  CareerVaultFile,
  LocalizedString,
  PromptCategory,
  PromptUsageHistory,
  SystemPromptTemplate,
  UserAIPreferences,
  UserCustomPrompt,
  UserPromptFavorite,
} from "./database";

export type {
  AITool,
  CareerProfile,
  LocalizedString,
  PromptCategory,
  PromptUsageHistory,
  SystemPromptTemplate,
  UserAIPreferences,
  UserCustomPrompt,
  UserPromptFavorite,
};

/**
 * Union over system + custom prompts — normalised so UI code can treat them
 * uniformly. Every card, every use-flow step works on this shape.
 */
export type AnyPrompt =
  | {
      kind: "system";
      id: string;
      slug: string;
      icon: string;
      category: PromptCategory;
      title_i18n: LocalizedString;
      description_i18n: LocalizedString;
      prompt_i18n: LocalizedString;
      required_variables: string[];
      optional_variables: string[];
      attachment_categories: string[];
      template: SystemPromptTemplate;
    }
  | {
      kind: "custom";
      id: string;
      icon: string;
      title: string;
      prompt_body: string;
      tags: string[];
      required_variables: string[];
      optional_variables: string[];
      attachment_categories: string[];
      is_favorite: boolean;
      usage_count: number;
      custom: UserCustomPrompt;
    };

export type VaultFile = CareerVaultFile;

export type CareerCoachTab = "all" | "favorites" | "recent";
export type CareerCoachCategoryFilter = PromptCategory | "all";

export interface CompiledPromptMeta {
  /** Character count of the compiled prompt (cheap token proxy). */
  chars: number;
  /** Rough token estimate: chars / 4. */
  approxTokens: number;
  /** Whether the dispatch URL for the selected tool supports query prefill. */
  urlSupportsPrefill: boolean;
}
