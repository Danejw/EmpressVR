"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuth } from "@/lib/auth/browser";
import { completeSignIn } from "@/lib/auth/complete-sign-in";

export function LoginForm({ notice, returnTo }: { notice?: "verified" | "reset" | "error"; returnTo?: "/book" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserAuth();
    if (!supabase) { setError("Authentication is not configured."); return; }
    setBusy(true); setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (loginError) throw loginError;
      const destination = await completeSignIn();
      router.replace(returnTo ?? destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <h1>Sign in to EmpressVR</h1>
    <p className="auth-lead">Access your member account or staff workspace.</p>
    {notice === "verified" ? <p className="auth-message" role="status">Email confirmed. Sign in with your password.</p> : null}
    {notice === "reset" ? <p className="auth-message" role="status">Password updated. Sign in with your new password.</p> : null}
    {notice === "error" ? <p className="auth-error" role="alert">That email link is invalid or has expired. Request a new one.</p> : null}
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <form className="auth-form" onSubmit={signIn}>
      <label htmlFor="auth-email">Email address</label>
      <input id="auth-email" type="email" required autoComplete="email" maxLength={254}
        value={email} onChange={event => setEmail(event.target.value)}
        placeholder="you@example.com" disabled={busy} />
      <label htmlFor="auth-password">Password</label>
      <div className="auth-password-field">
        <input id="auth-password" type={showPassword ? "text" : "password"}
          required autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)}
          minLength={6} disabled={busy}/>
        <button type="button" className="auth-text-button" aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button>
      </div>
      <button type="submit" className="pill-button" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      <div className="auth-secondary-links">
        <Link className="auth-link" href="/forgot-password">Forgot password?</Link>
        <p>New to EmpressVR? <Link className="auth-link" href="/signup">Create an account</Link></p>
      </div>
    </form>
  </div>;
}
