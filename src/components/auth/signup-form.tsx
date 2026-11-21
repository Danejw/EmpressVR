"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuth } from "@/lib/auth/browser";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { setError("Use at least eight characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    const supabase = getBrowserAuth();
    if (!supabase) { setError("Authentication is not configured."); return; }
    setBusy(true); setError("");
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/login?verified=1");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        // A project with confirmation disabled may create a session immediately.
        router.replace("/login?verified=1");
        router.refresh();
      } else {
        setSent(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create your account."); }
    finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <h1>Create your EmpressVR account</h1>
    {sent ? <>
      <p className="auth-message" role="status">
        Check your inbox for an account confirmation link. Confirm your email once, then sign in using your password.
      </p>
      <Link href="/login" className="auth-link">Return to sign in</Link>
    </> : <>
      <p className="auth-lead">Create an account to access your profile. Membership approval is separate.</p>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <form className="auth-form" onSubmit={register}>
        <label htmlFor="signup-email">Email address</label>
        <input id="signup-email" type="email" required maxLength={254} autoComplete="email"
          value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy}/>
        <label htmlFor="signup-password">Password</label>
        <div className="auth-password-field">
          <input id="signup-password" type={showPassword ? "text" : "password"}
            required minLength={8} autoComplete="new-password" value={password}
            onChange={event => setPassword(event.target.value)} disabled={busy}/>
          <button type="button" className="auth-text-button" aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button>
        </div>
        <label htmlFor="signup-confirm">Confirm password</label>
        <input id="signup-confirm" type={showPassword ? "text" : "password"}
          required minLength={8} autoComplete="new-password" value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)} disabled={busy}/>
        <p className="auth-small">Use at least eight characters.</p>
        <button type="submit" className="pill-button" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
      </form>
      <p>Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
    </>}
  </div>;
}
