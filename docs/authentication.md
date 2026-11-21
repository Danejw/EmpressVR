# EVR-20: member and staff login

## Design
One Supabase Auth email-OTP login at /login for registered people, staff and members. New accounts are not automatically approved members or staff. User profile data lives in customers.user_id; membership status is read from memberships and membership_applications. The existing staff_roles table is authoritative for admin/editor permissions. /account is private; /staff requires staff role and authenticator-app MFA (AAL2). No service role API key is used in the web application.

The admin-only /staff invites feature writes a seven-day pending staff invitation. It does **not** send an email. The invited staff member can go to /login and sign in with that email; the first verified sign-in redeems the invitation. No one can self-assign a role.

## Hosted Supabase OTP email template (one-time manual setup)
Supabase Dashboard → Authentication → Email Templates → **Magic Link**. Replace the content with:
```html
<h2>Your EmpressVR sign-in code</h2>
<p>Enter this six-digit code to sign in: <strong>{{ .Token }}</strong></p>
<p>If you didn't request this, you can ignore this email.</p>
```
For the first-time signup / confirmation email template, also ensure the confirmation message exposes \`{{ .Token }}\`, otherwise a first-time user may receive a confirmation link instead of a code. Configure / auth URL allow list appropriately. The Supabase built-in sender may allow delivery only to authorized team addresses and is rate-limited. Custom SMTP/Resend is intentionally deferred.

## Bootstrap first admin
1. Sign in using /login with the designated staff email after enabling the OTP email template. This creates the auth user.
2. In Supabase SQL editor, as project owner, identify the user and assign its role. Replace the email intentionally:
```sql
select id, email from auth.users where email = '<authorized staff email>' and email_confirmed_at is not null;
insert into public.staff_roles(user_id,role) values('<verified user UUID>','admin');
```
3. Sign in again and go to /staff/security to enroll an authenticator app.
4. Visit /staff. An admin can then create staff invitations for new editors or admins. Send the login URL to the invited person by your usual communication channel. Invitation emails are not sent automatically.

## Operational constraints
- No public anonymous writes to content tables. Staff CMS editing is not yet implemented.
- OTP delivery is throttled by Supabase; default email delivery has limited recipients.
- Payment flows, membership approval and billing are separate projects.
- Role checks are enforced on the server on every protected request; browser metadata does not grant permissions.
- Staff MFA verification is required for /staff routes and administrative invite creation.
- Existing public content remains accessible while auth is rolled out.
