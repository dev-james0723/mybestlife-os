"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FirstStepCard } from "@/components/onboarding/first-step-card";
import { readQuestionnaire } from "@/lib/about-me-questionnaire";
import { Textarea } from "@/components/ui/textarea";
import { useAboutMeDraft } from "@/hooks/use-about-me-draft";
import { aboutMeRepository } from "@/lib/repositories/about-me";
import type { AboutMe } from "@/types/database";
import { Input } from "@/components/ui/input";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Briefcase,
  Camera,
  Heart,
  ImageIcon,
  Sparkles,
  Upload,
  UserRound,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { useAboutMe, useUploadAboutMeProfileImage } from "@/hooks/use-about-me";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { cn } from "@/lib/utils";

type SectionKey =
  | "instruction_manual"
  | "core_values"
  | "mission"
  | "personality_insights";


type SoulDomain =
  | "purpose"
  | "money"
  | "career"
  | "relationships"
  | "balance"
  | "emotion"
  | "health"
  | "future";

type SoulOption = {
  id: string;
  label: string;
  tags: string[];
};

type SoulQuestion = {
  id: string;
  title: string;
  domain: SoulDomain;
  options: SoulOption[];
};

const TAG_LABELS: Record<string, string> = {
  achievement: "achievement",
  adventure: "adventure",
  artistry: "artistry",
  body: "body awareness",
  boundaries: "boundaries",
  caregiving: "caregiving",
  clarity: "clarity",
  connection: "connection",
  courage: "courage",
  creativity: "creativity",
  depth: "depth",
  emotional_awareness: "emotional awareness",
  family: "family",
  freedom: "freedom",
  influence: "influence",
  learning: "learning",
  mastery: "mastery",
  meaning: "meaning",
  recognition: "recognition",
  repair: "repair",
  rest: "rest",
  security: "security",
  service: "service",
  simplicity: "simplicity",
  status: "status",
};

const TAG_LABELS_ZH: Record<string, string> = {
  achievement: "成就感",
  adventure: "探索感",
  artistry: "審美與創作",
  body: "身體覺察",
  boundaries: "界線",
  caregiving: "照顧者能量",
  clarity: "清晰度",
  connection: "連結",
  courage: "勇氣",
  creativity: "創造力",
  depth: "深度",
  emotional_awareness: "情緒覺察",
  family: "家庭",
  freedom: "自由",
  influence: "影響力",
  learning: "學習",
  mastery: "精進",
  meaning: "意義感",
  recognition: "被看見",
  repair: "修復",
  rest: "休息",
  security: "安全感",
  service: "服務",
  simplicity: "簡單生活",
  status: "身份與地位",
};

const QUESTION_TITLES_ZH: Record<string, string> = {
  "life-without-money-pressure": "如果錢唔係問題，你仍然想用生命做咩？",
  "remembered-for": "你最希望別人記得你係一個點樣嘅人？",
  "money-story": "講到錢，你最強烈嘅感覺通常係咩？",
  "career-exchange": "而家呢個階段，你最想事業帶俾你啲咩？",
  "relationship-needs": "喺感情同日常生活入面，你最需要啲咩？",
  "life-non-negotiables": "你理想生活入面，邊啲嘢係不可妥協？",
  "work-life-friction": "工作最容易喺邊度扭曲你嘅生活？",
  "emotional-response": "情緒升起嗰陣，你通常會點反應？",
  "body-signals": "最近有冇身體感受想記低？（選填）",
  "five-year-self": "五年後嘅你，會叫而家嘅你做啲咩？",
};

const OPTION_LABELS_ZH: Record<string, string> = {
  "Create work that feels alive": "做出令自己有生命力嘅作品",
  "Build a loving family": "建立一個有愛嘅家庭",
  "Explore the world": "探索世界",
  "Study or research deeply": "深入學習或研究",
  "Help people directly": "直接幫到人",
  "Build a company or product": "建立公司或產品",
  "Train body, mind, and spirit": "訓練身心靈",
  "Teach or influence publicly": "公開教學或影響他人",
  "Protect a community or cause": "守護一個群體或信念",
  "Live a quiet, simple life": "過安靜簡單嘅生活",
  "Being reliable": "成為可靠嘅人",
  "Being original": "成為有原創性嘅人",
  "Love and presence": "愛同陪伴",
  "Real achievement": "真正嘅成就",
  Wisdom: "智慧",
  Courage: "勇氣",
  "Taste and beauty": "品味同美感",
  Fairness: "公平",
  "Leading people well": "帶領人走得更好",
  "A free spirit": "自由嘅靈魂",
  "It never feels safe enough": "總係覺得未夠安全",
  "Money means freedom": "錢代表自由",
  "Money means status": "錢代表身份地位",
  "Earning creates pressure": "賺錢帶嚟壓力",
  "Spending creates guilt": "花錢會有罪疚感",
  "I want to take care of family": "我想照顧屋企人",
  "I fear being controlled by money": "我怕被錢控制",
  "Money creates opportunities": "錢代表更多機會",
  "I want to prove myself": "我想證明自己",
  "I have not clarified this yet": "我仲未諗清楚",
  "Stable income": "穩定收入",
  "Professional growth": "專業成長",
  "More control over time": "更多時間自主",
  "More impact": "更大影響力",
  "A founder path": "創業者路線",
  "Being seen": "被看見",
  "Deep research or craft": "深度研究或打磨手藝",
  "Leading a team": "帶領團隊",
  "Serving people better": "更好咁服務人",
  "A clearer direction": "更清晰方向",
  "Emotional safety": "情緒安全感",
  "Personal space": "個人空間",
  "Honest communication": "真誠溝通",
  "Romance and spark": "浪漫同火花",
  "A family plan": "家庭計劃",
  "Growing together": "一齊成長",
  "Feeling understood": "被理解",
  "A calm life rhythm": "平靜生活節奏",
  "Shared adventure": "一齊冒險",
  "Respect for boundaries": "尊重界線",
  "Enough sleep": "足夠睡眠",
  "Regular movement": "規律運動",
  "Deep work blocks": "深度工作時段",
  "Real friendships": "真實友誼",
  "Time alone": "獨處時間",
  "Travel or movement": "旅行或流動感",
  "Family time": "家庭時間",
  "Financial runway": "財務安全墊",
  "Creative time": "創作時間",
  "Continuous learning": "持續學習",
  "I carry too much responsibility": "我承擔太多責任",
  "I please people too easily": "我太容易討好別人",
  "Perfectionism slows me down": "完美主義令我慢落嚟",
  "I get distracted": "我容易分心",
  "My boundaries are weak": "我嘅界線唔夠穩",
  "I chase too many possibilities": "我追逐太多可能性",
  "I avoid conflict": "我會逃避衝突",
  "I over-optimize everything": "我會過度優化所有嘢",
  "I do not know how to rest": "我唔太識休息",
  "Direction is unclear": "方向唔夠清晰",
  "Stress makes me control things": "壓力令我想控制所有嘢",
  "Sadness makes me withdraw": "難過令我退縮",
  "I suppress anger": "我會壓住憤怒",
  "Anxiety makes me do more": "焦慮令我做更多",
  "Shame makes me disappear": "羞恥感令我想消失",
  "Loneliness makes me seek stimulus": "孤獨令我追求刺激",
  "Boredom makes me switch direction": "無聊令我轉方向",
  "Criticism makes me defensive": "被批評令我防衛",
  "Disappointment makes me cold": "失望令我變冷淡",
  "I do not notice emotions early": "我唔太早察覺情緒",
  Fatigue: "疲勞",
  "Sleep disruption": "睡眠被打亂",
  "Appetite or digestion": "胃口或消化",
  "Head, neck, or shoulders": "頭、頸或肩膊",
  "Breath or heart pressure": "呼吸或心口壓力",
  "Too much sitting": "坐得太多",
  "Lower fitness": "體能下降",
  "Emotional eating": "情緒性進食",
  "Lower intimacy or life force": "親密感或生命力下降",
  "I have not been listening": "我一直冇好好聽身體講嘢",
  "Stop pleasing everyone": "停止討好所有人",
  "Start focusing": "開始專注",
  "Protect health": "保護健康",
  "Repair an important relationship": "修復一段重要關係",
  "Build real work or assets": "建立真正作品或資產",
  "Learn to ask for help": "學識求助",
  "Lower the noise": "降低噪音",
  "Be braver": "勇敢啲",
  "Accept ordinary days": "接受平凡日子",
  "Open a new life chapter": "打開人生新章節",
};

const SOUL_QUESTIONS: SoulQuestion[] = [
  {
    id: "life-without-money-pressure",
    title: "If money was not the issue, what would you still spend your life on?",
    domain: "purpose",
    options: [
      { id: "make-work", label: "Create work that feels alive", tags: ["creativity", "artistry"] },
      { id: "build-family", label: "Build a loving family", tags: ["family", "connection"] },
      { id: "explore-world", label: "Explore the world", tags: ["adventure", "freedom"] },
      { id: "study-deeply", label: "Study or research deeply", tags: ["learning", "depth"] },
      { id: "help-people", label: "Help people directly", tags: ["service", "caregiving"] },
      { id: "build-product", label: "Build a company or product", tags: ["achievement", "influence"] },
      { id: "inner-practice", label: "Train body, mind, and spirit", tags: ["body", "meaning"] },
      { id: "teach-publicly", label: "Teach or influence publicly", tags: ["influence", "recognition"] },
      { id: "protect-community", label: "Protect a community or cause", tags: ["service", "courage"] },
      { id: "simple-life", label: "Live a quiet, simple life", tags: ["simplicity", "rest"] },
    ],
  },
  {
    id: "remembered-for",
    title: "What do you most want people to remember you for?",
    domain: "purpose",
    options: [
      { id: "reliable", label: "Being reliable", tags: ["security", "caregiving"] },
      { id: "original", label: "Being original", tags: ["creativity", "courage"] },
      { id: "loving", label: "Love and presence", tags: ["connection", "family"] },
      { id: "accomplished", label: "Real achievement", tags: ["achievement", "mastery"] },
      { id: "wise", label: "Wisdom", tags: ["depth", "meaning"] },
      { id: "brave", label: "Courage", tags: ["courage", "freedom"] },
      { id: "taste", label: "Taste and beauty", tags: ["artistry", "creativity"] },
      { id: "fair", label: "Fairness", tags: ["service", "courage"] },
      { id: "leader", label: "Leading people well", tags: ["influence", "caregiving"] },
      { id: "free", label: "A free spirit", tags: ["freedom", "adventure"] },
    ],
  },
  {
    id: "money-story",
    title: "What feeling comes up most strongly around money?",
    domain: "money",
    options: [
      { id: "never-enough", label: "It never feels safe enough", tags: ["security", "body"] },
      { id: "freedom", label: "Money means freedom", tags: ["freedom", "security"] },
      { id: "status", label: "Money means status", tags: ["status", "recognition"] },
      { id: "pressure", label: "Earning creates pressure", tags: ["body", "achievement"] },
      { id: "guilt", label: "Spending creates guilt", tags: ["security", "emotional_awareness"] },
      { id: "family-care", label: "I want to take care of family", tags: ["family", "caregiving"] },
      { id: "control", label: "I fear being controlled by money", tags: ["freedom", "boundaries"] },
      { id: "opportunity", label: "Money creates opportunities", tags: ["achievement", "freedom"] },
      { id: "prove", label: "I want to prove myself", tags: ["recognition", "achievement"] },
      { id: "unclear", label: "I have not clarified this yet", tags: ["clarity", "emotional_awareness"] },
    ],
  },
  {
    id: "career-exchange",
    title: "What do you most want your career to give you now?",
    domain: "career",
    options: [
      { id: "stable-income", label: "Stable income", tags: ["security", "clarity"] },
      { id: "growth", label: "Professional growth", tags: ["mastery", "learning"] },
      { id: "free-time", label: "More control over time", tags: ["freedom", "boundaries"] },
      { id: "impact", label: "More impact", tags: ["influence", "meaning"] },
      { id: "founder-path", label: "A founder path", tags: ["achievement", "freedom"] },
      { id: "visible", label: "Being seen", tags: ["recognition", "influence"] },
      { id: "deep-work", label: "Deep research or craft", tags: ["depth", "mastery"] },
      { id: "leadership", label: "Leading a team", tags: ["influence", "caregiving"] },
      { id: "service", label: "Serving people better", tags: ["service", "meaning"] },
      { id: "direction", label: "A clearer direction", tags: ["clarity", "meaning"] },
    ],
  },
  {
    id: "relationship-needs",
    title: "In relationships and daily life, what do you need most?",
    domain: "relationships",
    options: [
      { id: "safety", label: "Emotional safety", tags: ["security", "connection"] },
      { id: "space", label: "Personal space", tags: ["freedom", "boundaries"] },
      { id: "honesty", label: "Honest communication", tags: ["clarity", "connection"] },
      { id: "romance", label: "Romance and spark", tags: ["connection", "adventure"] },
      { id: "family-plan", label: "A family plan", tags: ["family", "security"] },
      { id: "growth-together", label: "Growing together", tags: ["learning", "connection"] },
      { id: "understood", label: "Feeling understood", tags: ["connection", "emotional_awareness"] },
      { id: "order", label: "A calm life rhythm", tags: ["rest", "security"] },
      { id: "adventure", label: "Shared adventure", tags: ["adventure", "freedom"] },
      { id: "respect", label: "Respect for boundaries", tags: ["boundaries", "security"] },
    ],
  },
  {
    id: "life-non-negotiables",
    title: "What is non-negotiable in your ideal life?",
    domain: "balance",
    options: [
      { id: "sleep", label: "Enough sleep", tags: ["rest", "body"] },
      { id: "movement", label: "Regular movement", tags: ["body", "mastery"] },
      { id: "deep-work", label: "Deep work blocks", tags: ["depth", "boundaries"] },
      { id: "friends", label: "Real friendships", tags: ["connection", "rest"] },
      { id: "alone", label: "Time alone", tags: ["boundaries", "depth"] },
      { id: "travel", label: "Travel or movement", tags: ["adventure", "freedom"] },
      { id: "family", label: "Family time", tags: ["family", "connection"] },
      { id: "runway", label: "Financial runway", tags: ["security", "freedom"] },
      { id: "creative-time", label: "Creative time", tags: ["creativity", "artistry"] },
      { id: "learning", label: "Continuous learning", tags: ["learning", "mastery"] },
    ],
  },
  {
    id: "work-life-friction",
    title: "Where does work most often distort your life?",
    domain: "balance",
    options: [
      { id: "too-responsible", label: "I carry too much responsibility", tags: ["caregiving", "boundaries"] },
      { id: "people-pleasing", label: "I please people too easily", tags: ["connection", "boundaries"] },
      { id: "perfectionism", label: "Perfectionism slows me down", tags: ["mastery", "body"] },
      { id: "distraction", label: "I get distracted", tags: ["clarity", "rest"] },
      { id: "no-boundaries", label: "My boundaries are weak", tags: ["boundaries", "security"] },
      { id: "fomo", label: "I chase too many possibilities", tags: ["adventure", "clarity"] },
      { id: "avoid-conflict", label: "I avoid conflict", tags: ["emotional_awareness", "connection"] },
      { id: "efficiency", label: "I over-optimize everything", tags: ["achievement", "rest"] },
      { id: "cannot-rest", label: "I do not know how to rest", tags: ["rest", "body"] },
      { id: "no-direction", label: "Direction is unclear", tags: ["clarity", "meaning"] },
    ],
  },
  {
    id: "emotional-response",
    title: "When emotion rises, what do you usually do?",
    domain: "emotion",
    options: [
      { id: "control", label: "Stress makes me control things", tags: ["security", "body"] },
      { id: "withdraw", label: "Sadness makes me withdraw", tags: ["rest", "connection"] },
      { id: "suppress-anger", label: "I suppress anger", tags: ["boundaries", "emotional_awareness"] },
      { id: "do-more", label: "Anxiety makes me do more", tags: ["achievement", "body"] },
      { id: "disappear", label: "Shame makes me disappear", tags: ["emotional_awareness", "security"] },
      { id: "seek-stimulus", label: "Loneliness makes me seek stimulus", tags: ["connection", "adventure"] },
      { id: "switch-direction", label: "Boredom makes me switch direction", tags: ["adventure", "clarity"] },
      { id: "defend", label: "Criticism makes me defensive", tags: ["recognition", "security"] },
      { id: "cold", label: "Disappointment makes me cold", tags: ["boundaries", "connection"] },
      { id: "low-awareness", label: "I do not notice emotions early", tags: ["emotional_awareness", "body"] },
    ],
  },
  {
    id: "body-signals",
    title: "Any physical experiences you would like to note lately? (optional)",
    domain: "health",
    options: [
      { id: "fatigue", label: "Fatigue", tags: ["body", "rest"] },
      { id: "sleep", label: "Sleep disruption", tags: ["body", "security"] },
      { id: "digestion", label: "Appetite or digestion", tags: ["body", "emotional_awareness"] },
      { id: "neck", label: "Head, neck, or shoulders", tags: ["body", "achievement"] },
      { id: "breath", label: "Breath or heart pressure", tags: ["body", "security"] },
      { id: "sitting", label: "Too much sitting", tags: ["body", "boundaries"] },
      { id: "fitness", label: "Lower fitness", tags: ["body", "mastery"] },
      { id: "food", label: "Emotional eating", tags: ["body", "emotional_awareness"] },
      { id: "life-force", label: "Lower intimacy or life force", tags: ["body", "connection"] },
      { id: "not-noticing", label: "I have not been listening", tags: ["body", "clarity"] },
    ],
  },
  {
    id: "five-year-self",
    title: "What would your five-year self ask you to do now?",
    domain: "future",
    options: [
      { id: "stop-pleasing", label: "Stop pleasing everyone", tags: ["boundaries", "courage"] },
      { id: "focus", label: "Start focusing", tags: ["clarity", "mastery"] },
      { id: "protect-health", label: "Protect health", tags: ["body", "rest"] },
      { id: "repair", label: "Repair an important relationship", tags: ["repair", "connection"] },
      { id: "assets", label: "Build real work or assets", tags: ["achievement", "security"] },
      { id: "ask-help", label: "Learn to ask for help", tags: ["connection", "courage"] },
      { id: "less-noise", label: "Lower the noise", tags: ["rest", "clarity"] },
      { id: "braver", label: "Be braver", tags: ["courage", "freedom"] },
      { id: "ordinary", label: "Accept ordinary days", tags: ["simplicity", "rest"] },
      { id: "new-chapter", label: "Open a new life chapter", tags: ["adventure", "meaning"] },
    ],
  },
];

const DOMAIN_META: Record<SoulDomain, { label: string; icon: LucideIcon }> = {
  purpose: { label: "Purpose", icon: Sparkles },
  money: { label: "Money", icon: Wallet },
  career: { label: "Career", icon: Briefcase },
  relationships: { label: "Relationships", icon: Heart },
  balance: { label: "Balance", icon: Activity },
  emotion: { label: "Emotion", icon: Brain },
  health: { label: "Body", icon: Activity },
  future: { label: "Future", icon: Sparkles },
};

const DOMAIN_LABELS_ZH: Record<SoulDomain, string> = {
  purpose: "人生方向",
  money: "金錢",
  career: "事業",
  relationships: "感情與生活",
  balance: "工作生活平衡",
  emotion: "情緒健康",
  health: "身體健康",
  future: "未來自己",
};


function getDomainLabel(domain: SoulDomain, chinese: boolean) {
  return chinese ? DOMAIN_LABELS_ZH[domain] : DOMAIN_META[domain].label;
}

function getQuestionTitle(question: SoulQuestion, chinese: boolean) {
  return chinese ? (QUESTION_TITLES_ZH[question.id] ?? question.title) : question.title;
}

function optionsForQuestion(question: SoulQuestion): SoulOption[] {
  return [...question.options, { id: "not-applicable", label: "Not applicable / no particular concern right now", tags: [] }];
}

function getOptionLabel(option: SoulOption, chinese: boolean) {
  if (option.id === "not-applicable") return chinese ? "目前不適用／沒有特別困擾" : "Not applicable / no particular concern right now";
  return chinese ? (OPTION_LABELS_ZH[option.label] ?? option.label) : option.label;
}

function getAskMyselfCopy(language: string) {
  const chinese = language.startsWith("zh");
  return chinese
    ? {
        pageKicker: "Ask Myself",
        heroTitle: "用選項建立一面自己的鏡",
        heroDescription:
          "先問權限，再用最多十題、每題最多三個選項，整理你的價值觀、生活張力與自我說明書。",
        privacyTitle: "Personal Profile 權限",
        privacyDescription:
          "MyBestLifeOS 只會使用你明確授權或上載的 AI memory files，例如 soul.md、identity.md、agent.md。你也可以完全手動建立。",
        allowSources: "使用 AI memory files",
        manualOnly: "只用手動輸入",
        sourceHint: "支援 .md、.txt、.json、.html、.zip。此版本先在瀏覽器內 staging，不會自動上傳。",
        sourceButton: "選擇記憶檔案",
        noSources: "未選擇任何檔案",
        soulTitle: "十條靈魂問題",
        soulDescription: "每題最多選 3 個。你不需要打字，除非你想補充。",
        selected: "已選",
        mirrorTitle: "Mirror draft",
        mirrorEmpty: "完成幾個選項後，這裡會整理你的主要驅動力和張力。",
        applyDraft: "套用到 personality insights",
        iconTitle: "Profile icon",
        iconDescription: "上傳個人 icon，或用選項生成一個抽象 icon prompt。",
        generateIconPrompt: "生成 icon prompt",
        imagePromptTitle: "AI icon prompt",
        manualSections: "手動 profile sections",
        manualDescription: "這些內容仍然是最終資料來源；Ask Myself 只幫你起 draft。",
        completion: "完成度",
        topSignals: "Top signals",
        sourcesReady: "已選記憶檔案",
        uploadIcon: "上傳 icon",
        modeLabel: "模式",
        modeAiFiles: "AI 檔案",
        modeManual: "手動",
        modeChoose: "未選",
        draftHeading: "Ask Myself 自我鏡像草稿",
        draftTopSignals: "主要訊號",
        draftFallback: "訊號未夠",
        draftNote: "呢份草稿只根據你揀嘅模式生成。請調整到聽落似你自己。",
      }
    : {
        pageKicker: "Ask Myself",
        heroTitle: "Build a mirror of yourself with taps",
        heroDescription:
          "Start with permission, then answer up to ten choice-based questions to shape your values, tensions, and personal operating manual.",
        privacyTitle: "Personal Profile permissions",
        privacyDescription:
          "MyBestLifeOS only uses AI memory files you explicitly allow or select, such as soul.md, identity.md, and agent.md. You can also stay fully manual.",
        allowSources: "Use AI memory files",
        manualOnly: "Manual only",
        sourceHint: "Supports .md, .txt, .json, .html, .zip. This version stages files in the browser only.",
        sourceButton: "Choose memory files",
        noSources: "No files selected",
        soulTitle: "Ten soul questions",
        soulDescription: "Pick up to 3 per question. No typing required unless you want to add more later.",
        selected: "selected",
        mirrorTitle: "Mirror draft",
        mirrorEmpty: "Pick a few options and this panel will summarize your main drives and tensions.",
        applyDraft: "Apply to personality insights",
        iconTitle: "Profile icon",
        iconDescription: "Upload your own icon, or generate an abstract icon prompt from your selected signals.",
        generateIconPrompt: "Generate icon prompt",
        imagePromptTitle: "AI icon prompt",
        manualSections: "Manual profile sections",
        manualDescription: "These fields remain the source of truth. Ask Myself only helps you draft.",
        completion: "Completion",
        topSignals: "Top signals",
        sourcesReady: "Memory files selected",
        uploadIcon: "Upload",
        modeLabel: "Mode",
        modeAiFiles: "AI files",
        modeManual: "Manual",
        modeChoose: "Choose",
        draftHeading: "Ask Myself mirror draft",
        draftTopSignals: "Top signals",
        draftFallback: "Not enough signal yet",
        draftNote: "This is a draft from selected patterns only. Edit it until it sounds like you.",
      };
}

export default function AboutMePage() {
  const { data, isLoading, isError, refetch } = useAboutMe();
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  if (isLoading) return <LoadingPage />;
  if (isError) return <PageShell title={chinese ? "關於我" : "About Me"}><div role="alert" className="space-y-4"><p>{chinese ? "未能載入已儲存的個人資料。請重試，避免覆蓋已有答案。" : "Your saved profile could not be loaded. Retry before editing your answers."}</p><OSControl onClick={() => void refetch()}>{chinese ? "重試" : "Retry"}</OSControl></div></PageShell>;
  return <AboutMeEditor initial={data ?? null} />;
}

function AboutMeEditor({ initial }: { initial: AboutMe | null }) {
  const language = useAppStore((s) => s.language);
  const chinese = language.startsWith("zh");
  const ui = getMiscUiCopy(language).aboutMe;
  const askUi = getAskMyselfCopy(language);
  const { draft, change, flush, status, savedAt, conflicting, resolveConflict } = useAboutMeDraft(initial);
  const uploadProfileImage = useUploadAboutMeProfileImage();
  const { data } = useAboutMe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [iconPrompt, setIconPrompt] = useState<string | null>(null);
  const [appendDraft, setAppendDraft] = useState<string | null>(null);
  const text = (en: string, zh: string) => chinese ? zh : en;
  const answered = SOUL_QUESTIONS.filter((q) => (draft.answers[q.id]?.length ?? 0) > 0 || draft.ownWords[q.id]?.trim()).length;
  const selectedDetails = SOUL_QUESTIONS.flatMap((question) => optionsForQuestion(question).filter((option) => (draft.answers[question.id] ?? []).includes(option.id)).map((option) => ({ question, option })));
  const summary = [...selectedDetails.map(({ question, option }) => `${getQuestionTitle(question, chinese)}: ${getOptionLabel(option, chinese)}`), ...SOUL_QUESTIONS.filter((q) => draft.ownWords[q.id]?.trim()).map((q) => `${getQuestionTitle(q, chinese)}: ${draft.ownWords[q.id].trim()}`)];
  const question = SOUL_QUESTIONS[draft.deepStep];
  const sectionInfo: { key: SectionKey; title: string }[] = [
    { key: "instruction_manual", title: ui.instructionManualTitle }, { key: "core_values", title: ui.coreValuesTitle },
    { key: "mission", title: ui.missionTitle }, { key: "personality_insights", title: ui.personalityInsightsTitle },
  ];
  const stepTitles = [text("What would you like to make easier?", "最近，你最想讓哪件事變得容易一點？"), text("How much time could you set aside?", "你通常可以留多少時間給這件事？"), text("What kind of help would you like first?", "你想先得到哪種幫助？")];
  const options = [
    [["Start important work", "開始重要工作"], ["Organize my day", "安排生活"], ["Keep a habit", "保持一個習慣"], ["Organize information", "整理資訊"]],
    [["10 minutes", "10 分鐘"], ["20 minutes", "20 分鐘"], ["30 minutes", "30 分鐘"], ["It varies", "每天不同"]],
    [["Break it into one small step", "拆成一小步"], ["Make room for it today", "安排進今日"], ["Just write it down", "先記下來"]],
  ];
  const quickKeys = ["focus", "minutes", "help"] as const;
  const updateQuick = (value: string) => change((d) => ({ ...d, quick: { ...d.quick, [quickKeys[d.step]]: value } }));
  const goStep = (step: number) => { change((d) => ({ ...d, step })); void flush(); };
  const statusCopy = {
    saved: savedAt ? text("Saved to your account", "已儲存到帳戶") : text("All questions are optional", "所有問題均為選填"),
    dirty: text("Unsaved changes", "有尚未儲存的更改"), saving: text("Saving…", "儲存中…"),
    error: text("Could not save. Your answers are still on this page. Retry before leaving.", "暫時未能儲存，答案仍留在這個頁面。請在離開前重試。"),
    conflict: text("Your profile changed elsewhere. Compare the saved answers below before choosing which version to keep.", "其他地方更新了個人資料。請比較下方已儲存答案，再選擇保留哪個版本。"),
  };
  return <PageShell title={ui.pageTitle} description={text("Make your plans fit your life. Start small; everything here is optional.", "讓計劃更貼近你的生活。從一小步開始，所有內容均可選填。")}
    actions={<OSControl onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>{text("How this works", "使用說明")}</OSControl>}>
    <div className="mx-auto max-w-4xl space-y-5">
      {showHelp && <OSFrostedPanel className="space-y-2 p-4"><h2 className="font-semibold">{text("Your profile, at your pace", "按自己的步伐建立個人檔案")}</h2><p className="text-sm leading-6">{text("Answer up to three short questions, then choose a small action in your planner. Skip any question and return here to continue. This is a planning preference, not a personality test.", "先回答最多三條簡短問題，再到計劃頁安排一件小事。任何問題都可以跳過，之後回來續填。這是安排生活的偏好，並非人格測驗。")}</p><OSControl onClick={() => setShowHelp(false)}>{text("Got it", "知道了")}</OSControl></OSFrostedPanel>}
      <OSFrostedPanel as="section" className="space-y-4 p-4 sm:p-6" aria-label={text("Quick start", "快速開始")}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-muted-foreground">{draft.step < 3 ? text(`Question ${draft.step + 1} of 3 · Optional`, `第 ${draft.step + 1}／3 題・選填`) : text("Your starting point", "你的起步方向")}</p><span role="status" className="text-xs text-muted-foreground">{statusCopy[status]}{status === "saved" && savedAt ? ` · ${new Date(savedAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>
        {(status === "error" || status === "conflict") && <OSControl onClick={() => void flush()}>{text("Retry save", "重試儲存")}</OSControl>}
        {status === "conflict" && conflicting && <div className="space-y-3 rounded-xl border border-amber-500/50 p-3"><h3 className="font-medium">{text("Saved answers from your other session", "另一處已儲存的答案")}</h3><p className="whitespace-pre-wrap text-sm">{Object.values(readQuestionnaire(conflicting.sections).quick).filter(Boolean).join(" · ") || text("No quick answers", "未填快速答案")}</p><details><summary>{text("All saved choices", "所有已儲存選擇")}</summary><ul className="list-disc pl-5 text-sm">{SOUL_QUESTIONS.flatMap((q) => optionsForQuestion(q).filter((o) => (readQuestionnaire(conflicting.sections).answers[q.id] ?? []).includes(o.id)).map((o) => <li key={q.id + o.id}>{getQuestionTitle(q, chinese)}: {getOptionLabel(o, chinese)}</li>))}{SOUL_QUESTIONS.filter((q) => readQuestionnaire(conflicting.sections).ownWords[q.id]?.trim()).map((q) => <li key={q.id + "-own"}>{getQuestionTitle(q, chinese)}: {readQuestionnaire(conflicting.sections).ownWords[q.id]}</li>)}</ul></details><div className="flex flex-wrap gap-2"><OSControl onClick={() => resolveConflict(false)}>{text("Use saved answers", "使用已儲存答案")}</OSControl><OSControl onClick={() => resolveConflict(true)}>{text("Save my current answers instead", "改為儲存我目前的答案")}</OSControl></div></div>}
        {draft.step < 3 ? <>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{stepTitles[draft.step]}</h2>
          <div className="flex flex-wrap gap-2">{options[draft.step].map(([en, zh]) => <OSControl key={en} aria-pressed={draft.quick[quickKeys[draft.step]] === text(en, zh)} onClick={() => updateQuick(text(en, zh))}>{text(en, zh)}</OSControl>)}</div>
          {draft.step === 0 && <label className="block space-y-2 text-sm"><span>{text("Or use your own words", "或用自己的說法")}</span><Input maxLength={500} value={draft.quick.focus} onChange={(event) => updateQuick(event.target.value)} onBlur={() => void flush()} placeholder={text("For example, read for 20 minutes after work", "例如：放工後抽 20 分鐘讀書")} /></label>}
          {draft.step === 1 && <p className="text-sm text-muted-foreground">{text("This helps you choose a manageable task. It does not change your calendar.", "這幫助你選擇適合大小的任務，不會自動改動日曆。")}</p>}
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {draft.step > 0 && <OSControl onClick={() => goStep(draft.step - 1)}>{text("Back", "上一題")}</OSControl>}
            <OSPrimaryAction onClick={() => goStep(draft.step + 1)}>{draft.step === 2 ? text("See my starting point", "查看起步方向") : text("Next", "下一題")}</OSPrimaryAction>
            <OSControl onClick={() => goStep(draft.step + 1)}>{text("Skip this question", "略過這題")}</OSControl>
          </div>
        </> : <>
          <h2 className="text-xl font-semibold">{draft.quick.focus || text("Start with one thing that matters today", "從今日一件重要的小事開始")}</h2>
          <p className="text-sm text-muted-foreground">{[draft.quick.minutes, draft.quick.help].filter(Boolean).join(" · ") || text("Choose one realistic next step in your planner.", "在計劃頁安排一個做得到的下一步。")}</p>
          <p className="text-xs text-muted-foreground">{text("Organized from your choices. No AI analysis or task has been created.", "根據你的選擇整理，尚未進行 AI 分析或建立任務。")}</p>
          <div className="flex flex-wrap gap-2"><OSControl onClick={() => goStep(0)}>{text("Edit answers", "修改答案")}</OSControl></div>
        </>}
      </OSFrostedPanel>
      {draft.step === 3 && <FirstStepCard initialTitle={draft.quick.focus} initialMinutes={Number.parseInt(draft.quick.minutes, 10)} />}
      <details className="rounded-2xl border border-border p-4"><summary className="min-h-11 cursor-pointer font-medium">{text(`Explore further · ${answered}/10 questions answered · Optional`, `深入了解・已回答 ${answered}／10 題・選填`)}</summary>
        <p className="mb-4 text-sm text-muted-foreground">{text("Choose up to 3 options; one is enough. Money, relationships and wellbeing questions are optional and are not diagnostic.", "每題最多選 3 項，選 1 項亦足夠。金錢、關係及身心問題均可略過，並非診斷。")}</p>
        <SoulQuestionRow index={draft.deepStep} question={question} selected={draft.answers[question.id] ?? []} chinese={chinese} onToggle={(id) => change((d) => { const selected = d.answers[question.id] ?? []; return { ...d, skipped: d.skipped.filter((key) => key !== question.id), answers: { ...d.answers, [question.id]: selected.includes(id) ? selected.filter((key) => key !== id) : selected.length < 3 ? [...selected, id] : selected } }; })} />
        <div className="mt-4 block space-y-2 text-sm"><label htmlFor={`about-own-${question.id}`}>{text("Or answer in your own words (optional)", "或用自己的說法回答（選填）")}</label><Textarea id={`about-own-${question.id}`} maxLength={1500} value={draft.ownWords[question.id] ?? ""} onChange={(event) => change((d) => ({ ...d, skipped: d.skipped.filter((id) => id !== question.id), ownWords: { ...d.ownWords, [question.id]: event.target.value } }))} onBlur={() => void flush()} /></div>
        <div className="mt-4 flex flex-wrap gap-2"><OSControl disabled={draft.deepStep === 0} onClick={() => change((d) => ({ ...d, deepStep: d.deepStep - 1 }))}>{text("Previous", "上一題")}</OSControl><OSControl onClick={() => change((d) => ({ ...d, answers: { ...d.answers, [question.id]: [] }, ownWords: { ...d.ownWords, [question.id]: "" }, skipped: [...new Set([...d.skipped, question.id])], deepStep: Math.min(9, d.deepStep + 1) }))}>{text("Not applicable / Skip", "不適用／略過")}</OSControl><OSPrimaryAction onClick={() => { change((d) => ({ ...d, deepStep: Math.min(9, d.deepStep + 1) })); void flush(); }}>{draft.deepStep === 9 ? text("Save answers", "儲存答案") : text("Next question", "下一題")}</OSPrimaryAction></div>
        {summary.length > 0 && <div className="mt-5 space-y-3"><h3 className="font-medium">{text("You mentioned", "你提到")}</h3><ul className="list-disc space-y-2 pl-5 text-sm">{summary.map((line) => <li key={line}>{line}</li>)}</ul><OSControl onClick={() => setAppendDraft(summary.map((line) => `<p>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`).join(""))}>{text("Preview adding to my notes", "預覽加入個人筆記")}</OSControl></div>}
      </details>
      <details className="rounded-2xl border border-border p-4" open={appendDraft !== null}><summary className="min-h-11 cursor-pointer font-medium">{text("My personal notes · Optional", "我寫給自己的說明・選填")}</summary><p className="mb-4 text-sm text-muted-foreground">{text("Save each section separately. Saving one section keeps your other drafts intact.", "每一節分開儲存，儲存其中一節會保留其他草稿。")}</p><div className="space-y-6">{sectionInfo.map(({ key, title }) => <AboutMeNote key={key} sectionKey={key} title={title} initialValue={initial?.[key] ?? null} chinese={chinese} appendDraft={key === "personality_insights" ? appendDraft : null} onAppendDone={() => setAppendDraft(null)} />)}</div></details>
      <details className="rounded-2xl border border-border p-4"><summary className="min-h-11 cursor-pointer font-medium">{text("How your information is used", "資料如何儲存及使用")}</summary><div className="space-y-3 text-sm leading-6"><p>{text("Your answers are saved to your signed-in account after the save indicator confirms success. The starting point above is assembled from your choices without sending an AI request.", "儲存狀態確認成功後，答案會保存到已登入帳戶。上方起步方向由你的選擇整理，並不會傳送 AI 請求。")}</p><p>{text("Personal notes may be included when you use personalized AI tools such as Role Models. Saving here is separate from choosing an AI tool; review its information preview before sending. Do not add information you do not want used in those tools.", "使用 Role Models 等個人化 AI 工具時，個人筆記可能被加入內容。儲存在此與使用 AI 工具是不同操作，傳送前請檢查資料預覽。請勿加入不希望用於這些工具的資料。")}</p></div></details>
      <details className="rounded-2xl border border-border p-4"><summary className="min-h-11 cursor-pointer font-medium">{text("Profile image · Optional", "個人外觀・選填")}</summary><p className="mb-4 text-sm text-muted-foreground">{text("Uploaded images use a public image link. Anyone with that link can view the image.", "上傳圖片會使用公開圖片連結，任何持有連結的人都可查看圖片。")}</p><ProfileImageTool ui={ui} askUi={askUi} imageUrl={data?.profile_image_url ?? initial?.profile_image_url ?? null} pending={uploadProfileImage.isPending} fileInputRef={fileInputRef} onProfileImagePick={() => fileInputRef.current?.click()} onProfileImageChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) uploadProfileImage.mutate(file); }} onGenerateIconPrompt={() => setIconPrompt("Create an abstract personal icon with calm geometric shapes, no face and no text.")} iconPrompt={iconPrompt} /></details>
    </div>
  </PageShell>;
}

function AboutMeNote({ sectionKey, title, initialValue, chinese, appendDraft, onAppendDone }: { sectionKey: SectionKey; title: string; initialValue: string | null; chinese: boolean; appendDraft: string | null; onAppendDone: () => void }) {
  const editor = useRef<RichTextEditorHandle>(null);
  const [saved, setSaved] = useState(initialValue);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [remoteValue, setRemoteValue] = useState<string | null | undefined>(undefined);
  const [undo, setUndo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const save = async () => {
    if (saving) return;
    setSaving(true); setMessage("");
    const value = editor.current?.getHtml() || null;
    try {
      const row = await aboutMeRepository.saveSection(sectionKey, value, saved);
      setSaved(value); setDirty(editor.current?.getHtml() !== (value ?? ""));
      queryClient.setQueryData(["about-me"], row);
      setMessage(chinese ? "已儲存到帳戶" : "Saved to your account");
    } catch (error) { if (error instanceof Error && error.message === "ABOUT_ME_CONFLICT") { try { const row = await aboutMeRepository.get(); setRemoteValue(row?.[sectionKey] ?? null); } catch { /* Retain local writing. */ } } setMessage(error instanceof Error && error.message === "ABOUT_ME_CONFLICT" ? (chinese ? "另一處已更新這一節。草稿仍在此，請先比較再儲存。" : "This section changed elsewhere. Your draft is still here; compare before saving.") : (chinese ? "未能儲存，請保留此頁並重試。" : "Could not save. Keep this page open and retry.")); }
    finally { setSaving(false); }
  };
  return <section className="space-y-3"><h3 className="font-medium">{title}</h3><RichTextEditor ref={editor} initialHtml={initialValue ?? ""} minHeightClass="min-h-[120px]" onChange={() => setDirty(true)} />
    {appendDraft && <div className="space-y-3 rounded-xl border border-border p-3"><p className="text-sm">{chinese ? "以下內容會加入筆記末尾，不會取代你寫過的內容。" : "These answers will be appended to your notes. Your existing writing will be kept."}</p><div className="text-sm leading-6" dangerouslySetInnerHTML={{ __html: appendDraft }} /><OSControl onClick={() => { const old = editor.current?.getHtml() ?? ""; setUndo(old); editor.current?.setHtml(old + appendDraft); setDirty(true); onAppendDone(); }}>{chinese ? "加入草稿" : "Append to draft"}</OSControl><OSControl onClick={onAppendDone}>{chinese ? "取消" : "Cancel"}</OSControl></div>}
    {remoteValue !== undefined && <div className="space-y-2 rounded-xl border border-amber-500/50 p-3"><h4 className="text-sm font-medium">{chinese ? "另一處已儲存的內容" : "Saved version from your other session"}</h4><p className="whitespace-pre-wrap text-sm">{remoteValue?.replace(/<[^>]*>/g, "") || (chinese ? "空白" : "Empty")}</p><OSControl onClick={() => { editor.current?.setHtml(remoteValue ?? ""); setSaved(remoteValue); setDirty(false); setRemoteValue(undefined); setMessage(""); }}>{chinese ? "使用已儲存內容" : "Use saved writing"}</OSControl><OSControl onClick={() => { setSaved(remoteValue); setRemoteValue(undefined); setMessage(chinese ? "保留你的草稿。按儲存這一節來取代已比較的版本。" : "Your draft is kept. Save this section to replace the version you reviewed."); }}>{chinese ? "保留我的草稿" : "Keep my draft"}</OSControl></div>}
    <div className="flex flex-wrap items-center gap-2"><OSPrimaryAction disabled={!dirty || saving || remoteValue !== undefined} onClick={() => void save()}>{saving ? (chinese ? "儲存中…" : "Saving…") : (chinese ? "儲存這一節" : "Save section")}</OSPrimaryAction>{undo !== null && <OSControl onClick={() => { editor.current?.setHtml(undo); setDirty(true); setUndo(null); }}>{chinese ? "撤回加入內容" : "Undo append"}</OSControl>}<span role="status" className="text-xs text-muted-foreground">{message || (dirty ? (chinese ? "尚未儲存" : "Unsaved changes") : "")}</span></div>
  </section>;
}

function ProfileImageTool({
  ui,
  askUi,
  imageUrl,
  pending,
  fileInputRef,
  onProfileImagePick,
  onProfileImageChange,
  onGenerateIconPrompt,
  iconPrompt,
}: {
  ui: ReturnType<typeof getMiscUiCopy>["aboutMe"];
  askUi: ReturnType<typeof getAskMyselfCopy>;
  imageUrl: string | null;
  pending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onProfileImagePick: () => void;
  onProfileImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onGenerateIconPrompt: () => void;
  iconPrompt: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{askUi.iconTitle}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{askUi.iconDescription}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={onProfileImageChange}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onProfileImagePick}
          disabled={pending}
          aria-label={ui.profileImageAriaLabel}
          title={ui.profileImageAriaLabel}
          className={cn(
            "group relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <Avatar className="size-24 rounded-2xl ring-2 ring-border">
            <AvatarImage src={imageUrl ?? undefined} alt="" />
            <AvatarFallback className="rounded-2xl bg-muted">
              <UserRound className="size-10 text-muted-foreground" aria-hidden />
            </AvatarFallback>
            <AvatarBadge
              className="size-8 border-2 border-background bg-primary text-primary-foreground shadow-sm [&>svg]:size-3.5"
              aria-hidden
            >
              <Camera />
            </AvatarBadge>
          </Avatar>
        </button>
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">{ui.profileImageFileHint}</p>
          <div className="flex flex-wrap gap-2">
            <OSControl type="button" onClick={onProfileImagePick}>
              <Upload />
              {askUi.uploadIcon}
            </OSControl>
            <OSControl type="button" onClick={onGenerateIconPrompt}>
              <ImageIcon />
              {askUi.generateIconPrompt}
            </OSControl>
          </div>
        </div>
      </div>
      {iconPrompt ? (
        <div className="rounded-lg bg-muted/70 p-3">
          <p className="text-xs font-semibold text-foreground">{askUi.imagePromptTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{iconPrompt}</p>
        </div>
      ) : null}
    </div>
  );
}

function SoulQuestionRow({
  index,
  question,
  selected,
  chinese,
  onToggle,
}: {
  index: number;
  question: SoulQuestion;
  selected: string[];
  chinese: boolean;
  onToggle: (optionId: string, target: HTMLElement) => void;
}) {
  const meta = DOMAIN_META[question.domain];
  const Icon = meta.icon;

  return (
    <article data-ask-reveal className="rounded-lg border border-white/45 bg-white/46 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-xs font-medium text-muted-foreground">
              <Icon className="size-3.5" aria-hidden />
              {getDomainLabel(question.domain, chinese)}
            </span>
            <span className="text-xs text-muted-foreground">{selected.length}/3</span>
          </div>
          <h3 className="text-sm font-semibold leading-6 text-foreground">
            {getQuestionTitle(question, chinese)}
          </h3>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {optionsForQuestion(question).map((option) => {
          const active = selected.includes(option.id);
          const disabled = !active && selected.length >= 3;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={(event) => onToggle(option.id, event.currentTarget)}
              className={cn(
                "min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-medium leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
                active
                  ? "border-lime-300/80 bg-lime-300 text-slate-950 shadow-sm"
                  : "border-white/50 bg-white/58 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              {getOptionLabel(option, chinese)}
            </button>
          );
        })}
      </div>
    </article>
  );
}
