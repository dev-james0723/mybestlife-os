"use client";
/* eslint-disable @next/next/no-img-element -- Cookie-authenticated image route and account avatar must not go through the public image optimizer. */
import { useEffect, useRef, useState } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { AdvisorPortrait } from "./AdvisorPortrait";
import type { MindSkill } from "@/lib/mind-council/types";
import { seatAnchors, type CouncilRoom, type CouncilViewer } from "@/lib/mind-council/room-contract";
import type { RoomCopy } from "@/lib/mind-council/room-copy";
import styles from "./CouncilRoom.module.css";
export function CouncilOrb({ name, skill, avatar }: { name: string; skill?: MindSkill; avatar?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={styles.orb}>{skill ? <AdvisorPortrait skill={skill} rounded="rounded-full" className="h-full w-full" pixelSize={48} alt="" />
    : avatar && avatar !== failed ? <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setFailed(avatar)} />
    : <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>}</span>;
}
export function CouncilScene({ room, viewer, skills, copy, targets, activeAdvisor, typing, onMention, onRetry, error, onHide }: {
  room: CouncilRoom; viewer: CouncilViewer; skills: MindSkill[]; copy: RoomCopy; targets: string[]; activeAdvisor: string | null;
  typing: boolean; onMention: (id: string) => void; onRetry: () => void; error: string | null; onHide: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [failedVersion, setFailedVersion] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width, entry.contentRect.height * 4 / 3)));
    observer.observe(area.current);
    return () => observer.disconnect();
  }, []);
  const anchors = seatAnchors(room.advisors.length);
  const ready = room.scene_status === "ready" && failedVersion !== room.scene_version;
  return <section className={styles.scenePanel} aria-label={copy.room}>
    <div className={styles.sceneHead}><span>{copy.aiScene}</span><button className={styles.button} onClick={onHide}>{copy.hideRoom}</button></div>
    <div ref={area} className={styles.sceneArea}>
      {ready ? <div className={styles.sceneCanvas} style={{ width: width ? `${width}px` : undefined }}>
        <img className={styles.sceneImage} src={`/api/mind-council/rooms/${room.id}/scene?v=${room.scene_version}&reload=${reload}`}
          alt={`${copy.aiScene}: ${room.advisors.map((a) => a.name).join(", ")}. An anonymous seated participant is seen from behind.`}
          onError={() => setFailedVersion(room.scene_version)} />
        {room.advisors.map((advisor, i) => <button key={advisor.id} type="button" aria-label={`@${advisor.name}`}
          aria-pressed={targets.includes(advisor.id)} onClick={() => onMention(advisor.id)}
          className={`${styles.marker} ${targets.includes(advisor.id) ? styles.tagged : ""} ${activeAdvisor === advisor.id ? styles.active : ""}`}
          style={{ left: `${anchors[i].x * 100}%`, top: `${anchors[i].y * 100}%` }}>
          <CouncilOrb name={advisor.name} skill={skills.find((s) => s.skillId === advisor.id)} />
          <span className={styles.markerLabel}>{advisor.name}{activeAdvisor === advisor.id ? ` · ${copy.thinking}` : ""}</span>
        </button>)}
        <div className={`${styles.marker} ${styles.userMarker} ${typing ? styles.typing : ""}`} aria-label={typing ? copy.typing : copy.you}>
          <CouncilOrb name={viewer.name} avatar={viewer.avatar} /><span className={styles.markerLabel}>{typing ? copy.typing : copy.you}</span>
        </div>
      </div> : <div className={styles.scenePlaceholder} role="status">
        {room.scene_status === "generating" && !error ? <Loader2 size={28} className={`${styles.spinner} mx-auto`} /> : <ImageOff size={28} className="mx-auto" />}
        <strong>{room.scene_status === "generating" && !error ? copy.sceneLoading : copy.sceneFailed}</strong>
        <p>{error || room.scene_error || copy.sceneHint}</p>
        {(room.scene_status !== "generating" || error) && <button className={styles.button} onClick={() => {
          if (room.scene_status === "ready") { setFailedVersion(null); setReload((v) => v + 1); } else onRetry();
        }}>{copy.sceneRetry}</button>}
      </div>}
    </div><p className={styles.sceneFoot}>{copy.sceneTap}</p>
  </section>;
}
