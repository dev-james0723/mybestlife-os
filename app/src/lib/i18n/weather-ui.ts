import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

/**
 * Weather page UI copy. English is the canonical source; Phase E will
 * complete the 9-locale overrides. Until then non-English locales fall
 * back via `createLocaleCopyMap`.
 */
export type WeatherUiCopy = {
  pageTitle: string;
  pageSubtitle: string;

  // Status / errors
  loadingTitle: string;
  errorTitle: string;
  retry: string;
  locationPermissionPrompt: string;
  useMyLocation: string;
  unavailable: string;

  // Hero
  feelsLike: (temp: number) => string;
  highLow: (high: number, low: number) => string;
  updatedJustNow: string;
  updatedAt: (label: string) => string;
  precisionGps: string;
  precisionDistrict: string;
  precisionNearestStation: string;
  precisionCity: string;
  precisionManual: string;
  precisionFallback: string;
  aiBriefTitle: string;

  // Location search
  searchPlaceholder: string;
  searchEmpty: string;
  searchError: string;
  recentLocations: string;
  clearSelectedLocation: string;

  // Metric labels
  metricUvIndex: string;
  metricHumidity: string;
  metricWind: string;
  metricRainChance: string;
  metricVisibility: string;
  metricPressure: string;
  metricDewPoint: string;
  metricAirQuality: string;
  uvLow: string;
  uvModerate: string;
  uvHigh: string;
  uvVeryHigh: string;
  uvExtreme: string;

  // Radar
  radarTitle: string;
  radarSatellite: string;
  radarStreet: string;
  radarComingSoon: string;

  // Insights / impact
  atmosphericInsightsTitle: string;
  precipitationIntensityTitle: string;
  smartRemindersTitle: string;
  aiImpactTitle: string;
  impactCommute: string;
  impactExercise: string;
  impactClothing: string;
  impactOutdoor: string;
  impactTravel: string;
  impactHealth: string;

  // Charts
  temperatureTrendTitle: string;
  precipitationTrendTitle: string;
  next24h: string;

  // Forecast tabs
  forecastToday: string;
  forecast7Days: string;
  forecast10Days: string;
  forecast15Days: string;
  forecastNow: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  extendedOutlookNotice: string;

  // Footer / credit
  photoCredit: (name: string) => string;
};

const en: WeatherUiCopy = {
  pageTitle: "Weather",
  pageSubtitle: "Cinematic forecast and conditions",

  loadingTitle: "Loading weather…",
  errorTitle: "Weather unavailable",
  retry: "Retry",
  locationPermissionPrompt: "Allow location access for accurate weather",
  useMyLocation: "Use my location",
  unavailable: "—",

  feelsLike: (t) => `Feels like ${t}°`,
  highLow: (h, l) => `H: ${h}° L: ${l}°`,
  updatedJustNow: "Updated just now",
  updatedAt: (label) => `Updated ${label}`,
  precisionGps: "Using GPS location",
  precisionDistrict: "District-level forecast",
  precisionNearestStation: "Nearest forecast point",
  precisionCity: "City-level forecast",
  precisionManual: "Using selected location",
  precisionFallback: "Approximate location",
  aiBriefTitle: "AI Executive Brief",

  searchPlaceholder: "Search city or district…",
  searchEmpty: "No matches",
  searchError: "Search failed — try again",
  recentLocations: "Recent",
  clearSelectedLocation: "Clear selection",

  metricUvIndex: "UV Index",
  metricHumidity: "Humidity",
  metricWind: "Wind",
  metricRainChance: "Rain chance",
  metricVisibility: "Visibility",
  metricPressure: "Pressure",
  metricDewPoint: "Dew point",
  metricAirQuality: "Air quality",
  uvLow: "Low",
  uvModerate: "Moderate",
  uvHigh: "High",
  uvVeryHigh: "Very High",
  uvExtreme: "Extreme",

  radarTitle: "Live Radar",
  radarSatellite: "Satellite",
  radarStreet: "Street View",
  radarComingSoon: "Radar imagery coming soon — provider integration pending.",

  atmosphericInsightsTitle: "Atmospheric Insights",
  precipitationIntensityTitle: "Precipitation Intensity",
  smartRemindersTitle: "Smart Reminders",
  aiImpactTitle: "AI Weather Impact",
  impactCommute: "Commute",
  impactExercise: "Exercise",
  impactClothing: "Clothing",
  impactOutdoor: "Outdoor",
  impactTravel: "Travel",
  impactHealth: "Health",

  temperatureTrendTitle: "Temperature Trend",
  precipitationTrendTitle: "Precipitation Trend",
  next24h: "Next 24h",

  forecastToday: "Today",
  forecast7Days: "7 Days",
  forecast10Days: "10 Days",
  forecast15Days: "15 Days",
  forecastNow: "Now",
  confidenceHigh: "High confidence",
  confidenceMedium: "Medium confidence",
  confidenceLow: "Extended outlook",
  extendedOutlookNotice:
    "Days 6+ are an extended outlook based on the 5-day forecast trend and should not be treated as a hard forecast.",

  photoCredit: (name) => `Photo · ${name}`,
};

// ============================================================
// Locale overrides
// English is canonical; zh-TW reviewed manually. The other 7 locales are
// translated against the canonical English keys with the help of machine
// translation. Anything missing falls back to English via createLocaleCopyMap.
// ============================================================

const zhTW: DeepPartial<WeatherUiCopy> = {
  pageTitle: "天氣",
  pageSubtitle: "電影級預報與即時天氣",
  loadingTitle: "天氣載入中…",
  errorTitle: "天氣資料無法載入",
  retry: "重新整理",
  locationPermissionPrompt: "允許定位以取得精準天氣",
  useMyLocation: "使用我的位置",
  unavailable: "—",
  feelsLike: (t) => `體感 ${t}°`,
  highLow: (h, l) => `高: ${h}° 低: ${l}°`,
  updatedJustNow: "剛剛更新",
  updatedAt: (label) => `更新於 ${label}`,
  precisionGps: "GPS 定位",
  precisionDistrict: "區域預報",
  precisionNearestStation: "鄰近觀測站",
  precisionCity: "城市級預報",
  precisionManual: "手動選定地點",
  precisionFallback: "概略位置",
  aiBriefTitle: "AI 執行摘要",
  searchPlaceholder: "搜尋城市或地區…",
  searchEmpty: "沒有結果",
  searchError: "搜尋失敗，請重試",
  recentLocations: "最近",
  clearSelectedLocation: "清除選擇",
  metricUvIndex: "UV 指數",
  metricHumidity: "濕度",
  metricWind: "風速",
  metricRainChance: "降雨機率",
  metricVisibility: "能見度",
  metricPressure: "氣壓",
  metricDewPoint: "露點",
  metricAirQuality: "空氣品質",
  uvLow: "低",
  uvModerate: "中等",
  uvHigh: "高",
  uvVeryHigh: "極高",
  uvExtreme: "極端",
  radarTitle: "即時雷達",
  radarSatellite: "衛星",
  radarStreet: "街道",
  radarComingSoon: "雷達圖像準備中 — 等待供應商整合",
  atmosphericInsightsTitle: "大氣分析",
  precipitationIntensityTitle: "降雨強度",
  smartRemindersTitle: "貼心提醒",
  aiImpactTitle: "AI 天氣影響",
  impactCommute: "通勤",
  impactExercise: "運動",
  impactClothing: "穿著",
  impactOutdoor: "戶外",
  impactTravel: "出行",
  impactHealth: "健康",
  temperatureTrendTitle: "氣溫趨勢",
  precipitationTrendTitle: "降雨趨勢",
  next24h: "未來 24 小時",
  forecastToday: "今日",
  forecast7Days: "7 天",
  forecast10Days: "10 天",
  forecast15Days: "15 天",
  forecastNow: "現在",
  confidenceHigh: "高可信度",
  confidenceMedium: "中等可信度",
  confidenceLow: "延伸展望",
  extendedOutlookNotice:
    "第 6 天起為延伸展望，依 5 天預報趨勢推算，僅供參考。",
  photoCredit: (name) => `相片 · ${name}`,
};

const zhCN: DeepPartial<WeatherUiCopy> = {
  pageTitle: "天气",
  pageSubtitle: "电影级预报与即时天气",
  loadingTitle: "天气加载中…",
  errorTitle: "天气数据无法加载",
  retry: "刷新",
  locationPermissionPrompt: "允许定位以获取精准天气",
  useMyLocation: "使用我的位置",
  unavailable: "—",
  feelsLike: (t) => `体感 ${t}°`,
  highLow: (h, l) => `高: ${h}° 低: ${l}°`,
  updatedJustNow: "刚刚更新",
  updatedAt: (label) => `更新于 ${label}`,
  precisionGps: "GPS 定位",
  precisionDistrict: "区域预报",
  precisionNearestStation: "最近观测站",
  precisionCity: "城市级预报",
  precisionManual: "手动选定位置",
  precisionFallback: "近似位置",
  aiBriefTitle: "AI 执行摘要",
  searchPlaceholder: "搜索城市或地区…",
  searchEmpty: "没有结果",
  searchError: "搜索失败，请重试",
  recentLocations: "最近",
  clearSelectedLocation: "清除选择",
  metricUvIndex: "UV 指数",
  metricHumidity: "湿度",
  metricWind: "风速",
  metricRainChance: "降雨概率",
  metricVisibility: "能见度",
  metricPressure: "气压",
  metricDewPoint: "露点",
  metricAirQuality: "空气质量",
  uvLow: "低",
  uvModerate: "中等",
  uvHigh: "高",
  uvVeryHigh: "极高",
  uvExtreme: "极端",
  radarTitle: "实时雷达",
  radarSatellite: "卫星",
  radarStreet: "街道",
  radarComingSoon: "雷达图像准备中 — 等待供应商接入",
  atmosphericInsightsTitle: "大气分析",
  precipitationIntensityTitle: "降雨强度",
  smartRemindersTitle: "贴心提醒",
  aiImpactTitle: "AI 天气影响",
  impactCommute: "通勤",
  impactExercise: "运动",
  impactClothing: "穿着",
  impactOutdoor: "户外",
  impactTravel: "出行",
  impactHealth: "健康",
  temperatureTrendTitle: "气温趋势",
  precipitationTrendTitle: "降雨趋势",
  next24h: "未来 24 小时",
  forecastToday: "今天",
  forecast7Days: "7 天",
  forecast10Days: "10 天",
  forecast15Days: "15 天",
  forecastNow: "现在",
  confidenceHigh: "高可信度",
  confidenceMedium: "中等可信度",
  confidenceLow: "延伸展望",
  extendedOutlookNotice:
    "第 6 天起为延伸展望，由 5 天预报趋势推算，仅供参考。",
  photoCredit: (name) => `照片 · ${name}`,
};

const ja: DeepPartial<WeatherUiCopy> = {
  pageTitle: "天気",
  pageSubtitle: "シネマティックな予報と現況",
  loadingTitle: "天気を読み込み中…",
  errorTitle: "天気を取得できません",
  retry: "再試行",
  locationPermissionPrompt: "正確な天気のために位置情報の使用を許可してください",
  useMyLocation: "現在地を使用",
  feelsLike: (t) => `体感 ${t}°`,
  highLow: (h, l) => `最高 ${h}° / 最低 ${l}°`,
  updatedJustNow: "たった今更新",
  updatedAt: (label) => `${label} に更新`,
  precisionGps: "GPS 位置",
  precisionDistrict: "地区レベル予報",
  precisionNearestStation: "最寄りの観測点",
  precisionCity: "都市レベル予報",
  precisionManual: "手動選択した地点",
  precisionFallback: "おおよその位置",
  aiBriefTitle: "AI エグゼクティブブリーフ",
  searchPlaceholder: "都市や地区を検索…",
  searchEmpty: "該当なし",
  searchError: "検索に失敗しました",
  recentLocations: "最近",
  clearSelectedLocation: "選択を解除",
  metricUvIndex: "UV 指数",
  metricHumidity: "湿度",
  metricWind: "風速",
  metricRainChance: "降水確率",
  metricVisibility: "視程",
  metricPressure: "気圧",
  metricDewPoint: "露点",
  metricAirQuality: "大気質",
  uvLow: "低",
  uvModerate: "中",
  uvHigh: "高",
  uvVeryHigh: "非常に高い",
  uvExtreme: "極端",
  radarTitle: "ライブレーダー",
  radarSatellite: "衛星",
  radarStreet: "ストリート",
  radarComingSoon: "レーダー画像は準備中です — プロバイダー統合待ち",
  atmosphericInsightsTitle: "大気状況",
  precipitationIntensityTitle: "降水強度",
  smartRemindersTitle: "スマートリマインダー",
  aiImpactTitle: "AI 天気の影響",
  impactCommute: "通勤",
  impactExercise: "運動",
  impactClothing: "服装",
  impactOutdoor: "屋外",
  impactTravel: "移動",
  impactHealth: "健康",
  temperatureTrendTitle: "気温の推移",
  precipitationTrendTitle: "降水の推移",
  next24h: "次の 24 時間",
  forecastToday: "今日",
  forecast7Days: "7 日間",
  forecast10Days: "10 日間",
  forecast15Days: "15 日間",
  forecastNow: "現在",
  confidenceHigh: "信頼度・高",
  confidenceMedium: "信頼度・中",
  confidenceLow: "長期予測",
  extendedOutlookNotice:
    "6 日目以降は 5 日予報のトレンドからの長期予測で、確定的な予報ではありません。",
  photoCredit: (name) => `写真 · ${name}`,
};

const ko: DeepPartial<WeatherUiCopy> = {
  pageTitle: "날씨",
  pageSubtitle: "시네마틱 예보와 실시간 날씨",
  loadingTitle: "날씨 불러오는 중…",
  errorTitle: "날씨를 불러올 수 없습니다",
  retry: "다시 시도",
  locationPermissionPrompt: "정확한 날씨를 위해 위치 접근을 허용하세요",
  useMyLocation: "내 위치 사용",
  feelsLike: (t) => `체감 ${t}°`,
  highLow: (h, l) => `최고 ${h}° / 최저 ${l}°`,
  updatedJustNow: "방금 업데이트",
  updatedAt: (label) => `${label} 업데이트`,
  precisionGps: "GPS 위치",
  precisionDistrict: "지역 예보",
  precisionNearestStation: "가까운 관측소",
  precisionCity: "도시 예보",
  precisionManual: "수동 선택 위치",
  precisionFallback: "대략 위치",
  aiBriefTitle: "AI 핵심 브리프",
  searchPlaceholder: "도시 또는 지역 검색…",
  searchEmpty: "검색 결과 없음",
  searchError: "검색 실패",
  recentLocations: "최근",
  clearSelectedLocation: "선택 해제",
  metricUvIndex: "자외선 지수",
  metricHumidity: "습도",
  metricWind: "바람",
  metricRainChance: "강수 확률",
  metricVisibility: "가시거리",
  metricPressure: "기압",
  metricDewPoint: "이슬점",
  metricAirQuality: "대기질",
  uvLow: "낮음",
  uvModerate: "보통",
  uvHigh: "높음",
  uvVeryHigh: "매우 높음",
  uvExtreme: "위험",
  radarTitle: "실시간 레이더",
  radarSatellite: "위성",
  radarStreet: "지도",
  radarComingSoon: "레이더 영상 준비 중 — 공급자 연동 대기",
  atmosphericInsightsTitle: "대기 정보",
  precipitationIntensityTitle: "강수 강도",
  smartRemindersTitle: "스마트 알림",
  aiImpactTitle: "AI 날씨 영향",
  impactCommute: "출퇴근",
  impactExercise: "운동",
  impactClothing: "복장",
  impactOutdoor: "야외",
  impactTravel: "여행",
  impactHealth: "건강",
  temperatureTrendTitle: "기온 추이",
  precipitationTrendTitle: "강수 추이",
  next24h: "향후 24시간",
  forecastToday: "오늘",
  forecast7Days: "7일",
  forecast10Days: "10일",
  forecast15Days: "15일",
  forecastNow: "지금",
  confidenceHigh: "높은 신뢰도",
  confidenceMedium: "보통 신뢰도",
  confidenceLow: "장기 전망",
  extendedOutlookNotice:
    "6일차 이후는 5일 예보 트렌드에서 추정한 장기 전망이며 확정 예보가 아닙니다.",
  photoCredit: (name) => `사진 · ${name}`,
};

const fr: DeepPartial<WeatherUiCopy> = {
  pageTitle: "Météo",
  pageSubtitle: "Prévisions cinématiques et conditions actuelles",
  loadingTitle: "Chargement de la météo…",
  errorTitle: "Météo indisponible",
  retry: "Réessayer",
  locationPermissionPrompt: "Autorisez la localisation pour une météo précise",
  useMyLocation: "Utiliser ma position",
  feelsLike: (t) => `Ressenti ${t}°`,
  highLow: (h, l) => `Max: ${h}° Min: ${l}°`,
  updatedJustNow: "Mis à jour à l'instant",
  updatedAt: (label) => `Mis à jour à ${label}`,
  precisionGps: "Position GPS",
  precisionDistrict: "Prévision par quartier",
  precisionNearestStation: "Station la plus proche",
  precisionCity: "Prévision par ville",
  precisionManual: "Lieu sélectionné",
  precisionFallback: "Position approximative",
  aiBriefTitle: "Brief exécutif IA",
  searchPlaceholder: "Rechercher une ville ou un quartier…",
  searchEmpty: "Aucun résultat",
  searchError: "Échec de la recherche",
  recentLocations: "Récents",
  clearSelectedLocation: "Effacer la sélection",
  metricUvIndex: "Indice UV",
  metricHumidity: "Humidité",
  metricWind: "Vent",
  metricRainChance: "Pluie",
  metricVisibility: "Visibilité",
  metricPressure: "Pression",
  metricDewPoint: "Point de rosée",
  metricAirQuality: "Qualité de l'air",
  uvLow: "Faible",
  uvModerate: "Modéré",
  uvHigh: "Élevé",
  uvVeryHigh: "Très élevé",
  uvExtreme: "Extrême",
  radarTitle: "Radar en direct",
  radarSatellite: "Satellite",
  radarStreet: "Carte",
  radarComingSoon: "Imagerie radar bientôt — intégration en cours",
  atmosphericInsightsTitle: "Analyses atmosphériques",
  precipitationIntensityTitle: "Intensité des précipitations",
  smartRemindersTitle: "Rappels intelligents",
  aiImpactTitle: "Impact météo IA",
  impactCommute: "Trajet",
  impactExercise: "Sport",
  impactClothing: "Vêtements",
  impactOutdoor: "Extérieur",
  impactTravel: "Voyage",
  impactHealth: "Santé",
  temperatureTrendTitle: "Évolution de la température",
  precipitationTrendTitle: "Évolution des précipitations",
  next24h: "24 prochaines heures",
  forecastToday: "Aujourd'hui",
  forecast7Days: "7 jours",
  forecast10Days: "10 jours",
  forecast15Days: "15 jours",
  forecastNow: "Maintenant",
  confidenceHigh: "Fiabilité haute",
  confidenceMedium: "Fiabilité moyenne",
  confidenceLow: "Perspective étendue",
  extendedOutlookNotice:
    "À partir du 6e jour, il s'agit d'une perspective dérivée des 5 jours réels, à interpréter avec prudence.",
  photoCredit: (name) => `Photo · ${name}`,
};

const it: DeepPartial<WeatherUiCopy> = {
  pageTitle: "Meteo",
  pageSubtitle: "Previsioni cinematografiche e condizioni in tempo reale",
  loadingTitle: "Caricamento meteo…",
  errorTitle: "Meteo non disponibile",
  retry: "Riprova",
  locationPermissionPrompt: "Consenti la posizione per un meteo accurato",
  useMyLocation: "Usa la mia posizione",
  feelsLike: (t) => `Percepiti ${t}°`,
  highLow: (h, l) => `Max: ${h}° Min: ${l}°`,
  updatedJustNow: "Aggiornato ora",
  updatedAt: (label) => `Aggiornato alle ${label}`,
  precisionGps: "Posizione GPS",
  precisionDistrict: "Previsione di quartiere",
  precisionNearestStation: "Stazione più vicina",
  precisionCity: "Previsione cittadina",
  precisionManual: "Posizione selezionata",
  precisionFallback: "Posizione approssimativa",
  aiBriefTitle: "Brief esecutivo IA",
  searchPlaceholder: "Cerca città o quartiere…",
  searchEmpty: "Nessun risultato",
  searchError: "Ricerca non riuscita",
  recentLocations: "Recenti",
  clearSelectedLocation: "Rimuovi selezione",
  metricUvIndex: "Indice UV",
  metricHumidity: "Umidità",
  metricWind: "Vento",
  metricRainChance: "Pioggia",
  metricVisibility: "Visibilità",
  metricPressure: "Pressione",
  metricDewPoint: "Punto di rugiada",
  metricAirQuality: "Qualità dell'aria",
  uvLow: "Basso",
  uvModerate: "Moderato",
  uvHigh: "Alto",
  uvVeryHigh: "Molto alto",
  uvExtreme: "Estremo",
  radarTitle: "Radar in diretta",
  radarSatellite: "Satellite",
  radarStreet: "Mappa",
  radarComingSoon: "Immagini radar in arrivo — integrazione in corso",
  atmosphericInsightsTitle: "Analisi atmosferiche",
  precipitationIntensityTitle: "Intensità precipitazioni",
  smartRemindersTitle: "Promemoria intelligenti",
  aiImpactTitle: "Impatto meteo IA",
  impactCommute: "Spostamenti",
  impactExercise: "Allenamento",
  impactClothing: "Abbigliamento",
  impactOutdoor: "All'aperto",
  impactTravel: "Viaggio",
  impactHealth: "Salute",
  temperatureTrendTitle: "Andamento temperatura",
  precipitationTrendTitle: "Andamento precipitazioni",
  next24h: "Prossime 24 ore",
  forecastToday: "Oggi",
  forecast7Days: "7 giorni",
  forecast10Days: "10 giorni",
  forecast15Days: "15 giorni",
  forecastNow: "Ora",
  confidenceHigh: "Affidabilità alta",
  confidenceMedium: "Affidabilità media",
  confidenceLow: "Previsione estesa",
  extendedOutlookNotice:
    "Dal 6° giorno è una previsione estesa derivata dal trend a 5 giorni; non è una previsione certa.",
  photoCredit: (name) => `Foto · ${name}`,
};

const es: DeepPartial<WeatherUiCopy> = {
  pageTitle: "Clima",
  pageSubtitle: "Previsiones cinematográficas y condiciones actuales",
  loadingTitle: "Cargando el clima…",
  errorTitle: "Clima no disponible",
  retry: "Reintentar",
  locationPermissionPrompt: "Permite la ubicación para un clima preciso",
  useMyLocation: "Usar mi ubicación",
  feelsLike: (t) => `Sensación ${t}°`,
  highLow: (h, l) => `Máx: ${h}° Mín: ${l}°`,
  updatedJustNow: "Actualizado ahora",
  updatedAt: (label) => `Actualizado a las ${label}`,
  precisionGps: "Ubicación GPS",
  precisionDistrict: "Pronóstico por distrito",
  precisionNearestStation: "Estación más cercana",
  precisionCity: "Pronóstico de ciudad",
  precisionManual: "Ubicación seleccionada",
  precisionFallback: "Ubicación aproximada",
  aiBriefTitle: "Resumen ejecutivo IA",
  searchPlaceholder: "Buscar ciudad o distrito…",
  searchEmpty: "Sin resultados",
  searchError: "Búsqueda fallida",
  recentLocations: "Recientes",
  clearSelectedLocation: "Borrar selección",
  metricUvIndex: "Índice UV",
  metricHumidity: "Humedad",
  metricWind: "Viento",
  metricRainChance: "Lluvia",
  metricVisibility: "Visibilidad",
  metricPressure: "Presión",
  metricDewPoint: "Punto de rocío",
  metricAirQuality: "Calidad del aire",
  uvLow: "Bajo",
  uvModerate: "Moderado",
  uvHigh: "Alto",
  uvVeryHigh: "Muy alto",
  uvExtreme: "Extremo",
  radarTitle: "Radar en vivo",
  radarSatellite: "Satélite",
  radarStreet: "Mapa",
  radarComingSoon: "Imágenes de radar próximamente — pendiente de integración",
  atmosphericInsightsTitle: "Análisis atmosférico",
  precipitationIntensityTitle: "Intensidad de precipitación",
  smartRemindersTitle: "Recordatorios inteligentes",
  aiImpactTitle: "Impacto climático IA",
  impactCommute: "Trayecto",
  impactExercise: "Ejercicio",
  impactClothing: "Ropa",
  impactOutdoor: "Exterior",
  impactTravel: "Viaje",
  impactHealth: "Salud",
  temperatureTrendTitle: "Tendencia de temperatura",
  precipitationTrendTitle: "Tendencia de precipitación",
  next24h: "Próximas 24 horas",
  forecastToday: "Hoy",
  forecast7Days: "7 días",
  forecast10Days: "10 días",
  forecast15Days: "15 días",
  forecastNow: "Ahora",
  confidenceHigh: "Alta confianza",
  confidenceMedium: "Confianza media",
  confidenceLow: "Perspectiva extendida",
  extendedOutlookNotice:
    "A partir del 6° día es una perspectiva extendida basada en la tendencia de 5 días; no es un pronóstico firme.",
  photoCredit: (name) => `Foto · ${name}`,
};

const vi: DeepPartial<WeatherUiCopy> = {
  pageTitle: "Thời tiết",
  pageSubtitle: "Dự báo điện ảnh và điều kiện hiện tại",
  loadingTitle: "Đang tải thời tiết…",
  errorTitle: "Không có dữ liệu thời tiết",
  retry: "Thử lại",
  locationPermissionPrompt: "Cho phép định vị để có thời tiết chính xác",
  useMyLocation: "Dùng vị trí của tôi",
  feelsLike: (t) => `Cảm giác như ${t}°`,
  highLow: (h, l) => `Cao: ${h}° Thấp: ${l}°`,
  updatedJustNow: "Vừa cập nhật",
  updatedAt: (label) => `Cập nhật lúc ${label}`,
  precisionGps: "Vị trí GPS",
  precisionDistrict: "Dự báo theo quận",
  precisionNearestStation: "Trạm gần nhất",
  precisionCity: "Dự báo theo thành phố",
  precisionManual: "Vị trí đã chọn",
  precisionFallback: "Vị trí gần đúng",
  aiBriefTitle: "Tóm tắt AI",
  searchPlaceholder: "Tìm thành phố hoặc quận…",
  searchEmpty: "Không có kết quả",
  searchError: "Tìm kiếm thất bại",
  recentLocations: "Gần đây",
  clearSelectedLocation: "Bỏ chọn",
  metricUvIndex: "Chỉ số UV",
  metricHumidity: "Độ ẩm",
  metricWind: "Gió",
  metricRainChance: "Khả năng mưa",
  metricVisibility: "Tầm nhìn",
  metricPressure: "Áp suất",
  metricDewPoint: "Điểm sương",
  metricAirQuality: "Chất lượng không khí",
  uvLow: "Thấp",
  uvModerate: "Trung bình",
  uvHigh: "Cao",
  uvVeryHigh: "Rất cao",
  uvExtreme: "Cực đoan",
  radarTitle: "Radar trực tiếp",
  radarSatellite: "Vệ tinh",
  radarStreet: "Bản đồ",
  radarComingSoon: "Hình ảnh radar sắp ra mắt — đang tích hợp",
  atmosphericInsightsTitle: "Phân tích khí quyển",
  precipitationIntensityTitle: "Cường độ mưa",
  smartRemindersTitle: "Nhắc nhở thông minh",
  aiImpactTitle: "Ảnh hưởng thời tiết AI",
  impactCommute: "Đi lại",
  impactExercise: "Tập luyện",
  impactClothing: "Trang phục",
  impactOutdoor: "Ngoài trời",
  impactTravel: "Du lịch",
  impactHealth: "Sức khỏe",
  temperatureTrendTitle: "Xu hướng nhiệt độ",
  precipitationTrendTitle: "Xu hướng mưa",
  next24h: "24 giờ tới",
  forecastToday: "Hôm nay",
  forecast7Days: "7 ngày",
  forecast10Days: "10 ngày",
  forecast15Days: "15 ngày",
  forecastNow: "Bây giờ",
  confidenceHigh: "Độ tin cậy cao",
  confidenceMedium: "Độ tin cậy trung bình",
  confidenceLow: "Triển vọng mở rộng",
  extendedOutlookNotice:
    "Từ ngày 6 trở đi là triển vọng mở rộng, suy ra từ xu hướng 5 ngày và không phải dự báo chắc chắn.",
  photoCredit: (name) => `Ảnh · ${name}`,
};

const localizedCopy = createLocaleCopyMap<WeatherUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getWeatherUiCopy(locale: AppLocale): WeatherUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}

// Quiet unused-types warning during phase A; helper-types kept for future
// use in component prop overrides.
export type WeatherUiOverride = DeepPartial<WeatherUiCopy>;
