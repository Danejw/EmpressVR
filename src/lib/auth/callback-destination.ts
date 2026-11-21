/** Only these internal pages can receive authentication callbacks. */
export function authCallbackDestination(next: string | null): string {
  const allowed = new Set(["/login?verified=1", "/reset-password", "/account"]);
  return next && allowed.has(next) ? next : "/account";
}
