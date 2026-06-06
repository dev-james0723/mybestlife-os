/**
 * Text / markup / code ingestion adapter.
 *
 * This is the "Text" tab of the Add Knowledge modal, post-classification.
 * For HTML, Markdown, and any detected programming language we encode the
 * content via `code-content.ts` so the detail view can toggle between
 * Preview and Source. For plain text we store it raw.
 */

import {
  encodeCodeContent,
  type KnowledgeContentLanguage,
} from "@/lib/knowledge/code-content";
import { getSourceTypeInfo } from "@/lib/knowledge/labels";
import { contentTypeForSourceType } from "@/types/knowledge";
import type { SourceType } from "@/types/knowledge-source";
import type { NormalizedIngest } from "./types";

export type MarkupIngestInput = {
  sourceType: SourceType;
  /** Preview-ready HTML from the rich-text editor, if the user had one. */
  richHtml?: string;
  /** Plaintext version of the user's input (used as AI input). */
  plainText: string;
  /** The underlying source used for a code payload (overrides plainText). */
  codeSource?: string;
  /** User-provided (or AI-suggested) title. */
  title: string;
  /** User-chosen default display mode for preview-capable types. */
  displayModeDefault?: "preview" | "source";
};

const CODE_LANGUAGE_MAP: Partial<Record<SourceType, KnowledgeContentLanguage>> = {
  html_input: "html",
  markdown_input: "markdown",
  code_python: "python",
  code_javascript: "javascript",
  code_typescript: "typescript",
  code_java: "java",
  code_php: "php",
  code_css: "css",
  code_sql: "sql",
  code_bash: "bash",
  code_json: "json",
};

export function ingestMarkupInput(input: MarkupIngestInput): NormalizedIngest {
  const info = getSourceTypeInfo(input.sourceType);
  const contentType = contentTypeForSourceType(input.sourceType);

  const language = CODE_LANGUAGE_MAP[input.sourceType];
  const isEncoded = Boolean(language);

  const source = (input.codeSource ?? input.plainText ?? "").toString();
  const rawContent = isEncoded
    ? encodeCodeContent({
        source,
        language: language!,
        preferredView: input.displayModeDefault ?? info.defaultDisplayMode,
      })
    : input.richHtml?.trim() || input.plainText;

  const title = input.title.trim() || defaultTitleForSourceType(input.sourceType);

  return {
    sourceType: input.sourceType,
    provider: "local",
    category: info.category,
    label: info.label,
    title,
    titleSource: input.title.trim() ? "extracted" : "fallback",
    rawContent,
    aiInputText: input.plainText || source,
    metadata: {
      codeLanguage: language ?? (input.sourceType === "plain_text" ? "text" : undefined),
    },
    extractionStatus: "success",
    transcriptStatus: "not_applicable",
    askEnabled: info.askEnabled,
    displayModeDefault: info.supportsPreview
      ? input.displayModeDefault ?? info.defaultDisplayMode
      : undefined,
    contentType,
  };
}

function defaultTitleForSourceType(sourceType: SourceType): string {
  const info = getSourceTypeInfo(sourceType);
  return `Untitled ${info.label}`;
}
