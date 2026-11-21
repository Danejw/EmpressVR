-- Supabase hosted projects can include an event-trigger helper in public.
-- Preserve the trigger's automatic RLS behavior, while removing direct RPC
-- execution rights from browser roles. Fresh local CLI projects may not have it.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end
$$;
