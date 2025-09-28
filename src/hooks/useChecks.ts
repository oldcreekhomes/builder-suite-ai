import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

async function createCheck(checkData: CheckData, checkLines: CheckLineData[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Get user's home builder ID if they're an employee
  const { data: userInfo } = await supabase
    .from('users')
    .select('role, home_builder_id')
    .eq('id', user.id)
    .single();

  const ownerId = userInfo?.role === 'employee' ? userInfo.home_builder_id : user.id;

  // Insert the check record
  const { data: check, error: checkError } = await supabase
    .from('checks')
    .insert({
      ...checkData,
      owner_id: ownerId,
      created_by: user.id,
      status: 'posted' // Checks are immediately posted unlike bills which start as draft
    })
    .select()
    .single();

  if (checkError || !check) {
    throw new Error(`Failed to create check: ${checkError?.message || 'Unknown error'}`);
  }

  // Insert check lines
  if (checkLines.length > 0) {
    const checkLinesWithMeta = checkLines.map((line, index) => ({
      ...line,
      check_id: check.id,
      line_number: index + 1,
      owner_id: ownerId,
    }));

    const { error: linesError } = await supabase
      .from('check_lines')
      .insert(checkLinesWithMeta);

    if (linesError) {
      // Clean up the check if lines insertion fails
      await supabase.from('checks').delete().eq('id', check.id);
      throw new Error(`Failed to create check lines: ${linesError.message}`);
    }
  }

  // Create journal entry for the check
  const { data: journalEntry, error: journalError } = await supabase
    .from('journal_entries')
    .insert({
      source_type: 'check',
      source_id: check.id,
      entry_date: checkData.check_date,
      description: `Check #${checkData.check_number || 'DRAFT'} to ${checkData.pay_to}`,
      owner_id: ownerId
    })
    .select()
    .single();

  if (journalError || !journalEntry) {
    // Clean up check if journal entry creation fails
    await supabase.from('checks').delete().eq('id', check.id);
    throw new Error(`Failed to create journal entry: ${journalError?.message || 'Unknown error'}`);
  }

  // Create journal entry lines
  const journalLines = [];
  let lineNumber = 1;

  // Credit the bank account (reduces cash balance)
  journalLines.push({
    journal_entry_id: journalEntry.id,
    account_id: checkData.bank_account_id,
    project_id: checkData.project_id,
    credit: checkData.amount,
    debit: 0,
    line_number: lineNumber++,
    memo: `Check #${checkData.check_number || 'DRAFT'} to ${checkData.pay_to}`,
    owner_id: ownerId
  });

  // Debit the expense accounts/cost codes
  for (const line of checkLines) {
    journalLines.push({
      journal_entry_id: journalEntry.id,
      account_id: line.account_id,
      cost_code_id: line.cost_code_id,
      project_id: line.project_id,
      debit: line.amount,
      credit: 0,
      line_number: lineNumber++,
      memo: line.memo,
      owner_id: ownerId
    });
  }

  const { error: journalLinesError } = await supabase
    .from('journal_entry_lines')
    .insert(journalLines);

  if (journalLinesError) {
    // Clean up check and journal entry if journal lines creation fails
    await supabase.from('checks').delete().eq('id', check.id);
    await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
    throw new Error(`Failed to create journal entry lines: ${journalLinesError.message}`);
  }

  return check;
}

export function useChecks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createCheckMutation = useMutation({
    mutationFn: ({ checkData, checkLines }: { checkData: CheckData; checkLines: CheckLineData[] }) => 
      createCheck(checkData, checkLines),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      
      toast({
        title: "Check Created",
        description: "Check has been written and journal entries created successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Error creating check:', error);
      toast({
        title: "Error Creating Check",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createCheck: createCheckMutation,
  };
}