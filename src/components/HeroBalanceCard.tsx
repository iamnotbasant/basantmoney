import React from 'react';
import { Eye, EyeOff, ArrowDownRight, ArrowUpRight, BookOpen, Landmark } from 'lucide-react';
import { BankAccount } from '@/types/bank';
import { formatINRParts } from '@/utils/format';

interface HeroBalanceCardProps {
  netBalance: number;
  currentAccount: BankAccount | null;
  totalAccountsCount?: number;
  hidden: boolean;
  onToggleHidden: () => void;
  onNavigate: (path: string) => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  netBalance,
  currentAccount,
  totalAccountsCount = 1,
  hidden,
  onToggleHidden,
  onNavigate,
}) => {
  const isPositive = netBalance >= 0;
  const { isNegative, whole, paise } = formatINRParts(netBalance);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 sm:p-8 shadow-[var(--elev-3)] dark:from-slate-950 dark:via-slate-900 dark:to-black border border-white/10">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl"
      />

      {/* Top row: Bank pill + Privacy toggle */}
      <div className="relative flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md">
          <Landmark className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-medium tracking-tight">
            {currentAccount?.bank_name || currentAccount?.name || 'Primary Bank'}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300 capitalize">
            {currentAccount?.account_type || 'Savings'}
          </span>
          {currentAccount?.is_primary && (
            <span className="ml-0.5 rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[10px] font-semibold tracking-wide text-emerald-300">
              PRIMARY
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleHidden}
          aria-pressed={hidden}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          className="p-2 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95"
          title={hidden ? 'Show balance' : 'Hide balance'}
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Balance label & amount */}
      <div className="relative mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
          All-time Net Balance
        </p>
        <div className="flex items-baseline gap-1">
          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tight transition-all duration-300 ${
              isPositive ? 'text-white' : 'text-rose-300'
            } ${hidden ? 'blur-md select-none pointer-events-none' : ''}`}
            aria-live="polite"
          >
            {isNegative ? '-' : ''}₹{whole}
            {paise ? (
              <span className="text-[0.55em] font-medium opacity-75">.{paise}</span>
            ) : null}
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Direct ledger · across {totalAccountsCount} connected account{totalAccountsCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="relative grid grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => onNavigate('/income')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2.5 text-xs font-medium text-emerald-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
          <span>Add Income</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/expense')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2.5 text-xs font-medium text-rose-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="p-1 rounded-full bg-rose-500/20 text-rose-300 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="h-3.5 w-3.5" />
          </div>
          <span>Add Expense</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/transactions')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 text-xs font-medium text-slate-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="p-1 rounded-full bg-white/10 text-slate-300 group-hover:scale-110 transition-transform">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <span>View Ledger</span>
        </button>
      </div>
    </div>
  );
};

export default HeroBalanceCard;
