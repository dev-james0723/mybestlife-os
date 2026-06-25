"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { useGSAP } from "@gsap/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Briefcase,
  Camera,
  CheckCircle2,
  FileText,
  Heart,
  ImageIcon,
  Shield,
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
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { useAboutMe, useUpsertAboutMe, useUploadAboutMeProfileImage } from "@/hooks/use-about-me";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { isPremiumMotionEnabled } from "@/lib/motion/config";
import { registerGSAP, gsap } from "@/lib/motion/register-gsap";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type SectionKey =
  | "instruction_manual"
  | "core_values"
  | "mission"
  | "personality_insights";

type SourceMode = "undecided" | "allowed" | "manual";

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
  "body-signals": "你嘅身體最近用咩方式提醒你？",
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
    title: "How has your body been trying to get your attention?",
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

function getTagLabel(tag: string, chinese: boolean) {
  return chinese ? (TAG_LABELS_ZH[tag] ?? TAG_LABELS[tag] ?? tag) : (TAG_LABELS[tag] ?? tag);
}

function getDomainLabel(domain: SoulDomain, chinese: boolean) {
  return chinese ? DOMAIN_LABELS_ZH[domain] : DOMAIN_META[domain].label;
}

function getQuestionTitle(question: SoulQuestion, chinese: boolean) {
  return chinese ? (QUESTION_TITLES_ZH[question.id] ?? question.title) : question.title;
}

function getOptionLabel(option: SoulOption, chinese: boolean) {
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
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).aboutMe;
  const askUi = getAskMyselfCopy(language);
  const chinese = language.startsWith("zh");
  const { data, isLoading } = useAboutMe();
  const upsert = useUpsertAboutMe();
  const uploadProfileImage = useUploadAboutMeProfileImage();
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion(false);
  const motionEnabled = isPremiumMotionEnabled();

  const instructionRef = useRef<RichTextEditorHandle>(null);
  const coreValuesRef = useRef<RichTextEditorHandle>(null);
  const missionRef = useRef<RichTextEditorHandle>(null);
  const personalityRef = useRef<RichTextEditorHandle>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("undecided");
  const [sourceNames, setSourceNames] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [iconPrompt, setIconPrompt] = useState<string | null>(null);

  registerGSAP();

  const { contextSafe } = useGSAP(
    () => {
      const root = pageRef.current;
      if (!root || !motionEnabled) return;

      const targets = gsap.utils.toArray<HTMLElement>("[data-ask-reveal]", root);
      if (targets.length === 0) return;

      if (reduceMotion) {
        gsap.set(targets, { autoAlpha: 1, clearProps: "transform" });
        return;
      }

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 22, scale: 0.985 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.58,
          ease: "power3.out",
          stagger: 0.045,
          clearProps: "opacity,visibility,transform",
        },
      );
    },
    { scope: pageRef, dependencies: [motionEnabled, reduceMotion] },
  );

  const sections: { key: SectionKey; title: string; description: string; multiline: boolean }[] = [
    {
      key: "instruction_manual",
      title: ui.instructionManualTitle,
      description: ui.instructionManualDescription,
      multiline: true,
    },
    {
      key: "core_values",
      title: ui.coreValuesTitle,
      description: ui.coreValuesDescription,
      multiline: true,
    },
    {
      key: "mission",
      title: ui.missionTitle,
      description: ui.missionDescription,
      multiline: true,
    },
    {
      key: "personality_insights",
      title: ui.personalityInsightsTitle,
      description: ui.personalityInsightsDescription,
      multiline: true,
    },
  ];

  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => {
      instructionRef.current?.setHtml(data.instruction_manual ?? "");
      coreValuesRef.current?.setHtml(data.core_values ?? "");
      missionRef.current?.setHtml(data.mission ?? "");
      personalityRef.current?.setHtml(data.personality_insights ?? "");
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  const htmlOrNull = (ref: RefObject<RichTextEditorHandle | null>) => {
    const html = ref.current?.getHtml() ?? "";
    const text = ref.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return null;
    return html.trim() || text;
  };

  const onProfileImagePick = () => {
    fileInputRef.current?.click();
  };

  const onProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadProfileImage.mutate(file);
  };

  const onSourceFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(e.target.files ?? []).map((file) => file.name);
    setSourceNames(names);
    if (names.length > 0) setSourceMode("allowed");
  };

  const selectedDetails = useMemo(() => {
    return SOUL_QUESTIONS.flatMap((question) => {
      const selected = new Set(answers[question.id] ?? []);
      return question.options
        .filter((option) => selected.has(option.id))
        .map((option) => ({ question, option }));
    });
  }, [answers]);

  const selectedCount = selectedDetails.length;
  const completion = Math.round(
    (Object.values(answers).filter((value) => value.length > 0).length /
      SOUL_QUESTIONS.length) *
      100,
  );

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { option } of selectedDetails) {
      for (const tag of option.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, label: getTagLabel(tag, chinese), count }));
  }, [chinese, selectedDetails]);

  const domainSummaries = useMemo(() => {
    const grouped = new Map<SoulDomain, string[]>();
    for (const { question, option } of selectedDetails) {
      const current = grouped.get(question.domain) ?? [];
      current.push(getOptionLabel(option, chinese));
      grouped.set(question.domain, current);
    }
    return Array.from(grouped.entries()).map(([domain, labels]) => ({
      domain,
      labels: labels.slice(0, 4),
    }));
  }, [chinese, selectedDetails]);

  const mirrorDraftHtml = useMemo(() => {
    if (selectedDetails.length === 0) return "";
    const signals = topTags.map((tag) => tag.label).join(", ");
    const domains = domainSummaries
      .map(({ domain, labels }) => {
        const label = getDomainLabel(domain, chinese);
        return `<li><strong>${label}:</strong> ${labels.join(", ")}</li>`;
      })
      .join("");
    return [
      `<h2>${askUi.draftHeading}</h2>`,
      `<p><strong>${askUi.draftTopSignals}:</strong> ${signals || askUi.draftFallback}</p>`,
      "<ul>",
      domains,
      "</ul>",
      `<p>${askUi.draftNote}</p>`,
    ].join("");
  }, [askUi, chinese, domainSummaries, selectedDetails.length, topTags]);

  const pulseOption = contextSafe((target: HTMLElement) => {
    if (reduceMotion || !motionEnabled) return;
    gsap.fromTo(
      target,
      { scale: 0.985 },
      {
        scale: 1,
        duration: 0.24,
        ease: "back.out(1.7)",
        clearProps: "transform",
        overwrite: "auto",
      },
    );
  });

  const toggleAnswer = (
    questionId: string,
    optionId: string,
    target?: HTMLElement,
  ) => {
    if (target) pulseOption(target);
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (current.includes(optionId)) {
        return {
          ...prev,
          [questionId]: current.filter((id) => id !== optionId),
        };
      }
      if (current.length >= 3) return prev;
      return { ...prev, [questionId]: [...current, optionId] };
    });
  };

  const applyMirrorDraft = () => {
    if (!mirrorDraftHtml) return;
    personalityRef.current?.setHtml(mirrorDraftHtml);
  };

  const generateIconPrompt = () => {
    const signals = topTags.map((tag) => getTagLabel(tag.tag, false)).join(", ") || "self reflection, clarity";
    setIconPrompt(
      `Create an abstract personal profile icon inspired by: ${signals}. Use symbolic shapes, no face, no text, calm premium Life OS style, transparent-friendly composition.`,
    );
  };

  const saveSection = async (key: SectionKey) => {
    const payload: Record<string, string | null> = {};
    if (key === "instruction_manual") {
      payload.instruction_manual = htmlOrNull(instructionRef);
    }
    if (key === "core_values") {
      payload.core_values = htmlOrNull(coreValuesRef);
    }
    if (key === "mission") {
      payload.mission = htmlOrNull(missionRef);
    }
    if (key === "personality_insights") {
      payload.personality_insights = htmlOrNull(personalityRef);
    }
    await upsert.mutateAsync(payload);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
    >
      <div
        ref={pageRef}
        className="grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]"
      >
        <div className="space-y-5">
          <OSFrostedPanel data-ask-reveal className="overflow-hidden p-0">
            <div className="grid gap-0 2xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5 p-5 sm:p-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/45 bg-white/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
                  <Brain className="size-3.5" aria-hidden />
                  {askUi.pageKicker}
                </div>
                <div className="space-y-2">
                  <h2 className="max-w-2xl text-balance font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {askUi.heroTitle}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {askUi.heroDescription}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusTile label={askUi.completion} value={`${completion}%`} />
                  <StatusTile label={askUi.selected} value={`${selectedCount}/30`} />
                  <StatusTile
                    label={askUi.modeLabel}
                    value={
                      sourceMode === "allowed"
                        ? askUi.modeAiFiles
                        : sourceMode === "manual"
                          ? askUi.modeManual
                          : askUi.modeChoose
                    }
                  />
                </div>
              </div>
              <div className="border-t border-white/45 bg-white/42 p-5 dark:border-white/10 dark:bg-white/[0.03] 2xl:border-l 2xl:border-t-0">
                <ProfileImageTool
                  ui={ui}
                  askUi={askUi}
                  imageUrl={data?.profile_image_url ?? null}
                  pending={uploadProfileImage.isPending}
                  fileInputRef={fileInputRef}
                  onProfileImagePick={onProfileImagePick}
                  onProfileImageChange={onProfileImageChange}
                  onGenerateIconPrompt={generateIconPrompt}
                  iconPrompt={iconPrompt}
                />
              </div>
            </div>
          </OSFrostedPanel>

          <OSFrostedPanel data-ask-reveal as="section" className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="size-4 text-lime-700 dark:text-lime-200" aria-hidden />
                  {askUi.privacyTitle}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {askUi.privacyDescription}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <OSControl
                  type="button"
                  onClick={() => setSourceMode("allowed")}
                  className={sourceMode === "allowed" ? "border-lime-300/70 bg-lime-300/20 text-foreground" : undefined}
                >
                  <FileText />
                  {askUi.allowSources}
                </OSControl>
                <OSControl
                  type="button"
                  onClick={() => setSourceMode("manual")}
                  className={sourceMode === "manual" ? "border-lime-300/70 bg-lime-300/20 text-foreground" : undefined}
                >
                  <CheckCircle2 />
                  {askUi.manualOnly}
                </OSControl>
              </div>
            </div>
            {sourceMode === "allowed" ? (
              <div className="rounded-lg border border-dashed border-white/60 bg-white/44 p-3 dark:border-white/12 dark:bg-white/[0.03]">
                <input
                  ref={sourceInputRef}
                  type="file"
                  multiple
                  accept=".md,.txt,.json,.html,.zip"
                  className="sr-only"
                  onChange={onSourceFilesChange}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs leading-5 text-muted-foreground">{askUi.sourceHint}</p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {sourceNames.length > 0
                        ? `${askUi.sourcesReady}: ${sourceNames.join(", ")}`
                        : askUi.noSources}
                    </p>
                  </div>
                  <OSPrimaryAction type="button" onClick={() => sourceInputRef.current?.click()}>
                    <Upload />
                    {askUi.sourceButton}
                  </OSPrimaryAction>
                </div>
              </div>
            ) : null}
          </OSFrostedPanel>

          <OSFrostedPanel data-ask-reveal as="section" className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{askUi.soulTitle}</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {askUi.soulDescription}
                </p>
              </div>
              {topTags.length > 0 ? (
                <div className="flex max-w-md flex-wrap gap-1.5">
                  {topTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag.tag}
                      className="rounded-md border border-white/45 bg-white/58 px-2 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      {tag.label} · {tag.count}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              {SOUL_QUESTIONS.map((question, index) => (
                <SoulQuestionRow
                  key={question.id}
                  index={index}
                  question={question}
                  selected={answers[question.id] ?? []}
                  chinese={chinese}
                  onToggle={(optionId, target) => toggleAnswer(question.id, optionId, target)}
                />
              ))}
            </div>
          </OSFrostedPanel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <OSSolidPanel data-ask-reveal className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{askUi.mirrorTitle}</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  {askUi.topSignals}
                </p>
              </div>
              <Sparkles className="size-4 text-[var(--accent-pink)]" aria-hidden />
            </div>
            {topTags.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag) => (
                    <span
                      key={tag.tag}
                      className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  {domainSummaries.map(({ domain, labels }) => {
                    const meta = DOMAIN_META[domain];
                    const Icon = meta.icon;
                    return (
                      <div key={domain} className="flex gap-2 rounded-lg bg-muted/60 p-2.5">
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {getDomainLabel(domain, chinese)}
                          </p>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {labels.join(", ")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <OSPrimaryAction
                  type="button"
                  className="w-full"
                  onClick={applyMirrorDraft}
                  disabled={!mirrorDraftHtml}
                >
                  {askUi.applyDraft}
                </OSPrimaryAction>
              </div>
            ) : (
              <p className="rounded-lg bg-muted/60 p-3 text-sm leading-6 text-muted-foreground">
                {askUi.mirrorEmpty}
              </p>
            )}
          </OSSolidPanel>

          <OSSolidPanel data-ask-reveal className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">{askUi.manualSections}</h2>
              <p className="text-xs leading-5 text-muted-foreground">{askUi.manualDescription}</p>
            </div>
            <div className="space-y-4">
              {sections.map((s) => (
                <section key={s.key} className="space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                    <p className="text-xs leading-5 text-muted-foreground">{s.description}</p>
                  </div>
                  {s.multiline ? (
                    <RichTextEditor
                      ref={
                        s.key === "instruction_manual"
                          ? instructionRef
                          : s.key === "core_values"
                            ? coreValuesRef
                            : s.key === "mission"
                              ? missionRef
                              : personalityRef
                      }
                      initialHtml=""
                      placeholder={ui.writeSectionPlaceholder(s.title)}
                      minHeightClass="min-h-[140px]"
                    />
                  ) : null}
                  <OSPrimaryAction
                    type="button"
                    className="w-full"
                    onClick={() => saveSection(s.key)}
                    disabled={upsert.isPending}
                  >
                    {upsert.isPending ? ui.saving : ui.saveSection(s.title)}
                  </OSPrimaryAction>
                </section>
              ))}
            </div>
          </OSSolidPanel>
        </aside>
      </div>
    </PageShell>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/45 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
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
        {question.options.map((option) => {
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
                "min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-medium leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
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
