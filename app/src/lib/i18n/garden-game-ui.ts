import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

const en = {
  expand: "Expand garden", collapse: "Exit expanded garden",
  subtitle: "A little care. A little wonder. A garden that grows with you.",
  eyebrow: "YOUR LITTLE SANCTUARY", title: "Small steps. Wild blooms.",
  introduction: "Meet Sprout. Gather dew and bring three flower beds to life. A little adventure, just for today.",
  play: "Enter the garden", relaxed: "At your pace", challenge: "90-second challenge", daily: "Today’s trail",
  trails: ["Morning dew", "Petal paths", "The quiet grove", "Golden hour", "Little wonders", "Woodland wander", "A softer Sunday"],
  objective: "Bring 3 flower beds to life", instructions: "Gather dew · 2 drops per flower bed · Carry up to 3",
  controls: "Tap a place to walk · Arrow keys or WASD to move", help: "Guide Sprout", helpHint: "Choose a destination. Sprout walks there and tends automatically.",
  dew: "Dew", blooms: "Blooms", pause: "Pause adventure", resume: "Keep exploring", paused: "A little breather", pausedBody: "Your adventure is waiting right here.",
  restart: "Start again", replay: "Explore again", done: "Your garden is brighter.",
  doneBody: "Three little blooms, one small moment for you. Give your growing plant today’s water.",
  practiceDone: "A lovely little wander. Your plant has already had its water today.",
  timeout: "There’s still time to bloom.", timeoutBody: "Try a shorter route, or continue at your own pace. Your garden progress is safe.",
  continueRelaxed: "Continue without a timer", soundOn: "Turn sound on", soundOff: "Turn sound off", lowPower: "Battery saver", motion: "Gentle motion",
  settings: "Garden settings", closeSettings: "Close settings", settingsNote: "These preferences are saved on this device.",
  loading: "Growing your little world…", fallback: "Simple garden mode", fallbackBody: "3D is unavailable here. Guide Sprout with the destinations below; the same adventure and rewards are available.",
  retry3d: "Try 3D again", collect: "Gather dew", tend: "Tend bed", full: "Your can is full. Visit a flower bed.", needDew: "Gather two drops, then visit a flower bed.",
  pickup: "A drop of possibility.", bloom: "A little more life.", noRush: "No rush. Your plants keep their progress when you take a break.",
  plantTitle: "Growing with you", water: "Give today’s water", watered: "Cared for today", savePending: "Saving your care…", saveError: "Couldn’t save your care. Please try again.", saved: "Your plant’s growth is saved to your account.",
  quickCare: "Just here for a moment? Quick care counts, too.", seed: "Plant your first seed", seedBody: "Choose below to start a plant that grows with your daily care. You can explore first.",
  chooseSeed: "Choose a seed", harvest: "Add to collection", growth: "Growth", stage: "Stage", fullBloom: "In full bloom. Ready for your collection.",
  rhythm: "Your seven-day rhythm", rhythmHint: "Every day of care counts. There’s nothing to lose or catch up on.", days: "days tended", today: "Today", wateredDay: "Cared for", restDay: "Rest day", reset: "Daily trails and care refresh at 00:00 UTC.",
  lifeTitle: "Good for you. Good for your garden.", lifeBody: "A finished task or a journal entry gives Sprout a head start: one extra drop each, up to two.",
  task: "Finish one small task", journal: "Leave a thought in your journal", taskDone: "One small task, done", journalDone: "A moment of reflection, saved", activityError: "Life activity is unavailable. Your adventure still works.", activityRefresh: "Refresh activity", boost: "starting drops", nextTime: "New drops apply when you start your next adventure.",
  appearance: "Make yourself at home", meadow: "Meadow", lavender: "Lavender", autumn: "Golden grove", unlock: "care days to unlock", appearanceHint: "New palettes open with days of care. Your harvested plants also find a home on the island.",
  accountError: "Your garden couldn’t load", accountErrorBody: "Try again to load your saved plant and collection. You can still explore while the connection recovers.", retry: "Try again", accountLoading: "Loading your saved garden…",
  collection: "Your plants & supplies", growing: "Your growing plant", access: "Interactive 3D garden adventure", remaining: "seconds left", completed: "Complete", practice: "Free exploration", bestRoute: "Beautiful route", medal: "trail stars", meadowLocked: "Unlock with daily care", modeHint: "Both modes earn the same daily plant care.",
};
type Copy = typeof en;
const zh: Copy = {
  expand: "展開花園", collapse: "離開全螢幕花園",
  subtitle: "一點照顧，一點驚喜。讓花園陪你一起成長。", eyebrow: "你的小小天地", title: "小步前進，繁花盛開。",
  introduction: "認識小芽，收集露水，讓三個花圃綻放。今天，留一段小冒險給自己。", play: "走進花園", relaxed: "慢慢來", challenge: "90 秒挑戰", daily: "今日小徑",
  trails: ["晨間露水", "花瓣小徑", "靜謐樹林", "金色時光", "小小驚喜", "林間漫步", "溫柔星期天"], objective: "讓 3 個花圃綻放", instructions: "收集露水 · 每個花圃需要 2 滴 · 最多攜帶 3 滴",
  controls: "點一下目的地 · 方向鍵或 WASD 移動", help: "引導小芽", helpHint: "選擇目的地，小芽會走過去並自動照顧花圃。", dew: "露水", blooms: "花圃", pause: "暫停冒險", resume: "繼續探索", paused: "休息一下", pausedBody: "你的冒險會在這裡等你。", restart: "重新開始", replay: "再逛一會", done: "花園又亮了一點。", doneBody: "三個小花圃，一段屬於你的時光。給正在成長的植物澆水吧。", practiceDone: "愉快的小散步。你的植物今天已經喝過水了。",
  timeout: "花開，可以慢慢來。", timeoutBody: "試試更短的路線，或關掉計時慢慢走。花園的成長會保留。", continueRelaxed: "不計時，繼續探索", soundOn: "開啟音效", soundOff: "關閉音效", lowPower: "省電模式", motion: "減少動態", settings: "花園設定", closeSettings: "關閉設定", settingsNote: "這些偏好會儲存在這部裝置。", loading: "小小世界正在甦醒…", fallback: "簡易花園模式", fallbackBody: "這裡無法顯示 3D。你可以用下方目的地引導小芽，冒險和獎勵完全相同。", retry3d: "再次嘗試 3D", collect: "收集露水", tend: "照顧花圃", full: "水壺滿了，去照顧花圃吧。", needDew: "收集兩滴露水，再走到花圃。", pickup: "收下一點可能。", bloom: "又多一點生機。", noRush: "慢慢來。休息的日子，植物也會保留成長。",
  plantTitle: "和你一起成長", water: "給今天的水", watered: "今天已照顧", savePending: "儲存照顧紀錄…", saveError: "暫時無法儲存，請再試一次。", saved: "植物的成長已儲存到你的帳戶。", quickCare: "只想停留一下？簡單照顧也算數。", seed: "種下第一顆種子", seedBody: "在下方選擇植物，讓每天的照顧慢慢累積。也可以先去探索。", chooseSeed: "選擇種子", harvest: "加入收藏", growth: "成長", stage: "階段", fullBloom: "已經盛開，可以加入收藏了。", rhythm: "你的一週節奏", rhythmHint: "每一天的照顧都算數，不需要補進度。", days: "天照顧", today: "今天", wateredDay: "已照顧", restDay: "休息日", reset: "每日小徑及照顧於 UTC 00:00 更新。",
  lifeTitle: "照顧自己，也照顧花園。", lifeBody: "完成一項任務或寫一篇日記，分別為小芽準備一滴露水，最多兩滴。", task: "完成一項小任務", journal: "在日記留下一個想法", taskDone: "一項小任務，完成了", journalDone: "一段心情，留下了", activityError: "暫時無法讀取生活紀錄，仍然可以探索花園。", activityRefresh: "更新生活紀錄", boost: "滴起始露水", nextTime: "新露水會在下一次冒險開始時加入。", appearance: "布置你的小天地", meadow: "青草地", lavender: "薰衣草", autumn: "金色樹林", unlock: "天照顧後解鎖", appearanceHint: "照顧的日子會解鎖新配色，收成的植物也會住進島上。", accountError: "暫時無法載入花園", accountErrorBody: "再試一次，讀取已儲存的植物和收藏。連線恢復前仍可探索。", retry: "再試一次", accountLoading: "正在載入你的花園…", collection: "植物與物資", growing: "成長中的植物", access: "互動 3D 花園冒險", remaining: "秒剩餘", completed: "完成", practice: "自由探索", bestRoute: "精彩的小路線", medal: "顆小徑星星", meadowLocked: "每天照顧，慢慢解鎖", modeHint: "兩種模式都能獲得相同的每日照顧。",
};
const copies = createLocaleCopyMap<Copy>(en, { "zh-TW": zh, "zh-CN": zh });
export function getGardenGameCopy(locale: AppLocale): Copy { return copies[locale] ?? en; }
