"use client";
import { useAppStore } from "@/stores/app-store";

export function LocalDraftStatus({ unavailable }: { unavailable: boolean }) {
  const chinese = useAppStore((state) => state.language).startsWith("zh");
  return <p role={unavailable ? "alert" : "status"} className="text-xs text-muted-foreground">{unavailable
    ? (chinese ? "此瀏覽器無法保存草稿。離開前請先儲存內容。" : "This browser cannot keep a recovery draft. Save your work before leaving.")
    : (chinese ? "草稿保存在此瀏覽器，僅供目前帳戶續填；正式儲存後會清除。" : "A recovery draft stays in this browser for your account and clears after you save.")}</p>;
}
