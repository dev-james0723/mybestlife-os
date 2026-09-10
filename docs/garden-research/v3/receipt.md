# My Garden V3 研究與設計交付紀錄

> 本檔記錄「研究與設計」交付當時的範圍。其後獲准執行的本機開發及最新驗證，請看 [execution.md](execution.md) 與 [release-readiness.md](release-readiness.md)。下文的「遊戲未改動」不代表後續開發現況。

2026-09-08。狀態：**研究與提案完成，正式遊戲未改動**。

## 交付物

主文件：[完整方案](proposal.zh-TW.md)／[互動閱讀頁](index.html)。包含十四個章節：現有能力、案例取捨、世界結構、生活循環、魚塘玩法、每日任務、動態規則、Buddy、第 1／7／30 天故事、資料架構、跨裝置與音訊、分期驗收及成效量測。

證據附件：[repo 審計](repo-audit.md)、[研究來源](sources.md)、[正式 schema metadata](production-schema-audit.json)、[原始碼快照](source-snapshot.json)。後兩者只有結構／雜湊資訊，沒有讀取帳戶生活內容。

推薦開發方向：P0＋P1，單一持久家園內的活水魚塘；四類基本物件、三種動物、兩種可行配置，先接 Tasks／Habits／Gratitude／自選休息。

## 本次驗證

| 檢查 | 結果 |
| --- | --- |
| `python3 docs/garden-research/v3/build-report.py` | PASS；三份自包含 HTML 可重建 |
| `/private/tmp/garden-node22/node_modules/node/bin/node --check docs/garden-research/v3/pond-demo.js` | PASS；Node 22 語法檢查 |
| Python HTMLParser／path／anchor／JSON／SHA-256 核對 | PASS；3 頁、54 個本機連結、26 個目錄錨點；13 個受審計 app 檔案與研究時快照一致。詳見 validation-structure.json；外部來源在研究階段閱讀，沒有把這個檢查當重新抓取網頁 |
| Codex in-app browser 實際點擊 | PASS；遮蔭灣提供魚／螺條件；第一輪觀察記錄魚／螺，第二輪記錄蜻蜓；切換回開放水道仍保留既有發現 |
| 320px 寬度與鍵盤 | PASS；12 個位置，Enter 可放岸草。發現初版格寬 41.5px 後已修正為 46.5px；document scrollWidth 305≤viewport 320 |
| 768px 寬度 | PASS；格寬 153.5px，document scrollWidth 753≤viewport 768；暫時 viewport override 已還原 |
| 閱讀頁 console | 所查範圍沒有 warning／error |
| `git diff --check -- docs/garden-research/v3 artifacts/game-progress.md` | PASS；此命令不涵蓋未追蹤檔的內容，HTML／JS 另以上列檢查驗證 |

畫面：[桌面規則示意](report-desktop-pond.png)、[320px 文件畫面](report-mobile-320.png)。這是本次設計文件與 2D 規則示意，**不是新的 Three.js 遊戲截圖，也不證明手機 3D 效能**。閱讀頁不連接帳戶；沒有育成時鐘、獎勵交易、魚群 steering 或真實水流。

瀏覽器重新載入後曾拒絕一個舊 accessibility index；已重新取得 DOM 並以新控制項完成驗證，沒有跳過失敗或把嘗試算成成功。

## 變更範圍與限制

本次新增 `docs/garden-research/v3/` 的研究、設計、HTML 生成器與驗證證據；`artifacts/game-progress.md` 只追加本階段索引。沒有修改 app runtime、生成新遊戲資產、讀寫真實任務／日記、執行 migration、push 或 deploy。原有 dirty working tree 與前階段發布紀錄保持原狀。

Three.js skills 已用於遊戲循環、場景責任、互動／UI、效能與無障礙方案。詳細列表在主文件第 14 節。既有音樂方向已納入，沒有將 HyperFrames 專用整合加進遊戲。

未完成且不屬本階段交付：實際魚塘程式、帳戶事件／授權 schema、原模組寫入修復、SQL／跨帳戶測試、實體手機效能、使用者訪談與留存實驗。不能沿用 V2 的既有測試數宣稱 V3 已驗證。

下一個開發決定：以 P0 原型驗證玩家能否看懂配置、願意自行試第二個解法，同時落實最小生活來源→一次授權→永久物件的資料契約；符合門檻後才進入 P1。
