# EVR-21: Email/password authentication

## Authentication flow

EmpressVR uses Supabase email/password authentication, with a single account for members and staff. Passwords are managed exclusively by Supabase Auth. There are no application password tables or secret-role credentials.

- **/signup**: email, password (minimum eight characters), password confirmation, and email verification via Supabase's default confirmation link.
- **/login**: email and password. An authenticated user is provisioned in \`customers\`, and the server-controlled \`claim_staff_invitation()\` RPC checks any pending invite linked to their verified email. Routing is based on the live \`staff_roles\` table.
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
Staff sign in with a password and must complete authenticator-app MFA at \`/staff/security\`. Admins can invite editors/admins inside \`/staff\`; no invitation email is sent by the application.

## QA

Automated tests cover new page rendering, password validation, recovery landing, callback redirect safety and anonymous staff/member access. Integration test with real confirmation and recovery emails remains a manual step requiring access to a real inbox. No transactional email provider configured in EVR-21.
