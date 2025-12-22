-- Store user-entered description/notes
ALTER TABLE public.user_income
ADD COLUMN notes text;

ALTER TABLE public.user_expenses
ADD COLUMN notes text;