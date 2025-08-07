import React from 'react';
import { Check, Plus, ChevronsUpDown, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BankAccount } from '@/types/bank';

interface BankAccountSwitcherProps {
  bankAccounts: BankAccount[];
  currentAccount: BankAccount | null;
  onAccountSelect: (account: BankAccount) => void;
  onAddAccount: () => void;
}

const BankAccountSwitcher = ({
  bankAccounts,
  currentAccount,
  onAccountSelect,
  onAddAccount,
}: BankAccountSwitcherProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="min-w-[200px] justify-between bg-background/80 backdrop-blur-sm border-border/50"
        >
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {currentAccount?.name || 'Select account'}
              </span>
              {currentAccount && (
                <span className="text-xs text-muted-foreground">
                  {currentAccount.bank_name}
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] bg-background/95 backdrop-blur-md border-border/50">
        {bankAccounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onSelect={() => onAccountSelect(account)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">{account.name}</span>
                <span className="text-sm text-muted-foreground">{account.bank_name}</span>
                <span className="text-sm font-mono text-primary">
                  ₹{account.balance.toLocaleString()}
                </span>
              </div>
            </div>
            <Check
              className={cn(
                "h-4 w-4",
                currentAccount?.id === account.id ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAddAccount} className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/50">
          <Plus className="h-4 w-4" />
          <span>Add Bank Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BankAccountSwitcher;