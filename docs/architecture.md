# Architecture

```mermaid
flowchart TD
  U[Visitors] --> W[Next.js / React]
  W --> C[Content]
  W --> P[Commerce]
  W --> S[Scheduling and events]
  P --> Stripe[Stripe checkout and billing]
  P --> DB[(Supabase)]
  S --> Cal[Google Calendar API]
  S --> DB
  C --> Data[Page, project and media data]
```

One application, three cohesive modules. Keep external APIs behind server-only adapters. UI components should be reusable across the website. Host-specific code stays isolated so deployment can move.

No live external integrations have been configured. Defer schemas and paid services until actual workflows are confirmed.
