import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBudgetWarningRules } from "@/hooks/useBudgetWarningRules";

const WARNING_RULE_CONFIGS = [
  {
    id: 'missing_quantity',
    label: 'Missing Quantity',
    description: 'Show warning when quantity is not entered'
  },
  {
    id: 'missing_unit_price',
    label: 'Missing Unit Price',
    description: 'Show warning when unit price is not entered'
  },
  {
    id: 'missing_unit_of_measure',
    label: 'Missing Unit of Measure',
    description: 'Show warning when unit of measure is not defined'
  },
  {
    id: 'budget_zero_or_null',
    label: 'Budget is Zero or Empty',
    description: 'Show warning when total budget is $0 or not calculated'
  },
  {
    id: 'no_bid_selected',
    label: 'No Bid Selected',
    description: 'Show warning when bids are available but none is selected'
  },
  {
    id: 'missing_specifications',
    label: 'Missing Specifications',
    description: 'Show warning when specifications are not attached to cost code'
  }
];

export function BudgetWarningsTab() {
  const { rules, updateRule, isLoading } = useBudgetWarningRules();

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-sm text-muted-foreground">Loading warning rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Budget Warnings</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Configure which warnings to display when reviewing budget items
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          {WARNING_RULE_CONFIGS.map((config) => {
            const rule = rules.find(r => r.rule_type === config.id);
            const isEnabled = rule?.enabled ?? true;

            return (
              <div key={config.id} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor={config.id} className="text-sm font-normal cursor-pointer">
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
                <Switch
                  id={config.id}
                  checked={isEnabled}
                  onCheckedChange={(checked) => 
                    updateRule.mutate({ rule_type: config.id, enabled: checked })
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
