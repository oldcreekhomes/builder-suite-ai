
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";

interface AccountSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  accountType?: 'expense' | 'asset' | 'liability' | 'equity' | 'revenue';
  bankAccountsOnly?: boolean;
}

export const AccountSearchInput = ({ 
  value, 
  onChange, 
  placeholder = "Search accounts...",
  className,
  accountType,
  bankAccountsOnly = false
}: AccountSearchInputProps) => {
  const [open, setOpen] = useState(false);
  const { accounts } = useAccounts();

  const filteredAccounts = accounts.filter(account => {
    if (accountType && account.type !== accountType) return false;
    
    // If bankAccountsOnly is true, filter to show only actual bank accounts
    if (bankAccountsOnly) {
      // Filter for accounts that are likely bank accounts (checking, savings, etc.)
      // This includes accounts with codes like 1010, 1030, or names containing "bank", "checking", "savings", "clearing"
      const isBankAccount = 
        account.code === '1010' || 
        account.code === '1030' ||
        account.name.toLowerCase().includes('bank') ||
        account.name.toLowerCase().includes('checking') ||
        account.name.toLowerCase().includes('savings') ||
        account.name.toLowerCase().includes('clearing');
      
      return isBankAccount;
    }
    
    return true;
  });

  const selectedAccount = accounts.find(account => account.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between cursor-pointer", className)}
        >
          {selectedAccount ? (
            <span className="truncate">
              {selectedAccount.code} {selectedAccount.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-50 bg-popover">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup>
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  className="cursor-pointer"
                  onSelect={() => {
                    onChange(account.id);
                    setOpen(false);
                  }}
                  onClick={() => {
                    onChange(account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{account.code} {account.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
