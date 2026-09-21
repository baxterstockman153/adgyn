-- Enable Row-Level Security (RLS) on all public tables.
--
-- Supabase auto-exposes every table in the `public` schema through its
-- PostgREST API, reachable with the public anon key. With RLS disabled,
-- anyone with that key can read/edit/delete every row. This app never
-- queries these tables through the Supabase client — the Supabase client
-- is used for auth only, and all data access goes through Prisma, which
-- connects as the `postgres` role (table owner, BYPASSRLS). So enabling
-- RLS with no policies blocks all anon/authenticated API access while
-- leaving Prisma fully functional.
--
-- Enabling RLS on every existing table in `public` (rather than a hard-coded
-- list) keeps this robust: it is idempotent and skips tables that do not yet
-- exist in this database.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
