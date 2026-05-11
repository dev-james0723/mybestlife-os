import type { AppLocale } from "./app-locale";
import type {
  VaultBudgetSensitivity,
  VaultEcosystemPreference,
  VaultPrivacySensitivity,
  VaultTechnicalComfort,
} from "@/lib/vault/software-library-schema";

export type VaultBuildStackCopy = {
  formAria: string;
  title: string;
  subtitle: string;
  industry: string;
  role: string;
  goals: string;
  painPoints: string;
  budget: string;
  teamSize: string;
  privacy: string;
  ecosystem: string;
  technical: string;
  phRole: string;
  phGoals: string;
  phPain: string;
  phTeam: string;
  generate: string;
  generating: string;
  /** Shown when required text fields are empty — submit stays disabled. */
  submitRequiresFields: string;
  retry: string;
  clearResult: string;
  errGeneric: string;
  errRateLimited: string;
  errUnauthorized: string;
  errMissingKey: string;
  errBadRequest: string;
  errModel: string;
  errEmpty: string;
  resultHeading: string;
  estMonthly: (usd: number | null) => string;
  coreTools: string;
  optionalTools: string;
  rationale: string;
  warnings: string;
  setupOrder: string;
  notes: string;
  addEntire: string;
  addSelected: (n: number) => string;
  selectAll: string;
  selectNone: string;
  visit: string;
  budgetLabels: Record<VaultBudgetSensitivity, string>;
  privacyLabels: Record<VaultPrivacySensitivity, string>;
  ecosystemLabels: Record<VaultEcosystemPreference, string>;
  technicalLabels: Record<VaultTechnicalComfort, string>;
};

const BUDGET_EN: VaultBuildStackCopy["budgetLabels"] = {
  low: "Frugal — minimize spend",
  medium: "Balanced",
  high: "Premium OK when justified",
  unsure: "Not sure yet",
};

const PRIVACY_EN: VaultBuildStackCopy["privacyLabels"] = {
  standard: "Standard",
  elevated: "Elevated caution",
  strict_compliance: "Strict / regulated",
  unsure: "Not sure yet",
};

const ECO_EN: VaultBuildStackCopy["ecosystemLabels"] = {
  google_workspace: "Google Workspace",
  microsoft_365: "Microsoft 365",
  apple: "Apple ecosystem",
  mixed: "Mixed vendors",
  no_preference: "No preference",
};

const TECH_EN: VaultBuildStackCopy["technicalLabels"] = {
  low: "Low — prefer simple UIs",
  medium: "Medium",
  high: "High — dev-friendly OK",
  mixed_team: "Mixed skill levels on team",
};

const en: VaultBuildStackCopy = {
  formAria: "Build a personalized software stack",
  title: "Build My Stack",
  subtitle:
    "Describe your context. We use Gemini to propose a structured stack — then you choose what lands in My Vault.",
  industry: "Industry",
  role: "Role or function",
  goals: "Goals",
  painPoints: "Pain points",
  budget: "Budget sensitivity",
  teamSize: "Team size",
  privacy: "Privacy / compliance sensitivity",
  ecosystem: "Ecosystem preference",
  technical: "Technical comfort",
  phRole: "e.g. FP&A manager, solo creator, IT lead",
  phGoals: "What outcomes do you need in the next quarter?",
  phPain: "Where does your current tooling break down?",
  phTeam: "e.g. Solo, 2–10, 50+",
  generate: "Generate stack",
  generating: "Generating…",
  submitRequiresFields: "Add your role, goals, pain points, and team size to generate.",
  retry: "Try again",
  clearResult: "Dismiss result",
  errGeneric: "Something went wrong. Your inputs are preserved — try again.",
  errRateLimited: "Hourly AI limit reached. Try again later.",
  errUnauthorized: "You need to be signed in.",
  errMissingKey: "AI is not configured on the server.",
  errBadRequest: "Check required fields and try again.",
  errModel: "The model returned an unusable answer. Try adjusting your inputs.",
  errEmpty: "No stack was produced. Try again with a bit more detail.",
  resultHeading: "Recommended stack",
  estMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Estimated cost: TBD" : `Estimated ~$${Math.round(usd)}/mo`,
  coreTools: "Core tools",
  optionalTools: "Optional add-ons",
  rationale: "Rationale",
  warnings: "Overlap / risk notes",
  setupOrder: "Suggested setup order",
  notes: "Caveats",
  addEntire: "Add all to My Vault",
  addSelected: (n) => (n <= 0 ? "Add selected to My Vault" : `Add selected (${n})`),
  selectAll: "Select all",
  selectNone: "Clear selection",
  visit: "Visit site",
  budgetLabels: BUDGET_EN,
  privacyLabels: PRIVACY_EN,
  ecosystemLabels: ECO_EN,
  technicalLabels: TECH_EN,
};

const zhTW: VaultBuildStackCopy = {
  ...en,
  formAria: "組裝個人化軟體組合",
  title: "組裝我的套裝",
  subtitle:
    "描述你嘅處境。我哋用 Gemini 提出結構化組合，你再揀邊啲要放入「我的庫藏」。",
  industry: "行業",
  role: "職能／角色",
  goals: "目標",
  painPoints: "痛點",
  budget: "預算敏感度",
  teamSize: "團隊規模",
  privacy: "私隱／合規敏感度",
  ecosystem: "生態偏好",
  technical: "技術接受度",
  phRole: "例如：FP&A 主管、獨立創作者、IT 主管",
  phGoals: "未來一季最想達成咩？",
  phPain: "而家嘅工具邊度頂唔順？",
  phTeam: "例如：單人、2–10、50+",
  generate: "產生組合",
  generating: "產生緊…",
  submitRequiresFields: "請填寫角色、目標、痛點同團隊規模先可以產生。",
  retry: "再試",
  clearResult: "收埋結果",
  errGeneric: "出咗問題，你嘅輸入會保留，可以再試。",
  errRateLimited: "達到每小時 AI 上限，請稍後再試。",
  errUnauthorized: "請先登入。",
  errMissingKey: "伺服器未設定 AI。",
  errBadRequest: "請檢查必填欄位。",
  errModel: "模型回覆唔合用，試下改詳啲輸入。",
  errEmpty: "未有組合，試下寫多啲細節。",
  resultHeading: "推薦組合",
  estMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "預算：未定" : `約 US$${Math.round(usd)}/月`,
  coreTools: "核心工具",
  optionalTools: "可選加配",
  rationale: "點解咁配",
  warnings: "重疊／風險提示",
  setupOrder: "建議開喺邊步",
  notes: "注意事項",
  addEntire: "全部加入我的庫藏",
  addSelected: (n) => (n <= 0 ? "加入已選到庫藏" : `加入已選（${n}）`),
  selectAll: "全選",
  selectNone: "清空",
  visit: "開官方網站",
  budgetLabels: {
    low: "慳錢為主",
    medium: "平衡",
    high: "值得就可以用貴啲",
    unsure: "未定",
  },
  privacyLabels: {
    standard: "一般",
    elevated: "較高要求",
    strict_compliance: "嚴格／受監管",
    unsure: "未定",
  },
  ecosystemLabels: {
    google_workspace: "Google Workspace",
    microsoft_365: "Microsoft 365",
    apple: "Apple 生態",
    mixed: "混合廠商",
    no_preference: "無特別偏好",
  },
  technicalLabels: {
    low: "低 — 偏好簡單介面",
    medium: "中等",
    high: "高 — 可用開發者向工具",
    mixed_team: "團隊技術水平不一",
  },
};

const zhCN: VaultBuildStackCopy = {
  ...en,
  formAria: "组建个性化软件组合",
  title: "组建我的套装",
  subtitle: "描述你的场景。Gemini 会给出结构化组合，你再选择加入「我的库」。",
  industry: "行业",
  role: "职能 / 角色",
  goals: "目标",
  painPoints: "痛点",
  budget: "预算敏感度",
  teamSize: "团队规模",
  privacy: "隐私 / 合规敏感度",
  ecosystem: "生态偏好",
  technical: "技术接受度",
  phRole: "例如：FP&A 负责人、独立创作者、IT 负责人",
  phGoals: "下个季度最想达成什么？",
  phPain: "当前工具链哪里不顺？",
  phTeam: "例如：个人、2–10、50+",
  generate: "生成组合",
  generating: "生成中…",
  submitRequiresFields: "请填写角色、目标、痛点和团队规模后再生成。",
  retry: "重试",
  clearResult: "关闭结果",
  errGeneric: "出现问题，已保留你的输入，可重试。",
  errRateLimited: "已达到每小时 AI 上限，请稍后再试。",
  errUnauthorized: "请先登录。",
  errMissingKey: "服务器未配置 AI。",
  errBadRequest: "请检查必填项。",
  errModel: "模型返回不可用，请调整描述后重试。",
  errEmpty: "未生成组合，请补充更多细节。",
  resultHeading: "推荐组合",
  estMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "费用待定" : `约 $${Math.round(usd)}/月`,
  coreTools: "核心工具",
  optionalTools: "可选扩展",
  rationale: "推荐理由",
  warnings: "重叠 / 风险提示",
  setupOrder: "建议落地顺序",
  notes: "注意事项",
  addEntire: "全部加入我的库",
  addSelected: (n) => (n <= 0 ? "将所选加入库" : `将所选加入库（${n}）`),
  selectAll: "全选",
  selectNone: "清空",
  visit: "访问官网",
  budgetLabels: {
    low: "尽量省钱",
    medium: "平衡",
    high: "合理即可接受高价",
    unsure: "未定",
  },
  privacyLabels: {
    standard: "常规",
    elevated: "更谨慎",
    strict_compliance: "严格 / 受监管",
    unsure: "未定",
  },
  ecosystemLabels: ECO_EN,
  technicalLabels: {
    low: "低 — 偏好简单界面",
    medium: "中等",
    high: "高 — 可用偏开发者工具",
    mixed_team: "团队技能参差",
  },
};

const ja: VaultBuildStackCopy = {
  ...en,
  title: "スタックを組む",
  subtitle:
    "状況を入力すると Gemini が構造化されたスタック案を返します。Vault に入れるものを選べます。",
  industry: "業界",
  role: "役割",
  goals: "目標",
  painPoints: "課題",
  budget: "予算感度",
  teamSize: "チーム規模",
  privacy: "プライバシー / コンプライアンス",
  ecosystem: "エコシステム",
  technical: "技術レベル",
  generate: "スタックを生成",
  generating: "生成中…",
  submitRequiresFields: "役割・目標・課題・チーム規模を入力してください。",
  retry: "再試行",
  clearResult: "結果を閉じる",
  errRateLimited: "時間あたりの AI 上限に達しました。",
  errUnauthorized: "ログインが必要です。",
  errMissingKey: "サーバーに AI が設定されていません。",
  resultHeading: "推奨スタック",
  coreTools: "コアツール",
  optionalTools: "オプション",
  rationale: "根拠",
  warnings: "重複 / リスク",
  setupOrder: "導入の順番",
  notes: "注意点",
  addEntire: "すべて金庫に追加",
  addSelected: (n) => (n <= 0 ? "選択を追加" : `選択を追加（${n}）`),
  budgetLabels: {
    low: "コスト重視",
    medium: "バランス",
    high: "価値があれば高めも可",
    unsure: "未定",
  },
  privacyLabels: {
    standard: "標準",
    elevated: "高め",
    strict_compliance: "厳格 / 規制領域",
    unsure: "未定",
  },
  ecosystemLabels: ECO_EN,
  technicalLabels: TECH_EN,
};

const ko: VaultBuildStackCopy = {
  ...en,
  title: "스택 만들기",
  subtitle: "상황을 입력하면 Gemini가 구조화된 스택을 제안합니다. 금고에 넣을 항목을 고르세요.",
  industry: "업종",
  role: "역할",
  goals: "목표",
  painPoints: "문제점",
  budget: "예산 민감도",
  teamSize: "팀 규모",
  privacy: "프라이버시 / 규정",
  ecosystem: "생태계 선호",
  technical: "기술 수준",
  generate: "스택 생성",
  generating: "생성 중…",
  submitRequiresFields: "역할·목표·문제점·팀 규모를 입력한 뒤 생성하세요.",
  retry: "다시 시도",
  clearResult: "결과 닫기",
  errRateLimited: "시간당 AI 한도에 도달했습니다.",
  errUnauthorized: "로그인이 필요합니다.",
  errMissingKey: "서버에 AI가 설정되지 않았습니다.",
  resultHeading: "추천 스택",
  coreTools: "핵심 도구",
  optionalTools: "선택 도구",
  rationale: "근거",
  warnings: "중복 / 리스크",
  setupOrder: "도입 순서",
  notes: "주의",
  addEntire: "모두 금고에 추가",
  addSelected: (n) => (n <= 0 ? "선택 추가" : `선택 추가 (${n})`),
  budgetLabels: {
    low: "비용 절감",
    medium: "균형",
    high: "가치 있으면 프리미엄 허용",
    unsure: "미정",
  },
  privacyLabels: {
    standard: "표준",
    elevated: "높은 주의",
    strict_compliance: "엄격 / 규제",
    unsure: "미정",
  },
  ecosystemLabels: ECO_EN,
  technicalLabels: TECH_EN,
};

export const VAULT_BUILD_STACK_COPY: Record<AppLocale, VaultBuildStackCopy> = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr: en,
  it: en,
  es: en,
  vi: en,
};

export function getVaultBuildStackCopy(locale: AppLocale): VaultBuildStackCopy {
  return VAULT_BUILD_STACK_COPY[locale] ?? en;
}
