-- Additive, opt-in rollout. Apply only after reviewing the feature PR.
-- No existing projects, ideas, brain edges or policies are modified.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS public.project_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('related', 'depends-on', 'blocks', 'contains')),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (source_id <> target_id),
  CHECK (kind <> 'related' OR source_id < target_id)
);
-- One active manual relationship per pair in v1. Change its type via Edit.
CREATE UNIQUE INDEX IF NOT EXISTS project_connections_pair_unique ON public.project_connections
  (user_id, LEAST(source_id, target_id), GREATEST(source_id, target_id)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS project_connections_source_idx ON public.project_connections(source_id);
CREATE INDEX IF NOT EXISTS project_connections_target_idx ON public.project_connections(target_id);
ALTER TABLE public.project_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_connections_read_own ON public.project_connections;
CREATE POLICY project_connections_read_own ON public.project_connections FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = source_id AND p.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = target_id AND p.user_id = (SELECT auth.uid())));
REVOKE ALL ON public.project_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_connections TO authenticated;
GRANT ALL ON public.project_connections TO service_role;

-- All client writes go through this guarded helper. A per-owner transaction
-- lock serializes validation, including concurrent duplicate/cycle creation.
-- Version checks reject stale edits. UUIDs and tombstones make retry/undo safe.
CREATE OR REPLACE FUNCTION private.mutate_project_connection(
  p_action text, p_id uuid, p_source uuid DEFAULT NULL, p_target uuid DEFAULT NULL,
  p_kind text DEFAULT NULL, p_version bigint DEFAULT NULL
) RETURNS public.project_connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  old_row public.project_connections;
  result_row public.project_connections;
  row_exists boolean;
  src uuid := p_source;
  dst uuid := p_target;
  relation text := p_kind;
  swap_id uuid;
  arc_from uuid;
  arc_to uuid;
  has_cycle boolean;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'project_connection:forbidden'; END IF;
  IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('save', 'remove', 'restore') THEN RAISE EXCEPTION 'project_connection:invalid'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 9410));
  SELECT * INTO old_row FROM public.project_connections WHERE id = p_id AND user_id = actor FOR UPDATE;
  row_exists := FOUND;
  IF p_action IN ('remove', 'restore') AND NOT row_exists THEN RAISE EXCEPTION 'project_connection:conflict'; END IF;
  IF p_action = 'remove' THEN
    IF old_row.deleted_at IS NOT NULL THEN RETURN old_row; END IF;
    IF p_version IS DISTINCT FROM old_row.version THEN RAISE EXCEPTION 'project_connection:conflict'; END IF;
    UPDATE public.project_connections SET deleted_at = now(), updated_at = now(), version = version + 1
      WHERE id = p_id AND user_id = actor RETURNING * INTO result_row;
    RETURN result_row;
  END IF;
  IF p_action = 'restore' THEN
    src := old_row.source_id; dst := old_row.target_id; relation := old_row.kind;
  END IF;
  IF src IS NULL OR dst IS NULL OR src = dst OR relation IS NULL OR relation NOT IN ('related','depends-on','blocks','contains') THEN RAISE EXCEPTION 'project_connection:invalid'; END IF;
  -- Lock endpoint rows against concurrent deletion while validating ownership.
  PERFORM 1 FROM public.projects WHERE id = src AND user_id = actor FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_connection:forbidden'; END IF;
  PERFORM 1 FROM public.projects WHERE id = dst AND user_id = actor FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_connection:forbidden'; END IF;
  IF relation = 'related' AND src > dst THEN swap_id := src; src := dst; dst := swap_id; END IF;
  IF p_action = 'restore' THEN
    IF old_row.deleted_at IS NULL AND old_row.version = p_version + 1 THEN RETURN old_row; END IF;
    IF old_row.deleted_at IS NULL OR p_version IS DISTINCT FROM old_row.version THEN RAISE EXCEPTION 'project_connection:conflict'; END IF;
  ELSIF row_exists THEN
    IF old_row.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'project_connection:conflict'; END IF;
    -- A lost response may be retried with the same id and expected version.
    IF old_row.source_id = src AND old_row.target_id = dst AND old_row.kind = relation
      AND (p_version IS NULL OR old_row.version = p_version + 1) THEN RETURN old_row; END IF;
    IF p_version IS NULL OR p_version IS DISTINCT FROM old_row.version THEN RAISE EXCEPTION 'project_connection:conflict'; END IF;
  ELSIF p_version IS NOT NULL THEN RAISE EXCEPTION 'project_connection:conflict';
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_connections c WHERE c.user_id = actor AND c.deleted_at IS NULL AND c.id <> p_id
    AND LEAST(c.source_id,c.target_id) = LEAST(src,dst) AND GREATEST(c.source_id,c.target_id) = GREATEST(src,dst)) THEN
    RAISE EXCEPTION 'project_connection:duplicate';
  END IF;
  IF relation <> 'related' THEN
    arc_from := CASE WHEN relation = 'depends-on' THEN dst ELSE src END;
    arc_to := CASE WHEN relation = 'depends-on' THEN src ELSE dst END;
    WITH RECURSIVE arcs(a,b) AS (
      SELECT CASE WHEN c.kind = 'depends-on' THEN c.target_id ELSE c.source_id END,
             CASE WHEN c.kind = 'depends-on' THEN c.source_id ELSE c.target_id END
      FROM public.project_connections c WHERE c.user_id = actor AND c.deleted_at IS NULL AND c.id <> p_id
        AND ((relation = 'contains' AND c.kind = 'contains') OR (relation <> 'contains' AND c.kind IN ('depends-on','blocks')))
    ), reached(node) AS (
      SELECT arc_to UNION SELECT arcs.b FROM arcs JOIN reached ON arcs.a = reached.node
    ) SELECT EXISTS(SELECT 1 FROM reached WHERE node = arc_from) INTO has_cycle;
    IF has_cycle THEN RAISE EXCEPTION 'project_connection:cycle'; END IF;
  END IF;
  IF row_exists THEN
    UPDATE public.project_connections SET source_id = src, target_id = dst, kind = relation,
      deleted_at = NULL, updated_at = now(), version = version + 1
      WHERE id = p_id AND user_id = actor RETURNING * INTO result_row;
  ELSE
    INSERT INTO public.project_connections (id,user_id,source_id,target_id,kind)
      VALUES (p_id,actor,src,dst,relation) RETURNING * INTO result_row;
  END IF;
  RETURN result_row;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'project_connection:duplicate';
END;
$$;
REVOKE ALL ON FUNCTION private.mutate_project_connection(text,uuid,uuid,uuid,text,bigint) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.mutate_project_connection(text,uuid,uuid,uuid,text,bigint) TO authenticated;
-- Exposed RPC is security-invoker; the privileged implementation stays private.
CREATE OR REPLACE FUNCTION public.mutate_project_connection(
  p_action text, p_id uuid, p_source uuid DEFAULT NULL, p_target uuid DEFAULT NULL,
  p_kind text DEFAULT NULL, p_version bigint DEFAULT NULL
) RETURNS public.project_connections LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.mutate_project_connection(p_action,p_id,p_source,p_target,p_kind,p_version);
$$;
REVOKE ALL ON FUNCTION public.mutate_project_connection(text,uuid,uuid,uuid,text,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_project_connection(text,uuid,uuid,uuid,text,bigint) TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS
    (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_connections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_connections;
  END IF;
END $$;
