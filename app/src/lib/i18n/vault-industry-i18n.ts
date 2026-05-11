import type { AppLocale } from "@/lib/i18n/app-locale";
import type { VaultStackIndustrySlug } from "@/lib/vault/software-library-schema";
import { VAULT_STACK_INDUSTRY_SLUGS } from "@/lib/vault/software-library-schema";

/** English labels aligned with `VAULT_INDUSTRY_CATALOG` titles. */
const EN: Record<VaultStackIndustrySlug, string> = {
  finance_accounting: "Finance & Accounting",
  legal: "Legal",
  education: "Education",
  creator_content: "Creator / Content",
  startup_sme: "Startup / SME",
  operations_bizops: "Operations / BizOps",
  marketing_growth: "Marketing / Growth",
  sales_bd: "Sales / Business Development",
  customer_support_cx: "Customer Support / CX",
  hr_recruiting: "HR / Recruiting",
  product_project_management: "Product / Project Management",
  software_dev_it: "Software Development / IT",
  ecommerce_retail: "Ecommerce / Retail",
  real_estate: "Real Estate",
  healthcare_clinics: "Healthcare / Clinics",
  consulting_professional_services: "Consulting / Professional Services",
  music: "Music",
  art_design: "Art / Design",
};

const ZH_TW: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "金融與會計",
  legal: "法律",
  education: "教育",
  creator_content: "創作／內容",
  startup_sme: "初創／中小企",
  operations_bizops: "營運／商業營運",
  marketing_growth: "市場／增長",
  sales_bd: "銷售／業務拓展",
  customer_support_cx: "客戶支援／體驗",
  hr_recruiting: "人力資源／招聘",
  product_project_management: "產品／專案管理",
  software_dev_it: "軟件開發／資訊科技",
  ecommerce_retail: "電商／零售",
  real_estate: "地產",
  healthcare_clinics: "醫療／診所",
  consulting_professional_services: "諮詢／專業服務",
  music: "音樂",
  art_design: "藝術／設計",
};

const ZH_CN: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "金融与会计",
  legal: "法律",
  education: "教育",
  creator_content: "创作 / 内容",
  startup_sme: "创业 / 中小企业",
  operations_bizops: "运营 / 商业运营",
  marketing_growth: "市场 / 增长",
  sales_bd: "销售 / 业务拓展",
  customer_support_cx: "客户支持 / 体验",
  hr_recruiting: "人力资源 / 招聘",
  product_project_management: "产品 / 项目管理",
  software_dev_it: "软件开发 / IT",
  ecommerce_retail: "电商 / 零售",
  real_estate: "房地产",
  healthcare_clinics: "医疗 / 诊所",
  consulting_professional_services: "咨询 / 专业服务",
  music: "音乐",
  art_design: "艺术 / 设计",
};

const JA: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "金融・会計",
  legal: "法務",
  education: "教育",
  creator_content: "クリエイター／コンテンツ",
  startup_sme: "スタートアップ／中小企業",
  operations_bizops: "オペレーション／BizOps",
  marketing_growth: "マーケティング／グロース",
  sales_bd: "セールス／事業開発",
  customer_support_cx: "カスタマーサポート／CX",
  hr_recruiting: "人事／採用",
  product_project_management: "プロダクト／プロジェクト管理",
  software_dev_it: "ソフトウェア開発／IT",
  ecommerce_retail: "EC／小売",
  real_estate: "不動産",
  healthcare_clinics: "ヘルスケア／クリニック",
  consulting_professional_services: "コンサルティング／専門サービス",
  music: "音楽",
  art_design: "アート／デザイン",
};

const KO: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "금융·회계",
  legal: "법무",
  education: "교육",
  creator_content: "크리에이터 / 콘텐츠",
  startup_sme: "스타트업 / 중소기업",
  operations_bizops: "운영 / BizOps",
  marketing_growth: "마케팅 / 그로스",
  sales_bd: "세일즈 / 사업 개발",
  customer_support_cx: "고객 지원 / CX",
  hr_recruiting: "인사 / 채용",
  product_project_management: "프로덕트 / 프로젝트 관리",
  software_dev_it: "소프트웨어 개발 / IT",
  ecommerce_retail: "이커머스 / 리테일",
  real_estate: "부동산",
  healthcare_clinics: "헬스케어 / 클리닉",
  consulting_professional_services: "컨설팅 / 전문 서비스",
  music: "음악",
  art_design: "아트 / 디자인",
};

const FR: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "Finance et comptabilité",
  operations_bizops: "Opérations / BizOps",
  marketing_growth: "Marketing / croissance",
  sales_bd: "Ventes / développement commercial",
  customer_support_cx: "Support client / CX",
  hr_recruiting: "RH / recrutement",
  product_project_management: "Produit / gestion de projet",
  software_dev_it: "Développement logiciel / IT",
  ecommerce_retail: "E-commerce / retail",
  real_estate: "Immobilier",
  healthcare_clinics: "Santé / cliniques",
  consulting_professional_services: "Conseil / services professionnels",
  music: "Musique",
  art_design: "Art / design",
};

const IT: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "Finanza e contabilità",
  operations_bizops: "Operations / BizOps",
  marketing_growth: "Marketing / growth",
  sales_bd: "Vendite / business development",
  customer_support_cx: "Customer support / CX",
  hr_recruiting: "HR / recruiting",
  product_project_management: "Prodotto / project management",
  software_dev_it: "Sviluppo software / IT",
  ecommerce_retail: "E-commerce / retail",
  real_estate: "Immobiliare",
  healthcare_clinics: "Sanità / cliniche",
  consulting_professional_services: "Consulenza / servizi professionali",
  music: "Musica",
  art_design: "Arte / design",
};

const ES: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "Finanzas y contabilidad",
  operations_bizops: "Operaciones / BizOps",
  marketing_growth: "Marketing / crecimiento",
  sales_bd: "Ventas / desarrollo de negocio",
  customer_support_cx: "Soporte al cliente / CX",
  hr_recruiting: "RR. HH. / reclutamiento",
  product_project_management: "Producto / gestión de proyectos",
  software_dev_it: "Desarrollo de software / TI",
  ecommerce_retail: "Ecommerce / retail",
  real_estate: "Bienes raíces",
  healthcare_clinics: "Salud / clínicas",
  consulting_professional_services: "Consultoría / servicios profesionales",
  music: "Música",
  art_design: "Arte / diseño",
};

const VI: Partial<Record<VaultStackIndustrySlug, string>> = {
  finance_accounting: "Tài chính & kế toán",
  operations_bizops: "Vận hành / BizOps",
  marketing_growth: "Marketing / tăng trưởng",
  sales_bd: "Bán hàng / phát triển kinh doanh",
  customer_support_cx: "Hỗ trợ khách hàng / CX",
  hr_recruiting: "Nhân sự / tuyển dụng",
  product_project_management: "Sản phẩm / quản lý dự án",
  software_dev_it: "Phát triển phần mềm / IT",
  ecommerce_retail: "Thương mại điện tử / bán lẻ",
  real_estate: "Bất động sản",
  healthcare_clinics: "Y tế / phòng khám",
  consulting_professional_services: "Tư vấn / dịch vụ chuyên nghiệp",
  music: "Âm nhạc",
  art_design: "Nghệ thuật / thiết kế",
};

const BY_LOCALE: Record<AppLocale, Partial<Record<VaultStackIndustrySlug, string>>> = {
  en: {},
  "zh-TW": ZH_TW,
  "zh-CN": ZH_CN,
  ja: JA,
  ko: KO,
  fr: FR,
  it: IT,
  es: ES,
  vi: VI,
};

function mergeLabels(locale: AppLocale): Record<VaultStackIndustrySlug, string> {
  const patch = BY_LOCALE[locale] ?? {};
  const out = {} as Record<VaultStackIndustrySlug, string>;
  for (const id of VAULT_STACK_INDUSTRY_SLUGS) {
    out[id] = patch[id] ?? EN[id];
  }
  return out;
}

/** Full `Record<VaultStackIndustrySlug, string>` for vault Recommended / Build UIs. */
export function getVaultIndustryLabels(locale: AppLocale): Record<VaultStackIndustrySlug, string> {
  return mergeLabels(locale);
}
