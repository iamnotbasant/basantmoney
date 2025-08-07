-- Create bank accounts table
CREATE TABLE public.user_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings',
  balance NUMERIC DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for bank accounts
CREATE POLICY "Users can manage own bank accounts" 
ON public.user_bank_accounts 
FOR ALL 
USING (auth.uid() = user_id);

-- Add bank_account_id to existing tables
ALTER TABLE public.user_wallets 
ADD COLUMN bank_account_id UUID;

ALTER TABLE public.user_subwallets 
ADD COLUMN bank_account_id UUID;

ALTER TABLE public.user_income 
ADD COLUMN bank_account_id UUID;

ALTER TABLE public.user_expenses 
ADD COLUMN bank_account_id UUID;

ALTER TABLE public.user_financial_goals 
ADD COLUMN bank_account_id UUID;

-- Create bank account transfers table
CREATE TABLE public.user_bank_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL,
  to_account_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for transfers
ALTER TABLE public.user_bank_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for transfers
CREATE POLICY "Users can manage own transfers" 
ON public.user_bank_transfers 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to update bank account balances on transfer
CREATE OR REPLACE FUNCTION public.handle_bank_transfer()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bank transfers
CREATE TRIGGER trigger_handle_bank_transfer
  AFTER INSERT ON public.user_bank_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bank_transfer();

-- Update the existing handle_new_user function to create a default bank account
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
  
  -- Initialize default wallets for new user with bank account reference
  INSERT INTO public.user_wallets (user_id, name, balance, type, color, bank_account_id) VALUES
  (NEW.id, 'Saving Wallet', 0, 'saving', 'green', default_bank_id),
  (NEW.id, 'Needs Wallet', 0, 'needs', 'blue', default_bank_id),
  (NEW.id, 'Wants Wallet', 0, 'wants', 'purple', default_bank_id);
  
  -- Initialize default sub-wallets with bank account reference
  WITH wallet_ids AS (
    SELECT id, type FROM public.user_wallets WHERE user_id = NEW.id AND bank_account_id = default_bank_id
  )
  INSERT INTO public.user_subwallets (user_id, name, balance, parent_wallet_id, parent_wallet_type, allocation_percentage, color, order_position, bank_account_id)
  SELECT 
    NEW.id,
    sub.name,
    0,
    w.id,
    w.type,
    sub.percentage,
    sub.color,
    sub.order_pos,
    default_bank_id
  FROM wallet_ids w
  CROSS JOIN (
    VALUES 
    ('saving', 'Mobile', 50, 'green', 1),
    ('saving', 'PC', 30, 'blue', 2),
    ('saving', 'Other', 20, 'purple', 3),
    ('needs', 'Recharge', 50, 'yellow', 1),
    ('needs', 'Entertainment', 30, 'red', 2)
  ) AS sub(wallet_type, name, percentage, color, order_pos)
  WHERE w.type = sub.wallet_type;
  
  RETURN NEW;
END;
$$;