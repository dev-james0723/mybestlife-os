"use client";

/**
 * RoleModelCard
 *
 * Gallery card for one role model. Designed for the role-model sub-tab grid.
 *
 * Why not EntityCard?
 *  - We want a larger photo, a category badge in the corner, and a favorite
 *    star that doesn't propagate the click (which `EntityCard.actions` does
 *    fine, but the rest of the surface needs a custom layout to feel like a
 *    "person card" rather than a generic list item).
 *
 * Microinteractions (Phase 4):
 *  - Subtle entrance fade/lift via `motion.div` so newly added cards feel
 *    "placed", not abruptly painted.
 *  - Soft hover lift on the grid layout — telegraphs interactivity without
 *    using the heavier shadcn shadow elevation.
 *  - Both are disabled when the user prefers reduced motion.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RoleModelPhoto } from "@/components/relationship/role-model-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import type { RoleModel } from "@/types/database";

type Props = {
  roleModel: RoleModel;
  onClick: () => void;
  onToggleFavorite: () => void;
  /** Compact list layout instead of grid card. */
  compact?: boolean;
};

export function RoleModelCard({
  roleModel,
  onClick,
  onToggleFavorite,
  compact = false,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  // Shared motion props — entrance only. Hover lift is grid-only and added
  // inline below so the compact list rows don't shift on hover (which is
  // visually noisy in dense layouts).
  const entrance = reduce
    ? { initial: false }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      };

  const photo = roleModel.photo_url ?? roleModel.image_url;
  const subtitle =
    roleModel.admiration_blurb ??
    truncate(roleModel.bio ?? roleModel.description ?? "", 110);

  const initials = roleModel.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (compact) {
    return (
      <motion.div {...entrance}>
        <Card
          className="group cursor-pointer transition-all hover:shadow-md hover:border-border"
          onClick={onClick}
        >
          <CardContent className="p-0">
            <div className="flex min-h-24">
              <CardPhoto photo={photo} name={roleModel.name} initials={initials} />
              <div className="min-w-0 flex-1 p-3 pr-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">{roleModel.name}</h3>
                    {roleModel.category && (
                      <Badge
                        variant="secondary"
                        className="font-normal mt-1 text-[10px] shrink-0"
                      >
                        {capitalize(roleModel.category)}
                      </Badge>
                    )}
                  </div>
                  <FavoriteButton
                    active={roleModel.is_favorite}
                    onClick={onToggleFavorite}
                    addLabel={copy.rmFavoriteAddAria}
                    removeLabel={copy.rmFavoriteRemoveAria}
                  />
                </div>
                {subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...entrance}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={
        reduce
          ? undefined
          : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }
      }
    >
      <Card
        className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md hover:border-border h-full"
        onClick={onClick}
      >
        <CardContent className="p-0 h-full">
          <div className="flex min-h-[172px] h-full">
            <CardPhoto photo={photo} name={roleModel.name} initials={initials} />
            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate">
                    {roleModel.name}
                  </h3>
                  {roleModel.category && (
                    <Badge
                      variant="secondary"
                      className="font-normal mt-1 text-[10px]"
                    >
                      {capitalize(roleModel.category)}
                    </Badge>
                  )}
                </div>
                <FavoriteButton
                  active={roleModel.is_favorite}
                  onClick={onToggleFavorite}
                  addLabel={copy.rmFavoriteAddAria}
                  removeLabel={copy.rmFavoriteRemoveAria}
                />
              </div>
              {subtitle && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 text-pretty">
                  {subtitle}
                </p>
              )}
              {roleModel.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {roleModel.tags.slice(0, 4).map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="font-normal text-[10px] py-0"
                    >
                      {t}
                    </Badge>
                  ))}
                  {roleModel.tags.length > 4 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{roleModel.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CardPhoto({
  photo,
  name,
  initials,
}: {
  photo: string | null | undefined;
  name: string;
  initials: string;
}) {
  return (
    <div className="relative basis-1/3 shrink-0 border-r border-border/80 bg-muted/30 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        {initials ? (
          <span className="text-lg font-medium tracking-wide">{initials}</span>
        ) : (
          <UserRound className="h-8 w-8" />
        )}
      </div>
      {photo ? (
        <RoleModelPhoto
          src={photo}
          alt={name}
          pixelSize={160}
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
    </div>
  );
}

function FavoriteButton({
  active,
  onClick,
  addLabel,
  removeLabel,
}: {
  active: boolean;
  onClick: () => void;
  addLabel: string;
  removeLabel: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "h-8 w-8 p-0 shrink-0",
        active
          ? "text-primary hover:text-primary"
          : "text-muted-foreground/60 hover:text-foreground",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={active ? removeLabel : addLabel}
      aria-pressed={active}
    >
      {/*
        Re-key on `active` so framer-motion replays the pop on every toggle.
        Reduced-motion users get a static icon — no jank, same affordance.
      */}
      <motion.span
        key={String(active)}
        initial={reduce ? false : { scale: 0.7, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className="inline-flex"
      >
        <Sparkles
          className="h-4 w-4"
          fill={active ? "currentColor" : "none"}
        />
      </motion.span>
    </Button>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
