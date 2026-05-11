import type { AppLocale } from "./app-locale";
import type { DeepPartial } from "./copy-helpers";
import type { KnowledgeUiCopy } from "./knowledge-ui-copy-type";
import { knowledgeOverridesEs } from "./knowledge-locales/knowledge-es";
import { knowledgeOverridesFr } from "./knowledge-locales/knowledge-fr";
import { knowledgeOverridesIt } from "./knowledge-locales/knowledge-it";
import { knowledgeOverridesJa } from "./knowledge-locales/knowledge-ja";
import { knowledgeOverridesKo } from "./knowledge-locales/knowledge-ko";
import { knowledgeOverridesVi } from "./knowledge-locales/knowledge-vi";
import { knowledgeOverridesZhCN } from "./knowledge-locales/knowledge-zh-cn";
import { knowledgeOverridesZhTW } from "./knowledge-locales/knowledge-zh-tw";

export const knowledgeLocaleOverrides: Partial<Record<AppLocale, DeepPartial<KnowledgeUiCopy>>> = {
  "zh-TW": knowledgeOverridesZhTW,
  "zh-CN": knowledgeOverridesZhCN,
  ja: knowledgeOverridesJa,
  ko: knowledgeOverridesKo,
  fr: knowledgeOverridesFr,
  it: knowledgeOverridesIt,
  es: knowledgeOverridesEs,
  vi: knowledgeOverridesVi,
};
