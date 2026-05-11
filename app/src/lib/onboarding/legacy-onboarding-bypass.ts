/**
 * Accounts that registered before onboarding was enforced, or whose profile row
 * never had `onboarding_completed` set to true. Prefer fixing data in Supabase
 * (see `app/supabase/scripts/backfill-onboarding-completed-for-legacy-emails.sql`)
 * and then removing addresses from this list.
 */
const LEGACY_ONBOARDING_BYPASS_EMAILS = [
  "jamesau0723@gmail.com",
  "fantasia.studio88@gmail.com",
] as const;

function parseEnvBypassEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ONBOARDING_BYPASS_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function shouldBypassOnboarding(profileEmail: string | null | undefined): boolean {
  if (!profileEmail?.trim()) return false;
  const lower = profileEmail.trim().toLowerCase();
  if ((LEGACY_ONBOARDING_BYPASS_EMAILS as readonly string[]).includes(lower)) return true;
  return parseEnvBypassEmails().includes(lower);
}
