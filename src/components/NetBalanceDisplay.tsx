import React from 'react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const isPositive = netBalance >= 0;
  const abs = Math.abs(netBalance);
  const whole = Math.trunc(abs);
  const paise = Math.round((abs - whole) * 100);

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-md py-10 sm:py-14 px-6 sm:px-12 rounded-2xl shadow-sm border border-border/80 mb-8 transition-colors">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Total Balance
        </p>
        <p className={`text-5xl sm:text-7xl lg:text-8xl font-bold tabular-nums tracking-tight ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {netBalance < 0 && '-'}₹{whole.toLocaleString('en-IN')}
          {paise > 0 && (
            <span className="text-2xl sm:text-3xl font-semibold align-baseline opacity-75">
              .{String(paise).padStart(2, '0')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;
