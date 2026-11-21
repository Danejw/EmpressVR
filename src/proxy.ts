import type { NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/auth/proxy";

export async function proxy(request: NextRequest) {
  return refreshAuthSession(request);
}

export const config = {
  matcher: ["/login", "/signup", "/forgot-password", "/reset-password", "/account/:path*", "/staff/:path*", "/auth/:path*"],
};
