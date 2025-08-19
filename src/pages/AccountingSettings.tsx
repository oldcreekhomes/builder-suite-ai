
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { useAccounts } from "@/hooks/useAccounts";

export default function AccountingSettings() {
  const { accountingSettings, updateAccountingSettings } = useAccounts();
  
  const [apAccountId, setApAccountId] = useState(accountingSettings?.ap_account_id || "");
  const [wipAccountId, setWipAccountId] = useState(accountingSettings?.wip_account_id || "");

  const handleSave = async () => {
    await updateAccountingSettings.mutateAsync({
      ap_account_id: apAccountId || undefined,
      wip_account_id: wipAccountId || undefined
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader title="Accounting Settings" />
          <div className="flex-1 p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Mappings</CardTitle>
                <CardDescription>
                  Configure default accounts for automated journal entries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ap-account">Accounts Payable Account</Label>
                  <AccountSearchInput
                    value={apAccountId}
                    onChange={setApAccountId}
                    placeholder="Select AP account..."
                    accountType="liability"
                  />
                  <p className="text-sm text-muted-foreground">
                    This account will be credited when bills are posted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wip-account">Work in Progress Account</Label>
                  <AccountSearchInput
                    value={wipAccountId}
                    onChange={setWipAccountId}
                    placeholder="Select WIP account..."
                    accountType="asset"
                  />
                  <p className="text-sm text-muted-foreground">
                    This account will be debited for job cost expenses
                  </p>
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={updateAccountingSettings.isPending}
                >
                  {updateAccountingSettings.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
