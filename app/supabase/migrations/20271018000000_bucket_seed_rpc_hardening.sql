-- Bucket List · Phase 9 — harden first-visit seed RPC.
--
-- The original seed RPC was SECURITY DEFINER and accepted an optional user id.
-- Phase 9 requires no RLS bypass, so the RPC now runs as the caller. Existing
-- RLS policies on bucket_settings and bucket_items enforce auth.uid() = user_id
-- even if a malicious caller passes another user's UUID.

ALTER FUNCTION public.seed_bucket_list_starter(UUID) SECURITY INVOKER;
ALTER FUNCTION public.seed_bucket_list_starter(UUID) SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.seed_bucket_list_starter(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_bucket_list_starter(UUID) TO authenticated;
