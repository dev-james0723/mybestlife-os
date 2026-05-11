import type { AppLocale } from "@/lib/i18n/app-locale";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";
import type { MindSweepKind } from "@/lib/bio-lab/flow-types";

export type BioLabFlowsCopy = {
  sheetClose: string;
  focus: {
    title: string;
    pickLead: string;
    presetLabel: (work: number, br: number) => string;
    customWork: string;
    customBreak: string;
    customInvalid: string;
    continue: string;
    templatesTitle: string;
    templatesLead: string;
    templatePurposeLabel: string;
    saveTemplate: string;
    removeTemplate: string;
    templateSaved: string;
    templateMissingLabel: string;
    templateLimit: (max: number) => string;
    intentionTitle: string;
    intentionPlaceholder: string;
    intentionSkip: string;
    intentionContinue: string;
    phaseWork: string;
    phaseBreak: string;
    timeRemaining: string;
    pause: string;
    resume: string;
    endSession: string;
    endConfirmTitle: string;
    endConfirmBody: string;
    confirmEnd: string;
    cancel: string;
    reflectTitle: string;
    reflectLead: string;
    outcomeCompleted: string;
    outcomePartial: string;
    outcomeBlocked: string;
    reflectNotePlaceholder: string;
    saveReflection: string;
    newSprint: string;
  };
  mind: {
    title: string;
    lead: string;
    placeholder: string;
    add: string;
    kindLabel: string;
    kinds: Record<MindSweepKind, string>;
    empty: string;
    remove: string;
    changeKind: string;
    /** Shown under the draft field (keyboard shortcut). */
    draftKeyboardHint: string;
  };
  state: {
    title: string;
    lead: string;
    mood: string;
    energy: string;
    focus: string;
    stress: string;
    note: string;
    notePlaceholder: string;
    save: string;
    saved: string;
    lastTitle: string;
    scaleHint: string;
    scaleLow: string;
    scaleHigh: string;
  };
  reset: {
    title: string;
    lead: string;
    progress: (current: number, total: number) => string;
    next: string;
    back: string;
    done: string;
    steps: Record<
      "breathe" | "hydrate" | "clear-space" | "next-step" | "restart",
      { title: string; body: string }
    >;
  };
};

const en: BioLabFlowsCopy = {
  sheetClose: "Close",
  focus: {
    title: "Focus Sprint",
    pickLead: "Pick a rhythm, set an intention, then run one focused block and a recovery window.",
    presetLabel: (work, br) => `${work} min focus · ${br} min recovery`,
    customWork: "Focus minutes",
    customBreak: "Recovery minutes",
    customInvalid: "Use 1–180 min focus and 0–60 min recovery.",
    continue: "Use this preset",
    templatesTitle: "Sprint templates",
    templatesLead: "Save your own combos with a label — tap to run with that intention prefilled.",
    templatePurposeLabel: "What this sprint is for",
    saveTemplate: "Save as template",
    removeTemplate: "Remove template",
    templateSaved: "Template saved",
    templateMissingLabel: "Add a short label before saving.",
    templateLimit: (max) =>
      `You can save up to ${max} templates. Remove one to add another.`,
    intentionTitle: "What are you focusing on?",
    intentionPlaceholder: "Deep study for Japanese,",
    intentionSkip: "Skip",
    intentionContinue: "Start sprint",
    phaseWork: "Focus",
    phaseBreak: "Recovery",
    timeRemaining: "Remaining",
    pause: "Pause",
    resume: "Resume",
    endSession: "End",
    endConfirmTitle: "End this sprint?",
    endConfirmBody: "You can start another anytime.",
    confirmEnd: "End sprint",
    cancel: "Keep going",
    reflectTitle: "How did the block go?",
    reflectLead: "Honest labels help you tune the next sprint.",
    outcomeCompleted: "Completed",
    outcomePartial: "Partially completed",
    outcomeBlocked: "Blocked",
    reflectNotePlaceholder: "Optional note",
    saveReflection: "Save & close",
    newSprint: "Another sprint",
  },
  mind: {
    title: "Mind Sweep",
    lead: "Drop thoughts in fast. Sort them lightly — you can change labels anytime.",
    placeholder: "Type a thought, task, worry, or idea…",
    add: "Add to sweep",
    kindLabel: "Label",
    kinds: {
      task: "Task",
      worry: "Worry",
      idea: "Idea",
      reminder: "Reminder",
    },
    empty: "Nothing captured yet. The first line clears the most pressure.",
    remove: "Remove",
    changeKind: "Change label",
    draftKeyboardHint:
      "Tip: ⌘ Enter (Mac) or Ctrl+Enter (Windows/Linux) adds the line without reaching for the button.",
  },
  state: {
    title: "State Scan",
    lead: "Quick signals — about twenty seconds. There is no wrong answer.",
    mood: "Mood",
    energy: "Energy",
    focus: "Focus",
    stress: "Stress",
    note: "Note",
    notePlaceholder: "Optional — a sentence is plenty.",
    save: "Save check-in",
    saved: "Saved.",
    lastTitle: "Last check-in",
    scaleHint: "1 = low · 5 = high",
    scaleLow: "Low",
    scaleHigh: "High",
  },
  reset: {
    title: "System Reset",
    lead: "A short sequence to steady your body and choose one next move.",
    progress: (c, t) => `Step ${c} of ${t}`,
    next: "Next",
    back: "Back",
    done: "Finish",
    steps: {
      breathe: {
        title: "Breathe",
        body: "Four slow breaths — in through the nose, longer exhale. Let your shoulders drop.",
      },
      hydrate: {
        title: "Hydrate",
        body: "A glass of water now. Small physical care signals safety to your brain.",
      },
      "clear-space": {
        title: "Clear a little space",
        body: "Stack one pile, close five tabs, or wipe your desk. Reduce visual noise.",
      },
      "next-step": {
        title: "Name the next step",
        body: "Write the smallest obvious action — something you could start in two minutes.",
      },
      restart: {
        title: "Re-enter gently",
        body: "When you are ready, open what matters and take that first small action.",
      },
    },
  },
};

const copyByLocale = createLocaleCopyMap(en, {
  "zh-TW": {
    sheetClose: "關閉",
    focus: {
      title: "專注衝刺",
      pickLead: "選節奏、寫意圖，然後跑一段專注與一段恢復。",
      presetLabel: (work, br) => `${work} 分鐘專注 · ${br} 分鐘恢復`,
      customWork: "專注分鐘",
      customBreak: "恢復分鐘",
      customInvalid: "專注請用 1–180 分鐘，恢復請用 0–60 分鐘。",
      continue: "用這個節奏",
      templatesTitle: "衝刺模板",
      templatesLead: "自訂標籤同節奏並儲存——一撳就用，意圖會預先填好。",
      templatePurposeLabel: "呢輪做乜",
      saveTemplate: "儲存為模板",
      removeTemplate: "移除模板",
      templateSaved: "已儲存模板",
      templateMissingLabel: "儲存前先寫一短句描述呢輪衝刺。",
      templateLimit: (max) => `最多 ${max} 個模板，請先移除一個再加。`,
      intentionTitle: "這一輪要專注在什麼？",
      intentionPlaceholder: "深度學習日語，",
      intentionSkip: "略過",
      intentionContinue: "開始衝刺",
      phaseWork: "專注",
      phaseBreak: "恢復",
      timeRemaining: "剩餘",
      pause: "暫停",
      resume: "繼續",
      endSession: "結束",
      endConfirmTitle: "要結束這次衝刺嗎？",
      endConfirmBody: "隨時可以再開新一輪。",
      confirmEnd: "結束衝刺",
      cancel: "再一下",
      reflectTitle: "這一段怎麼樣？",
      reflectLead: "誠實標記有助你調整下一輪。",
      outcomeCompleted: "完成",
      outcomePartial: "部分完成",
      outcomeBlocked: "卡住",
      reflectNotePlaceholder: "可選備註",
      saveReflection: "儲存並關閉",
      newSprint: "再來一輪",
    },
    mind: {
      title: "思緒清掃",
      lead: "先快速丟出念頭，分類輕鬆——標籤之後隨時可改。",
      placeholder: "輸入念頭、任務、擔心或靈感…",
      add: "加入清單",
      kindLabel: "標籤",
      kinds: {
        task: "任務",
        worry: "擔心",
        idea: "靈感",
        reminder: "提醒",
      },
      empty: "還沒有內容。第一筆通常最解壓。",
      remove: "移除",
      changeKind: "改標籤",
      draftKeyboardHint:
        "提示：⌘ + Enter（Mac）或 Ctrl + Enter（Windows）可快速加入，唔使專登撳掣。",
    },
    state: {
      title: "狀態掃描",
      lead: "快速訊號——大概二十秒。沒有標準答案。",
      mood: "心情",
      energy: "能量",
      focus: "專注",
      stress: "壓力",
      note: "備註",
      notePlaceholder: "可選——一句就夠。",
      save: "儲存紀錄",
      saved: "已儲存。",
      lastTitle: "上一次紀錄",
      scaleHint: "1 = 低 · 5 = 高",
      scaleLow: "低",
      scaleHigh: "高",
    },
    reset: {
      title: "系統重置",
      lead: "短流程：讓身體穩下來，再選一個下一步。",
      progress: (c, t) => `第 ${c} 步，共 ${t} 步`,
      next: "下一步",
      back: "上一步",
      done: "完成",
      steps: {
        breathe: {
          title: "呼吸",
          body: "慢慢四口气——鼻吸、稍長的呼。讓肩膀鬆一點。",
        },
        hydrate: {
          title: "補水",
          body: "先喝一口水。小小的身體照顧，會讓大腦覺得安全一點。",
        },
        "clear-space": {
          title: "清一點空間",
          body: "疊好一小疊、關五個分頁，或擦一下桌面。減少視覺雜訊。",
        },
        "next-step": {
          title: "寫下下一步",
          body: "寫最小、最明顯的動作——兩分鐘內能開始的那種。",
        },
        restart: {
          title: "溫和回到行動",
          body: "準備好時，打開真正重要的事，先做那個小动作。",
        },
      },
    },
  },
  "zh-CN": {
    sheetClose: "关闭",
    focus: {
      title: "专注冲刺",
      pickLead: "选节奏、写意图，然后跑一段专注和一段恢复。",
      presetLabel: (work, br) => `${work} 分钟专注 · ${br} 分钟恢复`,
      customWork: "专注分钟",
      customBreak: "恢复分钟",
      customInvalid: "专注请用 1–180 分钟，恢复请用 0–60 分钟。",
      continue: "用这个节奏",
      templatesTitle: "冲刺模板",
      templatesLead: "自定义标签和节奏并保存——点一下就用，意图会预先填好。",
      templatePurposeLabel: "这轮做什么",
      saveTemplate: "保存为模板",
      removeTemplate: "移除模板",
      templateSaved: "已保存模板",
      templateMissingLabel: "保存前先写一句这轮冲刺要做什么。",
      templateLimit: (max) => `最多 ${max} 个模板，请先移除一个再添加。`,
      intentionTitle: "这一轮要专注在什么？",
      intentionPlaceholder: "深度学习日语，",
      intentionSkip: "略过",
      intentionContinue: "开始冲刺",
      phaseWork: "专注",
      phaseBreak: "恢复",
      timeRemaining: "剩余",
      pause: "暂停",
      resume: "继续",
      endSession: "结束",
      endConfirmTitle: "要结束这次冲刺吗？",
      endConfirmBody: "随时可以再开新一轮。",
      confirmEnd: "结束冲刺",
      cancel: "再继续",
      reflectTitle: "这一段怎么样？",
      reflectLead: "诚实标记有助你调整下一轮。",
      outcomeCompleted: "完成",
      outcomePartial: "部分完成",
      outcomeBlocked: "卡住",
      reflectNotePlaceholder: "可选备注",
      saveReflection: "保存并关闭",
      newSprint: "再来一轮",
    },
    mind: {
      title: "思绪清扫",
      lead: "先快速丢出念头，分类轻松——标签之后随时可改。",
      placeholder: "输入念头、任务、担心或灵感…",
      add: "加入清单",
      kindLabel: "标签",
      kinds: {
        task: "任务",
        worry: "担心",
        idea: "灵感",
        reminder: "提醒",
      },
      empty: "还没有内容。第一笔通常最解压。",
      remove: "移除",
      changeKind: "改标签",
      draftKeyboardHint: "提示：⌘ + Enter（Mac）或 Ctrl + Enter（Windows）可快速添加，无需专门点按钮。",
    },
    state: {
      title: "状态扫描",
      lead: "快速信号——大概二十秒。没有标准答案。",
      mood: "心情",
      energy: "能量",
      focus: "专注",
      stress: "压力",
      note: "备注",
      notePlaceholder: "可选——一句就够。",
      save: "保存记录",
      saved: "已保存。",
      lastTitle: "上一次记录",
      scaleHint: "1 = 低 · 5 = 高",
      scaleLow: "低",
      scaleHigh: "高",
    },
    reset: {
      title: "系统重置",
      lead: "短流程：让身体稳下来，再选一个下一步。",
      progress: (c, t) => `第 ${c} 步，共 ${t} 步`,
      next: "下一步",
      back: "上一步",
      done: "完成",
      steps: {
        breathe: {
          title: "呼吸",
          body: "慢慢四口氣——鼻吸、稍长的呼。让肩膀松一点。",
        },
        hydrate: {
          title: "补水",
          body: "先喝一口水。小小的身体照顾，会让大脑觉得安全一点。",
        },
        "clear-space": {
          title: "清一点空间",
          body: "叠好一小叠、关五个标签页，或擦一下桌面。减少视觉噪声。",
        },
        "next-step": {
          title: "写下下一步",
          body: "写最小、最明显的动作——两分钟内能开始的那种。",
        },
        restart: {
          title: "温和回到行动",
          body: "准备好时，打开真正重要的事，先做那个小动作。",
        },
      },
    },
  },
});

export function getBioLabFlowsCopy(locale: AppLocale): BioLabFlowsCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
