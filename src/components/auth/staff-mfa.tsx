"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuth } from "@/lib/auth/browser";

type Factor = { id: string; status?: string };

export function StaffMfa() {
  const router = useRouter();
  const [factor, setFactor] = useState<Factor | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const auth = getBrowserAuth();
      if (!auth) return;
      const { data } = await auth.auth.mfa.listFactors();
      if (cancelled) return;
      setFactor(data?.totp?.find((item: Factor) => item.status === "verified") ?? null);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function startEnrollment() {
    const auth = getBrowserAuth();
    if (!auth) return;
    setBusy(true); setError("");
    const { data, error: err } = await auth.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "EmpressVR staff",
    });
    if (err || !data?.totp) {
      setError(err?.message ?? "Could not start authenticator setup.");
    } else {
      setFactor({ id: data.id });
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(true);
    }
    setBusy(false);
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const auth = getBrowserAuth();
    if (!auth || !factor) return;
    setBusy(true); setError("");
    const { error: err } = await auth.auth.mfa.challengeAndVerify({
      factorId: factor.id, code,
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    router.replace("/staff");
    router.refresh();
  }

  return <div className="auth-panel">
    <h1>Secure your staff account</h1>
    <p className="auth-lead">Staff access requires a code from an authenticator app in addition to your email sign-in.</p>
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    {!factor && !enrolling ? <button type="button" className="pill-button"
      onClick={startEnrollment} disabled={busy}>
      {busy ? "Preparing..." : "Set up authenticator"}
    </button> : null}
    {enrolling && qr ? <div className="auth-qr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Authenticator setup QR code" width={220} height={220} />
      <p className="auth-small">Scan with your authenticator app. If needed, enter this setup key manually:</p>
      <code className="auth-secret">{secret}</code>
    </div> : null}
    {factor ? <form onSubmit={verify} className="auth-form">
      <label htmlFor="mfa-code">Authenticator code</label>
      <input id="mfa-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
        autoComplete="one-time-code" required value={code}
        onChange={event => setCode(event.target.value.replace(/\D/g, ""))}
        placeholder="123456" disabled={busy} />
      <button className="pill-button" type="submit" disabled={busy}>
        {busy ? "Verifying..." : "Verify staff access"}
      </button>
    </form> : null}
  </div>;
}
