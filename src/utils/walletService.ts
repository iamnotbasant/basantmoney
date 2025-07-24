
import { Wallet, SubWallet, IncomeData, ExpenseData, DEFAULT_WALLET_DISTRIBUTION, DEFAULT_SUBWALLET_STRUCTURE } from '@/types/finance';

export class WalletService {
  
  // Get current distribution settings from localStorage or use defaults
  static getCurrentDistribution() {
    const userSettings = localStorage.getItem('userSettings');
    if (userSettings) {
      const parsed = JSON.parse(userSettings);
      return parsed.distribution || DEFAULT_WALLET_DISTRIBUTION;
    }
    return DEFAULT_WALLET_DISTRIBUTION;
  }

  // Initialize default wallet and sub-wallet structure
  static initializeWalletSystem(): { wallets: Wallet[], subWallets: SubWallet[] } {
    const wallets: Wallet[] = [
      { id: 1, name: 'Saving Wallet', balance: 0, type: 'saving', color: 'green' },
      { id: 2, name: 'Needs Wallet', balance: 0, type: 'needs', color: 'blue' },
      { id: 3, name: 'Wants Wallet', balance: 0, type: 'wants', color: 'purple' }
    ];

    const subWallets: SubWallet[] = [];
    let subWalletId = 1;

    // Create saving sub-wallets
    DEFAULT_SUBWALLET_STRUCTURE.saving.forEach((sw, index) => {
      subWallets.push({
        id: subWalletId++,
        name: sw.name,
        balance: 0,
        parentWalletId: 1,
        parentWalletType: 'saving',
        allocationPercentage: sw.percentage,
        color: sw.color,
        order: index
      });
    });

    // Create needs sub-wallets
    DEFAULT_SUBWALLET_STRUCTURE.needs.forEach((sw, index) => {
      subWallets.push({
        id: subWalletId++,
        name: sw.name,
        balance: 0,
        parentWalletId: 2,
        parentWalletType: 'needs',
        allocationPercentage: sw.percentage,
        color: sw.color,
        order: index
      });
    });

    return { wallets, subWallets };
  }

  // Process income and distribute across wallets and sub-wallets
  static processIncome(incomeAmount: number): {
    walletUpdates: { type: 'saving' | 'needs' | 'wants', amount: number }[],
    subWalletUpdates: { id: number, amount: number }[]
  } {
    const distribution = this.getCurrentDistribution();
    
    // Calculate main wallet distributions
    const savingAmount = (incomeAmount * distribution.saving) / 100;
    const needsAmount = (incomeAmount * distribution.needs) / 100;
    const wantsAmount = (incomeAmount * distribution.wants) / 100;

    const walletUpdates = [
      { type: 'saving' as const, amount: savingAmount },
      { type: 'needs' as const, amount: needsAmount },
      { type: 'wants' as const, amount: wantsAmount }
    ];

    const subWalletUpdates: { id: number, amount: number }[] = [];

    // Get current sub-wallets from storage
    const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]');

    // Distribute to saving sub-wallets
    DEFAULT_SUBWALLET_STRUCTURE.saving.forEach((swConfig) => {
      const subWallet = currentSubWallets.find((sw: SubWallet) => 
        sw.parentWalletType === 'saving' && sw.name === swConfig.name
      );
      if (subWallet) {
        const subWalletAmount = (savingAmount * swConfig.percentage) / 100;
        subWalletUpdates.push({ id: subWallet.id, amount: subWalletAmount });
      }
    });

    // Distribute to needs sub-wallets
    DEFAULT_SUBWALLET_STRUCTURE.needs.forEach((swConfig) => {
      const subWallet = currentSubWallets.find((sw: SubWallet) => 
        sw.parentWalletType === 'needs' && sw.name === swConfig.name
      );
      if (subWallet) {
        const subWalletAmount = (needsAmount * swConfig.percentage) / 100;
        subWalletUpdates.push({ id: subWallet.id, amount: subWalletAmount });
      }
    });

    return { walletUpdates, subWalletUpdates };
  }

  // Calculate dynamic wallet balance based on income, expenses, and sub-wallets
  static calculateWalletBalance(walletType: 'saving' | 'needs' | 'wants'): number {
    try {
      const incomeData = JSON.parse(localStorage.getItem('incomeData') || '[]') as IncomeData[];
      const expenseData = JSON.parse(localStorage.getItem('expenseData') || '[]') as ExpenseData[];
      const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]') as SubWallet[];
      const distribution = this.getCurrentDistribution();
      
      // Calculate total income allocated to this wallet type
      const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
      let totalIncomeAllocation = 0;
      
      if (walletType === 'saving') totalIncomeAllocation = (totalIncome * distribution.saving) / 100;
      else if (walletType === 'needs') totalIncomeAllocation = (totalIncome * distribution.needs) / 100;
      else if (walletType === 'wants') totalIncomeAllocation = (totalIncome * distribution.wants) / 100;

      // Calculate total sub-wallet balances for this wallet type
      const subWalletBalances = currentSubWallets
        .filter((sw: SubWallet) => sw.parentWalletType === walletType)
        .reduce((sum: number, sw: SubWallet) => sum + sw.balance, 0);

      // Calculate direct expenses from this wallet type
      const currentWallets = JSON.parse(localStorage.getItem('wallets') || '[]') as Wallet[];
      const targetWallet = currentWallets.find(w => w.type === walletType);
      
      const directWalletExpenses = expenseData.reduce((sum, expense) => {
        const mainWalletDeductions = expense.deductions
          .filter(d => d.type === 'wallet' && targetWallet && d.id === targetWallet.id)
          .reduce((total, d) => total + d.amount, 0);
        return sum + mainWalletDeductions;
      }, 0);

      // Calculate unallocated percentage (money that stays in main wallet)
      let unallocatedPercentage = 100;
      if (walletType === 'saving') {
        unallocatedPercentage = 100 - DEFAULT_SUBWALLET_STRUCTURE.saving.reduce((sum, sw) => sum + sw.percentage, 0);
      } else if (walletType === 'needs') {
        unallocatedPercentage = 100 - DEFAULT_SUBWALLET_STRUCTURE.needs.reduce((sum, sw) => sum + sw.percentage, 0);
      }

      // Calculate unallocated balance (portion that stays in main wallet)
      const unallocatedBalance = (totalIncomeAllocation * unallocatedPercentage) / 100;

      // Final balance = sub-wallets + unallocated - direct expenses
      const finalBalance = subWalletBalances + Math.max(0, unallocatedBalance - directWalletExpenses);
      
      console.log(`${walletType} wallet calculation:`, {
        totalIncome,
        totalIncomeAllocation,
        subWalletBalances,
        directWalletExpenses,
        unallocatedBalance,
        finalBalance
      });
      
      return Math.max(0, finalBalance);
    } catch (error) {
      console.error(`Error calculating ${walletType} wallet balance:`, error);
      return 0;
    }
  }

  // Process expense with priority order deduction
  static processExpense(
    expenseAmount: number, 
    selectedQueue: { type: 'subwallet' | 'wallet', id: number }[]
  ): {
    deductions: { type: 'subwallet' | 'wallet', id: number, amount: number, name: string }[],
    remainingExpense: number,
    success: boolean
  } {
    const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]');
    const currentWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    
    let remainingExpense = expenseAmount;
    const deductions: { type: 'subwallet' | 'wallet', id: number, amount: number, name: string }[] = [];

    // Process in the exact order selected by user
    for (const selection of selectedQueue) {
      if (remainingExpense <= 0) break;

      if (selection.type === 'subwallet') {
        const subWallet = currentSubWallets.find((sw: SubWallet) => sw.id === selection.id);
        if (subWallet && subWallet.balance > 0) {
          const deductionAmount = Math.min(subWallet.balance, remainingExpense);
          if (deductionAmount > 0) {
            deductions.push({
              type: 'subwallet',
              id: subWallet.id,
              amount: deductionAmount,
              name: subWallet.name
            });
            remainingExpense -= deductionAmount;
          }
        }
      } else if (selection.type === 'wallet') {
        const wallet = currentWallets.find((w: Wallet) => w.id === selection.id);
        if (wallet) {
          // Calculate available balance (total - allocated to sub-wallets)
          const allocatedToSubWallets = currentSubWallets
            .filter((sw: SubWallet) => sw.parentWalletType === wallet.type)
            .reduce((sum: number, sw: SubWallet) => sum + sw.balance, 0);
          
          const availableBalance = Math.max(0, this.calculateWalletBalance(wallet.type) - allocatedToSubWallets);
          const deductionAmount = Math.min(availableBalance, remainingExpense);
          
          if (deductionAmount > 0) {
            deductions.push({
              type: 'wallet',
              id: wallet.id,
              amount: deductionAmount,
              name: wallet.name
            });
            remainingExpense -= deductionAmount;
          }
        }
      }
    }

    return {
      deductions,
      remainingExpense,
      success: remainingExpense === 0
    };
  }

  // Apply expense deductions to actual balances
  static applyExpenseDeductions(deductions: { type: 'subwallet' | 'wallet', id: number, amount: number }[]): void {
    const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]');
    
    // Update sub-wallet balances
    const updatedSubWallets = currentSubWallets.map((sw: SubWallet) => {
      const deduction = deductions.find(d => d.type === 'subwallet' && d.id === sw.id);
      if (deduction) {
        return { ...sw, balance: Math.max(0, sw.balance - deduction.amount) };
      }
      return sw;
    });

    localStorage.setItem('subWallets', JSON.stringify(updatedSubWallets));
  }

  // Apply income updates to balances
  static applyIncomeUpdates(subWalletUpdates: { id: number, amount: number }[]): void {
    const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]');
    
    const updatedSubWallets = currentSubWallets.map((sw: SubWallet) => {
      const update = subWalletUpdates.find(u => u.id === sw.id);
      if (update) {
        return { ...sw, balance: sw.balance + update.amount };
      }
      return sw;
    });

    localStorage.setItem('subWallets', JSON.stringify(updatedSubWallets));
  }

  // Transfer funds between wallets and sub-wallets
  static transferFunds(fromId: number, fromType: 'wallet' | 'subwallet', toId: number, toType: 'wallet' | 'subwallet', amount: number): boolean {
    try {
      const currentSubWallets = JSON.parse(localStorage.getItem('subWallets') || '[]');
      
      // Update sub-wallets
      const updatedSubWallets = currentSubWallets.map((sw: SubWallet) => {
        if (fromType === 'subwallet' && sw.id === fromId) {
          return { ...sw, balance: Math.max(0, sw.balance - amount) };
        }
        if (toType === 'subwallet' && sw.id === toId) {
          return { ...sw, balance: sw.balance + amount };
        }
        return sw;
      });

      localStorage.setItem('subWallets', JSON.stringify(updatedSubWallets));
      
      // Trigger wallet data refresh
      window.dispatchEvent(new Event('walletDataChanged'));
      
      return true;
    } catch (error) {
      console.error('Transfer failed:', error);
      return false;
    }
  }
}
