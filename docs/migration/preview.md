# GitHub Pages Preview

EmpressVR's current rebuild can be previewed from the feature branch without
affecting the Squarespace production website or merging into `main`.

**Expected preview URL** once GitHub Pages is enabled and deployment succeeds:
https://danejw.github.io/EmpressVR/

**Workflow:** `.github/workflows/pages-preview.yml`

**Branch:** `feat/squarespace-faithful-rebuild`

## One-time setup

1. Open https://github.com/Danejw/EmpressVR/settings/pages
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open https://github.com/Danejw/EmpressVR/actions/workflows/pages-preview.yml
4. Inspect the first successful deployment to confirm the published URL.

After this setup, each push to the rebuild branch rebuilds and republishes
the preview. The preview is public because the repository is public.

## Architecture and limitations

- The workflow builds the existing Next.js app with
  `GITHUB_PAGES_PREVIEW=true`, enabling `output: "export"`,
  `basePath: "/EmpressVR"`, and `trailingSlash: true`.
- Locally and on server-capable production hosting the app retains its usual
  Next.js build. These Pages-only settings do **not** affect `main`.
- The root-domain route `/home` is an alias page in static export mode;
  the full Next.js app uses a normal redirect.
- Existing links to live checkout and booking systems remain directed
  to the original site. GitHub Pages cannot execute Next.js server routes,
  API handlers, Stripe webhooks or Google OAuth callbacks.
- Images are still sourced from the original Squarespace CDN until media
  migration is complete.
- This is a **design preview**, not the final commercial hosting architecture.

Do not switch the domain/DNS or disable the existing site based on the preview.
