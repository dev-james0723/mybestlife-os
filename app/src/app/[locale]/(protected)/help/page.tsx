"use client";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { PageShell } from "@/components/shared/page-shell";
export default function HelpPage() {
  const zh = useAppStore((s) => s.language).startsWith("zh");
  const dashboard = useLocalizedPath("/dashboard"), about = useLocalizedPath("/about-me"), privacy = useLocalizedPath("/privacy");
  return <PageShell title={zh ? "從一小步開始" : "Start with one small step"} useRouteTitle={false}>
    <ol className="list-decimal space-y-5 pl-5 leading-7"><li>{zh ? "在 Dashboard 寫下一件今日想做的小事，再選擇預計時間。" : "On your dashboard, write one small thing you want to do today and choose a time estimate."}</li><li>{zh ? "按「加入今日計劃」。看到儲存確認後，可在 Daily Planner 的 Free Plan → Must Do 找回同一任務。" : "Choose Add to today’s plan. After save confirmation, find the same task in Daily Planner → Free Plan → Must Do."}</li><li>{zh ? "完成後，在任務或計劃頁標記完成。需要更多背景時，再填選用的 About Me 問題。" : "Mark it complete in Tasks or your planner when you are done. Add optional About Me answers when you want to build your profile."}</li></ol>
    <p>{zh ? "遇到儲存錯誤時，請保留頁面並重試；未看到成功確認前，不要關閉尚未保存的內容。" : "If saving fails, keep the page open and retry. Wait for confirmation before closing unsaved work."}</p>
    <nav className="flex flex-wrap gap-5"><Link className="underline" href={dashboard}>{zh ? "安排今日一件事" : "Plan one thing today"}</Link><Link className="underline" href={about}>About Me</Link><Link className="underline" href={privacy}>{zh ? "資料與私隱" : "Data and privacy"}</Link></nav>
  </PageShell>;
}
