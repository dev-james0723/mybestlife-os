-- Harden the `set_relationships_updated_at` trigger function by pinning
-- its search_path.
--
-- Why this matters:
--   Without an explicit `search_path`, a SECURITY-DEFINER (or even an
--   INVOKER) function inherits whatever `search_path` the calling session
--   has set. A malicious or misconfigured caller can therefore prepend a
--   schema (e.g. their own schema with a shadow `now()` or `pg_catalog`
--   override) and influence what the function actually does. This is the
--   same warning class flagged by the Supabase advisor
--   (lint=0011_function_search_path_mutable).
--
--   We pin to `public, pg_temp` to match the other Supabase guidance:
--   `public` so unqualified type/function references in the body still
--   resolve, and `pg_temp` last so a session-local temp object cannot
--   shadow built-ins (PostgreSQL forces pg_temp into the search_path
--   anyway; pinning it explicitly *last* makes the precedence clear).
--
-- Scope:
--   This migration only touches our own function. The same advisor also
--   fires on `public.handle_new_user`, but that one is project-wide and
--   should be addressed in its own dedicated cleanup pass.

ALTER FUNCTION public.set_relationships_updated_at()
  SET search_path = public, pg_temp;
