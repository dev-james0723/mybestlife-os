"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PlantType } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import { Grass } from "./plants/Grass";
import { Sunflower } from "./plants/Sunflower";
import { Lily } from "./plants/Lily";
import { Orchid } from "./plants/Orchid";
import { AppleTree } from "./plants/AppleTree";

const PLANT_COMPONENTS: Record<PlantType, React.ComponentType<{ stage: number }>> = {
  grass: Grass,
  sunflower: Sunflower,
  lily: Lily,
  orchid: Orchid,
  apple_tree: AppleTree,
};

interface PlantStageProps {
  plantType: PlantType;
  stage: number;
  isWilted?: boolean;
}

export function PlantStage({ plantType, stage, isWilted }: PlantStageProps) {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const Component = PLANT_COMPONENTS[plantType];

  return (
    <div className="relative w-full max-w-xs mx-auto aspect-square">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${plantType}-${stage}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className={isWilted ? "saturate-[0.3] brightness-90" : ""}
          style={isWilted ? { transform: "rotate(3deg)" } : undefined}
        >
          <Component stage={stage} />
        </motion.div>
      </AnimatePresence>

      {isWilted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-xs font-medium shadow"
        >
          {ui.needsWater}
        </motion.div>
      )}
    </div>
  );
}
