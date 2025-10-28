
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface BillData {
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date?: string;
  terms?: string;
  reference_number?: string;
  notes?: string;
}

export interface BillLineData {
  line_type: 'job_cost' | 'expense';
  account_id?: string;
  project_id?: string;
  cost_code_id?: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  memo?: string;
}

export const useBills = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createBill = useMutation({
    mutationFn: async ({ billData, billLines }: { billData: BillData; billLines: BillLineData[] }) => {
      if (!user) throw new Error("User not authenticated");

      console.log('Creating bill with data:', { billData, billLines });

      // Get the owner_id (either current user or home_builder_id for employees)
      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.home_builder_id || user.id;

      // Create the bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          ...billData,
          owner_id,
          created_by: user.id,
          total_amount: billLines.reduce((sum, line) => sum + line.amount, 0)
        })
        .select()
        .maybeSingle();

      if (billError) {
        console.error('Bill insert error:', billError);
        throw billError;
      }
      
      if (!bill) {
        console.error('Bill was inserted but could not be retrieved');
        throw new Error("Bill was created but could not be retrieved. Please refresh the page.");
      }

      // Create bill lines
      const billLinesWithBillId = billLines.map((line, index) => ({
        ...line,
        bill_id: bill.id,
        line_number: index + 1,
        owner_id
      }));

      const { error: linesError } = await supabase
        .from('bill_lines')
        .insert(billLinesWithBillId);

      if (linesError) throw linesError;

      return bill;
    },
    onSuccess: () => {
      console.log('Bill created successfully');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      // Don't show toast here - let the component handle it to avoid duplicates
    },
    onError: (error) => {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: "Failed to save bill",
        variant: "destructive",
      });
    }
  });

  const postBill = useMutation({
    mutationFn: async (billId: string) => {
      if (!user) throw new Error("User not authenticated");

      // Get bill with lines for journal entry creation
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .select(`
          *,
          bill_lines (*)
        `)
        .eq('id', billId)
        .single();

      if (billError) throw billError;

      // Get accounting settings for AP and WIP accounts
      const { data: settings } = await supabase
        .from('accounting_settings')
        .select('ap_account_id, wip_account_id')
        .eq('owner_id', bill.owner_id)
        .single();

      if (!settings?.ap_account_id) {
        throw new Error("Accounts Payable account not configured in Accounting Settings");
      }

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          owner_id: bill.owner_id,
          source_type: 'bill',
          source_id: bill.id,
          entry_date: bill.bill_date,
          description: `${bill.total_amount < 0 ? 'Bill Credit' : 'Bill'} from vendor - Ref: ${bill.reference_number || 'N/A'}`
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      const journalLines: any[] = [];
      let lineNumber = 1;

      // Process each bill line
      for (const line of bill.bill_lines) {
        const lineAmount = Math.abs(line.amount);
        const isCredit = line.amount < 0;
        
        if (line.line_type === 'job_cost') {
          // Job Cost: Debit WIP (or Credit for credits), Credit AP (or Debit for credits)
          if (!settings.wip_account_id) {
            throw new Error("Work in Progress account not configured in Accounting Settings");
          }
          
          journalLines.push({
            journal_entry_id: journalEntry.id,
            line_number: lineNumber++,
            account_id: settings.wip_account_id,
            debit: isCredit ? 0 : lineAmount,
            credit: isCredit ? lineAmount : 0,
            project_id: line.project_id || bill.project_id,
            cost_code_id: line.cost_code_id,
            memo: line.memo,
            owner_id: bill.owner_id
          });
        } else {
          // Expense: Debit Expense Account (or Credit for credits), Credit AP (or Debit for credits)
          if (!line.account_id) {
            throw new Error("Expense account not selected for expense line");
          }
          
          journalLines.push({
            journal_entry_id: journalEntry.id,
            line_number: lineNumber++,
            account_id: line.account_id,
            debit: isCredit ? 0 : lineAmount,
            credit: isCredit ? lineAmount : 0,
            project_id: line.project_id || bill.project_id,
            cost_code_id: line.cost_code_id,
            memo: line.memo,
            owner_id: bill.owner_id
          });
        }
      }

      // Credit AP for normal bills, Debit AP for credits
      const totalAmount = Math.abs(bill.total_amount);
      const isBillCredit = bill.total_amount < 0;
      
      journalLines.push({
        journal_entry_id: journalEntry.id,
        line_number: lineNumber,
        account_id: settings.ap_account_id,
        debit: isBillCredit ? totalAmount : 0,
        credit: isBillCredit ? 0 : totalAmount,
        memo: `AP - ${bill.reference_number || 'Bill'}${isBillCredit ? ' (Credit)' : ''}`,
        owner_id: bill.owner_id,
        project_id: bill.project_id || null
      });

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (linesError) throw linesError;

      // Update bill status to posted
      const { error: updateError } = await supabase
        .from('bills')
        .update({ 
          status: 'posted',
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (updateError) throw updateError;

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast({
        title: "Success",
        description: "Bill posted to General Ledger successfully",
      });
    },
    onError: (error) => {
      console.error('Error posting bill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post bill",
        variant: "destructive",
      });
    }
  });

  const approveBill = useMutation({
    mutationFn: async ({ billId, notes }: { billId: string; notes?: string }) => {
      if (!user) throw new Error("User not authenticated");

      // Update bill notes if provided
      if (notes && notes.trim()) {
        // Get current bill notes
        const { data: billData } = await supabase
          .from('bills')
          .select('notes')
          .eq('id', billId)
          .single();
        
        // Get user profile for attribution
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        const userName = userData 
          ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() 
          : 'Unknown User';
        
        // Format: "First Last: Note\n\n" + existing notes
        const newNote = `${userName}: ${notes.trim()}`;
        let finalNotes = newNote;
        
        if (billData?.notes && billData.notes.trim()) {
          finalNotes = `${newNote}\n\n${billData.notes}`;
        }
        
        const { error: notesError } = await supabase
          .from('bills')
          .update({ 
            notes: finalNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', billId);

        if (notesError) throw notesError;
      }

      // Approve a bill by posting it to the general ledger
      return await postBill.mutateAsync(billId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      toast({
        title: "Success",
        description: "Bill approved and posted to General Ledger successfully",
      });
    },
    onError: (error) => {
      console.error('Error approving bill:', error);
      toast({
        title: "Error",
        description: "Failed to approve bill",
        variant: "destructive",
      });
    }
  });

  const rejectBill = useMutation({
    mutationFn: async ({ billId, notes }: { billId: string; notes?: string }) => {
      if (!user) throw new Error("User not authenticated");

      let finalNotes = null;
      
      if (notes && notes.trim()) {
        // Get current bill notes
        const { data: billData } = await supabase
          .from('bills')
          .select('notes')
          .eq('id', billId)
          .single();
        
        // Get user profile for attribution
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        const userName = userData 
          ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() 
          : 'Unknown User';
        
        // Format: "First Last: Note\n\n" + existing notes
        const newNote = `${userName}: ${notes.trim()}`;
        
        if (billData?.notes && billData.notes.trim()) {
          // Prepend new note to existing notes (most recent first)
          finalNotes = `${newNote}\n\n${billData.notes}`;
        } else {
          finalNotes = newNote;
        }
      }

      // Update bill status to void (rejected) and set notes
      const { error } = await supabase
        .from('bills')
        .update({ 
          status: 'void',
          notes: finalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) throw error;
      return billId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      toast({
        title: "Success",
        description: "Bill rejected successfully",
      });
    },
    onError: (error) => {
      console.error('Error rejecting bill:', error);
      toast({
        title: "Error",
        description: "Failed to reject bill",
        variant: "destructive",
      });
    }
  });

  const payBill = useMutation({
    mutationFn: async ({ 
      billId, 
      paymentAccountId, 
      paymentDate, 
      memo 
    }: { 
      billId: string; 
      paymentAccountId: string; 
      paymentDate: string; 
      memo?: string; 
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Get bill details for journal entry
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (billError) throw billError;

      // Get accounting settings for AP account
      const { data: settings } = await supabase
        .from('accounting_settings')
        .select('ap_account_id')
        .eq('owner_id', bill.owner_id)
        .single();

      if (!settings?.ap_account_id) {
        throw new Error("Accounts Payable account not configured in Accounting Settings");
      }

      // Create journal entry for payment
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          owner_id: bill.owner_id,
          source_type: 'bill_payment',
          source_id: bill.id,
          entry_date: paymentDate,
          description: `Payment for bill - Ref: ${bill.reference_number || 'N/A'}${memo ? ` - ${memo}` : ''}`
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines for payment
      const totalAmount = Math.abs(bill.total_amount);
      const isBillCredit = bill.total_amount < 0;
      
      const journalLines = [
        // Debit AP (normal bills) or Credit AP (for credits)
        {
          journal_entry_id: journalEntry.id,
          line_number: 1,
          account_id: settings.ap_account_id,
          debit: isBillCredit ? 0 : totalAmount,
          credit: isBillCredit ? totalAmount : 0,
          memo: `Payment - ${bill.reference_number || 'Bill'}${isBillCredit ? ' (Credit)' : ''}`,
          owner_id: bill.owner_id,
          project_id: bill.project_id || null,
        },
        // Credit payment account (normal bills) or Debit payment account (for credits - receive money back)
        {
          journal_entry_id: journalEntry.id,
          line_number: 2,
          account_id: paymentAccountId,
          debit: isBillCredit ? totalAmount : 0,
          credit: isBillCredit ? 0 : totalAmount,
          memo: memo || `Payment for bill ${bill.reference_number || ''}`,
          owner_id: bill.owner_id,
          project_id: bill.project_id || null,
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (linesError) throw linesError;

      // Update bill status to paid
      const { error: updateError } = await supabase
        .from('bills')
        .update({ 
          status: 'paid' as any,
          notes: memo ? `Paid - ${memo}` : 'Paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (updateError) throw updateError;

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast({
        title: "Success",
        description: "Bill payment recorded and posted to General Ledger",
      });
    },
    onError: (error) => {
      console.error('Error paying bill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record bill payment",
        variant: "destructive",
      });
    }
  });

  const deleteBill = useMutation({
    mutationFn: async (billId: string) => {
      if (!user) throw new Error("User not authenticated");

      // Use the database function to delete bill and cascade to journal entries
      const { data, error } = await supabase.rpc('delete_bill_with_journal_entries', {
        bill_id_param: billId
      });

      if (error) throw error;
      if (!data) throw new Error("Bill could not be deleted");
      
      return billId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      toast({
        title: "Success",
        description: "Bill and related journal entries deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  });

  const updateBill = useMutation({
    mutationFn: async ({ 
      billId, 
      billData, 
      billLines,
      deletedLineIds 
    }: { 
      billId: string; 
      billData: BillData; 
      billLines: BillLineData[];
      deletedLineIds: string[];
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Get the owner_id
      const { data: bill } = await supabase
        .from('bills')
        .select('owner_id')
        .eq('id', billId)
        .single();

      if (!bill) throw new Error("Bill not found");

      // Update bill header and set status to 'draft' (back to review queue)
      const { error: billError } = await supabase
        .from('bills')
        .update({
          ...billData,
          status: 'draft', // KEY: Move back to review queue
          total_amount: billLines.reduce((sum, line) => sum + line.amount, 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (billError) throw billError;

      // Delete all existing bill lines (simplest approach)
      const { error: deleteError } = await supabase
        .from('bill_lines')
        .delete()
        .eq('bill_id', billId);

      if (deleteError) throw deleteError;

      // Insert all lines fresh with updated line numbers
      const billLinesWithBillId = billLines.map((line, index) => ({
        ...line,
        bill_id: billId,
        line_number: index + 1,
        owner_id: bill.owner_id
      }));

      const { error: linesError } = await supabase
        .from('bill_lines')
        .insert(billLinesWithBillId);

      if (linesError) throw linesError;

      return billId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      queryClient.invalidateQueries({ queryKey: ['bill'] });
      toast({
        title: "Success",
        description: "Bill updated and sent back for review",
      });
    },
    onError: (error) => {
      console.error('Error updating bill:', error);
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    }
  });

  return {
    createBill,
    postBill,
    approveBill,
    rejectBill,
    payBill,
    deleteBill,
    updateBill
  };
};
