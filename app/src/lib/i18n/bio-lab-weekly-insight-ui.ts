/**
 * Localized copy for the Garden hub weekly insight card.
 *
 * Lives in its own module (not bio-lab-history-ui.ts) because the weekly
 * card has a different lifecycle: it's Sunday-only, opt-in, and includes
 * AI-specific affordances (refresh, "AI cached") that the rest of the
 * history surfaces deliberately do without.
 *
 * Plurals are encoded via lambdas so each locale can choose its own rule
 * (English uses ===1; Vietnamese never inflects; etc.).
 */

import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type BioLabWeeklyInsightCopy = {
  /** Section eyebrow above the headline. */
  eyebrow: string;
  /** Title shown when the card is in the "ready to fetch" idle state. */
  idleTitle: string;
  /** Body shown beside the idle CTA. */
  idleBody: string;
  /** CTA label that triggers a fresh fetch. */
  reflectCta: string;
  /** Loading state label while the LLM call is in flight. */
  loading: string;
  /** Error state title (auth/network/server problems). */
  errorTitle: string;
  /** Error state body. */
  errorBody: string;
  /** "Try again" button shown after an error. */
  retryCta: string;
  /** Headline for the "no activity this week" empty result. */
  emptyTitle: string;
  /** Body for the empty result. */
  emptyBody: string;
  /** Label above the AI observations list. */
  observationsLabel: string;
  /** Label above the optional next-step paragraph. */
  nextStepLabel: string;
  /** Generated/cached pill — formats the date. */
  generatedAt: (date: string) => string;
  /** Pill shown when the response came from cache (free, no LLM hit). */
  cachedBadge: string;
  /** "Refresh" icon-button aria-label. */
  refreshAriaLabel: string;
};

const en: BioLabWeeklyInsightCopy = {
  eyebrow: "Weekly insight",
  idleTitle: "Reflect on this week",
  idleBody:
    "On Sundays you can roll up the past 7 days into a short, observational summary. It's free to start and only runs when you ask.",
  reflectCta: "Reflect on this week",
  loading: "Looking back across the week…",
  errorTitle: "Could not generate this week's reflection",
  errorBody:
    "Something went wrong fetching the summary. The data is safe; please try again in a moment.",
  retryCta: "Try again",
  emptyTitle: "Nothing to reflect on yet",
  emptyBody:
    "Bio Lab tools were not used in the last 7 days. Open one to get started — the weekly summary will pick it up next Sunday.",
  observationsLabel: "What stood out",
  nextStepLabel: "Next week",
  generatedAt: (date) => `Generated ${date}`,
  cachedBadge: "Cached",
  refreshAriaLabel: "Regenerate this week's reflection",
};

const copyByLocale = createLocaleCopyMap<BioLabWeeklyInsightCopy>(en, {
  "zh-TW": {
    eyebrow: "本週回顧",
    idleTitle: "回顧這一週",
    idleBody:
      "週日可以把過去 7 天彙整成一段簡短的觀察。免費啟動，只在你按下時才執行。",
    reflectCta: "回顧這一週",
    loading: "正在回顧整週紀錄…",
    errorTitle: "無法產生本週回顧",
    errorBody: "讀取摘要時發生問題。資料仍在,請稍後再試一次。",
    retryCta: "再試一次",
    emptyTitle: "目前沒有可回顧的內容",
    emptyBody:
      "過去 7 天還沒有使用 Bio Lab 工具。任意開啟一個工具,下週日就能看到回顧。",
    observationsLabel: "值得注意的是",
    nextStepLabel: "下週",
    generatedAt: (date) => `產生於 ${date}`,
    cachedBadge: "已快取",
    refreshAriaLabel: "重新產生本週回顧",
  },
  "zh-CN": {
    eyebrow: "本周回顾",
    idleTitle: "回顾这一周",
    idleBody:
      "周日可以把过去 7 天汇总成一段简短的观察。免费启动,只在你点击时才执行。",
    reflectCta: "回顾这一周",
    loading: "正在回顾整周记录…",
    errorTitle: "无法生成本周回顾",
    errorBody: "读取摘要时出错。数据仍在,请稍后再试。",
    retryCta: "再试一次",
    emptyTitle: "暂无可回顾的内容",
    emptyBody:
      "过去 7 天没有使用 Bio Lab 工具。打开任意一个工具,下周日就能看到回顾。",
    observationsLabel: "值得注意的是",
    nextStepLabel: "下周",
    generatedAt: (date) => `生成于 ${date}`,
    cachedBadge: "已缓存",
    refreshAriaLabel: "重新生成本周回顾",
  },
  ja: {
    eyebrow: "週次インサイト",
    idleTitle: "今週を振り返る",
    idleBody:
      "日曜日には過去 7 日間を短い観察文にまとめられます。実行は手動・無料で開始できます。",
    reflectCta: "今週を振り返る",
    loading: "1 週間を振り返っています…",
    errorTitle: "今週の振り返りを生成できませんでした",
    errorBody: "要約の取得中に問題が発生しました。データは安全です。少し時間をおいてもう一度お試しください。",
    retryCta: "もう一度試す",
    emptyTitle: "振り返るものはまだありません",
    emptyBody:
      "過去 7 日間に Bio Lab ツールは使われていません。どれかを開いて始めましょう。次の日曜日にまとめが出ます。",
    observationsLabel: "気づいたこと",
    nextStepLabel: "来週",
    generatedAt: (date) => `${date} に生成`,
    cachedBadge: "キャッシュ済み",
    refreshAriaLabel: "今週の振り返りを再生成する",
  },
  ko: {
    eyebrow: "주간 인사이트",
    idleTitle: "이번 주 돌아보기",
    idleBody:
      "일요일에는 지난 7일을 짧은 관찰로 정리할 수 있습니다. 직접 시작하기 전까지 실행되지 않으며 무료입니다.",
    reflectCta: "이번 주 돌아보기",
    loading: "한 주를 살펴보는 중…",
    errorTitle: "이번 주 회고를 생성할 수 없습니다",
    errorBody: "요약을 가져오는 중 오류가 발생했습니다. 데이터는 안전하니 잠시 후 다시 시도해 주세요.",
    retryCta: "다시 시도",
    emptyTitle: "아직 돌아볼 내용이 없습니다",
    emptyBody:
      "지난 7일 동안 Bio Lab 도구를 사용한 기록이 없습니다. 도구를 열어 시작해 보세요. 다음 일요일에 요약이 나옵니다.",
    observationsLabel: "눈에 띄는 점",
    nextStepLabel: "다음 주",
    generatedAt: (date) => `${date}에 생성됨`,
    cachedBadge: "캐시됨",
    refreshAriaLabel: "이번 주 회고를 다시 생성",
  },
  fr: {
    eyebrow: "Bilan de la semaine",
    idleTitle: "Faire le point sur la semaine",
    idleBody:
      "Le dimanche, vous pouvez condenser les 7 derniers jours en un résumé observationnel court. Lancement manuel et gratuit.",
    reflectCta: "Faire le point",
    loading: "Lecture rétrospective de la semaine…",
    errorTitle: "Impossible de générer le bilan de la semaine",
    errorBody:
      "Une erreur est survenue lors de la récupération du résumé. Vos données sont en sécurité ; réessayez dans un instant.",
    retryCta: "Réessayer",
    emptyTitle: "Rien à examiner pour l'instant",
    emptyBody:
      "Aucun outil Bio Lab utilisé ces 7 derniers jours. Ouvrez-en un pour démarrer ; le bilan apparaîtra dimanche prochain.",
    observationsLabel: "Ce qui ressort",
    nextStepLabel: "La semaine prochaine",
    generatedAt: (date) => `Généré le ${date}`,
    cachedBadge: "En cache",
    refreshAriaLabel: "Régénérer le bilan de la semaine",
  },
  it: {
    eyebrow: "Bilancio settimanale",
    idleTitle: "Rifletti sulla settimana",
    idleBody:
      "La domenica puoi condensare gli ultimi 7 giorni in un breve riepilogo osservazionale. Si avvia a mano ed è gratuito.",
    reflectCta: "Rifletti",
    loading: "Sto rileggendo la settimana…",
    errorTitle: "Impossibile generare il bilancio della settimana",
    errorBody:
      "Si è verificato un errore nel recupero del riepilogo. I dati sono al sicuro; riprova fra poco.",
    retryCta: "Riprova",
    emptyTitle: "Niente su cui riflettere per ora",
    emptyBody:
      "Nessun strumento Bio Lab usato negli ultimi 7 giorni. Aprine uno per iniziare; il bilancio comparirà domenica prossima.",
    observationsLabel: "Cosa è emerso",
    nextStepLabel: "Settimana prossima",
    generatedAt: (date) => `Generato il ${date}`,
    cachedBadge: "In cache",
    refreshAriaLabel: "Rigenera il bilancio della settimana",
  },
  es: {
    eyebrow: "Reflexión semanal",
    idleTitle: "Reflexiona sobre esta semana",
    idleBody:
      "Los domingos puedes condensar los últimos 7 días en un resumen breve y observacional. Inicio manual y gratuito.",
    reflectCta: "Reflexionar",
    loading: "Revisando la semana…",
    errorTitle: "No se pudo generar la reflexión semanal",
    errorBody:
      "Ocurrió un error al obtener el resumen. Tus datos están a salvo; vuelve a intentarlo en un momento.",
    retryCta: "Reintentar",
    emptyTitle: "Nada que reflexionar por ahora",
    emptyBody:
      "No se usaron herramientas Bio Lab en los últimos 7 días. Abre alguna para empezar; el resumen aparecerá el próximo domingo.",
    observationsLabel: "Lo que destaca",
    nextStepLabel: "La próxima semana",
    generatedAt: (date) => `Generado el ${date}`,
    cachedBadge: "En caché",
    refreshAriaLabel: "Regenerar la reflexión semanal",
  },
  vi: {
    eyebrow: "Tổng kết tuần",
    idleTitle: "Nhìn lại tuần này",
    idleBody:
      "Vào chủ nhật, bạn có thể tổng hợp 7 ngày qua thành một bản tóm tắt quan sát ngắn. Chạy thủ công và miễn phí.",
    reflectCta: "Nhìn lại tuần",
    loading: "Đang xem lại tuần qua…",
    errorTitle: "Không thể tạo bản tổng kết tuần",
    errorBody:
      "Đã xảy ra lỗi khi lấy bản tóm tắt. Dữ liệu của bạn vẫn an toàn; vui lòng thử lại sau ít phút.",
    retryCta: "Thử lại",
    emptyTitle: "Chưa có gì để nhìn lại",
    emptyBody:
      "Không có công cụ Bio Lab nào được dùng trong 7 ngày qua. Hãy mở một công cụ để bắt đầu; bản tổng kết sẽ xuất hiện vào chủ nhật tới.",
    observationsLabel: "Điều đáng chú ý",
    nextStepLabel: "Tuần tới",
    generatedAt: (date) => `Tạo lúc ${date}`,
    cachedBadge: "Đã lưu",
    refreshAriaLabel: "Tạo lại bản tổng kết tuần",
  },
});

export function getBioLabWeeklyInsightCopy(
  locale: AppLocale,
): BioLabWeeklyInsightCopy {
  return copyByLocale[locale];
}
