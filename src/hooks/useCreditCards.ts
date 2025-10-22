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
          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id: ownerId,
            line_number: lineNumber++,
            account_id: line.account_id || null,
            debit: line.amount,
            credit: 0,
            project_id: line.project_id,
            cost_code_id: line.cost_code_id,
            memo: line.memo,
          });
        }

        // Credit the credit card account
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
        // For refund: DEBIT credit card, CREDIT expenses/WIP
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
          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id: ownerId,
            line_number: lineNumber++,
            account_id: line.account_id || null,
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
      toast.success("Credit card transaction created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create credit card transaction");
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
      toast.success("Credit card transaction deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete credit card transaction");
    },
  });

  return {
    creditCards,
    isLoading,
    createCreditCard,
    deleteCreditCard,
  };
}
