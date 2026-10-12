import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import type { MultiCheckBatchCheck } from "@/hooks/useMultiCheckBatches";

const money = (amount: number) => amount.toLocaleString("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function SummaryText({ text }: { text: string }) {
  return <TooltipProvider><Tooltip><TooltipTrigger asChild>
    <span className="block truncate">{text}</span>
  </TooltipTrigger><TooltipContent className="max-w-sm break-words">{text}</TooltipContent></Tooltip></TooltipProvider>;
}

export function CheckSummaryAddress({ check }: { check: MultiCheckBatchCheck }) {
  const lots = new Map<string, { name: string; order: number; cents: number }>();
  for (const line of check.lines) {
    if (!line.lot_id) continue;
    const existing = lots.get(line.lot_id);
    if (existing) existing.cents += Math.round(line.amount * 100);
    else lots.set(line.lot_id, {
      name: line.project_lots?.lot_name || `Lot ${line.project_lots?.lot_number ?? "—"}`,
      order: line.project_lots?.lot_number ?? Number.MAX_SAFE_INTEGER,
      cents: Math.round(line.amount * 100),
    });
  }
  const breakdown = Array.from(lots.values()).sort((a, b) => a.order - b.order);
  if (breakdown.length === 0) return <span>—</span>;
  if (breakdown.length === 1) return <SummaryText text={breakdown[0].name} />;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild>
    <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()} aria-label={`${breakdown.length} lots allocation`}>+{breakdown.length}</Button>
  </TooltipTrigger><TooltipContent className="max-w-xs">
    <div className="space-y-2">
      <div className="font-medium text-xs">{Array.from(new Set(check.lines.map(l => l.label))).join(", ")}</div>
      <div className="max-h-80 overflow-y-auto space-y-0.5 pl-2">
        {breakdown.map((lot, i) => <div key={i} className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">{lot.name}:</span><span>{money(lot.cents / 100)}</span>
        </div>)}
      </div>
      <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs"><span>Total:</span><span>{money(check.amount)}</span></div>
    </div>
  </TooltipContent></Tooltip></TooltipProvider>;
}

export function CheckSummaryFiles({ check }: { check: MultiCheckBatchCheck }) {
  const { openCheckAttachment } = useUniversalFilePreviewContext();
  if (!check.files.length) return <span>—</span>;
  return <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
    {check.files.map(file => <TooltipProvider key={file.id}><Tooltip><TooltipTrigger asChild>
      <Button variant="ghost" size="sm" aria-label={`View ${file.file_name}`} onClick={() =>
        openCheckAttachment(file.file_path, file.file_name, {
          id: file.id, size: file.file_size, mimeType: file.content_type || undefined,
        })}>
        <FileText className="h-4 w-4 text-destructive" />
      </Button>
    </TooltipTrigger><TooltipContent>{file.file_name}</TooltipContent></Tooltip></TooltipProvider>)}
  </div>;
}