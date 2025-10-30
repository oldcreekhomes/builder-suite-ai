import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  reconciled?: boolean;
  reconciliation_id?: string;
  reconciliation_date?: string;
}

export const useChecks = () => {
  const queryClient = useQueryClient();

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['checks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'owner' ? user.id : userData?.home_builder_id;

      const { data, error } = await supabase
        .from('checks')
        .select(`
          *,
          check_lines (
            id,
            line_number,
            line_type,
            account_id,
            cost_code_id,
            project_id,
            amount,
            memo
          )
        `)
        .eq('owner_id', owner_id)
        .eq('is_reversal', false)
        .is('reversed_at', null)
        .order('check_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    },
  });

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

      // Get or create WIP account (code 1430) for job cost lines
      let wipAccountId = null;
      const hasJobCostLines = checkLines.some(line => line.line_type === 'job_cost');
      if (hasJobCostLines) {
        console.log('Looking for WIP account with owner_id:', owner_id);
        
        // Try to find existing WIP account
        let { data: wipAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_id', owner_id)
          .or('code.eq.1430,name.ilike.%wip%')
          .maybeSingle();
        
        // If no WIP account found, create one
        if (!wipAccount) {
          console.log('No WIP account found, creating new one');
          const { data: newWipAccount, error: createError } = await supabase
            .from('accounts')
            .insert({
              owner_id,
              code: '1430',
              name: 'WIP - Work in Progress',
              type: 'asset',
              description: 'Work in Progress asset account for tracking job costs'
            })
            .select('id')
            .single();
          
          if (createError) {
            console.error('Error creating WIP account:', createError);
            throw new Error(`Failed to create WIP account: ${createError.message}`);
          }
          wipAccount = newWipAccount;
          console.log('Created new WIP account:', wipAccount.id);
        } else {
          console.log('Found existing WIP account:', wipAccount.id);
        }
        
        wipAccountId = wipAccount.id;
      }

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
          description: checkData.memo || `Check ${checkData.check_number || check.id} to ${checkData.pay_to}`,
          posted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (journalError) throw journalError;

      // Create journal entry lines
      const journalLines = [];
      
      // Group check lines by project to handle multi-project checks
      const projectGroups = new Map<string | undefined, CheckLineData[]>();
      checkLines.forEach(line => {
        const projectKey = line.project_id || 'no-project';
        if (!projectGroups.has(projectKey)) {
          projectGroups.set(projectKey, []);
        }
        projectGroups.get(projectKey)!.push(line);
      });

      let lineNumber = 1;

      // Create bank credit lines (one per project group)
      for (const [projectKey, lines] of projectGroups) {
        const projectAmount = lines.reduce((sum, line) => sum + line.amount, 0);
        const projectId = projectKey === 'no-project' ? undefined : projectKey;
        
        journalLines.push({
          journal_entry_id: journalEntry.id,
          owner_id,
          line_number: lineNumber++,
          account_id: checkData.bank_account_id,
          project_id: projectId,
          credit: projectAmount,
          debit: 0,
          memo: `Check ${checkData.check_number || check.id} to ${checkData.pay_to}${projectId ? ` (Project)` : ''}`
        });
      }

      // Create debit lines for expenses/WIP
      checkLines.forEach((line) => {
        if (line.amount > 0) {
          let debitAccountId = line.account_id;
          
          // For job cost lines, use WIP account (1430) instead of the provided account_id
          if (line.line_type === 'job_cost' && wipAccountId) {
            debitAccountId = wipAccountId;
            console.log(`Using WIP account ${wipAccountId} for job cost line with amount ${line.amount}`);
          } else {
            console.log(`Using provided account ${debitAccountId} for ${line.line_type} line with amount ${line.amount}`);
          }
          
          journalLines.push({
            journal_entry_id: journalEntry.id,
            owner_id,
            line_number: lineNumber++,
            account_id: debitAccountId,
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
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    },
    onError: (error) => {
      console.error('Error creating check:', error);
      toast({
        title: "Error Creating Check",
        description: error.message || "There was an error creating the check. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCheck = useMutation({
    mutationFn: async (checkId: string) => {
      const { data, error } = await supabase.rpc('delete_check_with_journal_entries', {
        check_id_param: checkId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      
      toast({
        title: "Check Deleted",
        description: "Check and all related entries have been deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting check:', error);
      toast({
        title: "Error Deleting Check",
        description: error.message || "There was an error deleting the check. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCheck = useMutation({
    mutationFn: async ({ 
      checkId, 
      updates 
    }: { 
      checkId: string; 
      updates: { check_date?: string; check_number?: string; pay_to?: string; memo?: string; amount?: number } 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter out undefined values to only update provided fields
      const updateData: any = {};
      if (updates.check_date !== undefined) updateData.check_date = updates.check_date;
      if (updates.check_number !== undefined) updateData.check_number = updates.check_number;
      if (updates.pay_to !== undefined) updateData.pay_to = updates.pay_to;
      if (updates.memo !== undefined) updateData.memo = updates.memo;
      if (updates.amount !== undefined) updateData.amount = updates.amount;

      // Update the check with provided fields
      const { error: checkError, data: checkData } = await supabase
        .from("checks")
        .update(updateData)
        .eq("id", checkId)
        .select("bank_account_id")
        .single();

      if (checkError) throw checkError;

      // If amount changed, update journal entry lines
      if (updates.amount !== undefined) {
        // Find the journal entry for this check
        const { data: journalEntry } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("source_type", "check")
          .eq("source_id", checkId)
          .single();

        if (journalEntry) {
          // Get all lines for this journal entry
          const { data: lines } = await supabase
            .from("journal_entry_lines")
            .select("*")
            .eq("journal_entry_id", journalEntry.id)
            .order("line_number");

          if (lines && lines.length > 0) {
            const bankLine = lines.find(l => l.account_id === checkData.bank_account_id && l.credit > 0);
            const debitLine = lines.find(l => l.debit > 0);

            if (bankLine) {
              await supabase
                .from("journal_entry_lines")
                .update({ credit: updates.amount })
                .eq("id", bankLine.id);
            }

            if (debitLine) {
              await supabase
                .from("journal_entry_lines")
                .update({ debit: updates.amount })
                .eq("id", debitLine.id);
            }
          }
        }
      }

      // If date changed, update the journal entry date too
      if (updates.check_date !== undefined) {
        await supabase
          .from("journal_entries")
          .update({ entry_date: updates.check_date })
          .eq("source_type", "check")
          .eq("source_id", checkId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast({ title: "Check updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating check",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const correctCheck = useMutation({
    mutationFn: async ({ 
      checkId, 
      correctedCheckData, 
      correctedCheckLines,
      correctionReason 
    }: { 
      checkId: string; 
      correctedCheckData: CheckData; 
      correctedCheckLines: CheckLineData[];
      correctionReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Step 1: Get original check
      const { data: originalCheck } = await supabase
        .from('checks')
        .select('*, check_lines (*)')
        .eq('id', checkId)
        .single();

      if (!originalCheck) throw new Error("Check not found");

      // Step 2: Get original journal entries
      const { data: originalJournalEntries } = await supabase
        .from('journal_entries')
        .select('*, journal_entry_lines (*)')
        .eq('source_type', 'check')
        .eq('source_id', checkId);

      // Step 3: Mark original as reversed
      await supabase
        .from('checks')
        .update({ reversed_at: new Date().toISOString() })
        .eq('id', checkId);

      // Step 4: Create reversing check
      const { data: reversingCheck } = await supabase
        .from('checks')
        .insert({
          owner_id: originalCheck.owner_id,
          created_by: user.id,
          check_number: `REV-${originalCheck.check_number || ''}`,
          check_date: originalCheck.check_date,
          pay_to: originalCheck.pay_to,
          bank_account_id: originalCheck.bank_account_id,
          project_id: originalCheck.project_id,
          amount: originalCheck.amount,
          memo: `REVERSAL: ${originalCheck.memo || ''}`,
          is_reversal: true,
          reverses_id: checkId
        })
        .select()
        .single();

      // Step 5: Create reversing check lines
      const reversingCheckLines = originalCheck.check_lines.map((line: any, index: number) => ({
        check_id: reversingCheck.id,
        owner_id: originalCheck.owner_id,
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

      await supabase.from('check_lines').insert(reversingCheckLines);

      // Step 6: Create reversing journal entries (flip debits/credits)
      if (originalJournalEntries && originalJournalEntries.length > 0) {
        for (const originalJE of originalJournalEntries) {
          const { data: reversingJE } = await supabase
            .from('journal_entries')
            .insert({
              owner_id: originalCheck.owner_id,
              source_type: 'check',
              source_id: reversingCheck.id,
              entry_date: originalJE.entry_date,
              description: `REVERSAL: ${originalJE.description}`,
              is_reversal: true,
              reverses_id: originalJE.id
            })
            .select()
            .single();

          const reversingJELines = originalJE.journal_entry_lines.map((line: any, index: number) => ({
            journal_entry_id: reversingJE!.id,
            owner_id: originalCheck.owner_id,
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
      await supabase.from('checks').update({ reversed_by_id: reversingCheck.id }).eq('id', checkId);

      // Step 8: Create corrected check using existing createCheck logic
      const result = await createCheck.mutateAsync({ 
        checkData: { 
          ...correctedCheckData, 
          reconciled: originalCheck.reconciled,
          reconciliation_id: originalCheck.reconciliation_id,
          reconciliation_date: originalCheck.reconciliation_date,
          memo: correctionReason ? `${correctedCheckData.memo || ''} (Corrected: ${correctionReason})` : correctedCheckData.memo 
        },
        checkLines: correctedCheckLines 
      });

      return { originalCheck, reversingCheck, correctedCheck: result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.refetchQueries({ queryKey: ['account-transactions'] });
      toast({
        title: "Check Corrected",
        description: "Check corrected with complete audit trail",
      });
    },
    onError: (error) => {
      console.error('Error correcting check:', error);
      toast({
        title: "Error Correcting Check",
        description: error.message || "Failed to correct check",
        variant: "destructive",
      });
    },
  });

  return {
    checks,
    isLoading,
    createCheck,
    deleteCheck,
    updateCheck,
    correctCheck,
  };
};