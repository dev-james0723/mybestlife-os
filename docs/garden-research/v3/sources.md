# 研究來源、推論與證據限制

查核：2026-09-08；本輪重新讀取主要官方來源，並核對數字口徑。以官方遊戲說明、開發者文章、官方產品實驗及研究者來源為主。沒有把商店評價、銷量或廠商自述轉換成 My Best Life OS 的預期留存。

## 案例比較

| 案例與來源 | 為何開始／繼續／再來（後兩者含設計推論） | 值得移植 | 不移植；證據強度 |
| --- | --- | --- | --- |
| S1 Animal Crossing — [Nintendo 的島嶼玩法](https://animalcrossing.nintendo.com/new-horizons/explore/)、[入門指南](https://www.nintendo.com/jp/ichikara/acbaa/index_en.html) | 開始：自己的島。繼續：採集、釣魚、配置與探索。再來的設計理由：自己建的地方和新遭遇 | 同一個家園的長期辨識度；收藏館保留發現；可自由選擇短活動 | 不照搬特定時間限定生物，避免只在半夜才能完成。官方機制，非留存實驗；探島頁完整抓取超時，機制也由可見官方索引支援 |
| S2 Stardew Valley — [1.4 官方 changelog](https://www.stardewvalley.net/stardew-valley-1-4-update-full-changelog/) | 開始：農場成長。魚塘讓繁殖與產物形成長期用途；配置和需求可建立期待 | 養成有階段；池塘是世界功能的一部分，非孤立魚缸 | 只確認官方「繁殖魚與生產物品」機制；沒有據此假設魚塘帶來留存增幅。不移植高頻收產／成本堆積 |
| S3 Koi Farm — [Job Talle 的遊戲頁](https://jobtalle.itch.io/koifarm)、[原始碼與 license](https://github.com/jobtalle/koi) | 開始：漂亮且可互動的魚。繼續：選配花紋、比較結果。再來：圖鑑引導未發現的變化 | 玩家決定配對；魚有可記住的個體差異；圖鑑提示下一個實驗 | 是機制／web 技術參照，不能稱為已證實病毒傳播或 D30 成功案例。頁面自述 mouse／touch，原始碼提供 Web／Electron 建置；未實測所有平台，也不把它列為已驗證的 3D 跨裝置遊戲。採有 Commons Clause 的授權，不應當純 Apache 任意商用；本案只借鑑概念 |
| S4 Terra Nil — [開發者／發行商 Steam 頁](https://store.steampowered.com/app/1593030/Terra_Nil/) | 開始：把空間變成生態。繼續：依地形配置、建立棲地。再來：不同地形要求不同解法 | 新物種由可見棲地條件引入；不同地區有不同空間問題 | 不移植污染／荒廢作缺席懲罰，也不在完成後清空個人家園。官方機制與商店評價，不是獨立留存研究；Devolver 站點 403，改讀其官方商店文案 |
| S5 Townscaper — [Raw Fury 官方頁](https://rawfury.com/games/townscaper/)、[作者 WebGL demo](https://oskarstalberg.com/Townscaper/) | 開始：一點就看到建造。繼續：嘗試組合帶來不同形狀。長期回訪則不能只靠這項證據推定 | 放置即有材質／形狀／聲音反饋；自由撤銷降低試錯成本 | 單靠搭積木未必滿足本案探索養成需求，故加入物種與棲地。WebGL demo 明載不支援 mobile；原生手機版本存在不等於網頁跨裝置已解決 |
| S6 Slow Roads — [作者 Anslo 於 Google web.dev 的案例](https://web.dev/case-studies/slow-roads)、[2023 原文存檔](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/slow-roads/index.md)、[遊戲](https://slowroads.io/) | 開始：瀏覽器即開即玩。繼續：操控與景色本身。再來：短暫逃離日常的用途是設計推論 | 限定可近看的區域、分層細節、預先配置記憶體，為連續動態留效能預算 | 作者歷史自報只有約 52% 玩家超過 55fps，不能當今天的跨裝置保證或留存數據。其非分岔道路的優化不能原封不動套到自由花園。本次已成功讀取 web.dev 正文 |
| S7 Finch — [新手指南](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide)、[今日重點](https://help.finchcare.com/hc/en-us/articles/37780061122957-Goal-of-the-Day-Explained)、[目標編輯／暫停](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals) | 開始：照顧伙伴。繼續：生活行動給冒險機會，伙伴回來分享故事。再來：關係與自訂期待 | 由使用者選今日重點；允許暫停／延後；伙伴解釋成果而不催債 | 官方產品機制／廠商自述支持感，沒有提供可移用的留存因果。每日隨機商店、限時獎品和等待計時不作首版核心 |

## 人氣、機制與實驗要分開

**人氣證據 S8**：[Nintendo IR](https://www.nintendo.co.jp/ir/en/finance/software/switch.html) 本次顯示截至 2026-06-30，Animal Crossing: New Horizons 在該 Switch 銷量口徑為 **50.29 million**。這是生命週期銷售規模，不能證明哪個機制造成回訪。先前搜尋索引仍顯示 2026-03-31 的 49.91 million，已以直接頁面的較新期間為準。其他案例主要因玩法相關而納入，不一律冠以「爆紅」。

**留存實驗 S9**：[Duolingo — Improving the streak](https://blog.duolingo.com/improving-the-streak/) 報告將每日學習目標與 streak 分開、讓一堂課即可延續 streak 的 A/B 實驗，Day 14 retention **相對增加 3.3%**，不是增加 3.3 個百分點。同文也說達成每日目標的學習者變少。這支持「降低最小參與門檻值得測試」，不支持「花園應該增加 streak 壓力」，更不能把 3.3% 當本案預測。文中 7 日 streak 與次日使用的 2.4 倍關聯帶有選擇偏差，不能解讀為 streak 的因果效果。

**動機研究 S10**：[研究機構的 PENS 說明與原論文入口](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/) 指向 Ryan／Rigby／Przybylski 的四項研究；自主選擇、可掌握的控制、清楚回饋與遊戲享受／持續意願有支持關係。它不是本產品的 D7／D30 實驗。本文將自主、能力、伙伴連結作設計檢查，不聲稱 Buddy 等同真人社會連結，也不聲稱改善心理健康。官方量表有商業使用授權條件，首版採自撰產品訪談題，不複製或宣稱使用經驗證的 PENS 量表。

## 適用於本案的五個結論

1. 第一分鐘要有「我選的位置造成不同結果」，不是先讀十張規則卡。這是 S3／S5 的機制借鑑與本案推論。
2. 生活完成只提供可選的建設機會；世界中的配置、觀察與探索仍由玩家完成。S7 提供情感連接參照，S3／S4 提供實際玩法參照。
3. 用持久棲地與收藏保留記憶，用不同生態規則製造期待。不要把每日重做三塊田當整個長期系統。
4. 短回訪應容易、能自然結束；進度不因錯過一天損毀。S9 支持低門檻的測試方向，但本案的低壓方案仍須自己驗證。
5. 清晰與流暢要一起設計。S6 和官方 Three.js 文件支持分層細節／限制畫素／減少 draw calls 的工程方向，不支持宣稱所有手機都跑 60fps。

## 技術依據

| ID | 來源 | 用途／限制 |
| --- | --- | --- |
| T1 | [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | 同 geometry／material 的魚群或植物可以 instance；要更新矩陣與包圍體，並正確 dispose。不能據此把不同複雜 rig 視為零成本 |
| T2 | [Three.js Responsive Design](https://threejs.org/manual/en/responsive.html)／[官方 GitHub 原文](https://github.com/mrdoob/three.js/blob/master/manual/en/responsive.html) | CSS 尺寸與 drawing buffer 分開處理；限制總像素與 DPR。官網直開仍回 404，本次已讀官方 GitHub 原文的 HiDPI 與 maxPixelCount 範例；不是僅憑搜尋摘要制定畫質策略 |
| T3 | [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | 每用戶資料隔離與權限邊界。RLS 本身不防重領或同步覆蓋，仍需唯一鍵與原子 command |
| T4 | [前版原創音樂設計](../v2/audio-design.md) | 真正的現有配器與 lifecycle，而非替產品另找風格。此為 repo 證據，不是外部研究 |

## 未解決的研究問題

本次沒有自家行為 baseline、實際玩家訪談或池塘 prototype 的享受度資料。魚塘是否比現有採集更有趣、每週 6 次建設機會是否合適、玩家是否看得懂來源、提醒是否打擾，全部列為驗證假設。沒有進行新一輪線上遊玩或實測他款遊戲；機制來自上列官方資料與現有 repo。

## 本輪查核與可讀性

Animal Crossing 官方入門與 IR、Stardew 官方更新、Koi Farm 作者頁與 repo、Terra Nil 發行商商店頁、Townscaper 發行商與 demo、Slow Roads 官方存檔、Finch 三篇說明、Duolingo A/B 報告、PENS 研究者頁與 Three.js InstancedMesh 均已重新讀取。Nintendo 50.29 million 的截止日與 Duolingo 相對 3.3% 已確認；它們分別是銷售規模與他產品的實驗結果。沒有新增他款遊戲實玩、玩家訪談或本 OS 留存數據。

[MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) 供全螢幕能力與平台相容性查核；沉浸式 CSS 視圖只是替代顯示，不能冒稱原生全螢幕。最新 repo 候選程式和設計取捨另見 [決策更新](current-review.zh-TW.md)。
