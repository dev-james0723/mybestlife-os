import type { AppLocale } from "@/lib/i18n/app-locale";
import type { PlannerAiQuestion } from "./planner-task-types";

/** Offline “meeting / chat / coffee” style clarifiers — one row per {@link AppLocale}. */
export const PLANNER_FALLBACK_MEET = {
  en: [
    {
      id: "q1",
      question: "What is the main purpose of this conversation?",
      options: [
        "Networking",
        "Casual catch-up",
        "Seeking advice",
        "Collaborative work",
      ],
    },
    {
      id: "q2",
      question: "How long do you expect it to take?",
      options: ["15–30 minutes", "30–60 minutes", "1–2 hours", "More than 2 hours"],
    },
    {
      id: "q3",
      question: "Where will it take place?",
      options: ["Coffee shop", "Office", "Home", "Video call"],
    },
    {
      id: "q4",
      question: "How do you know them?",
      options: ["Colleague", "Friend", "Mentor / senior", "New contact or client"],
    },
  ],
  "zh-TW": [
    {
      id: "q1",
      question: "這次會面的主要目的是什麼？",
      options: ["拓展人脈", "輕鬆閒聊", "請教建議", "協作討論"],
    },
    {
      id: "q2",
      question: "你打算聊多久？",
      options: ["15–30 分鐘", "30–60 分鐘", "1–2 小時", "2 小時以上"],
    },
    {
      id: "q3",
      question: "你們會在哪裡見面？",
      options: ["咖啡廳", "辦公室", "家裡", "線上會議"],
    },
    {
      id: "q4",
      question: "對方跟你是什麼關係？",
      options: ["同事", "朋友", "導師／前輩", "新客戶或弱連結"],
    },
  ],
  "zh-CN": [
    {
      id: "q1",
      question: "这次会面的主要目的是什么？",
      options: ["拓展人脉", "轻松闲聊", "请教建议", "协作讨论"],
    },
    {
      id: "q2",
      question: "你计划聊多久？",
      options: ["15–30 分钟", "30–60 分钟", "1–2 小时", "2 小时以上"],
    },
    {
      id: "q3",
      question: "你们会在哪里见面？",
      options: ["咖啡馆", "办公室", "家里", "线上会议"],
    },
    {
      id: "q4",
      question: "对方和你是什么关系？",
      options: ["同事", "朋友", "导师/前辈", "新客户或弱关系"],
    },
  ],
  ja: [
    {
      id: "q1",
      question: "この会話の主な目的は何ですか？",
      options: [
        "ネットワーキング",
        "カジュアルな雑談",
        "アドバイスをもらう",
        "仕事の相談・協働",
      ],
    },
    {
      id: "q2",
      question: "どれくらいの時間を想定していますか？",
      options: ["15〜30分", "30〜60分", "1〜2時間", "2時間以上"],
    },
    {
      id: "q3",
      question: "どこで行いますか？",
      options: ["カフェ", "オフィス", "自宅", "オンライン（ビデオ）"],
    },
    {
      id: "q4",
      question: "相手とはどんな関係ですか？",
      options: ["同僚", "友人", "メンター／先輩", "新しい知人・顧客"],
    },
  ],
  ko: [
    {
      id: "q1",
      question: "이 대화의 주된 목적은 무엇인가요?",
      options: ["네트워킹", "가벼운 대화", "조언 구하기", "협업 논의"],
    },
    {
      id: "q2",
      question: "예상 소요 시간은 얼마나 되나요?",
      options: ["15–30분", "30–60분", "1–2시간", "2시간 이상"],
    },
    {
      id: "q3",
      question: "어디에서 진행하나요?",
      options: ["카페", "사무실", "집", "화상 회의"],
    },
    {
      id: "q4",
      question: "상대방과의 관계는 무엇인가요?",
      options: ["동료", "친구", "멘토·선배", "새 연락처·고객"],
    },
  ],
  fr: [
    {
      id: "q1",
      question: "Quel est l’objectif principal de cette conversation ?",
      options: [
        "Networking / prospection",
        "Discussion informelle",
        "Demander des conseils",
        "Travail collaboratif",
      ],
    },
    {
      id: "q2",
      question: "Combien de temps cela devrait-il prendre ?",
      options: ["15–30 min", "30–60 min", "1–2 h", "Plus de 2 h"],
    },
    {
      id: "q3",
      question: "Où cela se déroulera-t-il ?",
      options: ["Café", "Bureau", "À domicile", "Visioconférence"],
    },
    {
      id: "q4",
      question: "Quelle est votre relation ?",
      options: ["Collègue", "Ami·e", "Mentor·aîné·e", "Nouveau contact ou client"],
    },
  ],
  it: [
    {
      id: "q1",
      question: "Qual è lo scopo principale di questo incontro?",
      options: [
        "Networking",
        "Chiacchierata informale",
        "Chiedere un consiglio",
        "Lavoro collaborativo",
      ],
    },
    {
      id: "q2",
      question: "Quanto tempo pensi che durerà?",
      options: ["15–30 min", "30–60 min", "1–2 ore", "Più di 2 ore"],
    },
    {
      id: "q3",
      question: "Dove si svolgerà?",
      options: ["Bar / caffè", "Ufficio", "Casa", "Videochiamata"],
    },
    {
      id: "q4",
      question: "Che rapporto avete?",
      options: ["Collega", "Amico/a", "Mentore / senior", "Nuovo contatto o cliente"],
    },
  ],
  es: [
    {
      id: "q1",
      question: "¿Cuál es el objetivo principal de esta conversación?",
      options: [
        "Networking",
        "Charla informal",
        "Pedir consejos",
        "Trabajo colaborativo",
      ],
    },
    {
      id: "q2",
      question: "¿Cuánto tiempo crees que llevará?",
      options: ["15–30 min", "30–60 min", "1–2 h", "Más de 2 h"],
    },
    {
      id: "q3",
      question: "¿Dónde tendrá lugar?",
      options: ["Cafetería", "Oficina", "Casa", "Videollamada"],
    },
    {
      id: "q4",
      question: "¿Qué relación tienes con esa persona?",
      options: ["Compañero/a", "Amigo/a", "Mentor/a", "Nuevo contacto o cliente"],
    },
  ],
  vi: [
    {
      id: "q1",
      question: "Mục đích chính của buổi trò chuyện này là gì?",
      options: [
        "Giao lưu / networking",
        "Trò chuyện thân mật",
        "Xin lời khuyên",
        "Thảo luận công việc",
      ],
    },
    {
      id: "q2",
      question: "Bạn dự kiến mất khoảng bao lâu?",
      options: ["15–30 phút", "30–60 phút", "1–2 giờ", "Hơn 2 giờ"],
    },
    {
      id: "q3",
      question: "Buổi gặp sẽ diễn ra ở đâu?",
      options: ["Quán cà phê", "Văn phòng", "Ở nhà", "Họp trực tuyến"],
    },
    {
      id: "q4",
      question: "Bạn và đối phương có mối quan hệ gì?",
      options: [
        "Đồng nghiệp",
        "Bạn bè",
        "Cố vấn / tiền bối",
        "Liên hệ hoặc khách hàng mới",
      ],
    },
  ],
} satisfies Record<AppLocale, PlannerAiQuestion[]>;

/** Offline generic clarifiers when the title is not “meeting-like”. */
export const PLANNER_FALLBACK_GENERIC = {
  en: [
    {
      id: "q1",
      question: "How urgent is this?",
      options: ["Today", "This week", "No rush"],
    },
    {
      id: "q2",
      question: "How much focused time will it need?",
      options: ["Quick (< 30 min)", "Medium (1–2 hrs)", "Deep work (half day+)"],
    },
    {
      id: "q3",
      question: "Does it depend on other people?",
      options: ["No", "Waiting on someone", "Collaborative"],
    },
  ],
  "zh-TW": [
    {
      id: "q1",
      question: "這件事有多急？",
      options: ["今天一定要做", "本週內", "不急"],
    },
    {
      id: "q2",
      question: "你預計要花多少力氣？",
      options: ["很快（約半小時內）", "中等（約 1–2 小時）", "深度工作（半天以上）"],
    },
    {
      id: "q3",
      question: "需要別人配合或等待嗎？",
      options: ["不需要", "在等待某人", "需要協作"],
    },
  ],
  "zh-CN": [
    {
      id: "q1",
      question: "这件事有多急？",
      options: ["今天必须做", "本周内", "不急"],
    },
    {
      id: "q2",
      question: "你预计要花多少精力？",
      options: ["很快（约半小时内）", "中等（约 1–2 小时）", "深度工作（半天以上）"],
    },
    {
      id: "q3",
      question: "需要别人配合或等待吗？",
      options: ["不需要", "在等待某人", "需要协作"],
    },
  ],
  ja: [
    {
      id: "q1",
      question: "どれくらい急ぎですか？",
      options: ["今日中", "今週中", "急がない"],
    },
    {
      id: "q2",
      question: "どれくらいの集中時間が必要ですか？",
      options: ["短い（30分未満）", "中程度（1〜2時間）", "深い作業（半日以上）"],
    },
    {
      id: "q3",
      question: "他者の対応待ちや協力は必要ですか？",
      options: ["ない", "誰かを待っている", "協働が必要"],
    },
  ],
  ko: [
    {
      id: "q1",
      question: "얼마나 급한 작업인가요?",
      options: ["오늘 안에", "이번 주 안에", "급하지 않음"],
    },
    {
      id: "q2",
      question: "집중해서 필요한 시간은 어느 정도인가요?",
      options: ["짧게(30분 미만)", "보통(1–2시간)", "깊은 작업(반나절 이상)"],
    },
    {
      id: "q3",
      question: "다른 사람에게 의존하나요?",
      options: ["없음", "누군가를 기다림", "협업 필요"],
    },
  ],
  fr: [
    {
      id: "q1",
      question: "Quelle est l’urgence ?",
      options: ["Aujourd’hui", "Cette semaine", "Pas pressé"],
    },
    {
      id: "q2",
      question: "De combien de temps concentré avez-vous besoin ?",
      options: ["Court (< 30 min)", "Moyen (1–2 h)", "Travail profond (demi-journée+)"],
    },
    {
      id: "q3",
      question: "Cela dépend-il d’autres personnes ?",
      options: ["Non", "J’attends quelqu’un", "Collaboratif"],
    },
  ],
  it: [
    {
      id: "q1",
      question: "Quanto è urgente?",
      options: ["Oggi", "Questa settimana", "Non urgente"],
    },
    {
      id: "q2",
      question: "Quanto tempo concentrato ti serve?",
      options: ["Breve (< 30 min)", "Medio (1–2 ore)", "Lavoro profondo (mezza giornata+)"],
    },
    {
      id: "q3",
      question: "Dipende da altre persone?",
      options: ["No", "In attesa di qualcuno", "Collaborativo"],
    },
  ],
  es: [
    {
      id: "q1",
      question: "¿Qué tan urgente es?",
      options: ["Hoy", "Esta semana", "Sin prisa"],
    },
    {
      id: "q2",
      question: "¿Cuánto tiempo concentrado necesita?",
      options: ["Rápido (< 30 min)", "Medio (1–2 h)", "Trabajo profundo (medio día+)"],
    },
    {
      id: "q3",
      question: "¿Depende de otras personas?",
      options: ["No", "Esperando a alguien", "Colaborativo"],
    },
  ],
  vi: [
    {
      id: "q1",
      question: "Mức độ khẩn cấp thế nào?",
      options: ["Hôm nay", "Trong tuần này", "Không gấp"],
    },
    {
      id: "q2",
      question: "Bạn cần khoảng thời gian tập trung bao lâu?",
      options: ["Nhanh (< 30 phút)", "Vừa (1–2 giờ)", "Làm sâu (nửa ngày+)"],
    },
    {
      id: "q3",
      question: "Có phụ thuộc người khác không?",
      options: ["Không", "Đang chờ ai đó", "Cần hợp tác"],
    },
  ],
} satisfies Record<AppLocale, PlannerAiQuestion[]>;
