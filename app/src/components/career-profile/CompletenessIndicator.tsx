"use client";

interface Props {
  percent: number;
  label: string;
}

export function CompletenessIndicator({ percent, label }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="relative h-14 w-14 shrink-0" aria-hidden>
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${safe}, 100`}
            className="text-emerald-500"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">
          {safe}%
        </span>
      </div>
      <div className="text-sm">{label}</div>
    </div>
  );
}
