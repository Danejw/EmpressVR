"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuth } from "@/lib/auth/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const auth = getBrowserAuth();
    if (!auth) { setChecking(false); return; }
    void auth.auth.getUser().then(({ data, error: authError }: { data: { user: unknown }; error: unknown }) => {
      if (!active) return;
      setAuthorized(!!data.user && !authError);
      setChecking(false);
    });
    return () => { active = false; };
  }, []);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { setError("Use at least eight characters."); return; }
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    const auth = getBrowserAuth();
    if (!auth) return;
    setBusy(true); setError("");
    try {
      const { error: updateError } = await auth.auth.updateUser({ password });
      if (updateError) throw updateError;
      await auth.auth.signOut();
      router.replace("/login?reset=1");
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not update your password."); }
    finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <h1>Choose a new password</h1>
    {checking ? <p role="status">Checking your reset link...</p> : !authorized ?
      <p role="alert">This recovery link is invalid, expired, or has not been opened yet.
        {" "}<Link className="auth-link" href="/forgot-password">Request another link</Link>.</p>
      : <>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <form className="auth-form" onSubmit={update}>
          <label htmlFor="reset-password">New password</label>
          <div className="auth-password-field">
            <input id="reset-password" type={visible ? "text" : "password"} required
              autoComplete="new-password" minLength={8} value={password}
              onChange={event => setPassword(event.target.value)} disabled={busy}/>
            <button type="button" className="auth-text-button"
              onClick={() => setVisible(v => !v)}>{visible ? "Hide" : "Show"}</button>
          </div>
          <label htmlFor="reset-confirm">Confirm new password</label>
          <input id="reset-confirm" type={visible ? "text" : "password"} required
            autoComplete="new-password" minLength={8} value={confirmation}
            onChange={event => setConfirmation(event.target.value)} disabled={busy}/>
          <button className="pill-button" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save new password"}
          </button>
        </form>
      </>}
  </div>;
}
