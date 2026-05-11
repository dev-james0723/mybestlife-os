-- One-off: mark known legacy accounts as onboarded (run in Supabase SQL Editor).
-- After this succeeds, you can remove the same emails from
-- `app/src/lib/onboarding/legacy-onboarding-bypass.ts` if you want a single source of truth.

UPDATE public.profiles
SET
  onboarding_completed = true,
  updated_at = now()
WHERE lower(coalesce(email, '')) IN (
  'jamesau0723@gmail.com',
  'fantasia.studio88@gmail.com'
);
