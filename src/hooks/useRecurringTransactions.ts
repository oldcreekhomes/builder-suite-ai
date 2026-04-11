import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addWeeks, addMonths, addQuarters, addYears } from "date-fns";

export interface RecurringTransactionLine {
  id?: string;
  line_type: "job_cost" | "expense";
  account_id?: string;
  cost_code_id?: string;
  project_id?: string;
  lot_id?: string;
  quantity: number;
  amount: number;
  memo?: string;
  line_number: number;
}

export interface RecurringTransaction {
  id: string;
  owner_id: string;
  name: string;
  transaction_type: "check" | "credit_card" | "bill";
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  next_date: string;
  end_date?: string | null;
  auto_enter: boolean;
  template_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  recurring_transaction_lines?: RecurringTransactionLine[];
}

export interface CreateRecurringTransactionInput {
  name: string;
  transaction_type: "check" | "credit_card" | "bill";
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  next_date: string;
  end_date?: string | null;
  auto_enter: boolean;
  template_data: Record<string, any>;
  lines: RecurringTransactionLine[];
}

async function getEffectiveOwnerId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: userData } = await supabase
    .from("users")
    .select("role, home_builder_id")
    .eq("id", user.id)
    .single();

  return userData?.role === "owner" ? user.id : userData?.home_builder_id;
}

function advanceDate(dateStr: string, frequency: string): string {
  const date = new Date(dateStr + "T00:00:00");
  let next: Date;
  switch (frequency) {
    case "weekly": next = addWeeks(date, 1); break;
    case "quarterly": next = addQuarters(date, 1); break;
    case "annually": next = addYears(date, 1); break;
    default: next = addMonths(date, 1); break;
  }
  return next.toISOString().split("T")[0];
}

export function useRecurringTransactions() {
  const queryClient = useQueryClient();

  const { data: recurringTransactions = [], isLoading } = useQuery({
    queryKey: ["recurring-transactions"],
    queryFn: async () => {
      const ownerId = await getEffectiveOwnerId();
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select(`*, recurring_transaction_lines(*)`)
        .eq("owner_id", ownerId)
        .order("next_date", { ascending: true });
      if (error) throw error;
      return (data || []) as RecurringTransaction[];
    },
  });

  const dueTransactions = recurringTransactions.filter(
    (rt) => rt.is_active && new Date(rt.next_date + "T00:00:00") <= new Date()
  );

  const createRecurring = useMutation({
    mutationFn: async (input: CreateRecurringTransactionInput) => {
      const ownerId = await getEffectiveOwnerId();
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert({
          owner_id: ownerId,
          name: input.name,
          transaction_type: input.transaction_type,
          frequency: input.frequency,
          next_date: input.next_date,
          end_date: input.end_date || null,
          auto_enter: input.auto_enter,
          template_data: input.template_data,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.lines.length > 0) {
        const linesToInsert = input.lines.map((line, idx) => ({
          recurring_transaction_id: data.id,
          owner_id: ownerId,
          line_type: line.line_type,
          account_id: line.account_id || null,
          cost_code_id: line.cost_code_id || null,
          project_id: line.project_id || null,
          lot_id: line.lot_id || null,
          quantity: line.quantity || 1,
          amount: line.amount || 0,
          memo: line.memo || null,
          line_number: idx + 1,
        }));
        const { error: lineError } = await supabase
          .from("recurring_transaction_lines")
          .insert(linesToInsert);
        if (lineError) throw lineError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast({ title: "Transaction memorized successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast({ title: "Recurring transaction deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });

  const advanceNextDate = useMutation({
    mutationFn: async (rt: RecurringTransaction) => {
      const newNextDate = advanceDate(rt.next_date, rt.frequency);
      const isExpired = rt.end_date && new Date(newNextDate) > new Date(rt.end_date);
      const { error } = await supabase
        .from("recurring_transactions")
        .update({
          next_date: newNextDate,
          is_active: !isExpired,
        })
        .eq("id", rt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });

  return {
    recurringTransactions,
    dueTransactions,
    isLoading,
    createRecurring,
    deleteRecurring,
    toggleActive,
    advanceNextDate,
  };
}
