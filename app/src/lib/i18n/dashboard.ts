import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";

type SummaryParams = {
  urgentTitles: string[];
  urgentCount: number;
  activeProjects: number;
  studyStreak: number;
};

function joinTitles(locale: AppLocale, titles: string[]): string {
  if (titles.length === 0) return "";
  const sep =
    locale === "en" || locale === "fr" || locale === "it" || locale === "es" || locale === "vi"
      ? ", "
      : locale === "ja"
        ? "、"
        : "、";
  return titles.join(sep);
}

export function buildDashboardSummary(locale: AppLocale, p: SummaryParams): string {
  const titles = joinTitles(locale, p.urgentTitles);
  const urgentSep = locale === "zh-TW" || locale === "zh-CN" || locale === "ja" || locale === "ko" ? "：" : ": ";

  if (locale === "zh-TW") {
    const urgentLine =
      p.urgentCount > 0
        ? `目前有 ${p.urgentCount} 項緊急任務${p.urgentTitles.length ? `${urgentSep}${titles}` : ""}。`
        : "目前沒有標為緊急的任務，可以專心處理深度工作。";
    const projLine =
      p.activeProjects > 0
        ? `你正在進行 ${p.activeProjects} 個專案。`
        : "尚未有進行中的專案，建立一個專案來整理目標。";
    const streakLine =
      p.studyStreak > 0
        ? `日語學習連續紀錄 ${p.studyStreak} 天，維持節奏會更有感。`
        : "日語學習連續紀錄從今天開始累積，先記錄一小段練習。";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "zh-CN") {
    const urgentLine =
      p.urgentCount > 0
        ? `当前有 ${p.urgentCount} 项紧急任务${p.urgentTitles.length ? `${urgentSep}${titles}` : ""}。`
        : "当前没有标为紧急的任务，可以专心做深度工作。";
    const projLine =
      p.activeProjects > 0
        ? `你正在进行 ${p.activeProjects} 个项目。`
        : "还没有进行中的项目，创建一个项目来整理目标。";
    const streakLine =
      p.studyStreak > 0
        ? `日语学习已连续 ${p.studyStreak} 天，保持节奏更有感。`
        : "从今天开始累积日语学习连续记录，先记录一小段练习。";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "ja") {
    const urgentLine =
      p.urgentCount > 0
        ? `緊急タスクが ${p.urgentCount} 件あります${p.urgentTitles.length ? `${urgentSep}${titles}` : ""}。`
        : "緊急タスクはありません。集中して取り組める時間です。";
    const projLine =
      p.activeProjects > 0
        ? `進行中のプロジェクトは ${p.activeProjects} 件です。`
        : "進行中のプロジェクトはまだありません。関連タスクをまとめてみましょう。";
    const streakLine =
      p.studyStreak > 0
        ? `日本語学習の連続記録は ${p.studyStreak} 日です。継続が力になります。`
        : "今日から短いセッションを記録して、連続記録を始めましょう。";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "ko") {
    const urgentLine =
      p.urgentCount > 0
        ? `긴급 작업이 ${p.urgentCount}개 있습니다${p.urgentTitles.length ? `${urgentSep}${titles}` : ""}.`
        : "긴급 작업이 없습니다. 집중하거나 창의적인 일을 하기 좋은 시간입니다.";
    const projLine =
      p.activeProjects > 0
        ? `진행 중인 프로젝트는 ${p.activeProjects}개입니다.`
        : "진행 중인 프로젝트가 아직 없습니다. 관련 작업을 묶을 프로젝트를 만들어 보세요.";
    const streakLine =
      p.studyStreak > 0
        ? `일본어 학습 연속 기록은 ${p.studyStreak}일입니다. 꾸준함이 가장 큰 힘입니다.`
        : "오늘 짧은 일본어 학습을 기록해 연속 기록을 시작해 보세요.";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "fr") {
    const urgentLine =
      p.urgentCount > 0
        ? `Vous avez ${p.urgentCount} tâche${p.urgentCount === 1 ? "" : "s"} urgente${p.urgentCount === 1 ? "" : "s"}${
            p.urgentTitles.length ? `${urgentSep}${titles}` : ""
          }. Commencez par la plus urgente pendant que votre attention est fraîche. `
        : "Aucune tâche urgente — bon moment pour du travail concentré ou créatif. ";
    const projLine =
      p.activeProjects > 0
        ? `Vous faites avancer ${p.activeProjects} projet${p.activeProjects === 1 ? "" : "s"} actif${p.activeProjects === 1 ? "" : "s"}. `
        : "Pas encore de projet actif — créez-en un pour regrouper les tâches liées. ";
    const streakLine =
      p.studyStreak > 0
        ? `Votre série d’étude du japonais : ${p.studyStreak} jour${p.studyStreak === 1 ? "" : "s"} ; la régularité bat l’intensité.`
        : "Enregistrez une courte session de japonais aujourd’hui pour lancer une série.";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "it") {
    const urgentLine =
      p.urgentCount > 0
        ? `Hai ${p.urgentCount} attività urgent${p.urgentCount === 1 ? "e" : "i"}${
            p.urgentTitles.length ? `${urgentSep}${titles}` : ""
          }. Inizia dalla più sensibile al tempo mentre sei concentrato. `
        : "Nessuna attività urgente: buona finestra per lavoro profondo o creativo. ";
    const projLine =
      p.activeProjects > 0
        ? `Stai portando avanti ${p.activeProjects} progett${p.activeProjects === 1 ? "o" : "i"} attiv${p.activeProjects === 1 ? "o" : "i"}. `
        : "Nessun progetto attivo: valuta di crearne uno per raggruppare le attività. ";
    const streakLine =
      p.studyStreak > 0
        ? `La tua serie di studio del giapponese è di ${p.studyStreak} giorn${p.studyStreak === 1 ? "o" : "i"}: la costanza batte l’intensità.`
        : "Registra una breve sessione di giapponese oggi per iniziare una serie.";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "es") {
    const urgentLine =
      p.urgentCount > 0
        ? `Tienes ${p.urgentCount} tarea${p.urgentCount === 1 ? "" : "s"} urgente${p.urgentCount === 1 ? "" : "s"}${
            p.urgentTitles.length ? `${urgentSep}${titles}` : ""
          }. Empieza por la más sensible al tiempo mientras estás fresco. `
        : "No hay tareas urgentes: buena ventana para trabajo profundo o creativo. ";
    const projLine =
      p.activeProjects > 0
        ? `Estás avanzando ${p.activeProjects} proyecto${p.activeProjects === 1 ? "" : "s"} activo${p.activeProjects === 1 ? "" : "s"}. `
        : "Aún no hay proyectos activos: crea uno para agrupar tareas relacionadas. ";
    const streakLine =
      p.studyStreak > 0
        ? `Tu racha de estudio de japonés es de ${p.studyStreak} día${p.studyStreak === 1 ? "" : "s"}; la constancia gana a la intensidad.`
        : "Registra una sesión corta de japonés hoy para empezar una racha.";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  if (locale === "vi") {
    const urgentLine =
      p.urgentCount > 0
        ? `Bạn có ${p.urgentCount} việc khẩn cấp${p.urgentTitles.length ? `${urgentSep}${titles}` : ""}. Hãy bắt đầu với việc gấp nhất khi đầu óc còn tỉnh táo. `
        : "Không có việc khẩn cấp — khoảng thời gian tốt để làm việc tập trung hoặc sáng tạo. ";
    const projLine =
      p.activeProjects > 0
        ? `Bạn đang đẩy ${p.activeProjects} dự án đang hoạt động. `
        : "Chưa có dự án đang hoạt động — hãy tạo một dự án để gom các việc liên quan. ";
    const streakLine =
      p.studyStreak > 0
        ? `Chuỗi học tiếng Nhật của bạn là ${p.studyStreak} ngày; kiên trì quan trọng hơn cường độ.`
        : "Ghi lại một buổi học tiếng Nhật ngắn hôm nay để bắt đầu chuỗi.";
    return `${urgentLine}${projLine}${streakLine}`;
  }

  const urgentLine =
    p.urgentCount > 0
      ? `You have ${p.urgentCount} urgent task${p.urgentCount === 1 ? "" : "s"}${
          p.urgentTitles.length ? `${urgentSep}${titles}` : ""
        }. Start with the most time-sensitive item while your focus is fresh. `
      : "No urgent tasks on your list — a good window for focused or creative work. ";
  const projLine =
    p.activeProjects > 0
      ? `You are actively moving ${p.activeProjects} project${p.activeProjects === 1 ? "" : "s"} forward. `
      : "No active projects yet — consider spinning one up to bundle related tasks. ";
  const streakLine =
    p.studyStreak > 0
      ? `Your Japanese study streak is ${p.studyStreak} day${p.studyStreak === 1 ? "" : "s"}; consistency beats intensity.`
      : "Log a short Japanese study session today to begin a streak.";
  return `${urgentLine}${projLine}${streakLine}`;
}

export type DashboardCopy = {
  title: string;
  motivationGenerating: string;
  motivationRefreshAria: string;
  gratefulTitle: string;
  inspirationTitle: string;
  watchYoutube: string;
  markWatched: string;
  saveNotes: string;
  newVideo: string;
  upcoming: string;
  viewAll: string;
  recentStudy: string;
  weekMinutes: (n: number) => string;
  favoriteNotes: string;
  noUpcoming: string;
  noSessions: string;
  noFavorites: string;
  addGrateful: string;
  statActiveProjects: string;
  statUrgent: string;
  statStreak: string;
  statNotes: string;
  days: (n: number) => string;
  gratefulSlotEmpty: (index: number) => string;
  openAiAssistantAria: string;
};

const copies: Record<AppLocale, DashboardCopy> = {
  en: {
    title: "Dashboard",
    motivationGenerating: "Generating your daily motivation...",
    motivationRefreshAria: "Refresh motivation",
    gratefulTitle: "3 Grateful Things Today",
    inspirationTitle: "Daily Inspiration",
    watchYoutube: "Watch on YouTube",
    markWatched: "Mark as Watched",
    saveNotes: "Save to Notes",
    newVideo: "Get New Video",
    upcoming: "Upcoming Tasks",
    viewAll: "View All",
    recentStudy: "Recent Study Sessions",
    weekMinutes: (n) => `${n} minutes this week`,
    favoriteNotes: "Favorite Notes",
    noUpcoming: "No upcoming tasks",
    noSessions: "No study sessions yet",
    noFavorites: "Star notes to see them here",
    addGrateful: "Add a grateful thing",
    statActiveProjects: "Active Projects",
    statUrgent: "Urgent Tasks",
    statStreak: "Study Streak",
    statNotes: "Total Notes",
    days: (n) => `${n} day${n === 1 ? "" : "s"}`,
    gratefulSlotEmpty: (i) =>
      i === 0 ? "My 1st grateful thing today" : i === 1 ? "My 2nd grateful thing today" : "My 3rd grateful thing today",
    openAiAssistantAria: "Open AI assistant",
  },
  "zh-TW": {
    title: "儀表板",
    motivationGenerating: "正在生成你的每日動能…",
    motivationRefreshAria: "重新整理動能摘要",
    gratefulTitle: "今日三件感恩的事",
    inspirationTitle: "每日靈感",
    watchYoutube: "在 YouTube 觀看",
    markWatched: "標記為已觀看",
    saveNotes: "儲存至筆記",
    newVideo: "取得新影片",
    upcoming: "即將到來的任務",
    viewAll: "查看全部",
    recentStudy: "最近學習紀錄",
    weekMinutes: (n) => `本週已學 ${n} 分鐘`,
    favoriteNotes: "最愛筆記",
    noUpcoming: "沒有即將到來的任務",
    noSessions: "尚無學習紀錄",
    noFavorites: "尚未標星任何筆記",
    addGrateful: "新增感恩項目",
    statActiveProjects: "進行中專案",
    statUrgent: "緊急任務",
    statStreak: "學習連續天數",
    statNotes: "筆記總數",
    days: (n) => `${n} 天`,
    gratefulSlotEmpty: (i) => `今日第 ${i + 1} 件感恩的事`,
    openAiAssistantAria: "開啟 AI 助理",
  },
  "zh-CN": {
    title: "仪表盘",
    motivationGenerating: "正在生成你的每日动力…",
    motivationRefreshAria: "刷新动力摘要",
    gratefulTitle: "今天三件感恩的事",
    inspirationTitle: "每日灵感",
    watchYoutube: "在 YouTube 观看",
    markWatched: "标记为已观看",
    saveNotes: "保存到笔记",
    newVideo: "获取新视频",
    upcoming: "即将到来的任务",
    viewAll: "查看全部",
    recentStudy: "最近学习记录",
    weekMinutes: (n) => `本周已学 ${n} 分钟`,
    favoriteNotes: "收藏笔记",
    noUpcoming: "没有即将到来的任务",
    noSessions: "尚无学习记录",
    noFavorites: "给笔记加星标后会显示在这里",
    addGrateful: "添加感恩项",
    statActiveProjects: "进行中的项目",
    statUrgent: "紧急任务",
    statStreak: "学习连续天数",
    statNotes: "笔记总数",
    days: (n) => `${n} 天`,
    gratefulSlotEmpty: (i) => `今天第 ${i + 1} 件感恩的事`,
    openAiAssistantAria: "打开 AI 助手",
  },
  ja: {
    title: "ダッシュボード",
    motivationGenerating: "今日のモチベーションを生成中…",
    motivationRefreshAria: "モチベーションを更新",
    gratefulTitle: "今日の感謝3つ",
    inspirationTitle: "今日のインスピレーション",
    watchYoutube: "YouTubeで見る",
    markWatched: "視聴済みにする",
    saveNotes: "ノートに保存",
    newVideo: "別の動画",
    upcoming: "近日中のタスク",
    viewAll: "すべて表示",
    recentStudy: "最近の学習",
    weekMinutes: (n) => `今週 ${n} 分`,
    favoriteNotes: "お気に入りノート",
    noUpcoming: "近日中のタスクはありません",
    noSessions: "学習記録はまだありません",
    noFavorites: "スターを付けたノートがここに表示されます",
    addGrateful: "感謝を追加",
    statActiveProjects: "進行中プロジェクト",
    statUrgent: "緊急タスク",
    statStreak: "学習ストリーク",
    statNotes: "ノート合計",
    days: (n) => `${n}日`,
    gratefulSlotEmpty: (i) => `今日の感謝 ${i + 1} つ目`,
    openAiAssistantAria: "AIアシスタントを開く",
  },
  ko: {
    title: "대시보드",
    motivationGenerating: "오늘의 동기를 생성하는 중…",
    motivationRefreshAria: "동기 새로고침",
    gratefulTitle: "오늘 감사한 일 3가지",
    inspirationTitle: "오늘의 영감",
    watchYoutube: "YouTube에서 보기",
    markWatched: "시청 완료로 표시",
    saveNotes: "노트에 저장",
    newVideo: "새 영상",
    upcoming: "다가오는 작업",
    viewAll: "모두 보기",
    recentStudy: "최근 학습",
    weekMinutes: (n) => `이번 주 ${n}분`,
    favoriteNotes: "즐겨찾는 노트",
    noUpcoming: "다가오는 작업이 없습니다",
    noSessions: "학습 기록이 아직 없습니다",
    noFavorites: "노트에 별을 표시하면 여기에 표시됩니다",
    addGrateful: "감사 항목 추가",
    statActiveProjects: "진행 중 프로젝트",
    statUrgent: "긴급 작업",
    statStreak: "학습 연속 일수",
    statNotes: "노트 총수",
    days: (n) => `${n}일`,
    gratefulSlotEmpty: (i) => `오늘의 감사 ${i + 1}번째`,
    openAiAssistantAria: "AI 어시스턴트 열기",
  },
  fr: {
    title: "Tableau de bord",
    motivationGenerating: "Génération de votre motivation du jour…",
    motivationRefreshAria: "Actualiser la motivation",
    gratefulTitle: "3 choses à être reconnaissant aujourd’hui",
    inspirationTitle: "Inspiration du jour",
    watchYoutube: "Voir sur YouTube",
    markWatched: "Marquer comme vu",
    saveNotes: "Enregistrer dans les notes",
    newVideo: "Nouvelle vidéo",
    upcoming: "Tâches à venir",
    viewAll: "Tout voir",
    recentStudy: "Sessions d’étude récentes",
    weekMinutes: (n) => `${n} minutes cette semaine`,
    favoriteNotes: "Notes favorites",
    noUpcoming: "Aucune tâche à venir",
    noSessions: "Pas encore de sessions d’étude",
    noFavorites: "Mettez une étoile aux notes pour les voir ici",
    addGrateful: "Ajouter une gratitude",
    statActiveProjects: "Projets actifs",
    statUrgent: "Tâches urgentes",
    statStreak: "Série d’étude",
    statNotes: "Total des notes",
    days: (n) => `${n} jour${n === 1 ? "" : "s"}`,
    gratefulSlotEmpty: (i) =>
      i === 0
        ? "Ma 1re gratitude du jour"
        : i === 1
          ? "Ma 2e gratitude du jour"
          : "Ma 3e gratitude du jour",
    openAiAssistantAria: "Ouvrir l’assistant IA",
  },
  it: {
    title: "Dashboard",
    motivationGenerating: "Generazione della motivazione giornaliera…",
    motivationRefreshAria: "Aggiorna motivazione",
    gratefulTitle: "3 cose per cui essere grato oggi",
    inspirationTitle: "Ispirazione del giorno",
    watchYoutube: "Guarda su YouTube",
    markWatched: "Segna come visto",
    saveNotes: "Salva nelle note",
    newVideo: "Nuovo video",
    upcoming: "Attività in arrivo",
    viewAll: "Vedi tutto",
    recentStudy: "Sessioni di studio recenti",
    weekMinutes: (n) => `${n} minuti questa settimana`,
    favoriteNotes: "Note preferite",
    noUpcoming: "Nessuna attività in arrivo",
    noSessions: "Nessuna sessione di studio",
    noFavorites: "Metti la stella alle note per vederle qui",
    addGrateful: "Aggiungi una gratitudine",
    statActiveProjects: "Progetti attivi",
    statUrgent: "Attività urgenti",
    statStreak: "Serie di studio",
    statNotes: "Note totali",
    days: (n) => `${n} giorn${n === 1 ? "o" : "i"}`,
    gratefulSlotEmpty: (i) =>
      i === 0
        ? "La mia 1ª gratitudine di oggi"
        : i === 1
          ? "La mia 2ª gratitudine di oggi"
          : "La mia 3ª gratitudine di oggi",
    openAiAssistantAria: "Apri assistente IA",
  },
  es: {
    title: "Panel",
    motivationGenerating: "Generando tu motivación diaria…",
    motivationRefreshAria: "Actualizar motivación",
    gratefulTitle: "3 cosas por las que estar agradecido hoy",
    inspirationTitle: "Inspiración diaria",
    watchYoutube: "Ver en YouTube",
    markWatched: "Marcar como visto",
    saveNotes: "Guardar en notas",
    newVideo: "Nuevo video",
    upcoming: "Tareas próximas",
    viewAll: "Ver todo",
    recentStudy: "Sesiones de estudio recientes",
    weekMinutes: (n) => `${n} minutos esta semana`,
    favoriteNotes: "Notas favoritas",
    noUpcoming: "No hay tareas próximas",
    noSessions: "Aún no hay sesiones de estudio",
    noFavorites: "Marca notas con estrella para verlas aquí",
    addGrateful: "Añadir gratitud",
    statActiveProjects: "Proyectos activos",
    statUrgent: "Tareas urgentes",
    statStreak: "Racha de estudio",
    statNotes: "Total de notas",
    days: (n) => `${n} día${n === 1 ? "" : "s"}`,
    gratefulSlotEmpty: (i) =>
      i === 0
        ? "Mi 1.ª gratitud de hoy"
        : i === 1
          ? "Mi 2.ª gratitud de hoy"
          : "Mi 3.ª gratitud de hoy",
    openAiAssistantAria: "Abrir asistente de IA",
  },
  vi: {
    title: "Bảng điều khiển",
    motivationGenerating: "Đang tạo động lực cho hôm nay…",
    motivationRefreshAria: "Làm mới động lực",
    gratefulTitle: "3 điều biết ơn hôm nay",
    inspirationTitle: "Cảm hứng mỗi ngày",
    watchYoutube: "Xem trên YouTube",
    markWatched: "Đánh dấu đã xem",
    saveNotes: "Lưu vào ghi chú",
    newVideo: "Video mới",
    upcoming: "Việc sắp tới",
    viewAll: "Xem tất cả",
    recentStudy: "Buổi học gần đây",
    weekMinutes: (n) => `${n} phút tuần này`,
    favoriteNotes: "Ghi chú yêu thích",
    noUpcoming: "Không có việc sắp tới",
    noSessions: "Chưa có buổi học",
    noFavorites: "Gắn sao cho ghi chú để xem tại đây",
    addGrateful: "Thêm điều biết ơn",
    statActiveProjects: "Dự án đang hoạt động",
    statUrgent: "Việc khẩn cấp",
    statStreak: "Chuỗi học",
    statNotes: "Tổng ghi chú",
    days: (n) => `${n} ngày`,
    gratefulSlotEmpty: (i) => `Điều biết ơn thứ ${i + 1} hôm nay`,
    openAiAssistantAria: "Mở trợ lý AI",
  },
};

export function getDashboardCopy(locale: AppLocale): DashboardCopy {
  return copies[locale] ?? copies[DEFAULT_LOCALE];
}
