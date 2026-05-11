/**
 * Copy for the AI-assist surface inside the four Bio Lab panels.
 *
 * Lives in its own module (rather than `bio-lab-flows-ui.ts`) so the AI
 * features can evolve without churning the panel-base copy. Source-of-truth
 * English; the other 8 locales are written explicitly.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";

export type BioLabAIAssistCopy = {
  /** Generic chrome shared by every tool. */
  shared: {
    /** Tag shown next to AI-suggested values. */
    aiBadge: string;
    /** Subtle caption shown while a fetch is in-flight. */
    thinking: string;
    /** Surfaced toast / inline message when the AI request fails (no detail). */
    fallbackNotice: string;
    /** Button to dismiss an AI suggestion that the user doesn't want. */
    dismiss: string;
    /** Button to accept the suggestion as-is. */
    accept: string;
    /** Toast used when a Supabase write fails. */
    saveFailed: string;
  };

  stateScan: {
    /** Label above the natural-language input. */
    aiPromptLabel: string;
    /** Placeholder for the natural-language input. */
    aiPromptPlaceholder: string;
    /** CTA that triggers the inference call. */
    aiPromptCta: string;
    /** Caption shown below the sliders after AI prefilled them. */
    appliedCaption: string;
    /** Tooltip / aria-label for the "this came from AI" badge. */
    inferredFrom: (raw: string) => string;
  };

  mindSweep: {
    /** Header above the AI-suggested label chip. */
    suggestedLabel: string;
    /** Aria label for the "use this label" affordance. */
    useSuggestion: string;
    /** Header above the post-batch triage insight. */
    triageTitle: string;
    /** Caption shown while the triage is being computed. */
    triageThinking: string;
  };

  focusSprint: {
    /** Eyebrow above the AI recommendation block. */
    recommendationTitle: string;
    /** Caption shown below the recommended preset. */
    recommendationCaption: string;
    /** CTA that asks AI to pick an intention + duration. */
    askCta: string;
    /** Label next to the focus-rating step (post-sprint). */
    focusRatingLabel: string;
    /** Hint shown under the focus-rating slider. */
    focusRatingHint: string;
    /** Skip the rating step. */
    focusRatingSkip: string;
  };

  systemReset: {
    /** CTA that asks the AI for a personalized sequence. */
    askAdaptiveCta: string;
    /** Eyebrow shown above the AI summary line. */
    adaptiveTitle: string;
    /** CTA to switch back to the static (default) sequence. */
    useDefault: string;
    /** Optional state-input nudge above the CTA. */
    stateHintTitle: string;
    /** Field label for the optional free-text note used as inference input. */
    stateHintNoteLabel: string;
    /** Placeholder for the optional free-text note. */
    stateHintNotePlaceholder: string;
  };
};

const en: BioLabAIAssistCopy = {
  shared: {
    aiBadge: "AI",
    thinking: "Thinking…",
    fallbackNotice: "AI is unavailable right now — fill it in by hand.",
    dismiss: "Dismiss",
    accept: "Use this",
    saveFailed: "Couldn't save. Try again in a moment.",
  },
  stateScan: {
    aiPromptLabel: "Or just say how you feel",
    aiPromptPlaceholder: "e.g. \"wired but exhausted\"",
    aiPromptCta: "Read my state",
    appliedCaption: "Sliders prefilled — adjust anything that feels off.",
    inferredFrom: (raw) => `From: \u201C${raw}\u201D`,
  },
  mindSweep: {
    suggestedLabel: "Suggested",
    useSuggestion: "Use this label",
    triageTitle: "What this batch points to",
    triageThinking: "Looking for the pattern…",
  },
  focusSprint: {
    recommendationTitle: "Suggested sprint",
    recommendationCaption: "Accept to use this rhythm and intention.",
    askCta: "Ask for a recommendation",
    focusRatingLabel: "How focused did that feel?",
    focusRatingHint: "1 = scattered · 5 = laser",
    focusRatingSkip: "Skip rating",
  },
  systemReset: {
    askAdaptiveCta: "Generate a sequence for now",
    adaptiveTitle: "Tailored sequence",
    useDefault: "Use the standard reset",
    stateHintTitle: "How are you right now?",
    stateHintNoteLabel: "Anything else worth knowing?",
    stateHintNotePlaceholder: "Optional — one line is enough.",
  },
};

const copyByLocale = createLocaleCopyMap(en, {
  "zh-TW": {
    shared: {
      aiBadge: "AI",
      thinking: "思考中…",
      fallbackNotice: "AI 暫時無法使用——請手動填寫。",
      dismiss: "不用",
      accept: "用這個",
      saveFailed: "未能儲存，請稍後再試。",
    },
    stateScan: {
      aiPromptLabel: "或者直接講出你的感覺",
      aiPromptPlaceholder: "例如「亢奮但疲憊」",
      aiPromptCta: "讀我的狀態",
      appliedCaption: "已預填——有不對的就調一下。",
      inferredFrom: (raw) => `來自：\u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "建議",
      useSuggestion: "用這個標籤",
      triageTitle: "這一輪在告訴你什麼",
      triageThinking: "尋找規律中…",
    },
    focusSprint: {
      recommendationTitle: "建議衝刺",
      recommendationCaption: "接受就用這節奏與意圖。",
      askCta: "請建議一個衝刺",
      focusRatingLabel: "這段專注得怎樣？",
      focusRatingHint: "1 = 渙散 · 5 = 雷射",
      focusRatingSkip: "略過評分",
    },
    systemReset: {
      askAdaptiveCta: "為現在這刻生成流程",
      adaptiveTitle: "為你而設的流程",
      useDefault: "用標準重置",
      stateHintTitle: "你現在如何？",
      stateHintNoteLabel: "還有甚麼想補充？",
      stateHintNotePlaceholder: "可選——一行就夠。",
    },
  },
  "zh-CN": {
    shared: {
      aiBadge: "AI",
      thinking: "思考中…",
      fallbackNotice: "AI 暂时不可用——请手动填写。",
      dismiss: "不用",
      accept: "用这个",
      saveFailed: "未能保存，请稍后再试。",
    },
    stateScan: {
      aiPromptLabel: "或者直接说说你的感受",
      aiPromptPlaceholder: "例如「亢奋但疲惫」",
      aiPromptCta: "读取我的状态",
      appliedCaption: "已预填——不对的随手调一下。",
      inferredFrom: (raw) => `来自：\u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "建议",
      useSuggestion: "用这个标签",
      triageTitle: "这一轮在告诉你什么",
      triageThinking: "寻找规律中…",
    },
    focusSprint: {
      recommendationTitle: "建议冲刺",
      recommendationCaption: "接受就用这节奏与意图。",
      askCta: "请建议一个冲刺",
      focusRatingLabel: "这段专注得怎么样？",
      focusRatingHint: "1 = 涣散 · 5 = 激光",
      focusRatingSkip: "跳过评分",
    },
    systemReset: {
      askAdaptiveCta: "为此刻生成流程",
      adaptiveTitle: "为你定制的流程",
      useDefault: "用标准重置",
      stateHintTitle: "你现在如何？",
      stateHintNoteLabel: "还有什么要补充？",
      stateHintNotePlaceholder: "可选——一行就够。",
    },
  },
  ja: {
    shared: {
      aiBadge: "AI",
      thinking: "考え中…",
      fallbackNotice: "AI は今使えません——手動で入力してください。",
      dismiss: "使わない",
      accept: "これを使う",
      saveFailed: "保存できませんでした。少し待って再試行。",
    },
    stateScan: {
      aiPromptLabel: "または、今の感じを一言で",
      aiPromptPlaceholder: "例：「気は張ってるけどクタクタ」",
      aiPromptCta: "状態を読む",
      appliedCaption: "スライダーを下書きしました——気になる所を調整。",
      inferredFrom: (raw) => `元の文：\u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "提案",
      useSuggestion: "このラベルを使う",
      triageTitle: "このバッチが示すもの",
      triageThinking: "パターンを探しています…",
    },
    focusSprint: {
      recommendationTitle: "おすすめのスプリント",
      recommendationCaption: "受け入れるとこのリズムと意図を使います。",
      askCta: "おすすめを聞く",
      focusRatingLabel: "どのくらい集中できた？",
      focusRatingHint: "1 = 散漫 · 5 = レーザー",
      focusRatingSkip: "評価をスキップ",
    },
    systemReset: {
      askAdaptiveCta: "今の状態に合わせて生成",
      adaptiveTitle: "あなた向けのシーケンス",
      useDefault: "標準リセットを使う",
      stateHintTitle: "今の状態は？",
      stateHintNoteLabel: "他に伝えたいことは？",
      stateHintNotePlaceholder: "任意——一行で十分。",
    },
  },
  ko: {
    shared: {
      aiBadge: "AI",
      thinking: "생각 중…",
      fallbackNotice: "AI 를 지금 쓸 수 없어요 — 직접 입력해 주세요.",
      dismiss: "사용 안 함",
      accept: "이걸 사용",
      saveFailed: "저장하지 못했어요. 잠시 후 다시 시도.",
    },
    stateScan: {
      aiPromptLabel: "또는 지금 느낌을 한마디로",
      aiPromptPlaceholder: "예: \"긴장되지만 지쳤다\"",
      aiPromptCta: "내 상태 읽기",
      appliedCaption: "슬라이더를 채워뒀어요 — 어색한 건 조정하세요.",
      inferredFrom: (raw) => `원문: \u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "제안",
      useSuggestion: "이 라벨 사용",
      triageTitle: "이번 묶음이 알려주는 것",
      triageThinking: "패턴을 찾는 중…",
    },
    focusSprint: {
      recommendationTitle: "추천 스프린트",
      recommendationCaption: "수락하면 이 리듬과 의도를 사용해요.",
      askCta: "추천 부탁",
      focusRatingLabel: "얼마나 집중되었나요?",
      focusRatingHint: "1 = 흩어짐 · 5 = 레이저",
      focusRatingSkip: "평가 건너뛰기",
    },
    systemReset: {
      askAdaptiveCta: "지금에 맞는 시퀀스 생성",
      adaptiveTitle: "당신을 위한 시퀀스",
      useDefault: "표준 리셋 사용",
      stateHintTitle: "지금 상태는?",
      stateHintNoteLabel: "추가로 알릴 게 있나요?",
      stateHintNotePlaceholder: "선택 — 한 줄이면 충분.",
    },
  },
  fr: {
    shared: {
      aiBadge: "IA",
      thinking: "Réflexion…",
      fallbackNotice: "L'IA est indisponible — remplissez à la main.",
      dismiss: "Ignorer",
      accept: "Utiliser",
      saveFailed: "Échec de l'enregistrement. Réessayez dans un instant.",
    },
    stateScan: {
      aiPromptLabel: "Ou dites simplement comment vous vous sentez",
      aiPromptPlaceholder: "ex. « tendu·e mais épuisé·e »",
      aiPromptCta: "Lire mon état",
      appliedCaption: "Curseurs préremplis — ajustez ce qui ne colle pas.",
      inferredFrom: (raw) => `Depuis : \u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "Suggéré",
      useSuggestion: "Utiliser cette étiquette",
      triageTitle: "Ce que ce lot montre",
      triageThinking: "Recherche du motif…",
    },
    focusSprint: {
      recommendationTitle: "Sprint suggéré",
      recommendationCaption: "Acceptez pour utiliser ce rythme et cette intention.",
      askCta: "Demander une suggestion",
      focusRatingLabel: "Quel niveau de focus ?",
      focusRatingHint: "1 = dispersé · 5 = laser",
      focusRatingSkip: "Passer la note",
    },
    systemReset: {
      askAdaptiveCta: "Générer une séquence pour maintenant",
      adaptiveTitle: "Séquence sur mesure",
      useDefault: "Utiliser le reset standard",
      stateHintTitle: "Comment êtes-vous là ?",
      stateHintNoteLabel: "Autre chose à signaler ?",
      stateHintNotePlaceholder: "Optionnel — une ligne suffit.",
    },
  },
  it: {
    shared: {
      aiBadge: "IA",
      thinking: "Sto pensando…",
      fallbackNotice: "L'IA non è disponibile — compila a mano.",
      dismiss: "Ignora",
      accept: "Usa",
      saveFailed: "Salvataggio non riuscito. Riprova tra poco.",
    },
    stateScan: {
      aiPromptLabel: "O dimmi come ti senti",
      aiPromptPlaceholder: "es. «teso ma esausto»",
      aiPromptCta: "Leggi il mio stato",
      appliedCaption: "Cursori precompilati — regola ciò che non torna.",
      inferredFrom: (raw) => `Da: \u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "Suggerito",
      useSuggestion: "Usa questa etichetta",
      triageTitle: "Cosa indica questo lotto",
      triageThinking: "Cerco lo schema…",
    },
    focusSprint: {
      recommendationTitle: "Sprint suggerito",
      recommendationCaption: "Accetta per usare questo ritmo e intenzione.",
      askCta: "Chiedi un consiglio",
      focusRatingLabel: "Quanto eri concentrato?",
      focusRatingHint: "1 = sparpagliato · 5 = laser",
      focusRatingSkip: "Salta valutazione",
    },
    systemReset: {
      askAdaptiveCta: "Genera una sequenza per adesso",
      adaptiveTitle: "Sequenza su misura",
      useDefault: "Usa il reset standard",
      stateHintTitle: "Come stai ora?",
      stateHintNoteLabel: "Altro da segnalare?",
      stateHintNotePlaceholder: "Opzionale — basta una riga.",
    },
  },
  es: {
    shared: {
      aiBadge: "IA",
      thinking: "Pensando…",
      fallbackNotice: "La IA no está disponible — rellénalo a mano.",
      dismiss: "Descartar",
      accept: "Usar esto",
      saveFailed: "No se pudo guardar. Inténtalo en un momento.",
    },
    stateScan: {
      aiPromptLabel: "O di cómo te sientes",
      aiPromptPlaceholder: "ej. «tenso pero agotado»",
      aiPromptCta: "Leer mi estado",
      appliedCaption: "Sliders rellenos — ajusta lo que no encaje.",
      inferredFrom: (raw) => `De: \u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "Sugerido",
      useSuggestion: "Usar esta etiqueta",
      triageTitle: "Lo que indica esta tanda",
      triageThinking: "Buscando el patrón…",
    },
    focusSprint: {
      recommendationTitle: "Sprint sugerido",
      recommendationCaption: "Acepta para usar este ritmo e intención.",
      askCta: "Pedir una sugerencia",
      focusRatingLabel: "¿Qué tan enfocado fue?",
      focusRatingHint: "1 = disperso · 5 = láser",
      focusRatingSkip: "Saltar valoración",
    },
    systemReset: {
      askAdaptiveCta: "Generar una secuencia para ahora",
      adaptiveTitle: "Secuencia a medida",
      useDefault: "Usar el reset estándar",
      stateHintTitle: "¿Cómo estás ahora?",
      stateHintNoteLabel: "¿Algo más que añadir?",
      stateHintNotePlaceholder: "Opcional — una línea basta.",
    },
  },
  vi: {
    shared: {
      aiBadge: "AI",
      thinking: "Đang nghĩ…",
      fallbackNotice: "AI tạm thời không dùng được — hãy điền thủ công.",
      dismiss: "Bỏ qua",
      accept: "Dùng cái này",
      saveFailed: "Không lưu được. Thử lại sau ít phút.",
    },
    stateScan: {
      aiPromptLabel: "Hoặc nói cảm giác của bạn",
      aiPromptPlaceholder: "vd: \"căng nhưng kiệt sức\"",
      aiPromptCta: "Đọc trạng thái",
      appliedCaption: "Đã điền sẵn — chỉnh chỗ chưa hợp.",
      inferredFrom: (raw) => `Từ: \u201C${raw}\u201D`,
    },
    mindSweep: {
      suggestedLabel: "Gợi ý",
      useSuggestion: "Dùng nhãn này",
      triageTitle: "Đợt này đang nói lên điều gì",
      triageThinking: "Đang tìm quy luật…",
    },
    focusSprint: {
      recommendationTitle: "Sprint đề xuất",
      recommendationCaption: "Nhận để dùng nhịp và ý định này.",
      askCta: "Xin gợi ý",
      focusRatingLabel: "Vừa rồi tập trung thế nào?",
      focusRatingHint: "1 = lan man · 5 = laser",
      focusRatingSkip: "Bỏ qua chấm điểm",
    },
    systemReset: {
      askAdaptiveCta: "Tạo trình tự cho lúc này",
      adaptiveTitle: "Trình tự dành riêng cho bạn",
      useDefault: "Dùng reset tiêu chuẩn",
      stateHintTitle: "Bạn hiện ra sao?",
      stateHintNoteLabel: "Còn gì cần lưu ý không?",
      stateHintNotePlaceholder: "Tuỳ chọn — một dòng là đủ.",
    },
  },
});

export function getBioLabAIAssistCopy(locale: AppLocale): BioLabAIAssistCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
