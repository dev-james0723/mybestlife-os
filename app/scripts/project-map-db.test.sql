\set ON_ERROR_STOP on
-- Isolated CI ONLY. This guard prevents accidental execution on a real database.
DO $$ BEGIN IF current_database() <> 'project_map_ci' THEN RAISE EXCEPTION 'This fixture requires the disposable project_map_ci database'; END IF; END $$;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE TABLE public.projects(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id));
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_owner ON public.projects FOR SELECT TO authenticated USING(user_id = auth.uid());
GRANT SELECT ON public.projects TO authenticated;
\ir ../supabase/migrations/20260910210000_project_connections.sql
-- Prove migration can be reapplied without destroying persisted schema/data.
\ir ../supabase/migrations/20260910210000_project_connections.sql
CREATE FUNCTION public.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF position(expected IN SQLERRM) > 0 THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected failure containing %', expected;
END $$;
BEGIN;
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
INSERT INTO public.projects VALUES
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE
 a uuid := '00000000-0000-4000-8000-000000000011'; b uuid := '00000000-0000-4000-8000-000000000012'; c uuid := '00000000-0000-4000-8000-000000000013'; other uuid := '00000000-0000-4000-8000-000000000014';
 r1 uuid := '00000000-0000-4000-8000-000000000021'; r2 uuid := '00000000-0000-4000-8000-000000000022'; r3 uuid := '00000000-0000-4000-8000-000000000023';
 saved public.project_connections;
BEGIN
 saved := public.mutate_project_connection('save',r1,b,a,'related');
 ASSERT saved.source_id = a AND saved.target_id = b AND saved.version = 1, 'canonical related direction';
 saved := public.mutate_project_connection('save',r1,b,a,'related');
 ASSERT saved.version = 1 AND (SELECT count(*) FROM public.project_connections) = 1, 'idempotent creation';
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''blocks'')',r2,b,a),'project_connection:duplicate');
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''related'')',r2,a,a),'project_connection:invalid');
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''related'')',r2,a,other),'project_connection:forbidden');
 PERFORM public.expect_error(format('INSERT INTO public.project_connections(id,source_id,target_id,kind) VALUES(%L,%L,%L,''related'')',r2,a,c),'permission denied');
 PERFORM public.expect_error(format('UPDATE public.project_connections SET kind=''blocks'' WHERE id=%L',r1),'permission denied');
 PERFORM public.expect_error(format('DELETE FROM public.project_connections WHERE id=%L',r1),'permission denied');
 saved := public.mutate_project_connection('save',r1,a,b,'depends-on',1);
 ASSERT saved.version = 2 AND saved.kind = 'depends-on', 'versioned update';
 saved := public.mutate_project_connection('save',r1,a,b,'depends-on',1);
 ASSERT saved.version = 2, 'idempotent update retry';
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''blocks'',1)',r1,a,b),'project_connection:conflict');
 PERFORM public.mutate_project_connection('save',r2,b,c,'depends-on');
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''depends-on'')',r3,c,a),'project_connection:cycle');
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''save'',%L,%L,%L,''blocks'')',r3,a,c),'project_connection:cycle');
 saved := public.mutate_project_connection('remove',r2,p_version => 1);
 ASSERT saved.deleted_at IS NOT NULL AND saved.version = 2, 'versioned tombstone';
 saved := public.mutate_project_connection('remove',r2,p_version => 1);
 ASSERT saved.version = 2, 'idempotent removal';
 PERFORM public.mutate_project_connection('save',r3,c,a,'depends-on');
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''restore'',%L,p_version=>2)',r2),'project_connection:cycle');
 PERFORM public.mutate_project_connection('remove',r3,p_version => 1);
 saved := public.mutate_project_connection('restore',r2,p_version => 2);
 ASSERT saved.deleted_at IS NULL AND saved.version = 3, 'persisted undo';
 saved := public.mutate_project_connection('restore',r2,p_version => 2);
 ASSERT saved.version = 3, 'idempotent undo';
 PERFORM public.expect_error(format('SELECT public.mutate_project_connection(''remove'',%L,p_version=>1)',r2),'project_connection:conflict');
 ASSERT (SELECT count(*) FROM public.projects) = 3, 'connection changes do not remove projects';
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.project_connections) = 0, 'RLS hides other owner';
 PERFORM public.expect_error('SELECT public.mutate_project_connection(''remove'',''00000000-0000-4000-8000-000000000021'',p_version=>2)','project_connection:conflict');
END $$;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT public.expect_error('SELECT public.mutate_project_connection(''save'',gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),''related'')','project_connection:forbidden');
RESET ROLE;
DELETE FROM public.projects WHERE id = '00000000-0000-4000-8000-000000000012';
DO $$ BEGIN ASSERT NOT EXISTS(SELECT 1 FROM public.project_connections WHERE source_id='00000000-0000-4000-8000-000000000012' OR target_id='00000000-0000-4000-8000-000000000012'), 'project deletion cascades connections'; END $$;
ROLLBACK;
SELECT 'All project-connection PostgreSQL security and mutation checks passed' AS result;
