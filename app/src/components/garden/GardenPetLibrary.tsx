"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import { useGardenPets } from "@/hooks/use-garden-pets";
import { useGardenPresentation } from "@/hooks/use-garden-presentation";
import styles from "./garden-adventure.module.css";
const Preview = dynamic(
  () => import("./GardenPetPreview").then((m) => m.GardenPetPreview),
  { ssr: false },
);
export function GardenPetLibrary({
  userId,
  zh,
}: {
  userId: string;
  zh: boolean;
}) {
  const library = useGardenPets(userId),
    { update } = useGardenPresentation(userId);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [mode, setMode] = useState<"generate" | "import">("generate");
  const [preview, setPreview] = useState<string | null>(null);
  const requestId = useRef<string | null>(null),
    formRef = useRef<HTMLFormElement>(null);
  const t = (en: string, ch: string) => (zh ? ch : en);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      requestId.current ??= crypto.randomUUID();
      data.set("id", requestId.current);
      const response = await fetch("/api/garden/pets", {
        method: "POST",
        headers: { "x-garden-account": userId },
        body: data,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message ?? "Pet upload did not complete.");
      requestId.current = null;
      formRef.current?.reset();
      await library.refetch();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Please try again.", "請再試一次。"),
      );
    } finally {
      setBusy(false);
    }
  }
  const status = (v: string) =>
    ({
      uploading: t("Saving photo…", "正在儲存相片⋯"),
      submitting: t("Submitting model…", "正在送出模型⋯"),
      generating: t("Creating 3D model…", "正在建立 3D 模型⋯"),
      processing: t("Checking model…", "正在檢查模型⋯"),
      ready: t("Ready to accompany you", "可以陪你出發"),
      failed: t("Could not finish", "暫時未能完成"),
      needs_review: t("Submission needs checking", "送出狀態待確認"),
    })[v] ?? v;
  return (
    <section
      className={styles.petLibrary}
      aria-label={t("Personal pet library", "個人寵物庫")}
    >
      <h3>{t("Your own companions", "屬於你的夥伴")}</h3>
      {library.isPending ? (
        <p>{t("Loading pets…", "正在讀取寵物⋯")}</p>
      ) : library.isError || !library.data?.available ? (
        <p role="status">
          {t(
            "Personal pet uploads are not connected yet. Xiaoba and Doge are ready to explore.",
            "個人寵物上傳尚未接通；Xiaoba 和 Doge 已經可以陪你探索。",
          )}
        </p>
      ) : (
        <>
          <div className={styles.petCards}>
            {library.data.pets.map((p) => (
              <article key={p.id}>
                {p.photoUrl && (
                  <Image
                    unoptimized
                    src={p.photoUrl}
                    alt={p.name}
                    width={64}
                    height={64}
                  />
                )}
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    {status(p.status)}
                    {["generating", "processing"].includes(p.status)
                      ? ` · ${p.progress}%`
                      : ""}
                  </p>
                  {p.message && <small>{p.message}</small>}
                </div>
                {p.status === "ready" && p.modelUrl && (
                  <button
                    type="button"
                    onClick={() => setPreview(preview === p.id ? null : p.id)}
                  >
                    {t("Preview 3D", "預覽 3D")}
                  </button>
                )}
                {preview === p.id && p.modelUrl && (
                  <Preview url={p.modelUrl} name={p.name} zh={zh} />
                )}
                {p.status === "ready" && p.modelUrl && (
                  <button
                    type="button"
                    onClick={() => update({ pet: `custom:${p.id}` })}
                  >
                    {t("Bring along", "一起出發")}
                  </button>
                )}
              </article>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void library.refresh().catch((e) => setError(e.message));
            }}
          >
            {t("Refresh model status", "更新模型進度")}
          </button>
          <form
            ref={formRef}
            onSubmit={submit}
            onChange={() => {
              requestId.current = null;
            }}
          >
            <label>
              {t("Pet name", "寵物名稱")}
              <input name="name" required maxLength={40} />
            </label>
            <label>
              {t(
                "Pet photo · JPG, PNG or WebP, up to 8 MB",
                "寵物相片 · JPG、PNG 或 WebP，最多 8 MB",
              )}
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <label>
              {t("3D model", "3D 模型")}
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="generate">
                  {t("Generate from this photo", "從這張相片生成")}
                </option>
                <option value="import">
                  {t("Use my existing GLB", "使用已有的 GLB")}
                </option>
              </select>
            </label>
            {mode === "generate" ? (
              <>
                <p>
                  {t(
                    "Your photo is sent to Tripo to create a 3D model. This takes time; progress is saved so you can keep exploring. A photo model may not include walking animations.",
                    "你的相片會送到 Tripo 建立 3D 模型。生成需要時間，進度會保留，你可以繼續探索；相片模型未必包含步行動畫。",
                  )}
                </p>
                {!library.data.generationAvailable && (
                  <p role="status">
                    {t(
                      "Photo-to-3D generation is not enabled on this site yet.",
                      "此網站尚未啟用相片轉 3D 服務。",
                    )}
                  </p>
                )}
                <label className={styles.settingRow}>
                  <span>
                    {t(
                      "I own this photo and agree to send it for 3D generation.",
                      "我擁有這張相片，並同意送出作 3D 生成。",
                    )}
                  </span>
                  <input name="consent" type="checkbox" value="yes" required />
                </label>
              </>
            ) : (
              <label>
                {t(
                  "Self-contained GLB · up to 20 MB",
                  "包含材質的 GLB · 最多 20 MB",
                )}
                <input
                  name="model"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  required
                />
              </label>
            )}
            <button
              type="submit"
              disabled={
                busy ||
                (mode === "generate" && !library.data.generationAvailable)
              }
            >
              {busy
                ? t("Saving…", "正在儲存⋯")
                : mode === "generate"
                  ? t("Create my 3D pet", "建立我的 3D 寵物")
                  : t("Add my pet", "加入我的寵物")}
            </button>
          </form>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
