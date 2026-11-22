# EVR-21: Email/password authentication

## Authentication flow

EmpressVR uses Supabase email/password authentication, with a single account for members and staff. Passwords are managed exclusively by Supabase Auth. There are no application password tables or secret-role credentials.

- **/signup**: email, password (minimum eight characters), password confirmation, and email verification via Supabase's default confirmation link.
- **/login**: email and password. An authenticated user is provisioned in \`customers\`, and the website reads the live \`staff_roles\` table. Staff invitations are redeemed automatically by private database triggers when an administrator creates an invitation for an already verified account, or an invited user verifies their email.
- **/forgot-password**: send a recovery email, with a generic successful response to avoid identifying existing accounts.
- **/auth/callback**: exchange Supabase PKCE authentication codes using the cookie-based server client. Only three fixed internal redirect paths are allowed.
- **/reset-password**: require an authenticated recovery session before changing a password, then sign out and return to login.
- **/account**: private profile, live membership status and applications; registration is not membership approval.
- **/staff**: assigned admin/editor roles only, with mandatory authenticator-app MFA (AAL2). Admin invitations remain seven-day records and require a separately verified email to redeem.

The SSR session implementation uses @supabase/ssr and Next.js cookies. Never make authorization decisions from editable user metadata. Keep existing Row Level Security policies in place.

## Hosted Supabase setup

Supabase project: \`zxsrixbjsmyzmqywukwa\`

The Site URL and allowlisted redirect origin are \`https://empress-vr.vercel.app\`. Email confirmation should remain **enabled**. The default "Confirm your email address" and "Reset your password" link templates can remain unchanged. No custom SMTP, Resend, or paid Supabase plan is required for the application implementation, although built-in Supabase email delivery remains restricted/rate-limited.

Signup passes \`https://empress-vr.vercel.app/auth/callback?next=/login%3Fverified%3D1\` as emailRedirectTo, and password recovery passes \`https://empress-vr.vercel.app/auth/callback?next=/reset-password\`. Ensure the URLs are accepted in Supabase Auth Redirect URLs (use an allowlisted \`https://empress-vr.vercel.app/**\` pattern or the exact callback URLs).

A confirmation email link is used only for signup. Normal password sign-in requires no email. Recovery emails are only required for forgotten passwords. Validate both hosted emails with real accounts before public onboarding.

## Existing users and staff

Existing verified Supabase Auth users keep their identities, memberships, and staff role bindings. Users who had passwordless accounts can use "Forgot password" to establish a password if the default recovery email is deliverable.

First admin bootstrap remains a privileged project-owner action after the staff member has an authenticated verified account:
\`\`\`sql
select id, email from auth.users where email = '<verified staff email>' and email_confirmed_at is not null;
insert into public.staff_roles(user_id,role) values('<verified user UUID>', 'admin');
\`\`\`
Staff sign in with a password and must complete authenticator-app MFA at \`/staff/security\`. Admins can invite editors/admins inside \`/staff\`; no invitation email is sent by the application. The role-granting trigger function lives in the private database schema and is not executable by anonymous or authenticated browser roles.

## QA

Automated tests cover new page rendering, password validation, recovery landing, callback redirect safety and anonymous staff/member access. Integration test with real confirmation and recovery emails remains a manual step requiring access to a real inbox. No transactional email provider configured in EVR-21.

## Staff invitation security hardening (EVR-22)

The former `public.claim_staff_invitation()` API used elevated privileges to assign roles after sign-in. It has been removed from the client and database. Provisioning now occurs only in response to two trusted database events: an MFA-verified administrator inserting an invitation (for an existing verified account), or Supabase Auth confirming an invited account's email. The private trigger verifies the stored account email against an unexpired, unused invitation before assigning a role. Existing roles are never overwritten. Email confirmation must not fail if optional staff provisioning encounters a database error; the auth trigger logs failures for server-side investigation. Private trigger functions are not executable by `anon` or `authenticated` and their schema is not exposed by the Data API.

Deploy in order: first apply `20261122020000_restrict_staff_invitation_rpc.sql`, which temporarily makes the old RPC non-privileged for already loaded browser clients; deploy the updated login flow; then apply `20261122020001_remove_legacy_staff_invite_rpc.sql`. Run `supabase/tests/006_staff_invitation_hardening.test.sql` and the Supabase security advisor afterward. Verify invitation behavior for an already-verified account and for an account that confirms after being invited before broad staff onboarding.
