import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface JournalEntry {
  id: string;
  entry_date: string;
  description: string | null;
  posted_at?: string | null;
  reversed_at?: string | null;
  lines?: Array<{
    debit: number;
    credit: number;
    lot_id?: string | null;
    project_lots?: {
      id: string;
      lot_name: string | null;
      lot_number: number | null;
    } | null;
    cost_codes?: {
      id: string;
      name: string;
      code: string;
    } | null;
    accounts?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }>;
}

interface JournalEntrySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entry: JournalEntry) => void;
  isDateLocked: (date: string) => boolean;
  projectId?: string;
}

interface LotBreakdownItem {
  categoryName: string;
  lots: Array<{ name: string; amount: number }>;
}

const getLotAllocationData = (lines: JournalEntry['lines']) => {
  if (!lines || lines.length === 0) {
    return { display: '-', breakdown: [], totalAmount: 0, count: 0 };
  }

  // Group lines by category (cost code or account), then by lot
  const categoryMap = new Map<string, Map<string, number>>();
  let totalAmount = 0;
  const lotsWithData = new Set<string>();

  for (const line of lines) {
    const amount = (line.debit || 0) + (line.credit || 0);
    if (amount === 0) continue;
    
    totalAmount += line.debit || 0;
    
    const lotInfo = line.project_lots;
    if (!lotInfo) continue;
    
    lotsWithData.add(lotInfo.id);
    const lotName = lotInfo.lot_name || `Lot ${lotInfo.lot_number}` || 'Unknown Lot';
    
    // Determine category name (cost code or account)
    let categoryName = 'General';
    if (line.cost_codes) {
      categoryName = `${line.cost_codes.code} - ${line.cost_codes.name}`;
    } else if (line.accounts) {
      categoryName = `${line.accounts.code} - ${line.accounts.name}`;
    }
    
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, new Map());
    }
    const lotMap = categoryMap.get(categoryName)!;
    lotMap.set(lotName, (lotMap.get(lotName) || 0) + amount);
  }

  const count = lotsWithData.size;
  
  if (count === 0) {
    return { display: '-', breakdown: [], totalAmount, count: 0 };
  }

  // Build breakdown for tooltip
  const breakdown: LotBreakdownItem[] = [];
  categoryMap.forEach((lotMap, categoryName) => {
    const lots: Array<{ name: string; amount: number }> = [];
    lotMap.forEach((amount, lotName) => {
      lots.push({ name: lotName, amount });
    });
    breakdown.push({ categoryName, lots });
  });

  // Determine display
  if (count === 1) {
    // Get the single lot name
    const firstLotId = Array.from(lotsWithData)[0];
    const firstLine = lines.find(l => l.project_lots?.id === firstLotId);
    const lotInfo = firstLine?.project_lots;
    const display = lotInfo?.lot_name || `Lot ${lotInfo?.lot_number}` || 'Lot';
    return { display, breakdown, totalAmount, count };
  }

  return { display: `+${count}`, breakdown, totalAmount, count };
};

export function JournalEntrySearchDialog({
  open,
  onOpenChange,
  entries,
  onSelectEntry,
  onDeleteEntry,
  isDateLocked,
  projectId,
}: JournalEntrySearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => {
      const dateStr = format(new Date(entry.entry_date), 'MM/dd/yyyy');
      const description = (entry.description || '').toLowerCase();
      
      return dateStr.includes(query) || description.includes(query);
    });
  }, [entries, searchQuery]);

  // Calculate totals for each entry
  const getEntryTotals = (entry: JournalEntry) => {
    const totalDebit = entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
    const totalCredit = entry.lines?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
    return { totalDebit, totalCredit };
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-base">
            Journal Entries{projectId ? ' - Project' : ''}
          </DialogTitle>
        </DialogHeader>
        
        {/* Search Input Box */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus={false}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No journal entries match your search.' : 'No journal entries found for this project.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 text-xs">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Journal Entry #</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Address</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Total Debit</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Total Credit</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, index) => {
                  const { totalDebit, totalCredit } = getEntryTotals(entry);
                  const isLocked = isDateLocked(entry.entry_date) || !!entry.reversed_at;
                  const lockReason = entry.reversed_at 
                    ? "This entry has been reversed and cannot be deleted"
                    : "This entry is in a closed accounting period and cannot be deleted";
                  const { display, breakdown, totalAmount, count } = getLotAllocationData(entry.lines);
                  
                  return (
                    <TableRow 
                      key={entry.id} 
                      className="h-8 cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectEntry(entry)}
                    >
                      <TableCell className="px-2 py-1 text-xs">
                        {format(new Date(entry.entry_date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        JE-{String(filteredEntries.length - index).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        {entry.description || '-'}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        {count <= 1 ? (
                          display
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-default underline decoration-dotted">
                                {display}
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-2">
                                  {breakdown.map((cc, i) => (
                                    <div key={i}>
                                      <div className="font-medium text-xs">{cc.categoryName}</div>
                                      <div className="pl-2 space-y-0.5">
                                        {cc.lots.map((lot, j) => (
                                          <div key={j} className="flex justify-between gap-4 text-xs">
                                            <span className="text-muted-foreground">{lot.name}:</span>
                                            <span>${lot.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="border-t pt-1 flex justify-between font-medium text-xs">
                                    <span>Total:</span>
                                    <span>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs text-right">
                        ${formatAmount(totalDebit)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs text-right">
                        ${formatAmount(totalCredit)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        <div className="flex items-center justify-center">
                          {/* Journal entries don't have reconciliation - column kept for UI consistency */}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-not-allowed text-base">🔒</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{lockReason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <DeleteButton
                              onDelete={() => onDeleteEntry(entry)}
                              title="Delete Journal Entry"
                              description="Are you sure you want to delete this journal entry? This action cannot be undone."
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
