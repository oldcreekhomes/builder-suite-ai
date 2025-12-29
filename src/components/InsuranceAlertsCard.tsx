import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useInsuranceAlerts } from "@/hooks/useInsuranceAlerts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export const InsuranceAlertsCard = () => {
  const { alerts, isLoading, errorCount, warningCount } = useInsuranceAlerts();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Insurance Alerts
          </div>
          {!isLoading && (errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  {errorCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {warningCount}
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground">
              All companies have valid insurance
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={`${alert.companyId}-${alert.insuranceType || index}`}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                >
                  {alert.severity === "error" ? (
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {alert.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.status === "missing" && "No insurance on file"}
                      {alert.status === "expired" && (
                        <>
                          {alert.insuranceType && `${alert.insuranceType}: `}
                          Expired {alert.expirationDate && format(new Date(alert.expirationDate), "MMM d, yyyy")}
                        </>
                      )}
                      {alert.status === "expiring" && (
                        <>
                          {alert.insuranceType && `${alert.insuranceType}: `}
                          Expires {alert.expirationDate && format(new Date(alert.expirationDate), "MMM d, yyyy")}
                          {alert.daysRemaining !== undefined && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {" "}({alert.daysRemaining} days)
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
