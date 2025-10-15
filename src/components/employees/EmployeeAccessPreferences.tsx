import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

interface EmployeeAccessPreferencesProps {
  employeeId: string;
}

export function EmployeeAccessPreferences({ employeeId }: EmployeeAccessPreferencesProps) {
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences(employeeId);

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Accounting Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Accounting</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage accounting-related alerts and permissions
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="bill-payment-alerts" className="text-sm font-normal cursor-pointer">
                Dashboard Project Alerts - Show Bills Ready to Pay
              </Label>
              <p className="text-xs text-muted-foreground">
                Display alerts on the dashboard for bills that are approved and ready to be paid
              </p>
            </div>
            <Switch
              id="bill-payment-alerts"
              checked={preferences.receive_bill_payment_alerts}
              onCheckedChange={(checked) => 
                updatePreferences({ receive_bill_payment_alerts: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
