"use client";

import { motion } from "framer-motion";
import { Flame, Calendar, Award, TreePine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGardenCollection } from "@/hooks/use-garden";
import { PlantStage } from "./PlantStage";
import { formatDate } from "@/lib/utils/date";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import type { PlantType, PlantVariant } from "@/types/database";
const VARIANT_BADGE: Record<PlantVariant, { className: string }> = {
  normal: { className: "bg-muted text-muted-foreground" },
  golden: { className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300" },
  rare: { className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border-purple-300" },
};

export function PlantCollection() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const { data: collection, isLoading } = useGardenCollection();

  if (isLoading) return null;

  const entries = collection ?? [];

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <TreePine className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">{ui.emptyCollectionTitle}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {ui.emptyCollectionDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            {ui.collectionTitle}
          </CardTitle>
          <Badge variant="secondary">{ui.plantCount(entries.length)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 space-y-2"
            >
              <div className="w-20 h-20 mx-auto">
                <PlantStage plantType={entry.plant_type} stage={5} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">{ui.plantLabels[entry.plant_type]}</p>
                {entry.variant !== "normal" && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${VARIANT_BADGE[entry.variant].className}`}
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
      </CardContent>
    </Card>
  );
}
