import { NextResponse } from "next/server";

type ContactInput = {
  firstName?: unknown; lastName?: unknown; email?: unknown;
  message?: unknown; website?: unknown;
};

export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > 8000) return NextResponse.json({ error: "Message too long" }, { status: 413 });
  let data: ContactInput;
  try { data = await request.json() as ContactInput; }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (typeof data.website === "string" && data.website.trim())
    return NextResponse.json({ ok: true }); // bot field
  const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
  const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: "Invalid contact details" }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: ["info@empressvr.com"], reply_to: email,
        subject: "EmpressVR enquiry from " + firstName + " " + lastName,
        text: "From: " + firstName + " " + lastName + "\nEmail: " + email + "\n\n" + message,
      }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Delivery failed" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delivery unavailable" }, { status: 502 });
  }
}
