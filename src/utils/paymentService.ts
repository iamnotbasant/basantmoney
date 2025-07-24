import { UdaarEntry, PaymentHistory } from '@/types/finance';

export class PaymentService {
  static calculatePersonBalance(entries: UdaarEntry[]): {
    totalGiven: number;
    totalReceived: number;
    netBalance: number;
    pendingReceivable: number;
    pendingPayable: number;
  } {
    const pendingEntries = entries.filter(e => e.status === 'pending' || e.status === 'partially_paid');
    
    const totalGiven = entries.filter(e => e.type === 'gave').reduce((sum, e) => sum + (e.originalAmount || e.amount), 0);
    const totalReceived = entries.filter(e => e.type === 'took').reduce((sum, e) => sum + (e.originalAmount || e.amount), 0);
    
    const pendingReceivable = pendingEntries.filter(e => e.type === 'gave').reduce((sum, e) => sum + e.amount, 0);
    const pendingPayable = pendingEntries.filter(e => e.type === 'took').reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalGiven,
      totalReceived,
      netBalance: totalGiven - totalReceived,
      pendingReceivable,
      pendingPayable,
    };
  }

  static processPartialPayment(
    transaction: UdaarEntry,
    partialAmount: number,
    description: string
  ): { updatedTransaction: UdaarEntry; historyEntry: PaymentHistory } {
    const remainingAmount = transaction.amount - partialAmount;
    
    const updatedTransaction: UdaarEntry = {
      ...transaction,
      amount: remainingAmount,
      originalAmount: transaction.originalAmount || transaction.amount,
      status: remainingAmount <= 0 ? 'paid' : 'partially_paid',
    };

    const historyEntry: PaymentHistory = {
      id: crypto.randomUUID(),
      transactionId: transaction.id,
      personName: transaction.personName,
      action: 'partial_payment',
      description: `Partial payment received: ${description || 'No description'}`,
      amount: partialAmount,
      date: new Date().toISOString(),
      details: {
        originalAmount: transaction.originalAmount || transaction.amount,
        paidAmount: partialAmount,
        remainingAmount: remainingAmount,
      },
    };

    return { updatedTransaction, historyEntry };
  }

  static createHistoryEntry(
    transactionId: string,
    personName: string,
    action: PaymentHistory['action'],
    description: string,
    amount?: number,
    details?: any
  ): PaymentHistory {
    return {
      id: crypto.randomUUID(),
      transactionId,
      personName,
      action,
      description,
      amount,
      date: new Date().toISOString(),
      details,
    };
  }

  static getPersonHistory(personName: string, allHistory: PaymentHistory[]): PaymentHistory[] {
    return allHistory.filter(h => h.personName === personName);
  }

  static settlePerson(personEntries: UdaarEntry[]): {
    settledEntries: UdaarEntry[];
    historyEntries: PaymentHistory[];
  } {
    const balance = this.calculatePersonBalance(personEntries);
    const settledEntries: UdaarEntry[] = [];
    const historyEntries: PaymentHistory[] = [];

    // Mark all pending entries as paid
    personEntries.forEach(entry => {
      if (entry.status === 'pending' || entry.status === 'partially_paid') {
        const settledEntry: UdaarEntry = {
          ...entry,
          status: 'paid',
        };
        settledEntries.push(settledEntry);

        const historyEntry = this.createHistoryEntry(
          entry.id,
          entry.personName,
          'settled',
          `Transaction settled as part of full settlement`,
          entry.amount,
          { settledAmount: entry.amount, balanceAtSettlement: balance.netBalance }
        );
        historyEntries.push(historyEntry);
      } else {
        settledEntries.push(entry);
      }
    });

    return { settledEntries, historyEntries };
  }
}