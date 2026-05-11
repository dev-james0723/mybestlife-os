import type { AppLocale } from "@/lib/i18n/app-locale";
import type { UiTheme } from "@/types/database";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";

export type BioLabToolsUiCopy = {
  /** Short label above the section title — one line per visual theme. */
  sectionEyebrowByTheme: Record<UiTheme, string>;
  /** H2 above the tool grid. */
  sectionTitle: string;
  /** Intro paragraph for the regulation toolkit. */
  sectionLead: string;
  /** Hint that more tools may appear later. */
  futureSlotHint: string;
  /** Display titles for tools (stable product names). */
  toolTitles: Record<BioLabToolId, string>;
  /** Page shell description for /garden — theme-aware line. */
  gardenHubDescriptions: Record<UiTheme, string>;
  /** When the tool list is empty (future / feature flags). */
  emptyStateTitle: string;
  emptyStateDescription: string;
};

const en: BioLabToolsUiCopy = {
  sectionEyebrowByTheme: {
    default: "Human systems",
    astronaut: "Lab modules",
    academia: "Bench methods",
    forest: "Clearing",
  },
  sectionTitle: "Regulation toolkit",
  sectionLead:
    "Four short practices to enter focus, clear mental load, notice your state, and recover when things feel noisy.",
  futureSlotHint: "Room for more instruments later—this grid stays calm.",
  toolTitles: {
    "focus-sprint": "Focus Sprint",
    "mind-sweep": "Mind Sweep",
    "state-scan": "State Scan",
    "system-reset": "System Reset",
  },
  gardenHubDescriptions: {
    default:
      "A calm space to regulate attention and mood—your daily garden still grows below.",
    astronaut:
      "Bio systems for focus and recovery—cultivation bay operations continue beneath.",
    academia:
      "A quiet bench for attention and reflection—botanical notes and growth follow below.",
    forest:
      "A clearing to steady yourself—roots, rhythms, and your garden carry on below.",
  },
  emptyStateTitle: "No tools on the bench yet",
  emptyStateDescription: "When new practices ship, they will appear here without crowding the lab.",
};

const copyByLocale = createLocaleCopyMap(en, {
  "zh-TW": {
    sectionEyebrowByTheme: {
      default: "人因系統",
      astronaut: "實驗模組",
      academia: "工作枱方法",
      forest: "林中空地",
    },
    sectionTitle: "調節工具組",
    sectionLead:
      "四個短練習：進入專注、清空思緒、覺察狀態，並在混亂時把自己拉回來。",
    futureSlotHint: "之後可以加入更多工具——版面仍然保持簡潔。",
    toolTitles: {
      "focus-sprint": "專注衝刺",
      "mind-sweep": "思緒清掃",
      "state-scan": "狀態掃描",
      "system-reset": "系統重置",
    },
    gardenHubDescriptions: {
      default: "讓注意力與情緒穩定下來——下面的每日花園仍會慢慢成長。",
      astronaut: "維持專注與恢復的生物系統——下方的培育艙照常運作。",
      academia: "讓心思安靜下來的角落——植物筆記與成長紀錄仍在下方。",
      forest: "先讓自己站穩——根系、節奏與花園，都在下面延續。",
    },
    emptyStateTitle: "工作枱上還沒有工具",
    emptyStateDescription: "之後有新練習上架，會出現在這裡，版面仍然保持簡潔。",
  },
  "zh-CN": {
    sectionEyebrowByTheme: {
      default: "人因系统",
      astronaut: "实验模块",
      academia: "工作台方法",
      forest: "林中空地",
    },
    sectionTitle: "调节工具组",
    sectionLead: "四个短练习：进入专注、清空思绪、觉察状态，并在混乱时把自己拉回来。",
    futureSlotHint: "之后可以加入更多工具——版面仍然保持简洁。",
    toolTitles: {
      "focus-sprint": "专注冲刺",
      "mind-sweep": "思绪清扫",
      "state-scan": "状态扫描",
      "system-reset": "系统重置",
    },
    gardenHubDescriptions: {
      default: "让注意力与情绪稳定下来——下面的每日花园仍会慢慢成长。",
      astronaut: "维持专注与恢复的生物系统——下方的培育舱照常运作。",
      academia: "让心思安静下来的角落——植物笔记与成长记录仍在下方。",
      forest: "先让自己站稳——根系、节奏与花园，都在下面延续。",
    },
    emptyStateTitle: "工作台上还没有工具",
    emptyStateDescription: "之后有新练习上架，会出现在这里，版面仍然保持简洁。",
  },
});

export function getBioLabToolsUiCopy(locale: AppLocale): BioLabToolsUiCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}

export function getGardenHubPageDescription(
  locale: AppLocale,
  uiTheme: UiTheme,
): string {
  const copy = getBioLabToolsUiCopy(locale);
  return copy.gardenHubDescriptions[uiTheme];
}
