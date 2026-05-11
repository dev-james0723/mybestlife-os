import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";

export type SettingsUiCopy = {
  pageTitle: string;
  pageDescription: string;
  userPreferencesTitle: string;
  userPreferencesDescription: string;
  languageLabel: string;
  themeLabel: string;
  timezoneLabel: string;
  timezoneAutomatic: string;
  themeLight: string;
  themeDark: string;
  savePreferences: string;
  saving: string;
  notificationsTitle: string;
  notificationsDescription: string;
  taskRemindersTitle: string;
  taskRemindersDescription: string;
  dailySummaryTitle: string;
  dailySummaryDescription: string;
  studyStreakTitle: string;
  studyStreakDescription: string;
  aboutSectionTitle: string;
  aboutSectionDescription: string;
  privacyPolicyLink: string;
  privacyPolicyHint: string;
  versionLabel: string;
  profileAvatarAriaLabel: string;
  profileAvatarSavedToast: string;
  profileAvatarUploadFailedToast: string;
  profileAvatarInvalidType: string;
  profileAvatarTooLarge: string;
  settingsLoadErrorTitle: string;
  settingsLoadErrorDescription: string;
  settingsRetry: string;
  toastPreferencesSaved: string;
  toastPreferencesFailed: string;
  toastNotificationsSaved: string;
  toastNotificationsFailed: string;
  googleCalendarTitle: string;
  googleCalendarDescription: string;
  googleCalendarPlannerBlurb: string;
  googleCalendarConnect: string;
  googleCalendarConnecting: string;
  googleCalendarSetupTitle: string;
  googleCalendarSetupStepSupabase: string;
  googleCalendarSetupStepGoogleCloud: string;
  googleCalendarSetupStepConsent: string;
  googleCalendarGoPlanner: string;
  googleCalendarConnectFailed: string;
  blockMinutesTitle: string;
  blockMinutesDescription: string;
  blockMinutesLabel: string;
  blockMinutesUnit: string;
  blockMinutesNextDayWarning: string;
  weatherLocationTitle: string;
  weatherLocationDescription: string;
  weatherLocationCurrent: string;
  weatherLocationNotSet: string;
  weatherLocationUseDevice: string;
  weatherLocationSaving: string;
  weatherLocationDeniedOrUnavailable: string;
  weatherLocationSaved: string;
};

const m: Record<AppLocale, SettingsUiCopy> = {
  en: {
    pageTitle: "Settings",
    pageDescription: "Profile preferences and notifications",
    userPreferencesTitle: "User preferences",
    userPreferencesDescription:
      "Language, appearance, your timezone, and a pinned map point for the top-bar weather.",
    languageLabel: "Language",
    themeLabel: "Theme",
    timezoneLabel: "Timezone",
    timezoneAutomatic: "Automatic (device)",
    themeLight: "Light",
    themeDark: "Dark",
    savePreferences: "Save preferences",
    saving: "Saving...",
    notificationsTitle: "Notifications",
    notificationsDescription: "Choose what you want to be reminded about.",
    taskRemindersTitle: "Task reminders",
    taskRemindersDescription: "Nudges for upcoming and overdue tasks",
    dailySummaryTitle: "Daily summary",
    dailySummaryDescription: "A digest of your day across modules",
    studyStreakTitle: "Study streak reminders",
    studyStreakDescription: "Keep your Japanese study habit on track",
    aboutSectionTitle: "About My Best Life OS",
    aboutSectionDescription:
      "Your personal operating system for planning, habits, finance, study, and reflection—all in one calm workspace.",
    privacyPolicyLink: "Privacy policy",
    privacyPolicyHint: "What we collect, how we use it, and your choices",
    versionLabel: "App version",
    profileAvatarAriaLabel: "Upload profile picture",
    profileAvatarSavedToast: "Profile photo updated",
    profileAvatarUploadFailedToast: "Could not upload photo",
    profileAvatarInvalidType: "Please choose a JPEG, PNG, WebP, or GIF image",
    profileAvatarTooLarge: "Image must be 5 MB or smaller",
    settingsLoadErrorTitle: "Couldn't load settings",
    settingsLoadErrorDescription:
      "Something went wrong while loading your preferences. Please try again.",
    settingsRetry: "Try again",
    toastPreferencesSaved: "Preferences saved",
    toastPreferencesFailed: "Failed to save preferences",
    toastNotificationsSaved: "Notification settings saved",
    toastNotificationsFailed: "Failed to save notifications",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  "zh-TW": {
    pageTitle: "設定",
    pageDescription: "個人偏好與通知",
    userPreferencesTitle: "使用者偏好",
    userPreferencesDescription: "語言、外觀、時區，以及頂部天氣所用嘅固定位置。",
    languageLabel: "語言",
    themeLabel: "主題",
    timezoneLabel: "時區",
    timezoneAutomatic: "自動（跟隨裝置）",
    themeLight: "淺色",
    themeDark: "深色",
    savePreferences: "儲存偏好",
    saving: "儲存中…",
    notificationsTitle: "通知",
    notificationsDescription: "選擇你想收到提醒的項目。",
    taskRemindersTitle: "任務提醒",
    taskRemindersDescription: "即將到期與逾期任務的提示",
    dailySummaryTitle: "每日摘要",
    dailySummaryDescription: "橫跨各模組的一日回顧",
    studyStreakTitle: "學習連續提醒",
    studyStreakDescription: "維持日語學習習慣",
    aboutSectionTitle: "關於理想人生 OS",
    aboutSectionDescription:
      "你的個人生活作業系統：規劃、習慣、財務、學習與反思，集中在一個簡潔的空間。",
    privacyPolicyLink: "隱私權政策",
    privacyPolicyHint: "我們收集哪些資料、如何使用，以及你的選擇",
    versionLabel: "應用程式版本",
    profileAvatarAriaLabel: "上傳個人頭像",
    profileAvatarSavedToast: "頭像已更新",
    profileAvatarUploadFailedToast: "無法上傳照片",
    profileAvatarInvalidType: "請選擇 JPEG、PNG、WebP 或 GIF 圖片",
    profileAvatarTooLarge: "圖片大小需為 5 MB 以下",
    settingsLoadErrorTitle: "無法載入設定",
    settingsLoadErrorDescription: "載入偏好設定時發生問題，請再試一次。",
    settingsRetry: "重試",
    toastPreferencesSaved: "偏好已儲存",
    toastPreferencesFailed: "儲存偏好失敗",
    toastNotificationsSaved: "通知設定已儲存",
    toastNotificationsFailed: "儲存通知設定失敗",
    googleCalendarTitle: "Google 日曆",
    googleCalendarDescription:
      "允許 My Best Life OS 將「每日規劃」的時間軸，建立到你 Google 帳戶的主要日曆。",
    googleCalendarPlannerBlurb:
      "在每日規劃頁按「同步到 Google 日曆」，即可把當日排程一鍵匯出成有起迄時間的活動。",
    googleCalendarConnect: "連結 Google 日曆",
    googleCalendarConnecting: "正在開啟 Google…",
    googleCalendarSetupTitle: "首次設定（專案管理員）",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google：設定 Web Client ID／Secret；Redirect URLs 需包含應用程式的 /callback。",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → 啟用「Google Calendar API」；OAuth 同意畫面須加入 …/auth/calendar.events 範圍（測試使用者或正式版）。",
    googleCalendarSetupStepConsent:
      "按下連結後，Google 會要求日曆權限；完成後回到每日規劃再按一次同步即可。",
    googleCalendarGoPlanner: "開啟每日規劃",
    googleCalendarConnectFailed: "無法開始 Google 連線，請先確認已登入。",
    blockMinutesTitle: "時間塊長度",
    blockMinutesDescription: "每日規劃中，每個時間塊所代表的分鐘數。",
    blockMinutesLabel: "每塊分鐘數",
    blockMinutesUnit: "分鐘",
    blockMinutesNextDayWarning: "此變更將於明天的規劃開始生效。",
    weatherLocationTitle: "天氣位置",
    weatherLocationDescription:
      "用於頂部天氣膠囊（OpenWeather）。固定一個地點，就不必只靠 IP 估計位置。",
    weatherLocationCurrent: "已釘選座標",
    weatherLocationNotSet: "尚未設定",
    weatherLocationUseDevice: "使用此裝置目前位置",
    weatherLocationSaving: "正在儲存位置…",
    weatherLocationDeniedOrUnavailable: "無法讀取位置，請檢查瀏覽器權限或再試一次。",
    weatherLocationSaved: "天氣位置已更新",
  },
  "zh-CN": {
    pageTitle: "设置",
    pageDescription: "个人偏好与通知",
    userPreferencesTitle: "用户偏好",
    userPreferencesDescription: "语言、外观、本地时区，以及顶部天气使用的固定地点。",
    languageLabel: "语言",
    themeLabel: "主题",
    timezoneLabel: "时区",
    timezoneAutomatic: "自动（跟随设备）",
    themeLight: "浅色",
    themeDark: "深色",
    savePreferences: "保存偏好",
    saving: "保存中…",
    notificationsTitle: "通知",
    notificationsDescription: "选择你想接收的提醒。",
    taskRemindersTitle: "任务提醒",
    taskRemindersDescription: "即将到期与逾期任务的提示",
    dailySummaryTitle: "每日摘要",
    dailySummaryDescription: "跨模块的一日回顾",
    studyStreakTitle: "学习连续提醒",
    studyStreakDescription: "保持日语学习习惯",
    aboutSectionTitle: "关于理想人生 OS",
    aboutSectionDescription: "你的个人生活操作系统：规划、习惯、财务、学习与反思，集中在一处。",
    privacyPolicyLink: "隐私政策",
    privacyPolicyHint: "我们收集什么、如何使用，以及你的选择",
    versionLabel: "应用版本",
    profileAvatarAriaLabel: "上传个人头像",
    profileAvatarSavedToast: "头像已更新",
    profileAvatarUploadFailedToast: "无法上传照片",
    profileAvatarInvalidType: "请选择 JPEG、PNG、WebP 或 GIF 图片",
    profileAvatarTooLarge: "图片大小需在 5 MB 以内",
    settingsLoadErrorTitle: "无法加载设置",
    settingsLoadErrorDescription: "加载偏好设置时出现问题，请重试。",
    settingsRetry: "重试",
    toastPreferencesSaved: "偏好已保存",
    toastPreferencesFailed: "保存偏好失败",
    toastNotificationsSaved: "通知设置已保存",
    toastNotificationsFailed: "保存通知设置失败",
    googleCalendarTitle: "Google 日历",
    googleCalendarDescription:
      "允许 My Best Life OS 将「每日规划」的时间线创建到你 Google 账户的主日历。",
    googleCalendarPlannerBlurb:
      "在每日规划页点击「同步到 Google 日历」，即可把当天排程导出为带起止时间的活动。",
    googleCalendarConnect: "连接 Google 日历",
    googleCalendarConnecting: "正在打开 Google…",
    googleCalendarSetupTitle: "首次设置（项目管理员）",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google：配置 Web Client ID／Secret；Redirect URLs 需包含应用的 /callback。",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → 启用「Google Calendar API」；OAuth 同意屏幕需包含 …/auth/calendar.events 范围。",
    googleCalendarSetupStepConsent:
      "点击连接后，Google 会请求日历权限；完成后回到每日规划再次同步即可。",
    googleCalendarGoPlanner: "打开每日规划",
    googleCalendarConnectFailed: "无法开始 Google 连接，请先登录。",
    blockMinutesTitle: "时间块长度",
    blockMinutesDescription: "每日规划中，每个时间块所代表的分钟数。",
    blockMinutesLabel: "每块分钟数",
    blockMinutesUnit: "分钟",
    blockMinutesNextDayWarning: "此变更将于明天的规划开始生效。",
    weatherLocationTitle: "天气位置",
    weatherLocationDescription:
      "用于顶部天气条（OpenWeather）。固定一个地点，而不只依赖 IP 估算位置。",
    weatherLocationCurrent: "已固定坐标",
    weatherLocationNotSet: "尚未设置",
    weatherLocationUseDevice: "使用本设备当前位置",
    weatherLocationSaving: "正在保存位置…",
    weatherLocationDeniedOrUnavailable: "无法读取位置，请检查浏览器权限或重试。",
    weatherLocationSaved: "天气位置已更新",
  },
  ja: {
    pageTitle: "設定",
    pageDescription: "プロフィールと通知",
    userPreferencesTitle: "ユーザー設定",
    userPreferencesDescription: "言語、外観、タイムゾーン。",
    languageLabel: "言語",
    themeLabel: "テーマ",
    timezoneLabel: "タイムゾーン",
    timezoneAutomatic: "自動（端末の設定に合わせる）",
    themeLight: "ライト",
    themeDark: "ダーク",
    savePreferences: "設定を保存",
    saving: "保存中…",
    notificationsTitle: "通知",
    notificationsDescription: "受け取りたいリマインダーを選びます。",
    taskRemindersTitle: "タスクリマインダー",
    taskRemindersDescription: "期限が近い／期限切れタスクの通知",
    dailySummaryTitle: "デイリーサマリー",
    dailySummaryDescription: "モジュール横断の1日の要約",
    studyStreakTitle: "学習ストリークのリマインダー",
    studyStreakDescription: "日本語学習の習慣を維持",
    aboutSectionTitle: "My Best Life OS について",
    aboutSectionDescription:
      "計画、習慣、家計、学習、振り返りをまとめる、あなた専用のライフOSです。",
    privacyPolicyLink: "プライバシーポリシー",
    privacyPolicyHint: "データの取り扱いと、あなたの選択肢について",
    versionLabel: "アプリのバージョン",
    profileAvatarAriaLabel: "プロフィール写真をアップロード",
    profileAvatarSavedToast: "プロフィール写真を更新しました",
    profileAvatarUploadFailedToast: "写真をアップロードできませんでした",
    profileAvatarInvalidType: "JPEG、PNG、WebP、または GIF を選んでください",
    profileAvatarTooLarge: "ファイルサイズは 5 MB 以下にしてください",
    settingsLoadErrorTitle: "設定を読み込めませんでした",
    settingsLoadErrorDescription: "設定の読み込み中に問題が発生しました。もう一度お試しください。",
    settingsRetry: "再試行",
    toastPreferencesSaved: "設定を保存しました",
    toastPreferencesFailed: "設定の保存に失敗しました",
    toastNotificationsSaved: "通知設定を保存しました",
    toastNotificationsFailed: "通知設定の保存に失敗しました",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  ko: {
    pageTitle: "설정",
    pageDescription: "프로필 환경설정과 알림",
    userPreferencesTitle: "사용자 환경설정",
    userPreferencesDescription: "언어, 모양, 현지 시간대.",
    languageLabel: "언어",
    themeLabel: "테마",
    timezoneLabel: "시간대",
    timezoneAutomatic: "자동(기기 설정 따름)",
    themeLight: "라이트",
    themeDark: "다크",
    savePreferences: "환경설정 저장",
    saving: "저장 중…",
    notificationsTitle: "알림",
    notificationsDescription: "받고 싶은 알림을 선택하세요.",
    taskRemindersTitle: "작업 알림",
    taskRemindersDescription: "예정 및 지연 작업 알림",
    dailySummaryTitle: "일일 요약",
    dailySummaryDescription: "모듈 전반의 하루 요약",
    studyStreakTitle: "학습 연속 알림",
    studyStreakDescription: "일본어 학습 습관 유지",
    aboutSectionTitle: "My Best Life OS 정보",
    aboutSectionDescription:
      "계획, 습관, 재정, 학습, 성찰을 한곳에서 다루는 나만의 라이프 운영체제입니다.",
    privacyPolicyLink: "개인정보 처리방침",
    privacyPolicyHint: "수집하는 정보, 이용 방식, 그리고 선택권",
    versionLabel: "앱 버전",
    profileAvatarAriaLabel: "프로필 사진 업로드",
    profileAvatarSavedToast: "프로필 사진이 업데이트되었습니다",
    profileAvatarUploadFailedToast: "사진을 업로드할 수 없습니다",
    profileAvatarInvalidType: "JPEG, PNG, WebP 또는 GIF 이미지를 선택하세요",
    profileAvatarTooLarge: "이미지는 5 MB 이하여야 합니다",
    settingsLoadErrorTitle: "설정을 불러올 수 없습니다",
    settingsLoadErrorDescription: "환경설정을 불러오는 중 문제가 발생했습니다. 다시 시도해 주세요.",
    settingsRetry: "다시 시도",
    toastPreferencesSaved: "환경설정이 저장되었습니다",
    toastPreferencesFailed: "환경설정 저장에 실패했습니다",
    toastNotificationsSaved: "알림 설정이 저장되었습니다",
    toastNotificationsFailed: "알림 설정 저장에 실패했습니다",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  fr: {
    pageTitle: "Paramètres",
    pageDescription: "Préférences du profil et notifications",
    userPreferencesTitle: "Préférences utilisateur",
    userPreferencesDescription: "Langue, apparence et fuseau horaire local.",
    languageLabel: "Langue",
    themeLabel: "Thème",
    timezoneLabel: "Fuseau horaire",
    timezoneAutomatic: "Automatique (appareil)",
    themeLight: "Clair",
    themeDark: "Sombre",
    savePreferences: "Enregistrer les préférences",
    saving: "Enregistrement…",
    notificationsTitle: "Notifications",
    notificationsDescription: "Choisissez ce dont vous voulez être rappelé.",
    taskRemindersTitle: "Rappels de tâches",
    taskRemindersDescription: "Pour les tâches à venir et en retard",
    dailySummaryTitle: "Résumé quotidien",
    dailySummaryDescription: "Un résumé de votre journée dans les modules",
    studyStreakTitle: "Rappels de série d’étude",
    studyStreakDescription: "Gardez le cap sur l’étude du japonais",
    aboutSectionTitle: "À propos de My Best Life OS",
    aboutSectionDescription:
      "Votre système d’exploitation personnel pour planifier, suivre vos habitudes, vos finances, vos études et vos bilans.",
    privacyPolicyLink: "Politique de confidentialité",
    privacyPolicyHint: "Données collectées, utilisation et vos choix",
    versionLabel: "Version de l’app",
    profileAvatarAriaLabel: "Téléverser une photo de profil",
    profileAvatarSavedToast: "Photo de profil mise à jour",
    profileAvatarUploadFailedToast: "Impossible de téléverser la photo",
    profileAvatarInvalidType: "Choisissez une image JPEG, PNG, WebP ou GIF",
    profileAvatarTooLarge: "L’image doit faire 5 Mo ou moins",
    settingsLoadErrorTitle: "Impossible de charger les paramètres",
    settingsLoadErrorDescription:
      "Un problème est survenu lors du chargement de vos préférences. Veuillez réessayer.",
    settingsRetry: "Réessayer",
    toastPreferencesSaved: "Préférences enregistrées",
    toastPreferencesFailed: "Échec de l’enregistrement des préférences",
    toastNotificationsSaved: "Paramètres de notification enregistrés",
    toastNotificationsFailed: "Échec de l’enregistrement des notifications",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  it: {
    pageTitle: "Impostazioni",
    pageDescription: "Preferenze profilo e notifiche",
    userPreferencesTitle: "Preferenze utente",
    userPreferencesDescription: "Lingua, aspetto e fuso orario locale.",
    languageLabel: "Lingua",
    themeLabel: "Tema",
    timezoneLabel: "Fuso orario",
    timezoneAutomatic: "Automatico (dispositivo)",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    savePreferences: "Salva preferenze",
    saving: "Salvataggio…",
    notificationsTitle: "Notifiche",
    notificationsDescription: "Scegli di cosa vuoi essere ricordato.",
    taskRemindersTitle: "Promemoria attività",
    taskRemindersDescription: "Per attività in scadenza e in ritardo",
    dailySummaryTitle: "Riepilogo giornaliero",
    dailySummaryDescription: "Un riepilogo della giornata tra i moduli",
    studyStreakTitle: "Promemoria serie di studio",
    studyStreakDescription: "Mantieni l’abitudine allo studio del giapponese",
    aboutSectionTitle: "Informazioni su My Best Life OS",
    aboutSectionDescription:
      "Il tuo sistema operativo personale per pianificazione, abitudini, finanza, studio e riflessione.",
    privacyPolicyLink: "Informativa sulla privacy",
    privacyPolicyHint: "Cosa raccogliamo, come lo usiamo e le tue scelte",
    versionLabel: "Versione app",
    profileAvatarAriaLabel: "Carica foto profilo",
    profileAvatarSavedToast: "Foto profilo aggiornata",
    profileAvatarUploadFailedToast: "Impossibile caricare la foto",
    profileAvatarInvalidType: "Scegli un’immagine JPEG, PNG, WebP o GIF",
    profileAvatarTooLarge: "L’immagine deve essere di massimo 5 MB",
    settingsLoadErrorTitle: "Impossibile caricare le impostazioni",
    settingsLoadErrorDescription:
      "Si è verificato un problema durante il caricamento delle preferenze. Riprova.",
    settingsRetry: "Riprova",
    toastPreferencesSaved: "Preferenze salvate",
    toastPreferencesFailed: "Impossibile salvare le preferenze",
    toastNotificationsSaved: "Impostazioni di notifica salvate",
    toastNotificationsFailed: "Impossibile salvare le notifiche",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  es: {
    pageTitle: "Ajustes",
    pageDescription: "Preferencias del perfil y notificaciones",
    userPreferencesTitle: "Preferencias de usuario",
    userPreferencesDescription: "Idioma, apariencia y zona horaria local.",
    languageLabel: "Idioma",
    themeLabel: "Tema",
    timezoneLabel: "Zona horaria",
    timezoneAutomatic: "Automática (dispositivo)",
    themeLight: "Claro",
    themeDark: "Oscuro",
    savePreferences: "Guardar preferencias",
    saving: "Guardando…",
    notificationsTitle: "Notificaciones",
    notificationsDescription: "Elige de qué quieres recibir recordatorios.",
    taskRemindersTitle: "Recordatorios de tareas",
    taskRemindersDescription: "Para tareas próximas y atrasadas",
    dailySummaryTitle: "Resumen diario",
    dailySummaryDescription: "Un resumen de tu día entre módulos",
    studyStreakTitle: "Recordatorios de racha de estudio",
    studyStreakDescription: "Mantén el hábito de estudiar japonés",
    aboutSectionTitle: "Acerca de My Best Life OS",
    aboutSectionDescription:
      "Tu sistema operativo personal para planificar, hábitos, finanzas, estudio y reflexión en un solo espacio.",
    privacyPolicyLink: "Política de privacidad",
    privacyPolicyHint: "Qué datos recogemos, cómo los usamos y tus opciones",
    versionLabel: "Versión de la app",
    profileAvatarAriaLabel: "Subir foto de perfil",
    profileAvatarSavedToast: "Foto de perfil actualizada",
    profileAvatarUploadFailedToast: "No se pudo subir la foto",
    profileAvatarInvalidType: "Elige una imagen JPEG, PNG, WebP o GIF",
    profileAvatarTooLarge: "La imagen debe pesar como máximo 5 MB",
    settingsLoadErrorTitle: "No se pudieron cargar los ajustes",
    settingsLoadErrorDescription:
      "Hubo un problema al cargar tus preferencias. Inténtalo de nuevo.",
    settingsRetry: "Reintentar",
    toastPreferencesSaved: "Preferencias guardadas",
    toastPreferencesFailed: "No se pudieron guardar las preferencias",
    toastNotificationsSaved: "Ajustes de notificación guardados",
    toastNotificationsFailed: "No se pudieron guardar las notificaciones",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
  vi: {
    pageTitle: "Cài đặt",
    pageDescription: "Tùy chọn hồ sơ và thông báo",
    userPreferencesTitle: "Tùy chọn người dùng",
    userPreferencesDescription: "Ngôn ngữ, giao diện và múi giờ địa phương.",
    languageLabel: "Ngôn ngữ",
    themeLabel: "Giao diện",
    timezoneLabel: "Múi giờ",
    timezoneAutomatic: "Tự động (theo thiết bị)",
    themeLight: "Sáng",
    themeDark: "Tối",
    savePreferences: "Lưu tùy chọn",
    saving: "Đang lưu…",
    notificationsTitle: "Thông báo",
    notificationsDescription: "Chọn nội dung bạn muốn được nhắc.",
    taskRemindersTitle: "Nhắc việc",
    taskRemindersDescription: "Cho việc sắp đến hạn và quá hạn",
    dailySummaryTitle: "Tóm tắt hàng ngày",
    dailySummaryDescription: "Tóm tắt ngày của bạn trên các mô-đun",
    studyStreakTitle: "Nhắc chuỗi học",
    studyStreakDescription: "Duy trì thói quen học tiếng Nhật",
    aboutSectionTitle: "Giới thiệu My Best Life OS",
    aboutSectionDescription:
      "Hệ điều hành cuộc sống cá nhân của bạn: lập kế hoạch, thói quen, tài chính, học tập và nhìn lại—gọn trong một không gian.",
    privacyPolicyLink: "Chính sách quyền riêng tư",
    privacyPolicyHint: "Dữ liệu thu thập, cách dùng và quyền lựa chọn của bạn",
    versionLabel: "Phiên bản ứng dụng",
    profileAvatarAriaLabel: "Tải ảnh đại diện",
    profileAvatarSavedToast: "Đã cập nhật ảnh đại diện",
    profileAvatarUploadFailedToast: "Không thể tải ảnh lên",
    profileAvatarInvalidType: "Hãy chọn ảnh JPEG, PNG, WebP hoặc GIF",
    profileAvatarTooLarge: "Ảnh phải nhỏ hơn hoặc bằng 5 MB",
    settingsLoadErrorTitle: "Không tải được cài đặt",
    settingsLoadErrorDescription:
      "Đã xảy ra lỗi khi tải tùy chọn của bạn. Vui lòng thử lại.",
    settingsRetry: "Thử lại",
    toastPreferencesSaved: "Đã lưu tùy chọn",
    toastPreferencesFailed: "Không thể lưu tùy chọn",
    toastNotificationsSaved: "Đã lưu cài đặt thông báo",
    toastNotificationsFailed: "Không thể lưu thông báo",
    googleCalendarTitle: "Google Calendar",
    googleCalendarDescription:
      "Allow My Best Life OS to create events in your primary Google calendar from the Daily Planner.",
    googleCalendarPlannerBlurb:
      "On Daily Planner, use “Sync to Google Calendar” to push the current day’s timeline as timed events.",
    googleCalendarConnect: "Connect Google Calendar",
    googleCalendarConnecting: "Opening Google…",
    googleCalendarSetupTitle: "First-time setup (project admin)",
    googleCalendarSetupStepSupabase:
      "Supabase → Authentication → Providers → Google: ensure your Web client ID/secret are set; redirect URLs must include your app’s /callback.",
    googleCalendarSetupStepGoogleCloud:
      "Google Cloud Console → APIs & Services → enable “Google Calendar API”. OAuth consent screen must include the …/auth/calendar.events scope for your test users or production app.",
    googleCalendarSetupStepConsent:
      "After you tap Connect, Google asks for calendar access; then return to Daily Planner and sync again.",
    googleCalendarGoPlanner: "Open Daily Planner",
    googleCalendarConnectFailed: "Could not start Google connection. Try signing in first.",
    blockMinutesTitle: "Time Block Duration",
    blockMinutesDescription: "How many minutes each planning block represents in the Daily Planner.",
    blockMinutesLabel: "Minutes per block",
    blockMinutesUnit: "min",
    blockMinutesNextDayWarning: "This change will take effect starting tomorrow's plan.",
    weatherLocationTitle: "Weather location",
    weatherLocationDescription:
      "Used for the top-bar weather pill (OpenWeather). Pin a spot so we don't rely on IP geolocation.",
    weatherLocationCurrent: "Pinned coordinates",
    weatherLocationNotSet: "Not set yet",
    weatherLocationUseDevice: "Use current device location",
    weatherLocationSaving: "Saving location…",
    weatherLocationDeniedOrUnavailable:
      "Could not read your location. Check browser permissions or try again.",
    weatherLocationSaved: "Weather location updated",
  },
};

export function getSettingsUiCopy(locale: AppLocale): SettingsUiCopy {
  return m[locale] ?? m[DEFAULT_LOCALE];
}
