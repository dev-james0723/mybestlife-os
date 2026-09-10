# MyBestLifeOS 公開發布前：產品、UX 與互動設計研究

日期：2026-09-07 · 狀態：研究完成／改善方案待實作 · 網站：<https://www.mybestlife-os.com>

閱讀工具：[可篩選 HTML 閱讀版](../artifacts/public-launch-audit-2026-09-07/report.html) · [開發問題 CSV](../artifacts/public-launch-audit-2026-09-07/issue-list.csv) · [證據索引](../artifacts/public-launch-audit-2026-09-07/evidence-index.json)

## 1. 發布判斷與產品方向

**建議先完成本報告的 P0 驗收，再開放公眾自行註冊使用。** 現時最需要改善的是「用戶可否相信畫面、答案有否保存、下一步會得到甚麼」，而非再增加功能或裝飾。

三項最直接的發布阻礙：

1. **About Me 的問卷沒有持久保存。** 實測選了三個答案後，完成度顯示 10%；重新載入後回到 0%、0/30、未選模式。這與頁面「逐步建立個人檔案」的承諾不相符。
2. **Calendar 的真實日程混入示範建議。** 實際畫面出現租金、beta launch、essay draft 等提示；本地服務明確無條件加入 `mockConflicts()`，非空日子的摘要亦使用固定示範文字。必須先分清真實資料、推算與示範。
3. **Privacy policy 仍是待填寫模板。** 正式頁面要求開發者填上資料處理負責人、聯絡方式及實際儲存措施。About Me 的「AI memory files」選擇與其他 AI 功能的資料使用亦未形成一致、可驗證的約定。

**建議的第一個價值體驗：用戶將腦中一件重要事情，變成已儲存、今日做得到、知道何時開始的行動。** 具體成果是「一項任務＋今日計劃中的一個位置」，可選時間與預計分鐘；不強迫填人生目標、連接 Google Calendar、授權 GPS 或使用 AI。完成專注／勾選任務是第二個價值體驗。

建議產品介紹文案：

> 把想做的事，變成今日做得到的一步。MyBestLifeOS 幫你安排任務、保存有用資訊，再按你的需要逐步建立個人計劃。
>
> **先安排今日一件事**　看看一個例子

目前可保留的優點：Documents 的明確 AI 選用說明與預覽後保存；Bucket List 的快速儲存／稍後補資料；Career 的用途說明；任務視窗的必填限制、手機內部捲動與固定底部操作；Escape 關閉後返回觸發按鈕的基本行為。改善應建立在這些已存在的做法之上。

## 2. 研究方法、證據級別與限制

這是產品啟發式評估、認知 walkthrough、實際 UI 操作與程式／歷史交叉核對，**未進行真實新用戶訪談或 usability study**。第一身的新用戶觀點是分析視角，不是研究參加者的引述。

|標記|代表甚麼|可以作出的結論|
|---|---|---|
|R|本次正式網站 UI 實測，附 PNG／文字快照|該帳戶、該畫面、該次操作確實出現的行為|
|C|本地程式或 schema|實作意圖／風險；不等於已核對 production DB 或部署版本|
|H|Git 與既有設計紀錄|有歷史依據的樣式與變更|
|D|產品／平台官方文件|文件描述的行為；不冒充競品登入後親測|
|I|分析推論或設計提案|需原型或使用者研究驗證|
|U|未驗證|明列原因與補驗方法，不計作通過|

**環境。** 正式站現有已登入帳戶；主要桌面截圖為 1280×720、About Me 等為 1440×1000，後段 Chrome 為 1920×912，首次Dashboard為857×968；手機 responsive viewport 為 390×844。前段使用 Codex 內置瀏覽器，重連後手機及輔助頁使用 Chrome。這是桌面瀏覽器模擬手機寬度，未代表 iOS Safari、Android 實機鍵盤或效能測試。Theme 曾切換 light／dark 作比較，已恢復 dark；viewport 已重設。

**版本。** 本地 HEAD `8329e439`（2026-09-06）。正式站未暴露可核對的 commit，故不聲稱兩者完全一致。既有未提交 Weather 修正保留，未算成本次已部署成果。

**操作範圍。** 已測開啟／取消多種表單、任務巢狀日期選擇與 Escape、About Me 選答／上限／reload、Journal 空白驗證、Planner 模式／匯入入口、Calendar Week、People 重試、Brain Fit、Career 問卷續填入口、prompt 手動建立入口與三次開關循環。沒有建立正式任務、上傳私人檔案、發送 AI prompt、生成分享連結或修改資料庫。

**U：** 全新帳戶註冊／驗證信／主 onboarding 完整落地；成功儲存後重新登入；離線、斷線重試與跨裝置衝突；正式 RLS／Storage 權限；AI 實際請求與保留政策；OAuth／日曆同步；真實手機、screen reader、逐幀關閉動畫及 50ms 級中斷壓力；完整 WCAG、Lighthouse／Core Web Vitals。原因是本次沒有隔離測試帳戶、非 production fixture、真實手機及效能 trace，且不以現有私人記錄作破壞性測試。這些均列入發布驗收，不可用本報告當作已通過。

**證據讀法。** 下表 E02 等指同目錄 evidence index 的對應 PNG 與 TXT。截圖只證明畫面；操作結果另見第 4 節。載入中與動畫中截圖已分別標示，不把它們當最終狀態。所有證據及報告只寫入本地。

## 3. 現有頁面與主要流程

路由清單由 `app/src/app/**/page.tsx` 盤點，共 **76 個 page 檔案**；包含 alias、動態詳情、工具頁及五個已驗證 404 的隱藏功能，並非 76 個獨立公眾功能。本次有57條路由取得R證據（包括5個預期404），6條以程式核對別名／共用頁，1條登入頁為C＋U，12條動態或輔助路由仍屬U。R不代表完整端到端通過。完整逐路由覆蓋表見 [route-inventory.csv](../artifacts/public-launch-audit-2026-09-07/route-inventory.csv)。每列標明 R、C 或 U，不能把「找到檔案」理解為「完整操作通過」。

|現有分區|主要頁面|目前可見的使用路徑／理解成本|
|---|---|---|
|Command Center|Dashboard、Brain、Daily Planner、Tasks、Calendar、Weather、Signals、Analytics|「今日做甚麼」分散於三個主頁；Planner 有三種模式，Calendar 有五個視圖。Brain、Analytics 在累積資料後才有價值|
|Self|About Me、Grateful Things、Quote Library、Bucket List、Habits、Journal|自我認識、反思、願望與行動混在同一分區；About Me 同時是問卷、權限入口、頭像工具和四個文件編輯器|
|People|Relationships、Role Models|現為同一路由的 query tabs；人脈資料與 AI 仿照公眾人物的思考工具，需要更清楚區隔|
|Career|Command Center、Compass、Profile、Vault、Coach、Pipeline、Timeline、Network、Journal、Analytics|是一套完整子產品；先填 Profile 再到 Coach／Pipeline，但與 About Me、Knowledge、People 有重疊名稱與資料責任|
|Build & Execute|Goals、Projects|目標 → 專案 → 任務 → 今日計劃的關聯沒有在首次使用時形成一條清晰路線|
|Resources|Assets、Documents、Software Vault|實物、到期文件、軟件工具三種完全不同的資料；Software Vault 與 Career Vault 同名造成負擔|
|Knowledge|Knowledge Base、AI Knowledge、Mind Council、Ideas，以及未完成功能|保存知識、保存 prompt、問 AI、找知識與記靈感入口很多；相似能力需要分工|
|其他|Garden、Settings、Privacy、Quick Save、分享／遙控頁|Garden 混合調節練習與遊戲化；Settings 的主題/icon 選擇優先於帳戶與資料控制|

已驗證 production 直接連結回 404：Life Companion、Notes、Finance、Health、Weekly Review。這些是已存在的發布範圍決定，不建議在 onboarding 重新曝光。**Japanese Study 的直接連結仍可開啟**，不可只因主導覽沒有顯示就當作已隱藏。Business Analyst、YouTube Radar 仍是 Coming soon；AI Assistant 顯示 local-only，應明確決定隱藏或放入可選實驗區。

建議保留現有熟手入口，為新手提供較簡短的預設導覽：**今日、任務、專案、知識**；「生活與自我」「Career」「更多」可展開。Goals 從專案流程解釋，並保留獨立入口；不需要一次過重寫全部 IA。每頁固定一個主要操作，主題可以改材質與顏色，**不應改變功能名稱及所在位置**。

## 4. 實際互動結果

|檢查|操作與結果|判讀／證據|
|---|---|---|
|About Me 選答與重載|Manual only → 第一題選三項 → 10%、3/30，其餘第一題選項 disabled → reload → 0%、0/30、Mode Choose|R 失去問卷草稿；E02、E03、E05、E06；C `about-me/page.tsx:562`|
|About Me 手機／中文|390×844 第一題在約 y=1265 才開始；首屏都是介紹、統計與 icon；zh-hk 仍混用英文段落、Profile icon、Ask Myself|R E05、E06、E71；不是文字縮細可以解決的問題|
|Tasks 手動／日期|New Task 選單 → Create Manually → 重複 Quick／Manual／AI tabs；空 title 不能建立；日期 popup Escape 先關日期，再 Escape 關母視窗|R E08–E11；focus 回到 New Task，應保留|
|Tasks 手機|358px 寬 dialog 在 390px viewport 內，可內捲，底部 Create 固定；Escape 關閉，focus 返回 New Task|R E68、E69；實機軟鍵盤 U；`mobile-dialog-computed.json`|
|Planner|Time Block／Free Plan 切換、Import from Tasks 列表開啟取消；Free Plan 可先記任務；手機第一個輸入在首屏以下|R E12–E14、E70；真正新增、同步和保存 U|
|Calendar|Today、Week 操作；Week 最終顯示正確 selected 與 URL `?tab=week`；Today 真實三項習慣伴隨固定衝突提示|R E15、E64、E67＋C；部分早期截圖 summary 尚未完成，非永久卡住的證明|
|Journal 驗證|選 Quick Reset、Green，不填必要欄位按 Save → 多個 Invalid input／Required、重複通知；沒有跳往第一項錯誤，focus 留 Save|R E24；未新增日記|
|Relationships|頁面 Couldn't load your relationships → Try again → 同一錯誤|R E31、E40；根因 U，不能直接斷定是 RLS／migration|
|Brain|初次圖面顯示 13500%，只能見放大的色面；按 Fit graph to view 後恢復 17% 全圖|R E30、E34；需再測 cold load／既有 zoom 狀態來源|
|Career Profile|已顯示 100%；Continue where you left off 開 1/15、7% 並帶已有答案；Command Center 另顯示 44%|R E41、E43、E54；進度定義不同卻用近似名稱|
|Documents／Ideas／Knowledge|打開新增介面並取消；Documents 明確 AI 預設關閉；Ideas 無內容先顯示 Visual is being generated；Knowledge 用 Process，未說明與 Save 的關係|R E38、E39、E44；上傳與 AI U|
|Prompt 開關循環|Create prompt → Escape → 再開，連續三次；每次最後 dialog 數 0，focus 回 Create prompt|R `dialog-reopen-cycles.json`；是基本循環通過，非逐幀／50ms 壓力通過|
|Bundle／分享／Quick Save|實際開啟空白頁與建立 Bundle 第一階段；無分享連結建立、無 export|R E73–E78；最終下載／平台分享 U|
|Travel Journey|地圖回 fallback，顯示 Failed to create Map Tiles session；仍有夢想清單及返回入口|R E79；保留 fallback，但錯誤文案需可理解|

## 5. 逐頁 Audit 表

P0＝發布前必須處理或在發布範圍內明確移除；P1＝發布後優先；P2＝稍後優化。P0-U 代表**發布前必須補驗**，不代表已證實漏洞。共66項：23項P0、5項P0-U、37項P1、1項P2。改善及驗證欄是待實作方案。

<!-- AUDIT_TABLE -->
|ID|頁面／元件|目前問題|用戶影響|證據|具體改善|優先|驗證／驗收|
|---|---|---|---|---|---|---|---|
|UX-001|全站導覽／首次入口|分區多，Today 類用途分散，沒有先回答可以得到甚麼成果。|新手需先學產品架構，熟手亦需跨頁找今日工作。|R E01、E07、E12；I|預設今日／任務／專案／知識，更多功能可展開；首 CTA「安排今日一件事」。|P0|首次30秒至少80%能說出用途和起步操作；熟手 capture 步數不增加。|
|UX-002|Dashboard|統計、摘要與多種資訊先於一個清晰的下一步。|有資料的用戶被動閱讀；空帳戶何處開始未實測。|R E01；U 全新帳戶|首區顯示今日一件事，空時直接建立；儲存後原位顯示任務及時間。|P0|空／有資料兩種帳戶都能在首屏找到主要 CTA，task→plan read-back 通過。|
|UX-003|主 Onboarding|七步設定，state 無續填；完成時才請求 GPS；Step4 建 goal 可能因回退重覆，catch 後仍前進。|首次成果延後，失敗與半完成狀態難理解。|C onboarding-wizard.tsx、step-4-goals.tsx；U 完整註冊|縮為基本設定→一項任務→今日計劃；GPS另行觸發；持久 resume、冪等 run ID、失敗留當步。|P0|拒絕 GPS／AI 仍能完成；中途 reload／back／retry 不重複新增。|
|UX-004|登入／深連結|middleware redirect 未帶原目標，Wizard 完成固定到 Dashboard；匿名端到端未驗證。|由分享或知識連結進來，登入後可能失去原任務。|C lib/supabase/middleware.ts；U|保存並校驗同源 returnTo；非必要 onboarding 在目標頁就地提示。|P0-U|匿名進3類深連結→登入→回原頁；外部 returnTo 被拒。|
|UX-005|Privacy／登入前說明|已部署 Privacy 仍是模板；Privacy 放 protected，登入条款為文字，匿名可讀性待驗。|用戶不能據此理解個人資料及求助方式。|R E56；C misc-ui.ts、middleware、login；U 匿名|填入可核實負責方、聯絡、各資料用途／儲存／刪除；Privacy、Terms、Help 公開可讀。|P0|無帳戶可讀；每項聲明有後端或供應商證據，模板字串為零。|
|UX-006|About Me／問卷保存|三項選答後 reload 回到0%、0/30及未選模式。|投入被丟失；無法續填，破壞對 profile 的信任。|R E02、E03、E05、E06；C page.tsx:562|結構化保存 answers／skipped／last_step／版本；顯示 saving、saved、error。|P0|選答→切頁→reload→重新登入仍一致；失敗保留草稿，不虛報 saved。|
|UX-007|About Me／資訊架構|問卷、memory、頭像、四個文件編輯同層；手機第一題約在y1265。|用戶未開始就面對大量術語、滾動與選擇。|R E02、E05、E06、E71|首屏三題起步；摘要在上；深入題及外觀後置；單題分步並可略過。|P0|390px首屏可開始第一題；首次作答中位數≤30秒（待量度）。|
|UX-008|About Me／進度|0/30是最多選項量，但完成百分比按題數；模式未保存。|像需填滿30答案，答一項是否足夠不清楚。|R E02、E03；C questionnaire 邏輯|改「第1/3題，選填」「已回答4/10題」「最多3項，可只選1項」；跳過獨立記錄。|P0|參加者能說清剩餘題數及哪些可略過；滿額可取消選項。|
|UX-009|About Me／AI memory|介面說使用允許的 memory files，但 handler 只記檔名，摘要按 tag 排序生成。|可能以為內容已讀取並作 AI 分析。|R E02；C onSourceFilesChange、topTags|未實作匯入前移出一般入口；改「根據你的選擇整理」；若正式匯入先預覽內容及用途。|P0|選檔後 UI 與實際 network／解析狀態相符；不顯示假成功或假分析。|
|UX-010|About Me／AI用途|Manual only 不是全站 consent；已存 profile 被 role-model context 使用。|本頁選擇與其他 AI 功能的資料流不一致。|C role-model/_shared-intelligence.ts、sourceMode；U 正式請求|逐 consumer 列欄位、供應商及觸發點；AI 使用時預覽，儲存與傳送分開。|P0|禁用所選 profile 欄位後請求確實不帶出；UI 說明與流量核對。|
|UX-011|About Me／編輯與套用|applyMirrorDraft 只改 personality editor；query 更新會 setHtml 四個 editor。|易以為已保存，或保存一節時覆蓋另一節未存草稿。|C page.tsx:626–636、756、768；U 覆蓋重現|套用前比較／指定段落；每節 revision 及 dirty 保護；保存只更新對應節。|P0|兩節同時編輯→存一節，另一節不變；取消套用、撤回及衝突處理通過。|
|UX-012|About Me／問卷措辭|部分身心選項偏困難描述，缺中性／不適用；10組敏感與普通題並列。|誘導自我評價，令人不想開始或覺得被判斷。|R E02；C QUESTION_GROUPS；I 問卷偏差|中性選項、自填、不適用；敏感題後置並選填；摘要寫「你提到」，避免人格／健康診斷。|P1|認知訪談能用自己的說法解釋問題，不因選項被迫選負面描述。|
|UX-013|About Me／頭像與權限|repo avatars bucket public、使用public URL；正式權限未核對。|用戶可能把個人檔案私密等同頭像亦私密。|C migration 20260415000000、repositories/about-me；U production|決定頭像公開必要性，明說可見範圍；獨立檢查 profile、object 讀写及刪除。|P0-U|兩個測試帳戶交叉讀寫隔離；public URL 行為符合說明；不把 profile 文字誤報公開。|
|UX-014|Tasks／新增流程|New Task 選單已選手動，視窗又展示 Quick／Manual／AI 選項。|重複決策；第一次不知何時選哪種模式。|R E08–E11|New Task 直接開 title 最簡表單；AI與批量放可選次入口。保留日期巢狀 Escape。|P1|手動 capture 少一步；空標題阻止保存，關閉回焦仍通過。|
|UX-015|Tasks／手機|390px頂栏品牌／時間擠壓，統計及工具列裁切或需橫向滑動。|可見操作少且圖示需猜；窄屏增加探索成本。|R E68、E69|精簡手機頂栏；主要新增固定可見，次要篩選收一個有文字的入口；保留表單固定footer。|P0|360/390px無整頁溢出；新增、搜尋、日期、完成可全程操作；實機鍵盤補驗。|
|UX-016|Daily Planner／手機與模式|模式多，手機同步日曆 CTA 比核心輸入突出；Auto Plan 文案裁切。|以為必須連 Google 才可開始；第一項行動在首屏之外。|R E12–E14、E70|新手先 Free Plan 一項任務，進階 time block 按需；同步卡後置；標籤可換行。|P0|不連日曆仍可3分鐘內規劃；手機第一屏有起步輸入或CTA。|
|UX-017|Calendar／AI建議|固定示範摘要／衝突混入真實日程；無空檔時可能回 mock slots；plan忽略輸入。|錯誤行動與可用時間會直接誤導安排。|R E15、E64、E67；C lib/calendar/ai/index.ts:46/117/133/150|移除正式路徑 mock；摘要、衝突、空檔追溯真實 record ID；失敗明示暫不可用。|P0|空、非空、滿日、跨日／時區 fixtures；每條建議可追溯，無假可用時段。|
|UX-018|Calendar／視圖與載入|多視圖與AI卡競爭；部分擷取尚在 loading，後續Week可正常切換。|易不知 Today／Planner／Calendar 分工；載入回饋需可預期。|R E15、E64、E67；U timeout|先 Today／Week／Month；說明 Calendar 看時間、Planner 做安排；獨立卡片loading/error/retry。|P1|tab與URL一致；慢／失敗不阻塞日程；不可將本次瞬時loading當永久故障。|
|UX-019|Goals／Projects|目標、專案、任務的關係未在建立後形成明確下一步；卡片標題有截短。|記錄完成後仍不知道如何開始執行。|R E16、E18、form-goals；I|建立後給「新增第一項任務」與連結目標；progress 明說計算方式，保留完整標題可讀。|P1|完成Goal→Project→Task→Today可回到同一記錄；取消不產生空專案。|
|UX-020|Journal／Quick Reset|Quick Reset 要求多欄；提交後多個 Invalid input／Required及重複通知，focus仍在Save。|快速記錄變長表單；錯誤難修復。|R E19、E24|一個最低必填內容，其餘展開；欄位具體錯誤、頁首摘要連至錯誤、focus第一錯誤。|P0|空表提交只有一個主通知；keyboard能定位修正；保存成功後可重載。|
|UX-021|Habits|AI摘要、Routine、數據與記錄入口同時競爭；習慣名稱／單位呈現需更清楚。|第一次未知道建立最小習慣與記一次完成的路線。|R E20、form-habits；U 單位是否使用者設定|先一個最小習慣＋清晰單位；AI回顧等有log後顯示，失敗不擋記錄。|P1|空→建一個→log→撤回完成可做；名稱和目標單位無誤導。|
|UX-022|Grateful Things|多個統計／分類先於簡單記下一件事；新增仍有較多欄位。|反思活動的輸入成本高於起步價值。|R E21、form-grateful-things|空狀態提供一句示例；先文字保存，分類及補資料後置。|P1|用戶可30秒內記一件事；成功提示連回新卡。|
|UX-023|Quote Library|排序顯示 created_at_desc 等儲存值，表單選項未完全轉成可理解語言。|介面看似未完成；新手不明白順序。|R E22、form-quote-library|所有enum映射成當地語言，如「最近新增」；quote／作者先，分類後。|P1|所有排序／空值／語言組合沒有內部key；keyboard選單正常。|
|UX-024|Bucket List|總覽 active數字與當前列表呈現不同，過濾條件關係不明。|可能以為願望丟失或統計錯誤。|R E23；U 計算根因|標明統計是全部或目前篩選；空列表顯示「清除篩選」；保留快速儲存。|P1|不同狀態／搜尋fixtures下數量一致，清除篩選可找回項目。|
|UX-025|Travel Journey／Map|Map Tiles session失敗顯示技術錯誤；list fallback仍可用。|地圖不能使用且錯誤不解釋用戶可做甚麼。|R E79|改「地圖暫時未能載入，你仍可查看願望清單」＋重試；修復服務或發布先關地圖。|P1|地圖失敗不阻塞list；重試不重複請求循環；key／network原因另驗。|
|UX-026|Knowledge Base／資訊架構|保存、Ask、Retrieve三大入口及大量type/filter同時展示；找回內容次序不明。|首次保存前要先理解知識庫分類系統。|R E25、E44|以保存來源／搜尋找回兩個主路徑；進階類型收合；有內容後教問答引用。|P1|保存一來源後能依標題找回；Ask與Retrieve能各說出用途。|
|UX-027|Knowledge Intake／AI與保存|Process與Save關係不清；thumbnail/style先於結果，AI使用說明弱於Documents。|可能未理解傳送內容或以為處理完成等於保存。|R E44對照E38；U 實際資料請求|統一選用AI與來源預覽；Process→review→Save狀態明確；圖片風格後置。|P0|上傳／AI失敗能重試；未Save不宣稱入庫；發出請求內容符合預覽。|
|UX-028|Ideas／Capture|內容未輸入已顯示 Visual is being generated；富編輯與metadata先行。|造成假進度印象，分散記住靈感的注意力。|R E26、E39|先標題／內容快速存；有實際生成請求才顯示進度；圖片是保存後選用。|P1|空表無生成中；取消無殘留；失敗保留文字且可不生成直接保存。|
|UX-029|Resources／Assets與Documents|同一入口兩種資料責任不同；Documents既有AI opt-in及review模式较清楚。|使用者需要判斷收據、保單、實物應放哪裡。|R E27、E28、E38|用例區分「物品與保養」「文件與到期」；允許文件關聯物品；保留AI預設關閉。|P1|典型3種資料能一致分類；可從物品找回文件；錯誤不清空表單。|
|UX-030|Software Vault|Vault與Career Vault同名；Health16/100、費用估計需更清楚說明。|混淆工具訂閱與申請材料，分數容易被當作事實。|R E29；C sharedVault routes|改「工具與訂閱」「職涯材料」；顯示費用來源、幣別／估計、健康分算法或暫移除。|P1|用戶能辨別兩頁；價格失效與缺資料狀態清楚，總額單位可核對。|
|UX-031|Brain／Graph|初始13500%只能看放大色面，Fit後17%恢復。|第一印象像壞頁；圖形無法傳達關聯。|R E30、E34；U zoom來源|首次有效資料後fit；clamp合法zoom，resize保持可見；提供搜尋與list替代。|P1|冷開、重返、不同資料量都可見節點；keyboard可到原記錄。|
|UX-032|Relationships|載入失敗，Try again後同錯；未能檢查主要新增／記互動流程。|預定公開功能不可用，空資料與故障易混淆。|R E31、E40；U 根因|查query／API／權限並修復；錯誤保留retry及求助，不當作空白；未修好先移出發布範圍。|P0|新舊帳戶載入／空態／新增／修改／retry通過；授權隔離單獨驗。|
|UX-033|Role Models|與真實人脈同hub；角色工具、AI肖像與人物本身容易混為一談。|對生成內容來源及用途形成錯誤預期。|R E32|標「參考此人的公開思想作分析」；清楚區分真實互動資料與模擬思考工具。|P1|用戶能解釋非本人回覆；生成／來源標籤可見；keyboard卡片操作分離。|
|UX-034|AI Knowledge|filter露出 __all__，prompt卡多種tag／fork術語；與Career Coach相似。|探索成本高，找一個合適用途前要學技術詞。|R E33|__all__→「全部」；按用途先呈現；Fork改「複製並修改」；共用prompt資料但保留career入口。|P1|enum不外露；用戶能找到一個用途並知道下一步是否發送AI。|
|UX-035|Create Prompt|入口文案含「same flow as before, now in a glass panel」；先選模式再填表。|內部改版說明無助新用戶，產品感不完整。|R E76；C create aliases|移除工程歷史文案；提供「自己寫」「幫我整理」短用途說明；保存狀態與退出草稿清楚。|P1|首次能辨別模式；3次開關基本通過後補快切／草稿／保存驗證。|
|UX-036|Mind Council|AI lens disclaimer重複，角色選擇先於輸入問題與預期成果。|理解負擔增加，對第一次要做甚麼仍不清楚。|R E35|先一個問題與示例；預選少量適用視角；一次說清模擬、資料及輸出。|P1|不讀長教學可送出可理解問題；送出前知道哪些資料會傳送。|
|UX-037|AI Assistant／Business Analyst／YouTube Radar|local-only或Coming soon頁仍可開啟。|公眾以為可用，點入後沒有成果。|R E36、E37、E62|明確發布清單；未完成功能從nav與route同步隱藏，或獨立可選實驗區。|P0|每個公開入口可完成一項操作；不將Coming soon列為已可用功能。|
|UX-038|Japanese Study／隱藏頁|Japanese Study直接URL仍可開；5個其他隱藏頁實測404。|只移除導覽不能代表功能不公開。|R E72、gate-*.txt；U 發布範圍決定|確認Japanese Study是否納入；如否用現有feature flag＋nav＋route gate並重建。|P0-U|公開路由allowlist與匿名／登入直接URL結果一致；已隱藏5頁保持原決定。|
|UX-039|Career／跨頁進度|Command Center44%、Profile100%、Mirror7%採不同基準。|無法知道是否已完成及還欠甚麼。|R E41、E43、E54|分「基本資料」「探索問卷」「材料準備」，明列每項分母；以可做下一步取代單一總分。|P1|同一帳戶各頁顯示一致來源；續填位置與百分比分母可解釋。|
|UX-040|Career Compass／診斷語氣|以稀疏资料生成強烈阻礙／風險判斷，依據不夠可見。|用戶把暫時推論當作能力評價，降低信任。|R E42、E43；I|改「目前資料顯示…，你可以修正」；展示依據、信心不足及一個可選下一步。|P1|小樣本不下定論；使用者可更正資料與推論；無來源不出風險數字。|
|UX-041|Career Profile／Mirror|100%頁仍提示補項目；續填從1/15但帶已有答案。|不知重新作答會否覆蓋既有內容。|R E43、E54|先摘要與last saved；顯示真正未完成題；逐題可略過、退出保存及修改來源。|P1|續填回last incomplete；已答回填；修改一題不清除其他答案。|
|UX-042|Career Vault／材料|檔案資料與評分先於使用情境；版本／下一個用途不夠直接。|用戶存完後不知道如何用於申請。|R E45；U file detail/save|按CV／作品／推薦等任務導覽；卡片顯示最近版本＋「用於機會／加入材料包」。|P1|從一份檔案可找到版本及使用入口；history／compare需fixture補驗。|
|UX-043|Career Bundles／New|空態清楚，但第一步預選Graduate School；Export／成品尚未測試。|可能建立不合用途材料包，不能確認最後成果可靠。|R E73、E77；U export|先問用途或不預選；逐步保存草稿，最后預覽檔案、缺項與輸出格式。|P1|Back／cancel保留意图且不重覆建包；匯出可開啟、檔案及順序正確。|
|UX-044|Career Tags／Shares|空態解釋Upload或分享用途，沒有直接去相關材料的行動。|知道概念後仍需自行找下一步。|R E74、E75|Tags加「上傳材料／管理已有材料」；Shares加「選擇一份材料分享」，權限在建立時教。|P1|空態可一click到可完成操作；分享revocation／expiry另做發布補驗。|
|UX-045|Career Coach／Prompt Use|稱AI Coach，但實際是prompt準備／dispatch；Variables欄顯示[TARGET_ROLE]等內部名稱。|期待站內對話卻進四步設定；必填內容較難理解。|R E46、E59|改「準備一個職涯提問」或明示在哪個AI執行；欄位自然語言示例，附件預覽。|P1|用戶可說出送去哪裡；required變數、cancel、preview、外部dispatch清楚。|
|UX-046|Career Pipeline|8欄橫向stage與raw researching值；空態已有清楚建機會入口。|手機掃描困難，第一次要理解整套招聘流程。|R E47、E55；U opportunity detail|新手先list＋下一步／日期；進階切kanban；階段label翻譯，保留現有公司／角色autofocus。|P1|390px可新增並移階段；詳情save/retry及瀏覽器Back補驗。|
|UX-047|Career Timeline／Network|Timeline標題有檔案式命名；Network圖在長說明之後，Add node偏技術詞。|難把事件或點對應到真實人物與行動。|R E48、E49|用可讀材料名和事件摘要；Add person／relationship；說明可收起、提供list模式。|P1|keyboard能從人／事件打開來源；圖表無法載入仍可用list。|
|UX-048|Career Journal|空態有有效第一項決定CTA，但統計卡優先；與一般Journal用途相近。|新手未理解應記工作心得還是決策證據。|R E50|用一句例子「記下今天的職涯決定及理由」；empty時CTA在上，後續才顯示統計。|P1|兩種Journal分類理解一致；一項決策保存後可在Timeline找到。|
|UX-049|Career Analytics|小樣本比例與圖形色階可誤讀；dark模式部分黑色圖條難辨。|可能過度解讀少量資料，視覺讀數困難。|R E51|小樣本顯示數量／不足分析；圖表配文字表格、正確對比及來源連結。|P1|n=0/1/足夠樣本有不同文案；圖形與數值一致、色彩不單獨傳意。|
|UX-050|Analytics|0篇Journal仍有Emotional Load20/100（有不足資料提示）；17時間段tabs複雜。|精確分數容易盖過資料不足警告。|R E66；早期E58/E63僅loading|無足夠資料改「尚未足夠資料」，不出精確負荷分數；預設週／月，其餘收起。|P1|零資料無假精準結果；慢載入/失敗不當作零；說清非健康診斷。|
|UX-051|Signals|独立4步偏好onboarding可能與主流程重疊；尚未檢查feed成果。|剛完成主引導又被要求設定，可能直接跳過。|R E57；U final feed|首次進頁才一個關注點，其他later；單一tour管理避免重疊，完成第一個有用feed才算成果。|P1|skip仍能看基本feed；離開resume；可Help重看且不清偏好。|
|UX-052|Garden|首屏長介紹、週摘要及未有sessions；實際短練習卡在後面。|想快速調整狀態的人要先閱讀整套系統。|R E65；E61只loading|首屏「做一個1分鐘練習」；安全退出／停止可見；統計和遊戲化後置。|P1|首次能迅速啟動／停止；reducedmotion與無音訊仍可理解；不以未記錄推論狀態。|
|UX-053|Weather|目前城市與查看者時區可能不同；日出日落顯示需核對；insight屬規則摘要。|可能讀錯當地時間或以為AI做了額外分析。|R E60；C insight.ts；U 新修正未部署驗證|時間一律城市時區並標時區；規則摘要如實命名；GPS／manual search／timeout分開回饋。|P1|HK城市配美國瀏覽器timezone及DST測試；拒GPS仍可search；不覆蓋既有修正。|
|UX-054|Settings／語言|外觀和icon在資料控制之前；/en與zh-hk偏好存在混合語言。|難找資料／AI設定，語言選擇結果不確定。|R E52、E53、E71|帳戶與資料→AI→語言時區→外觀；route/store語言單一規則，所有enum使用label。|P0|改語言後reload/deeplink一致；關鍵錯誤、保存、隱私文案全語系有fallback。|
|UX-055|AI Preferences|chatgpt/en等raw值；Smart tags及檔案儲存說明範圍不清。|不知此設定只影響某功能或所有AI，資料承諾可能被放大理解。|R E53；U provider實際留存|每個開關描述影響功能及傳送內容；不可用全站「從不儲存」代替限定流程說明。|P0|設定變化與請求匹配；停用／供應商變更有明確影響；無未驗證保留承諾。|
|UX-056|Quick Save／Share工具|setup泛稱手機Share Sheet；平台支援與capture/login/success端到端未驗證。|不支援的瀏覽器照做也看不到入口。|R E78；C route inventory；U 平台與callback|依browser能力給PWA安裝／copy link／手動保存替代；登入返回capture；成功需真record。|P1|iOS/Android支援矩陣；登入、離線、duplicate、cancel、success read-back補驗。|
|UX-057|所有Modal／Liquid Glass|歷史玻璃仍有blur，但project-design以94%底色覆蓋；三套材質來源。|視窗看似實心，theme／元件不一致。|R E09、E11、E69 JSON；C/H 40af6d01|單一OSOverlaySurface與glass/reading token；移除無差別override，保留控制尺寸。|P0|四種核心dialog light/dark對照；computed alpha符合token，背景最差情境對比合格。|
|UX-058|Dialog／Sheet／自訂Overlay動效|CSS100–300ms、Framer、GSAP160–820ms並存，沒有共同presence規則。|節奏不一；直接卸載可能截斷退出，快切可能留遮罩。|C shared ui/motion；R 基本Escape與3cycles；U逐幀|GSAP token＋BaseUI語義；Dialog actionsRef.unmount等exit；generation token防舊callback。|P0|核心open/close/reopen與route-change壓測，無閃白／殘留scroll lock／錯焦點；reducedmotion通過。|
|UX-059|Dropdown／Popover／Select／Tooltip|不同duration、tooltip delay0及舊selector；popover雙材質owner。|hover易閃動，選單與浮層質感節奏不一致。|C shared ui；R E08、E10；U hover逐幀|使用140/100、160/120及tooltip延遲token；定位層不動畫；Popup唯一材質層。|P1|anchor collision、submenu、keyboard、touch均可用；必要資訊非tooltip唯一入口。|
|UX-060|Accordion／Tabs／Inline reveal|shared collapse300ms、tab/custom panel各自切換，長內容高度與卸載無統一規則。|展開節奏不一致，可能短暫雙內容或跳動。|C collapsible/tabs/os-primitives；R Calendar切tab|200–240ms展開、160ms tab；立即更新selected；非active不可focus；長內容避免全頁layout動畫。|P1|快切20次最後選中與DOM一致；高度改變不截字；prefers-reduced-motion无位移。|
|UX-061|OS Buddy／浮動控制|浮動角色／控制在多種modal截圖仍可見，與底部操作視覺競爭。|分散注意，窄屏可能佔據操作區；是否阻擋點擊尚未測量。|R E38、E69；U click遮擋|modal開啟時降低干擾並避開CTA、安全區；背景仍inert，assistant提示需獨立可關。|P1|各角落與軟鍵盤下無CTA遮擋；Tab不進背景；未實測不得斷言擋點擊。|
|UX-062|低頻動態詳情／分享／遙控|檔案compare/history、bundle detail、oracle、share token、air remote沒有安全fixture完成實測。|不能據source推斷權限、下載、撤銷或儲存通過。|U route-inventory.csv|對納入發布範圍的route補seeded accounts／record fixtures；不用真私人材料測破壞流程。|P0-U|公開範圍每route有成功／空／錯誤／返回／權限case；否則暫不公開。|
|UX-063|全站無障礙與效能|已做少量keyboard及responsive；未有screen reader、真手機、contrast測量或CWV trace。|無法保證公眾設備可用，玻璃與動效更需要實測。|R E09–E11/E69及cycles；U正式基準|以核心路線做WCAG／mobile／reducedmotion／網速fixtures；文字4.5:1，44px產品touch目標。|P0-U|核心task→plan、About Me全程keyboard；iOS/Android輸入可见；所有門檻有trace或量測。|
|UX-064|裝飾與低頻進階體驗|Brain視覺、Garden遊戲化、全模板庫可繼續擴充，但尚無使用數據支持優先。|先投入裝飾可能延後核心資料及首次成果修復。|I；U 真實使用需求|P0完成後按找回／持續使用資料選小批次；不把動畫數量當品質指標。|P2|每批有明確任務完成率或時間改善；無效者不擴大。|
|UX-065|Google Calendar／連接入口|正式頁面直接展示 Supabase／Google Cloud 的project admin設定指示。|一般用戶可能以為需建立Cloud專案才能連接，與公眾產品定位不符。|R E82；C google-calendar/page.tsx|將管理員設定移到維運文件；此頁只顯示權限用途、連接狀態、重試／斷開及回Planner。|P0|一般帳戶看不到管理員配置說明；取消OAuth可回原頁；scope與实际請求補驗。|
|UX-066|Career Coach／Your career profile|另有一份職涯profile，文案稱每個prompt會自動包括資料，與About Me／Career Profile分工不清。|重複修改資料且不確定哪些私人內容會被带入AI。|R E81；C CareerProfileEditor；U 實際dispatch內容|共用明確來源摘要，區分基本career資料與此次prompt；每次送出前可排除欄位，避免籠統every prompt承諾。|P0|更新來源後三處顯示一致；预覽與dispatch字段逐一相符；未選內容不傳送。|
<!-- /AUDIT_TABLE -->

## 6. About Me：建議資訊架構與答題流程

### 6.1 為何現在不自然

**頁面承擔四份工作，但沒有先後次序。** Hero 的「鏡」、問卷的十個人生領域、AI memory 權限、頭像、四個 rich-text sections 各自都像主流程。第一次來的人需要先理解 soul.md 等術語，才有機會回答一條真正有用的問題。

**問題由抽象且敏感的自我評價開始，收益要到很後才出現。** 金錢安全感、感情、情绪及身體反應被並排成固定選項，部分組別沒有中性答案或「不適用」。例如情緒與身體題幾乎都以困難描述作選項，容易暗示每個人必然有問題。這是問卷設計偏差風險，不是心理診斷。

**進度量度混淆。** 完成度按回答的題數，旁邊 0/30 卻像必須填滿三十個答案；最多三項不是必須三項。權限模式沒有保存，而選答產生的 summary 不會自動存入 profile。套用按鈕只覆寫 personality editor；用戶還要找到那一節的 Save。

**保存與使用缺少可見契約。** `answers`、`sourceMode`、`sourceNames` 是 React state；上傳 memory 的 handler 只記錄檔名，沒有讀取內容。摘要按選項 tag 計數生成，並非讀取 AI memory 後的模型分析。保存四份 rich text 的實作另行存在，不能因此宣稱問卷已保存。當 `data` 更新時四個 editor 同時被 `setHtml`，有覆蓋其他未儲存編輯的程式風險，尚未用私人內容做破壞性重現。

### 6.2 新定位與分組

**頁面名稱保留 About Me／關於我，副標改為「讓計劃更貼近你的生活」。** 核心是可修改的個人偏好檔案。不是必須完成的人格測驗；不把「完整」等同「更好的人」。

|層次|內容|展開方式／目的|
|---|---|---|
|快速開始，約 2 分鐘（估計，需測試）|目前最想改善甚麼、可用時間／不能佔用的時段、希望得到甚麼幫助|每次一題，共三題；全部可略過。先產生一個可行下一步|
|我的摘要|目前重點、安排偏好、生活界線；上次更新時間、來源、修改入口|進頁後最先看到；由自己確認的內容優先|
|深入了解，選填|方向與價值觀（原 Q1、Q2、Q10）；工作與生活（Q4、Q6、Q7）；金錢與關係（Q3、Q5）；身心狀態（Q8、Q9）|分組展開，一次一題；最後一組明示敏感、可不回答、非診斷|
|我寫給自己的說明|現有 instruction manual、core values、mission、personality notes|摘要閱讀模式，每次編輯一節；豐富格式藏在選用工具列|
|資料與 AI 使用|哪些答案存到帳戶、哪些可帶入指定 AI 功能、匯出／刪除／撤回入口|任何 AI 分析前可見；設定可重看，與問卷完成度分開|
|個人外觀，選填|頭像／抽象圖示|放頁尾或設定，不佔首次答題首屏|

重用 Career Mirror 的單題分步、固定底部及已有答案回填概念；不要直接複製其 15 題長度、帶評價的文字或「1/15」與「100%」混用方式。

### 6.3 具體頁面流程與文案

|步驟|主要畫面與示例文案|操作與下一步|
|---|---|---|
|A0 首次進入|「先用三個簡單問題，幫你安排更適合自己的下一步。全部選填，你可以隨時修改。」次行「答案如何保存及使用」可展開|主 CTA「開始，約 2 分鐘」；次 CTA「直接使用產品」；Help →「重看 About Me 介紹」|
|A1 近期重點|「最近，你最想讓哪件事變得容易一點？」選項：開始重要工作／安排生活／整理資訊／保持一個習慣／還未決定。示例：「放工後抽 20 分鐘讀書。」|「下一題」「略過這題」「稍後繼續」；一項或自填，不假裝一定只有預設類型|
|A2 現實限制|「今天通常有多少時間留給這件事？」10／20／30／60 分鐘／每天不同／暫不設定。選填「有哪些時間想保留？」|顯示「這會用來建議任務大小；不會自動改動你的日曆。」|
|A3 幫助方式|「你想先得到哪種幫助？」拆成一小步／排進今日／只先記下。這是產品偏好，不等於 AI 資料授權|「查看我的起步建議」；仍可略過|
|A4 可編輯預覽|「你想保留晚上的創作時間。今天可以先：整理一段影片開場，20 分鐘。」標示「根據你剛才的選擇整理」，列出來源答案|「修改」「將這一步加入今日」「只儲存偏好」；加入任務須顯示名稱、日期、分鐘，可修改|
|A5 成果確認|server 成功後：「已儲存。你的 20 分鐘行動已加入今日計劃。」可點開真實 task／plan|主 CTA「查看今日計劃」；次「有空再深入了解自己」。只保存偏好則寫「偏好已儲存」，不可冒稱已建立任務|
|A6 日後返回|上次確認的摘要＋「繼續上次：工作與生活，第 2 題」；保留「修改答案」「重看介紹」|不再彈 A0；只顯示小型續填列。Help 重看不清除答案或建立第二份任務|

**採用簡短介紹＋單題分步＋就地解釋，避免強制逐個按鈕 spotlight。** 問題本身是工作，額外教學不應蓋住問題。只在用戶首次觸發「用於 AI 建議」時展示一個精確的資料預覽；教學支援 Escape、略過和 Help 重看。

### 6.4 問題與進度規則

- 起步三題全選填；每題顯示「第 1／3 題・選填」。選多項的題目寫「最多 3 項，可只選 1 項」，滿額時保持已選項可取消，並即時讀出「已選 3 項」。
- 深入題顯示「已回答 4／10 題」，另記 skipped；不把略過當作答案，不再顯示 0/30。允許「不適用」「目前沒有特別困擾」「我想自己寫」。
- 敏感題放後；先解釋用途，避免從疲勞／焦慮等選擇直接推算健康狀態、人格缺陷或能力評分。摘要用「你提到…」，不用「你是一個…」。
- 每題可返回、跳過、稍後继续；瀏覽器 Back 遵循頁面／步驟狀態；恢復時回到最後未完成題，不從頭開始。
- 摘要是版本化草稿。套用前可比較「原有内容／建議內容」，支援加入、取代指定段落、取消及撤回上次套用。不得無確認覆蓋其他手動內容。

### 6.5 儲存、錯誤與資料用途規格

以下是**待實作的產品承諾**，目前不能直接貼上「已自動保存」文案：

|狀態|介面文案|工程與無障礙要求|
|---|---|---|
|dirty|「有尚未儲存的更改」|離開時避免靜默丟失；保存中不清空 editor|
|saving|「儲存中…」|答案改動約 600–800ms debounce；切步驟 flush；只有最新版本可覆蓋最新狀態|
|saved|「已儲存 · 18:05」|必須收到伺服器確認；`role=status` polite；不要每次 keystroke 都 toast|
|network error|「暫時未能儲存，答案仍留在這個頁面。」＋「重試」|保留記憶體草稿；未做離線保護前，不承諾關頁後仍在|
|conflict|「另一個裝置更新了這一節，請比較後選擇保留內容。」|使用版本／updated_at 樂觀並發控制；不以最後到達的請求靜默覆寫|
|load error|「未能載入已保存的答案。」＋「重試」|不可退回空表單，讓用戶誤以為沒有資料|
|leave while unsaved|「更改尚未儲存。」|留在頁面／重試儲存／放棄這次更改；只有真的 dirty 才中斷|

資料模型建議：`user_id`、`questionnaire_version`、結構化 answers、skipped IDs、last_step、confirmed_summary_version、updated_at；每節手動 notes 獨立 revision。Onboarding 的 seen/skipped/completed 與答案本體分開。新增 schema／migration 只是提案，需依 repo 流程審查後實施。

**AI 使用不能由「Manual only」推斷為全站停用 AI。** 本地 role-model intelligence 會將已保存的 mission／core values／personality 等放入特定 context；About Me 的 sourceMode 沒有被保存為全站 consent。必須追蹤每個實際 consumer，明列傳送哪些欄位、傳給哪個已設定服務、何時傳送，以及停用的影響。

可採用 Documents 已有模式，改成針對 profile 的文案：

> 「儲存這份檔案」會將你的答案保存到帳戶。
> 「允許用於這次 AI 建議」會把下列已選內容傳送至〔目前使用的供應商〕：近期重點、安排偏好。你可以取消任何一項，再決定是否繼續。

供應商欄必須由 runtime 真實值填入，無法確認就不可顯示猜測。資料保存、AI 使用、memory 匯入、頭像可見性是四個不同概念，不能用一個「同意」包住。

頭像目前 repo migration 將 `avatars` 設成 public，repository 使用 public URL；RLS schema 對 about_me 表則有 per-user policy。**這只證明 repo 設定，未驗證 production 權限；public URL 不等於全體 profile 文字公開。** 發布前需決定頭像是否真需要公開，檢查 object 存取與刪除，再顯示準確說明。memory 匯入在真正實作前先移出一般用戶入口，不能把只記檔名當作已匯入。

## 7. 完整 Onboarding Workflow

### 7.1 主流程

|階段|目的／觸發條件|主要操作|完成條件|跳過、重看與離開後繼續|
|---|---|---|---|---|
|O0 公開入口|未登入首次到訪；說明價值、示例成果、資料用途|「安排今日一件事」；示例只讀且標明示範|進入註冊或既有登入，不將看過頁面算 activation|可登入；Privacy／Terms／Help 在未登入可讀|
|O1 基本設定|帳戶首次建立|語言、時區顯示偵測結果並可改；其他用預設|設定保存成功|整步可稍後；GPS／Calendar／主題／AI 不阻塞|
|O2 第一項任務|沒有實際任務或未有 first-plan event|一句話輸入；示例「整理明天會議的三個重點」；先 title，其他展開|伺服器產生 task ID 並 read-back|可「先四處看看」；保留草稿與入口；模板不得悄悄混成自己的任務|
|O3 安排今日|已有新任務，尚未加入計劃|今日、預計 10／20／30 分鐘；可先放 Must Do，時間選填|task 與今日 plan 關聯保存成功，同一 task ID|可只存 Inbox；之後 Tasks 的「安排今日」續接；重試不得重複新增|
|O4 看見成果|O3 成功|今日卡顯示任務、分鐘、時間／稍後安排；「開始 10 分鐘」或「修改」|卡可重載仍存在；此刻才記 `first_plan_committed`|不要求專注完成才解除 onboarding；無強制慶祝 modal|
|O5 情境學習|首次進入相關頁，或首次遇到特定操作|每頁最多 1–3 個操作，優先 inline empty state|完成真實操作才勾對應 checklist|「知道了」「略過」只關教學，不算成果；Help 可重看|
|O6 第二次返回|隔天／再次使用|「繼續昨日未完成的一件事」；允許今天不安排|重新確認一個現實可行的行動|不可自動改所有未完成的 due dates；有明確日期差異|
|O7 持續回顧|有足夠真實資料才出現|完成數、實際投入與一個可改善方向；可選短回顧|用戶確認一項下一週調整|不依賴目前隱藏的 Weekly Review 路由；可先在 Today 使用小卡|

主 checklist 只用三項：「記下一件事」「安排今日」「完成後回來看看」。不放「上傳頭像」「填滿 About Me」「連接所有服務」。第一項可在任意頁完成，不能只認 Wizard 路徑。

### 7.2 每頁最值得教的操作

|頁面群|首次最值得教的 1–3 件事|觸發與完成條件|
|---|---|---|
|Dashboard／Today|找到今日下一步；新增一件事；返回未完成任務|首次空 plan 時 inline 卡；成功存 plan 後消失|
|Tasks|記入 Inbox；安排今日；完成／撤回完成|第一次空清單；操作旁提示；有真實 task 後收起建立教學|
|Daily Planner／Calendar|從任務加入；區分預計安排與截止日；修改／取消安排|第一次沒有計劃；提供單一建議模式；不強迫同步日曆|
|Goals／Projects|說清想達到的結果；拆出第一項任務；查看進展|New Project／Goal 後提示一個下一步，完成 linked task 即收起|
|About Me|三題起步；看用途與保存狀態；修改／續填|A0–A6；明確與主 onboarding 分開，永遠可選|
|Habits|建立一個最小習慣；記一次完成；漏做時繼續|empty state；第一個真實 log 後結束；不用教完 Routine Studio|
|Journal／Gratitude|先寫一件事；保存；稍後選用整理或 AI|空白 editor 內示例；成功保存才完成；不用先理解全部情緒分類|
|Bucket List／Travel|先存願望；補下一小步；有地點再放 map|快速表單；未填 location 不推地圖；失敗仍可用 list|
|Quotes／Ideas|先 capture；需要時分類／引用；從內容轉成行動|空狀態＋保存後一個可選下一步，避免先填完整 metadata|
|Knowledge Base|保存一個來源；找回；問答看引用|第一次 intake／搜尋；有來源才教 AI citation，手動搜尋一直可用|
|AI Knowledge／Mind Council|挑一個用途；檢查要送出的內容；預覽結果再保存|首次 Run／Ask 前 contextual 提示；不自動傳私人 profile|
|People／Role Models|加一個人或角色；記互動；設定下一步|根據頁面型態分開提示；資料載入失敗時不引導建立重複資料|
|Career 概覽／Profile／Compass|選方向；確認摘要；下一項 career action|先一個職涯目標，深度 profile 選填；評分與來源可展開|
|Career Vault／Bundles／Shares|上傳一份材料；選到要用的版本；分享前看可見性|分別於 Upload／New Bundle／Create Share 時教，禁止一次過三段 tour|
|Career Coach／Pipeline|填用途必要變數；预覽 dispatch；記機會下一步|對應流程進入時；不用先看整套 prompt library|
|Career Network／Timeline／Journal／Analytics|查看人或事件來源；記一次決定；看有資料的回顧|零資料時直接連去可完成的操作；無樣本不產出分數|
|Assets／Documents／Software Vault|建立一項記錄；看到期／費用用途；選用 AI|Documents 既有 opt-in 文案可重用；先實物／文件／軟件分類清楚|
|Brain／Analytics|搜尋自己一個項目；看來源與關係；返回原記錄|等已有內容再介紹；提供 list/table 替代圖形|
|Weather／Signals／Garden|搜尋城市／查看時間；選新聞關注點；開始一項短練習|各自首次使用才教；GPS、feed 個人化、練習記錄分開徵詢|
|Settings／Quick Save|找到資料及隱私；重看教學；依裝置安裝或使用替代 capture|依平台能力顯示；非支援裝置不承諾 Share Sheet 一定出現|

### 7.3 狀態、深連結與例外

- 每帳戶保存 `onboarding_version`、目前 stage、各能力 first-used event、seen／skipped tours；版本更新只介紹改動，不整套重播。匿名狀態最多暫存非敏感介紹偏好，登入後合併進度。
- 由深連結進入 `/knowledge-base?...` 等頁時，先保留目標頁；只顯示頁內「第一次來？先試一個小操作」。如果必須登入，登入後返回原本安全的站內 URL，而不是一律送 Dashboard。
- 本地 middleware 目前登入重導沒有攜帶 returnTo；主 Wizard 完成會 push Dashboard。修改時只允許相對、同源、有效路由，避免 open redirect。此為 C 風險，匿名端到端 U。
- 不同 onboarding 避免同時開：主流程只一個主面板；About Me、Signals、Career 教學排隊在相應頁；OS Buddy 不蓋住教學、錯誤或 primary CTA。
- 現有七步主 Wizard 有步驟內 Skip、Settings 重新開始入口，但沒有完整草稿續填；完成時會請求定位。Step 4 **確實有建立 goal**，不能說它沒有保存：真正問題是返回再 Continue 可能重建、建立失敗仍 `onNext()`、最後設定保存與前面 goal 建立非原子操作。用冪等 onboarding run ID、resume 資料與清楚失敗回饋修正。
- 示範資料只能在明確「示範模式」中使用，可退出、可重設；不得把 mock 衝突、假空檔或生成建議當成正式資料。用戶真實保存的任務不隨示範重設刪除。

## 8. 動效盤點與 GSAP 規範

### 8.1 現況與成因

|元件／範圍|目前實作證據|問題／界線|
|---|---|---|
|Dialog、AlertDialog|Base UI；CSS `animate-in/out`、fade、zoom95、100ms；遮罩100ms|R Task dialog computed `enter`、0.1s；不等於沒有 exit，但節奏比其他元件短|
|Sheet／bottom card|Base UI dialog 語义；sheet 約200ms、bottom variant 約300ms；遮罩150ms|方向、位移與遮罩強度另成一套；關閉與拖動需共用 lifecycle|
|Dropdown／Select|CSS 150ms；submenu100ms；alignItemWithTrigger 可停動畫|主選單／子選單節奏不同；Select 部分 reduced-motion 已處理，其他未一致|
|Popover|positioner 掛 glass；Popup fade/zoom100ms；CSS override 再加面板底色|避免 positioner、視覺 wrapper、動畫 transform 三方互相覆蓋|
|Tooltip|預設 delay 0；混用 Base UI 與舊 `data-state=delayed-open` selector|hover 容易即時閃出；未做 hover 逐幀實測，屬 C 待補驗|
|Collapsible／accordion 類|shared Collapsible 高度 transition300ms；其他自訂 collapse 有各自動畫|不是每個展開都同元件；需盤點使用者而非假設有一個 accordion.tsx|
|Tabs／內容切換|shared Tabs 主要為 trigger CSS；OS primitives 用 Framer；部分頁面用 view transition|TabPanel 進出未有單一保留／卸載規則；快速切換及長內容高度需測|
|GSAP premium motion|`lib/motion` 160／220／480／520／820ms；另有 Framer `OS_MOTION`120–420ms|同一類 reveal 可慢到0.82s；`pressMs:0.12` 實際是秒，名稱容易誤用|
|自訂 overlays|DocumentIntake、Knowledge detail、Career Mirror、Planner drawers、Quick Capture、OS Buddy|不能只改 shared Dialog 就宣稱全站統一；需 explicit registry＋adapters|

**目標：GSAP 統一時間與呈現，Base UI 繼續處理語義、focus、dismiss 和 positioning。** 不為了統一動效重寫 accessibility primitives，也不要求 unrelated 圖表／天氣動畫立即遷移。

### 8.2 動效 token（新提案，非歷史數值）

以下 duration 全部以 **ms** 作設計規格；傳入 GSAP 時集中除以 1000。一般 ease：進場 `power3.out`，退場 `power2.in`；沒有回彈或 overshoot。

|類型|進場|退場|遮罩／其他|
|---|---|---|---|
|Modal／Dialog|220ms；opacity0→1、y12→0、scale.98→1|160ms；opacity1→0、y0→8、scale1→.985|遮罩180ms進／140ms出；同 timeline，0.00開始，不等內容動畫才可使用|
|AlertDialog|180ms；opacity、y6、scale.99|140ms；opacity、y4|焦點到安全操作；不可 bounce 強調危險確認|
|右側 Drawer|260ms；x24→0、opacity0→1|200ms；x0→20、opacity1→0|手機 bottom sheet 可 y32；真正拖動另用連續手勢進度，不逐次重播入場|
|Dropdown／Select|140ms；opacity0→1、沿 anchor 位移4→0、scale.98→1|100ms；opacity1→0、位移2|無全屏遮罩；transform-origin 隨 anchor；submenu 同規則|
|Popover／日期選擇|160ms；opacity、y6、scale.985|120ms；opacity、y3|保留碰撞定位；不要 animate positioner 的 transform|
|Tooltip|100ms fade，位移至多2px|80ms fade|hover延遲350ms、同區後續100ms；keyboard focus 即時可讀；Escape關閉；必要資訊不能只在 tooltip|
|Accordion／Collapsible|200–240ms；實際高度0→內容高、opacity0→1|180ms；height→0、opacity→0|量一次高度；內容尺寸變化後回 auto；控制按鈕 focus 不移動|
|Tab 內容|160ms；opacity0→1、y4→0；舊內容最多80ms淡出|不排隊等待整個舊面板慢慢退場|先立即更新 tab selected；僅 active panel 可 focus；指示條180ms|
|Inline status／toast|140–180ms opacity＋y4|120ms|儲存狀態不每字重播；成功 check120ms即可；長列表不逐項延遲超過總240ms|
|Page 初次內容|180–240ms opacity、y6；只對第一批內容|導航不等待整頁退出|熟手再次進頁不重播 hero；輸入及讀取不受 entry timeline 阻塞|

`prefers-reduced-motion: reduce`：取消位移、scale、stagger、視差與流動高光；直接更新或 0–80ms opacity。語義及保存／錯誤提示必須仍可感知。減少動畫不應自動改成不透明主題，材質偏好與動畫偏好是兩回事。

### 8.3 元件整合與關閉生命週期

建議建立 `lib/motion/interaction-tokens.ts`、`use-overlay-presence.ts` 及 `OSOverlaySurface`。逐一接入 `ui/dialog.tsx`、alert-dialog、sheet、dropdown-menu、select、popover、tooltip、collapsible、tabs，再遷移自訂 overlays。

1. 狀態明確分 `closed → entering → open → exiting → closed`；使用者點關閉當下立即更新 logical open，但保留 DOM 直到 exit 完成。
2. **Base UI Dialog 已安裝的 `actionsRef.unmount()` 是可用整合點。** Root 提供 actionsRef 後，由 GSAP exit 的 `onComplete` 呼叫 unmount。不可假定瀏覽器 `getAnimations()` 會偵測 GSAP 的 rAF tween；亦不可用 `open && <Dialog>` 提早卸載。
3. `useGSAP` scoped refs 管理 panel、scrim；延後 handler 用 contextSafe；卸載時 revert／清理 listener。重開時 kill 舊 tween、從當前值朝 open tween；用 generation token 防舊 exit callback 卸載剛重開的視窗。
4. positioning wrapper、拖動 wrapper、GSAP motion wrapper 各自只擁有一個 transform；選單／popover 不對 Base UI Positioner 做 GSAP transform。
5. backdrop 與 panel 共用 timeline；scroll lock／inert 在視覺退出與焦點還原時協調釋放，避免穿透點擊、背景提早可捲、焦點留在不可見內容。關閉時立即停止新的表單提交，焦點返回 Base UI trigger；若 trigger 消失，回到合理的頁面控制。
6. 一個元素同時只能由一套系統操控 opacity／transform／height。遷移後刪除**該元件**舊 animate utility／Framer props，不先全站大清洗。
7. 對每一 Base UI primitive 先核對其已安裝版本的 presence API；Dialog 的 actionsRef 做法不能未檢查就套到每一種 Tooltip／Menu。

GSAP 官方建議 `useGSAP` 的 scope、contextSafe 與 cleanup；Base UI 官方 animation handbook 說明進退狀態及 manual unmount。[GSAP React](https://github.com/greensock/react)、[Base UI animation](https://base-ui.com/react/handbook/animation)。

### 8.4 無障礙、手機與性能驗收

- Modal 有名稱與說明、focus 進入、Tab／Shift+Tab 不逃逸、Escape 關最上層、關閉回觸發器、背景 inert；非 modal popover 不任意 trap focus。遵循 [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)。
- 保留 Tasks 已實測通過的巢狀日期 Escape 與回焦；補 keyboard loop、VoiceOver／NVDA、触控及瀏覽器 Back。
- 連續 open→close→open（50／100ms 間隔）各20次，route change 中離開、resize、nested popup、Strict Mode mounting：最後只有一個正確狀態，無僵屍遮罩、scroll lock、focus trap、舊 callback。此次只通過三次一般循環，不聲稱已通過此壓力驗收。
- 正式低階手機只動畫 transform／opacity；blur、shadow、gradient 預先固定，不逐幀改 blur radius。accordion height 是有意識的少量例外；避免對整個 app 做 layout animation。暫時性 will-change 在完成後移除。
- dialog `max-height` 以 `dvh` 和安全邊距計，header／footer固定、正文單一捲動；實機鍵盤打開時 primary CTA 與當前輸入可見。
- 產品目標 touch target 44×44px；WCAG 2.2 AA 最小標準有24×24px及特定例外，不把44誤寫成AA硬性條文。一般文字對比4.5:1、大字3:1，玻璃需在最差背景測量。[Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)、[Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。

## 9. Liquid Glass：歷史依據與統一方案

### 9.1 已確認的歷史

|來源|已有設計／實作|可信界線|
|---|---|---|
|`liquid_glass_ui.md`|透明面板、20–28px blur、飽和度、白色細邊、頂部高光、柔陰影|repo 內的 CryptoNest 視覺參考；不是 MyBestLifeOS 某個歷史上線畫面的證明|
|`globals.css:205–224` 與 `40af6d01^`|淺色白72%；深色白10%；blur24px、saturate140%；白邊18%／16%；shadow0 8px 32px黑35%／45%；inset白10%|H 真正歷史程式數值；對應 Dialog／Popover／AlertDialog|
|`40af6d01`，2026-09-06|新增 `project-design.css`，在 Tailwind layers 外統一語義元件；`--os-floating` light白94%、dark rgb(24 24 27)/94%|H 差異主要来源；同時將 solid／frosted／glass panel 指到相同 surface|
|本次 Task dialog computed|`rgba(24,24,27,.94)`＋`blur(24px) saturate(1.4)`|R＋C：**模糊仍在，底色被94%覆蓋**，所以看似實心。E09、E11、E69與 JSON|
|`ui/os-glass.ts`|另有 dialog94%、sheet96%等 class 源頭|C 第三套材質定義；改一個 globals class 不會全站恢復|

不建議直接 revert 整個 `40af6d01`：會連已統一的尺寸、按鈕和排版一起退回。應保留一致的控制規則，只修正材質層級與來源衝突。

### 9.2 新的可重用材質規格

以下是**新提案**，旨在恢復透明磨砂的感覺並保護閱讀；不是聲稱歷史版本就是這些顏色。先以 Tasks、Documents、About Me 編輯、Quote sheet 四種密度打樣。

|Token／用途|Light 候選|Dark 候選|實作規則|
|---|---|---|---|
|`overlay.glass` 一般 dialog／popover|白色72–80%|中性深灰 `(24,24,27)` 60–70%|同類共用；實際最終 alpha 由對比測試決定|
|`overlay.reading` 密集長表單／長文字|白色86–92%|深灰80–88%|不是逐頁 arbitrary override；明確高可讀性 variant|
|裝飾／低密度玻璃|歷史白72%可作起點|歷史白10%作參考起點|深色白10%在高亮背景上未必可讀，不盲目套全部表單|
|blur／saturation|24px／140%|24px／140%|mobile12–16px／120–130%；同一面板只一層 backdrop-filter|
|邊框|白色55–70%＋必要中性外邊|白色14–18%|1px；輸入框邊界另有至少可辨識的對比|
|頂部高光|inset0 1px白65–75%|inset0 1px白10–14%|靜態；不使用跟鼠標追逐光波於表單|
|陰影|0 16px 48px 深灰14–18%|0 20px 64px 黑35–45%|一層主陰影，不每個內部欄位加重影|
|Scrim|黑20–26%|黑36–44%|視情境固定token；背景 blur0–4px，避免與面板雙重重blur|
|圓角／間距|dialog20px；menu12px；內距20–24px|相同|mobile正文16–20px；底部安全區另計|
|無 backdrop 支援／高可讀需求|白色96–100%|深灰96–100%|fallback 配對正確文字色；不能 light mode fallback 深底卻保留深字|

玻璃感由**透明度、背景內容、薄邊、高光與陰影一起形成**。在純黑背景上，提高 blur 不會製造內容；可用微弱固定背景層次，但不要為看得出玻璃而放動態照片在字後。

### 9.3 整合順序與驗證

建立唯一 `OSOverlaySurface` 材質擁有者，以 `variant="glass|reading"`、`placement="dialog|sheet|popover"` 取代各頁 opacity class。Tokens 與 `project-design.css` 放在明確可預期的 CSS layer；移除針對所有 `[data-slot]` 的無差別94%覆寫。`Popover.Positioner` 只定位，Popup 或 inner surface 只選一個套 glass。

驗證同一組元件、同一背景、同尺寸：light／dark × 普通／繁忙圖片背景 × desktop／390px × blur可用／fallback × reduced motion。量測文字、placeholder、border、focus ring；檢查 backdrop-filter 只有一個視覺 owner、退出末幀沒有實心閃白。保留 before／after 與 computed tokens，不以「看起來順」替代驗收。

## 10. 競品研究：可借用甚麼，以及取捨

以下五例均是 **D 官方文件研究**，不是本次以新帳戶逐步操作競品，也沒有引用未量度的 conversion lift。右欄是 **I 對 MyBestLifeOS 的調整提案**。

|產品與來源|官方文件描述|適合 MyBestLifeOS 的調整／取捨|
|---|---|---|
|[Notion：Start with a template](https://www.notion.com/help/start-with-a-template)|可按 onboarding 回答取得 starter templates，再使用、修改或刪除|只給「安排今日／整理一個專案／保存知識」少量起步模板；模板內一個真實操作。完整模板市場太早會增加選擇負擔|
|[Todoist：Get started](https://www.todoist.com/help/todoist/get-started/get-started-with-todoist-OgNNJR)|介紹建立任務、日期、Inbox、Today；新用戶新增任務欄位顯示自然語言例子，完成15項任務後例子停止|借用就地示例、未分類 Inbox、先 capture 後整理；MyBestLifeOS 若沒有完整自然語言日期 parser，必須顯示解析結果及可改日期，不假裝識別所有句子|
|[Things：核心清單](https://culturedcode.com/things/support/articles/4001304/)|Today、Upcoming、Anytime、Someday 等清單清楚分工|Tasks＝所有待辦，Planner＝今天怎做，Calendar＝跨日時間；明說 scheduled date 與 deadline，避免三頁都聲稱是完整今日總覽|
|[Sunsama：Daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/)|回顧昨日、選今日任務、估計工作量、可選 timebox、最後回顧分享|將流程核心改為選一件→估分鐘→安排；首次只一件，不要求所有integrations。日後才提供可選每日儀式；[FAQ](https://help.sunsama.com/docs/faq/faq/) 的強制 onboarding 模式不適合直接照搬到多入口 Life OS|
|[Linear：Start guide](https://linear.app/docs/start-guide)|提供入門教學與可試 Intro Demo；文件說 demo 為瀏覽器本地資料，reload 重設|可設完全隔離的產品示例，明確說「示範，未儲存到帳戶」；不可像現有 Calendar 把 mock 嵌進真實帳戶。不要讓完整專業設定先於第一次行動|

共同模式是：先讓使用者看到一個可完成的成果；示例放在工作位置；進階功能等有需要才教；保存與完成有清楚回饋。這些是設計方向，是否適合目標公眾仍需下節的實測。

## 11. 分階段執行計劃與發布 Gate

估算為**有效人日**，假設熟悉現有 Next.js／Supabase、重用現有元件；不含等待帳戶／供應商／使用者招募。範圍相交，不能把每列直接相加当單人日曆工期。先小批 pilot，再全面公開。

|階段|範圍／依賴|預計工作量|驗收標準|
|---|---|---|---|
|0 證據與測試基礎|固定 release候選commit；隔離seeded帳戶，空白／有資料／錯誤fixtures；設公開功能名單|1–2工程人日|每條路由有預期；未完成頁不在主導覽；匿名、權限、儲存測試可安全執行|
|1 信任與資料 P0|Calendar去mock；About Me問卷保存／錯誤；Privacy與consumer資料盤點；關係頁load故障；依賴0|5–9工程＋1–2產品人日|真實摘要每條可追溯；回答reload不丟；load error不變空表；資料說明與實際行為對得上；People正常或明確暫不開放|
|2 首次價值 P0|縮主Wizard；task→plan冪等保存；GPS獨立；About Me三題起步／optional；mobile首屏操作；依賴1|4–7工程＋2–3設計人日|不開AI／不給GPS仍可完成first plan；深連結登入後返回；失敗不重複建goal／task；390px可找到起步CTA|
|3 共用surface及核心motion|先Task／About Me／Documents／Quote四種樣本；接BaseUIpresence；依賴0可與1分工進行|3–5工程＋1–2設計人日|light/dark材質一致且通過對比；核心modal退出完成、無焦點／scroll鎖殘留；reducedmotion通過|
|4 發布驗證|整合前3階段；新用戶研究、核心E2E、權限與真手機測試|2–4工程＋2研究人日|所有P0通過或功能從發布範圍撤出；不能以文件描述代替測試|
|5 發布後優先 P1|Career重複入口及進度、Journal減負、Knowledge找回流程、全站Selectlabel、更多自訂motion、Signals/Garden引導|6–12工程＋2–4設計人日|對應audit acceptance通過；量度首個成果及返回使用，不只看tour完成率|
|6 稍後 P2|Brain進階視覺、完整模板library、裝飾motion、低頻工具整合|按數據選2–5人日一批|改善可追溯到需求；不拖慢核心capture／plan|

**必要 Gate：** G1 真實資料與示範隔離；G2 task→plan及About Me保存／重試／重載；G3匿名入口與資料說明；G4核心keyboard／mobile；G5所有預定公開路由可用或有可完成替代路徑；G6共用modal關閉、焦點和reducedmotion；G7真實新用戶能自主完成第一個成果。

工作優先順序以資料丟失／誤導與核心完成率高於純外觀；Liquid Glass 是發布風格目標，先確保最常見modal達標。全站低頻 tooltip 的動效精修可P1，不應用它擋住已修復的核心小範圍 pilot。

## 12. 如何驗證改善真的有效

招募6–8名未用過本產品的人，另3名熟手；至少一半用手機，包含只用keyboard者。任務不提示按鈕位置：「安排今天做一件重要事」「保存一條值得記住的資料，稍後找回」「回答About Me一題，離開再回來修改」「說出AI何時會使用你的答案」。對比現版和候選版，以相同任務及資料起点，交錯順序減少學習效應。

|衡量|建議通過目標（非本次已量度）|證據|
|---|---|---|
|產品理解|至少80%能說出一個用途與起步操作|首次30秒後自己的說法，不給選項提示|
|第一個成果|至少80%無協助完成；首次task→plan中位數≤3分鐘|錄影＋事件時間；只記server確認成功|
|About Me用途理解|至少80%能區分保存檔案、選用AI和公開頭像|teach-back；不能只問「明不明白」|
|續填／修改|全部工程fixture無答案遺失；使用者至少80%能找到續填|reload／back／跨tab／斷網／conflict案例|
|錯誤修復|看到錯誤後能定位欄位並修正；同一次失敗最多一個主通知|Journal及其他表單實測|
|熟手效率|核心capture所需步數不增加；Help不重複彈|老用戶完成時間、撤回／快速操作|
|手機與動效|核心流程無整頁橫向溢出；鍵盤／focus正確；壓力序列無殘留|390/360寬、200%縮放、iOS/Android、Chrome/WebKit；逐幀與效能trace|

建議事件：`onboarding_seen/skipped/resumed`、`task_create_succeeded`、`plan_commit_succeeded`、`first_plan_committed`、`about_me_save_failed/recovered`、`help_reopened`。只收ID類型、時間、流程版本和錯誤類別；**不收原始答案、日記內容、prompt或私人檔案文字**。Retention基線現在未知，不臆造「改善會提升X%」。

## 13. 開發交接、證據與尚未完成事項

此報告只新增研究與證據檔，**沒有修改 app 功能、沒有push、沒有deploy、沒有migration**。P0／P1是工作清單，不是已修復清單。

主要程式定位（下列省略的路徑均相對 `app/src/`，migration／schema相對 `app/`）：

- About Me：`app/src/app/[locale]/(protected)/about-me/page.tsx`，`hooks/use-about-me.ts`，`lib/repositories/about-me.ts`，`lib/brain/adapters/about-me.ts`，`app/src/app/api/ai/role-model/_shared-intelligence.ts`。
- Onboarding：`components/onboarding/onboarding-gate.tsx`、`onboarding-wizard.tsx`、`step-4-goals.tsx`；`lib/supabase/middleware.ts`；`settings/page.tsx`重新開始入口。
- Material／motion：`globals.css:205`、`project-design.css:18/58/195`、`ui/os-glass.ts`、`ui/os-primitives.tsx`、`ui/dialog.tsx` 等；`lib/motion`、`lib/animation/os-motion.ts`。
- Calendar信任：`lib/calendar/ai/index.ts:46/117/133/150`、`lib/calendar/mock/ai.ts`、`hooks/use-today-context.ts`。
- Privacy：`lib/i18n/misc-ui.ts:395`、`(protected)/privacy/page.tsx`、`lib/supabase/middleware.ts`、`supabase/migrations/20260415000000_profile_avatars_storage.sql`、`supabase/schema.sql:1040`。

執行紀錄與證據：[receipt.md](../artifacts/public-launch-audit-2026-09-07/receipt.md)、[evidence-index.json](../artifacts/public-launch-audit-2026-09-07/evidence-index.json)、[issue-list.csv](../artifacts/public-launch-audit-2026-09-07/issue-list.csv)。另有[程式與Git證據摘錄](../artifacts/public-launch-audit-2026-09-07/source-evidence.md)。HTML閱讀版與上述Markdown、CSV內容一致；截圖含既有帳戶畫面，僅留本地供本次審閱。

本次執行了 `./scripts/doctor.sh`（exit0，有環境警告）、路由盤點、Git history／差異核對、正式UI操作，以及報告結構／連結／證據檔檢查。未改app，沒有用整站build結果冒充UX驗收。環境顯示Node25而repo要求Node22；下輪實作先對齊。Vercel CLI 54.18.3 已落後於本次提示的59.11.7，**強烈建議**下次部署工作前升級以改善相容性及使用新版 agent 功能： `npm i -g vercel@latest`；本次沒有安裝或更改全域工具。

下一步可以直接從階段0–1開發票開始：先固定release候選與測試帳戶，再處理Calendar真實資料、About Me保存及Privacy用途一致性。完整onboarding與glass/motion按本報告的state、token和acceptance逐步落地。
