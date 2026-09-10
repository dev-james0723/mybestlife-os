-- ONLY a fresh, disposable PostgreSQL database. Never run against Supabase or production.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'project_connections_fixture' THEN
    RAISE EXCEPTION 'Refusing to run outside project_connections_fixture';
  END IF;
END $$;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.projects(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id));
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.projects TO authenticated;
CREATE POLICY projects_own ON public.projects FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.projects VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
\ir ../supabase/migrations/20271025000000_project_connections.sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
INSERT INTO public.project_connections(source_id,target_id,kind) VALUES
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','related');
DO $$ DECLARE
 a uuid := '10000000-0000-4000-8000-000000000001';
 b uuid := '10000000-0000-4000-8000-000000000002';
 c uuid := '10000000-0000-4000-8000-000000000003';
 stranger uuid := '20000000-0000-4000-8000-000000000001';
 row_id uuid; stamp timestamptz; affected integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.project_connections WHERE source_id=a AND target_id=b AND kind='related') THEN RAISE EXCEPTION 'TEST: canonicalization'; END IF;
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,a,'related'); RAISE EXCEPTION 'TEST: self accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,b,'related'); RAISE EXCEPTION 'TEST: duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,b,'invented'); RAISE EXCEPTION 'TEST: kind accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,stranger,'related'); RAISE EXCEPTION 'TEST: foreign endpoint accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.project_connections(user_id,source_id,target_id,kind) VALUES ('00000000-0000-4000-8000-000000000002',a,b,'blocks'); RAISE EXCEPTION 'TEST: owner spoof accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,b,'depends-on'), (b,c,'depends-on');
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (c,a,'depends-on'); RAISE EXCEPTION 'TEST: cycle accepted'; EXCEPTION WHEN check_violation THEN IF SQLERRM NOT LIKE '%CYCLE%' THEN RAISE; END IF; END;
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,c,'blocks'); RAISE EXCEPTION 'TEST: mixed cycle accepted'; EXCEPTION WHEN check_violation THEN IF SQLERRM NOT LIKE '%CYCLE%' THEN RAISE; END IF; END;
 INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,b,'parent-child'), (b,c,'parent-child');
 BEGIN INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (c,a,'parent-child'); RAISE EXCEPTION 'TEST: hierarchy cycle accepted'; EXCEPTION WHEN check_violation THEN IF SQLERRM NOT LIKE '%CYCLE%' THEN RAISE; END IF; END;
 SELECT id, updated_at INTO row_id, stamp FROM public.project_connections WHERE kind='related';
 UPDATE public.project_connections SET source_id=a, target_id=c WHERE id=row_id AND updated_at=stamp;
 IF NOT FOUND THEN RAISE EXCEPTION 'TEST: update'; END IF;
 UPDATE public.project_connections SET source_id=a,target_id=b WHERE id=row_id AND updated_at=stamp;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'TEST: stale write accepted'; END IF;
 BEGIN UPDATE public.project_connections SET id=gen_random_uuid() WHERE id=row_id; RAISE EXCEPTION 'TEST: identity rewrite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 DELETE FROM public.project_connections WHERE id=row_id;
 IF (SELECT count(*) FROM public.projects) <> 3 THEN RAISE EXCEPTION 'TEST: removing link changed projects'; END IF;
 INSERT INTO public.project_connections(source_id,target_id,kind) VALUES (a,c,'related');
END $$;
-- A new request/session can read the committed connection rows.
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.project_connections) THEN RAISE EXCEPTION 'TEST: RLS leak'; END IF;
 UPDATE public.project_connections SET kind='blocks';
 IF FOUND THEN RAISE EXCEPTION 'TEST: cross-account write'; END IF;
 DELETE FROM public.project_connections;
 IF FOUND THEN RAISE EXCEPTION 'TEST: cross-account removal'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.project_connections) THEN RAISE EXCEPTION 'TEST: data did not persist'; END IF;
 DELETE FROM public.projects WHERE id='10000000-0000-4000-8000-000000000003';
 IF EXISTS (SELECT 1 FROM public.project_connections WHERE source_id='10000000-0000-4000-8000-000000000003' OR target_id='10000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'TEST: dangling endpoints'; END IF;
END $$;
SELECT 'Project connection migration, RLS, cycle, canonicalization, CAS and cascade assertions passed' AS result;
