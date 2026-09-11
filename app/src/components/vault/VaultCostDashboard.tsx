"use client";

import { useId, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Wallet } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { buildRecordedCostBreakdown, type RecordedCostRow } from "@/lib/vault/cost-breakdown";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { osGlassPanelClassName } from "@/components/ui/os-glass";

const INITIAL_ROWS = 5;
const BAR_COLORS = ["bg-lime-500 dark:bg-lime-300", "bg-sky-500 dark:bg-sky-400", "bg-violet-500 dark:bg-violet-400", "bg-amber-500 dark:bg-amber-400", "bg-teal-500 dark:bg-teal-400", "bg-rose-500 dark:bg-rose-400"];

type Props = {
  entries: SoftwareVaultEntry[];
  onSelectEntry?: (id: string) => void;
};

/** An unfiltered, per-currency overview of recorded active recurring costs. */
export function VaultCostDashboard({ entries, onSelectEntry }: Props) {
  const language = useAppStore((s) => s.language);
  const zh = language.startsWith("zh");
  const headingId = useId();
  const breakdownId = useId();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { groups, excluded, unchecked, activeCount, freeCount } = useMemo(
    () => buildRecordedCostBreakdown(entries),
    [entries],
  );
  // A removed currency must not leave the dashboard on an empty selection.
  const group = groups.find((item) => item.currency === selectedCurrency) ?? groups[0];
  const formatter = useMemo(
    () => new Intl.NumberFormat(zh ? "zh-Hant" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [zh],
  );
  const money = (amount: number) => `${group?.currency ?? ""} ${formatter.format(amount)}`.trim();
  const perMonth = zh ? "／月" : "/mo";
  const rows = group?.rows ?? [];
  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const maxAmount = rows[0]?.monthlyAmount ?? 0;
  const shareLabel = (share: number) => share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;

  function renderRow(row: RecordedCostRow, index: number) {
    const color = BAR_COLORS[index % BAR_COLORS.length];
    const content = (
      <>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-sm font-semibold text-foreground">
          {row.entry.app_name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="min-w-0 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{row.entry.app_name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{money(row.monthlyAmount)}</span>{perMonth}
              <span className="ml-2 opacity-75">{shareLabel(row.share)}</span>
            </span>
          </span>
          <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-muted/60">
            <span
              className={cn("block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", color)}
              style={{ width: `${maxAmount > 0 ? (row.monthlyAmount / maxAmount) * 100 : 0}%` }}
            />
          </span>
        </span>
        {onSelectEntry ? <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" /> : null}
      </>
    );
    const rowClass = "group flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 text-left";
    return (
      <li key={row.entry.id} className="min-w-0">
        {onSelectEntry ? (
          <button
            type="button"
            onClick={() => onSelectEntry(row.entry.id)}
            aria-label={`${zh ? "查看" : "View"} ${row.entry.app_name}: ${money(row.monthlyAmount)}${perMonth}, ${shareLabel(row.share)}`}
            className={cn(rowClass, "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none")}
          >
            {content}
          </button>
        ) : <div className={rowClass}>{content}</div>}
      </li>
    );
  }

  return (
    <section aria-labelledby={headingId} className={cn(osGlassPanelClassName, "min-w-0 p-4 sm:p-5")}>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-8">
        <div className="min-w-0 rounded-xl border border-border/50 bg-gradient-to-br from-primary/10 via-background/30 to-transparent p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Wallet aria-hidden="true" className="h-4 w-4" />
            {zh ? "費用總覽" : "Spend overview"}
          </div>
          <h2 id={headingId} className="text-sm font-medium text-muted-foreground">{zh ? "每月費用估計" : "Estimated monthly cost"}</h2>
          {groups.length > 1 ? (
            <div role="group" aria-label={zh ? "選擇貨幣" : "Choose currency"} className="mt-3 flex flex-wrap gap-1.5">
              {groups.map((item) => (
                <button
                  key={item.currency}
                  type="button"
                  aria-pressed={group?.currency === item.currency}
                  onClick={() => { setSelectedCurrency(item.currency); setShowAll(false); }}
                  className={cn("min-h-9 rounded-lg border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", group?.currency === item.currency ? "border-primary/40 bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted/50")}
                >{item.currency}</button>
              ))}
            </div>
          ) : null}
          <div aria-live="polite" aria-atomic="true" className="mt-3">
            <p className="break-words text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl [overflow-wrap:anywhere]">
              {group ? <><span className="mr-2 text-base font-medium text-muted-foreground">{group.currency}</span>{formatter.format(group.total)}</> : "—"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {group
                ? zh ? `${rows.length} 個 app 的每月等值費用` : `Monthly equivalent across ${rows.length} ${rows.length === 1 ? "app" : "apps"}`
                : zh ? "尚未記錄可計算的定期費用" : "No recurring costs recorded yet"}
            </p>
          </div>
          {group && group.total > 0 ? (
            <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
              {rows.map((row, index) => (
                <span key={row.entry.id} className={cn("h-full shrink-0", BAR_COLORS[index % BAR_COLORS.length])} style={{ width: `${row.share}%` }} title={`${row.entry.app_name}: ${money(row.monthlyAmount)}${perMonth}`} />
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>{zh ? "使用中" : "Active apps"} <strong className="ml-1 text-foreground">{activeCount}</strong></span>
            <span>{zh ? "免費" : "Free apps"} <strong className="ml-1 text-foreground">{freeCount}</strong></span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2">
            <h3 className="text-sm font-semibold text-foreground">{zh ? "費用分佈" : "Where your money goes"}</h3>
            <span className="text-xs text-muted-foreground">{zh ? "按月費由高至低" : "Highest monthly cost first"}</span>
          </div>
          {rows.length > 0 ? (
            <>
              <ul id={breakdownId} aria-label={zh ? "各 app 的每月費用" : "Monthly cost by app"} className="min-w-0 space-y-0.5">
                {visibleRows.map(renderRow)}
              </ul>
              {rows.length > INITIAL_ROWS ? (
                <button
                  type="button"
                  aria-expanded={showAll}
                  aria-controls={breakdownId}
                  onClick={() => setShowAll((value) => !value)}
                  className="mt-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {showAll ? zh ? "收起" : "Show fewer" : zh ? `顯示全部 ${rows.length} 個 app` : `Show all ${rows.length} apps`}
                  <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5", showAll && "rotate-180")} />
                </button>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-8 text-center text-sm leading-relaxed text-muted-foreground">
              {zh ? "為使用中的付費 app 記錄金額、貨幣及付款週期，即可查看費用分佈。免費及一次性購買不會當成月費。" : "Add an amount, currency and billing period to an active paid app to see its cost here. Free apps and one-time purchases are not monthly charges."}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
        <p className="min-w-0 flex-1 basis-64">{zh ? "按所有使用中付費 app 的記錄換算，不受下方篩選影響。年費及其他定期費用換算為月費；不同貨幣分開顯示，不作即時查價或換匯。" : "All active paid apps, independent of filters below. Annual and other recurring charges are normalized monthly. Currencies stay separate; no live price check or conversion."}</p>
        {excluded > 0 || unchecked > 0 ? (
          <details className="min-w-0 max-w-full basis-full sm:basis-auto sm:max-w-sm">
            <summary className="cursor-pointer rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {zh ? `${excluded} 個未計入 · ${unchecked} 個價格待核對` : `${excluded} not included · ${unchecked} prices to review`}
            </summary>
            <p className="mt-2">{zh ? "未計入：金額、貨幣或定期付款週期不完整，或屬一次性購買。待核對：無價格核對日期、日期在未來，或超過 90 天未核對。" : "Not included: missing amount, currency or recurring period, or a one-time purchase. Review: no pricing check date, a future date, or a check older than 90 days."}</p>
          </details>
        ) : null}
      </div>
    </section>
  );
}
