-- Add payment_method column to user_income table
ALTER TABLE public.user_income 
ADD COLUMN payment_method text;

-- Add payment_method column to user_expenses table
ALTER TABLE public.user_expenses 
ADD COLUMN payment_method text;