-- Privileged staff provisioning must be internal to trusted database events.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

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

select * from finish();
rollback;
