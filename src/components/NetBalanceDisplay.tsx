
import React from 'react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const isPositive = netBalance >= 0;
  const formattedBalance = `₹${Math.abs(netBalance).toLocaleString('en-IN')}`;

  return (
    <div className="bg-card p-10 rounded-xl shadow-lg border border-border mb-8 animate-fade-in">
      <div className="text-center">
        <p className="text-xl text-muted-foreground mb-3">Total Balance</p>
        <p className={`text-7xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {netBalance < 0 && '-'}{formattedBalance}
        </p>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;
