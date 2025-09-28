import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CheckLineData {
  line_type: 'job_cost' | 'expense';
  account_id?: string;
  cost_code_id?: string;
  project_id?: string;
  amount: number;
  memo?: string;
}

export interface CheckData {
  check_number?: string;
  check_date: string;
  pay_to: string;
  bank_account_id: string;
  project_id?: string;
  amount: number;
  memo?: string;
  company_name?: string;
  company_address?: string;
  company_city_state?: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
}

export const useChecks = () => {
  const queryClient = useQueryClient();

  const createCheck = useMutation({
    mutationFn: async ({ checkData, checkLines }: { checkData: CheckData; checkLines: CheckLineData[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's owner_id (either their own ID if owner, or home_builder_id if employee)
      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'owner' ? user.id : userData?.home_builder_id;
      if (!owner_id) throw new Error("Unable to determine owner");

      // Calculate total amount from lines if not provided
      const totalAmount = checkData.amount || checkLines.reduce((sum, line) => sum + line.amount, 0);

      // Create the check record
      const { data: check, error: checkError } = await supabase
        .from('checks')
        .insert({
          owner_id,
          created_by: user.id,
          check_number: checkData.check_number,
          check_date: checkData.check_date,
          pay_to: checkData.pay_to,
          bank_account_id: checkData.bank_account_id,
          project_id: checkData.project_id,
          amount: totalAmount,
          memo: checkData.memo,
          company_name: checkData.company_name,
          company_address: checkData.company_address,
          company_city_state: checkData.company_city_state,
          bank_name: checkData.bank_name,
          routing_number: checkData.routing_number,
          account_number: checkData.account_number,
          status: 'posted'
        })
        .select()
        .single();

      if (checkError) throw checkError;

      // Create check lines
      if (checkLines.length > 0) {
        const checkLinesData = checkLines.map((line, index) => ({
          check_id: check.id,
          owner_id,
          line_number: index + 1,
          line_type: line.line_type,
          account_id: line.account_id,
          cost_code_id: line.cost_code_id,
          project_id: line.project_id,
          amount: line.amount,
          memo: line.memo
        }));

        const { error: linesError } = await supabase
          .from('check_lines')
          .insert(checkLinesData);

        if (linesError) throw linesError;
      }

      // Create journal entry for the check
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          owner_id,
          source_type: 'check',
          source_id: check.id,
          entry_date: checkData.check_date,
          description: `Check ${checkData.check_number || check.id} to ${checkData.pay_to}`,
          posted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (journalError) throw journalError;

      // Create journal entry lines
      const journalLines = [];
      
      // Credit the bank account (reduces cash)
      journalLines.push({
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: 1,
        account_id: checkData.bank_account_id,
        credit: totalAmount,
        debit: 0,
        memo: `Check ${checkData.check_number || check.id} to ${checkData.pay_to}`
      });

      // Debit the expense accounts/cost codes (records what money was spent on)
      checkLines.forEach((line, index) => {
        if (line.amount > 0) {
          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id,
            line_number: index + 2,
            account_id: line.account_id,
            cost_code_id: line.cost_code_id,
            project_id: line.project_id,
            debit: line.amount,
            credit: 0,
            memo: line.memo || `Check ${checkData.check_number || check.id} - ${line.line_type}`
          });
        }
      });

      const { error: journalLinesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (journalLinesError) throw journalLinesError;

      return check;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance_sheet'] });
      
      toast({
        title: "Check Created",
        description: "Check has been created and journal entries posted successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating check:', error);
      toast({
        title: "Error Creating Check",
        description: "There was an error creating the check. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createCheck,
  };
};