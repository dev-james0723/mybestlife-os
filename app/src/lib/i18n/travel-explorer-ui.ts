import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

/**
 * Copy for the Explorer Console (Bucket List → Travel sub-tab).
 *
 * English is the source of truth; per-locale overrides are partial and
 * missing keys fall back to English (see `createLocaleCopyMap`). zh-TW is
 * fully translated (primary user locale); other locales can be filled in
 * incrementally without breaking `npm run check:i18n`.
 */
export type TravelExplorerUiCopy = {
  // Workspace tabs
  tabOverview: string;
  tabTravel: string;
  tabMap: string;

  // Console chrome
  consoleTitle: string;
  searchPlaceholder: string;
  online: string;

  // Phase stepper
  phaseLeavingOrbit: string;
  phaseEnteringAtmosphere: string;
  phaseApproaching: string;
  phaseCruising: string;

  // Left console blocks
  currentDestination: string;
  noDestination: string;
  cityCurvation: string;
  flightInformation: string;
  altitude: string;
  speed: string;
  coordinates: string;
  eta: string;

  // Empty / fallback state
  emptyTitle: string;
  emptyBody: string;
  beginDescent: string;
  fallbackNotice: string;

  // Flight controls
  replayFlight: string;
  skipFlight: string;
  pauseCruise: string;
  resumeCruise: string;

  // Trip panel
  savedPlaces: string;
  noSavedPlaces: string;
  itinerary: string;
  smartRecs: string;
  exploreDistricts: string;

  // Attribution (ToS — always visible when tiles render)
  attribution: string;

  // Discovery + save
  addToTrip: string;
  searchFailed: string;
};

const en: TravelExplorerUiCopy = {
  tabOverview: "Overview",
  tabTravel: "Travel",
  tabMap: "Map",

  consoleTitle: "EXPLORER CONSOLE",
  searchPlaceholder: "Search any city in the world…",
  online: "ONLINE",

  phaseLeavingOrbit: "Leaving orbit",
  phaseEnteringAtmosphere: "Entering atmosphere",
  phaseApproaching: "Approaching city",
  phaseCruising: "Cruising",

  currentDestination: "CURRENT DESTINATION",
  noDestination: "No destination set",
  cityCurvation: "CITY CURVATION",
  flightInformation: "FLIGHT INFORMATION",
  altitude: "Altitude",
  speed: "Speed",
  coordinates: "Coordinates",
  eta: "ETA",

  emptyTitle: "Search a city to begin your descent",
  emptyBody:
    "Pick a destination — or one of your Bucket List travel dreams — and the console will fly you in from orbit.",
  beginDescent: "Begin descent",
  fallbackNotice:
    "Cinematic 3D activates once Google Maps tiles are configured. Planning works without it.",

  replayFlight: "Replay flight",
  skipFlight: "Skip",
  pauseCruise: "Pause cruise",
  resumeCruise: "Resume cruise",

  savedPlaces: "SAVED PLACES",
  noSavedPlaces: "No saved places yet",
  itinerary: "ITINERARY",
  smartRecs: "SMART RECOMMENDATIONS",
  exploreDistricts: "EXPLORE DISTRICTS",

  attribution: "Imagery © Google · contributors",

  addToTrip: "Add to trip",
  searchFailed: "Couldn't find that place — try another search.",
};

const COPY = createLocaleCopyMap<TravelExplorerUiCopy>(en, {
  "zh-TW": {
    tabOverview: "總覽",
    tabTravel: "旅行",
    tabMap: "地圖",
    consoleTitle: "探索者控制台",
    searchPlaceholder: "搜尋全世界任何城市…",
    online: "上線",
    phaseLeavingOrbit: "離開軌道",
    phaseEnteringAtmosphere: "穿越大氣層",
    phaseApproaching: "接近城市",
    phaseCruising: "巡航探索",
    currentDestination: "目前目的地",
    noDestination: "尚未設定目的地",
    cityCurvation: "城市曲率",
    flightInformation: "飛行資訊",
    altitude: "高度",
    speed: "速度",
    coordinates: "座標",
    eta: "預計抵達",
    emptyTitle: "搜尋一個城市，開始你的降落",
    emptyBody: "選擇一個目的地，或你願望清單中的旅行夢想，控制台便會帶你從軌道飛入。",
    beginDescent: "開始降落",
    fallbackNotice: "設定 Google 地圖圖磚後即可啟用電影感 3D。規劃功能無需它即可使用。",
    replayFlight: "重播飛行",
    skipFlight: "略過",
    pauseCruise: "暫停巡航",
    resumeCruise: "繼續巡航",
    savedPlaces: "已儲存地點",
    noSavedPlaces: "尚未儲存任何地點",
    itinerary: "行程",
    smartRecs: "智慧推薦",
    exploreDistricts: "探索地區",
    attribution: "影像 © Google · 貢獻者",
    addToTrip: "加入行程",
    searchFailed: "找不到該地點，請嘗試其他搜尋。",
  },
  "zh-CN": {
    tabOverview: "总览",
    tabTravel: "旅行",
    tabMap: "地图",
    consoleTitle: "探索者控制台",
    searchPlaceholder: "搜索全世界任何城市…",
    online: "在线",
    phaseLeavingOrbit: "离开轨道",
    phaseEnteringAtmosphere: "穿越大气层",
    phaseApproaching: "接近城市",
    phaseCruising: "巡航探索",
    currentDestination: "当前目的地",
    noDestination: "尚未设置目的地",
    cityCurvation: "城市曲率",
    flightInformation: "飞行信息",
    altitude: "高度",
    speed: "速度",
    coordinates: "坐标",
    eta: "预计抵达",
    emptyTitle: "搜索一个城市，开始你的降落",
    emptyBody: "选择一个目的地，或你愿望清单中的旅行梦想，控制台便会带你从轨道飞入。",
    beginDescent: "开始降落",
    fallbackNotice: "配置 Google 地图瓦片后即可启用电影感 3D。规划功能无需它即可使用。",
    replayFlight: "重播飞行",
    skipFlight: "跳过",
    pauseCruise: "暂停巡航",
    resumeCruise: "继续巡航",
    savedPlaces: "已保存地点",
    noSavedPlaces: "尚未保存任何地点",
    itinerary: "行程",
    smartRecs: "智能推荐",
    exploreDistricts: "探索地区",
    attribution: "影像 © Google · 贡献者",
  },
  ja: {
    tabOverview: "概要",
    tabTravel: "旅行",
    tabMap: "地図",
    consoleTitle: "エクスプローラー・コンソール",
    searchPlaceholder: "世界中の都市を検索…",
    online: "オンライン",
    phaseApproaching: "都市に接近中",
    phaseCruising: "巡航中",
    currentDestination: "現在の目的地",
    noDestination: "目的地が未設定",
    emptyTitle: "都市を検索して降下を開始",
    beginDescent: "降下を開始",
  },
});

export function getTravelExplorerUiCopy(language: AppLocale): TravelExplorerUiCopy {
  return COPY[language] ?? COPY[DEFAULT_LOCALE];
}
