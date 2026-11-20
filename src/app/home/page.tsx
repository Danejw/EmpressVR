import type { Metadata } from "next";
export { default } from "../page";

// On full Next.js hosting /home redirects to /.
// A static GitHub Pages build cannot redirect, so it renders the home page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};
