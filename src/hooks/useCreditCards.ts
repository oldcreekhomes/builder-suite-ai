import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreditCardLineData {
  line_type: 'expense' | 'job_cost';
  account_id?: string;
  cost_code_id?: string;
  project_id?: string;
  amount: number;
  memo?: string;
}

export interface CreditCardData {
  transaction_date: string;
  transaction_type: 'purchase' | 'refund';
  credit_card_account_id: string;
  vendor: string;
  project_id?: string;
  amount: number;
  memo?: string;
  lines: CreditCardLineData[];
}

export function useCreditCards() {
  const queryClient = useQueryClient();

  // Fetch all credit card transactions
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const { data: creditCardsData, error: creditCardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('is_reversal', false)
        .is('reversed_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (creditCardsError) throw creditCardsError;

      const { data: linesData, error: linesError } = await supabase
        .from('credit_card_lines')
        .select('*')
        .order('line_number');

      if (linesError) throw linesError;

      return creditCardsData.map(card => ({
        ...card,
        lines: linesData.filter(line => line.credit_card_id === card.id)
      }));
    },
  });

  // Create credit card transaction
  const createCreditCard = useMutation({
    mutationFn: async (data: CreditCardData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const ownerId = user.id;

      // Fetch WIP account for job cost lines
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (settingsError) throw settingsError;
      if (!settings?.wip_account_id) {
        throw new Error("WIP account not configured. Please set it in Settings > Accounting.");
      }

      // Validate lines
      if (!data.lines || data.lines.length === 0) {
        throw new Error("At least one line item is required");
      }

      // Calculate total
      const total = data.lines.reduce((sum, line) => sum + Number(line.amount), 0);

      // Insert credit card record
      const { data: creditCard, error: creditCardError } = await supabase
        .from('credit_cards')
        .insert({
          owner_id: ownerId,
          created_by: user.id,
          transaction_date: data.transaction_date,
          transaction_type: data.transaction_type,
          credit_card_account_id: data.credit_card_account_id,
          vendor: data.vendor,
          project_id: data.project_id,
          amount: total,
          memo: data.memo,
        })
        .select()
        .single();

      if (creditCardError) throw creditCardError;

      // Insert credit card lines
      const linesToInsert = data.lines.map((line, index) => ({
        credit_card_id: creditCard.id,
        owner_id: ownerId,
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.account_id,
        cost_code_id: line.cost_code_id,
        project_id: line.project_id,
        amount: line.amount,
        memo: line.memo,
      }));

      const { error: linesError } = await supabase
        .from('credit_card_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          owner_id: ownerId,
          source_type: 'credit_card',
          source_id: creditCard.id,
          entry_date: data.transaction_date,
          description: `${data.transaction_type === 'purchase' ? 'Purchase' : 'Refund'} - ${data.vendor}`,
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      const journalLines = [];
      let lineNumber = 1;

      if (data.transaction_type === 'purchase') {
        // For purchase: DEBIT expenses/WIP, CREDIT credit card
        for (const line of data.lines) {
          const debitAccountId = line.line_type === 'job_cost' 
            ? settings.wip_account_id 
            : line.account_id;
          
          if (line.line_type === 'expense' && !line.account_id) {
            throw new Error("Select an account for each expense line.");
          }

          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id: ownerId,
            line_number: lineNumber++,
            account_id: debitAccountId,
            debit: line.amount,
            credit: 0,
            project_id: line.project_id,
            cost_code_id: line.cost_code_id,
            memo: line.memo,
          });
        }

        // Credit the credit card account (no project_id - it's a company-wide liability)
        journalLines.push({
          journal_entry_id: journalEntry.id,
          owner_id: ownerId,
          line_number: lineNumber,
          account_id: data.credit_card_account_id,
          debit: 0,
          credit: total,
          memo: data.memo,
        });
      } else {
        // For refund: DEBIT credit card, CREDIT expenses/WIP (no project_id - it's a company-wide liability)
        journalLines.push({
          journal_entry_id: journalEntry.id,
          owner_id: ownerId,
          line_number: lineNumber++,
          account_id: data.credit_card_account_id,
          debit: total,
          credit: 0,
          memo: data.memo,
        });

        for (const line of data.lines) {
          const creditAccountId = line.line_type === 'job_cost' 
            ? settings.wip_account_id 
            : line.account_id;
          
          if (line.line_type === 'expense' && !line.account_id) {
            throw new Error("Select an account for each expense line.");
          }

          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id: ownerId,
            line_number: lineNumber++,
            account_id: creditAccountId,
            debit: 0,
            credit: line.amount,
            project_id: line.project_id,
            cost_code_id: line.cost_code_id,
            memo: line.memo,
          });
        }
      }

      const { error: jelError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (jelError) throw jelError;

      return creditCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success("Credit card transaction created successfully");
    },
    onError: (error: Error) => {
      let errorMessage = error.message || "Failed to create credit card transaction";
      
      if (error.message?.includes('null value in column "account_id"')) {
        errorMessage = "Could not save: a journal line was missing an account. For Job Cost, we automatically use your WIP account. Please check Settings > Accounting.";
      }
      
      toast.error(errorMessage);
    },
  });

  // Delete credit card transaction
  const deleteCreditCard = useMutation({
    mutationFn: async (creditCardId: string) => {
      const { error } = await supabase.rpc('delete_credit_card_with_journal_entries', {
        credit_card_id_param: creditCardId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success("Credit card transaction deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete credit card transaction");
    },
  });

  const correctCreditCard = useMutation({
    mutationFn: async ({ 
      creditCardId, 
      correctedCreditCardData,
      correctionReason 
    }: { 
      creditCardId: string; 
      correctedCreditCardData: CreditCardData;
      correctionReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Step 1: Get original credit card transaction
      const { data: originalCC } = await supabase
        .from('credit_cards')
        .select('*, credit_card_lines (*)')
        .eq('id', creditCardId)
        .single();

      if (!originalCC) throw new Error("Credit card transaction not found");

      // Step 2: Get original journal entries
      const { data: originalJournalEntries } = await supabase
        .from('journal_entries')
        .select('*, journal_entry_lines (*)')
        .eq('source_type', 'credit_card')
        .eq('source_id', creditCardId);

      // Step 3: Mark original as reversed
      await supabase
        .from('credit_cards')
        .update({ 
          status: 'reversed',
          reversed_at: new Date().toISOString()
        })
        .eq('id', creditCardId);

      // Step 4: Create reversing credit card transaction
      const { data: reversingCC } = await supabase
        .from('credit_cards')
        .insert({
          owner_id: originalCC.owner_id,
          created_by: user.id,
          transaction_date: originalCC.transaction_date,
          transaction_type: originalCC.transaction_type,
          credit_card_account_id: originalCC.credit_card_account_id,
          vendor: originalCC.vendor,
          project_id: originalCC.project_id,
          amount: originalCC.amount,
          memo: `REVERSAL: ${originalCC.memo || ''}`,
          status: 'posted',
          is_reversal: true,
          reverses_id: creditCardId
        })
        .select()
        .single();

      // Step 5: Create reversing credit card lines
      const reversingCCLines = originalCC.credit_card_lines.map((line: any, index: number) => ({
        credit_card_id: reversingCC.id,
        owner_id: originalCC.owner_id,
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.account_id,
        cost_code_id: line.cost_code_id,
        project_id: line.project_id,
        amount: line.amount,
        memo: `REVERSAL: ${line.memo || ''}`,
        is_reversal: true,
        reverses_line_id: line.id
      }));

      await supabase.from('credit_card_lines').insert(reversingCCLines);

      // Step 6: Create reversing journal entries (flip debits/credits)
      if (originalJournalEntries && originalJournalEntries.length > 0) {
        for (const originalJE of originalJournalEntries) {
          const { data: reversingJE } = await supabase
            .from('journal_entries')
            .insert({
              owner_id: originalCC.owner_id,
              source_type: 'credit_card',
              source_id: reversingCC.id,
              entry_date: originalJE.entry_date,
              description: `REVERSAL: ${originalJE.description}`,
              is_reversal: true,
              reverses_id: originalJE.id
            })
            .select()
            .single();

          const reversingJELines = originalJE.journal_entry_lines.map((line: any, index: number) => ({
            journal_entry_id: reversingJE!.id,
            owner_id: originalCC.owner_id,
            line_number: index + 1,
            account_id: line.account_id,
            debit: line.credit,
            credit: line.debit,
            project_id: line.project_id,
            cost_code_id: line.cost_code_id,
            memo: `REVERSAL: ${line.memo || ''}`,
            is_reversal: true,
            reverses_line_id: line.id
          }));

          await supabase.from('journal_entry_lines').insert(reversingJELines);
          await supabase.from('journal_entries').update({ reversed_by_id: reversingJE!.id, reversed_at: new Date().toISOString() }).eq('id', originalJE.id);
        }
      }

      // Step 7: Link original to reversing
      await supabase.from('credit_cards').update({ reversed_by_id: reversingCC.id }).eq('id', creditCardId);

      // Step 8: Create corrected credit card transaction
      const result = await createCreditCard.mutateAsync({
        ...correctedCreditCardData,
        memo: correctionReason ? `${correctedCreditCardData.memo || ''} (Corrected: ${correctionReason})` : correctedCreditCardData.memo
      });

      return { originalCC, reversingCC, correctedCC: result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success("Credit card transaction corrected with complete audit trail");
    },
    onError: (error: Error) => {
      console.error('Error correcting credit card:', error);
      toast.error(error.message || "Failed to correct credit card transaction");
    },
  });

  return {
    creditCards,
    isLoading,
    createCreditCard,
    deleteCreditCard,
    correctCreditCard,
  };
}
