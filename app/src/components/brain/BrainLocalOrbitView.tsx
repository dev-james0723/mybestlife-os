/**
 * Brain Local Orbit — companion panel for local mode.
 * Ring membership and counts come from `computeLocalOrbitState` (same
 * pipeline as the canvas) via {@link LocalOrbitRingsPanel}.
 */

"use client";

import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import {
  LocalOrbitRingsPanel,
  localOrbitPanelCopyFromKnowledge,
} from "@/components/knowledge/constellation/LocalOrbitRingsPanel";
import type { LocalOrbitState } from "@/lib/knowledge/constellation/computeLocalOrbitState";

interface BrainLocalOrbitViewProps {
  localOrbit: LocalOrbitState | null;
  onFocusNode: (id: string) => void;
}

export function BrainLocalOrbitView({
  localOrbit,
  onFocusNode,
}: BrainLocalOrbitViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const copy = localOrbitPanelCopyFromKnowledge(ui.constellation);

  return (
    <LocalOrbitRingsPanel
      localOrbit={localOrbit}
      copy={copy}
      onFocusNode={onFocusNode}
      useOrbitChrome
    />
  );
}
