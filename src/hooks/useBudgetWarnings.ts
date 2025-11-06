import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type BudgetWarningRule = Tables<'budget_warning_rules'>;

interface Warning {
  rule_type: string;
  message: string;
  priority: 'info' | 'warning' | 'critical';
}

export function useBudgetWarnings(item: any, total: number, costCode: any) {
  const { data: rules = [] } = useQuery({
    queryKey: ['budget-warning-rules'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's company name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_name) {
        console.error('Error fetching user company:', userError);
        return [];
      }

      // Query by company_name for company-wide rules
      const { data, error } = await supabase
        .from('budget_warning_rules')
        .select('*')
        .eq('company_name', userData.company_name)
        .eq('enabled', true);

      if (error) {
        console.error('Error fetching budget warning rules:', error);
        return [];
      }

      return data as BudgetWarningRule[];
    },
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const warnings: Warning[] = [];

  rules.forEach((rule) => {
    switch (rule.rule_type) {
      case 'budget_below_threshold':
        if (rule.threshold_value && total < rule.threshold_value) {
          warnings.push({
            rule_type: rule.rule_type,
            message: `Budget ($${Math.round(total).toLocaleString()}) is below threshold ($${Math.round(rule.threshold_value).toLocaleString()})`,
            priority: 'warning',
          });
        }
        break;

      case 'budget_zero_or_null':
        if (total === 0 || total === null) {
          warnings.push({
            rule_type: rule.rule_type,
            message: 'Budget total is $0 or empty',
            priority: 'warning',
          });
        }
        break;

      case 'missing_quantity':
        if (!item.quantity || item.quantity === 0) {
          warnings.push({
            rule_type: rule.rule_type,
            message: 'Quantity is missing or zero',
            priority: 'info',
          });
        }
        break;

      case 'missing_unit_price':
        if (!item.unit_price || item.unit_price === 0) {
          warnings.push({
            rule_type: rule.rule_type,
            message: 'Unit price is missing or zero',
            priority: 'info',
          });
        }
        break;

      case 'missing_cost_code':
        if (!costCode || !costCode.code) {
          warnings.push({
            rule_type: rule.rule_type,
            message: 'Cost code is missing',
            priority: 'critical',
          });
        }
        break;
    }
  });

  return warnings;
}
