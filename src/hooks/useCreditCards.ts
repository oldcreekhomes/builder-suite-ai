import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreditCardLineData {
  line_type: 'expense' | 'job_cost';
  account_id?: string;
  cost_code_id?: string;
  project_id?: string;
  amount: number;
  memo?: string;
  lot_id?: string;
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
  reconciled?: boolean;
  reconciliation_id?: string;
  reconciliation_date?: string;
}

export function useCreditCards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        .select(`
          *,
          project_lots:lot_id (id, lot_name, lot_number),
          cost_codes:cost_code_id (id, code, name),
          accounts:account_id (id, code, name)
        `)
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

      // CRITICAL: Validate that header amount matches line totals (if amount provided separately)
      if (data.amount !== undefined && Math.abs(data.amount - total) > 0.01) {
        throw new Error(`Credit card amount ($${data.amount.toFixed(2)}) does not match line items total ($${total.toFixed(2)}). Balance sheet would be out of balance.`);
      }

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
        lot_id: line.lot_id,
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
            lot_id: line.lot_id,
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
            lot_id: line.lot_id,
            memo: line.memo,
          });
        }
      }

      // FINAL SAFETY CHECK: Verify debits = credits before inserting
      const totalDebits = journalLines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = journalLines.reduce((sum, line) => sum + (line.credit || 0), 0);
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`CRITICAL: Journal entry would be unbalanced. Debits ($${totalDebits.toFixed(2)}) ≠ Credits ($${totalCredits.toFixed(2)}). Transaction cancelled.`);
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
      toast({ title: "Success", description: "Credit card transaction created successfully" });
    },
    onError: (error: Error) => {
      let errorMessage = error.message || "Failed to create credit card transaction";
      
      if (error.message?.includes('null value in column "account_id"')) {
        errorMessage = "Could not save: a journal line was missing an account. For Job Cost, we automatically use your WIP account. Please check Settings > Accounting.";
      }
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
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
      toast({ title: "Success", description: "Credit card transaction deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete credit card transaction", variant: "destructive" });
    },
  });

  // Update credit card transaction
  const updateCreditCard = useMutation({
    mutationFn: async ({ 
      creditCardId, 
      data 
    }: { 
      creditCardId: string; 
      data: CreditCardData;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'owner' ? user.id : userData?.home_builder_id;
      if (!owner_id) throw new Error("Could not determine owner");

      // Get WIP account for job cost lines
      const { data: settings } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .eq('owner_id', owner_id)
        .single();

      const wipAccountId = settings?.wip_account_id;

      // CRITICAL: Validate that header amount equals sum of line amounts
      const linesTotal = data.lines.reduce((sum, line) => sum + Number(line.amount), 0);
      if (Math.abs(data.amount - linesTotal) > 0.01) {
        throw new Error(`Credit card amount ($${data.amount.toFixed(2)}) does not match line items total ($${linesTotal.toFixed(2)}). Balance sheet would be out of balance.`);
      }

      // Update the credit card header
      const { error: updateError, data: updatedCC } = await supabase
        .from('credit_cards')
        .update({
          transaction_date: data.transaction_date,
          transaction_type: data.transaction_type,
          credit_card_account_id: data.credit_card_account_id,
          vendor: data.vendor,
          project_id: data.project_id || null,
          amount: data.amount,
          memo: data.memo || null,
        })
        .eq('id', creditCardId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete existing credit card lines
      await supabase
        .from('credit_card_lines')
        .delete()
        .eq('credit_card_id', creditCardId);

      // Insert new credit card lines
      const newLines = data.lines.map((line, index) => ({
        credit_card_id: creditCardId,
        owner_id,
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.account_id || null,
        cost_code_id: line.cost_code_id || null,
        project_id: line.project_id || null,
        lot_id: line.lot_id || null,
        amount: line.amount,
        memo: line.memo || null,
      }));

      const { error: linesError } = await supabase
        .from('credit_card_lines')
        .insert(newLines);

      if (linesError) throw linesError;

      // Update journal entry and lines
      const { data: journalEntry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('source_type', 'credit_card')
        .eq('source_id', creditCardId)
        .single();

      if (journalEntry) {
        // Update journal entry date
        await supabase
          .from('journal_entries')
          .update({ entry_date: data.transaction_date })
          .eq('id', journalEntry.id);

        // Delete existing journal entry lines and recreate
        await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', journalEntry.id);

        const journalLines = [];
        let lineNumber = 1;
        const isPurchase = data.transaction_type === 'purchase';

        // Create credit card liability line
        journalLines.push({
          journal_entry_id: journalEntry.id,
          owner_id,
          line_number: lineNumber++,
          account_id: data.credit_card_account_id,
          project_id: data.project_id || null,
          credit: isPurchase ? data.amount : 0,
          debit: isPurchase ? 0 : data.amount,
          memo: `${data.vendor} - ${isPurchase ? 'Purchase' : 'Refund'}`
        });

        // Create expense/WIP lines
        data.lines.forEach((line) => {
          if (line.amount > 0) {
            let accountId = line.account_id;
            if (line.line_type === 'job_cost' && wipAccountId) {
              accountId = wipAccountId;
            }
            
            journalLines.push({
              journal_entry_id: journalEntry.id,
              owner_id,
              line_number: lineNumber++,
              account_id: accountId,
              cost_code_id: line.cost_code_id || null,
              project_id: line.project_id || null,
              lot_id: line.lot_id || null,
              debit: isPurchase ? line.amount : 0,
              credit: isPurchase ? 0 : line.amount,
              memo: line.memo || null
            });
          }
        });

        // FINAL SAFETY CHECK: Verify debits = credits before inserting
        const totalDebits = journalLines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredits = journalLines.reduce((sum, line) => sum + (line.credit || 0), 0);
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error(`CRITICAL: Journal entry would be unbalanced. Debits ($${totalDebits.toFixed(2)}) ≠ Credits ($${totalCredits.toFixed(2)}). Transaction cancelled.`);
        }

        const { error: journalLinesError } = await supabase
          .from('journal_entry_lines')
          .insert(journalLines);

        if (journalLinesError) throw journalLinesError;
      }

      return updatedCC;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast({ title: "Success", description: "Credit card transaction updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update credit card transaction", variant: "destructive" });
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
        reconciled: originalCC.reconciled,
        reconciliation_id: originalCC.reconciliation_id,
        reconciliation_date: originalCC.reconciliation_date,
        memo: correctionReason ? `${correctedCreditCardData.memo || ''} (Corrected: ${correctionReason})` : correctedCreditCardData.memo
      });

      return { originalCC, reversingCC, correctedCC: result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.refetchQueries({ queryKey: ['account-transactions'] });
      toast({ title: "Success", description: "Credit card transaction corrected with complete audit trail" });
    },
    onError: (error: Error) => {
      console.error('Error correcting credit card:', error);
      toast({ title: "Error", description: error.message || "Failed to correct credit card transaction", variant: "destructive" });
    },
  });

  return {
    creditCards,
    isLoading,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    correctCreditCard,
  };
}
