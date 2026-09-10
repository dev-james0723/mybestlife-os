"use client";

import { useState } from "react";
import type { PondModule, PondRequest, PondSave } from "@/lib/garden/pond-persistence";
import type { gardenPondRepository } from "@/lib/repositories/garden-pond";
import styles from "./pond.module.css";
import { pondHabitCalendar } from "@/lib/garden/pond-calendar";

type Props = {
  save: PondSave;
  intention: PondSave["intentions"][number];
  choices?: Awaited<ReturnType<typeof gardenPondRepository.choices>>;
  execute: (command: PondRequest) => Promise<unknown>;
  refresh: () => void;
  locked: boolean;
  loadFailed: boolean;
  zh: boolean;
};

/** One chosen action can have several explicit records; only the server settles its opportunity. */
export default function PondEvidenceLinks({ save, intention, choices, execute, refresh, locked, loadFailed, zh }: Props) {
  const [kind, setKind] = useState<"task" | "habit" | "gratitude">(intention.source_kind === "task" ? "habit" : "task");
  const [source, setSource] = useState("");
  const t = (en: string, chinese: string) => zh ? chinese : en;
  const names: Record<PondModule, string> = { task: t("Task", "任務"), habit: t("Habit", "習慣"), gratitude: t("Gratitude", "感謝"), rest: t("Chosen rest", "自選休息") };
  const links = save.evidence_links.filter(link => link.intention_id === intention.id && !link.is_primary);
  const settled = intention.status === "granted" || intention.status === "acknowledged_without_grant";
  const connected = save.connections.includes(kind);
  const available = kind === "task" ? choices?.tasksAvailable : kind === "habit" ? choices?.habitsAvailable : choices?.gratitudeAvailable;
  const records = kind === "task" ? choices?.tasks.map(row => ({ id: row.id, title: row.title }))
    : kind === "habit" ? choices?.habits?.map(row => ({ id: row.id, title: row.name }))
      : choices?.gratitude?.map(row => ({ id: row.id, title: `${t("Saved", "儲存於")} ${new Date(row.created_at).toLocaleString(zh ? "zh-TW" : "en-US")}` }));
  const options = records?.filter(row => !(intention.source_kind === kind && intention.source_id === row.id) && !links.some(link => link.source_kind === kind && link.source_id === row.id));
  const recordName = (item: typeof links[number]) => {
    if (!item.source_id || !save.connections.includes(item.source_kind)) return null;
    if (item.source_kind === "task") return choices?.tasks.find(row => row.id === item.source_id)?.title;
    if (item.source_kind === "habit") return choices?.habits?.find(row => row.id === item.source_id)?.name;
    const saved = choices?.gratitude?.find(row => row.id === item.source_id);
    return saved ? `${t("Saved", "儲存於")} ${new Date(saved.created_at).toLocaleString(zh ? "zh-TW" : "en-US")}` : null;
  };
  async function link() {
    const saved = await execute({ kind: "evidence", action: "link", intention_id: intention.id, intention_version: intention.version, source_kind: kind, source_id: source, ...(kind === "habit" ? { source_calendar: pondHabitCalendar() } : {}) });
    if (saved) setSource("");
  }
  return <section data-evidence-intention={intention.id} aria-label={t("Records for this step", "這一步的關聯紀錄")}>
    {!!links.length && <p className={styles.quiet}>{t("Same step · shared building opportunity", "同一小步 · 共用一次建設機會")}</p>}
    {links.map(item => <div key={item.id} data-evidence-link={item.id} className={styles.intention}>
      <strong>{names[item.source_kind]}</strong>
      {recordName(item) && <span>{recordName(item)}</span>}
      {item.occurrence && <small>{t("This occurrence only:", "只關聯這次：")} {item.occurrence} · {item.zone_at_link}</small>}
      {!item.source_id && <small>{t("The source was removed; the shared result is preserved.", "來源已移除，共同成果仍然保留。")}</small>}
      {item.source_id && !save.connections.includes(item.source_kind) && <small>{t("Reconnect this module in My next step to check its saved action.", "請在「生活的一步」重新連接此模組，才能確認其中的完成紀錄。")}</small>}
      <div className={styles.actions}>
        {intention.status === "active" && item.source_id && <button disabled={locked || !save.connections.includes(item.source_kind)} onClick={() => void execute({ kind: "claim", intention_id: intention.id, intention_version: intention.version, link_id: item.id })}>{t(`Check linked ${names[item.source_kind]}`, `確認關聯的${names[item.source_kind]}`)}</button>}
        {!settled && <button disabled={locked} onClick={() => void execute({ kind: "evidence", action: "unlink", intention_id: intention.id, intention_version: intention.version, link_id: item.id })}>{t("Remove link", "移除關聯")}</button>}
      </div>
    </div>)}
    <details onToggle={event => { if (event.currentTarget.open) refresh(); }}>
      <summary>{t("Same action in another module?", "同一行動也記在另一個模組？")}</summary>
      <p className={styles.quiet}>{t("Link only records of the same action. Any linked saved completion can confirm this step; all its records share one building opportunity. Linking alone gives no reward.", "只關聯同一個行動的紀錄。任一筆已保存的完成紀錄都可確認這一步，整組共用一次建設機會；關聯本身不發獎勵。")}</p>
      <label className={styles.field}>{t("Related module", "關聯模組")}<select aria-label={t("Related module", "關聯模組")} value={kind} onChange={event => { setKind(event.target.value as typeof kind); setSource(""); }}>
        {(["task", "habit", "gratitude"] as const).map(module => <option key={module} value={module}>{names[module]}</option>)}
      </select></label>
      {!connected ? <p className={styles.quiet}>{t("Connect this module in My next step first.", "請先在「生活的一步」連接這個模組。")}</p> : <>
        {kind === "habit" && <p className={styles.quiet}>{t("Link today's Habit check-in on this device:", "關聯這部裝置上的今日習慣打卡：")} {pondHabitCalendar().date}</p>}
        <label className={styles.field}>{t("Related record", "關聯紀錄")}<select aria-label={t("Related record", "關聯紀錄")} value={source} onChange={event => setSource(event.target.value)}><option value="">{t("Choose one record", "選一筆紀錄")}</option>{options?.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
        {(loadFailed || available === false) && <p className={styles.quiet}>{t("Records could not be loaded. Refresh to try again.", "暫時未能讀取紀錄，請重新讀取。")}</p>}
        <div className={styles.actions}><button onClick={refresh}>{t("Refresh related records", "重新讀取關聯紀錄")}</button><button disabled={locked || !source || !options?.some(row => row.id === source) || links.length >= 4} onClick={() => void link()}>{t("Link to this step", "關聯到這一步")}</button></div>
      </>}
      {settled && <p className={styles.quiet}>{t("This step was already acknowledged. New links keep later records from rewarding it again; the result you earned stays.", "這一步已經記下。補上關聯可避免稍後的紀錄重複發獎，已有成果會保留。")}</p>}
      {links.length >= 4 && <p className={styles.quiet}>{t("This step already has four related records.", "這一步已有四筆關聯紀錄。")}</p>}
    </details>
  </section>;
}
