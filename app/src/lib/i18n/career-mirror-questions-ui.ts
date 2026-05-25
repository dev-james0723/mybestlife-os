import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type {
  OptionId,
  QuestionId,
  SectionId,
} from "@/lib/career-mirror/careerSetupTypes";

/**
 * AI Career Mirror — section / question / option copy (WS2).
 * Keyed by the exact stable ids used in careerSetupQuestionBank.ts.
 */
export type CareerSetupQuestionCopy = {
  sections: Record<SectionId, { title: string; subtitle?: string }>;
  questions: Record<
    QuestionId,
    { prompt: string; helper?: string; whyThisMatters?: string }
  >;
  options: Record<OptionId, string>;
};

const en: CareerSetupQuestionCopy = {
  sections: {
    "current-state": {
      title: "Where you are now",
      subtitle: "Let's start with a few choices to pin down where you're really stuck.",
    },
    direction: {
      title: "What you're aiming for",
    },
    motivation: {
      title: "What actually drives you",
    },
    energy: {
      title: "Where your energy comes from",
    },
    skills: {
      title: "What you're known for",
    },
    blockers: {
      title: "What gets in the way",
    },
    visibility: {
      title: "How you want to be seen",
    },
    "decision-style": {
      title: "How you decide",
    },
    "org-psychology": {
      title: "What you can't stand at work",
    },
    feedback: {
      title: "How feedback lands for you",
    },
    ambition: {
      title: "The shape of your ambition",
    },
    personality: {
      title: "A quick personality read (optional)",
    },
    transition: {
      title: "Are you changing direction?",
    },
    portrait: {
      title: "Add a portrait (optional)",
    },
    visual: {
      title: "Your career banner",
    },
  },
  questions: {
    "current-state-summary": {
      prompt: "Which line sounds most like you right now?",
      helper: "Pick the one that stings a little — that's usually the true one.",
    },
    "current-identity": {
      prompt: "What do you mostly do these days?",
      helper: "Closest fit is fine. You can type your own if none fit.",
    },
    "what-success-buys": {
      prompt: "You say you want to succeed — but what do you actually want it to buy?",
      helper: "Choose as many as ring true.",
    },
    "motivation-drivers": {
      prompt: "When you're fully in, what's really driving you?",
      helper: "Rank your top 3.",
    },
    "energy-pattern": {
      prompt: "When do you feel most alive at work?",
    },
    "remembered-for": {
      prompt: "What do people usually remember you for?",
      helper: "Pick what's actually true, not what you wish were true.",
    },
    "where-stuck": {
      prompt: "You usually don't fail because you can't — so where do you get stuck?",
    },
    "visibility-feeling": {
      prompt: "How do you feel about being visible?",
    },
    "decision-basis": {
      prompt: "When it's a big call, what do you actually go on?",
    },
    "org-pet-peeve": {
      prompt: "What makes a workplace unbearable for you?",
      helper: "Choose all that apply.",
    },
    "feedback-style": {
      prompt: "How do you take feedback best?",
    },
    "ambition-style": {
      prompt: "If you're honest, what does 'made it' look like to you?",
    },
    mbti: {
      prompt: "Know your 16-type personality?",
      helper: "Totally optional — pick it or skip.",
      whyThisMatters:
        "It's not a clinical test. It just helps us match the tone and suggestions to how you think. Skip it without any cost.",
    },
    "transition-status": {
      prompt: "Are you changing direction, or going deeper where you are?",
    },
    "portrait-upload": {
      prompt: "Want to add a portrait?",
      helper: "Used for your career banner and identity card. Skip anytime.",
    },
    "generate-visual": {
      prompt: "Want us to generate a career banner for you?",
    },
    "visual-style": {
      prompt: "Which look fits how you want to be seen?",
    },
  },
  options: {
    // current-state-summary
    "capable-but-unseen": "I'm capable, but no one really sees it",
    "unclear-direction": "I'm good at things, but not sure where to point them",
    transitioning: "I'm in the middle of changing direction",
    "want-fame": "I want to be known in my field",
    "want-monetize": "I want to turn what I do into income",
    "build-brand": "I want to build a real personal brand",
    "building-but-not-ready": "I'm building something, but it's not ready to show",
    stuck: "I feel stuck and can't tell why",
    // current-identity
    performer: "Performer / artist",
    educator: "Educator / teacher",
    founder: "Founder",
    student: "Student",
    researcher: "Researcher",
    "product-builder": "Product builder",
    "content-creator": "Content creator",
    freelancer: "Freelancer",
    manager: "Manager / lead",
    // what-success-buys
    "more-income": "More income",
    visibility: "Visibility",
    "personal-brand": "A personal brand",
    "quality-collabs": "Better collaborators",
    "more-gigs": "More gigs / clients",
    "insider-recognition": "Recognition from people who matter",
    freedom: "Freedom over my time",
    "own-company": "My own company",
    "higher-platform": "A bigger platform",
    "prove-talent": "To prove what I'm capable of",
    // motivation-drivers
    recognition: "Recognition",
    "money-security": "Money & security",
    influence: "Influence",
    mastery: "Mastery",
    status: "Status",
    "create-work": "Making something of my own",
    "help-others": "Helping others",
    "beat-rivals": "Outdoing rivals",
    "build-own": "Building my own thing",
    "approval-by-important": "Approval from people I respect",
    "dont-waste-talent": "Not wasting my talent",
    // energy-pattern
    "deep-solo": "Deep solo focus",
    "spark-with-experts": "Sparking off sharp people",
    "on-stage": "Being on stage / in front of others",
    "deadline-sprint": "A real deadline to sprint toward",
    "strategy-systems": "Designing strategy & systems",
    teaching: "Teaching it to someone",
    "content-creation": "Creating content",
    "problem-solving": "Cracking a hard problem",
    "team-momentum": "Team momentum",
    // remembered-for
    performance: "Performance",
    aesthetics: "Taste & aesthetics",
    strategy: "Strategy",
    creativity: "Creativity",
    execution: "Getting things done",
    organization: "Organisation",
    technical: "Technical depth",
    communication: "Communication",
    leadership: "Leadership",
    writing: "Writing",
    content: "Content",
    "business-sense": "Business sense",
    network: "My network",
    // where-stuck
    "slow-start": "I'm slow to start",
    "overthink-no-publish": "I overthink and never publish",
    distraction: "I get distracted",
    "no-system": "I have no system",
    "fear-judgment": "I fear being judged",
    "bored-by-ordinary": "Ordinary work bores me",
    "lose-interest": "I lose interest halfway",
    "no-accountability": "No one's holding me accountable",
    "too-many-directions": "Too many directions at once",
    "cant-productize": "I can't turn it into a product",
    "no-visibility": "Nobody can see my work",
    "no-portfolio": "I have no portfolio to point to",
    "no-network": "I don't have the right network",
    // visibility-feeling
    "want-seen-not-thirsty": "I want to be seen, but not look thirsty",
    "enjoy-attention": "I genuinely enjoy attention",
    "fear-but-need": "It scares me, but I know I need it",
    "work-seen-not-me": "I want my work seen, not me",
    "authority-not-influencer": "An authority, not an influencer",
    "respected-in-circle": "Respected inside my circle is enough",
    "grow-audience-unsure": "I want an audience but don't know how",
    "dont-know-fit": "I don't know what fits me",
    // decision-basis
    intuition: "Gut instinct",
    "data-roi": "Data & ROI",
    "mentor-advice": "A mentor's advice",
    "peer-reaction": "How peers will react",
    "long-term-identity": "Who I want to become",
    "short-term-opportunity": "The opportunity in front of me",
    "market-demand": "What the market wants",
    procrastinate: "I put it off",
    // org-pet-peeve
    "unclear-responsibility": "Unclear responsibilities",
    "no-standards": "No standards",
    "too-many-meetings": "Too many meetings",
    "clueless-boss": "A clueless boss",
    "no-autonomy": "No autonomy",
    "no-feedback": "No real feedback",
    "weak-colleagues": "Coasting colleagues",
    politics: "Office politics",
    "meaningless-work": "Meaningless work",
    "no-growth": "No room to grow",
    // feedback-style
    direct: "Direct and blunt",
    "affirm-then-critique": "Affirm first, then critique",
    "concrete-examples": "With concrete examples",
    private: "In private",
    "high-standards": "Hold me to a high bar",
    "time-to-process": "Give me time to process",
    "logic-not-feelings": "Logic, not feelings",
    // ambition-style
    "top-of-field": "Top of my field",
    famous: "Genuinely famous",
    "freedom-choice": "Free to choose my work",
    "own-business": "Running my own business",
    "respected-by-elite": "Respected by the best in the game",
    "rich-not-tied": "Rich without being tied down",
    "leave-legacy": "Leaving a legacy",
    "higher-circle": "Moving in a higher circle",
    // mbti
    intj: "INTJ",
    intp: "INTP",
    entj: "ENTJ",
    entp: "ENTP",
    infj: "INFJ",
    infp: "INFP",
    enfj: "ENFJ",
    enfp: "ENFP",
    istj: "ISTJ",
    isfj: "ISFJ",
    estj: "ESTJ",
    esfj: "ESFJ",
    istp: "ISTP",
    isfp: "ISFP",
    estp: "ESTP",
    esfp: "ESFP",
    "not-sure": "Not sure",
    "no-mbti": "I don't have one",
    // transition-status
    "no-transition-just-stronger": "Not changing — just getting stronger",
    exploring: "Quietly exploring",
    "actively-transitioning": "Actively transitioning",
    "parallel-path": "Building a parallel path",
    "art-to-product": "From art to product",
    "performer-to-educator": "From performer to educator",
    "applying-degree": "Applying for a degree / program",
    // visual-style
    "editorial-portrait": "Editorial portrait",
    "illustrative-photo": "Illustrated photo",
    "cinematic-founder": "Cinematic founder",
    "minimal-knowledge": "Minimal & knowledgeable",
    "abstract-landscape": "Abstract landscape",
    "brand-poster": "Bold brand poster",
    // generate-visual binary
    yes: "Yes, generate one",
    no: "Not now",
  },
};

const zhTW: CareerSetupQuestionCopy = {
  sections: {
    "current-state": {
      title: "你現在的位置",
      subtitle: "先用幾個選擇，整理你現在真正卡在哪裡。",
    },
    direction: { title: "你在追求什麼" },
    motivation: { title: "真正推著你的是什麼" },
    energy: { title: "你的能量從哪裡來" },
    skills: { title: "你被記住的事" },
    blockers: { title: "卡住你的東西" },
    visibility: { title: "你想被如何看見" },
    "decision-style": { title: "你怎麼做決定" },
    "org-psychology": { title: "工作裡你最受不了的事" },
    feedback: { title: "回饋對你的作用方式" },
    ambition: { title: "你的企圖心長什麼樣" },
    personality: { title: "快速的人格參考（選填）" },
    transition: { title: "你正在轉換方向嗎？" },
    portrait: { title: "加一張人像（選填）" },
    visual: { title: "你的職涯橫幅" },
  },
  questions: {
    "current-state-summary": {
      prompt: "哪一句現在最像你？",
      helper: "選那個讓你有點刺痛的——通常那才是真的。",
    },
    "current-identity": {
      prompt: "你最近主要在做什麼？",
      helper: "選最接近的就好，都不像可以自己寫。",
    },
    "what-success-buys": {
      prompt: "你說想成功，但你真正想換來的是什麼？",
      helper: "符合的都可以選。",
    },
    "motivation-drivers": {
      prompt: "當你全心投入時，真正推著你的是什麼？",
      helper: "排出你的前三名。",
    },
    "energy-pattern": { prompt: "什麼時候你在工作裡最有活力？" },
    "remembered-for": {
      prompt: "別人通常因為什麼事情記得你？",
      helper: "選真實的，而不是你希望的那個。",
    },
    "where-stuck": {
      prompt: "你通常不是因為不會做而失敗，而是卡在哪裡？",
    },
    "visibility-feeling": { prompt: "對於被看見，你的感覺是？" },
    "decision-basis": { prompt: "遇到重要決定時，你真正依據的是什麼？" },
    "org-pet-peeve": {
      prompt: "什麼會讓一個工作環境讓你受不了？",
      helper: "符合的都可以選。",
    },
    "feedback-style": { prompt: "怎樣的回饋方式最適合你？" },
    "ambition-style": { prompt: "老實說，「成功了」對你來說長什麼樣？" },
    mbti: {
      prompt: "知道自己的十六型人格嗎？",
      helper: "完全選填——選或略過都行。",
      whyThisMatters:
        "這不是臨床測驗，只是幫我們把語氣和建議調得更貼近你思考的方式。略過也完全不影響。",
    },
    "transition-status": {
      prompt: "你正在轉換方向，還是在原地往更深處走？",
    },
    "portrait-upload": {
      prompt: "想加一張人像嗎？",
      helper: "會用在你的職涯橫幅與身分卡，隨時可以略過。",
    },
    "generate-visual": { prompt: "要我們幫你生成一張職涯橫幅嗎？" },
    "visual-style": { prompt: "哪一種風格符合你想被看見的樣子？" },
  },
  options: {
    // current-state-summary
    "capable-but-unseen": "我有實力，但沒什麼人看見",
    "unclear-direction": "我有不少本事，卻不確定該往哪裡用",
    transitioning: "我正在轉換方向的途中",
    "want-fame": "我想在我的領域被看見、被知道",
    "want-monetize": "我想把自己做的事變成收入",
    "build-brand": "我想建立真正的個人品牌",
    "building-but-not-ready": "我在做一件事，但還沒準備好拿出來",
    stuck: "我覺得卡住，又說不上來為什麼",
    // current-identity
    performer: "表演者／藝術工作者",
    educator: "教育者／老師",
    founder: "創辦人",
    student: "學生",
    researcher: "研究者",
    "product-builder": "產品開發者",
    "content-creator": "內容創作者",
    freelancer: "自由工作者",
    manager: "主管／帶人者",
    // what-success-buys
    "more-income": "更多收入",
    visibility: "被看見",
    "personal-brand": "個人品牌",
    "quality-collabs": "更好的合作對象",
    "more-gigs": "更多案子／客戶",
    "insider-recognition": "重要的人對我的肯定",
    freedom: "對時間的自由",
    "own-company": "自己的公司",
    "higher-platform": "更大的舞台",
    "prove-talent": "證明我做得到",
    // motivation-drivers
    recognition: "被認可",
    "money-security": "金錢與安全感",
    influence: "影響力",
    mastery: "把一件事練到精通",
    status: "地位",
    "create-work": "做出屬於自己的作品",
    "help-others": "幫助別人",
    "beat-rivals": "贏過對手",
    "build-own": "打造自己的東西",
    "approval-by-important": "我尊敬的人的認同",
    "dont-waste-talent": "不浪費自己的天分",
    // energy-pattern
    "deep-solo": "獨自深度專注",
    "spark-with-experts": "和厲害的人互相激盪",
    "on-stage": "站上舞台、面對人群",
    "deadline-sprint": "有個真實的死線可以衝刺",
    "strategy-systems": "設計策略與系統",
    teaching: "把它教給別人",
    "content-creation": "創作內容",
    "problem-solving": "攻克一個難題",
    "team-momentum": "團隊一起往前的氣勢",
    // remembered-for
    performance: "演出／表現",
    aesthetics: "品味與美感",
    strategy: "策略",
    creativity: "創意",
    execution: "把事情做完",
    organization: "組織能力",
    technical: "技術深度",
    communication: "溝通",
    leadership: "領導",
    writing: "文字",
    content: "內容",
    "business-sense": "商業敏感度",
    network: "我的人脈",
    // where-stuck
    "slow-start": "我很難開始",
    "overthink-no-publish": "我想太多，從來不發出去",
    distraction: "我容易分心",
    "no-system": "我沒有一套方法",
    "fear-judgment": "我害怕被評價",
    "bored-by-ordinary": "平凡的工作讓我覺得無聊",
    "lose-interest": "我做到一半就失去興趣",
    "no-accountability": "沒有人監督我",
    "too-many-directions": "同時想做太多方向",
    "cant-productize": "我沒辦法把它變成產品",
    "no-visibility": "沒有人看得到我的作品",
    "no-portfolio": "我沒有作品集可以拿出來",
    "no-network": "我沒有對的人脈",
    // visibility-feeling
    "want-seen-not-thirsty": "我想被看見，但不想顯得很渴望",
    "enjoy-attention": "我是真心享受被關注",
    "fear-but-need": "它讓我害怕，但我知道我需要",
    "work-seen-not-me": "我想讓作品被看見，而不是我",
    "authority-not-influencer": "我想當權威，不是網紅",
    "respected-in-circle": "在我的圈子裡被尊重就夠了",
    "grow-audience-unsure": "我想要受眾，但不知道怎麼做",
    "dont-know-fit": "我不知道什麼適合我",
    // decision-basis
    intuition: "直覺",
    "data-roi": "數據與投資報酬",
    "mentor-advice": "前輩的建議",
    "peer-reaction": "同儕會怎麼看",
    "long-term-identity": "我想成為的那個人",
    "short-term-opportunity": "眼前的機會",
    "market-demand": "市場要什麼",
    procrastinate: "我會一直拖",
    // org-pet-peeve
    "unclear-responsibility": "權責不清",
    "no-standards": "沒有標準",
    "too-many-meetings": "太多會議",
    "clueless-boss": "不懂狀況的主管",
    "no-autonomy": "沒有自主權",
    "no-feedback": "沒有真正的回饋",
    "weak-colleagues": "划水的同事",
    politics: "辦公室政治",
    "meaningless-work": "沒有意義的工作",
    "no-growth": "沒有成長空間",
    // feedback-style
    direct: "直接、不繞圈",
    "affirm-then-critique": "先肯定，再給建議",
    "concrete-examples": "要有具體例子",
    private: "私下說",
    "high-standards": "用高標準要求我",
    "time-to-process": "給我時間消化",
    "logic-not-feelings": "講邏輯，不要情緒",
    // ambition-style
    "top-of-field": "做到領域裡的頂尖",
    famous: "真正的有名氣",
    "freedom-choice": "能自由選擇要做什麼",
    "own-business": "經營自己的事業",
    "respected-by-elite": "被這行最強的人尊重",
    "rich-not-tied": "有錢又不被綁住",
    "leave-legacy": "留下一些東西",
    "higher-circle": "進入更高的圈子",
    // mbti
    intj: "INTJ",
    intp: "INTP",
    entj: "ENTJ",
    entp: "ENTP",
    infj: "INFJ",
    infp: "INFP",
    enfj: "ENFJ",
    enfp: "ENFP",
    istj: "ISTJ",
    isfj: "ISFJ",
    estj: "ESTJ",
    esfj: "ESFJ",
    istp: "ISTP",
    isfp: "ISFP",
    estp: "ESTP",
    esfp: "ESFP",
    "not-sure": "不確定",
    "no-mbti": "我沒有",
    // transition-status
    "no-transition-just-stronger": "沒有要轉——只是想變得更強",
    exploring: "悄悄探索中",
    "actively-transitioning": "正在積極轉換",
    "parallel-path": "在經營一條平行路線",
    "art-to-product": "從創作走向產品",
    "performer-to-educator": "從表演者走向教育者",
    "applying-degree": "正在申請學位／課程",
    // visual-style
    "editorial-portrait": "雜誌感人像",
    "illustrative-photo": "插畫風照片",
    "cinematic-founder": "電影感創辦人",
    "minimal-knowledge": "極簡知識感",
    "abstract-landscape": "抽象風景",
    "brand-poster": "強烈品牌海報",
    // generate-visual binary
    yes: "好，幫我生成一張",
    no: "先不要",
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<CareerSetupQuestionCopy>>> = {
  "zh-TW": zhTW,
};

const COPY_MAP = createLocaleCopyMap<CareerSetupQuestionCopy>(en, overrides);

export function getCareerSetupQuestionCopy(
  locale: AppLocale,
): CareerSetupQuestionCopy {
  return COPY_MAP[locale];
}
