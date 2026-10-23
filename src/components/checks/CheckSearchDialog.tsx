import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { formatDateSafe } from "@/utils/dateOnly";
import { toast } from "@/hooks/use-toast";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

function CheckFilesIcons({ files }: { files: Array<{ id: string; file_name: string; file_path: string }> }) {
  const { openCheckAttachment } = useUniversalFilePreviewContext();
  if (!files.length) return null;
  return (
    <div className="flex items-center gap-1">
      {files.map((f) => {
        const Icon = getFileIcon(f.file_name);
        return (
          <button
            key={f.id}
            type="button"
            title={f.file_name}
            onClick={() => openCheckAttachment(f.file_path, f.file_name)}
            className={`${getFileIconColor(f.file_name)} p-0.5 rounded hover:bg-muted`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

interface CheckLine {
  id: string;
  amount: number;
  memo?: string | null;
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
}

const getCheckDescription = (check: any): string => {
  const lines = check.check_lines || [];
  const lineMemos = lines
    .map((line: CheckLine) => line.memo)
    .filter((memo: string | null | undefined) => memo && memo.trim());
  
  const uniqueMemos = [...new Set(lineMemos)];
  
  if (uniqueMemos.length === 1) {
    return uniqueMemos[0] as string;
  } else if (uniqueMemos.length > 1) {
    return uniqueMemos.join(', ');
  }
  
  return check.memo || '';
};

interface CheckSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checks: any[];
  isLoading: boolean;
  isDateLocked: (date: string) => boolean;
  onCheckSelect: (check: any) => void;
  onDeleteCheck: (checkId: string) => Promise<void>;
}

type PersonLike = { first_name?: string | null; last_name?: string | null; email?: string | null } | undefined;

const getFullName = (p: PersonLike): string => {
  if (!p) return '';
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || p.email || '';
};

const getInitials = (p: PersonLike): string => {
  if (!p) return '';
  const first = (p.first_name ?? '').trim();
  const last = (p.last_name ?? '').trim();
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  const local = ((p.email ?? '').trim().split('@')[0]) || '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  return local.slice(0, 2).toUpperCase();
};

export function CheckSearchDialog({
  open,
  onOpenChange,
  checks,
  isLoading,
  isDateLocked,
  onCheckSelect,
  onDeleteCheck,
}: CheckSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter checks based on search query
  const filteredChecks = useMemo(() => {
    if (!searchQuery.trim()) return checks;
    
    const query = searchQuery.toLowerCase();
    return checks.filter(check => {
      const dateStr = formatDateSafe(check.check_date, 'MM/dd/yyyy');
      const payTo = (check.pay_to || '').toLowerCase();
      const memo = (check.memo || '').toLowerCase();
      
      const creator = getFullName(check.creator).toLowerCase();
      return dateStr.includes(query) || payTo.includes(query) || memo.includes(query) || creator.includes(query);
    });
  }, [checks, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateRunningBalance = () => {
    let balance = 0;
    return filteredChecks.map(check => {
      balance -= check.amount; // Checks decrease balance
      return { ...check, balance };
    });
  };

  const handleDelete = async (checkId: string, check: any) => {
    // Check if reconciled
    if (check.reconciled || check.reconciliation_id || check.reconciliation_date) {
      toast({
        title: "Cannot Delete",
        description: "This check is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // Check if in closed period
    if (isDateLocked(check.check_date)) {
      toast({
        title: "Cannot Delete",
        description: "This check is in a closed accounting period and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    await onDeleteCheck(checkId);
  };

  const checksWithBalance = calculateRunningBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Search Checks</DialogTitle>
        </DialogHeader>
        
        {/* Search Input Box */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search checks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus={false}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table containerClassName="max-h-[calc(85vh-8rem)]">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 text-xs">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Pay To</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Entered By</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Balance</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Attachments</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checksWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No checks match your search.' : 'No checks found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  checksWithBalance.map((check) => {
                    const isLocked = isDateLocked(check.check_date) || check.reversed_at;
                    const isReconciled = check.reconciled || !!check.reconciliation_id || !!check.reconciliation_date;
                    const initials = getInitials(check.creator);
                    
                    return (
                      <TableRow
                        key={check.id}
                        className="h-8 cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          onCheckSelect(check);
                          onOpenChange(false);
                        }}
                      >
                        <TableCell className="px-2 py-1 text-xs">
                          {formatDateSafe(check.check_date, 'MM/dd/yyyy')}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">{check.pay_to}</TableCell>
                        <TableCell className="px-2 py-1 text-xs">{getCheckDescription(check)}</TableCell>
                        <TableCell className="px-2 py-1 text-xs text-center">
                          {initials ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                    {initials}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{getFullName(check.creator) || 'Unknown'}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">
                          {formatCurrency(-check.amount)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">
                          {formatCurrency(check.balance)}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          {isReconciled && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <CheckFilesIcons files={check.check_attachments || []} />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {isLocked ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-base">🔒</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This check is locked and cannot be deleted</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DeleteButton
                                onDelete={() => handleDelete(check.id, check)}
                                title="Delete Check"
                                description="Are you sure you want to delete this check? This action cannot be undone."
                                size="sm"
                                variant="ghost"
                                showIcon={true}
                                className="h-6 w-6 p-0"
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
