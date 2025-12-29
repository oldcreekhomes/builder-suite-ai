import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDashboardCardSettings } from "@/hooks/useDashboardCardSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PM_CARD_CONFIGS = [
  {
    id: 'insurance_alerts',
    label: 'Insurance Alerts',
    description: 'Show alerts for missing, expired, or expiring insurance on assigned projects'
  },
  {
    id: 'project_warnings',
    label: 'Project Warnings',
    description: 'Show warnings for assigned projects'
  },
  {
    id: 'recent_photos',
    label: 'Recent Photos',
    description: 'Show recent project photos'
  },
  {
    id: 'weather_forecast',
    label: 'Weather Forecast',
    description: 'Show weather forecast for project locations'
  },
];

export function DashboardSettingsTab() {
  const { settings, updateSetting, isLoading } = useDashboardCardSettings();
  const { isOwner, isLoading: isLoadingRole } = useUserRole();
  const [pmOpen, setPmOpen] = useState(true);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [accountantOpen, setAccountantOpen] = useState(false);

  if (isLoading || isLoadingRole) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-sm text-muted-foreground">Loading dashboard settings...</div>
      </div>
    );
  }

  const getSettingEnabled = (dashboardType: string, cardType: string): boolean => {
    const setting = settings.find(
      s => s.dashboard_type === dashboardType && s.card_type === cardType
    );
    return setting?.enabled ?? true;
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Dashboard Settings</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Configure which cards appear on each dashboard view
          </p>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Company-Wide Settings:</strong> These settings apply to all employees in your company. 
            {!isOwner && " Only company owners can modify these settings."}
          </AlertDescription>
        </Alert>

        {/* Project Manager Dashboard */}
        <Collapsible open={pmOpen} onOpenChange={setPmOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
            {pmOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">Project Manager Dashboard</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pl-6 pt-2">
              {PM_CARD_CONFIGS.map((config) => {
                const isEnabled = getSettingEnabled('project_manager', config.id);

                return (
                  <div key={config.id} className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={`pm-${config.id}`} className="text-sm font-normal cursor-pointer">
                        {config.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      id={`pm-${config.id}`}
                      checked={isEnabled}
                      disabled={!isOwner}
                      onCheckedChange={(checked) => 
                        updateSetting.mutate({ 
                          dashboard_type: 'project_manager',
                          card_type: config.id, 
                          enabled: checked,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Owner Dashboard */}
        <Collapsible open={ownerOpen} onOpenChange={setOwnerOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
            {ownerOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">Owner Dashboard</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-6 pt-2">
              <p className="text-xs text-muted-foreground">
                Owner dashboard card settings coming soon
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Accountant Dashboard */}
        <Collapsible open={accountantOpen} onOpenChange={setAccountantOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
            {accountantOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">Accountant Dashboard</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-6 pt-2">
              <p className="text-xs text-muted-foreground">
                Accountant dashboard card settings coming soon
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
