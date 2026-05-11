"use client";

/**
 * RelationshipCard
 *
 * Gallery card for one relationship in the personal-CRM. Designed to feel
 * warm and personal: photo + name + category, plus a glanceable
 * "last contact" line and a "next action" snippet.
 *
 * Layout choices:
 *  - Photo + initials fallback in an Avatar (matches RoleModelCard sizing
 *    so the two galleries feel like siblings).
 *  - Strength chip lives next to the category — both are dense visual
 *    signals; we want them in the same scan-line.
 *  - "Next action" gets its own row with a small chevron-style icon so
 *    it pops as the actionable hook of the card.
 *  - Tags, when present, are clamped to 4 + a "+N" overflow.
 *
 * Microinteractions (mirroring RoleModelCard):
 *  - Entrance fade/slide-up.
 *  - Hover lift on the grid layout.
 *  - Both gated by `useReducedMotion`.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ArrowRight, UserRound } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  getCategoryLabel,
  getInitials,
  getStrengthChipClassName,
  getStrengthLabel,
} from "@/components/relationship/utils/relationship-display";
import { RelationshipFavoriteStar } from "@/components/relationship/cards/relationship-favorite-star";
import { formatRelative } from "@/lib/utils/date";
import type { Relationship } from "@/types/database";

type Props = {
  relationship: Relationship;
  onClick: () => void;
  onToggleFavorite: () => void;
};

export function RelationshipCard({
  relationship,
  onClick,
  onToggleFavorite,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();

  const entrance = reduce
    ? { initial: false }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      };

  const initials = getInitials(relationship.person_name);
  const lastContactText = relationship.last_contact_date
    ? formatRelative(relationship.last_contact_date)
    : copy.relCardNeverContacted;

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
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="group h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 shrink-0 ring-1 ring-border">
              {relationship.photo_url ? (
                <AvatarImage
                  src={relationship.photo_url}
                  alt={relationship.person_name}
                />
              ) : null}
              <AvatarFallback className="bg-muted">
                {initials || (
                  <UserRound className="h-6 w-6 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    {relationship.person_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="font-normal text-[10px]"
                    >
                      {getCategoryLabel(relationship.category, copy)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`font-normal text-[10px] ${getStrengthChipClassName(
                        relationship.relationship_strength,
                      )}`}
                    >
                      {getStrengthLabel(
                        relationship.relationship_strength,
                        copy,
                      )}
                    </Badge>
                  </div>
                </div>
                <RelationshipFavoriteStar
                  active={relationship.is_favorite}
                  onClick={onToggleFavorite}
                  addLabel={formatRelationshipCopy(copy.relCardFavoriteAddAria, {
                    name: relationship.person_name,
                  })}
                  removeLabel={formatRelationshipCopy(
                    copy.relCardFavoriteRemoveAria,
                    { name: relationship.person_name },
                  )}
                />
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{lastContactText}</span>
              </div>

              {relationship.next_action && (
                <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground line-clamp-2 text-pretty">
                      {relationship.next_action}
                    </div>
                    {relationship.next_action_date && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatRelationshipCopy(copy.relCardDueOn, {
                          date: relationship.next_action_date,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {relationship.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {relationship.tags.slice(0, 4).map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="font-normal text-[10px] py-0"
                    >
                      {t}
                    </Badge>
                  ))}
                  {relationship.tags.length > 4 && (
                    <span className="self-center text-[10px] text-muted-foreground">
                      +{relationship.tags.length - 4}
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
