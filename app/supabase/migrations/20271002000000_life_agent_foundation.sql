-- Life Agent / Life Companion — persistence foundation (Phase 2).
-- Profiles, permissions, conversations, messages, memories, action previews.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- life_agent_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  character_id text NOT NULL DEFAULT 'aura',
  custom_name text,
  warmth int NOT NULL DEFAULT 80,
  directness int NOT NULL DEFAULT 60,
  creativity int NOT NULL DEFAULT 70,
  strategic_depth int NOT NULL DEFAULT 75,
  execution_energy int NOT NULL DEFAULT 60,
  emotional_gentleness int NOT NULL DEFAULT 80,
  visual_style text,
  voice_style text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT life_agent_profiles_warmth_check CHECK (warmth BETWEEN 0 AND 100),
  CONSTRAINT life_agent_profiles_directness_check CHECK (directness BETWEEN 0 AND 100),
  CONSTRAINT life_agent_profiles_creativity_check CHECK (creativity BETWEEN 0 AND 100),
  CONSTRAINT life_agent_profiles_strategic_depth_check CHECK (strategic_depth BETWEEN 0 AND 100),
  CONSTRAINT life_agent_profiles_execution_energy_check CHECK (execution_energy BETWEEN 0 AND 100),
  CONSTRAINT life_agent_profiles_emotional_gentleness_check CHECK (emotional_gentleness BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS life_agent_profiles_user_id_idx
  ON public.life_agent_profiles (user_id);

-- ============================================================
-- life_agent_conversations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  mode text NOT NULL DEFAULT 'companion',
  character_id text NOT NULL DEFAULT 'aura',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_conversations_mode_check CHECK (
    mode IN ('companion', 'orchestrator', 'operator', 'mirror')
  ),
  CONSTRAINT life_agent_conversations_status_check CHECK (
    status IN ('active', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS life_agent_conversations_user_updated_idx
  ON public.life_agent_conversations (user_id, updated_at DESC);

-- ============================================================
-- life_agent_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.life_agent_conversations (id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata_json jsonb,
  memory_used_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_messages_role_check CHECK (
    role IN ('user', 'assistant', 'system', 'tool')
  )
);

CREATE INDEX IF NOT EXISTS life_agent_messages_conversation_created_idx
  ON public.life_agent_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS life_agent_messages_user_created_idx
  ON public.life_agent_messages (user_id, created_at DESC);

-- ============================================================
-- life_agent_permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  domain text NOT NULL,
  access_level text NOT NULL DEFAULT 'ask_every_time',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_permissions_user_domain_key UNIQUE (user_id, domain),
  CONSTRAINT life_agent_permissions_domain_check CHECK (
    domain IN (
      'about_me', 'projects', 'tasks', 'goals', 'habits',
      'relationships', 'role_models', 'assets', 'documents',
      'notes', 'journal', 'bucket_list', 'knowledge',
      'finance', 'health', 'brain_graph'
    )
  ),
  CONSTRAINT life_agent_permissions_access_level_check CHECK (
    access_level IN (
      'off', 'ask_every_time', 'read_only', 'suggest_actions', 'act_with_confirmation'
    )
  )
);

CREATE INDEX IF NOT EXISTS life_agent_permissions_user_idx
  ON public.life_agent_permissions (user_id);

-- ============================================================
-- life_agent_memories
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content text NOT NULL,
  source_type text,
  source_id text,
  confidence numeric,
  user_confirmed boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_memories_type_check CHECK (
    memory_type IN (
      'identity', 'preference', 'goal', 'constraint',
      'relationship_context', 'emotional_pattern', 'working_style',
      'life_chapter', 'other'
    )
  ),
  CONSTRAINT life_agent_memories_visibility_check CHECK (
    visibility IN ('private', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS life_agent_memories_user_created_idx
  ON public.life_agent_memories (user_id, created_at DESC);

-- ============================================================
-- life_agent_action_previews
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_action_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.life_agent_conversations (id) ON DELETE CASCADE,
  action_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_action_previews_status_check CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'executed', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS life_agent_action_previews_user_status_idx
  ON public.life_agent_action_previews (user_id, status);

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS life_agent_profiles_touch_updated_at ON public.life_agent_profiles;
CREATE TRIGGER life_agent_profiles_touch_updated_at
  BEFORE UPDATE ON public.life_agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS life_agent_conversations_touch_updated_at ON public.life_agent_conversations;
CREATE TRIGGER life_agent_conversations_touch_updated_at
  BEFORE UPDATE ON public.life_agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS life_agent_permissions_touch_updated_at ON public.life_agent_permissions;
CREATE TRIGGER life_agent_permissions_touch_updated_at
  BEFORE UPDATE ON public.life_agent_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS life_agent_memories_touch_updated_at ON public.life_agent_memories;
CREATE TRIGGER life_agent_memories_touch_updated_at
  BEFORE UPDATE ON public.life_agent_memories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS life_agent_action_previews_touch_updated_at ON public.life_agent_action_previews;
CREATE TRIGGER life_agent_action_previews_touch_updated_at
  BEFORE UPDATE ON public.life_agent_action_previews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bump parent conversation updated_at when a message is inserted
CREATE OR REPLACE FUNCTION public.life_agent_touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.life_agent_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS life_agent_messages_touch_conversation ON public.life_agent_messages;
CREATE TRIGGER life_agent_messages_touch_conversation
  AFTER INSERT ON public.life_agent_messages
  FOR EACH ROW EXECUTE FUNCTION public.life_agent_touch_conversation_on_message();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.life_agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_agent_action_previews ENABLE ROW LEVEL SECURITY;

-- life_agent_profiles
DROP POLICY IF EXISTS life_agent_profiles_select_own ON public.life_agent_profiles;
CREATE POLICY life_agent_profiles_select_own ON public.life_agent_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_profiles_insert_own ON public.life_agent_profiles;
CREATE POLICY life_agent_profiles_insert_own ON public.life_agent_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_profiles_update_own ON public.life_agent_profiles;
CREATE POLICY life_agent_profiles_update_own ON public.life_agent_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_profiles_delete_own ON public.life_agent_profiles;
CREATE POLICY life_agent_profiles_delete_own ON public.life_agent_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- life_agent_conversations
DROP POLICY IF EXISTS life_agent_conversations_select_own ON public.life_agent_conversations;
CREATE POLICY life_agent_conversations_select_own ON public.life_agent_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_conversations_insert_own ON public.life_agent_conversations;
CREATE POLICY life_agent_conversations_insert_own ON public.life_agent_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_conversations_update_own ON public.life_agent_conversations;
CREATE POLICY life_agent_conversations_update_own ON public.life_agent_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_conversations_delete_own ON public.life_agent_conversations;
CREATE POLICY life_agent_conversations_delete_own ON public.life_agent_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- life_agent_messages
DROP POLICY IF EXISTS life_agent_messages_select_own ON public.life_agent_messages;
CREATE POLICY life_agent_messages_select_own ON public.life_agent_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_messages_insert_own ON public.life_agent_messages;
CREATE POLICY life_agent_messages_insert_own ON public.life_agent_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_messages_update_own ON public.life_agent_messages;
CREATE POLICY life_agent_messages_update_own ON public.life_agent_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_messages_delete_own ON public.life_agent_messages;
CREATE POLICY life_agent_messages_delete_own ON public.life_agent_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- life_agent_permissions
DROP POLICY IF EXISTS life_agent_permissions_select_own ON public.life_agent_permissions;
CREATE POLICY life_agent_permissions_select_own ON public.life_agent_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_permissions_insert_own ON public.life_agent_permissions;
CREATE POLICY life_agent_permissions_insert_own ON public.life_agent_permissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_permissions_update_own ON public.life_agent_permissions;
CREATE POLICY life_agent_permissions_update_own ON public.life_agent_permissions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_permissions_delete_own ON public.life_agent_permissions;
CREATE POLICY life_agent_permissions_delete_own ON public.life_agent_permissions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- life_agent_memories
DROP POLICY IF EXISTS life_agent_memories_select_own ON public.life_agent_memories;
CREATE POLICY life_agent_memories_select_own ON public.life_agent_memories
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_memories_insert_own ON public.life_agent_memories;
CREATE POLICY life_agent_memories_insert_own ON public.life_agent_memories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_memories_update_own ON public.life_agent_memories;
CREATE POLICY life_agent_memories_update_own ON public.life_agent_memories
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_memories_delete_own ON public.life_agent_memories;
CREATE POLICY life_agent_memories_delete_own ON public.life_agent_memories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- life_agent_action_previews
DROP POLICY IF EXISTS life_agent_action_previews_select_own ON public.life_agent_action_previews;
CREATE POLICY life_agent_action_previews_select_own ON public.life_agent_action_previews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_action_previews_insert_own ON public.life_agent_action_previews;
CREATE POLICY life_agent_action_previews_insert_own ON public.life_agent_action_previews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_action_previews_update_own ON public.life_agent_action_previews;
CREATE POLICY life_agent_action_previews_update_own ON public.life_agent_action_previews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS life_agent_action_previews_delete_own ON public.life_agent_action_previews;
CREATE POLICY life_agent_action_previews_delete_own ON public.life_agent_action_previews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.life_agent_profiles IS 'Life Companion character + tone preferences per user';
COMMENT ON TABLE public.life_agent_conversations IS 'Life Companion chat threads';
COMMENT ON TABLE public.life_agent_messages IS 'Messages within Life Companion conversations';
COMMENT ON TABLE public.life_agent_permissions IS 'Per-domain access levels for Life Companion context';
COMMENT ON TABLE public.life_agent_memories IS 'User-confirmed or inferred companion memories';
COMMENT ON TABLE public.life_agent_action_previews IS 'Pending action proposals awaiting user confirmation';
