"use client";

import { useState, type FormEvent } from "react";

/** Public contact form with an honest email-client fallback if delivery isn't configured. */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "email" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const fields = Object.fromEntries(["firstName","lastName","email","message","website"].map(
      key => [key, String(data.get(key) ?? "").trim()]
    ));
    setState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (response.ok) { setState("sent"); form.reset(); return; }
      if (response.status !== 503) {
        setError("Your message couldn't be sent. Please use the email link below.");
        setState("error"); return;
      }
    } catch { /* email fallback is still available */ }
    const subject = encodeURIComponent("EmpressVR website enquiry");
    const body = encodeURIComponent(
      fields.message + "\n\nFrom: " + fields.firstName + " " + fields.lastName + "\nReply to: " + fields.email
    );
    setState("email");
    window.location.href = "mailto:info@empressvr.com?subject=" + subject + "&body=" + body;
  }
  return <form className="contact-form" onSubmit={submit}>
    <div className="contact-fields">
      <label>First name <input required name="firstName" autoComplete="given-name" maxLength={80}/></label>
      <label>Last name <input required name="lastName" autoComplete="family-name" maxLength={80}/></label>
    </div>
    <label>Email <input required type="email" name="email" autoComplete="email" maxLength={254}/></label>
    <label>What can we help you with today? <textarea required name="message" minLength={10} maxLength={3000} rows={6}/></label>
    <div className="contact-honeypot" aria-hidden="true"><label>Website <input tabIndex={-1} name="website" autoComplete="off"/></label></div>
    <button className="pill-button" type="submit" disabled={state === "sending"}>
      {state === "sending" ? "Sending..." : "Send message"}
    </button>
    <p role="status" aria-live="polite">{state === "sent" ? "Message sent. Thank you!" :
      state === "email" ? "Your email app has been opened. Send the prepared message there to finish." :
      state === "error" ? error : ""}</p>
    <p>Or email <a href="mailto:info@empressvr.com">info@empressvr.com</a> directly.</p>
  </form>;
}
