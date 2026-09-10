"use client";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { PageShell } from "@/components/shared/page-shell";

export default function PrivacyPolicyPage() {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const loginHref = useLocalizedPath("/login");
  const helpHref = useLocalizedPath("/help");
  const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME;
  const contact = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const text = (en: string, zh: string) => chinese ? zh : en;
  const sections = [
    [text("Your account and content", "帳戶及內容"), text("MyBestLifeOS uses Supabase for account sign-in and storage of the records you save, including tasks, plans, profile answers, journal entries and uploaded files. Your browser also keeps preferences and some in-progress drafts.", "MyBestLifeOS 使用 Supabase 處理帳戶登入及儲存你保存的任務、計劃、個人答案、日記及上傳檔案。瀏覽器亦會保存偏好及部分尚在編輯的草稿。")],
    [text("AI features", "AI 功能"), text("AI features may send the selected text, profile context or document content to the service used by that feature. Review the information shown before continuing. Saving an About Me questionnaire does not itself send an AI request. External AI tools have their own data policies.", "AI 功能可能會把選取的文字、個人背景或文件內容傳送到該功能使用的服務。繼續前請檢查畫面上的資料。儲存 About Me 問卷本身不會傳送 AI 請求。外部 AI 工具有各自的資料政策。")],
    [text("Images and sharing", "圖片與分享"), text("Profile images use public image URLs: anyone who has a URL can view that image. A public image URL does not make the rest of your profile public. Review access settings before creating or sharing links to other materials.", "個人圖片使用公開網址，任何持有網址的人都可查看該圖片。公開圖片網址不代表其餘個人資料亦公開。建立或分享其他材料連結前，請檢查存取設定。")],
    [text("Optional connections", "選用連接"), text("Location is requested when you choose a location feature. You can search for a city manually. Google Calendar asks for permission when you choose to connect; you can continue using your planner without connecting.", "選擇定位功能時才會要求位置權限，你亦可手動搜尋城市。選擇連接 Google 日曆時會要求授權，不連接亦可繼續使用每日計劃。")],
    [text("Your choices", "你的選擇"), text("You can review and edit your profile in Settings and About Me, and manage your records within each feature. Available export and deletion controls vary by feature. Do not rely on a browser draft as your only copy; check the save confirmation.", "你可以在設定及 About Me 查看及修改個人資料，並在各功能管理記錄。匯出及刪除控制按功能而異。請確認儲存結果，不要把瀏覽器草稿當作唯一副本。")],
  ];
  return <PageShell title={text("Data and privacy", "資料與私隱")} useRouteTitle={false} description={text("How information is used in MyBestLifeOS", "MyBestLifeOS 如何使用資料")}>
    <article className="space-y-7 text-sm leading-7">
      {!operator || !contact ? <p role="status" className="rounded-xl border p-4">{text("Public-release information is still being finalized. Operator and privacy contact details must be confirmed before public registration opens.", "公開發佈資料仍在整理中。開放公眾註冊前，須確認營運者及私隱聯絡資料。")}</p> : <p>{operator} · <a className="underline" href={`mailto:${contact}`}>{contact}</a></p>}
      {sections.map(([heading, body]) => <section key={heading}><h2 className="mb-2 text-base font-semibold">{heading}</h2><p className="text-muted-foreground">{body}</p></section>)}
      <p className="text-xs text-muted-foreground">{text("Updated September 7, 2026", "更新日期：2026 年 9 月 7 日")}</p>
      <nav className="flex gap-5"><Link className="underline" href={loginHref}>{text("Sign in", "登入")}</Link><Link className="underline" href={helpHref}>{text("Getting started", "開始使用")}</Link></nav>
    </article>
  </PageShell>;
}
