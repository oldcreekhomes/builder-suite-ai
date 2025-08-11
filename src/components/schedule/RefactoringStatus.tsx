import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export function RefactoringStatus() {
  return (
    <Alert className="mb-4">
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        <strong>Refactoring in Progress:</strong>
        <br />
        ✅ <strong>Working:</strong> Add Task (at end), Delete Task, Task editing
        <br />
        🚧 <strong>Temporarily Disabled:</strong> Indent, Outdent, Add Above/Below, Task Movement
        <br />
        These features will be re-implemented one by one with simpler, more reliable logic.
      </AlertDescription>
    </Alert>
  );
}