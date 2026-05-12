-- Doc Oracle: persistent mind map (nodes + edges) per document analysis.

CREATE TABLE IF NOT EXISTS public.document_mind_map_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  node_key text NOT NULL,
  label text NOT NULL,
  node_type text NOT NULL,
  description text,
  importance_score numeric,
  page_numbers integer[] NOT NULL DEFAULT '{}'::integer[],
  section_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  visual_asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  glossary_term_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  source_chunk_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  position_x numeric,
  position_y numeric,
  collapsed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_mind_map_nodes_type_chk CHECK (
    node_type IN (
      'document_root',
      'concept',
      'section',
      'subsection',
      'glossary',
      'visual',
      'page',
      'person',
      'organization',
      'date',
      'fee',
      'requirement',
      'question'
    )
  ),
  UNIQUE (analysis_id, node_key)
);

CREATE INDEX IF NOT EXISTS document_mind_map_nodes_analysis_idx
  ON public.document_mind_map_nodes (analysis_id);
CREATE INDEX IF NOT EXISTS document_mind_map_nodes_user_doc_idx
  ON public.document_mind_map_nodes (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_mind_nodes_assert_owner ON public.document_mind_map_nodes;
CREATE TRIGGER document_brain_mind_nodes_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_mind_map_nodes_touch_updated_at ON public.document_mind_map_nodes;
CREATE TRIGGER document_mind_map_nodes_touch_updated_at
  BEFORE UPDATE ON public.document_mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_mind_map_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_mind_map_nodes_select_own ON public.document_mind_map_nodes;
CREATE POLICY document_mind_map_nodes_select_own
  ON public.document_mind_map_nodes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_nodes_insert_own ON public.document_mind_map_nodes;
CREATE POLICY document_mind_map_nodes_insert_own
  ON public.document_mind_map_nodes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_nodes_update_own ON public.document_mind_map_nodes;
CREATE POLICY document_mind_map_nodes_update_own
  ON public.document_mind_map_nodes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_nodes_delete_own ON public.document_mind_map_nodes;
CREATE POLICY document_mind_map_nodes_delete_own
  ON public.document_mind_map_nodes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.document_mind_map_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.document_mind_map_nodes (id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.document_mind_map_nodes (id) ON DELETE CASCADE,
  relationship_type text,
  label text,
  description text,
  confidence numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_mind_map_edges_no_self CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS document_mind_map_edges_analysis_idx
  ON public.document_mind_map_edges (analysis_id);
CREATE INDEX IF NOT EXISTS document_mind_map_edges_user_doc_idx
  ON public.document_mind_map_edges (user_id, document_id);
CREATE INDEX IF NOT EXISTS document_mind_map_edges_src_idx
  ON public.document_mind_map_edges (source_node_id);
CREATE INDEX IF NOT EXISTS document_mind_map_edges_tgt_idx
  ON public.document_mind_map_edges (target_node_id);

DROP TRIGGER IF EXISTS document_brain_mind_edges_assert_owner ON public.document_mind_map_edges;
CREATE TRIGGER document_brain_mind_edges_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_mind_map_edges
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_mind_map_edges_touch_updated_at ON public.document_mind_map_edges;
CREATE TRIGGER document_mind_map_edges_touch_updated_at
  BEFORE UPDATE ON public.document_mind_map_edges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_mind_map_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_mind_map_edges_select_own ON public.document_mind_map_edges;
CREATE POLICY document_mind_map_edges_select_own
  ON public.document_mind_map_edges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_edges_insert_own ON public.document_mind_map_edges;
CREATE POLICY document_mind_map_edges_insert_own
  ON public.document_mind_map_edges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_edges_update_own ON public.document_mind_map_edges;
CREATE POLICY document_mind_map_edges_update_own
  ON public.document_mind_map_edges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_mind_map_edges_delete_own ON public.document_mind_map_edges;
CREATE POLICY document_mind_map_edges_delete_own
  ON public.document_mind_map_edges FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.document_mind_map_nodes IS 'Doc Oracle mind map nodes (React Flow / xyflow source of truth).';
COMMENT ON TABLE public.document_mind_map_edges IS 'Doc Oracle mind map edges between nodes.';
