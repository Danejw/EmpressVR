-- EVR-20: login accounts, member-scoped reads and staff invitations.
-- Existing membership approval and staff_roles remain authoritative.
-- Browser roles can never change membership approval or assign staff roles directly.

alter table public.customers enable row level security;
revoke all on public.customers from anon, authenticated;
grant select (id, user_id, contact_email, display_name) on public.customers to authenticated;
grant insert (user_id, contact_email, display_name) on public.customers to authenticated;
grant update (display_name) on public.customers to authenticated;

create policy "members read own customer" on public.customers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "members create own customer" on public.customers
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and lower(contact_email) = lower((select auth.jwt() ->> 'email'))
  );
create policy "members update own display name" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and lower(contact_email) = lower((select auth.jwt() ->> 'email')));

grant select (id, customer_id, kind, status, submitted_at)
  on public.membership_applications to authenticated;
create policy "members read own applications" on public.membership_applications
  for select to authenticated
  using (exists (select 1 from public.customers c
    where c.id = customer_id and c.user_id = (select auth.uid())));

grant select (id, customer_id, status, approved_at, ended_at)
  on public.memberships to authenticated;
create policy "members read own memberships" on public.memberships
  for select to authenticated
  using (exists (select 1 from public.customers c
    where c.id = customer_id and c.user_id = (select auth.uid())));

-- Invites are entered by an existing, MFA-verified admin. No email is sent
-- by the application; the invited person signs in normally with an OTP.
create table public.staff_invitations (
  email text primary key check (email = lower(trim(email))
    and length(email) between 5 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  role text not null check (role in ('admin', 'editor')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  constraint staff_invitation_expiry check (expires_at > created_at)
);
alter table public.staff_invitations enable row level security;
revoke all on public.staff_invitations from anon, authenticated;
grant select (email, role, invited_by, created_at, expires_at, accepted_at)
  on public.staff_invitations to authenticated;
grant insert (email, role, invited_by) on public.staff_invitations to authenticated;
grant delete on public.staff_invitations to authenticated;
grant all on public.staff_invitations to service_role;

create policy "mfa admins view invitations" on public.staff_invitations
 for select to authenticated using (
   (select auth.jwt() ->> 'aal') = 'aal2'
   and exists(select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role = 'admin')
 );
create policy "mfa admins create invitations" on public.staff_invitations
 for insert to authenticated with check (
   invited_by = (select auth.uid())
   and (select auth.jwt() ->> 'aal') = 'aal2'
   and exists(select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role = 'admin')
 );
create policy "mfa admins revoke invitations" on public.staff_invitations
 for delete to authenticated using (
   (select auth.jwt() ->> 'aal') = 'aal2'
   and exists(select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role = 'admin')
 );

-- A verified invited email can redeem exactly its own live invitation.
-- Restricted privileged function: nobody can pass a user ID, email or role.
create function public.claim_staff_invitation() returns boolean
 language plpgsql security definer set search_path = ''
 as $$
 declare
   principal uuid := (select auth.uid());
   verified_email text;
   invited_role text;
 begin
   if principal is null then return false; end if;
   select lower(u.email) into verified_email from auth.users u
     where u.id = principal and u.email_confirmed_at is not null;
   if verified_email is null then return false; end if;
   select i.role into invited_role
     from public.staff_invitations i
     where i.email = verified_email and i.accepted_at is null
       and i.expires_at > now()
     for update;
   if invited_role is null then return false; end if;
   insert into public.staff_roles (user_id, role)
     values (principal, invited_role) on conflict (user_id) do nothing;
   update public.staff_invitations set accepted_at = now()
     where email = verified_email and accepted_at is null;
   return true;
 end;
 $$;
revoke all on function public.claim_staff_invitation() from public, anon, authenticated;
grant execute on function public.claim_staff_invitation() to authenticated;
