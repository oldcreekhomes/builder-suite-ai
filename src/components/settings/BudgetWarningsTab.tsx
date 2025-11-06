import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useBudgetWarningRules } from "@/hooks/useBudgetWarningRules";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
  },
  {
    id: 'budget_below_threshold',
    label: 'Budget Below Threshold',
    description: 'Show warning when total budget is below a specific dollar amount',
    hasThreshold: true
  }
];

export function BudgetWarningsTab() {
  const { rules, updateRule, isLoading } = useBudgetWarningRules();
  const { isOwner, isLoading: isLoadingRole } = useUserRole();
  const [thresholdValues, setThresholdValues] = useState<Record<string, string>>({});

  // Initialize threshold values from rules
  useEffect(() => {
    const initialThresholds: Record<string, string> = {};
    rules.forEach(rule => {
      if (rule.threshold_value !== null && rule.threshold_value !== undefined) {
        initialThresholds[rule.rule_type] = rule.threshold_value.toString();
      }
    });
    setThresholdValues(initialThresholds);
  }, [rules]);

  if (isLoading || isLoadingRole) {
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
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Company-Wide Settings:</strong> These warning rules apply to all employees in your company. 
            {!isOwner && " Only company owners can modify these settings."}
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3 pl-6">
          {WARNING_RULE_CONFIGS.map((config) => {
            const rule = rules.find(r => r.rule_type === config.id);
            const isEnabled = rule?.enabled ?? true;
            const currentThreshold = thresholdValues[config.id] || '';

            return (
              <div key={config.id} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
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
                    disabled={!isOwner}
                    onCheckedChange={(checked) => 
                      updateRule.mutate({ 
                        rule_type: config.id, 
                        enabled: checked,
                        threshold_value: config.hasThreshold ? parseFloat(currentThreshold) || 0 : undefined
                      })
                    }
                  />
                </div>
                
                {config.hasThreshold && isEnabled && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label htmlFor={`${config.id}-threshold`} className="text-xs text-muted-foreground whitespace-nowrap">
                      Threshold Amount:
                    </Label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">$</span>
                      <Input
                        id={`${config.id}-threshold`}
                        type="number"
                        min="0"
                        step="1"
                        value={currentThreshold}
                        disabled={!isOwner}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setThresholdValues(prev => ({ ...prev, [config.id]: newValue }));
                        }}
                        onBlur={() => {
                          updateRule.mutate({
                            rule_type: config.id,
                            enabled: isEnabled,
                            threshold_value: parseFloat(currentThreshold) || 0
                          });
                        }}
                        className="w-32"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
