import type { SoftwareVaultEntry } from "@/types/database";

export type VaultUsageTool = {
  id: string;
  name: string;
  iconUrl: string | null;
  count: number;
  lastUsedAt: string | null;
  share: number;
};

export type VaultUsageDistributionItem = {
  id: string;
  name: string;
  count: number;
};

export type VaultUsageAnalytics = {
  totalUses: number;
  totalTools: number;
  trackedTools: number;
  mostUsed: VaultUsageTool | null;
  lastRecorded: VaultUsageTool | null;
  tools: VaultUsageTool[];
  recentTools: VaultUsageTool[];
  distribution: VaultUsageDistributionItem[];
};

function safeUsageCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count);
}

function dateValue(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildVaultUsageAnalytics(
  entries: SoftwareVaultEntry[],
): VaultUsageAnalytics {
  const totalUses = entries.reduce(
    (total, entry) => total + safeUsageCount(entry.launch_count),
    0,
  );

  const tools = entries
    .map<VaultUsageTool>((entry) => {
      const count = safeUsageCount(entry.launch_count);
      return {
        id: entry.id,
        name: entry.app_name,
        iconUrl: entry.icon_url,
        count,
        lastUsedAt: entry.last_opened_at,
        share: totalUses > 0 ? count / totalUses : 0,
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        dateValue(b.lastUsedAt) - dateValue(a.lastUsedAt) ||
        a.name.localeCompare(b.name),
    );

  const recentTools = tools
    .filter((tool) => dateValue(tool.lastUsedAt) > 0)
    .sort(
      (a, b) =>
        dateValue(b.lastUsedAt) - dateValue(a.lastUsedAt) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );

  const trackedTools = tools.filter((tool) => tool.count > 0).length;
  const mostUsed = tools.find((tool) => tool.count > 0) ?? null;
  const lastRecorded = recentTools[0] ?? null;
  const leadingTools = tools.filter((tool) => tool.count > 0).slice(0, 5);
  const otherCount = tools
    .filter((tool) => tool.count > 0)
    .slice(5)
    .reduce((total, tool) => total + tool.count, 0);

  return {
    totalUses,
    totalTools: tools.length,
    trackedTools,
    mostUsed,
    lastRecorded,
    tools,
    recentTools,
    distribution: [
      ...leadingTools.map(({ id, name, count }) => ({ id, name, count })),
      ...(otherCount > 0
        ? [{ id: "other", name: "Other", count: otherCount }]
        : []),
    ],
  };
}
