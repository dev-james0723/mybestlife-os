-- route_captured_idea: atomic multi-table fan-out for an idea.
--
-- Takes an already-created idea row and a set of destination routes and
-- creates the side-effect rows (tasks, graph nodes). KB and timeline routes
-- are handled client-side:
--   * "kb"       → `addKnowledgeFromText()` server action (preserves the
--                  Gemini after() pipeline; can't run inside PL/pgSQL).
--   * "timeline" → no side effect; ideas surface via created_at.
--
-- The caller is expected to update ideas.linked_task_ids / linked_node_ids /
-- linked_knowledge_item_ids from the returned arrays and the KB call.
--
-- Graph node default is 'project' — an idea routed to graph is treated as a
-- project seed. FQ1 answer (see Phase 0 audit): node_type CHECK allows only
-- 'person' | 'organization' | 'project' | 'opportunity'.

create or replace function public.route_captured_idea(
  p_idea_id uuid,
  p_destinations text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_content text;
  v_title text;
  v_manual_tags text[];
  v_ai_tags text[];
  v_combined_tags text[];
  v_task_title text;
  v_task_id uuid;
  v_node_name text;
  v_node_id uuid;
  v_task_ids uuid[] := '{}'::uuid[];
  v_node_ids uuid[] := '{}'::uuid[];
begin
  -- Fetch idea + verify caller owns it (RLS on select would also block, but be explicit).
  select user_id, content, coalesce(title, ''), manual_tags, ai_tags
    into v_user_id, v_content, v_title, v_manual_tags, v_ai_tags
  from ideas
  where id = p_idea_id;

  if v_user_id is null then
    raise exception 'idea % not found', p_idea_id;
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  v_combined_tags := coalesce(v_manual_tags, '{}') || coalesce(v_ai_tags, '{}');

  -- Derive a short title fragment for task/node name.
  v_task_title := coalesce(
    nullif(v_title, ''),
    nullif(regexp_replace(split_part(v_content, E'\n', 1), '^\s+|\s+$', '', 'g'), ''),
    left(v_content, 60),
    'Untitled'
  );
  v_task_title := left(v_task_title, 120);

  -- task → tasks
  if p_destinations @> array['task'] then
    insert into tasks (
      user_id,
      title,
      description,
      status,
      priority,
      tags,
      source
    ) values (
      v_user_id,
      v_task_title,
      nullif(v_content, ''),
      'todo',
      'medium',
      v_combined_tags,
      'idea-capture'
    )
    returning id into v_task_id;
    v_task_ids := v_task_ids || v_task_id;
  end if;

  -- graph → career_network_nodes (default node_type='project')
  if p_destinations @> array['graph'] then
    v_node_name := left(v_task_title, 120);
    insert into career_network_nodes (
      user_id,
      node_type,
      name,
      description,
      notes,
      tags
    ) values (
      v_user_id,
      'project',
      v_node_name,
      nullif(v_content, ''),
      null,
      v_combined_tags
    )
    returning id into v_node_id;
    v_node_ids := v_node_ids || v_node_id;
  end if;

  -- Persist back-references on the idea row (kb handled by caller).
  if array_length(v_task_ids, 1) > 0 then
    update ideas
       set linked_task_ids = coalesce(linked_task_ids, '{}') || v_task_ids,
           updated_at = now()
     where id = p_idea_id;
  end if;
  if array_length(v_node_ids, 1) > 0 then
    update ideas
       set linked_node_ids = coalesce(linked_node_ids, '{}') || v_node_ids,
           updated_at = now()
     where id = p_idea_id;
  end if;

  return jsonb_build_object(
    'task_ids', to_jsonb(v_task_ids),
    'node_ids', to_jsonb(v_node_ids)
  );
end;
$$;

grant execute on function public.route_captured_idea(uuid, text[]) to authenticated;
