import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers } from "lucide-react";

/**
 * "Multiple Project Entries" card — Owner Dashboard.
 * A launcher for batch-entry workflows that span many projects. Deposits first;
 * checks/credit cards/JEs can be added later by appending more rows below.
 */
export function MultipleProjectEntriesCard() {
  const navigate = useNavigate();

  const links: { label: string; to: string; description: string }[] = [
    {
      label: "Enter Multiple Deposits",
      to: "/multi-entry/deposits",
      description: "Record deposits across many projects in one screen.",
    },
  ];

  return (
    <div className="rounded-lg border bg-card flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Multiple Project Entries</h3>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {links.map((link) => (
          <button
            key={link.to}
            type="button"
            onClick={() => navigate(link.to)}
            className="w-full text-left rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-colors p-3 group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{link.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {link.description}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
