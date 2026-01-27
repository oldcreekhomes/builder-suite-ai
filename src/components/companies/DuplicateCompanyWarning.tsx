import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DuplicateCompanyWarningProps {
  potentialDuplicates: Array<{ id: string; company_name: string }>;
  isChecking?: boolean;
}

export function DuplicateCompanyWarning({ 
  potentialDuplicates, 
  isChecking = false 
}: DuplicateCompanyWarningProps) {
  // Don't show anything if no duplicates found
  if (potentialDuplicates.length === 0 && !isChecking) {
    return null;
  }

  // Show subtle loading state while checking
  if (isChecking && potentialDuplicates.length === 0) {
    return null;
  }

  return (
    <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        <p className="font-medium mb-1">Similar companies already exist:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {potentialDuplicates.map((company) => (
            <li key={company.id} className="text-sm">
              {company.company_name}
            </li>
          ))}
        </ul>
        <p className="text-sm mt-2 text-yellow-700 dark:text-yellow-300">
          You may be creating a duplicate.
        </p>
      </AlertDescription>
    </Alert>
  );
}
