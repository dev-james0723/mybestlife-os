import type { GreetingTone } from "@/types/database";
import type { AppLocale } from "./i18n/app-locale";
import { createLocaleCopyMap } from "./i18n/copy-helpers";

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

type TimeOfDay = ReturnType<typeof getTimeOfDay>;

type GreetingPattern = {
  withoutName: string;
  withName: string;
};

type GreetingLocaleCopy = Record<GreetingTone, Record<TimeOfDay, GreetingPattern>>;

const en: GreetingLocaleCopy = {
  friendly: {
    morning: {
      withoutName: "Good morning! Ready to make today count?",
      withName: "Good morning, {name}! Ready to make today count?",
    },
    afternoon: {
      withoutName: "Good afternoon! How's the day going?",
      withName: "Good afternoon, {name}! How's the day going?",
    },
    evening: {
      withoutName: "Good evening! Wrapping up?",
      withName: "Good evening, {name}! Wrapping up?",
    },
    night: {
      withoutName: "Burning the midnight oil?",
      withName: "Burning the midnight oil, {name}?",
    },
  },
  motivational: {
    morning: {
      withoutName: "Rise and conquer. Today is yours.",
      withName: "Rise and conquer, {name}. Today is yours.",
    },
    afternoon: {
      withoutName: "Keep pushing. Great things take time.",
      withName: "Keep pushing, {name}. Great things take time.",
    },
    evening: {
      withoutName: "Reflect on your wins today.",
      withName: "Reflect on your wins today, {name}.",
    },
    night: {
      withoutName: "Rest well. Tomorrow awaits.",
      withName: "Rest well, {name}. Tomorrow awaits.",
    },
  },
  minimal: {
    morning: {
      withoutName: "Morning.",
      withName: "Morning, {name}.",
    },
    afternoon: {
      withoutName: "Afternoon.",
      withName: "Afternoon, {name}.",
    },
    evening: {
      withoutName: "Evening.",
      withName: "Evening, {name}.",
    },
    night: {
      withoutName: "Night.",
      withName: "Night, {name}.",
    },
  },
  poetic: {
    morning: {
      withoutName: "The dawn unfurls its golden thread...",
      withName: "{name}, the dawn unfurls its golden thread...",
    },
    afternoon: {
      withoutName: "Sunlight pools in quiet rooms...",
      withName: "{name}, sunlight pools in quiet rooms...",
    },
    evening: {
      withoutName: "The day exhales, softly...",
      withName: "{name}, the day exhales, softly...",
    },
    night: {
      withoutName: "Stars whisper their ancient stories...",
      withName: "{name}, stars whisper their ancient stories...",
    },
  },
};

const zhTW: GreetingLocaleCopy = {
  friendly: {
    morning: {
      withoutName: "早安！準備好讓今天過得充實了嗎？",
      withName: "{name}，早安！準備好讓今天過得充實了嗎？",
    },
    afternoon: {
      withoutName: "午安！今天過得如何？",
      withName: "{name}，午安！今天過得如何？",
    },
    evening: {
      withoutName: "晚上好！準備收尾了嗎？",
      withName: "{name}，晚上好！準備收尾了嗎？",
    },
    night: {
      withoutName: "夜深了，還在努力嗎？",
      withName: "{name}，夜深了，還在努力嗎？",
    },
  },
  motivational: {
    morning: {
      withoutName: "起身出發，今天屬於你。",
      withName: "{name}，起身出發，今天屬於你。",
    },
    afternoon: {
      withoutName: "繼續前進，偉大的事需要時間。",
      withName: "{name}，繼續前進，偉大的事需要時間。",
    },
    evening: {
      withoutName: "回顧今天的收穫。",
      withName: "{name}，回顧今天的收穫。",
    },
    night: {
      withoutName: "好好休息，明天還在等你。",
      withName: "{name}，好好休息，明天還在等你。",
    },
  },
  minimal: {
    morning: {
      withoutName: "早安。",
      withName: "{name}，早安。",
    },
    afternoon: {
      withoutName: "午安。",
      withName: "{name}，午安。",
    },
    evening: {
      withoutName: "晚上好。",
      withName: "{name}，晚上好。",
    },
    night: {
      withoutName: "晚安。",
      withName: "{name}，晚安。",
    },
  },
  poetic: {
    morning: {
      withoutName: "晨光正慢慢展開金色的線。",
      withName: "{name}，晨光正慢慢展開金色的線。",
    },
    afternoon: {
      withoutName: "陽光靜靜灑滿安靜的房間。",
      withName: "{name}，陽光靜靜灑滿安靜的房間。",
    },
    evening: {
      withoutName: "白日輕輕吐出一口氣。",
      withName: "{name}，白日輕輕吐出一口氣。",
    },
    night: {
      withoutName: "星星低聲訴說古老的故事。",
      withName: "{name}，星星低聲訴說古老的故事。",
    },
  },
};

const zhCN: GreetingLocaleCopy = {
  friendly: {
    morning: {
      withoutName: "早安！准备好让今天过得充实了吗？",
      withName: "{name}，早安！准备好让今天过得充实了吗？",
    },
    afternoon: {
      withoutName: "午安！今天过得怎么样？",
      withName: "{name}，午安！今天过得怎么样？",
    },
    evening: {
      withoutName: "晚上好！准备收尾了吗？",
      withName: "{name}，晚上好！准备收尾了吗？",
    },
    night: {
      withoutName: "夜深了，还在努力吗？",
      withName: "{name}，夜深了，还在努力吗？",
    },
  },
  motivational: {
    morning: {
      withoutName: "起身出发，今天属于你。",
      withName: "{name}，起身出发，今天属于你。",
    },
    afternoon: {
      withoutName: "继续前进，伟大的事需要时间。",
      withName: "{name}，继续前进，伟大的事需要时间。",
    },
    evening: {
      withoutName: "回顾今天的收获。",
      withName: "{name}，回顾今天的收获。",
    },
    night: {
      withoutName: "好好休息，明天还在等你。",
      withName: "{name}，好好休息，明天还在等你。",
    },
  },
  minimal: {
    morning: {
      withoutName: "早安。",
      withName: "{name}，早安。",
    },
    afternoon: {
      withoutName: "午安。",
      withName: "{name}，午安。",
    },
    evening: {
      withoutName: "晚上好。",
      withName: "{name}，晚上好。",
    },
    night: {
      withoutName: "晚安。",
      withName: "{name}，晚安。",
    },
  },
  poetic: {
    morning: {
      withoutName: "晨光正慢慢展开金色的线。",
      withName: "{name}，晨光正慢慢展开金色的线。",
    },
    afternoon: {
      withoutName: "阳光静静洒满安静的房间。",
      withName: "{name}，阳光静静洒满安静的房间。",
    },
    evening: {
      withoutName: "白日轻轻吐出一口气。",
      withName: "{name}，白日轻轻吐出一口气。",
    },
    night: {
      withoutName: "星星低声诉说古老的故事。",
      withName: "{name}，星星低声诉说古老的故事。",
    },
  },
};

const ja: GreetingLocaleCopy = {
  friendly: {
    morning: {
      withoutName: "おはようございます。今日をいい日にしていきましょう。",
      withName: "{name}さん、おはようございます。今日をいい日にしていきましょう。",
    },
    afternoon: {
      withoutName: "こんにちは。今日はどんな調子ですか？",
      withName: "{name}さん、こんにちは。今日はどんな調子ですか？",
    },
    evening: {
      withoutName: "こんばんは。そろそろ一日の締めくくりですか？",
      withName: "{name}さん、こんばんは。そろそろ一日の締めくくりですか？",
    },
    night: {
      withoutName: "夜更かし中ですか？",
      withName: "{name}さん、夜更かし中ですか？",
    },
  },
  motivational: {
    morning: {
      withoutName: "立ち上がって進みましょう。今日はあなたの日です。",
      withName: "{name}さん、立ち上がって進みましょう。今日はあなたの日です。",
    },
    afternoon: {
      withoutName: "そのまま前へ。大きな成果には時間がかかります。",
      withName: "{name}さん、そのまま前へ。大きな成果には時間がかかります。",
    },
    evening: {
      withoutName: "今日の前進を振り返ってみましょう。",
      withName: "{name}さん、今日の前進を振り返ってみましょう。",
    },
    night: {
      withoutName: "よく休んでください。明日が待っています。",
      withName: "{name}さん、よく休んでください。明日が待っています。",
    },
  },
  minimal: {
    morning: {
      withoutName: "朝です。",
      withName: "{name}さん、おはようございます。",
    },
    afternoon: {
      withoutName: "午後です。",
      withName: "{name}さん、こんにちは。",
    },
    evening: {
      withoutName: "夕方です。",
      withName: "{name}さん、こんばんは。",
    },
    night: {
      withoutName: "夜です。",
      withName: "{name}さん、こんばんは。",
    },
  },
  poetic: {
    morning: {
      withoutName: "夜明けが金の糸をほどいていきます。",
      withName: "{name}さん、夜明けが金の糸をほどいていきます。",
    },
    afternoon: {
      withoutName: "静かな部屋に陽だまりが広がっています。",
      withName: "{name}さん、静かな部屋に陽だまりが広がっています。",
    },
    evening: {
      withoutName: "一日がそっと息をついています。",
      withName: "{name}さん、一日がそっと息をついています。",
    },
    night: {
      withoutName: "星たちが古い物語をささやいています。",
      withName: "{name}さん、星たちが古い物語をささやいています。",
    },
  },
};

const greetings = createLocaleCopyMap<GreetingLocaleCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
});

function applyName(pattern: GreetingPattern, name?: string | null): string {
  if (!name) return pattern.withoutName;
  return pattern.withName.replace("{name}", name);
}

export function getGreeting(locale: AppLocale, tone: GreetingTone, name?: string | null): string {
  const timeOfDay = getTimeOfDay();
  const pattern = greetings[locale]?.[tone]?.[timeOfDay] ?? greetings.en[tone][timeOfDay];
  return applyName(pattern, name);
}
