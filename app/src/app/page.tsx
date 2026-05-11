import { redirect } from "next/navigation";
import { defaultLocalizedPath } from "@/lib/i18n/locale-path";

export default function Home() {
  redirect(defaultLocalizedPath("/dashboard"));
}
