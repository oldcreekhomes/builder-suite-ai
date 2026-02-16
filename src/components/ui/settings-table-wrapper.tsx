import * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsTableWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {children}
    </div>
  );
}
