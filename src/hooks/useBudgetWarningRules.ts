import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['budget-warning-rules'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's company name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_name) {
        throw new Error('Failed to fetch user company information');
      }

      // Fetch existing company-wide rules
      const { data, error } = await supabase
        .from('budget_warning_rules')
        .select('*')
        .eq('company_name', userData.company_name);

      if (error) throw error;

      // If no rules exist, initialize with defaults
      if (!data || data.length === 0) {
        const defaultRules = DEFAULT_RULES.map(rule => ({
          user_id: user.id,
          company_name: userData.company_name,
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

      // Get user's company name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_name) {
        throw new Error('Failed to fetch user company information');
      }

      const { error } = await supabase
        .from('budget_warning_rules')
        .upsert(
          {
            user_id: user.id,
            company_name: userData.company_name,
            rule_type,
            enabled,
            threshold_value: threshold_value !== undefined ? threshold_value : null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'company_name,rule_type',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-warning-rules'] });
      toast({ title: "Success", description: 'Warning rule updated' });
    },
    onError: (error) => {
      console.error('Error updating warning rule:', error);
      toast({ title: "Error", description: 'Failed to update warning rule', variant: "destructive" });
    },
  });

  return { rules, updateRule, isLoading };
}
