-- Candidate operational pause. Review and apply only to the intended environment.
-- Retain all worlds, grants, intentions, outbox receipts and source privacy triggers.
begin;
set local lock_timeout = '5s';
revoke execute on function public.garden_pond_command(uuid,bigint,jsonb),
  private.garden_pond_command(uuid,bigint,jsonb),
  public.garden_pond_task_choices(uuid),
  private.garden_pond_task_choices(uuid),
  public.garden_pond_invitation(text,jsonb),
  private.garden_pond_invitation(text,jsonb) from authenticated;
commit;
