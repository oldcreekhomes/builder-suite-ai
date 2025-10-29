import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type BudgetWarningRule = Tables<'budget_warning_rules'>;

const DEFAULT_RULES = [
  { rule_type: 'missing_quantity', enabled: true },
  { rule_type: 'missing_unit_price', enabled: true },
  { rule_type: 'missing_unit_of_measure', enabled: true },
  { rule_type: 'budget_zero_or_null', enabled: true },
  { rule_type: 'no_bid_selected', enabled: false },
  { rule_type: 'missing_specifications', enabled: false },
  { rule_type: 'budget_below_threshold', enabled: false, threshold_value: 10000 },
];

export function useBudgetWarningRules() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['budget-warning-rules'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch existing rules
      const { data, error } = await supabase
        .from('budget_warning_rules')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // If no rules exist, initialize with defaults
      if (!data || data.length === 0) {
        const defaultRules = DEFAULT_RULES.map(rule => ({
          user_id: user.id,
          ...rule,
        }));

        const { data: insertedRules, error: insertError } = await supabase
          .from('budget_warning_rules')
          .insert(defaultRules)
          .select();

        if (insertError) throw insertError;
        return insertedRules as BudgetWarningRule[];
      }

      return data as BudgetWarningRule[];
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ 
      rule_type, 
      enabled, 
      threshold_value 
    }: { 
      rule_type: string; 
      enabled: boolean; 
      threshold_value?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('budget_warning_rules')
        .upsert(
          {
            user_id: user.id,
            rule_type,
            enabled,
            threshold_value: threshold_value !== undefined ? threshold_value : null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,rule_type',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-warning-rules'] });
      toast.success('Warning rule updated');
    },
    onError: (error) => {
      console.error('Error updating warning rule:', error);
      toast.error('Failed to update warning rule');
    },
  });

  return { rules, updateRule, isLoading };
}
