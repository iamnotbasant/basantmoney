import React from 'react';

interface VaultInterestCardsProps {
  incomeData?: any[];
}

/**
 * VaultInterestCards:
 * Intrusive popup banners have been removed from the main Vault screen per user request.
 * All interest calculations and reconciliations run automatically and silently in the background.
 * Full interest settings and logs remain accessible under Settings > Savings Interest System.
 */
export const VaultInterestCards: React.FC<VaultInterestCardsProps> = () => {
  return null;
};

export default VaultInterestCards;
