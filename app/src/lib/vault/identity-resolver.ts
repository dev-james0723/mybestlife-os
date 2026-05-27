import { parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";
import { searchDuckDuckGo } from "@/lib/search/duckduckgo-html";
import { fetchPageMeta, isValidPublicUrl } from "@/lib/vault/safe-fetch";
import { buildGitHubVaultContext } from "@/lib/vault/github-autofill";
import type { AppCandidate, SoftwareType } from "@/types/vault-smart-autofill";

export type VaultInputType = "url" | "github" | "name" | "description";

const DESCRIPTION_WORD_THRESHOLD = 6;

export function detectInputType(query: string): VaultInputType {
  const trimmed = query.trim();
  if (!trimmed) return "name";
  if (parseGitHubRepoUrl(trimmed) != null) return "github";
  if (isValidPublicUrl(trimmed)) return "url";
  const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  if (parseGitHubRepoUrl(withScheme) != null) return "github";
  if (isValidPublicUrl(withScheme) && /\./.test(trimmed)) return "url";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= DESCRIPTION_WORD_THRESHOLD) return "description";
  return "name";
}

function slugId(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function inferSoftwareType(haystack: string, isGithub: boolean): SoftwareType {
  const s = haystack.toLowerCase();
  if (isGithub && /open.?source|github|repository|cli/.test(s)) return "open_source";
  if (/\bide\b|editor|vscode|cursor|windsurf/.test(s)) return "ide";
  if (/cli|terminal|command.?line/.test(s)) return "cli";
  if (/extension|chrome|firefox|plugin/.test(s)) return "browser_extension";
  if (/npm|pypi|package|library|sdk/.test(s)) return "library";
  if (/desktop|macos|windows|linux app/.test(s)) return "desktop";
  if (/ios|android|mobile/.test(s)) return "mobile";
  if (/saas|cloud|subscription|web app/.test(s)) return "saas";
  return "unknown";
}

function domainCompany(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length >= 2) return parts[parts.length - 2]!.charAt(0).toUpperCase() + parts[parts.length - 2]!.slice(1);
  } catch {
    /* ignore */
  }
  return undefined;
}

async function candidateFromUrl(url: string): Promise<AppCandidate | null> {
  const gh = parseGitHubRepoUrl(url);
  if (gh) {
    const ctx = await buildGitHubVaultContext(url).catch(() => null);
    const name = ctx?.repoMeta.name ?? gh.repo;
    const displayName = name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: slugId(`${gh.owner}-${gh.repo}`),
      name: displayName,
      description: ctx?.repoMeta.description ?? undefined,
      icon_url: ctx?.iconUrl ?? undefined,
      official_url: ctx?.repoMeta.homepage ?? undefined,
      github_url: ctx?.canonicalUrl ?? url,
      company: gh.owner,
      software_type: "open_source",
      popularity_signal:
        ctx?.repoMeta.stars != null ? `${ctx.repoMeta.stars.toLocaleString()} GitHub stars` : undefined,
      confidence: "high",
      source: "github",
    };
  }

  const meta = await fetchPageMeta(url);
  if (!meta?.title) return null;
  const title = meta.title.replace(/\s*[|—–-].*$/, "").trim().slice(0, 80);
  return {
    id: slugId(title),
    name: title,
    description: meta.description ?? undefined,
    official_url: meta.url,
    software_type: inferSoftwareType(`${title} ${meta.description ?? ""}`, false),
    company: domainCompany(meta.url),
    confidence: "high",
    source: "official_site",
  };
}

async function candidatesFromSearch(query: string): Promise<AppCandidate[]> {
  const hits = await searchDuckDuckGo(`${query} official software app`, { maxHits: 6 }).catch(
    () => [],
  );
  const out: AppCandidate[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    if (!isValidPublicUrl(hit.url)) continue;
    const host = (() => {
      try {
        return new URL(hit.url).hostname;
      } catch {
        return hit.url;
      }
    })();
    if (seen.has(host)) continue;
    seen.add(host);

    if (/reddit\.com|stackoverflow|youtube|wikipedia|medium\.com|news\./i.test(host)) continue;

    const gh = parseGitHubRepoUrl(hit.url);
    const name = hit.title
      .replace(/\s*[-|–—].*$/, "")
      .replace(/\s*\|.*$/, "")
      .trim()
      .slice(0, 80);
    if (!name || name.length < 2) continue;

    out.push({
      id: slugId(`${name}-${host}`),
      name,
      description: hit.snippet || undefined,
      official_url: gh ? undefined : hit.url,
      github_url: gh ? hit.url : undefined,
      company: domainCompany(gh ? undefined : hit.url) ?? (gh ? hit.url.split("/")[3] : undefined),
      software_type: inferSoftwareType(`${name} ${hit.snippet}`, !!gh),
      popularity_signal: hit.snippet?.slice(0, 80),
      confidence: out.length === 0 ? "medium" : "low",
      source: gh ? "github" : "search",
    });
    if (out.length >= 5) break;
  }

  return out;
}

export async function resolveCandidates(
  query: string,
  options?: { selectedUrl?: string },
): Promise<{ inputType: VaultInputType; candidates: AppCandidate[]; autoSelect: AppCandidate | null }> {
  const trimmed = query.trim();
  const inputType = detectInputType(trimmed);

  if (options?.selectedUrl && isValidPublicUrl(options.selectedUrl)) {
    const one = await candidateFromUrl(options.selectedUrl);
    if (one) {
      return { inputType, candidates: [one], autoSelect: one };
    }
  }

  if (inputType === "github" || inputType === "url") {
    const url =
      isValidPublicUrl(trimmed) ? trimmed : isValidPublicUrl(`https://${trimmed}`) ? `https://${trimmed}` : null;
    if (url) {
      const one = await candidateFromUrl(url);
      if (one) {
        return { inputType, candidates: [one], autoSelect: one };
      }
    }
  }

  const searched = await candidatesFromSearch(trimmed);
  if (searched.length === 0) {
    const fallback: AppCandidate = {
      id: slugId(trimmed),
      name: trimmed.slice(0, 80),
      description: trimmed,
      software_type: "unknown",
      confidence: "needs_user_confirmation",
      source: "llm_inference",
    };
    return { inputType, candidates: [fallback], autoSelect: null };
  }

  return { inputType, candidates: searched, autoSelect: pickAutoSelect(searched) };
}

export function pickAutoSelect(candidates: AppCandidate[]): AppCandidate | null {
  if (candidates.length === 1 && candidates[0]!.confidence === "high") {
    return candidates[0]!;
  }
  const high = candidates.filter((c) => c.confidence === "high");
  if (high.length === 1) return high[0]!;
  return null;
}
