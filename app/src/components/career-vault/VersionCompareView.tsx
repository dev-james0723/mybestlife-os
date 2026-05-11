"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPage } from "@/components/shared/loading-state";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  createVaultSignedUrl,
  downloadVaultObject,
} from "@/lib/career-vault/storage";
import {
  isImageMime,
  isMarkdownMime,
  isPdfMime,
  formatFileSize,
  formatRelativeShort,
} from "@/lib/career-vault/utils";
import {
  useCareerVaultFile,
} from "@/hooks/use-career-vault";
import { useFileVersions } from "@/hooks/use-career-vault-versions";
import type { CareerVaultFile, CareerVaultFileVersion } from "@/types/career-vault";
import { diffLines, type DiffRow } from "@/lib/career-vault/line-diff";

interface VersionCompareViewProps {
  fileId: string;
}

/** Logical side of the comparison: either the live current file or an archived version. */
type Side =
  | { kind: "current"; file: CareerVaultFile }
  | { kind: "past"; version: CareerVaultFileVersion };

function sideLabel(side: Side, copy: ReturnType<typeof getCareerVaultCopy>) {
  if (side.kind === "current") {
    return `${copy.versions.versionLabel(side.file.current_version)} · ${copy.versions.currentBadge}`;
  }
  return copy.versions.versionLabel(side.version.version_number);
}

function sidePath(side: Side) {
  return side.kind === "current" ? side.file.file_path : side.version.file_path;
}

function sideMime(side: Side) {
  return side.kind === "current" ? side.file.mime_type : side.version.mime_type;
}

function sideFilename(side: Side) {
  return side.kind === "current" ? side.file.filename : side.version.filename;
}

function sideSize(side: Side) {
  return side.kind === "current" ? side.file.file_size : side.version.file_size;
}

function sideTimestamp(side: Side) {
  return side.kind === "current"
    ? side.file.updated_at
    : side.version.created_at;
}

export function VersionCompareView({ fileId }: VersionCompareViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();

  const fileQuery = useCareerVaultFile(fileId);
  const versionsQuery = useFileVersions(fileId);

  // Build the flat list of sides, newest first: current on top, then past
  // versions in descending order.
  const sides: Side[] = useMemo(() => {
    const out: Side[] = [];
    if (fileQuery.data) out.push({ kind: "current", file: fileQuery.data });
    for (const v of versionsQuery.data ?? []) {
      out.push({ kind: "past", version: v });
    }
    return out;
  }, [fileQuery.data, versionsQuery.data]);

  // Default selection: left = most recent past version (or current if none),
  // right = current (if there is a past version to pair with).
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const sidesKey = sides.map((s) => (s.kind === "current" ? `c:${s.file.id}` : `v:${s.version.id}`)).join(",");
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (sides.length >= 1 && sidesKey !== seededKey) {
    setSeededKey(sidesKey);
    const current = sides[0];
    const firstPast = sides.find((s) => s.kind === "past");
    if (firstPast) {
      setLeftId(firstPast.kind === "past" ? `v:${firstPast.version.id}` : null);
      setRightId(`c:${(current as Extract<Side, { kind: "current" }>).file.id}`);
    } else {
      setLeftId(`c:${(current as Extract<Side, { kind: "current" }>).file.id}`);
      setRightId(`c:${(current as Extract<Side, { kind: "current" }>).file.id}`);
    }
  }

  const sideById = (id: string | null): Side | null => {
    if (!id) return null;
    return (
      sides.find((s) =>
        s.kind === "current"
          ? `c:${s.file.id}` === id
          : `v:${s.version.id}` === id,
      ) ?? null
    );
  };

  const left = sideById(leftId);
  const right = sideById(rightId);

  if (fileQuery.isLoading || versionsQuery.isLoading) return <LoadingPage />;
  if (!fileQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
        {copy.errors.fetchFailed}
      </div>
    );
  }

  const detailHref = withLocalePrefix(localeSlug, `/career/vault/${fileId}`);
  const historyHref = withLocalePrefix(
    localeSlug,
    `/career/vault/${fileId}/history`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={historyHref} />}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.versions.title}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.versions.compare.title}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.versions.compare.subtitle}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SidePicker
          label={copy.versions.compare.left}
          placeholder={copy.versions.compare.picker}
          sides={sides}
          value={leftId ?? ""}
          onChange={setLeftId}
          copy={copy}
        />
        <SidePicker
          label={copy.versions.compare.right}
          placeholder={copy.versions.compare.picker}
          sides={sides}
          value={rightId ?? ""}
          onChange={setRightId}
          copy={copy}
        />
      </div>

      {left && right ? (
        <CompareBody left={left} right={right} copy={copy} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Link href={detailHref} className="underline-offset-4 hover:underline">
          ← {copy.breadcrumb.vault}
        </Link>
      </p>
    </div>
  );
}

function SidePicker({
  label,
  placeholder,
  sides,
  value,
  onChange,
  copy,
}: {
  label: string;
  placeholder: string;
  sides: Side[];
  value: string;
  onChange: (id: string) => void;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {sides.map((s) => {
            const id = s.kind === "current" ? `c:${s.file.id}` : `v:${s.version.id}`;
            return (
              <SelectItem key={id} value={id}>
                {sideLabel(s, copy)} · {formatRelativeShort(sideTimestamp(s))}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function CompareBody({
  left,
  right,
  copy,
}: {
  left: Side;
  right: Side;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  const leftMime = sideMime(left);
  const rightMime = sideMime(right);

  // Same side on both picks? Show just one preview instead of duplicating.
  const same =
    sidePath(left) === sidePath(right) && leftMime === rightMime;

  if (same) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        {copy.versions.compare.noDiff}
      </div>
    );
  }

  // Text / markdown on both sides → produce real line diff.
  const bothText =
    (isMarkdownMime(leftMime) || leftMime.startsWith("text/")) &&
    (isMarkdownMime(rightMime) || rightMime.startsWith("text/"));

  if (bothText) return <TextDiff left={left} right={right} copy={copy} />;

  // Both images → side-by-side image view.
  const bothImages = isImageMime(leftMime) && isImageMime(rightMime);
  if (bothImages) return <ImageCompare left={left} right={right} copy={copy} />;

  // Otherwise fall back to visual side-by-side with a fallback note for PDFs
  // and a metadata-only view for DOCX / unknown types.
  return <MixedCompare left={left} right={right} copy={copy} />;
}

function useSideSignedUrl(side: Side, ttlSeconds = 60 * 10) {
  const [url, setUrl] = useState<string | null>(null);
  const path = sidePath(side);
  useEffect(() => {
    let cancelled = false;
    createVaultSignedUrl(path, ttlSeconds)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, ttlSeconds]);
  return url;
}

function TextDiff({
  left,
  right,
  copy,
}: {
  left: Side;
  right: Side;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  const leftUrl = useSideSignedUrl(left);
  const rightUrl = useSideSignedUrl(right);
  const [leftText, setLeftText] = useState<string | null>(null);
  const [rightText, setRightText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLeftText(null);
      setRightText(null);
      try {
        const [a, b] = await Promise.all([
          leftUrl ? fetch(leftUrl).then((r) => r.text()) : Promise.resolve(""),
          rightUrl ? fetch(rightUrl).then((r) => r.text()) : Promise.resolve(""),
        ]);
        if (!cancelled) {
          setLeftText(a);
          setRightText(b);
        }
      } catch {
        if (!cancelled) {
          setLeftText("");
          setRightText("");
        }
      }
    }
    if (leftUrl && rightUrl) void run();
    return () => {
      cancelled = true;
    };
  }, [leftUrl, rightUrl]);

  const diff = useMemo(() => {
    if (leftText == null || rightText == null) return null;
    return diffLines(leftText, rightText);
  }, [leftText, rightText]);

  if (leftText == null || rightText == null || !diff) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (diff.stats.added === 0 && diff.stats.removed === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        {copy.versions.compare.noDiff}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SideHeader side={left} copy={copy} />
        <SideHeader side={right} copy={copy} />
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          +{diff.stats.added}
        </Badge>
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400">
          −{diff.stats.removed}
        </Badge>
      </div>
      <DiffTable rows={diff.rows} />
    </div>
  );
}

function DiffTable({ rows }: { rows: DiffRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className={cn(
                  "align-top",
                  r.op === "add" && "bg-emerald-500/10",
                  r.op === "remove" && "bg-rose-500/10",
                )}
              >
                <td className="w-10 select-none border-r border-border/50 px-2 py-1 text-right text-muted-foreground">
                  {r.leftNo ?? ""}
                </td>
                <td className="w-1/2 whitespace-pre-wrap break-words px-2 py-1">
                  {r.left ?? ""}
                </td>
                <td className="w-10 select-none border-r border-l border-border/50 px-2 py-1 text-right text-muted-foreground">
                  {r.rightNo ?? ""}
                </td>
                <td className="w-1/2 whitespace-pre-wrap break-words px-2 py-1">
                  {r.right ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SideHeader({
  side,
  copy,
}: {
  side: Side;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1">
      <span className="font-medium">{sideLabel(side, copy)}</span>
      <span className="text-[11px] text-muted-foreground">
        {formatFileSize(sideSize(side))}
      </span>
    </div>
  );
}

function ImageCompare({
  left,
  right,
  copy,
}: {
  left: Side;
  right: Side;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  const leftUrl = useSideSignedUrl(left);
  const rightUrl = useSideSignedUrl(right);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {copy.versions.compare.imageHint}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ImagePane side={left} url={leftUrl} copy={copy} />
        <ImagePane side={right} url={rightUrl} copy={copy} />
      </div>
    </div>
  );
}

function ImagePane({
  side,
  url,
  copy,
}: {
  side: Side;
  url: string | null;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <SideHeader side={side} copy={copy} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void downloadVaultObject(sidePath(side), sideFilename(side))
          }
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          {copy.versions.downloadBtn}
        </Button>
      </div>
      <div className="flex max-h-[60vh] min-h-[240px] items-center justify-center overflow-auto rounded-md bg-muted/40 p-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={sideFilename(side)}
            className="max-h-[55vh] max-w-full object-contain"
          />
        ) : (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        )}
      </div>
    </div>
  );
}

function MixedCompare({
  left,
  right,
  copy,
}: {
  left: Side;
  right: Side;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  const isPdf = isPdfMime(sideMime(left)) || isPdfMime(sideMime(right));
  const leftUrl = useSideSignedUrl(left);
  const rightUrl = useSideSignedUrl(right);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {isPdf
          ? copy.versions.compare.pdfFallback
          : copy.versions.compare.docxFallback}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <MixedPane side={left} url={leftUrl} copy={copy} />
        <MixedPane side={right} url={rightUrl} copy={copy} />
      </div>
    </div>
  );
}

function MixedPane({
  side,
  url,
  copy,
}: {
  side: Side;
  url: string | null;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  const mime = sideMime(side);
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <SideHeader side={side} copy={copy} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void downloadVaultObject(sidePath(side), sideFilename(side))
          }
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          {copy.versions.downloadBtn}
        </Button>
      </div>
      <div className="flex min-h-[320px] flex-col overflow-hidden rounded-md bg-muted/40">
        {isPdfMime(mime) && url ? (
          <iframe
            src={url}
            title={sideFilename(side)}
            className="min-h-[50vh] flex-1 w-full border-0 bg-background"
          />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
            {sideFilename(side)}
          </div>
        )}
      </div>
    </div>
  );
}
