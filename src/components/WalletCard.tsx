
import React from 'react';
import { Wallet as WalletIcon, TrendingUp, ShoppingCart, Heart } from 'lucide-react';
import { Wallet, SubWallet } from '@/types/finance';

interface WalletCardProps {
  wallet: Wallet;
  subWallets?: SubWallet[];
  showSubWallets?: boolean;
  distributionPercentage?: number;
}

const WalletCard: React.FC<WalletCardProps> = ({ 
  wallet, 
  subWallets = [], 
  showSubWallets = false,
  distributionPercentage 
}) => {
  const getIcon = () => {
    switch (wallet.type) {
      case 'saving':
        return <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'needs':
        return <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'wants':
        return <Heart className="h-5 w-5 sm:h-6 sm:w-6" />;
      default:
        return <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
  };

  const getColorClasses = () => {
    switch (wallet.color) {
      case 'green':
        return 'border-green-200 bg-green-50/50';
      case 'blue':
        return 'border-blue-200 bg-blue-50/50';
      case 'purple':
        return 'border-purple-200 bg-purple-50/50';
      default:
        return 'border-border bg-card';
    }
  };

  const getIconColor = () => {
    switch (wallet.color) {
      case 'green':
        return 'text-green-600';
      case 'blue':
        return 'text-blue-600';
      case 'purple':
        return 'text-purple-600';
      default:
        return 'text-foreground';
    }
  };

  const getPercentageColor = () => {
    switch (wallet.color) {
      case 'green':
        return 'text-green-600 bg-green-100';
      case 'blue':
        return 'text-blue-600 bg-blue-100';
      case 'purple':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const walletSubWallets = subWallets.filter(sw => sw.parentWalletType === wallet.type);
  const allocatedToSubWallets = walletSubWallets.reduce((sum, sw) => sum + sw.balance, 0);
  const availableBalance = wallet.balance - allocatedToSubWallets;

  return (
    <div className={`relative rounded-xl border-2 ${getColorClasses()} p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      {/* Distribution Percentage Badge - Mobile optimized */}
      {distributionPercentage && (
        <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-2 py-1 rounded-full text-xs font-bold ${getPercentageColor()}`}>
          {distributionPercentage}%
        </div>
      )}

      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={getIconColor()}>
            {getIcon()}
          </div>
          <span className="font-medium text-foreground text-sm sm:text-base">{wallet.name}</span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Total Balance</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground">
          ₹{wallet.balance.toLocaleString('en-IN')}
        </p>
        
        {showSubWallets && walletSubWallets.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
            <div className="flex justify-between text-xs text-muted-foreground mb-1 sm:mb-2">
              <span>Available</span>
              <span>Sub-wallets</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-medium">₹{Math.max(0, availableBalance).toLocaleString('en-IN')}</span>
              <span className="font-medium">₹{allocatedToSubWallets.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {walletSubWallets.length} sub-wallet{walletSubWallets.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletCard;
