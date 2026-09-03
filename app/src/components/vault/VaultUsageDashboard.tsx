"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Clock3,
  MousePointerClick,
  Trophy,
} from "lucide-react";
import { OSFrostedPanel, OSGlassPanel } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { getVaultUsageCopy } from "@/lib/i18n/vault-usage-ui";
import {
  buildVaultUsageAnalytics,
  type VaultUsageTool,
} from "@/lib/vault/usage-analytics";
import type { SoftwareVaultEntry } from "@/types/database";

const CHART_COLORS = [
  "#a3e635",
  "#38bdf8",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#94a3b8",
];

type Props = {
  entries: SoftwareVaultEntry[];
};

type UsageTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: { name?: string; count?: number };
  }>;
  usesLabel: string;
};

function UsageTooltip({ active, payload, usesLabel }: UsageTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="max-w-44 truncate font-semibold">{item.name}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{item.count ?? 0}</span>{" "}
        {usesLabel}
      </p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <OSGlassPanel className="relative min-h-28 overflow-hidden p-4">
      <div className="absolute right-3 top-3 rounded-xl border border-white/10 bg-white/5 p-2 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="pr-10 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums" title={String(value)}>
        {value}
      </p>
      {detail ? (
        <p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </p>
      ) : null}
    </OSGlassPanel>
  );
}

function AppMark({ tool }: { tool: VaultUsageTool }) {
  if (tool.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-saved remote app icon
      <img
        src={tool.iconUrl}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-xl bg-background/60 object-contain ring-1 ring-border/60"
      />
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/20">
      {tool.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function VaultUsageDashboard({ entries }: Props) {
  const language = useAppStore((state) => state.language);
  const copy = getVaultUsageCopy(language);
  const analytics = useMemo(() => buildVaultUsageAnalytics(entries), [entries]);
  const topTools = analytics.tools.filter((tool) => tool.count > 0).slice(0, 8);
  const maxCount = Math.max(1, ...analytics.tools.map((tool) => tool.count));
  const number = useMemo(() => new Intl.NumberFormat(language), [language]);
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }),
    [language],
  );

  const formatLastUsed = (value: string | null) => {
    if (!value) return copy.never;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? copy.never : dateTime.format(date);
  };

  return (
    <section className="space-y-5" data-testid="vault-usage-dashboard">
      <OSFrostedPanel as="section" className="overflow-hidden p-5 sm:p-6">
        <div className="relative z-10 flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <BarChart3 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {copy.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </div>
      </OSFrostedPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={MousePointerClick}
          label={copy.totalUses}
          value={number.format(analytics.totalUses)}
          detail={copy.uses}
        />
        <MetricCard
          icon={Activity}
          label={copy.trackedTools}
          value={`${number.format(analytics.trackedTools)} / ${number.format(analytics.totalTools)}`}
        />
        <MetricCard
          icon={Trophy}
          label={copy.mostUsed}
          value={analytics.mostUsed?.name ?? "—"}
          detail={analytics.mostUsed ? `${number.format(analytics.mostUsed.count)} ${copy.uses}` : copy.never}
        />
        <MetricCard
          icon={Clock3}
          label={copy.lastRecorded}
          value={analytics.lastRecorded?.name ?? "—"}
          detail={formatLastUsed(analytics.lastRecorded?.lastUsedAt ?? null)}
        />
      </div>

      {analytics.totalUses === 0 ? (
        <OSFrostedPanel className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground ring-1 ring-border/60">
            <Activity className="size-5" aria-hidden />
          </span>
          <h3 className="mt-4 font-heading text-lg font-semibold">{copy.noUsageTitle}</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {copy.noUsageDescription}
          </p>
        </OSFrostedPanel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <OSFrostedPanel as="section" className="min-w-0 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold">{copy.frequencyTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.frequencyDescription}
              </p>
            </div>
            <div
              className="h-[min(23rem,70vh)] min-h-64 w-full min-w-0"
              role="img"
              aria-label={copy.frequencyTitle}
              data-testid="vault-usage-frequency-chart"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 480, height: 320 }}
              >
                <BarChart
                  data={topTools}
                  layout="vertical"
                  margin={{ top: 4, right: 22, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient id="vault-usage-bar" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#84cc16" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.88} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 11, opacity: 0.55 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    tickFormatter={(value: string) => value.length > 12 ? `${value.slice(0, 11)}…` : value}
                  />
                  <Tooltip
                    cursor={{ fill: "currentColor", opacity: 0.04 }}
                    content={<UsageTooltip usesLabel={copy.uses} />}
                  />
                  <Bar dataKey="count" fill="url(#vault-usage-bar)" radius={[0, 8, 8, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </OSFrostedPanel>

          <OSFrostedPanel as="section" className="min-w-0 p-4 sm:p-5">
            <div>
              <h3 className="font-heading text-base font-semibold">{copy.distributionTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.distributionDescription}
              </p>
            </div>
            <div
              className="mx-auto mt-2 h-56 w-full max-w-sm"
              role="img"
              aria-label={copy.distributionTitle}
              data-testid="vault-usage-distribution-chart"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 320, height: 224 }}
              >
                <PieChart>
                  <Pie
                    data={analytics.distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={86}
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {analytics.distribution.map((item, index) => (
                      <Cell key={item.id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<UsageTooltip usesLabel={copy.uses} />} />
                  <text x="50%" y="47%" textAnchor="middle" className="fill-foreground text-2xl font-semibold tabular-nums">
                    {number.format(analytics.totalUses)}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-wider">
                    {copy.uses}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {analytics.distribution.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {item.id === "other" ? copy.other : item.name}
                  </span>
                  <span className="font-medium tabular-nums">{number.format(item.count)}</span>
                  <span className="w-10 text-right tabular-nums text-muted-foreground">
                    {Math.round((item.count / analytics.totalUses) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </OSFrostedPanel>
        </div>
      )}

      <OSFrostedPanel as="section" className="overflow-hidden p-0">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <h3 className="font-heading text-base font-semibold">{copy.rankingTitle}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.rankingDescription}</p>
        </div>
        <div className="divide-y divide-border/50">
          {analytics.tools.map((tool, index) => (
            <div
              key={tool.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5"
            >
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <AppMark tool={tool} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{tool.name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums sm:hidden">
                      {number.format(tool.count)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/70">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#84cc16,#38bdf8)] transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${tool.count === 0 ? 0 : Math.max(4, (tool.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                    {formatLastUsed(tool.lastUsedAt)}
                  </p>
                </div>
              </div>
              <div className="hidden min-w-20 text-right sm:block">
                <p className="text-lg font-semibold tabular-nums">{number.format(tool.count)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{copy.uses}</p>
              </div>
            </div>
          ))}
        </div>
      </OSFrostedPanel>
    </section>
  );
}
