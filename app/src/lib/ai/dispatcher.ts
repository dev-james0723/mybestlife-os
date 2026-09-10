import { copyToClipboard } from "./clipboard";
import { getAITool, type DispatchableAITool } from "./tool-registry";

export interface DispatchOptions {
  prompt: string;
  tool: DispatchableAITool;
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
  /** True if the prompt was handed to the provider through its URL contract. */
  urlPrefilled: boolean;
}

/**
 * Dispatch a compiled prompt to the chosen AI tool.
 *
 * Important UX guarantees:
 *   1. Clipboard is always populated as a reliable fallback because provider
 *      URL-prefill behavior can change and long prompts may be truncated.
 *   2. Opens in a new tab; never navigates the current tab.
 *   3. Long prompts that would bust URL limits fall back to the tool's
 *      homepage rather than a corrupted query.
 */
export async function dispatchToAI(
  options: DispatchOptions,
): Promise<DispatchResult> {
  const { prompt, tool, customUrl, autoCopy = true } = options;

  // Custom tool — trust the user's URL verbatim.
  if (tool === "custom") {
    const url = (customUrl ?? "").trim();
    if (!url) {
      const copied = autoCopy ? await copyToClipboard(prompt) : false;
      return { copied, url: "", opened: false, urlPrefilled: false };
    }
    const opened = openInNewTab(url);
    const copied = autoCopy ? await copyToClipboard(prompt) : false;
    return { copied, url, opened, urlPrefilled: false };
  }

  const meta = getAITool(tool);
  const useUrlPrefill =
    meta.supportsUrlPrefill &&
    encodeURIComponent(prompt).length <= meta.urlPrefillCharLimit;

  const url = useUrlPrefill ? meta.buildUrl(prompt) : meta.buildUrl("");
  // Open while the click still has a browser user-activation token. Awaiting
  // Clipboard first makes Safari/iPadOS treat the new tab as a popup.
  const opened = openInNewTab(url);
  const copied = autoCopy ? await copyToClipboard(prompt) : false;

  return { copied, url, opened, urlPrefilled: useUrlPrefill };
}

function openInNewTab(url: string): boolean {
  if (!url || typeof window === "undefined") return false;
  const w = window.open(url, "_blank");
  if (w) {
    try {
      w.opener = null;
    } catch {
      // Cross-origin browser hardening may make opener read-only. The target
      // still opened successfully, so keep the dispatch result accurate.
    }
  }
  return w != null;
}
