import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Interface for deposit line data
export interface DepositLineData {
  line_type: 'revenue' | 'customer_payment';
  account_id?: string;
  project_id?: string;
  amount: number;
  memo?: string;
}

// Interface for deposit data
export interface DepositData {
  deposit_date: string;
  bank_account_id: string;
  project_id?: string;
  amount: number;
  memo?: string;
  deposit_source_id?: string;
  company_name?: string;
  company_address?: string;
  company_city_state?: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
}

export const useDeposits = () => {
  const queryClient = useQueryClient();

  const createDeposit = useMutation({
    mutationFn: async ({ 
      depositData, 
      depositLines 
    }: { 
      depositData: DepositData; 
      depositLines: DepositLineData[];
    }) => {
      console.log('Creating deposit:', depositData);
      console.log('Deposit lines:', depositLines);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Determine owner_id (home builder or self)
      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'employee' && userData?.home_builder_id 
        ? userData.home_builder_id 
        : user.id;

      // Insert deposit record
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert({
          owner_id,
          created_by: user.id,
          deposit_date: depositData.deposit_date,
          bank_account_id: depositData.bank_account_id,
          project_id: depositData.project_id || null,
          amount: depositData.amount,
          memo: depositData.memo || null,
          deposit_source_id: depositData.deposit_source_id || null,
          company_name: depositData.company_name,
          company_address: depositData.company_address,
          company_city_state: depositData.company_city_state,
          bank_name: depositData.bank_name,
          routing_number: depositData.routing_number,
          account_number: depositData.account_number,
          status: 'posted'
        })
        .select()
        .single();

      if (depositError) throw depositError;
      if (!deposit) throw new Error("Failed to create deposit");

      // Insert deposit lines
      const depositLinesData = depositLines.map((line, index) => ({
        deposit_id: deposit.id,
        owner_id,
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.account_id || null,
        project_id: line.project_id || null,
        amount: line.amount,
        memo: line.memo || null
      }));

      const { error: linesError } = await supabase
        .from('deposit_lines')
        .insert(depositLinesData);

      if (linesError) throw linesError;

      // Create journal entry for the deposit
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          owner_id,
          source_type: 'deposit',
          source_id: deposit.id,
          entry_date: depositData.deposit_date,
          description: `Deposit to ${depositData.bank_name || 'Bank'}`,
          posted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (journalError) throw journalError;
      if (!journalEntry) throw new Error("Failed to create journal entry");

      // Create journal entry lines
      // First line: DEBIT bank account (money coming in)
      const bankLine = {
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: 1,
        account_id: depositData.bank_account_id,
        debit: depositData.amount,
        credit: 0,
        memo: depositData.memo || 'Deposit'
      };

      // Remaining lines: CREDIT source accounts (revenue/customer payments)
      const sourceLinesData = depositLines.map((line, index) => ({
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: index + 2,
        account_id: line.account_id!,
        project_id: line.project_id || null,
        debit: 0,
        credit: line.amount,
        memo: line.memo || null
      }));

      const allJournalLines = [bankLine, ...sourceLinesData];

      const { error: journalLinesError } = await supabase
        .from('journal_entry_lines')
        .insert(allJournalLines);

      if (journalLinesError) throw journalLinesError;

      return deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({
        title: "Success",
        description: "Deposit recorded successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating deposit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create deposit",
        variant: "destructive",
      });
    },
  });

  return { createDeposit };
};
