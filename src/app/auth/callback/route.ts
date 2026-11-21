import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server";
import { authCallbackDestination } from "@/lib/auth/callback-destination";

/**
 * Exchange the one-time Supabase PKCE code for a cookie-backed session.
 * Only allow known internal destinations to prevent open redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const next = searchParams.get("next");
  const destination = authCallbackDestination(next);
  const origin = request.nextUrl.origin;

  if (error) return NextResponse.redirect(new URL("/login?error=link", origin));
  if (!code) return NextResponse.redirect(new URL("/login?error=link", origin));
  const supabase = await getServerAuth();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=link", origin));
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) return NextResponse.redirect(new URL("/login?error=link", origin));
  return NextResponse.redirect(new URL(destination, origin));
}
