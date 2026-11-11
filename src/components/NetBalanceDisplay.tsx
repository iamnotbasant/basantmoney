import React, { useState } from 'react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const [isBlurred, setIsBlurred] = useState(true);
  const isPositive = netBalance >= 0;
  const abs = Math.abs(netBalance);
  let whole = Math.trunc(abs);
  let paise = Math.round((abs - whole) * 100);
  if (paise >= 100) {
    whole += 1;
    paise = 0;
  }

  return (
    <div className="relative bg-card/90 backdrop-blur-sm py-10 sm:py-14 px-6 sm:px-12 rounded-2xl shadow-sm border border-border/80 transition-colors">
      <div className="text-center">
        <p className="text-2xl text-muted-foreground mb-4">Total Balance</p>
        <p
          onClick={() => setIsBlurred(prev => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsBlurred(prev => !prev);
            }
          }}
          title={isBlurred ? 'Click to show balance' : 'Click to hide balance'}
          className={`inline-block cursor-pointer select-none transition-all duration-300 text-6xl sm:text-8xl font-extrabold ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          } ${isBlurred ? 'blur-md sm:blur-lg' : 'blur-none'}`}
        >
          {netBalance < 0 && '-'}₹{whole.toLocaleString('en-IN')}
          {paise > 0 && (
            <span className="text-[0.5em] font-bold align-baseline">
              .{String(paise).padStart(2, '0')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;

