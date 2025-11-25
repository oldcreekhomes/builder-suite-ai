import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function JournalEntrySearchDialog({
  open,
  onOpenChange,
  entries,
  onSelectEntry,
  onDeleteEntry,
  isDateLocked,
  projectId,
}: JournalEntrySearchDialogProps) {
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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Journal Entries{projectId ? ' - Project' : ''}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No journal entries found for this project.
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-right">Total Debit</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-right">Total Credit</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-center">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const { totalDebit, totalCredit } = getEntryTotals(entry);
                  const isLocked = isDateLocked(entry.entry_date) || !!entry.reversed_at;
                  const lockReason = entry.reversed_at 
                    ? "This entry has been reversed and cannot be deleted"
                    : "This entry is in a closed accounting period and cannot be deleted";
                  
                  return (
                    <TableRow 
                      key={entry.id} 
                      className="h-8 cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectEntry(entry)}
                    >
                      <TableCell className="px-2 py-1">
                        {format(new Date(entry.entry_date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        {entry.description || '-'}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        ${formatAmount(totalDebit)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        ${formatAmount(totalCredit)}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center justify-center">
                          {/* Journal entries don't have reconciliation - column kept for UI consistency */}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1">
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
