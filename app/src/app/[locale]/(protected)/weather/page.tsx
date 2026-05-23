"use client";

import { useMemo } from "react";

import { PageShell } from "@/components/shared/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useWeatherPage } from "@/hooks/weather/use-weather-page";
import { getWeatherUiCopy } from "@/lib/i18n/weather-ui";
import { useAppStore } from "@/stores/app-store";

/**
 * Phase A skeleton: page mounts under Command Center between Calendar
 * and Analytics. Data layer is fully wired (current + hourly + daily +
 * Unsplash + scene + insight). UI sections render placeholder cards
 * showing the resolved data inline so we can validate the pipeline
 * before Phase B builds the cinematic hero / metric cards.
 */
export default function WeatherPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getWeatherUiCopy(language), [language]);

  const { data, scene, insight } = useWeatherPage();

  return (
    <PageShell title={copy.pageTitle} description={copy.pageSubtitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              {data.errorMessage && (
                <span className="text-destructive">{data.errorMessage}</span>
              )}
            </div>
            {data.location && (
              <p className="text-muted-foreground">
                {data.location.displayLabel} ({data.location.latitude.toFixed(3)},{" "}
                {data.location.longitude.toFixed(3)}) — {data.location.precision}
              </p>
            )}
            {data.current && (
              <p>
                {data.current.temperature}° · {data.current.condition} · Feels{" "}
                {data.current.feelsLike}° · H{data.current.high}° / L{data.current.low}°
              </p>
            )}
            {scene && (
              <p className="text-xs text-muted-foreground">
                Scene: <code>{scene.id}</code> · layers{" "}
                {Object.entries(scene.layers)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ") || "none"}
              </p>
            )}
            {data.backgroundCredit && (
              <p className="text-xs text-muted-foreground">
                {copy.photoCredit(data.backgroundCredit.name)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hourly forecast (next 24h)</CardTitle>
              <Badge variant="secondary">Phase B</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {data.hourly.slice(0, 8).map((h) => (
                <div
                  key={h.time}
                  className="min-w-[80px] rounded-md border border-border bg-muted/30 p-2 text-center text-xs"
                >
                  <div className="text-muted-foreground">{h.hourLabel}</div>
                  <div className="text-base font-semibold">{h.temperature}°</div>
                  <div className="truncate">{h.condition}</div>
                  <div className="text-primary">{h.rainChance}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daily forecast (real + extended)</CardTitle>
              <Badge variant="secondary">Phase D</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {data.daily.map((d) => (
                <li key={d.date} className="flex items-center justify-between gap-3">
                  <span className="w-12 text-muted-foreground">{d.dayLabel}</span>
                  <span className="w-24">{d.condition}</span>
                  <span>
                    {d.high}° / {d.low}°
                  </span>
                  <span className="text-primary">{d.rainChance}%</span>
                  <Badge
                    variant={d.confidence === "high" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {d.confidence}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {insight && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{copy.aiBriefTitle}</CardTitle>
                <Badge variant="secondary">Phase C</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{insight.brief}</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <ul className="ml-5 list-disc text-xs text-muted-foreground">
                {insight.reminders.map((r, i) => (
                  <li key={i}>{r.message}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {status}
    </Badge>
  );
}
