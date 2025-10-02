
import React from 'react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const isPositive = netBalance >= 0;
  const formattedBalance = `₹${Math.trunc(Math.abs(netBalance)).toLocaleString('en-IN')}`;

  return (
    <div className="bg-card py-16 px-12 rounded-xl shadow-lg border border-border mb-8 animate-fade-in">
      <div className="text-center">
        <p className="text-2xl text-muted-foreground mb-6">Total Balance</p>
        <p className={`text-8xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {netBalance < 0 && '-'}{formattedBalance}
        </p>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;
