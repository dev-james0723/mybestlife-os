import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile, VaultFile } from "@/types/ai-coach";

interface Heading {
  aboutMe: string;
  role: string;
  industry: string;
  experience: string;
  skills: string;
  goals: string;
  challenges: string;
  targets: string;
  years: string;
  attachments: string;
  attachmentsIntro: string;
  ready: string;
}

const L: Record<AppLocale, Heading> = {
  en: {
    aboutMe: "## About Me",
    role: "Current role",
    industry: "Industry",
    experience: "Experience",
    skills: "Top skills",
    goals: "Career goals",
    challenges: "Current challenges",
    targets: "Target roles",
    years: "years",
    attachments: "## Documents I'll paste separately",
    attachmentsIntro:
      "I'll paste the following in my next message(s). After you acknowledge, I'll share each one. Ready?",
    ready: "",
  },
  "zh-TW": {
    aboutMe: "## 關於我",
    role: "目前角色",
    industry: "產業",
    experience: "資歷",
    skills: "主要專長",
    goals: "職涯目標",
    challenges: "目前挑戰",
    targets: "目標職位",
    years: "年",
    attachments: "## 我稍後會分享的文件",
    attachmentsIntro:
      "下列文件我會在接下來的訊息分別貼給你。等你確認後再開始，可以嗎？",
    ready: "",
  },
  "zh-CN": {
    aboutMe: "## 关于我",
    role: "当前角色",
    industry: "行业",
    experience: "经验",
    skills: "核心技能",
    goals: "职业目标",
    challenges: "当前挑战",
    targets: "目标职位",
    years: "年",
    attachments: "## 我稍后会分享的文件",
    attachmentsIntro:
      "下列文件我会在接下来的消息分别贴给你。等你确认后再开始，可以吗？",
    ready: "",
  },
  ja: {
    aboutMe: "## 自己紹介",
    role: "現職",
    industry: "業界",
    experience: "経験",
    skills: "主要スキル",
    goals: "キャリア目標",
    challenges: "現在の課題",
    targets: "目標ポジション",
    years: "年",
    attachments: "## 別途貼り付ける資料",
    attachmentsIntro:
      "以下の資料をこの後のメッセージで順にお送りします。準備ができたらお知らせします。",
    ready: "",
  },
  ko: {
    aboutMe: "## 나에 대해",
    role: "현재 직무",
    industry: "업계",
    experience: "경력",
    skills: "주요 역량",
    goals: "커리어 목표",
    challenges: "현재 고민",
    targets: "목표 직무",
    years: "년",
    attachments: "## 추가로 공유할 문서",
    attachmentsIntro:
      "다음 문서는 이어지는 메시지에서 차례로 붙여 넣겠습니다. 준비되면 알려드릴게요.",
    ready: "",
  },
  fr: {
    aboutMe: "## À propos de moi",
    role: "Rôle actuel",
    industry: "Secteur",
    experience: "Expérience",
    skills: "Compétences clés",
    goals: "Objectifs de carrière",
    challenges: "Défis actuels",
    targets: "Rôles cibles",
    years: "ans",
    attachments: "## Documents à coller séparément",
    attachmentsIntro:
      "Je vais coller ci-après les documents suivants. Après ta confirmation, je les enverrai un par un. Prêt ?",
    ready: "",
  },
  it: {
    aboutMe: "## Su di me",
    role: "Ruolo attuale",
    industry: "Settore",
    experience: "Esperienza",
    skills: "Competenze principali",
    goals: "Obiettivi di carriera",
    challenges: "Sfide attuali",
    targets: "Ruoli obiettivo",
    years: "anni",
    attachments: "## Documenti che incollerò a parte",
    attachmentsIntro:
      "Incollerò i documenti seguenti nei prossimi messaggi. Dopo la tua conferma, li invierò uno alla volta. Pronto?",
    ready: "",
  },
  es: {
    aboutMe: "## Sobre mí",
    role: "Rol actual",
    industry: "Industria",
    experience: "Experiencia",
    skills: "Habilidades clave",
    goals: "Objetivos profesionales",
    challenges: "Desafíos actuales",
    targets: "Roles objetivo",
    years: "años",
    attachments: "## Documentos que pegaré por separado",
    attachmentsIntro:
      "Pegaré los siguientes documentos en los próximos mensajes. Tras tu confirmación, los enviaré uno a uno. ¿Listo?",
    ready: "",
  },
  vi: {
    aboutMe: "## Về tôi",
    role: "Vai trò hiện tại",
    industry: "Ngành",
    experience: "Kinh nghiệm",
    skills: "Kỹ năng chính",
    goals: "Mục tiêu nghề nghiệp",
    challenges: "Thách thức hiện tại",
    targets: "Vai trò mục tiêu",
    years: "năm",
    attachments: "## Tài liệu tôi sẽ dán riêng",
    attachmentsIntro:
      "Tôi sẽ dán các tài liệu sau trong các tin nhắn kế tiếp. Sau khi bạn xác nhận, tôi sẽ gửi từng cái. Sẵn sàng?",
    ready: "",
  },
};

const ATTACH_LABEL: Record<AppLocale, Record<string, string>> = {
  en: {
    resume: "resume",
    cover_letter: "cover letter",
    photo: "photo",
    bio: "bio",
    portfolio: "portfolio",
    credential: "credential",
    reference: "reference",
    application: "job application",
  },
  "zh-TW": {
    resume: "履歷",
    cover_letter: "求職信",
    photo: "照片",
    bio: "個人簡介",
    portfolio: "作品集",
    credential: "證照",
    reference: "推薦信",
    application: "應徵資料",
  },
  "zh-CN": {
    resume: "简历",
    cover_letter: "求职信",
    photo: "照片",
    bio: "个人简介",
    portfolio: "作品集",
    credential: "证书",
    reference: "推荐信",
    application: "求职资料",
  },
  ja: {
    resume: "履歴書",
    cover_letter: "カバーレター",
    photo: "写真",
    bio: "自己紹介",
    portfolio: "ポートフォリオ",
    credential: "資格",
    reference: "推薦状",
    application: "応募書類",
  },
  ko: {
    resume: "이력서",
    cover_letter: "자기소개서",
    photo: "사진",
    bio: "소개",
    portfolio: "포트폴리오",
    credential: "자격증",
    reference: "추천서",
    application: "지원 서류",
  },
  fr: {
    resume: "CV",
    cover_letter: "lettre de motivation",
    photo: "photo",
    bio: "bio",
    portfolio: "portfolio",
    credential: "diplôme",
    reference: "référence",
    application: "candidature",
  },
  it: {
    resume: "CV",
    cover_letter: "lettera di presentazione",
    photo: "foto",
    bio: "biografia",
    portfolio: "portfolio",
    credential: "certificazione",
    reference: "referenza",
    application: "candidatura",
  },
  es: {
    resume: "CV",
    cover_letter: "carta de presentación",
    photo: "foto",
    bio: "biografía",
    portfolio: "portafolio",
    credential: "credencial",
    reference: "referencia",
    application: "solicitud",
  },
  vi: {
    resume: "CV",
    cover_letter: "thư xin việc",
    photo: "ảnh",
    bio: "tiểu sử",
    portfolio: "portfolio",
    credential: "chứng chỉ",
    reference: "thư giới thiệu",
    application: "hồ sơ ứng tuyển",
  },
};

export function buildProfileContext(
  profile: CareerProfile | null,
  locale: AppLocale,
): string {
  if (!profile) return "";
  const l = L[locale] ?? L.en;

  const lines: string[] = [];
  if (profile.current_role) lines.push(`- ${l.role}: ${profile.current_role}`);
  if (profile.industry) lines.push(`- ${l.industry}: ${profile.industry}`);
  if (profile.years_experience != null) {
    lines.push(`- ${l.experience}: ${profile.years_experience} ${l.years}`);
  }
  if (profile.top_skills.length > 0) {
    lines.push(`- ${l.skills}: ${profile.top_skills.join(", ")}`);
  }
  if (profile.target_roles.length > 0) {
    lines.push(`- ${l.targets}: ${profile.target_roles.join(", ")}`);
  }
  if (profile.career_goals) lines.push(`- ${l.goals}: ${profile.career_goals}`);
  if (profile.pain_points) {
    lines.push(`- ${l.challenges}: ${profile.pain_points}`);
  }

  if (lines.length === 0) return "";
  return [l.aboutMe, ...lines].join("\n");
}

export function buildAttachmentContext(
  files: VaultFile[],
  locale: AppLocale,
): string {
  if (files.length === 0) return "";
  const l = L[locale] ?? L.en;
  const labels = ATTACH_LABEL[locale] ?? ATTACH_LABEL.en;

  const numbered = files.map((f, i) => {
    const label = labels[f.category] ?? f.category;
    const descr = f.description ? ` — ${f.description}` : "";
    return `${i + 1}. ${f.filename} (${label})${descr}`;
  });

  return [l.attachments, l.attachmentsIntro, "", ...numbered].join("\n");
}
