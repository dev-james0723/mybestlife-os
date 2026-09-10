# My Garden 研究與設計交付收據

2026-09-08｜本階段：研究、遊戲設計與實作方案。沒有新增遊戲功能、生成付費資產、改動正式帳戶或部署。

## 決策與閱讀順序

**推薦先做 P0＋P1 活水魚塘：同一持久家園、四類棲地物件、三種動物、可重玩的魚路，以及四種生活入口。** 生活提供新增建設機會；玩家親自配置與觀察，才能留下世界變化。以自主遊玩的證據決定是否做繁殖與濕地。

1. [完整方案](proposal.zh-TW.md)／[網頁閱讀版](index.html)：世界結構、每日／每週／長期循環、十種可選生活行動、池塘玩法、D1／D7／D30、動態規則、Buddy、架構、畫質與音效、階段驗收及成效量測。
2. [目前能力與取捨](current-review.zh-TW.md)／[閱讀版](current-review.html)：區分現有資料、未發布候選與仍缺可靠證據的能力。
3. [研究來源](sources.md)：七個玩法案例、Nintendo 人氣口徑、Duolingo 留存實驗與 PENS 動機研究，分開事實和本案推論。
4. [首輪試玩執行包](playtest-protocol.zh-TW.md)：6–8 位玩家的中立流程、裝置要求與決策標準；目前未招募或取得結果。

## 需求覆蓋

| 要求 | 完整方案位置／補充證據 |
| --- | --- |
| repo、資料能力及缺口 | 第 1 節；current-review 的能力矩陣；歷史 repo-audit 與 schema metadata |
| 成功案例與證據界線 | sources：開始／繼續／再來、可借鑑／不移植、人氣與實驗的分別 |
| 世界與生活循環 | 第 2–3 節：同一家園分區、雙軌成長、每日／每週／長期 |
| 行動→回饋→世界→解鎖 | 第 5 節：十列任務；完成依據、操作、立即回饋及接入階段 |
| 魚塘與其他區域 | 第 4 節：配置、魚路、三物種、成長、後續繁殖；第 2 節比較濕地／林地／溫室 |
| 新玩家故事 | 第 8 節；D7／D30 的後續內容與 P1 實際范围分開 |
| 動態計畫、防刷與回歸 | 第 6 節；明確關聯、拆分、重建、部分完成、休息與長期缺席 |
| Buddy、提醒與隱私 | 第 7 節；實際 world event、頻率、quiet／focus／opt-out；前景與背景推播分開 |
| 三維／聲音／跨裝置 | 第 10 節；畫面狀態、解析度／魚群／水面預算、觸控／鍵盤／全螢幕／fallback |
| 架構、分期與成效 | 第 9、11–12 節；owner、唯一鍵、版本／日期／重試、migration、驗收、生活價值與提醒負擔 |

## 本次核對

檢查 current HEAD 與 dirty worktree、資料 types／repositories、Garden 生活訊號、Pond 規則與候選 SQL、同步／來源選擇、Buddy 與音訊。20 個關鍵檔案的當下 SHA-256 見 [來源快照](research-delivery-snapshot.json)。工作目錄已有大量其他修改，這份收據只對研究文件修訂負責。

實際閱讀已安裝的 threejs-game-director、threejs-gameplay-systems／genre-design、threejs-game-ui-designer／ui-patterns、threejs-debug-profiler、threejs-audio-generator／audio-workflows，以及 three。three 是 HyperFrames adapter；本遊戲繼續沿用既有 Three.js 更新迴圈。使用 Browser skill 檢查研究閱讀頁。

本次查核官方研究來源，確認 Nintendo 該口徑截至 2026-06-30 的 50.29 million 與 Duolingo D14 相對 +3.3% 的取捨。Slow Roads 正文現在可讀；Three.js responsive 官網直接抓取仍失敗，已改讀官方 GitHub 原文。沒有用他款遊戲數字推測本 OS 的成效。

檢視兩張既有本機候選截圖作美術／遮擋分析：artifacts/garden-v3/playthrough/desktop-built-pond.png、artifacts/garden-v3/layout/phone-320-zh.png。這些不是本次新的實機或正式帳戶截图。

既有原生 PostgreSQL 驗證程序回傳 34/34 通過；本次比對 receipt 裡三份 migration hash，均與目前檔案相符。它只涵蓋隔離 fixture 帳戶的規則與並行檢查，不能替代最新關聯介面、真實登入、正式 schema、實機或玩家享受度驗收。沒有在本次啟動新的遊戲 build／SQL 測試。

補充核對先前執行中的 UI 檢查：前兩步通過，第三步「保存 linked Habit 後確認共享機會」逾時，後五步未執行。失敗畫面為「先在生活模組保存」，根因尚未確認；不是整條連接已驗證。程式檢查同時確認現有 renderer 已有限制總像素，且觀察格線尚未按模式隱藏。最新設計因此修訂為畫質調校／模式整理，而非重新新增已存在的能力。

## 文件變更與驗證

修訂 proposal.zh-TW.md、current-review.zh-TW.md、sources.md：釐清目前候選狀態、完整 Task lineage 缺口、P1／P2 資料邊界、D7 內容限制、畫面狀態與總像素上限。使用既有 `python3 docs/garden-research/v3/build-report.py` 重建四頁 HTML 與規則示意，不改 app runtime。

本次新收據／快照／文件驗證結果皆位於同一研究目錄。文件結構、本機連結、閱讀頁与示意互動的檢查結果見 research-delivery-validation.json；它不驗證帳戶連接或 3D 性能。

追加設計補充：P2 配對的明確特性選擇與 brood 規則、Habit 原 occurrence 與 04:00 生活推薦日的區別，以及以全體隨機分組帳戶為分母、把玩法與提醒分開測試的實驗規格。追加修訂的當下快照／驗證另見 `design-decision-validation.json`，既有 `research-delivery-validation.json` 保留為前一版閱讀頁的歷史檢查。

## 未完成與下一步

正式 schema 是先前 metadata 快照，本次沒有連線刷新；自家留存 baseline、真實玩家訪談、實體 iOS／Android／平板、最新版關聯 UI 全流程仍未取得。動物繁殖、濕地、Knowledge 應用事件與背景 Web Push 都是後續規格。

下一個開發決策是收斂 P0／P1 的候選修改與資料入口，再用真實試玩確認「沒有新卡也想調整一次」是否成立。若不成立，先改配置、控制和魚的回饋；若回訪上升但有意義生活行動下降，則不通過產品驗收。
