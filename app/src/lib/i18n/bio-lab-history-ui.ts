/**
 * Copy for the Phase 4 cross-tool history surfaces:
 *   - The recent activity strip above the tool grid
 *   - The "View history" sheet that opens from it
 *   - The compact "last used" pill on each tool card
 *
 * Pluralization is delegated to caller-supplied lambdas so the module stays
 * locale-agnostic about plural rules — each locale just expresses "n session(s)"
 * the way it naturally does.
 *
 * Lives separately from {@link getBioLabToolsUiCopy} so the activity surfaces
 * can evolve (and earn their own A/B tests) without touching tool catalog copy.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import type { HubSuggestionReasonKey } from "@/lib/bio-lab/hub-suggestion-rules";

export type BioLabHistoryCopy = {
  strip: {
    /** Eyebrow above the strip (e.g. "Last 7 days"). */
    eyebrow: string;
    /** Single-line message when the user has zero history at all. */
    emptyHeadline: string;
    /** Subline when empty, encouraging a first session. */
    emptySubline: string;
    /** "{n} session this week" / "{n} sessions this week". */
    weekSummary: (n: number) => string;
    /** "Streak: {n} day" / "Streak: {n} days". Returns "" when n === 0. */
    streakLine: (n: number) => string;
    /** Inline note when at least one recent session was AI-assisted. */
    aiNote: string;
    /** Tag inside the strip for "you completed something today". */
    todayDone: string;
    /** "View history" CTA. */
    viewHistoryCta: string;
  };

  toolBadge: {
    /** When the tool was used today (relative). */
    today: string;
    /** When used yesterday. */
    yesterday: string;
    /** "{n} day(s) ago". */
    daysAgo: (n: number) => string;
    /** Used more than 30 days ago, exact day count not surfaced. */
    longAgo: string;
    /** Tooltip / aria label for the badge, e.g. "Last used: yesterday". */
    ariaLabel: (when: string) => string;
  };

  sparkline: {
    /** Aria summary when the tool has zero usage in the 7-day window. */
    emptyAria: string;
    /** Aria summary, e.g. "3 sessions in the last 7 days". */
    summaryAria: (count: number) => string;
  };

  sheet: {
    /** Title of the unified history sheet. */
    title: string;
    /** Subtitle / context line under the title. */
    subtitle: string;
    /** Empty state inside the sheet (only fires if the strip is also empty). */
    emptyTitle: string;
    emptyBody: string;
    /** Stable, neutral label for each tool's row group (singular session label). */
    toolEntryLabel: Record<BioLabToolId, string>;
    /** Right-aligned summary lines per entry kind, e.g. "Mood {n}/10". */
    summary: {
      stateScan: (mood: number, energy: number, focus: number, stress: number) => string;
      mindSweep: (count: number) => string;
      focusSprint: (intention: string, minutes: number) => string;
      systemReset: (steps: number) => string;
    };
    /** Tag shown next to AI-assisted entries. */
    aiTag: string;
    /** "Just now" relative timestamp. */
    justNow: string;
    /** "{n}m ago" relative timestamp (under 60 minutes). */
    minutesAgo: (n: number) => string;
    /** "{n}h ago" relative timestamp (1–23 hours). */
    hoursAgo: (n: number) => string;
    /** Date format for older entries — locale-formatted via Intl. */
    olderDateFallback: (iso: string) => string;
    /** Close button. */
    close: string;
  };

  suggestion: {
    /** Eyebrow / prefix shown before the reason copy ("Try next:"). */
    eyebrow: string;
    /** Aria label prefix for the chip (e.g. "Suggested next: ..."). */
    ariaPrefix: string;
    /** "Open" CTA on the chip's main action button. */
    openCta: string;
    /** Aria label for the dismiss (X) button. */
    dismissAriaLabel: string;
    /**
     * Per-reason short copy. Each renders as: "{eyebrow} {reasons[key]}".
     * Keep each line under ~10 words so it fits on one row on mobile.
     */
    reasons: Record<HubSuggestionReasonKey, string>;
  };
};

// ============================================================
// Helpers
// ============================================================

const n = (count: number) => Math.abs(count);

/**
 * English source. Other locales override only the strings they need to
 * re-translate; lambdas are re-implemented per locale because plural rules
 * vary even between European languages.
 */
const en: BioLabHistoryCopy = {
  strip: {
    eyebrow: "Last 7 days",
    emptyHeadline: "Your bench is quiet.",
    emptySubline: "Try a tool above when you're ready — sessions appear here afterwards.",
    weekSummary: (count) =>
      n(count) === 1 ? "1 session this week" : `${count} sessions this week`,
    streakLine: (count) => {
      if (count <= 0) return "";
      return n(count) === 1 ? "Streak: 1 day" : `Streak: ${count} days`;
    },
    aiNote: "AI helped on a recent session.",
    todayDone: "Done today",
    viewHistoryCta: "View history",
  },
  toolBadge: {
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: (count) => `${count}d ago`,
    longAgo: "30d+ ago",
    ariaLabel: (when) => `Last used: ${when}`,
  },
  sparkline: {
    emptyAria: "No sessions in the last 7 days",
    summaryAria: (count) =>
      n(count) === 1
        ? "1 session in the last 7 days"
        : `${count} sessions in the last 7 days`,
  },
  sheet: {
    title: "Recent sessions",
    subtitle: "Newest first, across all four tools.",
    emptyTitle: "Nothing here yet",
    emptyBody: "Once you complete a tool above, the session lands here.",
    toolEntryLabel: {
      "state-scan": "State Scan",
      "mind-sweep": "Mind Sweep",
      "focus-sprint": "Focus Sprint",
      "system-reset": "System Reset",
    },
    summary: {
      stateScan: (mood, energy, focus, stress) =>
        `Mood ${mood} · Energy ${energy} · Focus ${focus} · Stress ${stress}`,
      mindSweep: (count) =>
        n(count) === 1 ? "1 thought captured" : `${count} thoughts captured`,
      focusSprint: (intention, minutes) =>
        intention.trim().length > 0
          ? `${minutes}m · ${intention}`
          : `${minutes}m sprint`,
      systemReset: (steps) =>
        n(steps) === 1 ? "1 reset step" : `${steps} reset steps`,
    },
    aiTag: "AI-assisted",
    justNow: "Just now",
    minutesAgo: (count) => `${count}m ago`,
    hoursAgo: (count) => `${count}h ago`,
    olderDateFallback: (iso) => new Date(iso).toLocaleDateString("en-US"),
    close: "Close",
  },
  suggestion: {
    eyebrow: "Try next",
    ariaPrefix: "Suggested next",
    openCta: "Open",
    dismissAriaLabel: "Dismiss suggestion",
    reasons: {
      "stress-high-reset": "Stress was high — a System Reset can ease the load.",
      "energy-low-reset": "Energy ran low — a short System Reset helps you recover.",
      "focus-ready-sprint": "You felt focused — a Focus Sprint will use that.",
      "sprint-weak-reset": "That sprint felt off — try a System Reset before the next one.",
      "sprint-strong-rescan": "Strong sprint — scan your state to notice what shifted.",
      "many-thoughts-sprint": "A lot was on your mind — a Focus Sprint can move one thing.",
      "reset-rescan": "After the reset, scan your state to see what changed.",
    },
  },
};

const copyByLocale = createLocaleCopyMap(en, {
  "zh-TW": {
    strip: {
      eyebrow: "過去 7 日",
      emptyHeadline: "工作枱還很安靜。",
      emptySubline: "準備好就試試上面的工具——完成後紀錄會出現在這。",
      weekSummary: (count) => `本週 ${count} 次`,
      streakLine: (count) => (count <= 0 ? "" : `連續 ${count} 日`),
      aiNote: "最近有 AI 輔助的紀錄。",
      todayDone: "今日已完成",
      viewHistoryCta: "查看紀錄",
    },
    toolBadge: {
      today: "今日",
      yesterday: "昨日",
      daysAgo: (count) => `${count} 日前`,
      longAgo: "30 日以上",
      ariaLabel: (when) => `最近使用：${when}`,
    },
    sparkline: {
      emptyAria: "過去 7 日沒有使用紀錄",
      summaryAria: (count) => `過去 7 日有 ${count} 次使用紀錄`,
    },
    sheet: {
      title: "最近的紀錄",
      subtitle: "四個工具的最新紀錄,由近至遠。",
      emptyTitle: "還沒有紀錄",
      emptyBody: "完成上面任何一個工具後,就會出現在這。",
      toolEntryLabel: {
        "state-scan": "狀態掃描",
        "mind-sweep": "思緒清掃",
        "focus-sprint": "專注衝刺",
        "system-reset": "系統重置",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `心情 ${mood}・精力 ${energy}・專注 ${focus}・壓力 ${stress}`,
        mindSweep: (count) => `捕捉了 ${count} 個想法`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0 ? `${minutes} 分鐘・${intention}` : `${minutes} 分鐘衝刺`,
        systemReset: (steps) => `${steps} 個重置步驟`,
      },
      aiTag: "AI 輔助",
      justNow: "剛剛",
      minutesAgo: (count) => `${count} 分鐘前`,
      hoursAgo: (count) => `${count} 小時前`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("zh-TW"),
      close: "關閉",
    },
    suggestion: {
      eyebrow: "接下來試試",
      ariaPrefix: "建議下一步",
      openCta: "開啟",
      dismissAriaLabel: "忽略建議",
      reasons: {
        "stress-high-reset": "壓力偏高——做一次系統重置,把負擔放下。",
        "energy-low-reset": "精力偏低——一次短短的系統重置可以恢復。",
        "focus-ready-sprint": "現在很專注——用一次專注衝刺,把它用起來。",
        "sprint-weak-reset": "這次衝刺有點失準——下次之前先做一次系統重置。",
        "sprint-strong-rescan": "衝刺狀態很好——掃描狀態,看看有什麼改變。",
        "many-thoughts-sprint": "想法不少——用一次專注衝刺,先處理其中一件。",
        "reset-rescan": "重置之後,掃描一下狀態,看看有什麼改變。",
      },
    },
  },
  "zh-CN": {
    strip: {
      eyebrow: "过去 7 天",
      emptyHeadline: "工作台还很安静。",
      emptySubline: "准备好就试试上面的工具——完成后会出现在这里。",
      weekSummary: (count) => `本周 ${count} 次`,
      streakLine: (count) => (count <= 0 ? "" : `连续 ${count} 天`),
      aiNote: "最近有 AI 协助的记录。",
      todayDone: "今天已完成",
      viewHistoryCta: "查看记录",
    },
    toolBadge: {
      today: "今天",
      yesterday: "昨天",
      daysAgo: (count) => `${count} 天前`,
      longAgo: "30 天以上",
      ariaLabel: (when) => `最近使用：${when}`,
    },
    sparkline: {
      emptyAria: "过去 7 天没有使用记录",
      summaryAria: (count) => `过去 7 天有 ${count} 次使用记录`,
    },
    sheet: {
      title: "最近的记录",
      subtitle: "四个工具的最新记录,由近至远。",
      emptyTitle: "还没有记录",
      emptyBody: "完成上面任何工具后,就会出现在这里。",
      toolEntryLabel: {
        "state-scan": "状态扫描",
        "mind-sweep": "思绪清扫",
        "focus-sprint": "专注冲刺",
        "system-reset": "系统重置",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `心情 ${mood}・精力 ${energy}・专注 ${focus}・压力 ${stress}`,
        mindSweep: (count) => `捕捉了 ${count} 个想法`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0 ? `${minutes} 分钟・${intention}` : `${minutes} 分钟冲刺`,
        systemReset: (steps) => `${steps} 个重置步骤`,
      },
      aiTag: "AI 协助",
      justNow: "刚刚",
      minutesAgo: (count) => `${count} 分钟前`,
      hoursAgo: (count) => `${count} 小时前`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("zh-CN"),
      close: "关闭",
    },
    suggestion: {
      eyebrow: "接下来试试",
      ariaPrefix: "建议下一步",
      openCta: "打开",
      dismissAriaLabel: "忽略建议",
      reasons: {
        "stress-high-reset": "压力偏高——做一次系统重置,把负担放下。",
        "energy-low-reset": "精力偏低——一次短短的系统重置可以恢复。",
        "focus-ready-sprint": "现在很专注——用一次专注冲刺,把它用起来。",
        "sprint-weak-reset": "这次冲刺有点失准——下次之前先做一次系统重置。",
        "sprint-strong-rescan": "冲刺状态很好——扫描状态,看看有什么改变。",
        "many-thoughts-sprint": "想法不少——用一次专注冲刺,先处理其中一件。",
        "reset-rescan": "重置之后,扫描一下状态,看看有什么改变。",
      },
    },
  },
  ja: {
    strip: {
      eyebrow: "過去 7 日間",
      emptyHeadline: "ベンチはまだ静かです。",
      emptySubline: "上のツールを試してみてください。完了するとここに記録されます。",
      weekSummary: (count) => `今週 ${count} 回`,
      streakLine: (count) => (count <= 0 ? "" : `連続 ${count} 日`),
      aiNote: "最近のセッションで AI が補助しました。",
      todayDone: "本日完了",
      viewHistoryCta: "履歴を見る",
    },
    toolBadge: {
      today: "今日",
      yesterday: "昨日",
      daysAgo: (count) => `${count} 日前`,
      longAgo: "30 日以上前",
      ariaLabel: (when) => `最終使用：${when}`,
    },
    sparkline: {
      emptyAria: "過去 7 日間の利用なし",
      summaryAria: (count) => `過去 7 日間に ${count} 回利用`,
    },
    sheet: {
      title: "最近のセッション",
      subtitle: "4 つのツールすべて、新しい順に表示。",
      emptyTitle: "まだ何もありません",
      emptyBody: "上のツールを完了すると、ここに表示されます。",
      toolEntryLabel: {
        "state-scan": "ステートスキャン",
        "mind-sweep": "マインドスイープ",
        "focus-sprint": "フォーカススプリント",
        "system-reset": "システムリセット",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `気分 ${mood}・活力 ${energy}・集中 ${focus}・ストレス ${stress}`,
        mindSweep: (count) => `${count} 件の思考を記録`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0 ? `${minutes} 分・${intention}` : `${minutes} 分スプリント`,
        systemReset: (steps) => `リセット ${steps} ステップ`,
      },
      aiTag: "AI 補助",
      justNow: "たった今",
      minutesAgo: (count) => `${count} 分前`,
      hoursAgo: (count) => `${count} 時間前`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("ja-JP"),
      close: "閉じる",
    },
    suggestion: {
      eyebrow: "次におすすめ",
      ariaPrefix: "次の提案",
      openCta: "開く",
      dismissAriaLabel: "提案を閉じる",
      reasons: {
        "stress-high-reset": "ストレスが高めです — システムリセットで負担を軽くしましょう。",
        "energy-low-reset": "活力が低めです — 短いシステムリセットで回復を。",
        "focus-ready-sprint": "集中できているようです — フォーカススプリントを始めましょう。",
        "sprint-weak-reset": "今のスプリントは噛み合わなかったよう — 次の前にシステムリセットを。",
        "sprint-strong-rescan": "良いスプリントでした — ステートスキャンで変化を確認しましょう。",
        "many-thoughts-sprint": "頭の中が忙しそうです — フォーカススプリントで一つだけ進めましょう。",
        "reset-rescan": "リセット後はステートスキャンで変化を確認しましょう。",
      },
    },
  },
  ko: {
    strip: {
      eyebrow: "지난 7일",
      emptyHeadline: "작업대가 아직 조용합니다.",
      emptySubline: "위의 도구를 사용해 보세요. 완료하면 여기에 기록됩니다.",
      weekSummary: (count) => `이번 주 ${count}회`,
      streakLine: (count) => (count <= 0 ? "" : `연속 ${count}일`),
      aiNote: "최근 세션에서 AI의 도움을 받았습니다.",
      todayDone: "오늘 완료",
      viewHistoryCta: "기록 보기",
    },
    toolBadge: {
      today: "오늘",
      yesterday: "어제",
      daysAgo: (count) => `${count}일 전`,
      longAgo: "30일 이상",
      ariaLabel: (when) => `마지막 사용: ${when}`,
    },
    sparkline: {
      emptyAria: "지난 7일 동안 사용 기록 없음",
      summaryAria: (count) => `지난 7일 동안 ${count}회 사용`,
    },
    sheet: {
      title: "최근 세션",
      subtitle: "네 개 도구 전체, 최신순으로 표시.",
      emptyTitle: "아직 기록이 없습니다",
      emptyBody: "위의 도구를 완료하면 여기에 나타납니다.",
      toolEntryLabel: {
        "state-scan": "상태 스캔",
        "mind-sweep": "마인드 스위프",
        "focus-sprint": "포커스 스프린트",
        "system-reset": "시스템 리셋",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `기분 ${mood}・에너지 ${energy}・집중 ${focus}・스트레스 ${stress}`,
        mindSweep: (count) => `생각 ${count}개 기록`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0 ? `${minutes}분・${intention}` : `${minutes}분 스프린트`,
        systemReset: (steps) => `리셋 ${steps}단계`,
      },
      aiTag: "AI 보조",
      justNow: "방금 전",
      minutesAgo: (count) => `${count}분 전`,
      hoursAgo: (count) => `${count}시간 전`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("ko-KR"),
      close: "닫기",
    },
    suggestion: {
      eyebrow: "다음 추천",
      ariaPrefix: "다음 제안",
      openCta: "열기",
      dismissAriaLabel: "제안 닫기",
      reasons: {
        "stress-high-reset": "스트레스가 높았어요 — 시스템 리셋으로 부담을 덜어보세요.",
        "energy-low-reset": "에너지가 낮았어요 — 짧은 시스템 리셋이 도움이 됩니다.",
        "focus-ready-sprint": "집중이 잘 되네요 — 포커스 스프린트로 활용해 보세요.",
        "sprint-weak-reset": "이번 스프린트가 잘 안 맞았네요 — 다음 전에 시스템 리셋을.",
        "sprint-strong-rescan": "좋은 스프린트였어요 — 상태 스캔으로 변화를 확인해 보세요.",
        "many-thoughts-sprint": "생각이 많았네요 — 포커스 스프린트로 하나씩 정리해 보세요.",
        "reset-rescan": "리셋 후 상태 스캔으로 무엇이 달라졌는지 확인해 보세요.",
      },
    },
  },
  fr: {
    strip: {
      eyebrow: "7 derniers jours",
      emptyHeadline: "L'établi est calme.",
      emptySubline:
        "Essayez un outil ci-dessus quand vous êtes prêt·e — les sessions apparaîtront ici.",
      weekSummary: (count) =>
        n(count) === 1 ? "1 session cette semaine" : `${count} sessions cette semaine`,
      streakLine: (count) => {
        if (count <= 0) return "";
        return n(count) === 1 ? "Série : 1 jour" : `Série : ${count} jours`;
      },
      aiNote: "L'IA a aidé sur une session récente.",
      todayDone: "Fait aujourd'hui",
      viewHistoryCta: "Voir l'historique",
    },
    toolBadge: {
      today: "Aujourd'hui",
      yesterday: "Hier",
      daysAgo: (count) => `il y a ${count} j`,
      longAgo: "30 j+",
      ariaLabel: (when) => `Dernière utilisation : ${when}`,
    },
    sparkline: {
      emptyAria: "Aucune session sur les 7 derniers jours",
      summaryAria: (count) =>
        n(count) === 1
          ? "1 session sur les 7 derniers jours"
          : `${count} sessions sur les 7 derniers jours`,
    },
    sheet: {
      title: "Sessions récentes",
      subtitle: "Plus récentes en premier, sur les quatre outils.",
      emptyTitle: "Rien ici pour l'instant",
      emptyBody: "Une fois un outil terminé ci-dessus, la session apparaît ici.",
      toolEntryLabel: {
        "state-scan": "Scan d'état",
        "mind-sweep": "Vider l'esprit",
        "focus-sprint": "Sprint de focus",
        "system-reset": "Réinitialisation",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `Humeur ${mood} · Énergie ${energy} · Focus ${focus} · Stress ${stress}`,
        mindSweep: (count) =>
          n(count) === 1 ? "1 pensée capturée" : `${count} pensées capturées`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0
            ? `${minutes} min · ${intention}`
            : `Sprint de ${minutes} min`,
        systemReset: (steps) =>
          n(steps) === 1 ? "1 étape de reset" : `${steps} étapes de reset`,
      },
      aiTag: "Assisté par IA",
      justNow: "À l'instant",
      minutesAgo: (count) => `il y a ${count} min`,
      hoursAgo: (count) => `il y a ${count} h`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("fr-FR"),
      close: "Fermer",
    },
    suggestion: {
      eyebrow: "À essayer ensuite",
      ariaPrefix: "Suggestion suivante",
      openCta: "Ouvrir",
      dismissAriaLabel: "Ignorer la suggestion",
      reasons: {
        "stress-high-reset":
          "Le stress était élevé — une réinitialisation peut alléger la charge.",
        "energy-low-reset":
          "L'énergie était basse — une courte réinitialisation aide à récupérer.",
        "focus-ready-sprint":
          "Tu te sentais concentré·e — un sprint de focus en profitera.",
        "sprint-weak-reset":
          "Ce sprint n'a pas accroché — fais une réinitialisation avant le prochain.",
        "sprint-strong-rescan":
          "Beau sprint — scanne ton état pour noter ce qui a changé.",
        "many-thoughts-sprint":
          "Beaucoup en tête — un sprint de focus peut faire avancer une chose.",
        "reset-rescan":
          "Après la réinitialisation, scanne ton état pour voir ce qui a changé.",
      },
    },
  },
  it: {
    strip: {
      eyebrow: "Ultimi 7 giorni",
      emptyHeadline: "Il banco è silenzioso.",
      emptySubline:
        "Prova uno strumento qui sopra quando sei pronto/a — le sessioni appariranno qui.",
      weekSummary: (count) =>
        n(count) === 1 ? "1 sessione questa settimana" : `${count} sessioni questa settimana`,
      streakLine: (count) => {
        if (count <= 0) return "";
        return n(count) === 1 ? "Serie: 1 giorno" : `Serie: ${count} giorni`;
      },
      aiNote: "L'IA ha aiutato in una sessione recente.",
      todayDone: "Fatto oggi",
      viewHistoryCta: "Vedi cronologia",
    },
    toolBadge: {
      today: "Oggi",
      yesterday: "Ieri",
      daysAgo: (count) => `${count} g fa`,
      longAgo: "30 g+",
      ariaLabel: (when) => `Ultimo uso: ${when}`,
    },
    sparkline: {
      emptyAria: "Nessuna sessione negli ultimi 7 giorni",
      summaryAria: (count) =>
        n(count) === 1
          ? "1 sessione negli ultimi 7 giorni"
          : `${count} sessioni negli ultimi 7 giorni`,
    },
    sheet: {
      title: "Sessioni recenti",
      subtitle: "Dalla più recente, su tutti e quattro gli strumenti.",
      emptyTitle: "Ancora nulla qui",
      emptyBody: "Quando completi uno strumento qui sopra, la sessione comparirà qui.",
      toolEntryLabel: {
        "state-scan": "Scan dello stato",
        "mind-sweep": "Svuota la mente",
        "focus-sprint": "Sprint di focus",
        "system-reset": "Reset di sistema",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `Umore ${mood} · Energia ${energy} · Focus ${focus} · Stress ${stress}`,
        mindSweep: (count) =>
          n(count) === 1 ? "1 pensiero raccolto" : `${count} pensieri raccolti`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0
            ? `${minutes} min · ${intention}`
            : `Sprint da ${minutes} min`,
        systemReset: (steps) =>
          n(steps) === 1 ? "1 passo di reset" : `${steps} passi di reset`,
      },
      aiTag: "Con l'IA",
      justNow: "Adesso",
      minutesAgo: (count) => `${count} min fa`,
      hoursAgo: (count) => `${count} h fa`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("it-IT"),
      close: "Chiudi",
    },
    suggestion: {
      eyebrow: "Prova ora",
      ariaPrefix: "Suggerimento successivo",
      openCta: "Apri",
      dismissAriaLabel: "Ignora il suggerimento",
      reasons: {
        "stress-high-reset":
          "Lo stress era alto — un Reset può alleggerirti.",
        "energy-low-reset":
          "L'energia era bassa — un breve Reset aiuta a recuperare.",
        "focus-ready-sprint":
          "Ti sentivi concentrato/a — uno Sprint di focus ne approfitterà.",
        "sprint-weak-reset":
          "Lo sprint non ha funzionato — fai un Reset prima del prossimo.",
        "sprint-strong-rescan":
          "Bello sprint — scansiona il tuo stato per notare il cambiamento.",
        "many-thoughts-sprint":
          "Molto in mente — uno Sprint di focus può far avanzare una cosa.",
        "reset-rescan":
          "Dopo il Reset, scansiona il tuo stato per vedere cosa è cambiato.",
      },
    },
  },
  es: {
    strip: {
      eyebrow: "Últimos 7 días",
      emptyHeadline: "El banco está tranquilo.",
      emptySubline:
        "Prueba una herramienta arriba cuando estés listo/a — las sesiones aparecerán aquí.",
      weekSummary: (count) =>
        n(count) === 1 ? "1 sesión esta semana" : `${count} sesiones esta semana`,
      streakLine: (count) => {
        if (count <= 0) return "";
        return n(count) === 1 ? "Racha: 1 día" : `Racha: ${count} días`;
      },
      aiNote: "La IA ayudó en una sesión reciente.",
      todayDone: "Hecho hoy",
      viewHistoryCta: "Ver historial",
    },
    toolBadge: {
      today: "Hoy",
      yesterday: "Ayer",
      daysAgo: (count) => `hace ${count} d`,
      longAgo: "30 d+",
      ariaLabel: (when) => `Último uso: ${when}`,
    },
    sparkline: {
      emptyAria: "Sin sesiones en los últimos 7 días",
      summaryAria: (count) =>
        n(count) === 1
          ? "1 sesión en los últimos 7 días"
          : `${count} sesiones en los últimos 7 días`,
    },
    sheet: {
      title: "Sesiones recientes",
      subtitle: "Más recientes primero, en las cuatro herramientas.",
      emptyTitle: "Aún no hay nada",
      emptyBody: "Cuando termines una herramienta arriba, la sesión aparecerá aquí.",
      toolEntryLabel: {
        "state-scan": "Escaneo de estado",
        "mind-sweep": "Vaciar la mente",
        "focus-sprint": "Sprint de enfoque",
        "system-reset": "Reinicio del sistema",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `Ánimo ${mood} · Energía ${energy} · Enfoque ${focus} · Estrés ${stress}`,
        mindSweep: (count) =>
          n(count) === 1 ? "1 pensamiento capturado" : `${count} pensamientos capturados`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0
            ? `${minutes} min · ${intention}`
            : `Sprint de ${minutes} min`,
        systemReset: (steps) =>
          n(steps) === 1 ? "1 paso de reinicio" : `${steps} pasos de reinicio`,
      },
      aiTag: "Con IA",
      justNow: "Ahora mismo",
      minutesAgo: (count) => `hace ${count} min`,
      hoursAgo: (count) => `hace ${count} h`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("es-ES"),
      close: "Cerrar",
    },
    suggestion: {
      eyebrow: "Prueba ahora",
      ariaPrefix: "Siguiente sugerencia",
      openCta: "Abrir",
      dismissAriaLabel: "Descartar sugerencia",
      reasons: {
        "stress-high-reset":
          "El estrés estaba alto — un Reinicio puede aliviar la carga.",
        "energy-low-reset":
          "La energía estaba baja — un Reinicio breve ayuda a recuperarte.",
        "focus-ready-sprint":
          "Te sentías enfocado/a — un Sprint de enfoque lo aprovechará.",
        "sprint-weak-reset":
          "Ese sprint no encajó — haz un Reinicio antes del próximo.",
        "sprint-strong-rescan":
          "Buen sprint — escanea tu estado para notar lo que cambió.",
        "many-thoughts-sprint":
          "Tenías muchas cosas en la cabeza — un Sprint puede mover una.",
        "reset-rescan":
          "Tras el Reinicio, escanea tu estado para ver qué cambió.",
      },
    },
  },
  vi: {
    strip: {
      eyebrow: "7 ngày qua",
      emptyHeadline: "Bàn làm việc đang yên ắng.",
      emptySubline:
        "Hãy thử một công cụ ở trên khi bạn sẵn sàng — các phiên sẽ xuất hiện ở đây.",
      weekSummary: (count) => `Tuần này ${count} phiên`,
      streakLine: (count) => (count <= 0 ? "" : `Chuỗi ${count} ngày`),
      aiNote: "AI đã hỗ trợ một phiên gần đây.",
      todayDone: "Hoàn tất hôm nay",
      viewHistoryCta: "Xem lịch sử",
    },
    toolBadge: {
      today: "Hôm nay",
      yesterday: "Hôm qua",
      daysAgo: (count) => `${count} ngày trước`,
      longAgo: "Hơn 30 ngày",
      ariaLabel: (when) => `Lần sử dụng cuối: ${when}`,
    },
    sparkline: {
      emptyAria: "Không có phiên nào trong 7 ngày qua",
      summaryAria: (count) => `${count} phiên trong 7 ngày qua`,
    },
    sheet: {
      title: "Phiên gần đây",
      subtitle: "Mới nhất trước, trên cả bốn công cụ.",
      emptyTitle: "Chưa có gì ở đây",
      emptyBody: "Khi bạn hoàn tất một công cụ ở trên, phiên sẽ xuất hiện ở đây.",
      toolEntryLabel: {
        "state-scan": "Quét trạng thái",
        "mind-sweep": "Dọn tâm trí",
        "focus-sprint": "Bứt tốc tập trung",
        "system-reset": "Đặt lại hệ thống",
      },
      summary: {
        stateScan: (mood, energy, focus, stress) =>
          `Tâm trạng ${mood} · Năng lượng ${energy} · Tập trung ${focus} · Căng thẳng ${stress}`,
        mindSweep: (count) => `Ghi nhận ${count} suy nghĩ`,
        focusSprint: (intention, minutes) =>
          intention.trim().length > 0
            ? `${minutes} phút · ${intention}`
            : `Bứt tốc ${minutes} phút`,
        systemReset: (steps) => `${steps} bước đặt lại`,
      },
      aiTag: "Có hỗ trợ AI",
      justNow: "Vừa xong",
      minutesAgo: (count) => `${count} phút trước`,
      hoursAgo: (count) => `${count} giờ trước`,
      olderDateFallback: (iso) => new Date(iso).toLocaleDateString("vi-VN"),
      close: "Đóng",
    },
    suggestion: {
      eyebrow: "Thử tiếp",
      ariaPrefix: "Gợi ý tiếp theo",
      openCta: "Mở",
      dismissAriaLabel: "Bỏ qua gợi ý",
      reasons: {
        "stress-high-reset":
          "Căng thẳng đang cao — một lần Đặt lại hệ thống sẽ giúp nhẹ lòng.",
        "energy-low-reset":
          "Năng lượng đang thấp — một lần Đặt lại ngắn giúp hồi phục.",
        "focus-ready-sprint":
          "Bạn đang tập trung — Bứt tốc tập trung sẽ tận dụng được.",
        "sprint-weak-reset":
          "Phiên bứt tốc không thuận — hãy Đặt lại hệ thống trước phiên sau.",
        "sprint-strong-rescan":
          "Phiên bứt tốc tốt — Quét trạng thái để thấy điều gì đã đổi.",
        "many-thoughts-sprint":
          "Nhiều suy nghĩ — Bứt tốc tập trung sẽ giúp giải quyết một việc.",
        "reset-rescan":
          "Sau khi đặt lại, hãy Quét trạng thái để thấy điều gì đã đổi.",
      },
    },
  },
});

export function getBioLabHistoryCopy(locale: AppLocale): BioLabHistoryCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
