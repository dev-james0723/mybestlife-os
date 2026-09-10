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
  destinationSaved: string;
  retryLoad: string;
  savingPlace: string;
  loadingGlobe: string;
  cityDetail: string;
  mapView: string;
  worldView: string;
  searchAction: string;
  chooseResult: string;
  chooseAnother: string;
  returnOrbit: string;
  readyToExplore: string;
  recentDestinations: string;
  searchUnavailable: string;
  saveFailed: string;
  retrySave: string;
  nearbyPlaces: string;
  nearbyUnavailable: string;
  webglUnavailable: string;
  tilesUnavailable: string;
  gestureHint: string;
  worldNotice: string;
  retryGlobe: string;
  manualControl: string;
  flightPaused: string;
  arrived: string;
  flightProgress: string;
  pauseFlight: string;
  resumeFlight: string;

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
  destinationSaved: "Saved to your destinations",
  retryLoad: "Try again",
  savingPlace: "Saving…",
  loadingGlobe: "Loading globe",
  cityDetail: "3D city detail",
  mapView: "World preview",
  worldView: "3D world",
  searchAction: "Search destinations",
  chooseResult: "Choose a destination to fly there",
  chooseAnother: "Search another city",
  returnOrbit: "Orbit",
  readyToExplore: "A world of possibilities",
  recentDestinations: "Recent destinations",
  searchUnavailable: "Search is unavailable right now. Try again, or explore Tokyo, Paris or New York below.",
  saveFailed: "Exploring now. This destination has not been saved.",
  retrySave: "Retry save",
  nearbyPlaces: "Nearby places",
  nearbyUnavailable: "Nearby places are temporarily unavailable.",
  webglUnavailable: "Interactive 3D is unavailable on this device. You can still choose destinations.",
  tilesUnavailable: "City detail is unavailable. Explore the world globe or retry 3D.",
  gestureHint: "Drag to explore · Pinch to zoom · Touch the globe to take control",
  worldNotice: "World view · Drag to explore, pinch to zoom. City imagery appears when available.",
  retryGlobe: "Retry 3D",
  manualControl: "You’re in control",
  flightPaused: "Flight paused",
  arrived: "Ready to explore",
  flightProgress: "Flight progress",
  pauseFlight: "Pause",
  resumeFlight: "Resume",

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

  emptyTitle: "Where will you go next?",
  emptyBody:
    "Pick a city and fly there from orbit. Your next adventure starts with a little curiosity.",
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
    destinationSaved: "已儲存至你的目的地",
    retryLoad: "重試",
    savingPlace: "正在儲存…",
    loadingGlobe: "正在載入地球",
    cityDetail: "3D 城市細節",
    mapView: "世界預覽",
    worldView: "3D 世界",
    searchAction: "搜尋目的地",
    chooseResult: "選擇目的地，開始飛行",
    chooseAnother: "搜尋其他城市",
    returnOrbit: "返回軌道",
    readyToExplore: "探索世界的可能",
    recentDestinations: "最近的目的地",
    searchUnavailable: "目前無法搜尋，請重試或探索下方的 Tokyo、Paris 或 New York。",
    saveFailed: "正在探索。此目的地尚未儲存。",
    retrySave: "重試儲存",
    nearbyPlaces: "附近景點",
    nearbyUnavailable: "暫時無法載入附近景點。",
    webglUnavailable: "此裝置無法使用互動 3D，仍可選擇目的地。",
    tilesUnavailable: "暫時無法載入城市細節，仍可探索地球或重試 3D。",
    gestureHint: "拖曳探索 · 雙指縮放 · 觸碰地球接手控制",
    worldNotice: "世界視角 · 拖曳探索、雙指縮放。城市影像可用時將自動顯示。",
    retryGlobe: "重試 3D",
    manualControl: "由你控制",
    flightPaused: "飛行已暫停",
    arrived: "開始探索",
    flightProgress: "飛行進度",
    pauseFlight: "暫停",
    resumeFlight: "繼續",

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
    emptyTitle: "下一站，想去哪裡？",
    emptyBody: "選擇一座城市，從軌道飛往目的地。下一趟冒險，就從好奇心開始。",
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
