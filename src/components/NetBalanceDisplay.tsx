import React from 'react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const isPositive = netBalance >= 0;
  const abs = Math.abs(netBalance);
  let whole = Math.trunc(abs);
  let paise = Math.round((abs - whole) * 100);
  if (paise >= 100) {
    whole += 1;
    paise = 0;
  }

  return (
    <div className="relative bg-card py-10 sm:py-14 px-6 sm:px-12 rounded-2xl shadow-sm border border-border/80 transition-colors">
      <div className="text-center">
        <p className="text-2xl text-muted-foreground mb-4">Total Balance</p>
        <p className={`text-6xl sm:text-8xl font-extrabold ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {netBalance < 0 && '-'}₹{whole.toLocaleString('en-IN')}
          {paise > 0 && (
            <span className="text-3xl font-semibold align-baseline opacity-80">
              .{String(paise).padStart(2, '0')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;
