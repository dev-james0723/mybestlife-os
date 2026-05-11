/** Cookie set when using the dev-only “skip login” path (see login page + middleware). */
export const DEV_LOGIN_BYPASS_COOKIE = "mylifeos_dev_bypass";

/**
 * When true, /login shows “Dev / Test mode” and middleware accepts the bypass cookie.
 * - Local `next dev`: on
 * - Explicit opt-in: NEXT_PUBLIC_DEV_LOGIN_BYPASS=true
 * - Any host built on Vercel: on (first-sale / demo deploys); opt out with
 *   NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS=true
 */
export function isDevLoginBypassFeatureEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS === "true") return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_DEV_LOGIN_BYPASS === "true") return true;
  if (process.env.NEXT_PUBLIC_VERCEL === "1") return true;
  return false;
}

export function setDevLoginBypassCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${DEV_LOGIN_BYPASS_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearDevLoginBypassCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEV_LOGIN_BYPASS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasDevLoginBypassCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === DEV_LOGIN_BYPASS_COOKIE && value === "1";
  });
}

export function readDevLoginBypassFromRequest(
  getCookie: (name: string) => string | undefined
): boolean {
  if (!isDevLoginBypassFeatureEnabled()) return false;
  return getCookie(DEV_LOGIN_BYPASS_COOKIE) === "1";
}
