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
    <div className="bg-card py-16 px-12 rounded-xl shadow-lg border border-border mb-8 animate-fade-in">
      <div className="text-center">
        <p className="text-2xl text-muted-foreground mb-6">Total Balance</p>
        <p className={`text-8xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
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
