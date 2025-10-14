import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedProfile, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedProfile) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-3 max-w-fit">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Viewing as:</span>
        <span className="whitespace-nowrap">
          {impersonatedProfile.first_name} {impersonatedProfile.last_name}
        </span>
      </div>
      <Button
        onClick={stopImpersonation}
        variant="secondary"
        size="sm"
        className="flex-shrink-0 h-7 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Exit
      </Button>
    </div>
  );
};
