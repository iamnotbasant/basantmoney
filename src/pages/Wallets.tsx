
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import WalletCard from '@/components/WalletCard';
import SubWalletManager from '@/components/SubWalletManager';
import TransferFunds from '@/components/TransferFunds';
import { Wallet } from '@/types/finance';
import { WalletService } from '@/utils/walletService';

interface UserSettings {
  distribution: {
    saving: number;
    needs: number;
    wants: number;
  };
  defaultWallet: 'saving' | 'needs' | 'wants';
  currency: string;
  appTheme: 'light' | 'dark' | 'system';
}

const Wallets = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    distribution: { saving: 50, needs: 30, wants: 20 },
    defaultWallet: 'saving',
    currency: '₹',
    appTheme: 'system'
  });

  const loadWallets = () => {
    console.log('Loading wallet data...');
    try {
      const storedWallets = localStorage.getItem('wallets');
      if (storedWallets) {
        const walletData = JSON.parse(storedWallets);
        const dynamicWallets = walletData.map((wallet: Wallet) => {
          const calculatedBalance = WalletService.calculateWalletBalance(wallet.type);
          console.log(`${wallet.name} calculated balance:`, calculatedBalance);
          return {
            ...wallet,
            balance: calculatedBalance
          };
        });
        setWallets(dynamicWallets);
        console.log('Updated wallets:', dynamicWallets);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      // Ensure wallet system is initialized
      WalletService.ensureInitialized();
      setWallets([]);
    }
  };

  const loadSettings = () => {
    try {
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    loadWallets();
    loadSettings();
    
    // Add event listener for storage changes to refresh wallet data
    const handleStorageChange = () => {
      console.log('Storage changed, refreshing wallet data...');
      loadWallets();
      loadSettings();
    };

    // Listen for custom events when transactions are made
    window.addEventListener('walletDataChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('walletDataChanged', handleStorageChange);
    };
  }, []);

  const getWalletPercentage = (walletType: 'saving' | 'needs' | 'wants') => {
    return settings.distribution[walletType];
  };

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
            <TransferFunds wallets={wallets} onUpdate={loadWallets} />
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
          <SubWalletManager wallets={wallets} onUpdate={loadWallets} />
        </section>
      </main>
    </div>
  );
};

export default Wallets;
