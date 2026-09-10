# My Garden 決策更新：目前 repo 與推薦開發順序

2026-09-08｜本輪唯讀研究與設計修訂；沒有修改遊戲程式或部署。

**建議：沿用同一個持久家園，先完成活水魚塘的最小可玩版本，再以玩家試玩結果決定繁殖與濕地。** 完整玩法、每日行動對照、D1／D7／D30 故事、動態任務、Buddy、架構及量測見 [完整方案](proposal.zh-TW.md)。本頁更新原研究之後已變動的 repo 事實；不要把舊審計的「尚未有魚塘程式」當成今天的工作目錄狀態。

## 1. 本次核對範圍與證據界線

本次重讀 Garden 的 scene／world／UI／rules／persistence、生活來源 repositories、Buddy hook、候選 SQL 與研究資料。HEAD 為 `d467ab83f2a949f7738b01d6c99aa2bfc09092bb`，工作目錄有大量未提交的跨功能修改。因此「檔案存在」「本機曾通過檢查」「正式帳戶正在使用」是三種不同狀態。

[原 schema 審計](production-schema-audit.json) 的觀察時間為 `2026-09-08T15:44:35.359Z`，只含 metadata。本輪沒有重新連線查正式資料庫，也沒有讀取使用者任務或日記內容；該紀錄中的缺表／欄位差異須在實作或發布前刷新。前版發布基準來自既有紀錄，本輪沒有重新確認線上部署。

[release-readiness.md](release-readiness.md) 記錄本機候選驗證及未完成的發布閘門。當中的測試結果只適用各 receipt 記錄的來源版本。本次讀到最新原生 PostgreSQL receipt：34 項通過，包含十項明確關聯證據的權限、重試、刪除與並行檢查；它使用隔離 fixture 帳戶。當時最新關聯介面的完整遊玩、正式 schema 與實體手機尚未驗收，不能由資料庫測試推定已上線。詳見 [本次核對收據](research-delivery.md)。以上為研究階段紀錄；後續 app 建置與遊玩驗證見下一段，正式 schema 與實體手機仍未驗收。

**後續實作更新：**此前關聯測試第三步失敗已查明：fixture 的資料庫 current_date 與選定 Habit occurrence 差一天。測試現在先驗證錯日期拒絕，再保存正確 occurrence；八項關聯 UI 流程已全部通過。觀察模式、可收起工具及八項沉浸操作亦已實作並驗證。詳見 [最新實作進度](implementation-update.zh-TW.md)。後續已另行修正原 Habits 頁面的裝置日期／帳戶時區差異，五項原 Today 頁操作及最新 42 項原生 SQL 檢查通過；見 [Habit 日期契約](habit-calendar.md)。仍未代表正式環境發布。

## 2. 目前能力矩陣

「可讀」指 repo 有資料讀寫途徑；「可授獎候選」指本機已有規則程式，仍須驗證及發布。兩者都不代表真實生活行動已被客觀驗證。

| 範圍 | repo 已支援／本機已存在 | 仍需擴充或缺乏可靠資料 | 設計決定 |
| --- | --- | --- | --- |
| Tasks／Projects | Task status、completed_at、project_id、priority、estimated_blocks、scheduled_date；專案有狀態／優先度。候選 receipt 支援完成與自選部分推進 | 沒有可沿用的通用拆分／重建 lineage；投入時間是估計；所有 bulk／AI／Planner 寫入入口未完整驗收 | 首版讓使用者選具體 Task；專案是方向與來源，不能另發第二份獎 |
| Goals | 狀態、日期、分類、Key Result 數值 | 沒有可直接假設的 Goal→Project FK 鏈；KR 編輯不是完成事件 | 只用使用者明確選的方向；里程碑先連回具體行動 |
| Schedules／Planner | daily_plans、Tasks／Habits 等日曆投影；排程及改期 | 時間經過不代表出席；歷史 schema 審計缺 planner_focus_sessions；沒有可靠「整理完成」事件 | 改期免費；日後新增一次明確的安排確認，不按拖動次數授獎 |
| Habits | `(habit_id, completion_date)` upsert、done／skipped、value、frequency | Timer 與 Task 可能描述同一行動；改期不能創造新 occurrence | 按習慣原 occurrence 去重，value／分鐘不倍增 |
| Gratitude | `grateful_things`；魚塘候選只查 ID／created_at | 和 Journal appreciation 的同一行動仍需明確關聯 | 可接入首版；不讀內容或評價真誠度 |
| Journal | 保存／讀取 repository；已有舊新欄位的讀取相容處理 | writer 仍使用 quadrant／project_ids／task_ids，而歷史正式 metadata 使用 emotion_quadrant／linked_*；未證明整條寫入成功 | 先做 schema 與保存驗收，首版不依賴日記 |
| Knowledge／Learning | 收藏、處理狀態、摘要；部分學習 session 資料 | 沒有通用「已回憶／已運用」證據；ready／checked_at 不等於學會 | P2 新增明確自報的應用記錄，或連完成的實作 Task |
| Career | opportunities、stage_history、next_action_date、decisions／events | 沒有統一、不可重複的準備行動事件；外部結果不受本人控制 | 先連準備／跟進 Task；不用 offer、薪資或拒絕定義獎勵 |
| 個人方向／偏好 | profiles focus_areas／focus_mode／timezone／tone；About Me mission／core_values／sections | 自由文字不是可比較價值分數；尚無完整遊戲推薦政策驗收 | 使用者接受 1–2 個方向；預設不掃描日記或整份 About Me |
| Garden V2 與生活訊號 | `getLifeActivity()` 仍是 Task／Habit／Journal existence boolean；既有 3D 探索與操作框架 | 這三個 boolean 不構成持久生活事件或一次領獎證據 | 保留框架，新的生活授權另走候選交易層 |
| 活水魚塘候選 | `pond.ts` 有 12 格、4 類物件、3 種發現、魚路與成熟狀態；`pond-world.ts` 有兩尾魚、三個漣漪及 instancing；`PondPanel` 有操作入口 | 未發布；不能據程式宣稱實機流暢或玩家覺得有趣；個體繁殖／濕地尚非此版本內容 | 先收斂一個代表性場景，完成有差異的兩種配置與保存驗收 |
| 帳戶／同步候選 | `garden_worlds`、intention、receipt、grant、command、world event；account 驗證、revision 與 outbox；明確關聯證據已有隔離 PostgreSQL 檢查 | linked evidence 介面已有隔離驗證；原 OS 寫入入口及正式 schema 仍待完整驗收；候選 SQL 不等於正式 schema | 收斂後才發布；不把未知請求失敗當成「沒領到」重新發卡 |
| OS Buddy | 既有前端反應；候選有 world fact invitation、展示回報與偏好檢查 | CustomEvent 不能授獎；沒有已完成的 Garden 背景 Web Push；新邀請未證明正式可用 | 首版用內容化前景邀請，遵守 opt-in／quiet／focus；背景推播另列階段 |

主要程式證據：[Garden 生活讀取](../../../app/src/lib/repositories/garden.ts)、[Task repository](../../../app/src/lib/repositories/tasks.ts)、[Habit repository](../../../app/src/lib/repositories/habits.ts)、[Journal repository](../../../app/src/lib/repositories/journal.ts)、[魚塘規則](../../../app/src/lib/garden/pond.ts)、[候選來源介面](../../../app/src/lib/repositories/garden-pond.ts)、[候選 SQL](../../../app/supabase/migrations/20260908162634_garden_living_pond.sql)、[Buddy 邀請](../../../app/src/hooks/use-garden-buddy-invitations.ts)。

## 3. 研究如何改變設計

重新查核官方資料後，仍推薦以下組合。這是機制借鑑與本案推論，不是預測本產品會有相同成績。

| 來源 | 可確認的事 | 對 My Garden 的取捨 |
| --- | --- | --- |
| [Animal Crossing 官方入門](https://www.nintendo.com/jp/ichikara/acbaa/index_en.html)／[Nintendo IR](https://www.nintendo.co.jp/ir/en/finance/software/switch.html) | 能配置住處、採集、釣魚、收藏；IR 截至 2026-06-30 顯示該 Switch 銷售口徑 50.29 million，屬人氣證據 | 保留一個可回望的家與收藏；核心物種不受半夜／限時窗口限制。銷量不能證明回訪因果 |
| [Koi Farm 作者頁](https://jobtalle.itch.io/koifarm) | 選配花紋、收藏卡與未發現變化引導；[原始碼](https://github.com/jobtalle/koi) 有 Web 技術與 Electron 建置 | 魚要有個體選擇與可預期的培育方向；它不是本案跨裝置 3D 或留存的驗收證據 |
| [Stardew Valley 官方更新](https://www.stardewvalley.net/stardew-valley-1-4-update-full-changelog/)／[Terra Nil 發行商商店頁](https://store.steampowered.com/app/1593030/Terra_Nil/) | 前者池塘可繁殖魚／產出物品；後者以環境配置恢復棲地 | 借鑑棲地條件與長期用途；不加入高頻收產、每日清潔債或缺席荒廢 |
| [Townscaper 發行商](https://rawfury.com/games/townscaper/)／[WebGL demo](https://oskarstalberg.com/Townscaper/) | 配置直接生成不同形狀；demo 明載不支援 mobile | 第一分鐘就讓放置造成可見差異；不能拿原生手機版本或 WebGL 名稱保證手機支援 |
| [Slow Roads 作者技術文](https://web.dev/case-studies/slow-roads) | 瀏覽器 3D 玩法；作者以玩法範圍、更新安排與環境成本處理效能 | 單一近看區、有限魚群、分層細節；不先同時模擬四個區域 |
| [Finch 今日重點](https://help.finchcare.com/hc/en-us/articles/37780061122957-Goal-of-the-Day-Explained)／[新手指南](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide) | 使用者自選重點；完成生活目標支援伙伴冒險，回來分享故事 | 借鑑自己選與伙伴解釋成果；不照搬限時商店、簽到修復或冒險等待來限制本案遊玩 |
| [Duolingo 官方 A/B 報告](https://blog.duolingo.com/improving-the-streak/) | 降低 streak 最低門檻後 D14 留存相對增加 3.3%；每日目標達成者減少 | 容易開始值得測，但回訪與生活價值必須一起量測；不能把 3.3% 當我們的預期 uplift |

[PENS 研究者說明](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/) 支持把自主選擇、易掌握控制、清楚回饋作為設計檢查。這不代表本案已證明心理效益，也不把 Buddy 等同真人關係。沒有找到足以支持「上述魚塘機制會提高本 OS 留存」的直接因果證據。

## 4. 明確的首版產品決定

**世界：同一個天空家園，分區開放。** 魚塘先做配置／魚路／觀察；濕地之後做水道分流與棧道連通；林地做光隙與動物通路；溫室做特性配對。後三者必須各有不同動詞，沒有通過 prototype 就不排成必交內容。

**兩條成長軌道：**生活完成讓你新增永久物件，遊玩理解讓你發現行為、物種及配置方法。任何已擁有物件都能免費收起／重排，沒有卡也能繼續觀察。所有可靠入口給等價選擇；只用 Tasks 或自選休息的人不會缺某種必要建材。

**每日／每週／長期：**每日 2–5 分鐘安置或觀察一件事；每週自選一個「想完成的角落」，未完成就保留；長期累積生態方案、收藏和新區域。8 小時成熟是一次已取得資格的外觀進展，沒有錯過窗口；繁殖需玩家主動配對，離線不連續生出數百尾魚。

**機會上限初值：**兩個進行中的小步，rolling 24h 最多 2 次、168h 最多 6 次新增建設。上限是待測的產品限制，介面提前解釋、沒有配額倒數。超限仍保留生活成果，但不建立延後領卡佇列；已發機會永久保留。若試玩顯示限制太不透明或形成挫折，先調整此規則，不加更多貨幣掩蓋問題。

**第一版不靠等待解鎖互動：**免費 starter 立即有兩尾魚、兩株岸草、一片浮葉、一塊石頭。先走通一條魚路，再選是否連接生活模組；第一張生活卡只讓自己多作一個配置選擇。物種條件成立就可觀察，不以盯著倒數作技巧。

## 5. 必須解開的「同一小步」規則

現有候選已有 `garden_evidence_links`、`evidence` command 與 UI。推薦保留「使用者明確宣告同一行動」的方式：Task、Habit 或 Gratitude 記錄可以指向同一 intention；任一筆有效完成可以確認這一步，整組最多一次機會。不得按標題或日記相似度擅自合併。未領／已領後關聯、解除、刪除、帳戶隔離與並行確認已有隔離資料庫檢查；介面上的關聯、未知回應重試與跨裝置讀回仍要整條驗收。

但 **關聯證據不是完整 Task lineage**。首版同一 Task 的「部分推進」與「全部完成」共用一次建設機會，不代表完成長專案的人只能永遠拿一次。大型工作若確有下一個不同成果，應選另一個具體 project task；未來再增加有獨立 ID 的 step occurrence。不能靠把同一 Task 改名／重選 intention 多領。

未來 lineage 規格要分清三種關係：複製／重建是同一成果的別名；拆分是本次成果的組成部分；真正後續投入是新的 step occurrence。新的 occurrence 應保存使用者在確認前選定的完成範圍與版本，禁止把已結算成果再拆成數筆回填。只靠多張資料列或 parent_id 不能替這個產品決定作判斷。

合理的取消完成、專案暫停或目標轉向只影響未來推薦。已建好的岸邊保留；刪除私人來源後清除標題與可識別連結，留下通用來源類別。未領機會若沒有剩餘有效證據則不能補發。防刷目的只是限制不合理加速，不判定人的生活價值。

## 6. 首版魚塘範例與沒有新卡的一天

小晴完成作品集初稿，選了一片岸草。她在池塘把它放到既有岸草旁，留下開水面，形成螺的棲地；再選三個水紋點，引導魚繞過石頭。若把出口堵住，預覽說明阻塞的位置，免費移開即可。保存後岸草的來源卡連回她自己選的初稿，圖鑑留下首次觀察。

翌日她沒有新生活成果，仍可以移石頭、沿相同三個水紋點測試另一條魚路。兩種配置的路徑必須在 3D 動畫與文字／低動態模式都看得出差別。如果玩家只是照亮三個固定按鈕，或移物件不改變魚的行為，這個版本就沒有達到「真正可玩的遊戲」標準。

Buddy 在她停下時解釋：「你完成的初稿讓這片岸邊有了位置。下次想加個觀察角，還是先看看魚？」可以回原專案選下一步，也可以結束。沒有新事實時不說「新魚到了」。詳細物種條件、繁殖、其他區域與 D1／D7／D30 故事在完整方案第 4、8 節。

## 7. 畫面與聲音的驗收補充

沿用 sage／lime、柔木石、奶白玻璃和原創 76 BPM 音樂；保留單一 renderer／音訊管理者。現有候選畫兩尾魚，因此完整方案的 6／12 尾是未來裝置預算上限，不是首版應增加到的數量。

高解析度優先做乾淨輪廓、可辨魚影、近看鏡頭與原生清晰的 DOM 文字，再調整 drawing buffer。DPR 上限之外還需總像素上限，避免桌面全螢幕在高 DPI 下成倍增加成本。Three.js 官網 responsive 頁直開仍回傳 404，本次已改讀 [官方 GitHub 原文](https://github.com/mrdoob/three.js/blob/master/manual/en/responsive.html) 的 HiDPI／最大 buffer 範例。[InstancedMesh 官方文件](https://threejs.org/docs/pages/InstancedMesh.html) 支持共用 geometry／material 減少 draw calls，但不保證特定手機幀率。

目前 `AdventureScene.tsx` **已有**總像素預算：high 7 百萬、其他 4.5 百萬，配合 DPR≤2／省電≤1.25 與動態縮放；因此完整方案的 1／2／4 百萬是待比較的調校方案，不是新增能力。現有最終 pixel ratio 另有 0.8 下限，極大視窗時仍須測量實際 buffer 是否超出預算。先比同一場景的清晰度與 frame time，再決定數值，不把降低畫質本身當改善。

研究階段的桌面及 320px 截圖顯示工具面板遮擋水面，因此提出按需收起工具。後續候選已加入「專心看魚塘」：布置／觀察可收起工具並保留選擇，生活表單維持可見。觸控與鍵盤測試通過；目前仍是可切換的精簡面板，完整單列工具盤與實體裝置流暢度仍需後續評估。

此缺口已在候選程式修正：`pond-world.ts` 現在由 `frame.activity` 區分布置、觀察和生活模式。觀察時隱藏格線、選取框與物件預覽，僅保留實際選定的水紋點；減少動態使用靜態環形標記。相同結果仍可用鍵盤與 DOM 替代操作取得。

| 實際事件 | 聲音設計 | 重複與可及性控制 |
| --- | --- | --- |
| 進入／離開池邊 | 原曲持續在同一節拍；淡入稀疏水聲與較薄配器 | 不再開第二個 loop；暫停／失焦可停止，回來不堆疊 |
| 物件預覽 | 輕、短的木觸感或無聲 | 不每移一格疊一個音；100–150ms 節流為待測初值 |
| 確認放置 | 岸草柔刷、石頭低沉輕碰、浮葉水滴 | 「正在同步」與「已保存」用不同視覺狀態；成功音只隨確認事件一次 |
| 水紋引導 | 三個低音量同音階水滴，尾音短 | 不按每尾魚發聲；看得見相同路線與阻塞說明 |
| 物種發現／成熟 | 原曲音階的兩三音應答；Buddy 延用既有 motif | 同事件一次；最多約 8 個短 SFX 同時發聲，優先保留使用者操作 |
| 操作尚不成立 | 柔和提示與文字說明 | 無刺耳錯誤警報，靜音不損失訊息 |

手機／平板需測橫直轉換、44px 操作區、safe area、鍵盤與點選替代、pointercancel、全螢幕退出與焦點恢復。Native fullscreen 依瀏覽器能力使用；不支援時提供 100dvh 沉浸視圖，不能把後者稱為原生 fullscreen。[MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)

實機中階手機以穩定 30fps 為初始目標；低檔關閉昂貴水面效果與陰影，仍能取得相同成果。無 WebGL 是可操作的 DOM 棲地模式，不能聲稱同樣提供 3D。模擬手機截圖無法證明十分鐘後的發熱、音訊解鎖或掉幀。

## 8. 從目前候選程式走到可評估版本

| 階段 | 現在應做的工作 | 放行條件 |
| --- | --- | --- |
| P0：候選收斂 | 保留現有魚塘基礎，核對 linked evidence、資料版本、來源入口與正式 schema 相容性；建立只含此功能的可審閱修改集合 | 同一來源／同一組關聯只發一次、兩帳戶隔離、未知回應可原樣重試、撤銷／刪除不吞世界、原 OS 寫入不被破壞 |
| P1：可玩與可理解 | 一池／4 類物件／3 物種／兩種魚路／一次成熟；四種生活入口；來源解釋、Buddy、觸控／鍵盤／fallback | 來源完成後 5 分鐘內能建成一物；無卡能玩；兩裝置相同世界；實機與音訊生命周期通過；不是只通過截圖 |
| P1 產品驗證 | 6–8 位自願玩家，先玩無生活獎勵的配置，再走生活來源；兩週 beta，滿月再看 D30 | 8 人版本初值：6 人能自行完成配置、6 人說清因果、5 人願意再試；若人數不同按同等比例預先訂門檻。這不是統計留存實驗 |
| P2：魚塘深度 | 個體命名／特徵、可預期配對、收藏水灣、自選每週工程；按能力接 Journal／Knowledge 應用 | 首版理解與享受度過關；30 日缺席無債、繁殖去重、有限展示不沒收個體 |
| P3：新生態 | 先驗證濕地分流，再評估林地／溫室；不一次建四區 | 玩家能描述新區與魚塘的不同決策；新增區不破壞手機預算與原存檔 |

原方案的週數是從零規劃的粗估；目前已有候選程式，不能直接當剩餘工期。收斂 diff 和驗收缺口後再排期。版本遷移應 additive、feature flag 可退回、既有世界保留；應以小範圍實作驗收後才安排正式 migration／push／deploy。

## 9. 成效判斷與優先風險

北極星候選仍是「每週有自選生活成果，且親手留下世界變化的啟用使用者比例」。同報有意義 OS 行動回訪、Garden 有操作回訪、專案下一步、無獎勵自主重玩、享受程度及提醒負擔。原始 task 數量、遊玩時長、通知點擊率不能單獨代表成功。

第一個風險是配置選擇太淺：3×4 很快被解完。若無卡自主重玩不足，優先修改石頭／路線／物種條件的互動，不用增加登入獎勵補救。第二是因果解釋太複雜：少讀說明、先玩一次；發卡原因與同步狀態以一個短句呈現，技術細節留在可打開的來源記錄。第三是為防刷而傷害合理小步：用明確 linkage 與限額，不用 AI 評價內容。

沒有自家 baseline 前不承諾 uplift。定性試玩不代替 A/B；後續按帳戶隨機、預先訂主要指標、樣本量、觀察窗、停止規則及護欄。回訪上升而生活推進下降，或提醒負擔增加，均不算成功。玩家每週回來兩三次仍有意義，也不必為 DAU 改成強制每日清單。

## 10. 本輪交付收據

本輪交付為完整方案修訂、本頁最新 repo 決策補充、來源核對及可閱讀的 HTML。沿用既有 2D 規則示意，只作設計討論；沒有當作帳戶遊戲或留存證據。

實際使用 skills：threejs-game-director、threejs-gameplay-systems（genre-design）、threejs-game-ui-designer（ui-patterns）、threejs-debug-profiler、threejs-audio-generator（audio-workflows）；並讀取 three 確認其 HyperFrames 專用範圍，沒有把影片時間軸架構套進互動遊戲。

本輪未做：app 程式修改、付費資產生成、正式資料寫入、migration、push、deploy、實體裝置或真實玩家研究。文件驗證結果另見 `research-review-validation.json`。後續最值得投入的是 P0／P1 的可玩性與可靠性收斂，不是擴增世界數量。
