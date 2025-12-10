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
      {/* Dashboards Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Dashboards</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Control which dashboard views this employee can access
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="pm-dashboard" className="text-sm font-normal cursor-pointer">
                PM Dashboard
              </Label>
              <p className="text-xs text-muted-foreground">
                Access to the Project Manager dashboard view
              </p>
            </div>
            <Switch
              id="pm-dashboard"
              checked={preferences.can_access_pm_dashboard}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_pm_dashboard: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="owner-dashboard" className="text-sm font-normal cursor-pointer">
                Owner Dashboard
              </Label>
              <p className="text-xs text-muted-foreground">
                Access to the Owner dashboard view with job overview and financials
              </p>
            </div>
            <Switch
              id="owner-dashboard"
              checked={preferences.can_access_owner_dashboard}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_owner_dashboard: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Budgets Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Budgets</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage budget-related permissions
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="can-lock-budgets" className="text-sm font-normal cursor-pointer">
                Lock Budgets
              </Label>
              <p className="text-xs text-muted-foreground">
                Ability to lock and unlock project budgets to prevent changes
              </p>
            </div>
            <Switch
              id="can-lock-budgets"
              checked={preferences.can_lock_budgets}
              onCheckedChange={(checked) => 
                updatePreferences({ can_lock_budgets: checked })
              }
            />
          </div>
        </div>
      </div>

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

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="access-accounting" className="text-sm font-normal cursor-pointer">
                Access Accounting Menu
              </Label>
              <p className="text-xs text-muted-foreground">
                View and access the main accounting dashboard
              </p>
            </div>
            <Switch
              id="access-accounting"
              checked={preferences.can_access_accounting}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_accounting: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="access-manage-bills" className="text-sm font-normal cursor-pointer">
                Access Manage Bills
              </Label>
              <p className="text-xs text-muted-foreground">
                Review, approve, and manage bills
              </p>
            </div>
            <Switch
              id="access-manage-bills"
              checked={preferences.can_access_manage_bills}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_manage_bills: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="access-transactions" className="text-sm font-normal cursor-pointer">
                Access Transactions
              </Label>
              <p className="text-xs text-muted-foreground">
                Create journal entries, write checks, make deposits, and reconcile accounts
              </p>
            </div>
            <Switch
              id="access-transactions"
              checked={preferences.can_access_transactions}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_transactions: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="access-reports" className="text-sm font-normal cursor-pointer">
                Access Reports
              </Label>
              <p className="text-xs text-muted-foreground">
                View and generate financial reports
              </p>
            </div>
            <Switch
              id="access-reports"
              checked={preferences.can_access_reports}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_reports: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="can-close-books" className="text-sm font-normal cursor-pointer">
                Close the Books
              </Label>
              <p className="text-xs text-muted-foreground">
                Ability to close and reopen accounting periods for projects
              </p>
            </div>
            <Switch
              id="can-close-books"
              checked={preferences.can_close_books}
              onCheckedChange={(checked) => 
                updatePreferences({ can_close_books: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="can-undo-reconciliation" className="text-sm font-normal cursor-pointer">
                Undo Reconciliation
              </Label>
              <p className="text-xs text-muted-foreground">
                Ability to reverse completed bank reconciliations and make transactions editable again
              </p>
            </div>
            <Switch
              id="can-undo-reconciliation"
              checked={preferences.can_undo_reconciliation}
              onCheckedChange={(checked) => 
                updatePreferences({ can_undo_reconciliation: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Employees Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Employees</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage employee directory access
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="access-employees" className="text-sm font-normal cursor-pointer">
                Access Employee Directory
              </Label>
              <p className="text-xs text-muted-foreground">
                View and access the employee directory to see other employees
              </p>
            </div>
            <Switch
              id="access-employees"
              checked={preferences.can_access_employees}
              onCheckedChange={(checked) => 
                updatePreferences({ can_access_employees: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Projects</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage project-related permissions
          </p>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="can-edit-projects" className="text-sm font-normal cursor-pointer">
                Edit Projects
              </Label>
              <p className="text-xs text-muted-foreground">
                Ability to edit project settings, manage lots, and update project details
              </p>
            </div>
            <Switch
              id="can-edit-projects"
              checked={preferences.can_edit_projects}
              onCheckedChange={(checked) => 
                updatePreferences({ can_edit_projects: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
