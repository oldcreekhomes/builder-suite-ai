import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface JournalLineData {
  account_id: string;
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

      // Validate each line has account and either debit or credit
      for (const line of data.lines) {
        if (!line.account_id) {
          throw new Error("All lines must have an account selected.");
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

      const owner_id = userData.role === "employee" ? userData.home_builder_id : userData.id;
      if (!owner_id) throw new Error("Owner ID could not be determined");

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          owner_id,
          entry_date: data.entry_date.toISOString().split('T')[0],
          source_type: "manual",
          source_id: owner_id, // Use owner_id as source_id for manual entries
          description: data.description || null,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const linesToInsert = data.lines.map((line, index) => ({
        journal_entry_id: journalEntry.id,
        owner_id,
        line_number: index + 1,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo || null,
        project_id: data.project_id || null,
        cost_code_id: line.cost_code_id || null,
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

  return {
    createManualJournalEntry,
  };
};
