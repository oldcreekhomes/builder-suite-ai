import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface JournalLineData {
  line_number: number;
  line_type: 'expense' | 'job_cost';
  account_id?: string;
  debit: number;
  credit: number;
  memo?: string;
  project_id?: string;
  cost_code_id?: string;
}

interface CreateManualJournalEntryData {
  entry_date: Date;
  description?: string;
  lines: JournalLineData[];
  project_id?: string;
}

export const useJournalEntries = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all manual journal entries with their lines
  const { data: journalEntries = [], isLoading } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      if (!user) return [];

      const { data: userData } = await supabase
        .from("users")
        .select("id, role, home_builder_id")
        .eq("id", user.id)
        .single();

      if (!userData) return [];

      const owner_id = userData.home_builder_id || userData.id;
      if (!owner_id) return [];

      // Fetch journal entries
      const { data: entries, error: entriesError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("owner_id", owner_id)
        .eq("source_type", "manual")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (entriesError) throw entriesError;
      if (!entries) return [];

      // Fetch lines for all entries
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          accounts:account_id (id, name, code),
          cost_codes:cost_code_id (id, name, code),
          projects:project_id (id, address)
        `)
        .in("journal_entry_id", entries.map(e => e.id))
        .order("line_number", { ascending: true });

      if (linesError) throw linesError;

      // Group lines by entry
      return entries.map(entry => ({
        ...entry,
        lines: lines?.filter(line => line.journal_entry_id === entry.id) || []
      }));
    },
    enabled: !!user,
  });

  const createManualJournalEntry = useMutation({
    mutationFn: async (data: CreateManualJournalEntryData) => {
      if (!user) throw new Error("User not authenticated");

      // Validate that debits equal credits
      const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error("Journal entry must balance. Debits must equal credits.");
      }

      // Validate at least 2 lines
      if (data.lines.length < 2) {
        throw new Error("Journal entry must have at least 2 lines.");
      }

      // Validate each line based on its type
      for (const line of data.lines) {
        if (line.line_type === 'expense') {
          if (!line.account_id) {
            throw new Error("Expense lines must have an account selected.");
          }
        } else if (line.line_type === 'job_cost') {
          if (!line.project_id) {
            throw new Error("Job cost lines must have a project selected.");
          }
          if (!line.cost_code_id) {
            throw new Error("Job cost lines must have a cost code selected.");
          }
        }
        if (line.debit > 0 && line.credit > 0) {
          throw new Error("A line cannot have both debit and credit amounts.");
        }
        if (line.debit === 0 && line.credit === 0) {
          throw new Error("Each line must have either a debit or credit amount.");
        }
      }

      // Determine owner_id
      const { data: userData } = await supabase
        .from("users")
        .select("id, role, home_builder_id")
        .eq("id", user.id)
        .single();

      if (!userData) throw new Error("User data not found");

      const owner_id = userData.home_builder_id || userData.id;
      if (!owner_id) throw new Error("Owner ID could not be determined");

      // Fetch WIP account for job cost lines
      const { data: accountingSettings } = await supabase
        .from("accounting_settings")
        .select("wip_account_id")
        .eq("owner_id", owner_id)
        .maybeSingle();
      
      if (!accountingSettings?.wip_account_id) {
        throw new Error("WIP account not configured. Please configure accounting settings first.");
      }

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          owner_id,
          entry_date: data.entry_date.toISOString().split('T')[0],
          source_type: "manual",
          source_id: crypto.randomUUID(), // Each manual entry gets unique ID
          description: data.description || null,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const linesToInsert = data.lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: line.line_number,
        account_id: line.line_type === 'expense' ? line.account_id : accountingSettings.wip_account_id,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || null,
        project_id: data.project_id || line.project_id || null,
        cost_code_id: line.line_type === 'job_cost' ? line.cost_code_id : null,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(linesToInsert);

      if (linesError) {
        // Rollback: delete the journal entry
        await supabase.from("journal_entries").delete().eq("id", journalEntry.id);
        throw linesError;
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating journal entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive",
      });
    },
  });

  const updateManualJournalEntry = useMutation({
    mutationFn: async (data: CreateManualJournalEntryData & { journal_entry_id: string }) => {
      if (!user) throw new Error("User not authenticated");

      // Validate that debits equal credits
      const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error("Journal entry must balance. Debits must equal credits.");
      }

      // Validate at least 2 lines
      if (data.lines.length < 2) {
        throw new Error("Journal entry must have at least 2 lines.");
      }

      // Validate each line
      for (const line of data.lines) {
        if (line.line_type === 'expense') {
          if (!line.account_id) {
            throw new Error("Expense lines must have an account selected.");
          }
        } else if (line.line_type === 'job_cost') {
          if (!line.project_id) {
            throw new Error("Job cost lines must have a project selected.");
          }
          if (!line.cost_code_id) {
            throw new Error("Job cost lines must have a cost code selected.");
          }
        }
        if (line.debit > 0 && line.credit > 0) {
          throw new Error("A line cannot have both debit and credit amounts.");
        }
        if (line.debit === 0 && line.credit === 0) {
          throw new Error("Each line must have either a debit or credit amount.");
        }
      }

      // Determine owner_id
      const { data: userData } = await supabase
        .from("users")
        .select("id, role, home_builder_id")
        .eq("id", user.id)
        .single();

      if (!userData) throw new Error("User data not found");

      const owner_id = userData.home_builder_id || userData.id;
      if (!owner_id) throw new Error("Owner ID could not be determined");

      // Fetch WIP account
      const { data: accountingSettings } = await supabase
        .from("accounting_settings")
        .select("wip_account_id")
        .eq("owner_id", owner_id)
        .maybeSingle();
      
      if (!accountingSettings?.wip_account_id) {
        throw new Error("WIP account not configured. Please configure accounting settings first.");
      }

      // Update journal entry
      const { error: entryError } = await supabase
        .from("journal_entries")
        .update({
          entry_date: data.entry_date.toISOString().split('T')[0],
          description: data.description || null,
        })
        .eq("id", data.journal_entry_id);

      if (entryError) throw entryError;

      // Delete existing lines
      const { error: deleteError } = await supabase
        .from("journal_entry_lines")
        .delete()
        .eq("journal_entry_id", data.journal_entry_id);

      if (deleteError) throw deleteError;

      // Insert new lines
      const linesToInsert = data.lines.map((line) => ({
        journal_entry_id: data.journal_entry_id,
        owner_id,
        line_number: line.line_number,
        account_id: line.line_type === 'expense' ? line.account_id : accountingSettings.wip_account_id,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || null,
        project_id: data.project_id || line.project_id || null,
        cost_code_id: line.line_type === 'job_cost' ? line.cost_code_id : null,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(linesToInsert);

      if (linesError) throw linesError;

      return data.journal_entry_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast({
        title: "Success",
        description: "Journal entry updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating journal entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update journal entry",
        variant: "destructive",
      });
    },
  });

  const deleteManualJournalEntry = useMutation({
    mutationFn: async (journalEntryId: string) => {
      const { data, error } = await supabase.rpc('delete_manual_journal_entry', {
        journal_entry_id_param: journalEntryId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      
      toast({
        title: "Success",
        description: "Journal entry deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting journal entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete journal entry",
        variant: "destructive",
      });
    },
  });

  const updateJournalEntryField = useMutation({
    mutationFn: async ({ 
      entryId, 
      updates 
    }: { 
      entryId: string; 
      updates: { entry_date?: string; description?: string } 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter out undefined values to only update provided fields
      const updateData: any = {};
      if (updates.entry_date !== undefined) updateData.entry_date = updates.entry_date;
      if (updates.description !== undefined) updateData.description = updates.description;

      // Update the journal entry
      const { error: entryError } = await supabase
        .from("journal_entries")
        .update(updateData)
        .eq("id", entryId);

      if (entryError) throw entryError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast({ title: "Journal entry updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating journal entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createManualJournalEntry,
    updateManualJournalEntry,
    deleteManualJournalEntry,
    updateJournalEntryField,
    journalEntries,
    isLoading,
  };
};
