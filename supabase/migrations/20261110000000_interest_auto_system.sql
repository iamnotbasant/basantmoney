-- Migration: 20261110000000_interest_auto_system.sql
-- Description: Automatic Monthly Interest System schema
-- Authority: Spec sections 1-11

-- 1. Add auto-interest columns to user_income
ALTER TABLE public.user_income 
ADD COLUMN IF NOT EXISTS is_auto_interest BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_target TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_interest_status TEXT DEFAULT NULL;

-- 2. Partial unique index on user_income to enforce one auto-interest entry per calendar month per user
-- NOTE (applied live 10 Nov 2026): the original to_char(date::date, 'YYYY-MM') expression FAILS with
-- Postgres 42P17 ("functions in index expression must be marked IMMUTABLE") — to_char on a date is
-- STABLE (DateStyle-dependent). date_trunc('month', date::timestamp) is IMMUTABLE and keeps the same intent.
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_monthly_auto_interest
ON public.user_income (user_id, (date_trunc('month', date::timestamp)))
WHERE (is_auto_interest = true);

-- 3. Table: interest_rates (Spec §2a)
CREATE TABLE IF NOT EXISTS public.interest_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account TEXT NOT NULL DEFAULT 'Slice',
  annual_rate_percent NUMERIC NOT NULL,
  effective_from_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interest_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read interest_rates"
ON public.interest_rates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert/update interest_rates"
ON public.interest_rates
FOR ALL
TO authenticated
USING (true);

-- Seed initial rates from bank statement proofs
INSERT INTO public.interest_rates (annual_rate_percent, effective_from_date, account)
VALUES 
  (5.25, '2026-08-01', 'Slice'),
  (5.50, '2026-10-08', 'Slice')
ON CONFLICT DO NOTHING;

-- 4. Table: interest_days (Spec §2b)
CREATE TABLE IF NOT EXISTS public.interest_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interest_date DATE NOT NULL,
  closing_balance NUMERIC NOT NULL,
  annual_rate_percent NUMERIC NOT NULL,
  interest_amount NUMERIC(10, 2) NOT NULL,
  account TEXT NOT NULL DEFAULT 'Slice',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_interest_day UNIQUE (user_id, interest_date, account)
);

ALTER TABLE public.interest_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own interest days"
ON public.interest_days
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Table: interest_job_runs (Spec §2c)
CREATE TABLE IF NOT EXISTS public.interest_job_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trigger TEXT NOT NULL, -- 'cron', 'app-open', 'manual'
  days_processed NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- 'ok', 'failed'
  error_message TEXT
);

ALTER TABLE public.interest_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interest job runs"
ON public.interest_job_runs
FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert interest job runs"
ON public.interest_job_runs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 6. Table: interest_verifications (Spec §9)
CREATE TABLE IF NOT EXISTS public.interest_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month TEXT NOT NULL, -- 'YYYY-MM'
  verified_amount NUMERIC NOT NULL,
  computed_amount NUMERIC NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_month_verification UNIQUE (user_id, month)
);

ALTER TABLE public.interest_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own interest verifications"
ON public.interest_verifications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Table: interest_dismissed_corrections (Spec §5)
CREATE TABLE IF NOT EXISTS public.interest_dismissed_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month TEXT NOT NULL,
  reason TEXT,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_month_dismissal UNIQUE (user_id, month)
);

ALTER TABLE public.interest_dismissed_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissed corrections"
ON public.interest_dismissed_corrections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DOCUMENTED PG_CRON SCHEDULE (NOT APPLIED TO LIVE DB AS PER HARD RULES)
-- The user may run the following block in the Supabase SQL editor:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.schedule(
--   'daily-interest-job',
--   '0 19 * * *', -- 19:00 UTC = 00:30 IST next day
--   $$
--   SELECT net.http_post(
--     url := 'https://vobkfalffhihixfmaezo.supabase.co/functions/v1/interest-cron',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
--     body := '{"trigger": "cron"}'::jsonb
--   ) AS request_id;
--   $$
-- );
-- ============================================================================
