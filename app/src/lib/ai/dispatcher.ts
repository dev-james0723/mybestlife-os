import type { AITool } from "@/types/ai-coach";
import { copyToClipboard } from "./clipboard";
import { getAITool } from "./tool-registry";

export interface DispatchOptions {
  prompt: string;
  tool: AITool;
  /** Only used when tool === 'custom'. */
  customUrl?: string | null;
  /** Default true. */
  autoCopy?: boolean;
}

export interface DispatchResult {
  /** Whether the prompt was successfully copied to the clipboard. */
  copied: boolean;
  /** The URL we opened (empty string = could not open). */
  url: string;
  /** Whether we actually managed to open a new tab. */
  opened: boolean;
  /** True if the URL contained the prompt (prefill succeeded). */
  urlPrefilled: boolean;
}

/**
 * Dispatch a compiled prompt to the chosen AI tool.
 *
 * Important UX guarantees:
 *   1. Clipboard is the primary transport — many tools don't support URL
 *      prefill and some truncate long prompts.
 *   2. Opens in a new tab; never navigates the current tab.
 *   3. Long prompts that would bust URL limits fall back to the tool's
 *      homepage rather than a corrupted query.
 */
export async function dispatchToAI(
  options: DispatchOptions,
): Promise<DispatchResult> {
  const { prompt, tool, customUrl, autoCopy = true } = options;

  const copied = autoCopy ? await copyToClipboard(prompt) : false;

  // Custom tool — trust the user's URL verbatim.
  if (tool === "custom") {
    const url = (customUrl ?? "").trim();
    if (!url) {
      return { copied, url: "", opened: false, urlPrefilled: false };
    }
    const opened = openInNewTab(url);
    return { copied, url, opened, urlPrefilled: false };
  }

  const meta = getAITool(tool);
  const useUrlPrefill =
    meta.supportsUrlPrefill && prompt.length <= meta.urlPrefillCharLimit;

  const url = useUrlPrefill ? meta.buildUrl(prompt) : meta.buildUrl("");
  const opened = openInNewTab(url);

  return { copied, url, opened, urlPrefilled: useUrlPrefill };
}

function openInNewTab(url: string): boolean {
  if (!url || typeof window === "undefined") return false;
  const w = window.open(url, "_blank", "noopener,noreferrer");
  return w != null;
}
