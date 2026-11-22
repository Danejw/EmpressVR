-- Remove the privileged staff invitation action from the public API surface.
-- Phase 1: preserve legacy clients with an inert, SECURITY INVOKER compatibility RPC.
-- Only database-owned events can provision a role now.
-- ASVS 2.1.2: identity must be a confirmed auth.users email matching a live invitation.
-- ASVS 4.1: ordinary authenticated users have no directly callable elevated function.

-- The private schema is never exposed through PostgREST.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.redeem_staff_invitation_on_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  matched_user_id uuid;
  matched_email text;
  invited_role text;
begin
  if tg_table_schema = 'auth' and tg_table_name = 'users' then
    -- Supabase Auth owns the email verification lifecycle.
    if new.email is null or new.email_confirmed_at is null then return new; end if;
    matched_user_id := new.id;
    matched_email := lower(new.email);
  elsif tg_table_schema = 'public' and tg_table_name = 'staff_invitations' then
    -- Invites can be created only by MFA-verified administrators under RLS.
    if new.accepted_at is not null or new.expires_at <= now() then return new; end if;
    matched_email := new.email;
    select u.id into matched_user_id
      from auth.users u
      where lower(u.email) = matched_email and u.email_confirmed_at is not null
      limit 1;
  else
    return new;
  end if;

  if matched_user_id is null then return new; end if;

  -- Lock the invitation so concurrent confirmation and invitation events
  -- cannot redeem the same record twice.
  select i.role into invited_role
    from public.staff_invitations i
    where i.email = matched_email
      and i.accepted_at is null and i.expires_at > now()
    for update;
  if invited_role is null then return new; end if;

  insert into public.staff_roles(user_id, role)
    values (matched_user_id, invited_role)
    on conflict (user_id) do nothing;

  update public.staff_invitations
    set accepted_at = now()
    where email = matched_email and accepted_at is null;

  return new;
exception when others then
  if tg_table_schema = 'auth' then
    -- Staff provisioning must never make email confirmation fail.
    raise log 'EmpressVR staff invite trigger failed (SQLSTATE %)', sqlstate;
    return new;
  end if;
  raise;
end;
$$;

-- Trigger functions run with their owner's privileges, not caller-supplied inputs.
revoke all on function private.redeem_staff_invitation_on_change()
  from public, anon, authenticated;
create trigger staff_invite_created
  after insert on public.staff_invitations
  for each row execute function private.redeem_staff_invitation_on_change();
create trigger staff_invite_email_verified
  after insert or update of email, email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function private.redeem_staff_invitation_on_change();

-- Redeem preexisting live invitations for already verified users.
-- Does not overwrite existing assignments.
with eligible as (
  select i.email, i.role, u.id
    from public.staff_invitations i join auth.users u
      on lower(u.email) = i.email and u.email_confirmed_at is not null
    where i.accepted_at is null and i.expires_at > now()
), inserted as (
  insert into public.staff_roles(user_id, role)
  select id, role from eligible
  on conflict (user_id) do nothing
  returning user_id
)
update public.staff_invitations i set accepted_at = now()
  from eligible e
  where i.email = e.email and i.accepted_at is null;

-- Old deployed browser bundles may still call this RPC briefly.
-- Make that call harmless and keep it non-privileged during rollout.
create or replace function public.claim_staff_invitation()
returns boolean language sql security invoker set search_path = ''
as $$ select false $$;
revoke all on function public.claim_staff_invitation() from public, anon, authenticated;
grant execute on function public.claim_staff_invitation() to authenticated;
