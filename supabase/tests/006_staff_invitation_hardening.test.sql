-- Privileged staff provisioning must be internal to trusted database events.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

select ok(
  to_regprocedure('public.claim_staff_invitation()') is null,
  'The old publicly callable privileged RPC is removed'
);
select ok(
  to_regprocedure('private.redeem_staff_invitation_on_change()') is not null,
  'The role-granting trigger function exists in private schema'
);
select ok(
  (select prosecdef from pg_proc
    where oid = 'private.redeem_staff_invitation_on_change()'::regprocedure),
  'The trigger runs as its controlled database owner'
);
select ok(
  not has_function_privilege('authenticated',
    'private.redeem_staff_invitation_on_change()', 'execute'),
  'Ordinary signed-in users cannot call the private function'
);
select ok(
  not has_function_privilege('anon',
    'private.redeem_staff_invitation_on_change()', 'execute'),
  'Anonymous visitors cannot call the private function'
);
select is(
  (select count(*)::integer from pg_trigger t
   where t.tgrelid = 'public.staff_invitations'::regclass
     and t.tgname = 'staff_invite_created' and not t.tgisinternal),
  1, 'Invitations trigger provisioning only after an admin inserts them'
);
select is(
  (select count(*)::integer from pg_trigger t
   where t.tgrelid = 'auth.users'::regclass
     and t.tgname = 'staff_invite_email_verified' and not t.tgisinternal),
  1, 'Verified emails trigger provisioning for pending invitations'
);
select ok(
  not has_table_privilege('authenticated', 'public.staff_roles', 'insert'),
  'Signed-in users cannot directly assign themselves staff roles'
);

-- Exercise both event paths, no invitation and expiry using synthetic accounts.
-- All rows are rolled back at the end of this test file.
select lives_ok($test$
do $verify$
declare
  inviter_id uuid := gen_random_uuid();
  before_id uuid := gen_random_uuid();
  after_id uuid := gen_random_uuid();
  stranger_id uuid := gen_random_uuid();
  expired_id uuid := gen_random_uuid();
  before_email text := 'evr-test-' || before_id::text || '@example.invalid';
  after_email text := 'evr-test-' || after_id::text || '@example.invalid';
  stranger_email text := 'evr-test-' || stranger_id::text || '@example.invalid';
  expired_email text := 'evr-test-' || expired_id::text || '@example.invalid';
begin
  insert into auth.users(id,email,email_confirmed_at)
    values(inviter_id,'evr-inviter-' || inviter_id::text || '@example.invalid',now());

  -- Existing unverified account: invite grants nothing until verification.
  insert into auth.users(id,email) values(before_id,before_email);
  insert into public.staff_invitations(email,role,invited_by)
    values(before_email,'editor',inviter_id);
  if exists(select 1 from public.staff_roles where user_id=before_id) then
    raise exception 'unverified account assigned a role';
  end if;
  update auth.users set email_confirmed_at=now() where id=before_id;
  if not exists(select 1 from public.staff_roles where user_id=before_id and role='editor') then
    raise exception 'verified invited account did not receive editor role';
  end if;
  if not exists(select 1 from public.staff_invitations
    where email=before_email and accepted_at is not null) then
    raise exception 'invitation was not marked redeemed';
  end if;

  -- Already verified account: creating an invitation grants its assigned role.
  insert into auth.users(id,email,email_confirmed_at)
    values(after_id,after_email,now());
  insert into public.staff_invitations(email,role,invited_by)
    values(after_email,'admin',inviter_id);
  if not exists(select 1 from public.staff_roles where user_id=after_id and role='admin') then
    raise exception 'existing verified account was not assigned by invitation';
  end if;

  -- Confirmed accounts without an invitation cannot become staff.
  insert into auth.users(id,email,email_confirmed_at)
    values(stranger_id,stranger_email,now());
  if exists(select 1 from public.staff_roles where user_id=stranger_id) then
    raise exception 'account without an invitation gained staff access';
  end if;

  -- An expired invitation cannot grant permissions.
  insert into auth.users(id,email,email_confirmed_at)
    values(expired_id,expired_email,now());
  insert into public.staff_invitations(email,role,invited_by,created_at,expires_at)
    values(expired_email,'admin',inviter_id,now()-interval '2 days',now()-interval '1 day');
  if exists(select 1 from public.staff_roles where user_id=expired_id) then
    raise exception 'expired invitation granted access';
  end if;
end;
$verify$;
$test$, 'Only a live invitation and a verified email may grant a role');

select * from finish();
rollback;
