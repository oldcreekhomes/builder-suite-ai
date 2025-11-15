import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { useProject } from "@/hooks/useProject";
import { useAccounts } from "@/hooks/useAccounts";
import { useChecks, CheckData, CheckLineData } from "@/hooks/useChecks";
import { useProjectCheckSettings } from "@/hooks/useProjectCheckSettings";
import { toast } from "@/hooks/use-toast";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { toDateLocal } from "@/utils/dateOnly";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { AttachmentFilesRow } from "@/components/accounting/AttachmentFilesRow";
import { useCheckAttachments } from "@/hooks/useCheckAttachments";

interface CheckRow {
  id: string;
  account: string;
  accountId?: string;
  project: string;
  projectId?: string;
  quantity?: string;
  amount: string;
  memo: string;
}

interface WriteChecksContentProps {
  projectId?: string;
}

export function WriteChecksContent({ projectId }: WriteChecksContentProps) {
  const navigate = useNavigate();
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payTo, setPayTo] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [payToName, setPayToName] = useState<string>("");
  
  const hasInitiallyLoaded = useRef(false);

  const [companyName, setCompanyName] = useState<string>("Your Company Name");
  const [companyAddress, setCompanyAddress] = useState<string>("123 Business Street");
  const [companyCityState, setCompanyCityState] = useState<string>("City, State 12345");

  const [rowErrors, setRowErrors] = useState<Record<string, boolean>>({});

  const [manualAmount, setManualAmount] = useState<string>("");
  const [useManualAmount, setUseManualAmount] = useState<boolean>(false);

  const [routingNumber, setRoutingNumber] = useState<string>("123456789");
  const [accountNumber, setAccountNumber] = useState<string>("1234567890");
  const [bankName, setBankName] = useState<string>("Your Bank Name");

  const [jobCostRows, setJobCostRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);

  const [currentEntryIndex, setCurrentEntryIndex] = useState<number>(-1);
  const [isViewingMode, setIsViewingMode] = useState(false);
  const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);

  // Attachments
  const { attachments, isUploading, uploadFiles, deleteFile } = useCheckAttachments(currentCheckId);

  const { data: project } = useProject(projectId || "");
  const { accounts } = useAccounts();
  const { checks = [], isLoading: checksLoading, createCheck, deleteCheck } = useChecks();
  const { costCodes } = useCostCodeSearch();
  const {
    settings,
    getNextCheckNumber,
  } = useProjectCheckSettings(projectId);

  const filteredChecks = useMemo(() => {
    if (!projectId) return checks;
    return checks.filter(check => check.project_id === projectId);
  }, [checks, projectId]);

  const totalCount = isViewingMode ? filteredChecks.length : filteredChecks.length + 1;
  const currentPosition = isViewingMode ? currentEntryIndex + 1 : 1;

  useEffect(() => {
    if (settings) {
      if (settings.company_name) setCompanyName(settings.company_name);
      if (settings.company_address) setCompanyAddress(settings.company_address);
      if (settings.company_city_state) setCompanyCityState(settings.company_city_state);
    }
  }, [settings]);

  useEffect(() => {
    if (settings && !checkNumber && !isViewingMode) {
      setCheckNumber(getNextCheckNumber());
    }
  }, [settings, checkNumber, getNextCheckNumber, isViewingMode]);

  useEffect(() => {
    if (!checksLoading && filteredChecks.length > 0 && !hasInitiallyLoaded.current && currentEntryIndex !== -1) {
      setCurrentEntryIndex(0);
      loadCheckData(filteredChecks[0]);
      hasInitiallyLoaded.current = true;
    }
  }, [filteredChecks, checksLoading, currentEntryIndex]);

  const addJobCostRow = () => {
    const newRow: CheckRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setJobCostRows([...jobCostRows, newRow]);
  };

  const removeJobCostRow = (id: string) => {
    if (jobCostRows.length > 1) {
      setJobCostRows(jobCostRows.filter(row => row.id !== id));
    }
  };

  const updateJobCostRow = (id: string, field: keyof CheckRow, value: string) => {
    setJobCostRows(jobCostRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
    if (field === 'accountId' && value) {
      setRowErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const addExpenseRow = () => {
    const newRow: CheckRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setExpenseRows([...expenseRows, newRow]);
  };

  const removeExpenseRow = (id: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== id));
    }
  };

  const updateExpenseRow = (id: string, field: keyof CheckRow, value: string) => {
    setExpenseRows(expenseRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
    if (field === 'accountId' && value) {
      setRowErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const calculateTotal = () => {
    const jobCostTotal = jobCostRows.reduce((total, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return total + q * c;
    }, 0);

    const expenseTotal = expenseRows.reduce((total, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return total + q * c;
    }, 0);

    return (jobCostTotal + expenseTotal).toFixed(2);
  };

  const getDisplayAmount = () => {
    const amount = useManualAmount && manualAmount ? parseFloat(manualAmount).toFixed(2) : calculateTotal();
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const validateCheckAmountMatchesLineItems = (): boolean => {
    const checkAmount = useManualAmount && manualAmount ? parseFloat(manualAmount) : parseFloat(calculateTotal());
    const lineItemsTotal = parseFloat(calculateTotal());
    const difference = Math.abs(checkAmount - lineItemsTotal);
    return difference < 0.01;
  };

  const validateRowSelection = (row: CheckRow) => {
    const hasAmount = amountOfRow(row) > 0;
    const hasSelection = !!row.accountId;
    return !hasAmount || hasSelection;
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];

    const convertChunk = (n: number): string => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const tensDigit = Math.floor(n / 10);
        const onesDigit = n % 10;
        return tens[tensDigit] + (onesDigit ? " " + ones[onesDigit] : "");
      }
      const hundredsDigit = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundredsDigit] + " Hundred" + (remainder ? " " + convertChunk(remainder) : "");
    };

    const dollars = Math.floor(num);
    const cents = Math.round((num - dollars) * 100);

    let result = "";
    let chunkIndex = 0;
    let tempDollars = dollars;

    while (tempDollars > 0) {
      const chunk = tempDollars % 1000;
      if (chunk !== 0) {
        const chunkWords = convertChunk(chunk);
        result = chunkWords + (thousands[chunkIndex] ? " " + thousands[chunkIndex] : "") + (result ? " " + result : "");
      }
      tempDollars = Math.floor(tempDollars / 1000);
      chunkIndex++;
    }

    result = result || "Zero";
    result += " and " + cents.toString().padStart(2, "0") + "/100 Dollars";

    return result;
  };

  const normalize = (s: string) => s.trim().toLowerCase();

  const extractLeadingCode = (text: string): string | null => {
    if (!text) return null;
    const trimmed = text.trim();
    const dashIdx = trimmed.indexOf("-");
    if (dashIdx > 0) {
      const left = trimmed.slice(0, dashIdx).trim();
      if (/^\d+[A-Za-z0-9.]*$/.test(left)) return left;
    }
    const match = trimmed.match(/^[A-Za-z0-9.]+/);
    return match ? match[0] : null;
  };

  const findCostCodeIdFromText = (text: string | undefined): string | undefined => {
    if (!text) return undefined;
    const leading = extractLeadingCode(text);
    if (leading) {
      const exact = costCodes.find(cc => cc.code.toLowerCase() === leading.toLowerCase());
      if (exact) return exact.id;
    }
    const q = normalize(text);
    const matches = costCodes.filter(cc =>
      cc.code.toLowerCase().includes(q) || cc.name.toLowerCase().includes(q)
    );
    return matches.length === 1 ? matches[0].id : undefined;
  };

  const findAccountIdFromText = (text: string | undefined): string | undefined => {
    if (!text) return undefined;
    const leading = extractLeadingCode(text);
    if (leading) {
      const exact = (accounts as any[]).find(acc => String(acc.code || "").toLowerCase() === leading.toLowerCase());
      if (exact) return String(exact.id);
    }
    const q = normalize(text);
    const matches = (accounts as any[]).filter(acc =>
      String(acc.code || "").toLowerCase().includes(q) || String(acc.name || "").toLowerCase().includes(q)
    );
    return matches.length === 1 ? String(matches[0].id) : undefined;
  };

  const amountOfRow = (row: CheckRow) => ((parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0));

  const createNewCheck = () => {
    setIsViewingMode(false);
    setCurrentEntryIndex(-1);
    setCurrentCheckId(null);
    handleClear();
  };

  const navigateToPrevious = () => {
    // Navigate to older checks (right arrow, higher index)
    if (currentEntryIndex === -1 && filteredChecks.length > 0) {
      // From "New" state, load the most recent check
      setCurrentEntryIndex(0);
      loadCheckData(filteredChecks[0]);
    } else if (currentEntryIndex < filteredChecks.length - 1) {
      const newIndex = currentEntryIndex + 1;
      setCurrentEntryIndex(newIndex);
      loadCheckData(filteredChecks[newIndex]);
    }
  };

  const navigateToNext = () => {
    // Navigate to newer checks (left arrow, lower index)
    if (currentEntryIndex > 0) {
      const newIndex = currentEntryIndex - 1;
      setCurrentEntryIndex(newIndex);
      loadCheckData(filteredChecks[newIndex]);
    }
  };

  const loadCheckData = (check: any) => {
    if (!check) return;
    
    setCurrentCheckId(check.id);
    setIsViewingMode(true);
    
    setCheckDate(toDateLocal(check.check_date));
    setPayTo(check.pay_to || "");
    setPayToName(check.pay_to || "");
    setCheckNumber(check.check_number || "");
    
    // Set bank account display value and ID
    const bankAcct = accounts.find(a => a.id === check.bank_account_id);
    setBankAccount(bankAcct ? `${bankAcct.code} - ${bankAcct.name}` : "");
    setBankAccountId(check.bank_account_id || "");
    
    setCompanyName(check.company_name || "Your Company Name");
    setCompanyAddress(check.company_address || "123 Business Street");
    setCompanyCityState(check.company_city_state || "City, State 12345");
    setBankName(check.bank_name || "Your Bank Name");
    setRoutingNumber(check.routing_number || "123456789");
    setAccountNumber(check.account_number || "1234567890");
    
    const jobCostLinesData: CheckRow[] = [];
    const expenseLinesData: CheckRow[] = [];
    
    (check.check_lines || []).forEach((line: any) => {
      let displayAccount = "";
      
      if (line.line_type === 'job_cost') {
        // Look up cost code and format as "code - name"
        const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
        displayAccount = costCode ? `${costCode.code} - ${costCode.name}` : "";
      } else {
        // Look up account and format as "code - name"
        const account = accounts.find(a => a.id === line.account_id);
        displayAccount = account ? `${account.code} - ${account.name}` : "";
      }
      
      const row: CheckRow = {
        id: line.id,
        account: displayAccount,
        accountId: line.line_type === 'job_cost' ? line.cost_code_id : line.account_id,
        project: line.project_id || "",
        projectId: line.project_id || "",
        quantity: "1",
        amount: line.amount?.toString() || "",
        memo: line.memo || ""
      };
      
      if (line.line_type === 'job_cost') {
        jobCostLinesData.push(row);
      } else {
        expenseLinesData.push(row);
      }
    });
    
    setJobCostRows(jobCostLinesData.length > 0 ? jobCostLinesData : [
      { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
    ]);
    setExpenseRows(expenseLinesData.length > 0 ? expenseLinesData : [
      { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
    ]);
  };

  const handleDelete = async () => {
    if (!currentCheckId) return;
    
    await deleteCheck.mutateAsync(currentCheckId);
    
    createNewCheck();
  };

  const resolveRowsForSave = (rows: CheckRow[], kind: 'job' | 'exp'): CheckRow[] => {
    return rows.map(row => {
      const amt = amountOfRow(row);
      let resolvedAccountId = row.accountId;
      if (amt > 0 && !resolvedAccountId) {
        resolvedAccountId = kind === 'job' ? findCostCodeIdFromText(row.account) : findAccountIdFromText(row.account);
      }
      return {
        ...row,
        accountId: resolvedAccountId,
        projectId: row.projectId || (projectId || ""),
      };
    });
  };

  const handleSaveAndClose = async () => {
    if (!validateCheckAmountMatchesLineItems()) {
      toast({
        title: "Validation Error",
        description: "Check amount must equal the total of all line items",
        variant: "destructive",
      });
      return;
    }

    if (!payTo) {
      toast({
        title: "Validation Error",
        description: "Please enter who the check is payable to",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccountId) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }

    const resolvedJobCost = resolveRowsForSave(jobCostRows, 'job');
    const resolvedExpense = resolveRowsForSave(expenseRows, 'exp');

    const invalidJobCost = resolvedJobCost.filter(row => !validateRowSelection(row));
    const invalidExpense = resolvedExpense.filter(row => !validateRowSelection(row));

    const errors: Record<string, boolean> = {};
    invalidJobCost.forEach(row => errors[row.id] = true);
    invalidExpense.forEach(row => errors[row.id] = true);
    setRowErrors(errors);

    if (invalidJobCost.length > 0 || invalidExpense.length > 0) {
      toast({
        title: "Validation Error",
        description: "For every line with an amount, select a cost code (Job Cost) or an expense account (Expense).",
        variant: "destructive",
      });
      return;
    }

    const allRows = [...resolvedJobCost, ...resolvedExpense].filter(row => row.accountId && amountOfRow(row) > 0);
    
    if (allRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item with a cost code/account and amount.",
        variant: "destructive",
      });
      return;
    }

    const checkLines: CheckLineData[] = [
      ...resolvedJobCost
        .filter(row => row.accountId && amountOfRow(row) > 0)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: amountOfRow(row),
          memo: row.memo || undefined
        })),
      ...resolvedExpense
        .filter(row => row.accountId && amountOfRow(row) > 0)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: amountOfRow(row),
          memo: row.memo || undefined
        }))
    ];

    const checkAmount = useManualAmount && manualAmount ? parseFloat(manualAmount) : parseFloat(calculateTotal());

    const checkData: CheckData = {
      check_number: checkNumber || undefined,
      check_date: checkDate.toISOString().split('T')[0],
      pay_to: payToName || payTo,
      bank_account_id: bankAccountId,
      project_id: projectId || undefined,
      amount: checkAmount,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      await createCheck.mutateAsync({ checkData, checkLines });
      createNewCheck();
      navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
    } catch (error) {
      console.error('Error creating check:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save check",
        variant: "destructive",
      });
    }
  };

  const handleSaveAndNew = async () => {
    if (!validateCheckAmountMatchesLineItems()) {
      toast({
        title: "Validation Error",
        description: "Check amount must equal the total of all line items",
        variant: "destructive",
      });
      return;
    }

    if (!payTo) {
      toast({
        title: "Validation Error",
        description: "Please enter who the check is payable to",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccountId) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }

    const resolvedJobCost = resolveRowsForSave(jobCostRows, 'job');
    const resolvedExpense = resolveRowsForSave(expenseRows, 'exp');

    const invalidJobCost = resolvedJobCost.filter(row => !validateRowSelection(row));
    const invalidExpense = resolvedExpense.filter(row => !validateRowSelection(row));

    const errors: Record<string, boolean> = {};
    invalidJobCost.forEach(row => errors[row.id] = true);
    invalidExpense.forEach(row => errors[row.id] = true);
    setRowErrors(errors);

    if (invalidJobCost.length > 0 || invalidExpense.length > 0) {
      toast({
        title: "Validation Error",
        description: "For every line with an amount, select a cost code (Job Cost) or an expense account (Expense).",
        variant: "destructive",
      });
      return;
    }

    const allRows = [...resolvedJobCost, ...resolvedExpense].filter(row => row.accountId && amountOfRow(row) > 0);
    
    if (allRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item with a cost code/account and amount.",
        variant: "destructive",
      });
      return;
    }

    const checkLines: CheckLineData[] = [
      ...resolvedJobCost
        .filter(row => row.accountId && amountOfRow(row) > 0)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: amountOfRow(row),
          memo: row.memo || undefined
        })),
      ...resolvedExpense
        .filter(row => row.accountId && amountOfRow(row) > 0)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: amountOfRow(row),
          memo: row.memo || undefined
        }))
    ];

    const checkAmount = useManualAmount && manualAmount ? parseFloat(manualAmount) : parseFloat(calculateTotal());

    const checkData: CheckData = {
      check_number: checkNumber || undefined,
      check_date: checkDate.toISOString().split('T')[0],
      pay_to: payToName || payTo,
      bank_account_id: bankAccountId,
      project_id: projectId || undefined,
      amount: checkAmount,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      await createCheck.mutateAsync({ checkData, checkLines });
      toast({
        title: "Success",
        description: "Check saved successfully",
      });
      createNewCheck();
    } catch (error) {
      console.error('Error creating check:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save check",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setCheckDate(new Date());
    setPayTo("");
    setPayToName("");
    setCheckNumber(getNextCheckNumber());
    setBankAccount("");
    setBankAccountId("");
    setCompanyName("Your Company Name");
    setCompanyAddress("123 Business Street");
    setCompanyCityState("City, State 12345");
    setManualAmount("");
    setUseManualAmount(false);
    setRoutingNumber("123456789");
    setAccountNumber("1234567890");
    setBankName("Your Bank Name");
    setJobCostRows([{ id: "1", account: "", accountId: "", project: "", projectId: "", quantity: "1", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", accountId: "", project: "", projectId: "", quantity: "1", amount: "", memo: "" }]);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={createNewCheck}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={navigateToPrevious}
                  size="sm"
                  variant="outline"
                  disabled={(currentEntryIndex >= filteredChecks.length - 1 && currentEntryIndex !== -1) || filteredChecks.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Older check</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={navigateToNext}
                  size="sm"
                  variant="outline"
                  disabled={currentEntryIndex <= 0 || filteredChecks.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Newer check</p>
              </TooltipContent>
            </Tooltip>
            
            {currentCheckId && isViewingMode && !isDateLocked(format(checkDate, 'yyyy-MM-dd')) ? (
              <DeleteButton
                onDelete={handleDelete}
                title="Delete Check"
                description={`Are you sure you want to delete this check${payTo ? ` to ${payTo}` : ''}${checkNumber ? ` #${checkNumber}` : ''} for $${getDisplayAmount()}? This will permanently delete the check and all associated journal entries. This action cannot be undone.`}
                size="sm"
                variant="ghost"
                isLoading={deleteCheck.isPending}
                className="ml-2"
              />
            ) : currentCheckId && isViewingMode && isDateLocked(format(checkDate, 'yyyy-MM-dd')) ? (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="ml-2"
              >
                <span className="text-lg">🔒</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="ml-2 opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 max-w-xl">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="text-xs font-medium text-gray-800 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                  placeholder="Your Company Name"
                />
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="text-[10px] text-gray-600 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                  placeholder="123 Business Street"
                />
                <Input
                  value={companyCityState}
                  onChange={(e) => setCompanyCityState(e.target.value)}
                  className="text-[10px] text-gray-600 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                  placeholder="City, State 12345"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-end">
                  <Label className="text-[10px] text-gray-600 mr-2">CHECK #</Label>
                  <Input 
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="001"
                    className="w-24 text-center text-xs border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent font-mono h-6"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <Label className="text-[10px] text-gray-600 mr-2">DATE</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-24 h-6 justify-start text-left font-normal text-xs border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent px-1",
                          !checkDate && "text-muted-foreground"
                        )}
                      >
                        {checkDate ? format(checkDate, "MM/dd/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white shadow-lg border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={checkDate}
                        onSelect={setCheckDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-medium whitespace-nowrap">PAY TO</span>
                  <div className="flex-1 border-b-2 border-gray-400">
                    <VendorSearchInput
                      value={payTo}
                      onChange={setPayTo}
                      onCompanySelect={(company) => setPayToName(company.company_name)}
                      placeholder="Payee name..."
                      className="border-0 bg-transparent h-6 text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="border-2 border-gray-400 px-2 py-0.5 min-w-[120px] text-right relative">
                  <span className="text-xs text-gray-600">$</span>
                  <Input
                    type="text"
                    value={useManualAmount ? manualAmount : getDisplayAmount()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (!isNaN(Number(value)) || value === '') {
                        setManualAmount(value);
                        setUseManualAmount(true);
                      }
                    }}
                    onFocus={() => setUseManualAmount(true)}
                    className="inline-block w-20 text-base font-bold ml-1 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 text-right"
                    placeholder="0.00"
                  />
                  {useManualAmount && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setUseManualAmount(false);
                            setManualAmount("");
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 text-[10px] flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset to calculated</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b-2 border-gray-400 pb-0.5">
                <span className="text-xs italic text-gray-700 pl-2 flex-1">
                  {numberToWords(parseFloat(getDisplayAmount().replace(/,/g, '')))}
                </span>
                <span className="text-xs font-medium pr-2">DOLLARS</span>
              </div>

              <div className="flex items-end justify-between pt-8 pb-8">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">BANK ACCOUNT</span>
                  <div className="w-64 border-b-2 border-gray-400">
                  <AccountSearchInput
                    value={bankAccount}
                    onChange={setBankAccount}
                    onAccountSelect={(account) => setBankAccountId(account.id)}
                    placeholder="Select bank account..."
                    className="border-0 bg-transparent h-8 text-sm"
                    accountType="asset"
                    bankAccountsOnly={true}
                  />
                  </div>
                </div>
                <div className="w-80 text-center relative">
                  <div className="border-b-2 border-gray-400 h-8"></div>
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-3 text-xs text-gray-600">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Expenses</h3>
            
            <Tabs defaultValue="job-cost" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
              </TabsList>
              
              <TabsContent value="job-cost" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button onClick={addJobCostRow} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>

                <div className="border rounded-lg overflow-visible">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                    <div className="col-span-3">Cost Code</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1">Quantity</div>
                    <div className="col-span-1">Cost</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {jobCostRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                      <div className="col-span-3">
                        <CostCodeSearchInput
                          value={row.account}
                          onChange={(value) => updateJobCostRow(row.id, "account", value)}
                          onCostCodeSelect={(costCode) => {
                            updateJobCostRow(row.id, "accountId", costCode.id);
                            updateJobCostRow(row.id, "account", `${costCode.code} - ${costCode.name}`);
                          }}
                          placeholder="Select cost code..."
                          className={cn("h-8", rowErrors[row.id] && "border-red-500 border-2")}
                        />
                        {rowErrors[row.id] && (
                          <p className="text-xs text-red-500 mt-1">Select a cost code</p>
                        )}
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo}
                          onChange={(e) => updateJobCostRow(row.id, "memo", e.target.value)}
                          placeholder="Description..."
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.quantity || "1"}
                          onChange={(e) => updateJobCostRow(row.id, "quantity", e.target.value)}
                          placeholder="1"
                          className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateJobCostRow(row.id, "amount", e.target.value)}
                            placeholder="0.00"
                            className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <span className="text-sm font-medium">
                          ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center items-center">
                        <Button
                          onClick={() => removeJobCostRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={jobCostRows.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="expense" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button onClick={addExpenseRow} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>

                <div className="border rounded-lg overflow-visible">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                    <div className="col-span-3">Account</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1">Quantity</div>
                    <div className="col-span-1">Cost</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {expenseRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                      <div className="col-span-3">
                        <AccountSearchInput
                          value={row.account}
                          onChange={(value) => updateExpenseRow(row.id, "account", value)}
                          onAccountSelect={(account) => {
                            updateExpenseRow(row.id, "accountId", account.id);
                            updateExpenseRow(row.id, "account", `${account.code} - ${account.name}`);
                          }}
                          placeholder="Select account..."
                          className={cn("h-8", rowErrors[row.id] && "border-red-500 border-2")}
                        />
                        {rowErrors[row.id] && (
                          <p className="text-xs text-red-500 mt-1">Select an account</p>
                        )}
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo}
                          onChange={(e) => updateExpenseRow(row.id, "memo", e.target.value)}
                          placeholder="Description..."
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.quantity || "1"}
                          onChange={(e) => updateExpenseRow(row.id, "quantity", e.target.value)}
                          placeholder="1"
                          className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateExpenseRow(row.id, "amount", e.target.value)}
                            placeholder="0.00"
                            className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <span className="text-sm font-medium">
                          ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center items-center">
                        <Button
                          onClick={() => removeExpenseRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={expenseRows.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {/* Attachments */}
              {currentCheckId && (
                <div className="mt-4">
                  <AttachmentFilesRow
                    files={attachments}
                    onFileUpload={uploadFiles}
                    onDeleteFile={deleteFile}
                    isUploading={isUploading}
                    entityType="check"
                    isReadOnly={false}
                  />
                </div>
              )}
              
              <div className="p-3 bg-muted border rounded-lg mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-base font-semibold">
                    Total: ${getDisplayAmount()}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClear} size="sm" className="h-8">
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleSaveAndNew}
                      disabled={createCheck.isPending}
                    >
                      {createCheck.isPending ? "Saving..." : "Save & New"}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={handleSaveAndClose}
                      disabled={createCheck.isPending}
                    >
                      {createCheck.isPending ? "Saving..." : "Save & Close"}
                    </Button>
                  </div>
                </div>
              </div>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
