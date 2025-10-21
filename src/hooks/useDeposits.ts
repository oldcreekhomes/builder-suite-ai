import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Interface for deposit line data
export interface DepositLineData {
  line_type: 'revenue' | 'customer_payment';
  account_id?: string;
  project_id?: string;
  cost_code_id?: string;
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

      const owner_id = userData?.home_builder_id || user.id;

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

      // Find Equity account (2905) for customer payments
      const { data: equityAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('owner_id', owner_id)
        .eq('code', '2905')
        .single();

      // Create journal entry lines
      // First line: DEBIT bank account (money coming in) - INCLUDE PROJECT_ID
      const bankLine = {
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: 1,
        account_id: depositData.bank_account_id,
        project_id: depositData.project_id || null,
        debit: depositData.amount,
        credit: 0,
        memo: depositData.memo || 'Deposit'
      };

      // Remaining lines: CREDIT source accounts (revenue/customer payments)
      const sourceLinesData = depositLines.map((line, index) => {
        let creditAccountId = line.account_id;
        let costCodeId = null;

        // For customer payments (Job Cost), use Equity account 2905
        if (line.line_type === 'customer_payment') {
          if (!equityAccount) {
            throw new Error('Equity account (2905) not found. Please add it in Chart of Accounts before making customer deposits.');
          }
          creditAccountId = equityAccount.id;
          costCodeId = line.cost_code_id || null;
        }

        return {
          journal_entry_id: journalEntry.id,
          owner_id,
          line_number: index + 2,
          account_id: creditAccountId!,
          project_id: line.project_id || null,
          cost_code_id: costCodeId,
          debit: 0,
          credit: line.amount,
          memo: line.memo || null
        };
      });

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
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
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

  const deleteDeposit = useMutation({
    mutationFn: async (depositId: string) => {
      const { data, error } = await supabase.rpc('delete_deposit_with_journal_entries', {
        deposit_id_param: depositId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      
      toast({
        title: "Success",
        description: "Deposit and all related entries have been deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting deposit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete deposit",
        variant: "destructive",
      });
    },
  });

  const updateDeposit = useMutation({
    mutationFn: async ({ 
      depositId, 
      updates 
    }: { 
      depositId: string; 
      updates: { deposit_date?: string; memo?: string; amount?: number } 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter out undefined values to only update provided fields
      const updateData: any = {};
      if (updates.deposit_date !== undefined) updateData.deposit_date = updates.deposit_date;
      if (updates.memo !== undefined) updateData.memo = updates.memo;
      if (updates.amount !== undefined) updateData.amount = updates.amount;

      // Update the deposit with provided fields
      const { error: depositError, data: depositData } = await supabase
        .from("deposits")
        .update(updateData)
        .eq("id", depositId)
        .select("bank_account_id")
        .single();

      if (depositError) throw depositError;

      // If amount changed, update journal entry lines
      if (updates.amount !== undefined) {
        // Find the journal entry for this deposit
        const { data: journalEntry } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("source_type", "deposit")
          .eq("source_id", depositId)
          .single();

        if (journalEntry) {
          // Get all lines for this journal entry
          const { data: lines } = await supabase
            .from("journal_entry_lines")
            .select("*")
            .eq("journal_entry_id", journalEntry.id)
            .order("line_number");

          if (lines && lines.length > 0) {
            const bankLine = lines.find(l => l.account_id === depositData.bank_account_id && l.debit > 0);
            const creditLine = lines.find(l => l.credit > 0);

            if (bankLine) {
              await supabase
                .from("journal_entry_lines")
                .update({ debit: updates.amount })
                .eq("id", bankLine.id);
            }

            if (creditLine) {
              await supabase
                .from("journal_entry_lines")
                .update({ credit: updates.amount })
                .eq("id", creditLine.id);
            }
          }
        }
      }

      // If date changed, update the journal entry date too
      if (updates.deposit_date !== undefined) {
        await supabase
          .from("journal_entries")
          .update({ entry_date: updates.deposit_date })
          .eq("source_type", "deposit")
          .eq("source_id", depositId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast({ title: "Deposit updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating deposit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { createDeposit, deleteDeposit, updateDeposit };
};
