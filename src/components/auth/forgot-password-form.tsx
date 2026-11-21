"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getBrowserAuth } from "@/lib/auth/browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const auth = getBrowserAuth();
    if (!auth) { setError("Authentication is not configured."); return; }
    setBusy(true); setError("");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/reset-password");
    try {
      const { error: requestError } = await auth.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: callback.toString(),
      });
      if (requestError) throw requestError;
      setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not request a password reset."); }
    finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <h1>Reset your password</h1>
    {sent ? <p className="auth-message" role="status">
      If an account exists for that email, you will receive a password-reset link.
    </p> : <>
      <p className="auth-lead">Enter your email address and we’ll send a password-reset link.</p>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <form onSubmit={requestReset} className="auth-form">
        <label htmlFor="recovery-email">Email address</label>
        <input id="recovery-email" type="email" required autoComplete="email" maxLength={254}
          value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/>
        <button className="pill-button" type="submit" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </>}
    <p><Link className="auth-link" href="/login">Back to sign in</Link></p>
  </div>;
}
