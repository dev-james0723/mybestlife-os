"use client";

import { Smartphone, RotateCcw } from "lucide-react";
import type { useGardenTilt } from "@/hooks/use-garden-tilt";
import type { TiltSensitivity } from "@/lib/garden/tilt";
import styles from "./garden-adventure.module.css";

export function GardenTiltControls({ tilt, zh, compact = false }: {
  tilt: ReturnType<typeof useGardenTilt>; zh: boolean; compact?: boolean;
}) {
  const t = (en: string, chinese: string) => zh ? chinese : en;
  const message = tilt.access === "requesting" ? t("Allow motion access on your phone…", "請在手機上允許動作感應…")
    : tilt.access === "denied" ? t("Motion access was denied. Allow it in your browser’s site settings, then retry. The joystick still works.", "未獲動作感應權限。請在瀏覽器網站設定允許後重試；搖桿仍可使用。")
    : tilt.access === "insecure" ? t("Open this garden over HTTPS to use tilt controls.", "請透過 HTTPS 開啟花園，才能使用傾斜控制。")
    : tilt.access === "unavailable" ? t("No usable motion sensor received. Try your phone’s browser, or keep using the joystick.", "未收到可用的感應訊號。可改用手機瀏覽器，或繼續使用搖桿。")
    : !tilt.enabled ? t("Hold your phone comfortably. Enable tilt, then hold still briefly to set your neutral position.", "用舒服的姿勢握住手機，開啟後保持片刻，設定靜止角度。")
    : tilt.reading.status === "suspended" ? t("Resume the garden, then hold still briefly to center.", "繼續遊戲後，握穩片刻即可校準。")
    : tilt.reading.status === "stale" ? t("Waiting for motion. Gently tilt the phone to reconnect.", "等待感應訊號，請輕輕傾斜手機。")
    : tilt.reading.status === "calibrating" ? t("Hold still for a moment…", "請握穩片刻…")
    : t("Tip the screen down to move forward, up to move back, or lean diagonally in any direction. Lean further to run faster. Turn your phone horizontally to turn your path. Recenter after changing your grip.", "螢幕向下傾會向前、向上抬會後退，亦可向任何角度斜行；傾得越多跑得越快。水平轉動手機可改變行走方向，換握姿後可重新校準。");
  const shortStatus = tilt.access === "requesting" ? t("Allow motion…", "請允許感應…")
    : tilt.access === "denied" ? t("Access denied · retry", "未獲授權 · 重試")
    : tilt.access === "insecure" ? t("Needs HTTPS", "需要 HTTPS")
    : tilt.access === "unavailable" ? t("No sensor · retry", "無訊號 · 重試")
    : tilt.enabled && tilt.reading.status !== "ready" ? t("Hold still to center", "握穩片刻校準") : "";
  if (compact && !tilt.enabled) return null;
  if (compact) return (
    <div className={styles.tiltCompact} data-tilt-compact>
      <div className={styles.tiltButtons}>
        <button type="button" disabled={tilt.access === "requesting"}
          aria-label={tilt.enabled ? t("Recenter tilt", "重新校準傾斜") : t("Enable tilt controls", "啟用傾斜控制")}
          title={message} onClick={() => tilt.enabled ? tilt.recalibrate() : void tilt.enable()}>
          {tilt.enabled ? <RotateCcw size={15} /> : <Smartphone size={15} />}
          <span>{tilt.enabled ? `${tilt.reading.speed}%` : t("Tilt", "傾斜")}</span>
        </button>
      </div>
      <span className={styles.tiltHint} role="status">{shortStatus}</span>
    </div>
  );
  return (
    <section className={styles.tiltSettings} aria-label={t("Phone tilt controls", "手機傾斜控制")}>
      <h3><Smartphone size={18} /> {t("Move with your phone", "傾斜手機，探索花園")}</h3>
      <p>{t("Tilt forward, back or diagonally to move; lean further to run faster. Turn your phone horizontally to turn your path.", "向前、向後或斜向傾斜都可行走，傾得越多跑得越快；水平轉動手機可改變行走方向。")}</p>
      <p role="status">{message}</p>
      <label className={styles.settingRow}>
        <span>{t("Phone tilt controls", "手機傾斜控制")}<small>{t("Optional · joystick is the default", "選用功能 · 預設使用搖桿")}</small></span>
        <input type="checkbox" role="switch" aria-label={t("Phone tilt controls", "手機傾斜控制")} checked={tilt.enabled || tilt.access === "requesting"}
          onChange={event => event.target.checked ? void tilt.enable() : tilt.disable()} />
      </label>
      <div className={styles.tiltButtons}>
        {tilt.enabled && <button type="button" onClick={tilt.recalibrate}><RotateCcw size={15} /> {t("Recenter tilt", "重新校準傾斜")}</button>}
      </div>
      <label className={styles.settingRow}>
        {t("Tilt sensitivity", "傾斜靈敏度")}
        <select aria-label={t("Tilt sensitivity", "傾斜靈敏度")} value={tilt.sensitivity} onChange={e => tilt.changeSensitivity(e.target.value as TiltSensitivity)}>
          <option value="gentle">{t("Gentle", "柔和")}</option>
          <option value="balanced">{t("Balanced", "平衡")}</option>
          <option value="sensitive">{t("Sensitive", "靈敏")}</option>
        </select>
      </label>
      <p>{t("Your joystick takes over while you touch it. Returning to your neutral grip stops movement. Motion readings stay on this device.", "觸碰搖桿即可接管；回到靜止握姿就會停下。感應數據只留在這部裝置。")}</p>
      {tilt.enabled && tilt.reading.status === "ready" && !tilt.reading.headingAvailable && <p>{t("Phone heading is unavailable in this posture or browser. Tilt still moves in any direction.", "目前握姿或瀏覽器未提供水平朝向；傾斜仍可向任意方向移動。")}</p>}
    </section>
  );
}
