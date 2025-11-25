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
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface JournalEntry {
  id: string;
  entry_date: string;
  description: string | null;
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
  projectId?: string;
}

export function JournalEntrySearchDialog({
  open,
  onOpenChange,
  entries,
  onSelectEntry,
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
                  <TableHead className="h-8 px-2 py-1 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const { totalDebit, totalCredit } = getEntryTotals(entry);
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEntry(entry);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
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
