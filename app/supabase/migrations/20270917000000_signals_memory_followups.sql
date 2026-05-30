-- Signals — Signal Memory + Follow-Up Tracker (v2 loop, §17/§21).
--
-- Extends the foundation (20270910120000) so the persisted action log can carry
-- the full §17 feedback vocabulary. The MVP still runs on localStorage (see
-- `memory-store.ts` / `followups-store.ts`); this keeps the Supabase migration
-- target in lockstep so the hooks can point at `user_signal_actions` /
-- `signal_followups` with no data-model rewrite.
--
-- Hard rules unchanged: per-user, RLS-scoped to auth.uid(); no AI ranking; all
-- feedback maps to a deterministic, perceptible effect (never theater).

-- ============================================================
-- user_signal_actions — widen the kind enum to the full §17 set
-- ============================================================
-- New kinds: to_task, track, not_relevant, too_political, too_negative,
-- too_shallow, already_known. Drop + re-add the inline CHECK by its default name.

ALTER TABLE public.user_signal_actions
  DROP CONSTRAINT IF EXISTS user_signal_actions_kind_check;

ALTER TABLE public.user_signal_actions
  ADD CONSTRAINT user_signal_actions_kind_check CHECK (
    kind IN (
      'save', 'dismiss', 'more_like_this', 'less_like_this',
      'open', 'to_brain', 'to_task', 'track',
      'mute_source', 'follow_topic',
      'not_relevant', 'too_political', 'too_negative', 'too_shallow', 'already_known'
    )
  );

-- Source domain alongside topic, so source down-weighting can persist server-side.
ALTER TABLE public.user_signal_actions
  ADD COLUMN IF NOT EXISTS domain TEXT;

-- ============================================================
-- signal_followups — track real "developed N times" updates
-- ============================================================
-- The foundation already created this table (watching/done/dismissed). Add the
-- update bookkeeping the Follow-Up Tracker computes from fresh candidate pools.

ALTER TABLE public.signal_followups
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS update_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
