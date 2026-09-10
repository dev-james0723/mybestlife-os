# Habit 與花園的日期契約

狀態：本機候選。日期程式、42 項原生 PostgreSQL 檢查、26 項 PGlite 檢查、12 項相關單元測試及 scoped TypeScript 已通過；原 Habits 頁五項瀏覽器流程及八項關聯回歸也已通過。沒有套用 production migration。

## 修正的實際問題

原 Habits 頁以裝置當地日期保存 `habit_completions.completion_date`，streak／heatmap 也按傳入的裝置 timezone 換算習慣建立日期。舊魚塘候選卻以 world/account timezone 選取 occurrence，並在 source trigger 用該世界時區判斷頻率。當帳戶選 Kiritimati、裝置位於 Honolulu，兩個日曆固定差一天；即使真實 Habits 保存成功，魚塘可能尋找另一日期，或把有效的隔日習慣誤判成未到日子。

另一个問題是凌晨保存、早上才選今日重點的 Habit，曾被 Garden 的 04:00 推薦分界拆成不同天。這不符合原模組的日曆語意。

## 採用的規則

1. 新選擇／新關聯 Habit 時，前端把裝置的 `source_calendar: { date, timezone }` 放進同一份 IndexedDB command。未知結果重試會重用原日期、時區與 UUID，不在 repository 發送時重新計算。
2. 伺服器接受有效 IANA zone，並用自己的現在時間換算該 zone 的日曆日期。送來的日期必須一致；任意過去／未來日期、額外時計欄位或無效 zone 均被拒絕。這是來源日曆描述，不是把 client clock 當完成證據。
3. 第一次選定或關聯時，伺服器驗證 Habit 所有權、連接同意、active／archive 狀態及該日的頻率。`every_n_days` 的起始日也使用同一個來源 zone。
4. 同一 Habit 小步調整標題、計畫日期或從另一時區再編輯，保留原 occurrence 和 `zone_at_selection`。已通過選擇驗證的小步不因之後更改頻率而被偷偷換日；新的小步仍重新檢查當前頻率。
5. 原 Habits 的保存 trigger 記錄擁有者、active Habit、明確完成日期與 `done` transition 的事實；它不猜測來源 timezone、不發建設機會。合資格日期在小步選擇／關聯時核對，領取時仍必須有同一 canonical receipt。非對應日期的已存事實不能確認本次小步。
6. Habit 的「完成後才選今日重點」使用來源日曆的午夜分界。Task／Gratitude 等既有 Garden 推薦窗口維持 04:00；world timezone、提醒 quiet hours 與 rolling 24／168 小時限額不被 Habit 選擇改寫。
7. canonical key 仍是帳戶下的 `habit:<id>:<completion_date>`，不加入 timezone 字串。相同 zone 的不同名稱、刪除打卡後重新建立、重試及關聯重複確認都不會創造新的同次權利。
8. 先前已保留、沒有 `source_calendar` 的候選 outbox command 依舊採舊 world/calendar 規則。已存在的 intention／grant 不重新定日，也不補發歷史獎勵。

## 離線與修正

如果選擇尚未在伺服器成功、離線後已跨入另一日，伺服器會拒絕過期的日期，畫面保留提出的操作並提供明確清除／重新選擇。若伺服器早已成功，重送同一 UUID 優先讀回成功結果，即使已跨日也不重新執行。

生活頁仍可記錄、取消及重新完成原來那一次 Habit。刪除／撤銷會修正 receipt 的可領狀態；已獲得的建造物件與歷史成果保留。這不驗證散步的真實時長，也不評價使用者的投入價值；新建 ID 或刻意把同一行動記成不同日期的語意重複仍不能完全自動辨識，整體發獎限額繼續適用。

## 證據與範圍

| 驗證 | 覆蓋 |
| --- | --- |
| `pond-calendar.test.ts` | 日期線、DST 跳時與重複小時、outbox 序列化保留日期、舊 command 相容 |
| `garden-pond-calendar-checks.mjs` | 八項原生 SQL 情境：來源／世界日期差異、隔日頻率、錯 occurrence、改計畫、午夜至早上、過期與偽造時計拒絕、關聯／時區別名去重、舊請求 |
| `concurrency/validation.json` | 42 項原生 PostgreSQL 檢查；其中 34 項為既有來源、權限、隱私及兩連線競態回歸 |
| `db/database-validation.json` | 26 項 PGlite 檢查，含 600 組客戶端／SQL 配置與路線對照 |
| `verify-garden-pond-calendar-ui.mjs` | 5／5 通過：原 Habits 頁操作 → 原 repository → 隔離 SQL → 花園確認／建造 → 原頁撤銷／重做 → 不同裝置日期讀回 |

瀏覽器 fixture 只替換 PostgREST 傳輸與登入測試身份，保留原頁、hook、repository payload、SQL trigger、權限與 Garden RPC。它不等於正式 Supabase auth／PostgREST、實體手機或所有 Habits 入口的驗收；counter、duration、routine/timer 等入口仍需按發布清單核對。


最新收據：`artifacts/garden-v3/habit-calendar-validation.json`。獨立候選 `/private/tmp/garden-calendar-verify-2xdsbkcc` 的 Garden、Dashboard、Habits 建置與 520 個程式／設定輸入已記錄；收據時只有共用工作目錄的 tsconfig.json 與候選不同。此輪沒有執行正式資料庫變更、push 或部署。

驗證中也修正了測試轉接層：PGlite 的 SQL DATE 必須轉成 PostgREST 的 YYYY-MM-DD，不能直接送成帶時間的 ISO 字串。建造檢查等待帳戶保存及已建物件出現，避免把預覽來源文字當成保存完成。原 Habits 的完成判斷沒有為測試放寬。
