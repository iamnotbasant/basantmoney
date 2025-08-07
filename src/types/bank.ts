export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_type: string;
  balance: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransfer {
  id?: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  transfer_date: string;
  created_at?: string;
}