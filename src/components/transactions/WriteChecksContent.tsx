import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { CheckAttachmentUpload, CheckAttachment } from "@/components/checks/CheckAttachmentUpload";

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
  const [attachments, setAttachments] = useState<CheckAttachment[]>([]);

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
      const newCheck = await createCheck.mutateAsync({ checkData, checkLines });
      
      // Upload temporary attachments after check is created
      if (newCheck?.id && attachments.length > 0) {
        const tempAttachments = attachments.filter(att => !att.id && att.file);
        
        for (const tempAtt of tempAttachments) {
          if (tempAtt.file) {
            const timestamp = Date.now();
            const sanitizedName = tempAtt.file_name
              .replace(/\s+/g, '_')
              .replace(/[^\w.-]/g, '_')
              .replace(/_+/g, '_');
            const fileName = `${timestamp}_${sanitizedName}`;
            const filePath = `check-attachments/${newCheck.id}/${fileName}`;
            
            await supabase.storage.from('project-files').upload(filePath, tempAtt.file);
            
            await supabase.from('check_attachments').insert({
              check_id: newCheck.id,
              file_name: tempAtt.file_name,
              file_path: filePath,
              file_size: tempAtt.file_size,
              content_type: tempAtt.content_type,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id
            });
          }
        }
      }
      
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
    setAttachments([]);
    setJobCostRows([{ id: "1", account: "", accountId: "", project: "", projectId: "", quantity: "1", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", accountId: "", project: "", projectId: "", quantity: "1", amount: "", memo: "" }]);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Header with Navigation - Matching Make Deposits */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">WRITE CHECKS</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  
                  <Button
                    onClick={createNewCheck}
                    size="sm"
                    variant="outline"
                    className="h-10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={navigateToPrevious}
                        size="sm"
                        variant="outline"
                        disabled={(currentEntryIndex >= filteredChecks.length - 1 && currentEntryIndex !== -1) || filteredChecks.length === 0}
                        className="h-10 w-10 p-0"
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
                        className="h-10 w-10 p-0"
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
                      description={`Are you sure you want to delete this check${payTo ? ` to ${payTo}` : ''}? This action cannot be undone.`}
                      size="sm"
                      variant="destructive"
                      isLoading={deleteCheck.isPending}
                      className="h-10 w-10"
                    />
                  ) : currentCheckId && isViewingMode && isDateLocked(format(checkDate, 'yyyy-MM-dd')) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-10 w-10"
                    >
                      <span className="text-lg">🔒</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled
                      className="h-10 w-10 opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="checkDate" className="text-sm whitespace-nowrap">Date:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal h-10 flex items-center",
                          !checkDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkDate ? format(checkDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={checkDate}
                        onSelect={(date) => date && setCheckDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Main Form Fields - Matching Make Deposits Layout */}
            <div className="grid grid-cols-12 gap-2 p-3 !w-full">
              <div className="col-span-3">
                <Label htmlFor="bankAccount">Bank Account</Label>
                <AccountSearchInput
                  value={bankAccount}
                  onChange={(value) => {
                    setBankAccount(value);
                    const account = accounts.find(a => `${a.code} - ${a.name}` === value);
                    if (account) setBankAccountId(account.id);
                  }}
                  onAccountSelect={(account) => {
                    setBankAccount(`${account.code} - ${account.name}`);
                    setBankAccountId(account.id);
                  }}
                  placeholder="Select bank account..."
                  accountType="asset"
                  bankAccountsOnly={true}
                  className="h-10"
                />
              </div>

              <div className="col-span-5">
                <Label htmlFor="payTo">Pay To</Label>
                <VendorSearchInput
                  value={payTo}
                  onChange={setPayTo}
                  onCompanySelect={(company) => setPayToName(company.company_name)}
                  placeholder="Search or add vendor"
                  className="h-10"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="checkNumber">Check #</Label>
                <Input
                  id="checkNumber"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Optional"
                  maxLength={10}
                  className="h-10"
                />
              </div>

              <div className="col-span-2 min-w-0">
                <Label>Attachments</Label>
                <CheckAttachmentUpload
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  checkId={currentCheckId || undefined}
                  disabled={false}
                />
              </div>
            </div>

            {/* Tabs Section - Matching Make Deposits */}
            <Tabs defaultValue="other" className="space-y-4">
              <div className="grid grid-cols-12 gap-2 p-3">
                <div className="col-span-3">
                  <TabsList className="grid grid-cols-2 w-auto">
                    <TabsTrigger value="other">Chart of Accounts</TabsTrigger>
                    <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              {/* Chart of Accounts Tab */}
              <TabsContent value="other" className="space-y-4">
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
                          className={cn("h-10", rowErrors[row.id] && "border-red-500 border-2")}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo}
                          onChange={(e) => updateExpenseRow(row.id, "memo", e.target.value)}
                          placeholder="Description..."
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.quantity || "1"}
                          onChange={(e) => updateExpenseRow(row.id, "quantity", e.target.value)}
                          placeholder="1"
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            className="h-10 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-10 flex items-center justify-end px-3 bg-muted rounded-md font-medium">
                          ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center items-center gap-1">
                        <Button
                          onClick={() => removeExpenseRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={expenseRows.length === 1}
                          className="h-10 w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={addExpenseRow}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {/* Job Cost Tab */}
              <TabsContent value="job-cost" className="space-y-4">
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
                          className={cn("h-10", rowErrors[row.id] && "border-red-500 border-2")}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo}
                          onChange={(e) => updateJobCostRow(row.id, "memo", e.target.value)}
                          placeholder="Description..."
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.quantity || "1"}
                          onChange={(e) => updateJobCostRow(row.id, "quantity", e.target.value)}
                          placeholder="1"
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            className="h-10 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-10 flex items-center justify-end px-3 bg-muted rounded-md font-medium">
                          ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center items-center gap-1">
                        <Button
                          onClick={() => removeJobCostRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={jobCostRows.length === 1}
                          className="h-10 w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={addJobCostRow}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="p-3 bg-muted border rounded-lg">
              <div className="flex justify-between items-center">
                <div className="text-base font-semibold">
                  Total: ${getDisplayAmount()}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClear} size="sm" className="h-10">
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    onClick={handleSaveAndNew}
                    disabled={createCheck.isPending}
                  >
                    {createCheck.isPending ? "Saving..." : "Save & New"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-10"
                    onClick={handleSaveAndClose}
                    disabled={createCheck.isPending}
                  >
                    {createCheck.isPending ? "Saving..." : "Save & Close"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
