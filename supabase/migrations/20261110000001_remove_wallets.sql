-- Migration: Remove Wallets and Sub-wallets system completely

-- 1. Update handle_new_user() to remove wallet/subwallet initialization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  default_bank_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Create default bank account
  INSERT INTO public.user_bank_accounts (user_id, name, bank_name, account_type, is_primary)
  VALUES (NEW.id, 'Primary Account', 'Default Bank', 'savings', true)
  RETURNING id INTO default_bank_id;
  
  RETURN NEW;
END;
$$;

-- 2. Drop user_subwallets table (foreign key to user_wallets)
DROP TABLE IF EXISTS public.user_subwallets CASCADE;

-- 3. Drop user_wallets table
DROP TABLE IF EXISTS public.user_wallets CASCADE;
