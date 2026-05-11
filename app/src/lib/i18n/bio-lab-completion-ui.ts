/**
 * Copy for the post-completion card (`ToolCompletionCard`) and the
 * AI-assist surface across the four Bio Lab tools. Source-of-truth English;
 * the other 8 locales are written explicitly per the supplementary spec.
 *
 * `nextStepIntents` is keyed by {@link NextStepIntentKey} from
 * `lib/bio-lab/completion-types.ts`. Each entry is a function so the rule
 * engine can pass numeric signals (task counts, scores) without forcing the
 * i18n layer into ad-hoc string interpolation.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { UiTheme } from "@/types/database";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";
import type {
  NextStepIntentKey,
  NextStepSignal,
  ToolType,
} from "@/lib/bio-lab/completion-types";

export type ResolvedNextStepCopy = {
  /** Short, present-tense headline (e.g. "Stress is high — steady yourself first.") */
  headline: string;
  /** One-line body sentence describing why and what to do. */
  body: string;
  /** CTA button label. */
  ctaLabel: string;
};

type NextStepIntentBuilder = (signal: NextStepSignal) => ResolvedNextStepCopy;

export type BioLabCompletionCopy = {
  /** Generic words used inside the card chrome. */
  card: {
    eyebrow: string;
    insightLabel: string;
    nextStepLabel: string;
    skipLabel: string;
    closeLabel: string;
    /** Used when the suggested CTA is "open the {{tool}} again". */
    openAnother: (toolTitle: string) => string;
  };
  /** Per-tool completion summary lines. Keep short, neutral, observational. */
  summaries: {
    "state-scan": {
      title: string;
      noteFallback: string;
      pillLabel: (dim: "mood" | "energy" | "focus" | "stress") => string;
    };
    "mind-sweep": {
      title: string;
      breakdown: (counts: {
        task: number;
        worry: number;
        idea: number;
        reminder: number;
      }) => string;
      empty: string;
    };
    "focus-sprint": {
      title: string;
      durationLine: (workMin: number, breakMin: number) => string;
      outcomeLabel: (
        outcome: "completed" | "partial" | "blocked",
      ) => string;
      ratingLine: (rating: number) => string;
    };
    "system-reset": {
      title: string;
      stepsLine: (completed: number, total: number) => string;
      adaptiveLine: string;
    };
  };
  /** Display titles per tool — kept here so `useNextStepSuggestion` is
   *  self-contained and doesn't need to import `bio-lab-tools-ui.ts`. */
  toolTitles: Record<ToolType, string>;
  nextStepIntents: Record<NextStepIntentKey, NextStepIntentBuilder>;
  /** Theme-aware closing line at the bottom of the card. */
  closingByTheme: Record<UiTheme, string>;
};

const en: BioLabCompletionCopy = {
  card: {
    eyebrow: "Session complete",
    insightLabel: "What this points to",
    nextStepLabel: "One small next step",
    skipLabel: "Not now",
    closeLabel: "Close",
    openAnother: (t) => `Open ${t}`,
  },
  summaries: {
    "state-scan": {
      title: "Today's read",
      noteFallback: "No note this time.",
      pillLabel: (dim) =>
        ({
          mood: "Mood",
          energy: "Energy",
          focus: "Focus",
          stress: "Stress",
        })[dim],
    },
    "mind-sweep": {
      title: "What landed",
      breakdown: ({ task, worry, idea, reminder }) => {
        const parts: string[] = [];
        if (task) parts.push(`${task} ${task === 1 ? "task" : "tasks"}`);
        if (worry) parts.push(`${worry} ${worry === 1 ? "worry" : "worries"}`);
        if (idea) parts.push(`${idea} ${idea === 1 ? "idea" : "ideas"}`);
        if (reminder)
          parts.push(`${reminder} ${reminder === 1 ? "reminder" : "reminders"}`);
        return parts.join(" · ");
      },
      empty: "Nothing captured this round.",
    },
    "focus-sprint": {
      title: "Sprint logged",
      durationLine: (w, b) => `${w} min focus · ${b} min recovery`,
      outcomeLabel: (o) =>
        ({
          completed: "Completed",
          partial: "Partial",
          blocked: "Blocked",
        })[o],
      ratingLine: (r) => `Self-rated focus: ${r}/5`,
    },
    "system-reset": {
      title: "Reset complete",
      stepsLine: (c, t) => `${c} of ${t} steps moved through`,
      adaptiveLine: "Sequence adapted to your current state.",
    },
  },
  toolTitles: {
    "focus-sprint": "Focus Sprint",
    "mind-sweep": "Mind Sweep",
    "state-scan": "State Scan",
    "system-reset": "System Reset",
  },
  nextStepIntents: {
    "stress-high-reset": (s) => ({
      headline: "Stress is high — steady yourself first.",
      body: `Your stress reads ${s.stress ?? "—"}/5. A short reset before anything else.`,
      ctaLabel: "Start System Reset",
    }),
    "energy-low-reset": (s) => ({
      headline: "Low fuel — refill before pushing.",
      body: `Energy at ${s.energy ?? "—"}/5. A reset to ground, then decide.`,
      ctaLabel: "Start System Reset",
    }),
    "focus-ready-sprint": (s) => ({
      headline: "Focus is sharp — use it.",
      body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "task" : "tasks"} waiting. A short sprint will clear one.`,
      ctaLabel: "Start a Focus Sprint",
    }),
    "neutral-mindSweep": () => ({
      headline: "Capture what's circling.",
      body: "A quick sweep often surfaces what to do next.",
      ctaLabel: "Start a Mind Sweep",
    }),
    "tasks-ready-sprint": (s) => ({
      headline: "Pick one task and run with it.",
      body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "task" : "tasks"} captured. A focused sprint moves one across the line.`,
      ctaLabel: "Start a Focus Sprint",
    }),
    "all-worries-reset": (s) => ({
      headline: "All worries — ground first.",
      body: `${s.worryCount ?? 0} ${s.worryCount === 1 ? "worry" : "worries"} on the page. A reset will make the next move clearer.`,
      ctaLabel: "Start System Reset",
    }),
    "captured-stateScan": () => ({
      headline: "Notice how it feels now.",
      body: "After a sweep, the body usually shifts. A quick scan will tell you how.",
      ctaLabel: "Open State Scan",
    }),
    "sprint-strong-again": () => ({
      headline: "Strong block — ride the wave.",
      body: "You rated this one high. One more sprint while focus holds?",
      ctaLabel: "Start another sprint",
    }),
    "sprint-weak-reset": () => ({
      headline: "That one was rough — reset, don't push.",
      body: "Low rating. A short reset is more useful than another sprint right now.",
      ctaLabel: "Start System Reset",
    }),
    "sprint-weak-stateScan": () => ({
      headline: "Notice what shifted.",
      body: "Quick scan to see where you actually are after that sprint.",
      ctaLabel: "Open State Scan",
    }),
    "sprint-default-stateScan": () => ({
      headline: "Re-check your state.",
      body: "A short scan helps you decide whether to keep going or pause.",
      ctaLabel: "Open State Scan",
    }),
    "reset-recheck-state": () => ({
      headline: "See what shifted.",
      body: "Right after a reset is the best time to read your state again.",
      ctaLabel: "Open State Scan",
    }),
    "session-rest": () => ({
      headline: "Done for now.",
      body: "Step away from the screen. Come back when something feels worth it.",
      ctaLabel: "Close",
    }),
  },
  closingByTheme: {
    default: "Small loops. Daily practice.",
    astronaut: "Systems steady. Mission continues.",
    academia: "One observation logged. Resume notes.",
    forest: "One quiet pass. The clearing waits.",
  },
};

const copyByLocale = createLocaleCopyMap(en, {
  "zh-TW": {
    card: {
      eyebrow: "本輪完成",
      insightLabel: "這次顯示的訊號",
      nextStepLabel: "下一個小步驟",
      skipLabel: "暫時不用",
      closeLabel: "關閉",
      openAnother: (t) => `開啟${t}`,
    },
    summaries: {
      "state-scan": {
        title: "今日讀數",
        noteFallback: "今次沒有備註。",
        pillLabel: (dim) =>
          ({ mood: "心情", energy: "能量", focus: "專注", stress: "壓力" })[dim],
      },
      "mind-sweep": {
        title: "落了甚麼",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} 個任務`);
          if (worry) parts.push(`${worry} 個擔心`);
          if (idea) parts.push(`${idea} 個靈感`);
          if (reminder) parts.push(`${reminder} 個提醒`);
          return parts.join(" · ");
        },
        empty: "今輪沒有捕捉內容。",
      },
      "focus-sprint": {
        title: "衝刺已記錄",
        durationLine: (w, b) => `${w} 分鐘專注 · ${b} 分鐘恢復`,
        outcomeLabel: (o) =>
          ({ completed: "完成", partial: "部分完成", blocked: "卡住" })[o],
        ratingLine: (r) => `自評專注：${r}/5`,
      },
      "system-reset": {
        title: "重置完成",
        stepsLine: (c, t) => `走過 ${c} / ${t} 步`,
        adaptiveLine: "本輪流程根據你的狀態作了調整。",
      },
    },
    toolTitles: {
      "focus-sprint": "專注衝刺",
      "mind-sweep": "思緒清掃",
      "state-scan": "狀態掃描",
      "system-reset": "系統重置",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "壓力偏高——先讓自己穩下來。",
        body: `壓力顯示 ${s.stress ?? "—"}/5。先做一次短重置，其他事之後再說。`,
        ctaLabel: "開始系統重置",
      }),
      "energy-low-reset": (s) => ({
        headline: "電量低——先補一補再走。",
        body: `能量 ${s.energy ?? "—"}/5。先做一次重置，再決定下一步。`,
        ctaLabel: "開始系統重置",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "專注度夠——把握住。",
        body: `有 ${s.taskCount ?? 0} 個任務。一次短衝刺就能解決一個。`,
        ctaLabel: "開始專注衝刺",
      }),
      "neutral-mindSweep": () => ({
        headline: "把腦中盤旋的先寫下來。",
        body: "快速一輪清掃，常會浮出真正想做的下一件事。",
        ctaLabel: "開始思緒清掃",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "挑一個任務，動手做。",
        body: `已記下 ${s.taskCount ?? 0} 個任務。一次專注衝刺就能推進一個。`,
        ctaLabel: "開始專注衝刺",
      }),
      "all-worries-reset": (s) => ({
        headline: "全是擔心——先讓身體穩。",
        body: `頁面上有 ${s.worryCount ?? 0} 個擔心。重置一下，下一步會更清楚。`,
        ctaLabel: "開始系統重置",
      }),
      "captured-stateScan": () => ({
        headline: "感受一下現在如何。",
        body: "清掃之後身體通常會變。掃描一次就知。",
        ctaLabel: "開啟狀態掃描",
      }),
      "sprint-strong-again": () => ({
        headline: "這段做得好——順勢再來一段。",
        body: "你給了高分。趁專注還在，再一段如何？",
        ctaLabel: "再開一段衝刺",
      }),
      "sprint-weak-reset": () => ({
        headline: "這段不容易——別硬撐，先重置。",
        body: "低分。比起再一段，重置一下更有用。",
        ctaLabel: "開始系統重置",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "看看有甚麼變了。",
        body: "短短掃一次，看看這段後你真正在哪裡。",
        ctaLabel: "開啟狀態掃描",
      }),
      "sprint-default-stateScan": () => ({
        headline: "重新讀一下狀態。",
        body: "快速掃描有助你決定繼續或休息。",
        ctaLabel: "開啟狀態掃描",
      }),
      "reset-recheck-state": () => ({
        headline: "看看身體有沒有移動。",
        body: "重置後，是再讀一次狀態的最佳時機。",
        ctaLabel: "開啟狀態掃描",
      }),
      "session-rest": () => ({
        headline: "今次到此。",
        body: "離開螢幕一會。等真的有事再回來。",
        ctaLabel: "關閉",
      }),
    },
    closingByTheme: {
      default: "小循環，日日做。",
      astronaut: "系統穩定。任務繼續。",
      academia: "已記一條觀察。回到筆記。",
      forest: "輕輕一遍。林中空地會等你。",
    },
  },
  "zh-CN": {
    card: {
      eyebrow: "本轮完成",
      insightLabel: "这次显示的信号",
      nextStepLabel: "下一个小步骤",
      skipLabel: "暂时不用",
      closeLabel: "关闭",
      openAnother: (t) => `打开${t}`,
    },
    summaries: {
      "state-scan": {
        title: "今日读数",
        noteFallback: "本次没有备注。",
        pillLabel: (dim) =>
          ({ mood: "心情", energy: "能量", focus: "专注", stress: "压力" })[dim],
      },
      "mind-sweep": {
        title: "本轮落下",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} 个任务`);
          if (worry) parts.push(`${worry} 个担心`);
          if (idea) parts.push(`${idea} 个灵感`);
          if (reminder) parts.push(`${reminder} 个提醒`);
          return parts.join(" · ");
        },
        empty: "本轮没有捕获内容。",
      },
      "focus-sprint": {
        title: "冲刺已记录",
        durationLine: (w, b) => `${w} 分钟专注 · ${b} 分钟恢复`,
        outcomeLabel: (o) =>
          ({ completed: "完成", partial: "部分完成", blocked: "卡住" })[o],
        ratingLine: (r) => `自评专注：${r}/5`,
      },
      "system-reset": {
        title: "重置完成",
        stepsLine: (c, t) => `走过 ${c} / ${t} 步`,
        adaptiveLine: "本轮流程根据你的状态做了调整。",
      },
    },
    toolTitles: {
      "focus-sprint": "专注冲刺",
      "mind-sweep": "思绪清扫",
      "state-scan": "状态扫描",
      "system-reset": "系统重置",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "压力偏高——先让自己稳下来。",
        body: `压力显示 ${s.stress ?? "—"}/5。先做一次短重置，其他事之后再说。`,
        ctaLabel: "开始系统重置",
      }),
      "energy-low-reset": (s) => ({
        headline: "电量低——先补一补再走。",
        body: `能量 ${s.energy ?? "—"}/5。先做一次重置，再决定下一步。`,
        ctaLabel: "开始系统重置",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "专注度够——抓住它。",
        body: `有 ${s.taskCount ?? 0} 个任务。一次短冲刺就能解决一个。`,
        ctaLabel: "开始专注冲刺",
      }),
      "neutral-mindSweep": () => ({
        headline: "先把脑中盘旋的写下来。",
        body: "快速清扫一轮，常会浮出真正想做的下一件事。",
        ctaLabel: "开始思绪清扫",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "挑一个任务，动手做。",
        body: `已记下 ${s.taskCount ?? 0} 个任务。一次专注冲刺就能推进一个。`,
        ctaLabel: "开始专注冲刺",
      }),
      "all-worries-reset": (s) => ({
        headline: "全是担心——先让身体稳。",
        body: `页面上有 ${s.worryCount ?? 0} 个担心。重置一下，下一步会更清楚。`,
        ctaLabel: "开始系统重置",
      }),
      "captured-stateScan": () => ({
        headline: "感受一下现在如何。",
        body: "清扫之后身体通常会变。扫描一次就知道。",
        ctaLabel: "打开状态扫描",
      }),
      "sprint-strong-again": () => ({
        headline: "这段做得好——顺势再来一段。",
        body: "你给了高分。趁专注还在，再一段如何？",
        ctaLabel: "再开一段冲刺",
      }),
      "sprint-weak-reset": () => ({
        headline: "这段不容易——别硬撑，先重置。",
        body: "低分。比起再一段，重置一下更有用。",
        ctaLabel: "开始系统重置",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "看看有什么变了。",
        body: "短短扫一次，看看这段后你真正在哪里。",
        ctaLabel: "打开状态扫描",
      }),
      "sprint-default-stateScan": () => ({
        headline: "重新读一下状态。",
        body: "快速扫描有助你决定继续或暂停。",
        ctaLabel: "打开状态扫描",
      }),
      "reset-recheck-state": () => ({
        headline: "看看身体有没有移动。",
        body: "重置后，是再读一次状态的最佳时机。",
        ctaLabel: "打开状态扫描",
      }),
      "session-rest": () => ({
        headline: "今次到此。",
        body: "离开屏幕一会儿。真有事再回来。",
        ctaLabel: "关闭",
      }),
    },
    closingByTheme: {
      default: "小循环，日日做。",
      astronaut: "系统稳定。任务继续。",
      academia: "已记一条观察。回到笔记。",
      forest: "轻轻一遍。林中空地会等你。",
    },
  },
  ja: {
    card: {
      eyebrow: "セッション完了",
      insightLabel: "今回見えた兆し",
      nextStepLabel: "小さな次の一歩",
      skipLabel: "今はやめる",
      closeLabel: "閉じる",
      openAnother: (t) => `${t}を開く`,
    },
    summaries: {
      "state-scan": {
        title: "今日の読み",
        noteFallback: "今回はメモなし。",
        pillLabel: (dim) =>
          ({ mood: "気分", energy: "エネルギー", focus: "集中", stress: "ストレス" })[dim],
      },
      "mind-sweep": {
        title: "書き出した内容",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`タスク ${task} 件`);
          if (worry) parts.push(`心配 ${worry} 件`);
          if (idea) parts.push(`アイデア ${idea} 件`);
          if (reminder) parts.push(`リマインド ${reminder} 件`);
          return parts.join(" · ");
        },
        empty: "今回は書き出しなし。",
      },
      "focus-sprint": {
        title: "スプリントを記録",
        durationLine: (w, b) => `${w} 分集中 · ${b} 分回復`,
        outcomeLabel: (o) =>
          ({ completed: "完了", partial: "一部完了", blocked: "詰まり" })[o],
        ratingLine: (r) => `自己評価の集中：${r}/5`,
      },
      "system-reset": {
        title: "リセット完了",
        stepsLine: (c, t) => `${t} ステップ中 ${c} を通過`,
        adaptiveLine: "今回の流れは状態に合わせて調整しました。",
      },
    },
    toolTitles: {
      "focus-sprint": "フォーカス・スプリント",
      "mind-sweep": "マインド・スイープ",
      "state-scan": "ステート・スキャン",
      "system-reset": "システム・リセット",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "ストレスが高い——まず落ち着こう。",
        body: `ストレスは ${s.stress ?? "—"}/5。短いリセットを先に。`,
        ctaLabel: "システム・リセットを始める",
      }),
      "energy-low-reset": (s) => ({
        headline: "燃料切れ——押す前に補充。",
        body: `エネルギーは ${s.energy ?? "—"}/5。リセットで地に足を。`,
        ctaLabel: "システム・リセットを始める",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "集中が冴えている——使おう。",
        body: `タスクが ${s.taskCount ?? 0} 件待機中。短いスプリントで一つ片付ける。`,
        ctaLabel: "フォーカス・スプリントを始める",
      }),
      "neutral-mindSweep": () => ({
        headline: "頭の中を書き出してみる。",
        body: "ざっと書き出すと、次の一手が見えやすい。",
        ctaLabel: "マインド・スイープを始める",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "ひとつ選んで動こう。",
        body: `${s.taskCount ?? 0} 件のタスク。短いスプリントで一つ進める。`,
        ctaLabel: "フォーカス・スプリントを始める",
      }),
      "all-worries-reset": (s) => ({
        headline: "心配ばかり——まず地に足。",
        body: `${s.worryCount ?? 0} 件の心配。リセットすると次が見えやすい。`,
        ctaLabel: "システム・リセットを始める",
      }),
      "captured-stateScan": () => ({
        headline: "今の感じを確かめよう。",
        body: "書き出した後は体が変わる。スキャンで確認。",
        ctaLabel: "ステート・スキャンを開く",
      }),
      "sprint-strong-again": () => ({
        headline: "良い回——勢いに乗ろう。",
        body: "高評価。集中があるうちに、もう一回？",
        ctaLabel: "もう一度スプリント",
      }),
      "sprint-weak-reset": () => ({
        headline: "今回は重かった——押さずリセット。",
        body: "低評価。次のスプリントよりリセットが効く。",
        ctaLabel: "システム・リセットを始める",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "何が変わったかを見る。",
        body: "短いスキャンで現在地を確認。",
        ctaLabel: "ステート・スキャンを開く",
      }),
      "sprint-default-stateScan": () => ({
        headline: "状態を読み直す。",
        body: "短いスキャンで続けるか休むかを決めやすく。",
        ctaLabel: "ステート・スキャンを開く",
      }),
      "reset-recheck-state": () => ({
        headline: "何が動いたか見る。",
        body: "リセット直後は、もう一度状態を読む好機。",
        ctaLabel: "ステート・スキャンを開く",
      }),
      "session-rest": () => ({
        headline: "今日はここまで。",
        body: "画面から離れよう。気が向いたら戻ろう。",
        ctaLabel: "閉じる",
      }),
    },
    closingByTheme: {
      default: "小さなループ、毎日の練習。",
      astronaut: "システム安定。任務継続。",
      academia: "観察を一件記録。ノートに戻る。",
      forest: "静かな一巡。林の空き地が待つ。",
    },
  },
  ko: {
    card: {
      eyebrow: "세션 완료",
      insightLabel: "이번에 드러난 신호",
      nextStepLabel: "작은 다음 한 걸음",
      skipLabel: "지금은 됐어요",
      closeLabel: "닫기",
      openAnother: (t) => `${t} 열기`,
    },
    summaries: {
      "state-scan": {
        title: "오늘의 신호",
        noteFallback: "이번에는 메모 없음.",
        pillLabel: (dim) =>
          ({ mood: "기분", energy: "에너지", focus: "집중", stress: "스트레스" })[dim],
      },
      "mind-sweep": {
        title: "정리한 내용",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`할 일 ${task}개`);
          if (worry) parts.push(`걱정 ${worry}개`);
          if (idea) parts.push(`아이디어 ${idea}개`);
          if (reminder) parts.push(`알림 ${reminder}개`);
          return parts.join(" · ");
        },
        empty: "이번엔 적은 게 없네요.",
      },
      "focus-sprint": {
        title: "스프린트 기록됨",
        durationLine: (w, b) => `${w}분 집중 · ${b}분 회복`,
        outcomeLabel: (o) =>
          ({ completed: "완료", partial: "일부 완료", blocked: "막힘" })[o],
        ratingLine: (r) => `자기 평가 집중도: ${r}/5`,
      },
      "system-reset": {
        title: "리셋 완료",
        stepsLine: (c, t) => `${t}단계 중 ${c}단계 통과`,
        adaptiveLine: "이번 흐름은 상태에 맞게 조정됐어요.",
      },
    },
    toolTitles: {
      "focus-sprint": "포커스 스프린트",
      "mind-sweep": "마인드 스윕",
      "state-scan": "상태 스캔",
      "system-reset": "시스템 리셋",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "스트레스가 높음 — 먼저 가라앉히기.",
        body: `스트레스 ${s.stress ?? "—"}/5. 짧은 리셋부터.`,
        ctaLabel: "시스템 리셋 시작",
      }),
      "energy-low-reset": (s) => ({
        headline: "에너지 부족 — 채우고 가요.",
        body: `에너지 ${s.energy ?? "—"}/5. 리셋으로 진정시키고 결정.`,
        ctaLabel: "시스템 리셋 시작",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "집중력이 좋음 — 활용하기.",
        body: `${s.taskCount ?? 0}개의 할 일. 짧은 스프린트로 하나 처리.`,
        ctaLabel: "포커스 스프린트 시작",
      }),
      "neutral-mindSweep": () => ({
        headline: "머릿속을 적어두기.",
        body: "빠르게 한 번 정리하면 다음 할 일이 떠올라요.",
        ctaLabel: "마인드 스윕 시작",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "하나 골라 움직이기.",
        body: `${s.taskCount ?? 0}개의 할 일. 짧은 스프린트로 하나 진행.`,
        ctaLabel: "포커스 스프린트 시작",
      }),
      "all-worries-reset": (s) => ({
        headline: "전부 걱정 — 먼저 가라앉히기.",
        body: `걱정 ${s.worryCount ?? 0}개. 리셋 후 다음이 보임.`,
        ctaLabel: "시스템 리셋 시작",
      }),
      "captured-stateScan": () => ({
        headline: "지금 느낌을 확인.",
        body: "정리 뒤엔 보통 몸이 달라져요. 스캔으로 확인.",
        ctaLabel: "상태 스캔 열기",
      }),
      "sprint-strong-again": () => ({
        headline: "좋은 회차 — 흐름을 살리기.",
        body: "높은 평가. 집중 있을 때 한 번 더?",
        ctaLabel: "스프린트 한 번 더",
      }),
      "sprint-weak-reset": () => ({
        headline: "이번엔 무거웠음 — 무리 말고 리셋.",
        body: "낮은 평가. 다음 스프린트보다 리셋이 도움.",
        ctaLabel: "시스템 리셋 시작",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "무엇이 변했는지 보기.",
        body: "짧은 스캔으로 현재 위치 확인.",
        ctaLabel: "상태 스캔 열기",
      }),
      "sprint-default-stateScan": () => ({
        headline: "상태를 다시 읽기.",
        body: "스캔이 계속할지 쉴지 정하는 데 도움.",
        ctaLabel: "상태 스캔 열기",
      }),
      "reset-recheck-state": () => ({
        headline: "무엇이 움직였는지 보기.",
        body: "리셋 직후는 상태를 다시 읽기에 가장 좋은 때.",
        ctaLabel: "상태 스캔 열기",
      }),
      "session-rest": () => ({
        headline: "오늘은 여기까지.",
        body: "화면에서 잠깐 떨어져요. 정말 필요할 때 다시.",
        ctaLabel: "닫기",
      }),
    },
    closingByTheme: {
      default: "작은 루프, 매일의 연습.",
      astronaut: "시스템 안정. 임무 계속.",
      academia: "관찰 한 건 기록. 노트로 복귀.",
      forest: "조용한 한 바퀴. 숲의 빈터가 기다림.",
    },
  },
  fr: {
    card: {
      eyebrow: "Session terminée",
      insightLabel: "Ce que cela révèle",
      nextStepLabel: "Un petit pas suivant",
      skipLabel: "Pas maintenant",
      closeLabel: "Fermer",
      openAnother: (t) => `Ouvrir ${t}`,
    },
    summaries: {
      "state-scan": {
        title: "Lecture du jour",
        noteFallback: "Pas de note cette fois.",
        pillLabel: (dim) =>
          ({ mood: "Humeur", energy: "Énergie", focus: "Focus", stress: "Stress" })[dim],
      },
      "mind-sweep": {
        title: "Ce qui est posé",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} ${task === 1 ? "tâche" : "tâches"}`);
          if (worry) parts.push(`${worry} ${worry === 1 ? "souci" : "soucis"}`);
          if (idea) parts.push(`${idea} ${idea === 1 ? "idée" : "idées"}`);
          if (reminder) parts.push(`${reminder} ${reminder === 1 ? "rappel" : "rappels"}`);
          return parts.join(" · ");
        },
        empty: "Rien capté ce tour-ci.",
      },
      "focus-sprint": {
        title: "Sprint enregistré",
        durationLine: (w, b) => `${w} min focus · ${b} min récup`,
        outcomeLabel: (o) =>
          ({ completed: "Terminé", partial: "Partiel", blocked: "Bloqué" })[o],
        ratingLine: (r) => `Focus auto-évalué : ${r}/5`,
      },
      "system-reset": {
        title: "Reset terminé",
        stepsLine: (c, t) => `${c} étapes sur ${t} traversées`,
        adaptiveLine: "Séquence adaptée à votre état actuel.",
      },
    },
    toolTitles: {
      "focus-sprint": "Focus Sprint",
      "mind-sweep": "Mind Sweep",
      "state-scan": "State Scan",
      "system-reset": "System Reset",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "Stress élevé — apaisez-vous d'abord.",
        body: `Stress à ${s.stress ?? "—"}/5. Un court reset avant tout.`,
        ctaLabel: "Lancer System Reset",
      }),
      "energy-low-reset": (s) => ({
        headline: "Carburant bas — refaites le plein.",
        body: `Énergie à ${s.energy ?? "—"}/5. Un reset pour s'ancrer.`,
        ctaLabel: "Lancer System Reset",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "Focus net — utilisez-le.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "tâche" : "tâches"} en attente. Un court sprint en règle une.`,
        ctaLabel: "Lancer un Focus Sprint",
      }),
      "neutral-mindSweep": () => ({
        headline: "Posez ce qui tourne en tête.",
        body: "Un balayage rapide révèle souvent la prochaine action.",
        ctaLabel: "Lancer un Mind Sweep",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "Choisissez une tâche et avancez.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "tâche" : "tâches"} captées. Un sprint focalisé en termine une.`,
        ctaLabel: "Lancer un Focus Sprint",
      }),
      "all-worries-reset": (s) => ({
        headline: "Que des soucis — ancrez-vous d'abord.",
        body: `${s.worryCount ?? 0} ${s.worryCount === 1 ? "souci" : "soucis"}. Un reset clarifiera la suite.`,
        ctaLabel: "Lancer System Reset",
      }),
      "captured-stateScan": () => ({
        headline: "Sentez où vous en êtes maintenant.",
        body: "Après un balayage, le corps bouge souvent. Un scan le dira.",
        ctaLabel: "Ouvrir State Scan",
      }),
      "sprint-strong-again": () => ({
        headline: "Beau bloc — surfez sur la vague.",
        body: "Vous avez bien noté. Un sprint de plus tant que le focus tient ?",
        ctaLabel: "Encore un sprint",
      }),
      "sprint-weak-reset": () => ({
        headline: "Bloc difficile — pas la peine de pousser.",
        body: "Note basse. Un reset est plus utile qu'un autre sprint.",
        ctaLabel: "Lancer System Reset",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "Voyez ce qui a bougé.",
        body: "Un scan court pour situer où vous êtes vraiment.",
        ctaLabel: "Ouvrir State Scan",
      }),
      "sprint-default-stateScan": () => ({
        headline: "Reprenez votre état.",
        body: "Un court scan aide à choisir : continuer ou pause.",
        ctaLabel: "Ouvrir State Scan",
      }),
      "reset-recheck-state": () => ({
        headline: "Voyez ce qui a changé.",
        body: "Juste après un reset, c'est le bon moment de relire votre état.",
        ctaLabel: "Ouvrir State Scan",
      }),
      "session-rest": () => ({
        headline: "C'est fini pour cette fois.",
        body: "Éloignez-vous de l'écran. Revenez quand ça en vaudra la peine.",
        ctaLabel: "Fermer",
      }),
    },
    closingByTheme: {
      default: "Petites boucles. Pratique quotidienne.",
      astronaut: "Systèmes stables. Mission continue.",
      academia: "Une observation consignée. Reprenez vos notes.",
      forest: "Un passage tranquille. La clairière attend.",
    },
  },
  it: {
    card: {
      eyebrow: "Sessione conclusa",
      insightLabel: "Cosa segnala",
      nextStepLabel: "Un piccolo passo successivo",
      skipLabel: "Non ora",
      closeLabel: "Chiudi",
      openAnother: (t) => `Apri ${t}`,
    },
    summaries: {
      "state-scan": {
        title: "Lettura di oggi",
        noteFallback: "Nessuna nota stavolta.",
        pillLabel: (dim) =>
          ({ mood: "Umore", energy: "Energia", focus: "Focus", stress: "Stress" })[dim],
      },
      "mind-sweep": {
        title: "Cosa è atterrato",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} ${task === 1 ? "compito" : "compiti"}`);
          if (worry) parts.push(`${worry} ${worry === 1 ? "preoccupazione" : "preoccupazioni"}`);
          if (idea) parts.push(`${idea} ${idea === 1 ? "idea" : "idee"}`);
          if (reminder) parts.push(`${reminder} ${reminder === 1 ? "promemoria" : "promemoria"}`);
          return parts.join(" · ");
        },
        empty: "Niente catturato in questo giro.",
      },
      "focus-sprint": {
        title: "Sprint registrato",
        durationLine: (w, b) => `${w} min focus · ${b} min recupero`,
        outcomeLabel: (o) =>
          ({ completed: "Completato", partial: "Parziale", blocked: "Bloccato" })[o],
        ratingLine: (r) => `Focus auto-valutato: ${r}/5`,
      },
      "system-reset": {
        title: "Reset completato",
        stepsLine: (c, t) => `${c} di ${t} passaggi attraversati`,
        adaptiveLine: "Sequenza adattata al tuo stato attuale.",
      },
    },
    toolTitles: {
      "focus-sprint": "Focus Sprint",
      "mind-sweep": "Mind Sweep",
      "state-scan": "State Scan",
      "system-reset": "System Reset",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "Stress alto — prima calmati.",
        body: `Stress a ${s.stress ?? "—"}/5. Un breve reset prima di tutto.`,
        ctaLabel: "Avvia System Reset",
      }),
      "energy-low-reset": (s) => ({
        headline: "Riserve basse — fai rifornimento.",
        body: `Energia a ${s.energy ?? "—"}/5. Un reset per radicarti.`,
        ctaLabel: "Avvia System Reset",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "Focus nitido — usalo.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "compito" : "compiti"} in attesa. Un breve sprint ne risolve uno.`,
        ctaLabel: "Avvia un Focus Sprint",
      }),
      "neutral-mindSweep": () => ({
        headline: "Scrivi ciò che gira in testa.",
        body: "Una rapida scansione spesso rivela il prossimo passo.",
        ctaLabel: "Avvia un Mind Sweep",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "Scegli un compito e parti.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "compito" : "compiti"} catturati. Uno sprint mirato ne chiude uno.`,
        ctaLabel: "Avvia un Focus Sprint",
      }),
      "all-worries-reset": (s) => ({
        headline: "Solo preoccupazioni — radicati prima.",
        body: `${s.worryCount ?? 0} ${s.worryCount === 1 ? "preoccupazione" : "preoccupazioni"}. Un reset chiarirà la mossa successiva.`,
        ctaLabel: "Avvia System Reset",
      }),
      "captured-stateScan": () => ({
        headline: "Sentì come stai ora.",
        body: "Dopo una scansione il corpo cambia. Un check te lo dirà.",
        ctaLabel: "Apri State Scan",
      }),
      "sprint-strong-again": () => ({
        headline: "Bel blocco — cavalca l'onda.",
        body: "Voto alto. Un altro sprint finché il focus tiene?",
        ctaLabel: "Un altro sprint",
      }),
      "sprint-weak-reset": () => ({
        headline: "Blocco duro — non forzare, resetta.",
        body: "Voto basso. Un reset è più utile di un altro sprint.",
        ctaLabel: "Avvia System Reset",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "Vedi cosa è cambiato.",
        body: "Un breve check per capire dove sei davvero.",
        ctaLabel: "Apri State Scan",
      }),
      "sprint-default-stateScan": () => ({
        headline: "Rileggi il tuo stato.",
        body: "Un breve check aiuta a decidere se continuare o fermarsi.",
        ctaLabel: "Apri State Scan",
      }),
      "reset-recheck-state": () => ({
        headline: "Vedi cosa si è mosso.",
        body: "Subito dopo un reset è il momento migliore per rileggerti.",
        ctaLabel: "Apri State Scan",
      }),
      "session-rest": () => ({
        headline: "Per ora basta.",
        body: "Allontanati dallo schermo. Torna quando ne vale la pena.",
        ctaLabel: "Chiudi",
      }),
    },
    closingByTheme: {
      default: "Piccoli cicli. Pratica quotidiana.",
      astronaut: "Sistemi stabili. Missione continua.",
      academia: "Un'osservazione registrata. Riprendi gli appunti.",
      forest: "Un passaggio tranquillo. La radura attende.",
    },
  },
  es: {
    card: {
      eyebrow: "Sesión completada",
      insightLabel: "Lo que esto señala",
      nextStepLabel: "Un pequeño paso siguiente",
      skipLabel: "Ahora no",
      closeLabel: "Cerrar",
      openAnother: (t) => `Abrir ${t}`,
    },
    summaries: {
      "state-scan": {
        title: "Lectura de hoy",
        noteFallback: "Sin nota esta vez.",
        pillLabel: (dim) =>
          ({ mood: "Ánimo", energy: "Energía", focus: "Foco", stress: "Estrés" })[dim],
      },
      "mind-sweep": {
        title: "Lo que aterrizó",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} ${task === 1 ? "tarea" : "tareas"}`);
          if (worry) parts.push(`${worry} ${worry === 1 ? "preocupación" : "preocupaciones"}`);
          if (idea) parts.push(`${idea} ${idea === 1 ? "idea" : "ideas"}`);
          if (reminder) parts.push(`${reminder} ${reminder === 1 ? "recordatorio" : "recordatorios"}`);
          return parts.join(" · ");
        },
        empty: "Nada capturado esta vez.",
      },
      "focus-sprint": {
        title: "Sprint registrado",
        durationLine: (w, b) => `${w} min foco · ${b} min recuperación`,
        outcomeLabel: (o) =>
          ({ completed: "Completado", partial: "Parcial", blocked: "Bloqueado" })[o],
        ratingLine: (r) => `Foco autoevaluado: ${r}/5`,
      },
      "system-reset": {
        title: "Reset completado",
        stepsLine: (c, t) => `${c} de ${t} pasos atravesados`,
        adaptiveLine: "Secuencia adaptada a tu estado actual.",
      },
    },
    toolTitles: {
      "focus-sprint": "Focus Sprint",
      "mind-sweep": "Mind Sweep",
      "state-scan": "State Scan",
      "system-reset": "System Reset",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "Estrés alto — primero asiéntate.",
        body: `Estrés en ${s.stress ?? "—"}/5. Un reset corto antes de todo.`,
        ctaLabel: "Iniciar System Reset",
      }),
      "energy-low-reset": (s) => ({
        headline: "Combustible bajo — repón antes.",
        body: `Energía ${s.energy ?? "—"}/5. Un reset para enraizar.`,
        ctaLabel: "Iniciar System Reset",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "Foco afilado — úsalo.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "tarea" : "tareas"} esperando. Un sprint corto cierra una.`,
        ctaLabel: "Iniciar un Focus Sprint",
      }),
      "neutral-mindSweep": () => ({
        headline: "Suelta lo que está dando vueltas.",
        body: "Un barrido rápido suele revelar el próximo paso.",
        ctaLabel: "Iniciar un Mind Sweep",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "Elige una tarea y arranca.",
        body: `${s.taskCount ?? 0} ${s.taskCount === 1 ? "tarea" : "tareas"} captadas. Un sprint enfocado mueve una.`,
        ctaLabel: "Iniciar un Focus Sprint",
      }),
      "all-worries-reset": (s) => ({
        headline: "Todo preocupaciones — enraíza primero.",
        body: `${s.worryCount ?? 0} ${s.worryCount === 1 ? "preocupación" : "preocupaciones"}. Un reset aclarará el siguiente paso.`,
        ctaLabel: "Iniciar System Reset",
      }),
      "captured-stateScan": () => ({
        headline: "Nota cómo se siente ahora.",
        body: "Tras un barrido el cuerpo suele cambiar. Un escaneo te lo dice.",
        ctaLabel: "Abrir State Scan",
      }),
      "sprint-strong-again": () => ({
        headline: "Buen bloque — surfea la ola.",
        body: "Calificación alta. ¿Otro sprint mientras dura el foco?",
        ctaLabel: "Otro sprint",
      }),
      "sprint-weak-reset": () => ({
        headline: "Bloque difícil — no fuerces, resetea.",
        body: "Nota baja. Un reset sirve más que otro sprint.",
        ctaLabel: "Iniciar System Reset",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "Mira qué se movió.",
        body: "Un escaneo corto para ver dónde estás de verdad.",
        ctaLabel: "Abrir State Scan",
      }),
      "sprint-default-stateScan": () => ({
        headline: "Vuelve a leer tu estado.",
        body: "Un escaneo breve ayuda a decidir: seguir o parar.",
        ctaLabel: "Abrir State Scan",
      }),
      "reset-recheck-state": () => ({
        headline: "Mira qué se movió.",
        body: "Justo tras un reset es el mejor momento para releerse.",
        ctaLabel: "Abrir State Scan",
      }),
      "session-rest": () => ({
        headline: "Por ahora, listo.",
        body: "Apártate de la pantalla. Vuelve cuando valga la pena.",
        ctaLabel: "Cerrar",
      }),
    },
    closingByTheme: {
      default: "Bucles pequeños. Práctica diaria.",
      astronaut: "Sistemas estables. Misión continúa.",
      academia: "Una observación registrada. Vuelve a las notas.",
      forest: "Un paso tranquilo. El claro espera.",
    },
  },
  vi: {
    card: {
      eyebrow: "Hoàn tất phiên",
      insightLabel: "Điều này gợi ý",
      nextStepLabel: "Một bước nhỏ tiếp theo",
      skipLabel: "Để sau",
      closeLabel: "Đóng",
      openAnother: (t) => `Mở ${t}`,
    },
    summaries: {
      "state-scan": {
        title: "Chỉ số hôm nay",
        noteFallback: "Lần này không có ghi chú.",
        pillLabel: (dim) =>
          ({ mood: "Tâm trạng", energy: "Năng lượng", focus: "Tập trung", stress: "Căng thẳng" })[dim],
      },
      "mind-sweep": {
        title: "Đã ghi lại",
        breakdown: ({ task, worry, idea, reminder }) => {
          const parts: string[] = [];
          if (task) parts.push(`${task} việc cần làm`);
          if (worry) parts.push(`${worry} lo lắng`);
          if (idea) parts.push(`${idea} ý tưởng`);
          if (reminder) parts.push(`${reminder} nhắc nhở`);
          return parts.join(" · ");
        },
        empty: "Lần này không ghi gì.",
      },
      "focus-sprint": {
        title: "Đã ghi nhận sprint",
        durationLine: (w, b) => `${w} phút tập trung · ${b} phút phục hồi`,
        outcomeLabel: (o) =>
          ({ completed: "Hoàn thành", partial: "Một phần", blocked: "Bị kẹt" })[o],
        ratingLine: (r) => `Tự đánh giá tập trung: ${r}/5`,
      },
      "system-reset": {
        title: "Đã reset xong",
        stepsLine: (c, t) => `Đã đi qua ${c} / ${t} bước`,
        adaptiveLine: "Trình tự đã điều chỉnh theo trạng thái hiện tại.",
      },
    },
    toolTitles: {
      "focus-sprint": "Focus Sprint",
      "mind-sweep": "Mind Sweep",
      "state-scan": "State Scan",
      "system-reset": "System Reset",
    },
    nextStepIntents: {
      "stress-high-reset": (s) => ({
        headline: "Căng thẳng cao — ổn định trước đã.",
        body: `Căng thẳng ${s.stress ?? "—"}/5. Một lần reset ngắn trước.`,
        ctaLabel: "Bắt đầu System Reset",
      }),
      "energy-low-reset": (s) => ({
        headline: "Năng lượng thấp — nạp lại đã.",
        body: `Năng lượng ${s.energy ?? "—"}/5. Reset để tiếp đất, rồi quyết.`,
        ctaLabel: "Bắt đầu System Reset",
      }),
      "focus-ready-sprint": (s) => ({
        headline: "Tập trung tốt — tận dụng đi.",
        body: `${s.taskCount ?? 0} việc đang chờ. Một sprint ngắn xử một việc.`,
        ctaLabel: "Bắt đầu Focus Sprint",
      }),
      "neutral-mindSweep": () => ({
        headline: "Ghi xuống thứ đang quẩn quanh.",
        body: "Quét nhanh thường lộ ra bước tiếp theo.",
        ctaLabel: "Bắt đầu Mind Sweep",
      }),
      "tasks-ready-sprint": (s) => ({
        headline: "Chọn một việc và bắt tay.",
        body: `${s.taskCount ?? 0} việc đã ghi. Một sprint tập trung kết một.`,
        ctaLabel: "Bắt đầu Focus Sprint",
      }),
      "all-worries-reset": (s) => ({
        headline: "Toàn lo lắng — tiếp đất trước đã.",
        body: `${s.worryCount ?? 0} lo lắng. Reset xong, bước kế rõ hơn.`,
        ctaLabel: "Bắt đầu System Reset",
      }),
      "captured-stateScan": () => ({
        headline: "Cảm nhận hiện tại thế nào.",
        body: "Sau khi quét, cơ thể thường khác. Quét trạng thái sẽ rõ.",
        ctaLabel: "Mở State Scan",
      }),
      "sprint-strong-again": () => ({
        headline: "Đoạn này tốt — bắt nhịp tiếp.",
        body: "Đánh giá cao. Một sprint nữa khi còn tập trung?",
        ctaLabel: "Một sprint nữa",
      }),
      "sprint-weak-reset": () => ({
        headline: "Đoạn này nặng — đừng cố, reset đi.",
        body: "Điểm thấp. Reset có ích hơn là tiếp tục sprint.",
        ctaLabel: "Bắt đầu System Reset",
      }),
      "sprint-weak-stateScan": () => ({
        headline: "Xem cái gì đã chuyển.",
        body: "Quét ngắn để thấy mình đang thật sự ở đâu.",
        ctaLabel: "Mở State Scan",
      }),
      "sprint-default-stateScan": () => ({
        headline: "Đọc lại trạng thái.",
        body: "Quét nhanh giúp quyết định tiếp tục hay nghỉ.",
        ctaLabel: "Mở State Scan",
      }),
      "reset-recheck-state": () => ({
        headline: "Xem cái gì đã dịch chuyển.",
        body: "Sau reset là lúc tốt nhất để đọc lại trạng thái.",
        ctaLabel: "Mở State Scan",
      }),
      "session-rest": () => ({
        headline: "Tới đây thôi.",
        body: "Rời màn hình một chút. Khi nào thật sự cần hãy quay lại.",
        ctaLabel: "Đóng",
      }),
    },
    closingByTheme: {
      default: "Vòng lặp nhỏ. Tập luyện hàng ngày.",
      astronaut: "Hệ thống ổn định. Nhiệm vụ tiếp tục.",
      academia: "Đã ghi một quan sát. Trở lại ghi chú.",
      forest: "Một vòng lặng. Khoảng trống chờ bạn.",
    },
  },
});

export function getBioLabCompletionCopy(locale: AppLocale): BioLabCompletionCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
