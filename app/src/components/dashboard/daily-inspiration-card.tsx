"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { INSPIRATION_VIDEOS, inspirationById, type InspirationVideo } from "@/lib/constants/inspiration-videos";

type DailyInspirationCopy = {
  title: string;
  watchYoutube: string;
  markWatched: string;
  saveNotes: string;
  newVideo: string;
};

type DailyInspirationCardProps = {
  copy: DailyInspirationCopy;
};

function pickRandomVideo(currentId: string | null): InspirationVideo {
  const pool = INSPIRATION_VIDEOS.filter((v) => v.id !== currentId);
  const list = pool.length ? pool : INSPIRATION_VIDEOS;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function DailyInspirationCard({ copy }: DailyInspirationCardProps) {
  const defaultVideo = useMemo(() => inspirationById("q13xr9KBABE") ?? INSPIRATION_VIDEOS[0]!, []);
  const [video, setVideo] = useState<InspirationVideo>(defaultVideo);
  const [loading, setLoading] = useState(false);
  const [watched, setWatched] = useState(false);

  const thumbUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  const watchHref = `https://www.youtube.com/watch?v=${video.id}`;

  const shuffle = () => {
    setLoading(true);
    window.setTimeout(() => {
      setVideo((v) => pickRandomVideo(v.id));
      setWatched(false);
      setLoading(false);
    }, 450);
  };

  return (
    <GlassTintPanel tint="violet" className="p-5 md:max-xl:p-6 xl:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
        <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border lg:w-[min(44%,320px)] lg:aspect-auto lg:min-h-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail */}
          <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {video.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{video.channel}</p>
            <Badge
              variant="secondary"
              className="mt-2 border-0 bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary"
            >
              {video.tag}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{video.description}</p>
          <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={watchHref}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "h-11 min-h-11 gap-2 rounded-xl px-4 font-semibold shadow-sm",
              })}
            >
              <ExternalLink className="h-4 w-4" />
              {copy.watchYoutube}
            </a>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl text-sm text-foreground">
              <Checkbox checked={watched} onCheckedChange={(v) => setWatched(v === true)} />
              {copy.markWatched}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
                onClick={shuffle}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {copy.newVideo}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GlassTintPanel>
  );
}
