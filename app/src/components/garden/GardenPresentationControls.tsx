"use client";
import { useGardenPresentation } from "@/hooks/use-garden-presentation";
import { useGardenPets } from "@/hooks/use-garden-pets";
import { GardenPetLibrary } from "./GardenPetLibrary";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/stores/app-store";
import { OS_BUDDY_PETS } from "@/lib/os-buddy/os-buddy-pets";
import type { GardenPresentation } from "@/lib/garden/presentation";
import styles from "./garden-adventure.module.css";

export function GardenPresentationControls({
  userId,
  zh,
}: {
  userId: string;
  zh: boolean;
}) {
  const pets = useGardenPets(userId);
  const { presentation: p, update } = useGardenPresentation(userId);
  const t = (en: string, zhText: string) => (zh ? zhText : en);
  return (
    <div className={styles.presentationPanel}>
      <h3>{t("Your view, your pace", "你的視角，你的節奏")}</h3>
      <p>
        {t(
          "Saved for this account on this device. Hide the HUD any time with the eye button.",
          "按帳戶記住此裝置的偏好。隨時按眼睛按鈕收起介面。",
        )}
      </p>
      <label className={styles.settingRow}>
        <span>{t("Joystick position", "搖桿位置")}</span>
        <select
          aria-label={t("Joystick position", "搖桿位置")}
          value={p.hand}
          onChange={(e) =>
            update({ hand: e.target.value as GardenPresentation["hand"] })
          }
        >
          <option value="left">{t("Bottom left", "左下角")}</option>
          <option value="right">{t("Bottom right", "右下角")}</option>
        </select>
      </label>
      {(
        [
          ["objectives", t("Show expedition & progress", "顯示探險與進度")],
          ["hints", t("Show control hints", "顯示操作提示")],
          ["buddyInfo", t("Show pet information", "顯示寵物資訊")],
          [
            "buddyVisible",
            t("Bring a pet into the world", "讓寵物在世界中陪伴"),
          ],
          [
            "highContrast",
            t("Solid panels · higher contrast", "實色面板 · 較高對比"),
          ],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className={styles.settingRow}>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={p[key]}
            onChange={(e) => update({ [key]: e.target.checked })}
          />
        </label>
      ))}
      <label className={styles.settingRow}>
        <span>{t("Garden companion", "花園同行夥伴")}</span>
        <select
          aria-label={t("Garden companion", "花園同行夥伴")}
          value={p.pet}
          onChange={(e) =>
            update({ pet: e.target.value as GardenPresentation["pet"] })
          }
        >
          <option value="account">
            {t("Follow OS Buddy selection", "跟隨 OS Buddy 選擇")}
          </option>
          {Object.values(OS_BUDDY_PETS).map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.displayName}
            </option>
          ))}
          {pets.data?.pets
            .filter((p) => p.status === "ready" && p.modelUrl)
            .map((p) => (
              <option key={p.id} value={`custom:${p.id}`}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <GardenPetLibrary userId={userId} zh={zh} />
      <p>
        {t(
          "Choosing a garden companion leaves your OS Buddy preference intact. New personal 3D pets will appear here once their model is ready.",
          "花園同行選擇獨立於 OS Buddy 偏好。個人 3D 寵物完成模型後，會在這裡出現。",
        )}
      </p>
      <h3>{t("Sky & time", "天空與時間")}</h3>
      <label className={styles.settingRow}>
        <span>{t("Time of day", "世界時間")}</span>
        <select
          aria-label={t("Time of day", "世界時間")}
          value={p.time}
          onChange={(e) =>
            update({ time: e.target.value as GardenPresentation["time"] })
          }
        >
          {(
            [
              ["account", t("Account time zone", "帳戶時區")],
              ["dawn", t("Preview · dawn", "預覽 · 清晨")],
              ["day", t("Preview · day", "預覽 · 白天")],
              ["dusk", t("Preview · dusk", "預覽 · 黃昏")],
              ["night", t("Preview · night", "預覽 · 夜晚")],
            ] as const
          ).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.settingRow}>
        <span>{t("Garden weather", "花園天氣")}</span>
        <select
          aria-label={t("Garden weather", "花園天氣")}
          value={p.weather}
          onChange={(e) =>
            update({ weather: e.target.value as GardenPresentation["weather"] })
          }
        >
          {(
            [
              ["dynamic", t("Changing garden weather", "自動變化的遊戲天氣")],
              ["clear", t("Preview · clear", "預覽 · 晴天")],
              ["cloudy", t("Preview · cloudy", "預覽 · 多雲")],
              ["rain", t("Preview · rain", "預覽 · 下雨")],
              ["mist", t("Preview · mist", "預覽 · 薄霧")],
            ] as const
          ).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        {t(
          "Garden weather is fictional and changes every few hours. Your plants and pets are safe while you are away. No location access is needed.",
          "這是遊戲天氣，每隔數小時變化。離線時植物與寵物依然安全，不需要取得位置。",
        )}
      </p>
    </div>
  );
}

export function GardenAppearanceSettings() {
  const { user } = useAuth();
  const zh = useAppStore((s) => s.language).startsWith("zh");
  if (!user) return null;
  return (
    <section
      className={styles.osSettings}
      id="garden-controls"
      aria-label={zh ? "花園操作與顯示" : "Garden controls and appearance"}
    >
      <h2>
        {zh ? "My Garden · 操作與顯示" : "My Garden · controls & appearance"}
      </h2>
      <GardenPresentationControls userId={user.id} zh={zh} />
    </section>
  );
}
