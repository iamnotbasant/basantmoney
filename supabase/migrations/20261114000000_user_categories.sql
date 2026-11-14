-- Categories go online (14 Nov 2026).
-- Until now categories lived ONLY in localStorage ('categories' key), so a
-- category created on the phone never appeared on any other browser/device
-- (e.g. 'Recharge' existed on the user's phone but not on fresh installs,
-- and the Add Expense form on a new device showed only the 5 defaults).
-- user_categories is the cloud source of truth; localStorage stays as a
-- fast offline cache. The app merges cloud + device lists on load, so a
-- device's own categories are never lost when another device syncs first.
CREATE TABLE IF NOT EXISTS public.user_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#64748B',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, type)
);

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON public.user_categories
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_categories_user_id_idx
  ON public.user_categories (user_id);
