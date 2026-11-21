import { signOut } from "@/app/auth/actions";

export function SignOutButton() {
  return <form action={signOut}>
    <button className="auth-text-button" type="submit">Sign out</button>
  </form>;
}
