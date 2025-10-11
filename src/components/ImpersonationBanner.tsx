import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedProfile, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedProfile) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex items-center flex-wrap gap-x-2">
            <span className="font-semibold">Viewing as:</span>
            <span>
              {impersonatedProfile.first_name} {impersonatedProfile.last_name}
            </span>
            <span className="text-sm opacity-90">({impersonatedProfile.email})</span>
          </div>
        </div>
        <Button
          onClick={stopImpersonation}
          variant="secondary"
          size="sm"
          className="flex-shrink-0"
        >
          <X className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
};
