"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame, Calendar, Award, TreePine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSFrostedPanel, OSEmptyState } from "@/components/ui/os-primitives";
import { osSolidPanelClassName } from "@/components/ui/os-glass";
import { useGardenCollection } from "@/hooks/use-garden";
import { PlantStage } from "./PlantStage";
import { formatDate } from "@/lib/utils/date";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import { cn } from "@/lib/utils";
import type { PlantVariant } from "@/types/database";
const VARIANT_BADGE: Record<PlantVariant, { className: string }> = {
  normal: { className: "bg-muted text-muted-foreground" },
  golden: { className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300" },
  rare: { className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border-purple-300" },
};

export function PlantCollection() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const { data: collection, isLoading } = useGardenCollection();
  const reduceMotion = useReducedMotion();

  if (isLoading) return null;

  const entries = collection ?? [];

  if (entries.length === 0) {
    return (
      <OSEmptyState
        icon={TreePine}
        title={ui.emptyCollectionTitle}
        description={ui.emptyCollectionDescription}
        className="border-dashed py-8"
      />
    );
  }

  return (
    <OSFrostedPanel className="p-4 sm:p-5">
      <div className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Award className="h-4 w-4 text-amber-500" />
            {ui.collectionTitle}
          </h2>
          <Badge variant="secondary" className="bg-background/75">{ui.plantCount(entries.length)}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: reduceMotion ? 0 : 0.2 }}
            className={cn(osSolidPanelClassName, "space-y-2 rounded-xl bg-gradient-to-b from-background to-muted/20 p-3")}
          >
            <div className="mx-auto h-20 w-20">
              <PlantStage plantType={entry.plant_type} stage={5} />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">{ui.plantLabels[entry.plant_type]}</p>
              {entry.variant !== "normal" && (
                <Badge
                  variant="outline"
                  className={`px-1.5 py-0 text-[10px] ${VARIANT_BADGE[entry.variant].className}`}
                >
                  {ui.variantLabels[entry.variant]}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground">
              {entry.streak_days != null && entry.streak_days > 0 && (
                <span className="flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                  {ui.streakDays(entry.streak_days)}
                </span>
              )}
              {entry.bloom_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {formatDate(entry.bloom_date)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </OSFrostedPanel>
  );
}
