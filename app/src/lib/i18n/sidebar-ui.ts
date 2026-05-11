import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";

export type SidebarFooterCopy = {
  settings: string;
  signOut: string;
};

const m: Record<AppLocale, SidebarFooterCopy> = {
  en: { settings: "Settings", signOut: "Sign out" },
  "zh-TW": { settings: "設定", signOut: "登出" },
  "zh-CN": { settings: "设置", signOut: "退出登录" },
  ja: { settings: "設定", signOut: "ログアウト" },
  ko: { settings: "설정", signOut: "로그아웃" },
  fr: { settings: "Paramètres", signOut: "Se déconnecter" },
  it: { settings: "Impostazioni", signOut: "Esci" },
  es: { settings: "Ajustes", signOut: "Cerrar sesión" },
  vi: { settings: "Cài đặt", signOut: "Đăng xuất" },
};

export function getSidebarFooterCopy(locale: AppLocale): SidebarFooterCopy {
  return m[locale] ?? m[DEFAULT_LOCALE];
}
