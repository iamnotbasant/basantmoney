-- Fix search path for handle_bank_transfer function
CREATE OR REPLACE FUNCTION public.handle_bank_transfer()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Deduct from source account
  UPDATE public.user_bank_accounts 
  SET balance = balance - NEW.amount,
      updated_at = now()
  WHERE id = NEW.from_account_id AND user_id = NEW.user_id;
  
  -- Add to destination account
  UPDATE public.user_bank_accounts 
  SET balance = balance + NEW.amount,
      updated_at = now()
  WHERE id = NEW.to_account_id AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;