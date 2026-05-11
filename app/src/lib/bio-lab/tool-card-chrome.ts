import type { BioLabToolId } from "@/lib/bio-lab/tool-types";

/**
 * Visual identity per tool — uses dedicated CSS variables (--bio-lab-*)
 * so accents stay chromatic; chart-* tokens in this app are grayscale.
 */
export type BioLabToolCardChrome = {
  card: string;
  iconWrap: string;
};

export const BIO_LAB_TOOL_CARD_CHROME: Record<BioLabToolId, BioLabToolCardChrome> = {
  "focus-sprint": {
    card: "border-l-[3px] border-l-bio-lab-sprint shadow-sm shadow-bio-lab-sprint/15",
    iconWrap: "bg-bio-lab-sprint/12 text-bio-lab-sprint ring-1 ring-bio-lab-sprint/25",
  },
  "mind-sweep": {
    card: "border-l-[3px] border-l-bio-lab-sweep shadow-sm shadow-bio-lab-sweep/15",
    iconWrap: "bg-bio-lab-sweep/14 text-bio-lab-sweep ring-1 ring-bio-lab-sweep/30",
  },
  "state-scan": {
    card: "border-l-[3px] border-l-bio-lab-scan shadow-sm shadow-bio-lab-scan/15",
    iconWrap: "bg-bio-lab-scan/14 text-bio-lab-scan ring-1 ring-bio-lab-scan/30",
  },
  "system-reset": {
    card: "border-l-[3px] border-l-bio-lab-reset shadow-sm shadow-bio-lab-reset/15",
    iconWrap: "bg-bio-lab-reset/14 text-bio-lab-reset ring-1 ring-bio-lab-reset/30",
  },
};
