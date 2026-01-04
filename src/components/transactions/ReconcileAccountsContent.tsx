import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useProject } from "@/hooks/useProject";
import { useBankReconciliation, AllocationBreakdown } from "@/hooks/useBankReconciliation";
import { useUndoReconciliationPermissions } from "@/hooks/useUndoReconciliationPermissions";
import { format, addMonths, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, CheckCircle2, Lock, LockOpen, ChevronDown, ChevronUp, Loader2, ArrowUpDown, ArrowUp, ArrowDown, StickyNote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEditCell } from "@/components/schedule/InlineEditCell";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// Helper to get allocation display text and determine if tooltip is needed
function getAllocationDisplay(allocations: AllocationBreakdown[] | undefined, labelType: 'code' | 'account' = 'code'): {
  display: string;
  hasMultiple: boolean;
  breakdown: AllocationBreakdown[];
} {
  if (!allocations || allocations.length === 0) {
    return { display: '-', hasMultiple: false, breakdown: [] };
  }
  
  const first = allocations[0];
  const displayText = `${first.code}: ${first.name}`;
  const truncatedDisplay = displayText.length > 18 ? displayText.substring(0, 16) + '...' : displayText;
  
  if (allocations.length === 1 && first.lots.length <= 1) {
    return { display: truncatedDisplay, hasMultiple: false, breakdown: allocations };
  }
  
  const additionalCount = allocations.length - 1 + (first.lots.length > 1 ? 1 : 0);
  return { 
    display: additionalCount > 0 ? `${truncatedDisplay} +${additionalCount}` : truncatedDisplay, 
    hasMultiple: true, 
    breakdown: allocations 
  };
}

// Component to render allocation cell with optional tooltip
function AllocationCell({ allocations, labelType = 'code' }: { allocations: AllocationBreakdown[] | undefined; labelType?: 'code' | 'account' }) {
  const { display, hasMultiple, breakdown } = getAllocationDisplay(allocations, labelType);
  
  const formatCurrencyTooltip = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  
  if (!hasMultiple) {
    return <span className="text-sm truncate max-w-[120px] inline-block">{display}</span>;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm truncate max-w-[120px] inline-block cursor-help underline decoration-dotted">
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2 text-xs">
          {breakdown.map((alloc, idx) => (
            <div key={idx}>
              <div className="font-semibold">{alloc.code}: {alloc.name}</div>
              {alloc.lots.length > 0 && (
                <div className="pl-2 space-y-0.5">
                  {alloc.lots.map((lot, lotIdx) => (
                    <div key={lotIdx} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{lot.name}:</span>
                      <span>{formatCurrencyTooltip(lot.amount)}</span>
                    </div>
                  ))}
                  {alloc.lots.length > 1 && (
                    <div className="flex justify-between gap-4 font-medium border-t pt-0.5 mt-0.5">
                      <span>Total:</span>
                      <span>{formatCurrencyTooltip(alloc.total)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface ReconcileAccountsContentProps {
  projectId?: string;
}

export function ReconcileAccountsContent({ projectId }: ReconcileAccountsContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId!);
  const { accounts } = useAccounts();

  // Restore selected bank account from localStorage
  const storageKey = `reconciliation_bank_${projectId || 'global'}`;
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(() => {
    return localStorage.getItem(storageKey);
  });
  const [statementDate, setStatementDate] = useState<Date>();
  const [hideTransactionsAfterDate, setHideTransactionsAfterDate] = useState<Date | undefined>();
  const [beginningBalance, setBeginningBalance] = useState<string>("");
  const [endingBalance, setEndingBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [currentReconciliationId, setCurrentReconciliationId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [lastCompletedDate, setLastCompletedDate] = useState<Date | null>(null);
  const [isReconciliationMode, setIsReconciliationMode] = useState(false);
  const [initialCheckedTransactionsLoaded, setInitialCheckedTransactionsLoaded] = useState(false);
  const [hasLoadedFromDatabase, setHasLoadedFromDatabase] = useState(false);
  
  // Sorting state for Outstanding Checks & Bill Payments
  const [checksSortColumn, setChecksSortColumn] = useState<'date' | 'amount' | null>(null);
  const [checksSortDirection, setChecksSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Sorting state for Outstanding Deposits
  const [depositsSortColumn, setDepositsSortColumn] = useState<'date' | 'amount' | null>(null);
  const [depositsSortDirection, setDepositsSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedReconciliationNotes, setSelectedReconciliationNotes] = useState("");
  const [selectedReconciliationDate, setSelectedReconciliationDate] = useState("");
  
  // Track if we need to save on unmount
  const hasUnsavedChangesRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to always capture current state for auto-save (prevents stale closure issues)
  const checkedTransactionsRef = useRef<Set<string>>(new Set());
  const statementDateRef = useRef<Date | undefined>();
  const endingBalanceRef = useRef<string>("");
  const notesRef = useRef<string>("");
  const beginningBalanceRef = useRef<string>("");
  const currentReconciliationIdRef = useRef<string | null>(null);

  const { 
    useReconciliationTransactions,
    useReconciliationHistory,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
    updateCheckTransaction,
    updateDepositTransaction,
    updateBillPaymentTransaction,
    undoReconciliation,
  } = useBankReconciliation();
  
  const { canUndoReconciliation } = useUndoReconciliationPermissions();
  const { toast } = useToast();
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [selectedReconciliationToUndo, setSelectedReconciliationToUndo] = useState<any>(null);
  const [uncheckedWarningDialogOpen, setUncheckedWarningDialogOpen] = useState(false);
  const [uncheckedWarningMessage, setUncheckedWarningMessage] = useState("");

  const {
    data: reconciliationHistory,
    isLoading: historyLoading 
  } = useReconciliationHistory(
    projectId || null,
    selectedBankAccountId
  );

  const { data: transactions, isLoading: transactionsLoading } = useReconciliationTransactions(
    projectId || null,
    selectedBankAccountId
  );

  // Separate query for in-progress reconciliation (since history now only shows completed)
  // CRITICAL: Must scope by project_id to maintain project independence
  const { data: inProgressReconciliation, isLoading: isLoadingInProgress } = useQuery({
    queryKey: ['in-progress-reconciliation', projectId, selectedBankAccountId],
    queryFn: async () => {
      if (!selectedBankAccountId) return null;
      let query = supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('bank_account_id', selectedBankAccountId)
        .eq('status', 'in_progress');
      
      // Scope by project_id for project independence
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }
      
      const { data } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedBankAccountId,
    refetchOnWindowFocus: false,  // Prevent refetch from overwriting user edits
    staleTime: Infinity,          // Never auto-refetch
  });

  const bankAccounts = accounts?.filter(
    (acc) => acc.type === 'asset' && acc.is_active
  ) || [];


  const clearedChecks = transactions?.checks.filter(c => checkedTransactions.has(c.id)) || [];
  const clearedDeposits = transactions?.deposits.filter(d => checkedTransactions.has(d.id)) || [];
  
  const totalClearedChecks = clearedChecks.reduce((sum, c) => sum + c.amount, 0);
  const totalClearedDeposits = clearedDeposits.reduce((sum, d) => sum + d.amount, 0);
  
  const calculatedEndingBalance = 
    parseFloat(beginningBalance || "0") + totalClearedDeposits - totalClearedChecks;
  
  const difference = calculatedEndingBalance - parseFloat(endingBalance || "0");

  // Compute visible transactions for "Select All" functionality
  const visibleChecks = transactions?.checks
    .filter(c => !c.reconciled)
    .filter(c => !hideTransactionsAfterDate || new Date(c.date) <= hideTransactionsAfterDate) || [];

  const visibleDeposits = transactions?.deposits
    .filter(d => !d.reconciled)
    .filter(d => !hideTransactionsAfterDate || new Date(d.date) <= hideTransactionsAfterDate) || [];

  // "Select All" checkbox states
  const allChecksSelected = visibleChecks.length > 0 && 
    visibleChecks.every(check => checkedTransactions.has(check.id));
  const someChecksSelected = visibleChecks.some(check => checkedTransactions.has(check.id));

  const allDepositsSelected = visibleDeposits.length > 0 && 
    visibleDeposits.every(deposit => checkedTransactions.has(deposit.id));
  const someDepositsSelected = visibleDeposits.some(deposit => checkedTransactions.has(deposit.id));

  // "Select All" handlers
  const handleSelectAllChecks = (checked: boolean) => {
    setCheckedTransactions(prev => {
      const newSet = new Set(prev);
      visibleChecks.forEach(check => {
        if (checked) {
          newSet.add(check.id);
        } else {
          newSet.delete(check.id);
        }
      });
      checkedTransactionsRef.current = newSet;
      return newSet;
    });
    hasUnsavedChangesRef.current = true;
  };

  const handleSelectAllDeposits = (checked: boolean) => {
    setCheckedTransactions(prev => {
      const newSet = new Set(prev);
      visibleDeposits.forEach(deposit => {
        if (checked) {
          newSet.add(deposit.id);
        } else {
          newSet.delete(deposit.id);
        }
      });
      checkedTransactionsRef.current = newSet;
      return newSet;
    });
    hasUnsavedChangesRef.current = true;
  };

  // Persist selected bank account to localStorage
  useEffect(() => {
    if (selectedBankAccountId) {
      localStorage.setItem(storageKey, selectedBankAccountId);
    }
  }, [selectedBankAccountId, storageKey]);

  // Initialize checked transactions from saved in-progress reconciliation OR already reconciled transactions
  useEffect(() => {
    if (initialCheckedTransactionsLoaded) return;
    
    // If transactions query completed (even if empty), mark as loaded to stop spinner
    if (transactions !== undefined) {
      // Start with already reconciled transactions
      const reconciledIds = new Set<string>();
      if (transactions) {
        [...transactions.checks, ...transactions.deposits].forEach(t => {
          if (t.reconciled) {
            reconciledIds.add(t.id);
          }
        });
      }
      
      // Add saved checked transaction IDs from in-progress reconciliation
      if (inProgressReconciliation?.checked_transaction_ids?.length > 0) {
        inProgressReconciliation.checked_transaction_ids.forEach((id: string) => {
          reconciledIds.add(id);
        });
      }
      
      setCheckedTransactions(reconciledIds);
      setInitialCheckedTransactionsLoaded(true);
    }
  }, [inProgressReconciliation, transactions, initialCheckedTransactionsLoaded]);

  // Reset load flags when bank account changes to a DIFFERENT value
  const prevBankAccountIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Only reset if actually changing to a different bank account (not on initial mount)
    if (prevBankAccountIdRef.current !== null && 
        prevBankAccountIdRef.current !== selectedBankAccountId) {
      setInitialCheckedTransactionsLoaded(false);
      setHasLoadedFromDatabase(false);
    }
    prevBankAccountIdRef.current = selectedBankAccountId;
  }, [selectedBankAccountId]);

  // Sync hideTransactionsAfterDate with statementDate
  useEffect(() => {
    if (statementDate) {
      setHideTransactionsAfterDate(statementDate);
    }
  }, [statementDate]);

  // Keep refs in sync with state (for auto-save to always have current values)
  // NOTE: endingBalanceRef is synced immediately in onChange handler, not here
  useEffect(() => {
    checkedTransactionsRef.current = checkedTransactions;
  }, [checkedTransactions]);
  
  useEffect(() => {
    statementDateRef.current = statementDate;
  }, [statementDate]);
  
  // REMOVED: endingBalanceRef sync - now done immediately in onChange handler
  
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  
  useEffect(() => {
    beginningBalanceRef.current = beginningBalance;
  }, [beginningBalance]);
  
  useEffect(() => {
    currentReconciliationIdRef.current = currentReconciliationId;
  }, [currentReconciliationId]);
  
  // Ref to always hold the latest autoSave function (prevents stale closure issues)
  const autoSaveRef = useRef<(() => Promise<void>) | null>(null);
  
  // Ref to track if initial restoration from database is complete
  // Auto-save is blocked until this is true to prevent overwriting saved data
  const isRestoredRef = useRef(false);
  
  // Reset restoration flag when bank account changes (new reconciliation session)
  useEffect(() => {
    isRestoredRef.current = false;
  }, [selectedBankAccountId]);

  // REMOVED: The useEffect that auto-set hasUnsavedChangesRef on initialization
  // This was causing race conditions where auto-save would fire with empty state
  // Now hasUnsavedChangesRef is ONLY set by explicit user actions (onChange handlers)

  // Auto-save function - uses refs to always capture current state
  const autoSave = useCallback(async () => {
    const currentStatementDate = statementDateRef.current;
    const currentCheckedTransactions = checkedTransactionsRef.current;
    const currentEndingBalance = endingBalanceRef.current;
    const currentNotes = notesRef.current;
    const currentBeginningBalance = beginningBalanceRef.current;
    let currentReconciliationIdValue = currentReconciliationIdRef.current;
    
    // SAFETY CHECK: Skip auto-save if there's no meaningful data to save
    // This prevents overwriting existing saved data with empty values
    if (!currentEndingBalance && !currentReconciliationIdValue && Object.keys(currentCheckedTransactions).length === 0) {
      console.log('⏭️ Auto-save skipped - no ending balance, no existing record, and no checked transactions');
      return;
    }
    
    // DEBUG: Log values being saved (temporary)
    console.log('🔄 Auto-save triggered with values:', {
      endingBalanceRef: currentEndingBalance,
      beginningBalanceRef: currentBeginningBalance,
      statementDateRef: currentStatementDate,
      hasUnsavedChanges: hasUnsavedChangesRef.current,
      isRestored: isRestoredRef.current,
      selectedBankAccountId,
    });
    
    // CRITICAL: Skip auto-save until restoration from database is complete
    // This prevents empty initial state from overwriting saved data
    if (!isRestoredRef.current) {
      console.log('⏭️ Auto-save skipped - restoration not complete yet');
      return;
    }
    
    if (!selectedBankAccountId || !currentStatementDate || !user || !hasUnsavedChangesRef.current) {
      console.log('⏭️ Auto-save skipped - missing required data');
      return;
    }

    try {
      const reconciliationData = {
        owner_id: user.id,
        project_id: projectId || null,
        bank_account_id: selectedBankAccountId,
        statement_date: format(currentStatementDate, 'yyyy-MM-dd'),
        statement_beginning_balance: parseFloat(currentBeginningBalance || "0"),
        statement_ending_balance: parseFloat(currentEndingBalance || "0"),
        reconciled_balance: calculatedEndingBalance,
        difference: difference,
        status: 'in_progress' as const,
        notes: currentNotes,
        checked_transaction_ids: Array.from(currentCheckedTransactions),
      };

      // If no ID, check if there's an existing in-progress to update (prevents duplicates)
      // If no ID, check if there's an existing in-progress to update (prevents duplicates)
      // CRITICAL: Must scope by project_id to maintain project independence
      if (!currentReconciliationIdValue) {
        let existingQuery = supabase
          .from('bank_reconciliations')
          .select('id')
          .eq('bank_account_id', selectedBankAccountId)
          .eq('status', 'in_progress');
        
        if (projectId) {
          existingQuery = existingQuery.eq('project_id', projectId);
        } else {
          existingQuery = existingQuery.is('project_id', null);
        }
        
        const { data: existing } = await existingQuery.limit(1).maybeSingle();
        
        if (existing) {
          currentReconciliationIdValue = existing.id;
          setCurrentReconciliationId(existing.id);
          currentReconciliationIdRef.current = existing.id;
        }
      }

      if (currentReconciliationIdValue) {
        await supabase
          .from('bank_reconciliations')
          .update(reconciliationData)
          .eq('id', currentReconciliationIdValue);
      } else {
        const { data: result } = await supabase
          .from('bank_reconciliations')
          .insert([reconciliationData])
          .select()
          .single();
        if (result) {
          setCurrentReconciliationId(result.id);
          currentReconciliationIdRef.current = result.id;
        }
      }
      console.log('✅ Auto-save successful, statement_ending_balance saved as:', parseFloat(currentEndingBalance || "0"));
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error('Error auto-saving reconciliation:', error);
    }
  }, [selectedBankAccountId, user, projectId, calculatedEndingBalance, difference]);

  // Keep autoSaveRef updated with the latest autoSave function
  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  // Auto-save on unmount or when leaving the tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChangesRef.current && autoSaveRef.current) {
        autoSaveRef.current();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current && autoSaveRef.current) {
        autoSaveRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save on unmount using the ref (always gets latest function)
      if (hasUnsavedChangesRef.current && autoSaveRef.current) {
        console.log('🚪 Component unmounting - calling autoSave via ref');
        autoSaveRef.current();
      }
    };
  }, []); // Empty deps - setup once, use ref for latest autoSave

  // Debounced auto-save when state changes
  useEffect(() => {
    if (!initialCheckedTransactionsLoaded || !selectedBankAccountId || !statementDate) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        autoSave();
      }
    }, 3000); // Auto-save 3 seconds after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [checkedTransactions, endingBalance, notes, autoSave, initialCheckedTransactionsLoaded, selectedBankAccountId, statementDate]);

  const handleToggleTransaction = (id: string) => {
    setCheckedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // Sync ref immediately so auto-save always has current value (prevents race condition)
      checkedTransactionsRef.current = newSet;
      return newSet;
    });
    hasUnsavedChangesRef.current = true;
  };

  const handleUpdateTransaction = async (id: string, type: 'check' | 'deposit' | 'bill_payment' | 'journal_entry', field: string, value: any) => {
    try {
      if (type === 'check') {
        await updateCheckTransaction.mutateAsync({ id, field, value });
      } else if (type === 'deposit') {
        await updateDepositTransaction.mutateAsync({ id, field, value });
      } else if (type === 'bill_payment') {
        await updateBillPaymentTransaction.mutateAsync({ 
          id, 
          field, 
          value,
          bankAccountId: selectedBankAccountId!
        });
      }
      // Journal entries are read-only in reconciliation view - no update handler needed
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    // Validate statement date is after last completed reconciliation
    if (lastCompletedDate && statementDate <= lastCompletedDate) {
      toast({
        title: "Invalid Date",
        description: `Statement date must be after ${format(lastCompletedDate, "PP")} (last reconciliation date).`,
        variant: "destructive"
      });
      return;
    }

    try {
      const reconciliationData = {
        owner_id: user!.id,
        project_id: projectId || null,
        bank_account_id: selectedBankAccountId,
        statement_date: format(statementDate, 'yyyy-MM-dd'),
        statement_beginning_balance: parseFloat(beginningBalance || "0"),
        statement_ending_balance: parseFloat(endingBalance || "0"),
        reconciled_balance: calculatedEndingBalance,
        difference: difference,
        status: 'in_progress' as const,
        notes,
        checked_transaction_ids: Array.from(checkedTransactions),
      };

      if (currentReconciliationId) {
        await updateReconciliation.mutateAsync({
          id: currentReconciliationId,
          data: reconciliationData,
        });
      } else {
        const result = await createReconciliation.mutateAsync(reconciliationData);
        setCurrentReconciliationId(result.id);
      }
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error('Error saving reconciliation:', error);
    }
  };

  const handleFinishReconciliation = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    // Validate statement date is after last completed reconciliation
    if (lastCompletedDate && statementDate <= lastCompletedDate) {
      toast({
        title: "Invalid Date",
        description: `Statement date must be after ${format(lastCompletedDate, "PP")} (last reconciliation date).`,
        variant: "destructive"
      });
      return;
    }

    if (Math.abs(difference) > 0.01) {
      alert(`The difference must be $0.00 to complete reconciliation. Current difference: $${difference.toFixed(2)}`);
      return;
    }

    // Check for outstanding transactions when difference is zero
    const uncheckedChecks = transactions?.checks.filter(c => !c.reconciled && !checkedTransactions.has(c.id)) || [];
    const uncheckedDeposits = transactions?.deposits.filter(d => !d.reconciled && !checkedTransactions.has(d.id)) || [];
    
    if ((uncheckedChecks.length > 0 || uncheckedDeposits.length > 0) && Math.abs(difference) < 0.01) {
      const message = `You have ${uncheckedChecks.length} unchecked check(s)/bill payment(s) and ${uncheckedDeposits.length} unchecked deposit(s), but the difference is $0.00. This may indicate that transactions were manually adjusted to balance without being properly reconciled.`;
      setUncheckedWarningMessage(message);
      setUncheckedWarningDialogOpen(true);
      return;
    }

    await completeReconciliation();
  };

  const completeReconciliation = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    try {
      const reconciliationData = {
        owner_id: user!.id,
        project_id: projectId || null,
        bank_account_id: selectedBankAccountId,
        statement_date: format(statementDate, 'yyyy-MM-dd'),
        statement_beginning_balance: parseFloat(beginningBalance || "0"),
        statement_ending_balance: parseFloat(endingBalance || "0"),
        reconciled_balance: calculatedEndingBalance,
        difference: 0,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        completed_by: user!.id,
        notes,
      };

      let reconciliationId = currentReconciliationId;
      if (reconciliationId) {
        await updateReconciliation.mutateAsync({
          id: reconciliationId,
          data: reconciliationData,
        });
      } else {
        const result = await createReconciliation.mutateAsync(reconciliationData);
        reconciliationId = result.id;
      }

      const dateStr = format(statementDate, 'yyyy-MM-dd');
      const promises = [];

      for (const check of transactions?.checks || []) {
        const shouldBeReconciled = checkedTransactions.has(check.id);
        if (check.reconciled !== shouldBeReconciled) {
          promises.push(
            markTransactionReconciled.mutateAsync({
              type: check.type,
              id: check.id,
              reconciled: shouldBeReconciled,
              reconciliationId: shouldBeReconciled ? reconciliationId! : undefined,
              reconciliationDate: shouldBeReconciled ? dateStr : undefined,
            })
          );
        }
      }

      for (const deposit of transactions?.deposits || []) {
        const shouldBeReconciled = checkedTransactions.has(deposit.id);
        if (deposit.reconciled !== shouldBeReconciled) {
          promises.push(
            markTransactionReconciled.mutateAsync({
              type: deposit.type,
              id: deposit.id,
              reconciled: shouldBeReconciled,
              reconciliationId: shouldBeReconciled ? reconciliationId! : undefined,
              reconciliationDate: shouldBeReconciled ? dateStr : undefined,
            })
          );
        }
      }

      await Promise.all(promises);
      
      // Show success toast and reset form for next month
      toast({
        title: "Reconciliation Completed",
        description: "The reconciliation has been saved successfully. You can now start the next month.",
      });
      
      // Reset form for next month
      setEndingBalance("");
      setNotes("");
      setCurrentReconciliationId(null);
      setCheckedTransactions(new Set());
      setIsReconciliationMode(false);
      setInitialCheckedTransactionsLoaded(false);
      hasUnsavedChangesRef.current = false;
      // The useEffect will automatically populate the new beginning balance and statement date
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      toast({
        title: "Error",
        description: "Failed to complete reconciliation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Auto-populate beginning balance and statement date from reconciliation history
  // ONLY runs on initial load, not on refetches (prevents overwriting user edits)
  useEffect(() => {
    // CRITICAL: Wait for query to finish loading before deciding if there's data to restore
    // This prevents the race condition where restoration runs with undefined data
    if (isLoadingInProgress) {
      return;
    }
    
    if (!selectedBankAccountId) {
      setBeginningBalance("0");
      setCurrentReconciliationId(null);
      setLastCompletedDate(null);
      return;
    }

    // Get last completed from history (history now only contains completed records)
    const lastCompleted = reconciliationHistory?.[0];
    
    // Beginning balance ALWAYS comes from last completed reconciliation (or $0 if none)
    const correctBeginningBalance = lastCompleted?.statement_ending_balance ?? 0;
    
    // Track last completed date for calendar validation - parse without timezone shift
    if (lastCompleted) {
      const [year, month, day] = lastCompleted.statement_date.split('-').map(Number);
      setLastCompletedDate(new Date(year, month - 1, day)); // Creates local midnight
    } else {
      setLastCompletedDate(null);
    }

    // Only restore from database on INITIAL load, never on refetches
    if (hasLoadedFromDatabase) {
      // Still update beginning balance (derived from completed history, not user input)
      setBeginningBalance(String(correctBeginningBalance));
      return;
    }

    // Reset unsaved changes flag at START of restoration to prevent stale auto-saves
    hasUnsavedChangesRef.current = false;
    
    // Restore in-progress reconciliation state - ONLY on initial load
    if (inProgressReconciliation) {
      setCurrentReconciliationId(inProgressReconciliation.id);
      currentReconciliationIdRef.current = inProgressReconciliation.id; // Sync ref immediately
      setBeginningBalance(String(correctBeginningBalance));
      beginningBalanceRef.current = String(correctBeginningBalance);
      
      // Parse without timezone shift - creates local midnight
      if (inProgressReconciliation.statement_date) {
        const [year, month, day] = inProgressReconciliation.statement_date.split('-').map(Number);
        const restoredDate = new Date(year, month - 1, day);
        setStatementDate(restoredDate);
        statementDateRef.current = restoredDate;
        setHideTransactionsAfterDate(restoredDate); // Also set hide date
      } else if (lastCompleted) {
        // Calculate default from last completed if no saved statement date
        const [lcYear, lcMonth, lcDay] = lastCompleted.statement_date.split('-').map(Number);
        const lastCompletedLocal = new Date(lcYear, lcMonth - 1, lcDay);
        const defaultDate = endOfMonth(addMonths(lastCompletedLocal, 1));
        setStatementDate(defaultDate);
        statementDateRef.current = defaultDate;
        setHideTransactionsAfterDate(defaultDate);
      }
      
      const restoredEndingBalance = String(inProgressReconciliation.statement_ending_balance ?? "");
      setEndingBalance(restoredEndingBalance);
      endingBalanceRef.current = restoredEndingBalance; // Sync ref immediately
      
      const restoredNotes = inProgressReconciliation.notes || "";
      setNotes(restoredNotes);
      notesRef.current = restoredNotes;
      
      // Restore Phase 2 mode if ending balance was set OR if user had checked transactions
      const hasEndingBalance = inProgressReconciliation.statement_ending_balance > 0;
      const hasCheckedTransactions = (inProgressReconciliation.checked_transaction_ids?.length || 0) > 0;
      if (hasEndingBalance || hasCheckedTransactions) {
        setIsReconciliationMode(true);
      }
      
      // Clean up any duplicate in-progress records for this bank account
      supabase
        .from('bank_reconciliations')
        .delete()
        .eq('bank_account_id', selectedBankAccountId)
        .eq('status', 'in_progress')
        .neq('id', inProgressReconciliation.id)
        .then(() => {
          // Cleanup complete (fire and forget)
        });
      
      setHasLoadedFromDatabase(true);
      isRestoredRef.current = true; // Mark restoration complete - auto-save now allowed
      console.log('✅ Restoration complete from in-progress record, auto-save now enabled');
      return;
    }

    // No in-progress, use last completed for date calculation
    if (lastCompleted) {
      setCurrentReconciliationId(null);
      setBeginningBalance(String(correctBeginningBalance));
      // Parse without timezone shift - creates local midnight
      const [lcYear, lcMonth, lcDay] = lastCompleted.statement_date.split('-').map(Number);
      const lastCompletedLocal = new Date(lcYear, lcMonth - 1, lcDay);
      const defaultDate = endOfMonth(addMonths(lastCompletedLocal, 1));
      setStatementDate(defaultDate);
      setHideTransactionsAfterDate(defaultDate); // Also set hide date
    } else {
      // No completed, no in-progress - start fresh at $0
      setCurrentReconciliationId(null);
      setBeginningBalance("0");
    }
    
    setHasLoadedFromDatabase(true);
    isRestoredRef.current = true; // Mark restoration complete - auto-save now allowed
    console.log('✅ Restoration complete (no in-progress record), auto-save now enabled');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBankAccountId, reconciliationHistory, inProgressReconciliation, isLoadingInProgress]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Check if this is the most recent completed reconciliation
  const isLatestCompleted = (rec: any) => {
    if (rec.status !== 'completed') return false;
    const completedRecs = reconciliationHistory
      ?.filter((r: any) => r.status === 'completed')
      .sort((a: any, b: any) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime());
    return completedRecs?.[0]?.id === rec.id;
  };

  const handleUndoReconciliation = (rec: any) => {
    setSelectedReconciliationToUndo(rec);
    setUndoDialogOpen(true);
  };

  const confirmUndoReconciliation = async () => {
    if (!selectedReconciliationToUndo) return;
    try {
      await undoReconciliation.mutateAsync(selectedReconciliationToUndo.id);
      toast({
        title: "Reconciliation undone",
        description: "The reconciliation has been successfully reversed.",
      });
      setUndoDialogOpen(false);
      setSelectedReconciliationToUndo(null);
    } catch (error) {
      console.error('Error undoing reconciliation:', error);
      toast({
        title: "Error",
        description: "Failed to undo reconciliation.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        {/* All fields in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-2">
            <Label htmlFor="bank-account">Bank Account</Label>
            <Select
              value={selectedBankAccountId || ""}
              onValueChange={(value) => {
                setSelectedBankAccountId(value || null);
                setEndingBalance("");
                setNotes("");
                setCheckedTransactions(new Set());
                setIsReconciliationMode(false);
              }}
              disabled={isReconciliationMode}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select a bank account..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Label>Statement Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedBankAccountId || isReconciliationMode}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !statementDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {statementDate ? format(statementDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={statementDate}
                  onSelect={(date) => { if (date) setStatementDate(date); }}
                  defaultMonth={statementDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => {
                    // Disable dates on or before the last completed reconciliation
                    if (lastCompletedDate) {
                      // Normalize both to start of day in local timezone for accurate comparison
                      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                      const lastOnly = new Date(
                        lastCompletedDate.getFullYear(), 
                        lastCompletedDate.getMonth(), 
                        lastCompletedDate.getDate()
                      );
                      return dateOnly <= lastOnly;
                    }
                    return false;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:col-span-2">
            <Label>Hide Transactions After</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedBankAccountId}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !hideTransactionsAfterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {hideTransactionsAfterDate ? format(hideTransactionsAfterDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={hideTransactionsAfterDate}
                  onSelect={(date) => { if (date) setHideTransactionsAfterDate(date); }}
                  defaultMonth={hideTransactionsAfterDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="beginning-balance">
              Beginning Balance
            </Label>
            <Input
              id="beginning-balance"
              type="number"
              step="0.01"
              value={selectedBankAccountId ? beginningBalance : ""}
              disabled={true}
              className="mt-1 bg-muted cursor-not-allowed"
            />
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="ending-balance">Ending Balance</Label>
            <Input
              id="ending-balance"
              type="number"
              step="0.01"
              value={selectedBankAccountId ? endingBalance : ""}
              onChange={(e) => {
                const value = e.target.value;
                setEndingBalance(value);
                endingBalanceRef.current = value; // Sync ref immediately for auto-save
                hasUnsavedChangesRef.current = true;
              }}
              disabled={!selectedBankAccountId || isReconciliationMode}
              className={cn("mt-1", isReconciliationMode && "bg-muted cursor-not-allowed")}
            />
          </div>

          <div className="lg:col-span-2 flex items-end gap-2 mt-1">
            <Button
              onClick={() => setIsReconciliationMode(true)}
              disabled={isReconciliationMode || !selectedBankAccountId || !statementDate}
              className="flex-1"
            >
              Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsReconciliationMode(false)}
              disabled={!isReconciliationMode}
              className="flex-1"
            >
              Edit
            </Button>
          </div>
        </div>

          {selectedBankAccountId && isReconciliationMode && (
            <>

            <Separator className="my-6" />

            {!initialCheckedTransactionsLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <p className="text-muted-foreground">Restoring your reconciliation...</p>
              </div>
            ) : !transactions || (transactions.checks.length === 0 && transactions.deposits.length === 0) ? (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground mb-2">
                  No unreconciled transactions found for this account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Checks/Bill Payments: {transactions?.checks.length || 0}, Deposits: {transactions?.deposits.length || 0}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Outstanding Checks & Bill Payments</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left w-12">
                            <Checkbox
                              checked={allChecksSelected}
                              onCheckedChange={handleSelectAllChecks}
                              disabled={visibleChecks.length === 0}
                            />
                          </th>
                          <th className="p-2 text-left">
                            <button 
                              onClick={() => {
                                if (checksSortColumn === 'date') {
                                  setChecksSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setChecksSortColumn('date');
                                  setChecksSortDirection('asc');
                                }
                              }} 
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              {checksSortColumn === 'date' ? (
                                checksSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                              Date
                            </button>
                          </th>
                          
                          
                          <th className="p-2 text-left">Payee</th>
                          <th className="p-2 text-left">Cost Code</th>
                          <th className="p-2 text-right">
                            <button 
                              onClick={() => {
                                if (checksSortColumn === 'amount') {
                                  setChecksSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setChecksSortColumn('amount');
                                  setChecksSortDirection('asc');
                                }
                              }} 
                              className="flex items-center gap-1 ml-auto hover:text-primary"
                            >
                              {checksSortColumn === 'amount' ? (
                                checksSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                              Amount
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions?.checks
                          .filter(c => !c.reconciled)
                          .filter(c => !hideTransactionsAfterDate || new Date(c.date) <= hideTransactionsAfterDate)
                          .sort((a, b) => {
                            if (!checksSortColumn) return 0;
                            let comparison = 0;
                            if (checksSortColumn === 'date') {
                              comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                            } else if (checksSortColumn === 'amount') {
                              comparison = a.amount - b.amount;
                            }
                            return checksSortDirection === 'asc' ? comparison : -comparison;
                          })
                          .map((check) => (
                            <tr key={check.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(check.id)}
                                  onCheckedChange={() => handleToggleTransaction(check.id)}
                                />
                              </td>
                  <td className="p-2">
                    <InlineEditCell
                      value={check.date}
                      type="date"
                      onSave={(value) => handleUpdateTransaction(check.id, check.type, 'date', value)}
                      displayFormat={(date) => format(new Date(date + "T12:00:00"), "MM/dd/yyyy")}
                    />
                  </td>
                              <td className="p-2">{check.payee}</td>
                              <td className="p-2">
                                <AllocationCell allocations={check.allocations} labelType="code" />
                              </td>
                              <td className="p-2 text-right">
                                <InlineEditCell
                                  value={check.amount.toString()}
                                  type="number"
                                  onSave={(value) => handleUpdateTransaction(check.id, check.type, 'amount', value)}
                                  displayFormat={(val) => formatCurrency(parseFloat(val))}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Outstanding Deposits</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left w-12">
                            <Checkbox
                              checked={allDepositsSelected}
                              onCheckedChange={handleSelectAllDeposits}
                              disabled={visibleDeposits.length === 0}
                            />
                          </th>
                          <th className="p-2 text-left">
                            <button 
                              onClick={() => {
                                if (depositsSortColumn === 'date') {
                                  setDepositsSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setDepositsSortColumn('date');
                                  setDepositsSortDirection('asc');
                                }
                              }} 
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              {depositsSortColumn === 'date' ? (
                                depositsSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                              Date
                            </button>
                          </th>
                          <th className="p-2 text-left">Source</th>
                          <th className="p-2 text-left">Account</th>
                          <th className="p-2 text-right">
                            <button 
                              onClick={() => {
                                if (depositsSortColumn === 'amount') {
                                  setDepositsSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setDepositsSortColumn('amount');
                                  setDepositsSortDirection('asc');
                                }
                              }} 
                              className="flex items-center gap-1 ml-auto hover:text-primary"
                            >
                              {depositsSortColumn === 'amount' ? (
                                depositsSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                              Amount
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions?.deposits
                          .filter(d => !d.reconciled)
                          .filter(d => !hideTransactionsAfterDate || new Date(d.date) <= hideTransactionsAfterDate)
                          .sort((a, b) => {
                            if (!depositsSortColumn) return 0;
                            let comparison = 0;
                            if (depositsSortColumn === 'date') {
                              comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                            } else if (depositsSortColumn === 'amount') {
                              comparison = a.amount - b.amount;
                            }
                            return depositsSortDirection === 'asc' ? comparison : -comparison;
                          })
                          .map((deposit) => (
                            <tr key={deposit.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(deposit.id)}
                                  onCheckedChange={() => handleToggleTransaction(deposit.id)}
                                />
                              </td>
                  <td className="p-2">
                    <InlineEditCell
                      value={deposit.date}
                      type="date"
                      onSave={(value) => handleUpdateTransaction(deposit.id, 'deposit', 'date', value)}
                      displayFormat={(date) => format(new Date(date + "T12:00:00"), "MM/dd/yyyy")}
                    />
                  </td>
                              <td className="p-2">{deposit.source}</td>
                              <td className="p-2">
                                <AllocationCell allocations={deposit.accountAllocations} labelType="account" />
                              </td>
                              <td className="p-2 text-right">
                                <InlineEditCell
                                  value={deposit.amount.toString()}
                                  type="number"
                                  onSave={(value) => handleUpdateTransaction(deposit.id, 'deposit', 'amount', value)}
                                  displayFormat={(val) => formatCurrency(parseFloat(val))}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Statement Beginning Balance:</span>
                      <span className="font-semibold">{formatCurrency(parseFloat(beginningBalance || "0"))}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Plus: Deposits Cleared ({clearedDeposits.length}):</span>
                      <span className="font-semibold">+{formatCurrency(totalClearedDeposits)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Minus: Checks & Bill Payments Cleared ({clearedChecks.length}):</span>
                      <span className="font-semibold">-{formatCurrency(totalClearedChecks)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Calculated Ending Balance:</span>
                      <span>{formatCurrency(calculatedEndingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statement Ending Balance:</span>
                      <span>{formatCurrency(parseFloat(endingBalance || "0"))}</span>
                    </div>
                    <Separator />
                    <div className={cn(
                      "flex justify-between text-lg font-bold",
                      Math.abs(difference) < 0.01 ? "text-green-600" : "text-red-600"
                    )}>
                      <span>Difference:</span>
                      <span>{formatCurrency(difference)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes about this reconciliation..."
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button 
                    onClick={handleFinishReconciliation}
                    disabled={Math.abs(difference) > 0.01}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finish Reconciliation
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Reconciliation History Section */}
      {selectedBankAccountId && reconciliationHistory && reconciliationHistory.length > 0 && (
        <Card className="p-6">
          <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Reconciliation History</h3>
                <p className="text-sm text-muted-foreground">
                  {reconciliationHistory.length} reconciliation{reconciliationHistory.length !== 1 ? 's' : ''}
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isHistoryExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Statement Date</th>
                      <th className="p-3 text-left">Beginning Balance</th>
                      <th className="p-3 text-left">Ending Balance</th>
                      <th className="p-3 text-left">Difference</th>
                      <th className="p-3 text-left">Completed Date</th>
                      <th className="p-3 text-center">Notes</th>
                      {canUndoReconciliation && <th className="p-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationHistory
                      .filter((rec: any) => rec.status === 'completed')
                      .sort((a: any, b: any) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime())
                      .map((rec: any) => (
                        <tr key={rec.id} className="border-t hover:bg-muted/50">
                          <td className="p-3">
                            {format(new Date(rec.statement_date + "T00:00:00"), "MM/dd/yyyy")}
                          </td>
                          <td className="p-3">
                            {formatCurrency(rec.statement_beginning_balance || 0)}
                          </td>
                          <td className="p-3">
                            {formatCurrency(rec.statement_ending_balance || 0)}
                          </td>
                          <td className={cn(
                            "p-3 font-medium",
                            Math.abs(rec.difference || 0) < 0.01 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(rec.difference || 0)}
                          </td>
                          <td className="p-3">
                            {rec.completed_at 
                              ? format(new Date(rec.completed_at), "MM/dd/yyyy")
                              : "-"
                            }
                          </td>
                          <td className="p-3 text-center">
                            {rec.notes ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReconciliationNotes(rec.notes);
                                  setSelectedReconciliationDate(format(new Date(rec.statement_date + "T00:00:00"), "MM/dd/yyyy"));
                                  setNotesDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <StickyNote className="h-4 w-4 text-amber-500" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          {canUndoReconciliation && (
                            <td className="p-3 text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUndoReconciliation(rec)}
                                      disabled={!isLatestCompleted(rec)}
                                      className={cn(
                                        "h-8 w-8 p-0",
                                        isLatestCompleted(rec) ? "text-red-600 hover:text-red-700" : "text-muted-foreground"
                                      )}
                                    >
                                      <Lock className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isLatestCompleted(rec) 
                                      ? "Undo this reconciliation" 
                                      : "Only the most recent completed reconciliation can be undone"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Undo Reconciliation Confirmation Dialog */}
      <AlertDialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Reconciliation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all transactions from this reconciliation as unreconciled and delete the reconciliation record. 
              This action cannot be undone.
              {selectedReconciliationToUndo && (
                <div className="mt-2 text-sm">
                  <strong>Statement Date:</strong> {format(new Date(selectedReconciliationToUndo.statement_date + "T00:00:00"), "MM/dd/yyyy")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUndoReconciliation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Undo Reconciliation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unchecked Transactions Warning Dialog */}
      <AlertDialog open={uncheckedWarningDialogOpen} onOpenChange={setUncheckedWarningDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Unchecked Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              {uncheckedWarningMessage}
              <div className="mt-3 font-medium">
                Are you sure you want to complete this reconciliation?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setUncheckedWarningDialogOpen(false);
                completeReconciliation();
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes View Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Reconciliation Notes
            </DialogTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Statement Date: {selectedReconciliationDate}
            </div>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap">{selectedReconciliationNotes}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
