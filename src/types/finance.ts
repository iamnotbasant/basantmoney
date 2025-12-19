export interface Wallet {
  id: number;
  name: string;
  balance: number;
  type: 'saving' | 'needs' | 'wants';
  color: string;
}

export interface SubWallet {
  id: number;
  name: string;
  balance: number;
  parentWalletId: number;
  parentWalletType: 'saving' | 'needs' | 'wants';
  allocationPercentage: number;
  color: string;
  order: number;
  goalEnabled?: boolean;
  goalTargetAmount?: number;
  goal?: {
    targetAmount: number;
    enabled: boolean;
  };
}

export interface IncomeData {
  id: number;
  source: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

export interface ExpenseData {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
  // walletType has been removed as it's not accurate for multi-source deductions
  deductions: {
    type: 'subwallet' | 'wallet';
    id: number;
    amount: number;
  }[];
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  wallet: 'saving' | 'needs' | 'wants';
  status: 'active' | 'completed' | 'overdue';
  description?: string;
}

export interface FileData {
  wallets?: Wallet[];
  income?: IncomeData[];
  expenses?: ExpenseData[];
  subWallets?: SubWallet[];
}

export interface UdaarEntry {
  id: string;
  personName: string;
  description: string;
  amount: number;
  originalAmount?: number; // Store original amount for partial payments
  type: 'gave' | 'took';
  date: string;
  status: 'pending' | 'paid' | 'partially_paid';
  parentTransactionId?: string; // Link to original transaction for partial payments
  isPartialPayment?: boolean; // Mark if this is a partial payment record
  linkedTransactions?: string[]; // IDs of related transactions
}

export interface PaymentHistory {
  id: string;
  transactionId: string;
  personName: string;
  action: 'created' | 'edited' | 'partial_payment' | 'marked_paid' | 'settled';
  description: string;
  amount?: number;
  date: string;
  details?: any; // Additional details about the action
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

// Predefined wallet structure
export const DEFAULT_WALLET_DISTRIBUTION = {
  saving: 50,
  needs: 30,
  wants: 20
};

export const DEFAULT_SUBWALLET_STRUCTURE = {
  saving: [
    { name: 'Mobile', percentage: 50, color: 'green' },
    { name: 'PC', percentage: 30, color: 'blue' },
    { name: 'Other', percentage: 20, color: 'purple' }
  ],
  needs: [
    { name: 'Recharge', percentage: 50, color: 'yellow' },
    { name: 'Entertainment', percentage: 30, color: 'red' }
    // Remaining 20% stays in main Needs wallet
  ],
  wants: [
    // No subwallets currently
  ]
};
