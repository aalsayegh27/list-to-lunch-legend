# Mise

Turn the groceries you keep at home into simple lunches and dinners you can cook tonight.

Live at **https://list-to-lunch-legend.vercel.app**

## Stack

- TanStack Start (React, TypeScript), Tailwind CSS, built with Vite
- Supabase: Postgres database, auth, row-level security (`supabase/migrations/`)
- Anthropic API (Claude Sonnet 5.5) for new recipes, called from server functions
- Hosted on Vercel

## Development

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests + migrations against an in-memory Postgres
npm run build
```

Copy `.env.example` to `.env` and fill in the values from the Supabase project.

## Environment variables

| Name | Where | What |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | build (browser) | Supabase project URL and public key |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | server | Same values, for server functions |
| `ANTHROPIC_API_KEY` | server only | Recipe generation |
| `MISE_SERVER_SECRET` | server only | Proves AI calls to the database come from the server; its SHA-256 is in `ai_settings` |
