import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

export type CommonUiCopy = {
  openMenu: string;
  /** Site-wide page list in the header dropdown (desktop + mobile). */
  mainNavMenuAria: string;
  languageSwitcherAria: string;
  switchToDarkMode: string;
  switchToLightMode: string;
  searchPlaceholder: string;
  sortBy: string;
  formatAllFilterOption: (filterLabel: string) => string;
  switchToView: (viewName: string) => string;
  previousMonth: string;
  nextMonth: string;
  close: string;
  today: string;
  pickDate: string;
  aiActionFailed: string;
  generating: string;
};

const en: CommonUiCopy = {
  openMenu: "Open menu",
  mainNavMenuAria: "Open main navigation menu",
  languageSwitcherAria: "Change language",
  switchToDarkMode: "Switch to dark mode",
  switchToLightMode: "Switch to light mode",
  searchPlaceholder: "Search...",
  sortBy: "Sort by",
  formatAllFilterOption: (filterLabel) => `All ${filterLabel}`,
  switchToView: (viewName) => `Switch to ${viewName} view`,
  previousMonth: "Previous month",
  nextMonth: "Next month",
  close: "Close",
  today: "Today",
  pickDate: "Pick a date",
  aiActionFailed: "AI action failed. Please try again.",
  generating: "Generating...",
};

const zhTW: CommonUiCopy = {
  openMenu: "開啟選單",
  mainNavMenuAria: "開啟主選單導覽",
  languageSwitcherAria: "變更語言",
  switchToDarkMode: "切換為深色模式",
  switchToLightMode: "切換為淺色模式",
  searchPlaceholder: "搜尋...",
  sortBy: "排序",
  formatAllFilterOption: (filterLabel) => `全部${filterLabel}`,
  switchToView: (viewName) => `切換至${viewName}檢視`,
  previousMonth: "上個月",
  nextMonth: "下個月",
  close: "關閉",
  today: "今天",
  pickDate: "選擇日期",
  aiActionFailed: "AI 操作失敗，請再試一次。",
  generating: "生成中...",
};

const zhCN: CommonUiCopy = {
  openMenu: "打开菜单",
  mainNavMenuAria: "打开主导航菜单",
  languageSwitcherAria: "更改语言",
  switchToDarkMode: "切换到深色模式",
  switchToLightMode: "切换到浅色模式",
  searchPlaceholder: "搜索...",
  sortBy: "排序",
  formatAllFilterOption: (filterLabel) => `全部${filterLabel}`,
  switchToView: (viewName) => `切换到${viewName}视图`,
  previousMonth: "上个月",
  nextMonth: "下个月",
  close: "关闭",
  today: "今天",
  pickDate: "选择日期",
  aiActionFailed: "AI 操作失败，请重试。",
  generating: "生成中...",
};

const ja: CommonUiCopy = {
  openMenu: "メニューを開く",
  mainNavMenuAria: "メインナビゲーションメニューを開く",
  languageSwitcherAria: "言語を変更",
  switchToDarkMode: "ダークモードに切り替え",
  switchToLightMode: "ライトモードに切り替え",
  searchPlaceholder: "検索…",
  sortBy: "並び替え",
  formatAllFilterOption: (filterLabel) => `すべての${filterLabel}`,
  switchToView: (viewName) => `${viewName}表示に切り替え`,
  previousMonth: "前月",
  nextMonth: "翌月",
  close: "閉じる",
  today: "今日",
  pickDate: "日付を選択",
  aiActionFailed: "AIの操作に失敗しました。もう一度お試しください。",
  generating: "生成中…",
};

const ko: CommonUiCopy = {
  openMenu: "메뉴 열기",
  mainNavMenuAria: "메인 탐색 메뉴 열기",
  languageSwitcherAria: "언어 변경",
  switchToDarkMode: "다크 모드로 전환",
  switchToLightMode: "라이트 모드로 전환",
  searchPlaceholder: "검색…",
  sortBy: "정렬",
  formatAllFilterOption: (filterLabel) => `전체 ${filterLabel}`,
  switchToView: (viewName) => `${viewName} 보기로 전환`,
  previousMonth: "이전 달",
  nextMonth: "다음 달",
  close: "닫기",
  today: "오늘",
  pickDate: "날짜 선택",
  aiActionFailed: "AI 작업에 실패했습니다. 다시 시도하세요.",
  generating: "생성 중…",
};

const fr: CommonUiCopy = {
  openMenu: "Ouvrir le menu",
  mainNavMenuAria: "Ouvrir le menu de navigation principal",
  languageSwitcherAria: "Changer de langue",
  switchToDarkMode: "Passer en mode sombre",
  switchToLightMode: "Passer en mode clair",
  searchPlaceholder: "Rechercher…",
  sortBy: "Trier par",
  formatAllFilterOption: (filterLabel) => `Tous les ${filterLabel}`,
  switchToView: (viewName) => `Passer à la vue ${viewName}`,
  previousMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  close: "Fermer",
  today: "Aujourd’hui",
  pickDate: "Choisir une date",
  aiActionFailed: "L’action IA a échoué. Réessayez.",
  generating: "Génération…",
};

const it: CommonUiCopy = {
  openMenu: "Apri menu",
  mainNavMenuAria: "Apri il menu di navigazione principale",
  languageSwitcherAria: "Cambia lingua",
  switchToDarkMode: "Passa alla modalità scura",
  switchToLightMode: "Passa alla modalità chiara",
  searchPlaceholder: "Cerca…",
  sortBy: "Ordina per",
  formatAllFilterOption: (filterLabel) => `Tutti i ${filterLabel}`,
  switchToView: (viewName) => `Passa alla vista ${viewName}`,
  previousMonth: "Mese precedente",
  nextMonth: "Mese successivo",
  close: "Chiudi",
  today: "Oggi",
  pickDate: "Seleziona una data",
  aiActionFailed: "Azione IA non riuscita. Riprova.",
  generating: "Generazione…",
};

const es: CommonUiCopy = {
  openMenu: "Abrir menú",
  mainNavMenuAria: "Abrir el menú de navegación principal",
  languageSwitcherAria: "Cambiar idioma",
  switchToDarkMode: "Cambiar a modo oscuro",
  switchToLightMode: "Cambiar a modo claro",
  searchPlaceholder: "Buscar…",
  sortBy: "Ordenar por",
  formatAllFilterOption: (filterLabel) => `Todos los ${filterLabel}`,
  switchToView: (viewName) => `Cambiar a vista ${viewName}`,
  previousMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  close: "Cerrar",
  today: "Hoy",
  pickDate: "Elegir una fecha",
  aiActionFailed: "La acción de IA falló. Inténtalo de nuevo.",
  generating: "Generando…",
};

const vi: CommonUiCopy = {
  openMenu: "Mở menu",
  mainNavMenuAria: "Mở menu điều hướng chính",
  languageSwitcherAria: "Đổi ngôn ngữ",
  switchToDarkMode: "Chuyển sang chế độ tối",
  switchToLightMode: "Chuyển sang chế độ sáng",
  searchPlaceholder: "Tìm kiếm…",
  sortBy: "Sắp xếp theo",
  formatAllFilterOption: (filterLabel) => `Tất cả ${filterLabel}`,
  switchToView: (viewName) => `Chuyển sang chế độ xem ${viewName}`,
  previousMonth: "Tháng trước",
  nextMonth: "Tháng sau",
  close: "Đóng",
  today: "Hôm nay",
  pickDate: "Chọn ngày",
  aiActionFailed: "Thao tác AI thất bại. Vui lòng thử lại.",
  generating: "Đang tạo…",
};

const localizedCommonUi = createLocaleCopyMap<CommonUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getCommonUiCopy(locale: AppLocale): CommonUiCopy {
  return localizedCommonUi[locale] ?? localizedCommonUi.en;
}
