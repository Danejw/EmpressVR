"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuth } from "@/lib/auth/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserAuth();
    if (!supabase) { setError("Authentication is not configured."); return; }
    const address = email.trim().toLowerCase();
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true },
      });
      if (sendError) throw sendError;
      setEmail(address); setStep("code");
      setMessage("Check your inbox for your six-digit sign-in code.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your code.");
    } finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserAuth();
    if (!supabase) { setError("Authentication is not configured."); return; }
    if (!/^\d{6}$/.test(code)) { setError("Enter the six-digit code from your email."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email, token: code, type: "email",
      });
      if (verifyError) throw verifyError;
      if (!data.user?.email) throw new Error("Could not verify your account.");

      const { data: customer, error: lookupError } = await supabase.from("customers")
        .select("id").eq("user_id", data.user.id).maybeSingle();
      if (!lookupError && !customer) {
        const { error: insertError } = await supabase.from("customers").insert({
          user_id: data.user.id, contact_email: data.user.email.toLowerCase(),
        });
        if (insertError && insertError.code !== "23505")
          throw new Error("Signed in, but your profile could not be created. Try again.");
      }
      // The RPC grants a role only when the user's verified email was invited.
      await supabase.rpc("claim_staff_invitation");
      const { data: staff } = await supabase.from("staff_roles")
        .select("role").eq("user_id", data.user.id).maybeSingle();
      router.replace(staff?.role === "admin" || staff?.role === "editor" ? "/staff" : "/account");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The code could not be verified.");
    } finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <h1>Sign in to EmpressVR</h1>
    <p className="auth-lead">Access your member account or staff workspace using your email.</p>
    {message ? <p className="auth-message" role="status">{message}</p> : null}
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    {step === "email" ? <form className="auth-form" onSubmit={requestCode}>
      <label htmlFor="auth-email">Email address</label>
      <input id="auth-email" type="email" required autoComplete="email" maxLength={254}
        value={email} onChange={event => setEmail(event.target.value)}
        placeholder="you@example.com" disabled={busy} />
      <button type="submit" className="pill-button" disabled={busy}>
        {busy ? "Sending..." : "Send sign-in code"}
      </button>
      <p className="auth-small">New here? Entering your email can create a free account. Membership approval is separate.</p>
    </form> : <form className="auth-form" onSubmit={verifyCode}>
      <p>We sent a sign-in code to <strong>{email}</strong>.</p>
      <label htmlFor="auth-code">Six-digit code</label>
      <input id="auth-code" type="text" inputMode="numeric" pattern="[0-9]{6}"
        autoComplete="one-time-code" maxLength={6} required value={code}
        onChange={event => setCode(event.target.value.replace(/\D/g, ""))}
        placeholder="123456" disabled={busy} />
      <button className="pill-button" type="submit" disabled={busy}>
        {busy ? "Verifying..." : "Verify and sign in"}
      </button>
      <button className="auth-text-button" type="button"
        onClick={() => { setCode(""); setStep("email"); setError(""); setMessage(""); }}
        disabled={busy}>Use a different email or request another code</button>
    </form>}
  </div>;
}
