import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const InsuranceAlertsCard = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Shield className="h-5 w-5 text-primary" />
          Insurance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Insurance alerts will appear here
        </p>
      </CardContent>
    </Card>
  );
};
