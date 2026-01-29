import { useState, useEffect, useRef } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/ui/delete-button";
import { useChecks } from "@/hooks/useChecks";
import { useDeposits } from "@/hooks/useDeposits";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserRole } from "@/hooks/useUserRole";
import { AccountTransactionInlineEditor } from "./AccountTransactionInlineEditor";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface IncludedBillPayment {
  bill_id: string;
  reference_number: string | null;
  amount_allocated: number;
  accountDisplay: string | null;
}

interface Transaction {
  source_id: string;
  line_id: string;
  journal_entry_id: string;
  date: string;
  memo: string | null;
  description: string | null;
  reference: string | null;
  accountDisplay: string | null;
  source_type: string;
  debit: number;
  credit: number;
  created_at: string;
  reconciled: boolean;
  reconciliation_date?: string | null;
  isPaid?: boolean;
  // For consolidated bill payments
  includedBillPayments?: IncludedBillPayment[];
  consolidatedTotalAmount?: number;
}

interface AccountDetailDialogProps {
  accountId: string | null;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  projectId?: string;
  asOfDate?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailDialog({
  accountId,
  accountCode,
  accountName,
  accountType,
  projectId,
  asOfDate,
  open,
  onOpenChange,
}: AccountDetailDialogProps) {
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Detect if this is an Accounts Payable account
  const isAccountsPayable = accountCode === '2010' || accountName.toLowerCase().includes('accounts payable');
  
  // Default hidePaid to ON for Accounts Payable
  const [hidePaid, setHidePaid] = useState(isAccountsPayable);
  
  // Reset hidePaid to default when dialog opens or account changes
  useEffect(() => {
    if (open) {
      setHidePaid(isAccountsPayable);
    }
  }, [open, accountId, isAccountsPayable]);
  
  const { deleteCheck, updateCheck, correctCheck } = useChecks();
  const { deleteDeposit, updateDeposit, correctDeposit } = useDeposits();
  const { deleteCreditCard, correctCreditCard } = useCreditCards();
  const { deleteManualJournalEntry, updateJournalEntryField, updateJournalEntryLine, correctManualJournalEntry } = useJournalEntries();
  const { canDeleteBills } = useUserRole();
  const queryClient = useQueryClient();
  const prevOpenRef = useRef(open);
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);

  // Helper to parse date-only strings as local midnight (avoids timezone shift)
  const toLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['account-transactions', accountId, projectId, sortOrder, asOfDate?.toISOString()],
    queryFn: async (): Promise<Transaction[]> => {
      if (!accountId) return [];

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id,
          memo,
          debit,
          credit,
          account_id,
          cost_code_id,
          reconciled,
          reconciliation_id,
          reconciliation_date,
        journal_entries!inner(
          id,
          entry_date,
          description,
          source_type,
          source_id,
          created_at,
          is_reversal,
          reversed_at,
          reversed_by_id
        )
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.is_reversal', false)
        .is('journal_entries.reversed_at', null)
        .is('journal_entries.reversed_by_id', null);

      // Apply date filter if asOfDate is provided
      if (asOfDate) {
        query = query.lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);
      }

      if (projectId) {
        // For project-specific reports, include both project lines AND company-wide lines (null project_id)
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      // Apply stable server-side ordering to reduce reshuffling
      query = query
        .order('entry_date', { foreignTable: 'journal_entries', ascending: sortOrder !== 'desc' })
        .order('created_at', { foreignTable: 'journal_entries', ascending: sortOrder !== 'desc' })
        .order('id', { ascending: sortOrder !== 'desc' });

      const { data, error } = await query;

      if (error) throw error;

      // Get check IDs for check transactions
      const checkIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'check')
        .map((line: any) => line.journal_entries.source_id);

      // Get deposit IDs for deposit transactions
      const depositIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'deposit')
        .map((line: any) => line.journal_entries.source_id);

      // Get credit card transaction IDs
      const creditCardIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'credit_card')
        .map((line: any) => line.journal_entries.source_id);

      // Get bill IDs for bill and bill_payment transactions
      const billIds = (data || [])
        .filter((line: any) => ['bill', 'bill_payment'].includes(line.journal_entries.source_type))
        .map((line: any) => line.journal_entries.source_id);

      // Fetch check details with vendor names if we have any checks
      let checksMap = new Map();
      
      if (checkIds.length > 0) {
        const { data: checksData } = await supabase
          .from('checks')
          .select(`
            id, 
            memo, 
            pay_to, 
            check_number,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            check_lines(memo, line_number, account_id, cost_code_id)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .neq('status', 'reversed')
          .in('id', checkIds);
        
        // Get unique vendor IDs (UUIDs) to fetch company names
        const vendorIds = (checksData || [])
          .map(check => check.pay_to)
          .filter(payTo => {
            // Check if it's a UUID format
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payTo);
          });

        // Fetch company names for UUIDs
        let companiesMap = new Map();
        if (vendorIds.length > 0) {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', vendorIds);
          
          companiesData?.forEach(company => {
            companiesMap.set(company.id, company.company_name);
          });
        }
        
        checksData?.forEach((check: any) => {
          // If pay_to is a UUID, try to get company name; otherwise use pay_to as is
          const vendorName = companiesMap.get(check.pay_to) || check.pay_to;
          
          // Get first line memo (similar to deposits)
          const sortedLines = (check.check_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          checksMap.set(check.id, {
            ...check,
            vendor_name: vendorName,
            firstLineMemo
          });
        });
      }

      // Fetch deposit details with customer names if we have any deposits
      let depositsMap = new Map();
      
      if (depositIds.length > 0) {
        const { data: depositsData } = await supabase
          .from('deposits')
          .select(`
            id, 
            memo,
            bank_account_id,
            company_id,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            deposit_lines(memo, line_number, account_id),
            companies(company_name)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .in('id', depositIds);
        
        depositsData?.forEach((deposit: any) => {
          // Received From is the deposit memo, with company_name as fallback
          const receivedFrom = deposit.memo || deposit.companies?.company_name || 'Cash';
          
          // First line memo is from the first deposit line
          const sortedLines = (deposit.deposit_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          depositsMap.set(deposit.id, {
            ...deposit,
            receivedFrom,
            firstLineMemo,
            customer_name: deposit.companies?.company_name || null
          });
        });
      }

      // Fetch credit card transaction details if we have any
      let creditCardsMap = new Map();
      
      if (creditCardIds.length > 0) {
        const { data: creditCardsData } = await supabase
          .from('credit_cards')
          .select(`
            id,
            vendor,
            memo,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            credit_card_lines(memo, line_number, account_id, cost_code_id)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .neq('status', 'reversed')
          .in('id', creditCardIds);
        
        creditCardsData?.forEach((cc: any) => {
          // Get first line memo as description
          const sortedLines = (cc.credit_card_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          creditCardsMap.set(cc.id, {
            ...cc,
            vendor: cc.vendor,
            firstLineMemo,
            reconciled: cc.reconciled || false
          });
        });
      }

      // Fetch bill details with vendor names if we have any bills
      let billsMap = new Map();
      
      if (billIds.length > 0) {
        const { data: billsData } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            reference_number,
            total_amount,
            amount_paid,
            status,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            companies(company_name),
            bill_lines(memo, line_number, account_id, cost_code_id)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .in('id', billIds);
        
        billsData?.forEach((bill: any) => {
          // Get first bill line for account display
          const sortedLines = (bill.bill_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLine = sortedLines[0];
          
          // Determine if bill is fully paid
          const isPaid = bill.amount_paid >= bill.total_amount || bill.status === 'paid';
          
          billsMap.set(bill.id, {
            ...bill,
            vendor_name: bill.companies?.company_name || 'Unknown Vendor',
            firstLineAccountId: firstLine?.account_id || null,
            firstLineCostCodeId: firstLine?.cost_code_id || null,
            isPaid
          });
        });
      }

      // Collect all unique cost_code_ids and account_ids for lookup (declared early for consolidated payments)
      const allCostCodeIds = new Set<string>();
      const allAccountIds = new Set<string>();

      // ========== FETCH CONSOLIDATED BILL PAYMENTS ==========
      // Fetch from bill_payments table to detect multi-bill payments
      let consolidatedPaymentsQuery = supabase
        .from('bill_payments')
        .select(`
          id,
          payment_date,
          payment_account_id,
          vendor_id,
          total_amount,
          check_number,
          memo,
          reconciled,
          reconciliation_id,
          reconciliation_date,
          created_at
        `)
        .eq('payment_account_id', accountId);

      if (projectId) {
        consolidatedPaymentsQuery = consolidatedPaymentsQuery.eq('project_id', projectId);
      } else {
        consolidatedPaymentsQuery = consolidatedPaymentsQuery.is('project_id', null);
      }

      if (asOfDate) {
        consolidatedPaymentsQuery = consolidatedPaymentsQuery.lte('payment_date', asOfDate.toISOString().split('T')[0]);
      }

      const { data: consolidatedPayments } = await consolidatedPaymentsQuery;

      // Build allocation maps for consolidated payments
      const allocationsByPaymentId = new Map<string, IncludedBillPayment[]>();
      const billIdsInConsolidatedPayments = new Set<string>();
      let vendorNamesForConsolidated = new Map<string, string>();
      const firstLineByBillForConsolidated = new Map<string, { cost_code_id: string | null; account_id: string | null }>();

      if (consolidatedPayments && consolidatedPayments.length > 0) {
        const consolidatedPaymentIds = consolidatedPayments.map(cp => cp.id);
        
        // Fetch allocations
        const { data: billPaymentAllocations } = await supabase
          .from('bill_payment_allocations')
          .select(`
            id,
            bill_payment_id,
            bill_id,
            amount_allocated,
            bills:bill_id (reference_number)
          `)
          .in('bill_payment_id', consolidatedPaymentIds);

        // Group allocations by payment id (accountDisplay will be populated after costCodesMap/accountsDisplayMap are ready)
        if (billPaymentAllocations) {
          billPaymentAllocations.forEach(alloc => {
            const bill = alloc.bills as unknown as { reference_number: string | null } | null;
            const summary: IncludedBillPayment = {
              bill_id: alloc.bill_id,
              reference_number: bill?.reference_number || null,
              amount_allocated: Number(alloc.amount_allocated),
              accountDisplay: null // Will be populated after maps are ready
            };
            const existing = allocationsByPaymentId.get(alloc.bill_payment_id) || [];
            existing.push(summary);
            allocationsByPaymentId.set(alloc.bill_payment_id, existing);
            billIdsInConsolidatedPayments.add(alloc.bill_id);
          });
        }

        // Fetch vendor names for consolidated payments
        const vendorIds = [...new Set(consolidatedPayments.map(cp => cp.vendor_id))];
        if (vendorIds.length > 0) {
          const { data: vendorData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', vendorIds);
          vendorData?.forEach(v => vendorNamesForConsolidated.set(v.id, v.company_name));
        }

        // Fetch primary account/cost code for display (from first bill's first line)
        const allBillIdsInPayments = [...billIdsInConsolidatedPayments];
        if (allBillIdsInPayments.length > 0) {
          const { data: billLinesData } = await supabase
            .from('bill_lines')
            .select('bill_id, line_number, cost_code_id, account_id')
            .in('bill_id', allBillIdsInPayments)
            .order('line_number', { ascending: true });

          // Group by bill_id, get first line
          (billLinesData || []).forEach(bl => {
            if (!firstLineByBillForConsolidated.has(bl.bill_id)) {
              firstLineByBillForConsolidated.set(bl.bill_id, { cost_code_id: bl.cost_code_id, account_id: bl.account_id });
            }
          });

          // Collect cost code/account IDs for lookup
          firstLineByBillForConsolidated.forEach(fl => {
            if (fl.cost_code_id) allCostCodeIds.add(fl.cost_code_id);
            if (fl.account_id) allAccountIds.add(fl.account_id);
          });
        }
      }

      // Client-side defensive filter: only show journal lines whose source records exist in the filtered maps
      // AND exclude bill_payment lines that belong to consolidated payments
      const filteredData = (data || []).filter((line: any) => {
        const st = line.journal_entries.source_type;
        const sid = line.journal_entries.source_id;
        if (st === 'deposit') return depositsMap.has(sid);
        if (st === 'check') return checksMap.has(sid);
        if (st === 'credit_card') return creditCardsMap.has(sid);
        if (st === 'bill') return billsMap.has(sid);
        // Suppress bill_payment lines if the bill is part of a consolidated payment
        if (st === 'bill_payment') {
          if (billIdsInConsolidatedPayments.has(sid)) return false;
          return billsMap.has(sid);
        }
        return true; // keep manual types
      });

      // From journal entry lines
      filteredData.forEach((line: any) => {
        if (line.cost_code_id) allCostCodeIds.add(line.cost_code_id);
      });

      // From checks
      checksMap.forEach((check: any) => {
        (check.check_lines || []).forEach((cl: any) => {
          if (cl.cost_code_id) allCostCodeIds.add(cl.cost_code_id);
          if (cl.account_id) allAccountIds.add(cl.account_id);
        });
      });

      // From deposits
      depositsMap.forEach((deposit: any) => {
        (deposit.deposit_lines || []).forEach((dl: any) => {
          if (dl.account_id) allAccountIds.add(dl.account_id);
        });
      });

      // From credit cards
      creditCardsMap.forEach((cc: any) => {
        (cc.credit_card_lines || []).forEach((cl: any) => {
          if (cl.cost_code_id) allCostCodeIds.add(cl.cost_code_id);
          if (cl.account_id) allAccountIds.add(cl.account_id);
        });
      });

      // From bills
      billsMap.forEach((bill: any) => {
        if (bill.firstLineCostCodeId) allCostCodeIds.add(bill.firstLineCostCodeId);
        if (bill.firstLineAccountId) allAccountIds.add(bill.firstLineAccountId);
      });

      // Fetch cost codes
      let costCodesMap = new Map<string, string>();
      if (allCostCodeIds.size > 0) {
        const { data: costCodesData } = await supabase
          .from('cost_codes')
          .select('id, code, name')
          .in('id', Array.from(allCostCodeIds));
        costCodesData?.forEach((cc: any) => {
          costCodesMap.set(cc.id, `${cc.code} - ${cc.name}`);
        });
      }

      // Fetch accounts for display
      let accountsDisplayMap = new Map<string, string>();
      if (allAccountIds.size > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, code, name')
          .in('id', Array.from(allAccountIds));
        accountsData?.forEach((acc: any) => {
          accountsDisplayMap.set(acc.id, `${acc.code} - ${acc.name}`);
        });
      }

      // Populate accountDisplay for consolidated bill payment allocations now that maps are ready
      allocationsByPaymentId.forEach((allocations) => {
        allocations.forEach(alloc => {
          const firstLine = firstLineByBillForConsolidated.get(alloc.bill_id);
          if (firstLine) {
            if (firstLine.cost_code_id && costCodesMap.has(firstLine.cost_code_id)) {
              alloc.accountDisplay = costCodesMap.get(firstLine.cost_code_id) || null;
            } else if (firstLine.account_id && accountsDisplayMap.has(firstLine.account_id)) {
              alloc.accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
            }
          }
        });
      });

      const transactions: Transaction[] = filteredData.map((line: any) => {
        let memo = line.memo;
        let reference = null;
        let description = line.memo; // Description always comes from the line memo
        let reconciled = false;
        let reconciliation_date: string | null = null;
        let accountDisplay: string | null = null;

        // If this is a check, get reference from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            reference = check.vendor_name || check.pay_to;
            reconciled = check.reconciled || !!check.reconciliation_id || !!check.reconciliation_date;
            reconciliation_date = check.reconciliation_date;
            // Use first check line memo as description (e.g., "Testing")
            description = check.firstLineMemo || description;
            // Get account from first check line - prefer cost code, then account
            const sortedLines = (check.check_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
            const firstLine = sortedLines[0];
            if (firstLine?.cost_code_id && costCodesMap.has(firstLine.cost_code_id)) {
              accountDisplay = costCodesMap.get(firstLine.cost_code_id) || null;
            } else if (firstLine?.account_id && accountsDisplayMap.has(firstLine.account_id)) {
              accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
            }
          }
        }

        // If this is a deposit, get reference from deposits table
        if (line.journal_entries.source_type === 'deposit') {
          const deposit = depositsMap.get(line.journal_entries.source_id);
          if (deposit) {
            memo = deposit.memo;
            reference = deposit.receivedFrom;
            reconciled = deposit.reconciled || !!deposit.reconciliation_id || !!deposit.reconciliation_date;
            reconciliation_date = deposit.reconciliation_date;
            // Use first deposit line memo as description
            description = deposit.firstLineMemo || description;
            // Get account from first deposit line
            const sortedLines = (deposit.deposit_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
            const firstLine = sortedLines[0];
            if (firstLine?.account_id && accountsDisplayMap.has(firstLine.account_id)) {
              accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
            }
          }
        }

        // If this is a credit card transaction, get reference from credit_card_transactions table
        if (line.journal_entries.source_type === 'credit_card') {
          const cc = creditCardsMap.get(line.journal_entries.source_id);
          if (cc) {
            memo = cc.memo;
            reference = cc.vendor;
            reconciled = cc.reconciled || !!cc.reconciliation_id || !!cc.reconciliation_date;
            reconciliation_date = cc.reconciliation_date;
            // Use first credit card line memo as description
            description = cc.firstLineMemo || description;
            // Get account from first credit card line - prefer cost code, then account
            const sortedLines = (cc.credit_card_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
            const firstLine = sortedLines[0];
            if (firstLine?.cost_code_id && costCodesMap.has(firstLine.cost_code_id)) {
              accountDisplay = costCodesMap.get(firstLine.cost_code_id) || null;
            } else if (firstLine?.account_id && accountsDisplayMap.has(firstLine.account_id)) {
              accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
            }
          }
        }

        // If this is a bill or bill payment, get vendor name from bills table
        // Track if bill is paid for filtering
        let isPaid: boolean | undefined = undefined;
        
        if (line.journal_entries.source_type === 'bill' || line.journal_entries.source_type === 'bill_payment') {
          const bill = billsMap.get(line.journal_entries.source_id);
          if (bill) {
            reference = bill.vendor_name;
            description = bill.reference_number || description;
            reconciled = bill.reconciled || !!bill.reconciliation_id || !!bill.reconciliation_date;
            reconciliation_date = bill.reconciliation_date;
            isPaid = bill.isPaid;
            // Get account from first bill line - prefer cost code, then account
            if (bill.firstLineCostCodeId && costCodesMap.has(bill.firstLineCostCodeId)) {
              accountDisplay = costCodesMap.get(bill.firstLineCostCodeId) || null;
            } else if (bill.firstLineAccountId && accountsDisplayMap.has(bill.firstLineAccountId)) {
              accountDisplay = accountsDisplayMap.get(bill.firstLineAccountId) || null;
            }
          }
        }

        // For manual journal entries, use the line's own reconciliation data and cost code
        if (line.journal_entries.source_type === 'manual') {
          reconciled = line.reconciled || !!line.reconciliation_id || !!line.reconciliation_date;
          reconciliation_date = line.reconciliation_date;
          // Use the journal entry line's cost code if available
          if (line.cost_code_id && costCodesMap.has(line.cost_code_id)) {
            accountDisplay = costCodesMap.get(line.cost_code_id) || null;
          }
        }

        return {
          source_id: line.journal_entries.source_id,
          line_id: line.id,
          journal_entry_id: line.journal_entries.id,
          date: line.journal_entries.entry_date,
          memo: memo,
          description: description,
          reference: reference,
          accountDisplay: accountDisplay,
          source_type: line.journal_entries.source_type,
          debit: line.debit || 0,
          credit: line.credit || 0,
          created_at: line.journal_entries.created_at,
          reconciled: reconciled,
          reconciliation_date: reconciliation_date,
          isPaid: isPaid,
        };
      });

      // ========== CREATE SYNTHETIC CONSOLIDATED BILL PAYMENT ROWS ==========
      if (consolidatedPayments && consolidatedPayments.length > 0) {
        consolidatedPayments.forEach(cp => {
          const allocations = allocationsByPaymentId.get(cp.id) || [];
          const vendorName = vendorNamesForConsolidated.get(cp.vendor_id) || 'Unknown Vendor';
          
          // Get primary account display from first bill's first line
          let accountDisplay: string | null = null;
          if (allocations.length > 0) {
            const firstBillId = allocations[0].bill_id;
            const firstLine = firstLineByBillForConsolidated.get(firstBillId);
            if (firstLine) {
              if (firstLine.cost_code_id && costCodesMap.has(firstLine.cost_code_id)) {
                accountDisplay = costCodesMap.get(firstLine.cost_code_id) || null;
              } else if (firstLine.account_id && accountsDisplayMap.has(firstLine.account_id)) {
                accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
              }
            }
          }

          const syntheticRow: Transaction = {
            source_id: cp.id,
            line_id: `consolidated:${cp.id}`,
            journal_entry_id: `consolidated:${cp.id}`,
            date: cp.payment_date,
            memo: cp.memo,
            description: cp.check_number || cp.memo || null,
            reference: vendorName,
            accountDisplay: accountDisplay,
            source_type: 'consolidated_bill_payment',
            debit: 0,
            credit: Number(cp.total_amount),
            created_at: cp.created_at || new Date().toISOString(),
            reconciled: cp.reconciled || !!cp.reconciliation_id || !!cp.reconciliation_date,
            reconciliation_date: cp.reconciliation_date,
            isPaid: true,
            includedBillPayments: allocations,
            consolidatedTotalAmount: Number(cp.total_amount),
          };
          
          transactions.push(syntheticRow);
        });
      }

      // Fully deterministic sort: date, then created_at, then journal_entry_id, then line_id
      transactions.sort((a, b) => {
        const dateA = new Date(`${a.date}T00:00:00`).getTime();
        const dateB = new Date(`${b.date}T00:00:00`).getTime();

        // Primary: date
        const dateDiff = sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        if (dateDiff !== 0) return dateDiff;

        // Secondary: created_at
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        const createdDiff = sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
        if (createdDiff !== 0) return createdDiff;

        // Tertiary: journal_entry_id (string compare)
        if (a.journal_entry_id !== b.journal_entry_id) {
          if (sortOrder === 'desc') {
            return a.journal_entry_id < b.journal_entry_id ? 1 : -1;
          } else {
            return a.journal_entry_id < b.journal_entry_id ? -1 : 1;
          }
        }

        // Quaternary: line_id (string compare)
        if (a.line_id !== b.line_id) {
          if (sortOrder === 'desc') {
            return a.line_id < b.line_id ? 1 : -1;
          } else {
            return a.line_id < b.line_id ? -1 : 1;
          }
        }

        return 0;
      });

      return transactions;
    },
    enabled: !!accountId && open,
    placeholderData: keepPreviousData,
  });

  // Auto-close dialog when all transactions are deleted
  useEffect(() => {
    if (transactions && transactions.length === 0 && open) {
      onOpenChange(false);
    }
  }, [transactions, open, onOpenChange]);

  // Refetch reports when dialog closes to ensure immediate updates
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Dialog just closed => refresh reports and transactions
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement"] });

      // Force immediate refetch to ensure UI updates without waiting
      queryClient.refetchQueries({ queryKey: ["balance-sheet"] });
      queryClient.refetchQueries({ queryKey: ["income-statement"] });
    }
    prevOpenRef.current = open;
  }, [open, queryClient]);

  const handleDelete = async (transaction: Transaction) => {
    if (!canDeleteBills) return;
    
    // CRITICAL: Never allow deletion of reconciled transactions
    if (transaction.reconciled) {
      console.error('Cannot delete reconciled transaction');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Cannot Delete",
        description: "This transaction is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL: Never allow deletion of transactions in closed periods
    if (isDateLocked(transaction.date)) {
      console.error('Cannot delete transaction in closed period');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Books are Closed",
        description: `This transaction is dated on or before ${latestClosedDate ? format(new Date(latestClosedDate), 'PP') : 'the closed period'} and cannot be deleted. You must reopen the accounting period first.`,
        variant: "destructive",
      });
      return;
    }

    // Compute query key for optimistic update
    const queryKey = ['account-transactions', accountId, projectId, sortOrder] as const;
    
    // Snapshot current data
    const previous = queryClient.getQueryData<Transaction[]>(queryKey);
    
    // Optimistically remove the row
    queryClient.setQueryData<Transaction[]>(queryKey, (old) => 
      (old || []).filter(t => t.line_id !== transaction.line_id)
    );

    try {
      if (transaction.source_type === 'check') {
        await deleteCheck.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'deposit') {
        await deleteDeposit.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'credit_card') {
        await deleteCreditCard.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'manual') {
        await deleteManualJournalEntry.mutateAsync(transaction.journal_entry_id);
      } else if (transaction.source_type === 'bill_payment') {
        // Reverse the payment instead of deleting the bill
        const { error } = await supabase.rpc('reverse_bill_payment', {
          journal_entry_id_param: transaction.journal_entry_id
        });
        if (error) throw error;
        
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Payment Reversed",
          description: "The payment has been reversed and the bill balance has been restored.",
        });
      } else if (transaction.source_type === 'bill') {
        const { error } = await supabase.rpc('delete_bill_with_journal_entries', {
          bill_id_param: transaction.source_id
        });
        if (error) throw error;
      }
      
      // On success, invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      queryClient.refetchQueries({ queryKey: ['account-transactions'] });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      // Roll back optimistic update on error
      queryClient.setQueryData(queryKey, previous);
      
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (
    transaction: Transaction,
    field: "date" | "reference" | "description" | "amount",
    value: string | number | Date
  ) => {
    // CRITICAL: Never allow updates to reconciled transactions
    if (transaction.reconciled) {
      console.error('Cannot update reconciled transaction');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Cannot Edit",
        description: "This transaction is reconciled and cannot be modified.",
        variant: "destructive",
      });
      return;
    }
    
    const queryKey = ['account-transactions', accountId, projectId, sortOrder] as const;
    
    try {
      // Description is always updated on the journal entry line
      if (field === "description") {
        await updateJournalEntryLine.mutateAsync({ 
          lineId: transaction.line_id, 
          updates: { memo: value as string } 
        });
        
        // Immediately refresh the dialog and balance sheet
        await queryClient.invalidateQueries({ queryKey });
        await queryClient.refetchQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
        queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
        return;
      }

      switch (transaction.source_type) {
        case 'check':
          // Always use updateCheck for inline edits (no correction/duplicate creation)
          const checkUpdates: any = {};
          if (field === "date") checkUpdates.check_date = format(value as Date, "yyyy-MM-dd");
          if (field === "reference") checkUpdates.pay_to = value as string;
          if (field === "amount") checkUpdates.amount = value as number;
          await updateCheck.mutateAsync({ checkId: transaction.source_id, updates: checkUpdates });
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        case 'deposit':
          // Fetch deposit to determine status
          const { data: depositData } = await supabase
            .from('deposits')
            .select('*, deposit_lines(*)')
            .eq('id', transaction.source_id)
            .single();
          
          if (depositData && (depositData.status === 'posted' || depositData.status === 'cleared')) {
            // Use correction for posted/cleared deposits
            const correctedDepositData: any = {
              deposit_date: field === "date" ? format(value as Date, "yyyy-MM-dd") : depositData.deposit_date,
              bank_account_id: depositData.bank_account_id,
              project_id: depositData.project_id,
              amount: field === "amount" ? value as number : depositData.amount,
              memo: field === "reference" ? value as string : depositData.memo
            };
            const correctedDepositLines = depositData.deposit_lines.map((line: any) => ({
              line_type: line.line_type,
              account_id: line.account_id,
              cost_code_id: line.cost_code_id,
              project_id: line.project_id,
              amount: field === "amount" ? (value as number) * (line.amount / depositData.amount) : line.amount,
              memo: line.memo
            }));
            await correctDeposit.mutateAsync({ depositId: transaction.source_id, correctedDepositData, correctedDepositLines });
          } else {
            // Use update for draft deposits
            const depositUpdates: any = {};
            if (field === "date") depositUpdates.deposit_date = format(value as Date, "yyyy-MM-dd");
            if (field === "reference") {
              // For deposits, "Received From" updates the memo field which is displayed as the received from
              depositUpdates.memo = value as string;
            }
            if (field === "amount") depositUpdates.amount = value as number;
            await updateDeposit.mutateAsync({ depositId: transaction.source_id, updates: depositUpdates });
          }
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        case 'manual':
          const journalUpdates: any = {};
          if (field === "date") journalUpdates.entry_date = format(value as Date, "yyyy-MM-dd");
          await updateJournalEntryField.mutateAsync({ entryId: transaction.source_id, updates: journalUpdates });
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        default:
          console.log('Edit not implemented for:', transaction.source_type);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAmountWithSign = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(absAmount);
    
    if (amount < 0) {
      return <span className="text-red-600">({formatted})</span>;
    }
    return formatted;
  };

  const formatTransactionAmount = (txn: Transaction, accType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
    // Calculate net amount based on account type
    // For assets/expenses: debit increases (positive), credit decreases (negative)
    // For liabilities/equity/revenue: credit increases (positive), debit decreases (negative)
    let amount: number;
    if (accType === 'asset' || accType === 'expense') {
      amount = txn.debit - txn.credit;
    } else {
      amount = txn.credit - txn.debit;
    }

    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(absAmount);

    if (amount < 0) {
      return <span className="text-red-600">({formatted})</span>;
    }
    return <span className="text-foreground">{formatted}</span>;
  };

  const calculateRunningBalance = (transactions: Transaction[]) => {
    let balance = 0;
    return transactions.map((txn) => {
      // For assets and expenses: debit increases, credit decreases
      // For liabilities, equity, revenue: credit increases, debit decreases
      if (accountType === 'asset' || accountType === 'expense') {
        balance += txn.debit - txn.credit;
      } else {
        balance += txn.credit - txn.debit;
      }
      return balance;
    });
  };

  // Filter transactions based on hidePaid toggle
  const displayedTransactions = transactions?.filter(txn => {
    // If hidePaid is off, show all transactions
    if (!hidePaid) return true;
    
    // If hidePaid is on, filter out paid bill and bill_payment transactions
    if (txn.source_type === 'bill' || txn.source_type === 'bill_payment') {
      return !txn.isPaid;
    }
    
    // Show all other transaction types
    return true;
  }) || [];

  const balances = calculateRunningBalance(displayedTransactions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              {accountCode} - {accountName}
            </DialogTitle>
            
            {isAccountsPayable && (
              <div className="flex items-center gap-2">
                <Label htmlFor="hide-paid-toggle" className="text-sm text-muted-foreground cursor-pointer">
                  Hide Paid
                </Label>
                <Switch
                  id="hide-paid-toggle"
                  checked={hidePaid}
                  onCheckedChange={setHidePaid}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : displayedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hidePaid && transactions && transactions.length > 0 
                ? "All bills are paid. Toggle off 'Hide Paid' to see all transactions."
                : "No transactions found for this account."
              }
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 w-28">Type</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-24">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-32">Name</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-36">Account</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-40">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-24 text-right">Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-24 text-right">Balance</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-16 text-center">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 w-16 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.map((txn, index) => {
                  // Determine transaction type label matching QuickBooks
                  const getTypeLabel = (sourceType: string) => {
                    switch (sourceType) {
                      case 'bill': return 'Bill';
                      case 'bill_payment': return 'Bill Pmt - Check';
                      case 'consolidated_bill_payment': return 'Bill Pmt - Check';
                      case 'check': return 'Check';
                      case 'deposit': return 'Deposit';
                      case 'credit_card': return 'Credit Card';
                      case 'manual': return 'Journal Entry';
                      default: return sourceType;
                    }
                  };

                  // Check if this is a consolidated payment with multiple bills
                  const isConsolidated = txn.source_type === 'consolidated_bill_payment';
                  const extraCount = isConsolidated && txn.includedBillPayments ? txn.includedBillPayments.length - 1 : 0;
                  
                  // Format currency for tooltip
                  const formatTooltipCurrency = (amount: number) => {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                    }).format(amount);
                  };

                  return (
                    <TableRow key={txn.line_id} className="h-8">
              <TableCell className="px-2 py-1 whitespace-nowrap">
                <span className="text-xs">{getTypeLabel(txn.source_type)}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <AccountTransactionInlineEditor
                          value={toLocalDate(txn.date)}
                          field="date"
                          onSave={(value) => handleUpdate(txn, "date", value)}
                          readOnly={!canDeleteBills || txn.reconciled || isConsolidated}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1 max-w-[120px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate">
                              <AccountTransactionInlineEditor
                                value={txn.reference || '-'}
                                field="reference"
                                onSave={(value) => handleUpdate(txn, "reference", value)}
                                readOnly={!canDeleteBills || txn.reconciled || !['check', 'deposit'].includes(txn.source_type) || isConsolidated}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{txn.reference || '-'}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="px-2 py-1 max-w-[140px]">
                        {isConsolidated && extraCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs cursor-help truncate block">
                                {txn.accountDisplay || '-'} <span className="text-muted-foreground">+{extraCount}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-xs mb-2">Included Bills:</p>
                                {(txn.includedBillPayments || [])
                                  .sort((a, b) => (a.accountDisplay || '').localeCompare(b.accountDisplay || ''))
                                  .map((bp) => (
                                  <div key={bp.bill_id} className="flex justify-between gap-4 text-xs">
                                    <span className="truncate max-w-[150px]">{bp.accountDisplay || 'Unknown Account'}</span>
                                    <span>{formatTooltipCurrency(bp.amount_allocated)}</span>
                                  </div>
                                ))}
                                <div className="border-t pt-1 mt-1 flex justify-between gap-4 text-xs font-medium">
                                  <span>Total</span>
                                  <span>{formatTooltipCurrency(txn.consolidatedTotalAmount || 0)}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs truncate block">{txn.accountDisplay || '-'}</span>
                            </TooltipTrigger>
                            <TooltipContent>{txn.accountDisplay || '-'}</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1 max-w-[160px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate">
                              <AccountTransactionInlineEditor
                                value={txn.description || '-'}
                                field="description"
                                onSave={(value) => handleUpdate(txn, "description", value)}
                                readOnly={!canDeleteBills || txn.reconciled || isConsolidated}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{txn.description || '-'}</TooltipContent>
                        </Tooltip>
                      </TableCell>
              <TableCell className="px-2 py-1 text-right">
                <span className="text-xs">{formatTransactionAmount(txn, accountType)}</span>
              </TableCell>
              <TableCell className="px-2 py-1 text-right">
                <span className="text-xs">{formatAmountWithSign(balances[index])}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center">
                          {txn.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center justify-center">
                          {canDeleteBills && !txn.reconciled && !isDateLocked(txn.date) && !isConsolidated && (
                            <DeleteButton
                              onDelete={() => handleDelete(txn)}
                              title="Delete Transaction"
                              description={`Are you sure you want to delete this ${txn.source_type} transaction? This will remove all related journal entries and cannot be undone.`}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            />
                          )}
                          {(txn.reconciled || isDateLocked(txn.date)) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground text-lg cursor-help">🔒</span>
                              </TooltipTrigger>
                              <TooltipContent side="left" align="center">
                                {txn.reconciled && isDateLocked(txn.date) ? (
                                  <>
                                    <p className="font-medium">Reconciled and Books Closed</p>
                                    <p className="text-xs">Cannot be edited or deleted</p>
                                  </>
                                ) : txn.reconciled ? (
                                  <>
                                    <p className="font-medium">Reconciled</p>
                                    <p className="text-xs">Cannot be edited or deleted</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium">Books Closed</p>
                                    <p className="text-xs">Cannot be edited or deleted</p>
                                  </>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          {/* Summary section for Accounts Payable */}
          {isAccountsPayable && displayedTransactions.length > 0 && (() => {
            const billTransactions = displayedTransactions.filter(txn => txn.source_type === 'bill');
            const totalBillCount = billTransactions.length;
            // For liability accounts, credits represent the bill amounts
            const totalBillAmount = billTransactions.reduce((sum, txn) => sum + txn.credit, 0);
            return (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p>Total bills: {totalBillCount}</p>
                  <p>Total amount: {formatCurrency(totalBillAmount)}</p>
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
