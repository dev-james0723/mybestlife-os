"use client";

/**
 * Contact-first gallery card for one person.
 *
 * The card keeps the useful relationship signals, while promoting the direct
 * contact actions and date rhythm from the supplied People-card sketch. The
 * full-card button is a sibling of the nested links so the resulting markup
 * stays keyboard-accessible and avoids interactive elements inside a button.
 */

import { useId, useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  Handshake,
  Mail,
  PenLine,
  Phone,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RelationshipFavoriteStar } from "@/components/relationship/cards/relationship-favorite-star";
import {
  getRelationshipSocialPlatformLabel,
  RelationshipSocialIcon,
} from "@/components/relationship/relationship-social-icon";
import {
  getWeatherChipClassName,
  getWeatherLabel,
} from "@/components/relationship/utils/intelligence-display";
import {
  getCategoryLabel,
  getInitials,
  getStrengthChipClassName,
  getStrengthLabel,
} from "@/components/relationship/utils/relationship-display";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  computeRelationshipWeather,
  type RelationshipWeather,
} from "@/lib/relationships/intelligence";
import type { Relationship } from "@/types/database";

type Props = {
  relationship: Relationship;
  openPromiseCount?: number;
  overduePromiseCount?: number;
  onClick: () => void;
  onToggleFavorite: () => void;
  onLogInteraction?: () => void;
};

const MAX_VISIBLE_SOCIAL_LINKS = 4;

function formatCardDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

export function RelationshipCard({
  relationship,
  openPromiseCount = 0,
  overduePromiseCount = 0,
  onClick,
  onToggleFavorite,
  onLogInteraction,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const nameId = useId();

  const weather: RelationshipWeather = useMemo(
    () =>
      computeRelationshipWeather({
        relationship,
        openPromiseCount,
        overduePromiseCount,
      }),
    [relationship, openPromiseCount, overduePromiseCount],
  );

  const entrance = reduce
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      };

  const initials = getInitials(relationship.person_name);
  const visibleSocialLinks = relationship.social_links.slice(
    0,
    MAX_VISIBLE_SOCIAL_LINKS,
  );
  const hiddenSocialCount = Math.max(
    relationship.social_links.length - visibleSocialLinks.length,
    0,
  );
  const hasContactDetails = Boolean(
    relationship.phone || relationship.email || relationship.social_links.length,
  );
  const lastContactDate = relationship.last_contact_date
    ? formatCardDate(relationship.last_contact_date, language)
    : null;
  const nextTouchpointDate = relationship.next_action_date
    ? formatCardDate(relationship.next_action_date, language)
    : null;

  return (
    <motion.article
      {...entrance}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={
        reduce
          ? undefined
          : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }
      }
      aria-labelledby={nameId}
      className="h-full"
    >
      <Card className="group/person-card relative h-full gap-0 overflow-hidden rounded-2xl py-0 transition-[box-shadow,background-color] duration-200 hover:bg-card/95 hover:shadow-md">
        <button
          type="button"
          aria-labelledby={nameId}
          onClick={onClick}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />

        <div className="pointer-events-none relative z-10 flex h-full min-h-[18.5rem] flex-col p-5 sm:min-h-[20rem] sm:p-6">
          <header className="relative px-11 text-center">
            <h3
              id={nameId}
              className="line-clamp-2 text-balance font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {relationship.person_name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <Badge variant="secondary" className="font-normal">
                {getCategoryLabel(relationship.category, copy)}
              </Badge>
              <Badge
                variant="outline"
                className={`font-normal ${getStrengthChipClassName(
                  relationship.relationship_strength,
                )}`}
              >
                {getStrengthLabel(relationship.relationship_strength, copy)}
              </Badge>
              <Badge
                variant="outline"
                className={`font-normal ${getWeatherChipClassName(
                  weather.status,
                )} ${weather.urgent && !reduce ? "animate-pulse" : ""}`}
              >
                {getWeatherLabel(weather.status, copy)}
              </Badge>
            </div>
            <RelationshipFavoriteStar
              active={relationship.is_favorite}
              onClick={onToggleFavorite}
              addLabel={formatRelationshipCopy(copy.relCardFavoriteAddAria, {
                name: relationship.person_name,
              })}
              removeLabel={formatRelationshipCopy(copy.relCardFavoriteRemoveAria, {
                name: relationship.person_name,
              })}
              className="pointer-events-auto absolute -right-1 -top-2"
            />
          </header>

          <div className="mt-6 grid min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5">
            <Avatar className="size-[4.5rem] ring-1 ring-border sm:size-24">
              {relationship.photo_url ? (
                <AvatarImage
                  src={relationship.photo_url}
                  alt={relationship.person_name}
                />
              ) : null}
              <AvatarFallback className="bg-muted/70 text-lg font-medium sm:text-2xl">
                {initials || (
                  <UserRound className="size-7 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 border-l border-border/70 pl-4 sm:pl-5">
              <div className="space-y-1">
                {relationship.phone ? (
                  <a
                    href={`tel:${relationship.phone}`}
                    aria-label={`${copy.relFieldPhone}: ${relationship.phone}`}
                    className="pointer-events-auto flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-1 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{relationship.phone}</span>
                  </a>
                ) : null}
                {relationship.email ? (
                  <a
                    href={`mailto:${relationship.email}`}
                    aria-label={`${copy.relFieldEmail}: ${relationship.email}`}
                    className="pointer-events-auto flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-1 text-sm font-medium text-primary outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{relationship.email}</span>
                  </a>
                ) : null}
                {!hasContactDetails ? (
                  <p className="flex min-h-9 items-center gap-2 px-1 text-sm text-muted-foreground">
                    <Mail className="size-4 shrink-0" aria-hidden />
                    <span>{copy.healthContactInfo}: —</span>
                  </p>
                ) : null}
              </div>

              {visibleSocialLinks.length > 0 ? (
                <div
                  className="mt-3 flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label={copy.relDetailSectionSocials}
                >
                  {visibleSocialLinks.map((social, index) => {
                    const label = getRelationshipSocialPlatformLabel(
                      social.platform,
                    );
                    return (
                      <a
                        key={`${social.platform}-${social.url}-${index}`}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label}: ${relationship.person_name}`}
                        title={label}
                        className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/70 text-muted-foreground shadow-xs outline-none transition-[border-color,color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                      >
                        <RelationshipSocialIcon
                          platform={social.platform}
                          className="size-4"
                        />
                      </a>
                    );
                  })}
                  {hiddenSocialCount > 0 ? (
                    <button
                      type="button"
                      onClick={onClick}
                      aria-label={`View ${hiddenSocialCount} more social profiles for ${relationship.person_name}`}
                      className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/70 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      +{hiddenSocialCount}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <footer className="mt-5 border-t border-border/70 pt-4">
            <div className="grid min-w-0 grid-cols-2 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <DateCell
                icon={<CalendarClock className="size-3.5" aria-hidden />}
                label={copy.relDetailSectionLastContact}
                date={relationship.last_contact_date}
                displayDate={lastContactDate}
                emptyLabel={copy.relCardNeverContacted}
              />
              <DateCell
                label={copy.relCardNextAction}
                date={relationship.next_action_date}
                displayDate={nextTouchpointDate}
                emptyLabel="—"
                className="border-l border-border/70 pl-4"
              />

              {onLogInteraction ? (
                <div className="pointer-events-auto col-span-2 mt-1 flex min-w-0 items-center justify-end gap-1.5 sm:col-span-1 sm:mt-0 sm:pl-4">
                  {openPromiseCount > 0 ? (
                    <Badge variant="outline" className="font-normal">
                      <Handshake className="mr-1 size-3" aria-hidden />
                      {formatRelationshipCopy(copy.cardOpenPromiseCount, {
                        count: openPromiseCount,
                      })}
                    </Badge>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 shrink-0 px-2.5 text-xs text-primary hover:text-primary"
                    onClick={onLogInteraction}
                  >
                    <PenLine className="mr-1 size-3.5" aria-hidden />
                    {copy.hubLogInteraction}
                  </Button>
                </div>
              ) : null}
            </div>
          </footer>
        </div>
      </Card>
    </motion.article>
  );
}

function DateCell({
  icon,
  label,
  date,
  displayDate,
  emptyLabel,
  className = "",
}: {
  icon?: ReactNode;
  label: string;
  date: string | null;
  displayDate: string | null;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 pr-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      {date && displayDate ? (
        <time
          dateTime={date}
          className="mt-1 block truncate text-sm font-semibold text-foreground"
        >
          {displayDate}
        </time>
      ) : (
        <span className="mt-1 block truncate text-sm font-medium text-muted-foreground">
          {emptyLabel}
        </span>
      )}
    </div>
  );
}
