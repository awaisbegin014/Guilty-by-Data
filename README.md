# Guilty by Data

## Environment

Frontend:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Vercel server function:

```   bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Submission API

Round submission now uses a Node/Vercel API route at `/api/submit-round`.

That means:

- participant login and reads still use the browser Supabase client
- final submission is validated server-side with the service role key
- Deno/Supabase Edge Function setup is no longer required for submissions

## Deploy Notes

For production on Vercel:

1. Set the four env vars above in the Vercel project.
2. Apply any pending SQL files from `supabase/migrations/` in version order.
   For a fresh database, apply all migrations in order.
   For an existing database, apply only the migrations that have not been applied yet.
3. Deploy the app to Vercel.
4. Run a quick smoke test after deploy:
   - admin round unlock, start, pause, and reset flow
   - participant submission flow through `/api/submit-round`
   - leaderboard update after  submission

This helps confirm both the server route and the latest database changes are active in the deployed environment.

