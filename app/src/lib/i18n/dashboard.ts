import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";

type SummaryParams = {
  urgentTitles: string[];
  urgentCount: number;
  activeProjects: number;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
    return `${urgentLine}${projLine}`;
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
  return `${urgentLine}${projLine}`;
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
  knowledgePickTitle: string;
  knowledgePickDescription: string;
  knowledgePickOpen: string;
  knowledgePickBrowse: string;
  knowledgePickEmpty: string;
  knowledgePickUnavailable: string;
  knowledgePickRetry: string;
  knowledgePickSummaryFallback: string;
  favoriteNotes: string;
  noUpcoming: string;
  noFavorites: string;
  addGrateful: string;
  statActiveProjects: string;
  statUrgent: string;
  statNotes: string;
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
    knowledgePickTitle: "Today’s Knowledge Pick",
    knowledgePickDescription: "One useful item from your library, resurfaced for today.",
    knowledgePickOpen: "Open pick",
    knowledgePickBrowse: "Browse Knowledge",
    knowledgePickEmpty:
      "No ready items yet. Add something to your Knowledge Base and it can appear here.",
    knowledgePickUnavailable: "We couldn’t load today’s knowledge pick.",
    knowledgePickRetry: "Try again",
    knowledgePickSummaryFallback: "Open this item to revisit the full idea.",
    favoriteNotes: "Favorite Notes",
    noUpcoming: "No upcoming tasks",
    noFavorites: "Star notes to see them here",
    addGrateful: "Add a grateful thing",
    statActiveProjects: "Active Projects",
    statUrgent: "Urgent Tasks",
    statNotes: "Total Notes",
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
    knowledgePickTitle: "今日知識精選",
    knowledgePickDescription: "每日從你的知識庫重溫一項值得再看的內容。",
    knowledgePickOpen: "開啟精選",
    knowledgePickBrowse: "瀏覽知識庫",
    knowledgePickEmpty: "暫時未有可供精選的內容。先加入一項知識，之後便會在這裡出現。",
    knowledgePickUnavailable: "暫時無法載入今日知識精選。",
    knowledgePickRetry: "再試一次",
    knowledgePickSummaryFallback: "開啟這項內容，重新掌握完整重點。",
    favoriteNotes: "最愛筆記",
    noUpcoming: "沒有即將到來的任務",
    noFavorites: "尚未標星任何筆記",
    addGrateful: "新增感恩項目",
    statActiveProjects: "進行中專案",
    statUrgent: "緊急任務",
    statNotes: "筆記總數",
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
    knowledgePickTitle: "今日知识精选",
    knowledgePickDescription: "每天从你的知识库重温一项值得再看的内容。",
    knowledgePickOpen: "打开精选",
    knowledgePickBrowse: "浏览知识库",
    knowledgePickEmpty: "暂时没有可供精选的内容。先添加一项知识，之后它就能出现在这里。",
    knowledgePickUnavailable: "暂时无法加载今日知识精选。",
    knowledgePickRetry: "再试一次",
    knowledgePickSummaryFallback: "打开这项内容，重新掌握完整重点。",
    favoriteNotes: "收藏笔记",
    noUpcoming: "没有即将到来的任务",
    noFavorites: "给笔记加星标后会显示在这里",
    addGrateful: "添加感恩项",
    statActiveProjects: "进行中的项目",
    statUrgent: "紧急任务",
    statNotes: "笔记总数",
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
    knowledgePickTitle: "今日のナレッジピック",
    knowledgePickDescription: "ライブラリから、今日読み返す価値のある一件を選びました。",
    knowledgePickOpen: "選んだ項目を開く",
    knowledgePickBrowse: "ナレッジを見る",
    knowledgePickEmpty: "選べる項目がまだありません。ナレッジベースに項目を追加してください。",
    knowledgePickUnavailable: "今日のナレッジピックを読み込めませんでした。",
    knowledgePickRetry: "再試行",
    knowledgePickSummaryFallback: "項目を開いて、内容全体を振り返りましょう。",
    favoriteNotes: "お気に入りノート",
    noUpcoming: "近日中のタスクはありません",
    noFavorites: "スターを付けたノートがここに表示されます",
    addGrateful: "感謝を追加",
    statActiveProjects: "進行中プロジェクト",
    statUrgent: "緊急タスク",
    statNotes: "ノート合計",
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
    knowledgePickTitle: "오늘의 지식 추천",
    knowledgePickDescription: "라이브러리에서 오늘 다시 볼 만한 항목 하나를 골랐습니다.",
    knowledgePickOpen: "추천 항목 열기",
    knowledgePickBrowse: "지식 탐색",
    knowledgePickEmpty: "추천할 준비된 항목이 없습니다. 지식 베이스에 항목을 추가해 주세요.",
    knowledgePickUnavailable: "오늘의 지식 추천을 불러오지 못했습니다.",
    knowledgePickRetry: "다시 시도",
    knowledgePickSummaryFallback: "항목을 열어 전체 내용을 다시 살펴보세요.",
    favoriteNotes: "즐겨찾는 노트",
    noUpcoming: "다가오는 작업이 없습니다",
    noFavorites: "노트에 별을 표시하면 여기에 표시됩니다",
    addGrateful: "감사 항목 추가",
    statActiveProjects: "진행 중 프로젝트",
    statUrgent: "긴급 작업",
    statNotes: "노트 총수",
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
    knowledgePickTitle: "Sélection connaissance du jour",
    knowledgePickDescription: "Un élément utile de votre bibliothèque à redécouvrir aujourd’hui.",
    knowledgePickOpen: "Ouvrir la sélection",
    knowledgePickBrowse: "Parcourir les connaissances",
    knowledgePickEmpty:
      "Aucun élément prêt pour le moment. Ajoutez du contenu à votre base de connaissances.",
    knowledgePickUnavailable: "Impossible de charger la sélection connaissance du jour.",
    knowledgePickRetry: "Réessayer",
    knowledgePickSummaryFallback: "Ouvrez cet élément pour revoir l’idée complète.",
    favoriteNotes: "Notes favorites",
    noUpcoming: "Aucune tâche à venir",
    noFavorites: "Mettez une étoile aux notes pour les voir ici",
    addGrateful: "Ajouter une gratitude",
    statActiveProjects: "Projets actifs",
    statUrgent: "Tâches urgentes",
    statNotes: "Total des notes",
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
    knowledgePickTitle: "Conoscenza scelta per oggi",
    knowledgePickDescription: "Un elemento utile della tua raccolta da riscoprire oggi.",
    knowledgePickOpen: "Apri la scelta",
    knowledgePickBrowse: "Sfoglia conoscenze",
    knowledgePickEmpty:
      "Non ci sono ancora elementi pronti. Aggiungi qualcosa alla tua base di conoscenze.",
    knowledgePickUnavailable: "Non è stato possibile caricare la conoscenza scelta per oggi.",
    knowledgePickRetry: "Riprova",
    knowledgePickSummaryFallback: "Apri questo elemento per rivedere l’idea completa.",
    favoriteNotes: "Note preferite",
    noUpcoming: "Nessuna attività in arrivo",
    noFavorites: "Metti la stella alle note per vederle qui",
    addGrateful: "Aggiungi una gratitudine",
    statActiveProjects: "Progetti attivi",
    statUrgent: "Attività urgenti",
    statNotes: "Note totali",
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
    knowledgePickTitle: "Selección de conocimiento de hoy",
    knowledgePickDescription: "Un elemento útil de tu biblioteca para redescubrir hoy.",
    knowledgePickOpen: "Abrir selección",
    knowledgePickBrowse: "Explorar conocimiento",
    knowledgePickEmpty:
      "Todavía no hay elementos listos. Añade contenido a tu base de conocimiento.",
    knowledgePickUnavailable: "No pudimos cargar la selección de conocimiento de hoy.",
    knowledgePickRetry: "Volver a intentar",
    knowledgePickSummaryFallback: "Abre este elemento para retomar la idea completa.",
    favoriteNotes: "Notas favoritas",
    noUpcoming: "No hay tareas próximas",
    noFavorites: "Marca notas con estrella para verlas aquí",
    addGrateful: "Añadir gratitud",
    statActiveProjects: "Proyectos activos",
    statUrgent: "Tareas urgentes",
    statNotes: "Total de notas",
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
    knowledgePickTitle: "Kiến thức chọn cho hôm nay",
    knowledgePickDescription: "Một mục hữu ích từ thư viện để bạn xem lại hôm nay.",
    knowledgePickOpen: "Mở mục đã chọn",
    knowledgePickBrowse: "Duyệt kho kiến thức",
    knowledgePickEmpty:
      "Chưa có mục nào sẵn sàng. Hãy thêm nội dung vào kho kiến thức của bạn.",
    knowledgePickUnavailable: "Không thể tải kiến thức được chọn cho hôm nay.",
    knowledgePickRetry: "Thử lại",
    knowledgePickSummaryFallback: "Mở mục này để xem lại toàn bộ ý tưởng.",
    favoriteNotes: "Ghi chú yêu thích",
    noUpcoming: "Không có việc sắp tới",
    noFavorites: "Gắn sao cho ghi chú để xem tại đây",
    addGrateful: "Thêm điều biết ơn",
    statActiveProjects: "Dự án đang hoạt động",
    statUrgent: "Việc khẩn cấp",
    statNotes: "Tổng ghi chú",
    gratefulSlotEmpty: (i) => `Điều biết ơn thứ ${i + 1} hôm nay`,
    openAiAssistantAria: "Mở trợ lý AI",
  },
};

export function getDashboardCopy(locale: AppLocale): DashboardCopy {
  return copies[locale] ?? copies[DEFAULT_LOCALE];
}
