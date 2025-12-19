import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import WalletCard from '@/components/WalletCard';
import SubWalletManager from '@/components/SubWalletManager';
import TransferFunds from '@/components/TransferFunds';
import { Wallet } from '@/types/finance';
import { useWalletData } from '@/hooks/useWalletData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

const Wallets = () => {
  const navigate = useNavigate();
  const { bankAccounts } = useBankAccounts();
  const primaryAccount = bankAccounts.find(acc => acc.is_primary);
  
  const { wallets: supabaseWallets, subWallets, loading, refetch } = useWalletData(primaryAccount?.id);

  // Get user settings for distribution percentages
  const getSettings = () => {
    try {
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return {
      distribution: { saving: 50, needs: 30, wants: 20 },
      defaultWallet: 'saving',
      currency: '₹',
      appTheme: 'system'
    };
  };

  const settings = getSettings();

  // Convert Supabase wallets to local format with calculated balances
  const wallets: Wallet[] = supabaseWallets.map(w => {
    // Calculate balance from sub-wallets
    const relatedSubWallets = subWallets.filter(sw => sw.parent_wallet_type === w.type);
    const totalSubWalletBalance = relatedSubWallets.reduce((sum, sw) => sum + (sw.balance || 0), 0);
    
    return {
      id: w.id,
      name: w.name,
      balance: totalSubWalletBalance,
      type: w.type as 'saving' | 'needs' | 'wants',
      color: w.color,
    };
  });

  const getWalletPercentage = (walletType: 'saving' | 'needs' | 'wants') => {
    return settings.distribution[walletType];
  };

  const handleUpdate = () => {
    refetch();
    window.dispatchEvent(new CustomEvent('walletDataChanged'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading wallets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Sub Header - Mobile optimized */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="mr-2 sm:mr-4 mobile-button"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">Wallets</h1>
            </div>
            <TransferFunds wallets={wallets} onUpdate={handleUpdate} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Main Wallets Section - Mobile optimized */}
        <section>
          <div className="flex items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Main Wallets</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {wallets.map((wallet) => (
              <WalletCard 
                key={wallet.id} 
                wallet={wallet} 
                distributionPercentage={getWalletPercentage(wallet.type)}
              />
            ))}
          </div>
        </section>

        {/* Sub-Wallets Section - Mobile optimized */}
        <section>
          <SubWalletManager wallets={wallets} onUpdate={handleUpdate} />
        </section>
      </main>
    </div>
  );
};

export default Wallets;
