import { type LucideIcon, PenLine, RotateCcw, ScanLine, Timer } from "lucide-react";
import type { BioLabToolId, BioLabToolThemeSurfaces } from "@/lib/bio-lab/tool-types";

export type BioLabToolDefinition = {
  id: BioLabToolId;
  icon: LucideIcon;
  themeSurfaces: BioLabToolThemeSurfaces;
};

const focusSprint: BioLabToolThemeSurfaces = {
  default: {
    subtitle: "Structured deep work with clear boundaries.",
  },
  astronaut: {
    subtitle: "Timed mission blocks with recovery windows.",
  },
  academia: {
    subtitle: "Focused study intervals with disciplined pauses.",
  },
  forest: {
    subtitle: "Quiet stretches of attention between gentle breaks.",
  },
};

const mindSweep: BioLabToolThemeSurfaces = {
  default: {
    subtitle: "Capture what is circling so your mind can rest.",
  },
  astronaut: {
    subtitle: "Offload signals and noise into a holding buffer.",
  },
  academia: {
    subtitle: "A quick marginalia pass for thoughts and loose ends.",
  },
  forest: {
    subtitle: "Let leaves fall onto the page—nothing is lost.",
  },
};

const stateScan: BioLabToolThemeSurfaces = {
  default: {
    subtitle: "A fast read on mood, energy, focus, and stress.",
  },
  astronaut: {
    subtitle: "Systems check: how you are operating right now.",
  },
  academia: {
    subtitle: "A brief field note on your inner weather.",
  },
  forest: {
    subtitle: "Notice how you feel before you push forward.",
  },
};

const systemReset: BioLabToolThemeSurfaces = {
  default: {
    subtitle: "A short sequence to leave overwhelm and restart.",
  },
  astronaut: {
    subtitle: "Stabilize, reorient, and resume the next maneuver.",
  },
  academia: {
    subtitle: "Close the loop, tidy the desk of the mind, continue.",
  },
  forest: {
    subtitle: "Ground, hydrate, breathe—then take the next small step.",
  },
};

/** Launcher order is declaration order (new tools append here). */
export const BIO_LAB_TOOLS: readonly BioLabToolDefinition[] = [
  {
    id: "focus-sprint",
    icon: Timer,
    themeSurfaces: focusSprint,
  },
  {
    id: "mind-sweep",
    icon: PenLine,
    themeSurfaces: mindSweep,
  },
  {
    id: "state-scan",
    icon: ScanLine,
    themeSurfaces: stateScan,
  },
  {
    id: "system-reset",
    icon: RotateCcw,
    themeSurfaces: systemReset,
  },
];

export function getBioLabToolDefinition(id: BioLabToolId): BioLabToolDefinition | undefined {
  return BIO_LAB_TOOLS.find((t) => t.id === id);
}
