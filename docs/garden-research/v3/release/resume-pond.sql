-- Candidate recovery after the cause of a pause is repaired and checks pass.
-- Existing command identities remain valid; never clear the user's pending commands.
begin;
set local lock_timeout = '5s';
grant execute on function public.garden_pond_command(uuid,bigint,jsonb),
  private.garden_pond_command(uuid,bigint,jsonb),
  public.garden_pond_task_choices(uuid),
  private.garden_pond_task_choices(uuid),
  public.garden_pond_invitation(text,jsonb),
  private.garden_pond_invitation(text,jsonb) to authenticated;
commit;
