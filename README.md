# Guilty by Data

## Environment

Frontend:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Vercel server function:

```bash
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
2. Apply the SQL in `supabase/migrations/`.
3. Deploy the app to Vercel.

Test the full submission flow after deployment so the `/api/submit-round` route is exercised in the deployed environment.

