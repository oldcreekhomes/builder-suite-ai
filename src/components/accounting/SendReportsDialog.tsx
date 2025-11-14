import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { pdf } from '@react-pdf/renderer';
import { BalanceSheetPdfDocument } from '@/components/reports/pdf/BalanceSheetPdfDocument';
import { IncomeStatementPdfDocument } from '@/components/reports/pdf/IncomeStatementPdfDocument';
import { JobCostsPdfDocument } from '@/components/reports/pdf/JobCostsPdfDocument';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';

interface SendReportsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendReportsDialog({ projectId, open, onOpenChange }: SendReportsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [delivery, setDelivery] = useState<"combined" | "individual">("combined");
  const [sending, setSending] = useState(false);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  
  const [reports, setReports] = useState({
    balanceSheet: true,
    incomeStatement: true,
    jobCosts: true,
  });
  
  const [selectedBankStatements, setSelectedBankStatements] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  // Fetch individual bank statements
  const { data: bankStatements } = useQuery({
    queryKey: ['bank-statements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, original_filename, file_size')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Statements/%')
        .order('original_filename');
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  const handleSend = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const selectedReports = Object.entries(reports).filter(([_, selected]) => selected);
    if (selectedReports.length === 0 && selectedBankStatements.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one report to send",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      if (!user) throw new Error('User not authenticated');

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('address')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const asOfDateStr = format(asOfDate, 'yyyy-MM-dd');
      const generatedPdfs: any = {};

      // Generate Balance Sheet PDF if selected
      if (reports.balanceSheet) {
        console.log('📊 Generating Balance Sheet PDF for project:', projectId);
        
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, code, name, type, is_active')
          .eq('is_active', true);

        console.log('📊 Accounts fetched:', accounts?.length);

        let journalLinesQuery = supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit,
            credit,
            journal_entries!inner(entry_date)
          `)
          .lte('journal_entries.entry_date', asOfDateStr);
        
        if (projectId) {
          journalLinesQuery = journalLinesQuery.or(`project_id.eq.${projectId},project_id.is.null`);
        } else {
          journalLinesQuery = journalLinesQuery.is('project_id', null);
        }

        const { data: journalLines } = await journalLinesQuery;
        console.log('📊 Journal lines fetched:', journalLines?.length);

        // Calculate balances exactly like BalanceSheetContent
        const accountBalances: Record<string, number> = {};
        journalLines?.forEach((line) => {
          if (!accountBalances[line.account_id]) {
            accountBalances[line.account_id] = 0;
          }
          accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
        });

        const assets: { current: any[], fixed: any[] } = { current: [], fixed: [] };
        const liabilities: { current: any[], longTerm: any[] } = { current: [], longTerm: [] };
        const equity: any[] = [];
        let revenueBalance = 0;
        let expenseBalance = 0;

        accounts?.forEach((account) => {
          const rawBalance = accountBalances[account.id] || 0;
          let displayBalance = rawBalance;
          
          switch (account.type) {
            case 'asset':
              displayBalance = rawBalance;
              assets.current.push({
                id: account.id,
                code: account.code,
                name: account.name,
                balance: displayBalance
              });
              break;
            case 'liability':
              displayBalance = Math.abs(rawBalance);
              liabilities.current.push({
                id: account.id,
                code: account.code,
                name: account.name,
                balance: displayBalance
              });
              break;
            case 'equity':
              displayBalance = Math.abs(rawBalance);
              equity.push({
                id: account.id,
                code: account.code,
                name: account.name,
                balance: displayBalance
              });
              break;
            case 'revenue':
              revenueBalance += -rawBalance;
              break;
            case 'expense':
              expenseBalance += rawBalance;
              break;
          }
        });

        // Add Current Year Earnings to equity
        const netIncome = revenueBalance - expenseBalance;
        if (netIncome !== 0) {
          equity.push({
            id: 'retained-earnings-current',
            code: 'RE-CY',
            name: 'Current Year Earnings',
            balance: netIncome
          });
        }

        const totalAssets = [...assets.current, ...assets.fixed].reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = [...liabilities.current, ...liabilities.longTerm].reduce((sum, a) => sum + a.balance, 0);
        const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

        console.log('📊 Balance Sheet totals - Assets:', totalAssets, 'Liabilities:', totalLiabilities, 'Equity:', totalEquity);

        const blob = await pdf(
          <BalanceSheetPdfDocument
            projectAddress={projectData.address}
            asOfDate={asOfDateStr}
            assets={assets}
            liabilities={liabilities}
            equity={equity}
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            totalEquity={totalEquity}
          />
        ).toBlob();

        const arrayBuffer = await blob.arrayBuffer();
        generatedPdfs.balanceSheet = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      // Generate Income Statement PDF if selected
      if (reports.incomeStatement) {
        console.log('📊 Generating Income Statement PDF for project:', projectId);
        
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, code, name, type, is_active')
          .eq('is_active', true)
          .in('type', ['revenue', 'expense']);

        console.log('📊 Accounts fetched:', accounts?.length);

        let journalLinesQuery = supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit,
            credit,
            journal_entries!inner(entry_date)
          `)
          .lte('journal_entries.entry_date', asOfDateStr);
        
        if (projectId) {
          journalLinesQuery = journalLinesQuery.or(`project_id.eq.${projectId},project_id.is.null`);
        } else {
          journalLinesQuery = journalLinesQuery.is('project_id', null);
        }

        const { data: journalLines } = await journalLinesQuery;
        console.log('📊 Journal lines fetched:', journalLines?.length);

        // Calculate balances exactly like IncomeStatementContent
        const accountBalances: Record<string, number> = {};
        journalLines?.forEach((line) => {
          if (!accountBalances[line.account_id]) {
            accountBalances[line.account_id] = 0;
          }
          accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
        });

        const revenue: any[] = [];
        const expenses: any[] = [];

        accounts?.forEach((account) => {
          const rawBalance = accountBalances[account.id] || 0;
          
          if (account.type === 'revenue') {
            const displayBalance = -rawBalance;
            revenue.push({
              id: account.id,
              code: account.code,
              name: account.name,
              balance: displayBalance
            });
          } else if (account.type === 'expense') {
            const displayBalance = rawBalance;
            expenses.push({
              id: account.id,
              code: account.code,
              name: account.name,
              balance: displayBalance
            });
          }
        });

        const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
        const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
        const netIncome = totalRevenue - totalExpenses;

        console.log('📊 Income Statement totals - Revenue:', totalRevenue, 'Expenses:', totalExpenses, 'Net Income:', netIncome);

        const blob = await pdf(
          <IncomeStatementPdfDocument
            projectAddress={projectData.address}
            asOfDate={asOfDateStr}
            revenue={revenue}
            expenses={expenses}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
            netIncome={netIncome}
          />
        ).toBlob();

        const arrayBuffer = await blob.arrayBuffer();
        generatedPdfs.incomeStatement = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      // Generate Job Costs PDF if selected
      if (reports.jobCosts && projectId) {
        const asOfDateStr = format(asOfDate, 'yyyy-MM-dd');
        
        console.log("📊 Job Costs PDF: Starting generation for project:", projectId);

        // Step 1: Get WIP account ID (match JobCostsContent.tsx)
        const { data: settings, error: settingsError } = await supabase
          .from('accounting_settings')
          .select('wip_account_id')
          .single();

        if (settingsError) {
          console.error("📊 Job Costs PDF: Settings query failed:", settingsError);
          throw settingsError;
        }

        const wipAccountId = settings?.wip_account_id;
        if (!wipAccountId) {
          throw new Error("WIP account not configured in accounting settings");
        }

        console.log("📊 Job Costs PDF: WIP account ID:", wipAccountId);

        // Step 2: Get budget data (match JobCostsContent.tsx)
        const { data: budgetData, error: budgetError } = await supabase
          .from('project_budgets')
          .select(`
            id,
            cost_code_id,
            quantity,
            unit_price,
            budget_source,
            selected_bid_id,
            historical_project_id,
            selected_bid:project_bids!selected_bid_id(price),
            cost_codes(id, code, name, has_subcategories, price, parent_group)
          `)
          .eq('project_id', projectId);

        if (budgetError) {
          console.error("📊 Job Costs PDF: Budget query failed:", budgetError);
          throw budgetError;
        }

        console.log(`📊 Job Costs PDF: Found ${budgetData?.length || 0} budget items`);

        // Step 3: Get actual WIP costs (match JobCostsContent.tsx)
        const { data: wipLines, error: wipError } = await supabase
          .from('journal_entry_lines')
          .select(`
            cost_code_id,
            debit,
            credit,
            journal_entries!inner(entry_date)
          `)
          .eq('account_id', wipAccountId)
          .eq('project_id', projectId)
          .not('cost_code_id', 'is', null)
          .lte('journal_entries.entry_date', asOfDateStr);

        if (wipError) {
          console.error("📊 Job Costs PDF: WIP lines query failed:", wipError);
          throw wipError;
        }

        console.log(`📊 Job Costs PDF: Found ${wipLines?.length || 0} WIP journal lines`);

        // Step 4: Build actuals by cost code
        const actualsByCostCode: Record<string, number> = {};
        wipLines?.forEach(line => {
          const costCodeId = line.cost_code_id!;
          actualsByCostCode[costCodeId] = 
            (actualsByCostCode[costCodeId] || 0) + ((line.debit || 0) - (line.credit || 0));
        });

        // Step 5: Collect cost code details
        const costCodeSet = new Set<string>();
        const costCodeData: Record<string, { code: string, name: string, parentGroup: string }> = {};
        
        const getTopLevelGroup = (costCode: string): string => {
          const num = parseFloat(costCode);
          if (isNaN(num) || num < 1000) return 'Uncategorized';
          const topLevel = Math.floor(num / 1000) * 1000;
          return topLevel.toString();
        };

        const getParentCode = (code: string): string => code.split('.')[0];

        // Add cost codes from budget
        budgetData?.forEach(item => {
          const cc = item.cost_codes;
          if (cc && item.cost_code_id) {
            costCodeSet.add(item.cost_code_id);
            costCodeData[item.cost_code_id] = { 
              code: cc.code, 
              name: cc.name,
              parentGroup: getTopLevelGroup(cc.code)
            };
          }
        });
        
        // Add cost codes from actuals
        wipLines?.forEach(line => {
          if (line.cost_code_id) {
            costCodeSet.add(line.cost_code_id);
          }
        });

        // Fetch missing cost code details
        const missingCostCodeIds = Array.from(costCodeSet).filter(id => !costCodeData[id]);
        if (missingCostCodeIds.length > 0) {
          const { data: missingCostCodes } = await supabase
            .from('cost_codes')
            .select('id, code, name, parent_group')
            .in('id', missingCostCodeIds);

          missingCostCodes?.forEach(cc => {
            costCodeData[cc.id] = {
              code: cc.code,
              name: cc.name,
              parentGroup: getTopLevelGroup(cc.code)
            };
          });
        }

        // Step 6: Calculate budgets aggregated to parent codes (match JobCostsContent.tsx)
        const sumChildrenByParent: Record<string, number> = {};
        const parentItemTotals: Record<string, number> = {};
        const parentsWithChildren = new Set<string>();
        const parentNamesByCode: Record<string, string> = {};

        budgetData?.forEach(item => {
          if (!item.cost_code_id || !item.cost_codes) return;
          const code = (item.cost_codes as any).code as string;
          const name = (item.cost_codes as any).name as string;
          const parentCode = getParentCode(code);
          const isChild = code.includes('.');
          const total = calculateBudgetItemTotal(item, 0, false);

          if (isChild) {
            sumChildrenByParent[parentCode] = (sumChildrenByParent[parentCode] || 0) + total;
            parentsWithChildren.add(parentCode);
          } else {
            parentItemTotals[parentCode] = (parentItemTotals[parentCode] || 0) + total;
            parentNamesByCode[parentCode] = name;
          }
        });

        // Fetch missing parent names
        const missingParentCodes = Array.from(parentsWithChildren).filter(pc => !parentNamesByCode[pc]);
        if (missingParentCodes.length > 0) {
          const { data: parentCodeNames } = await supabase
            .from('cost_codes')
            .select('code, name')
            .in('code', missingParentCodes);
          parentCodeNames?.forEach(cc => {
            parentNamesByCode[cc.code] = cc.name;
          });
        }

        // Build budgets by parent code
        const budgetsByParentCode: Record<string, number> = {};
        const allParentCodesSet = new Set<string>([
          ...Object.keys(parentItemTotals),
          ...Object.keys(sumChildrenByParent),
        ]);

        allParentCodesSet.forEach(pc => {
          budgetsByParentCode[pc] = parentsWithChildren.has(pc)
            ? (sumChildrenByParent[pc] || 0)
            : (parentItemTotals[pc] || 0);
        });

        // Step 7: Aggregate actuals to parent codes
        const actualsByParentCode: Record<string, number> = {};
        Object.entries(actualsByCostCode).forEach(([id, amount]) => {
          const cd = costCodeData[id];
          if (!cd) return;
          const parentCode = getParentCode(cd.code);
          actualsByParentCode[parentCode] = (actualsByParentCode[parentCode] || 0) + (amount as number);
        });

        // Ensure display names for all parent codes
        Object.keys(actualsByParentCode).forEach(pc => {
          if (!parentNamesByCode[pc]) parentNamesByCode[pc] = pc;
        });

        // Step 8: Build parent-only rows for PDF
        const costCodeRows: any[] = [];
        Array.from(new Set<string>([
          ...Object.keys(budgetsByParentCode),
          ...Object.keys(actualsByParentCode),
        ])).forEach(parentCode => {
          const budget = budgetsByParentCode[parentCode] || 0;
          const actual = actualsByParentCode[parentCode] || 0;
          const variance = budget - actual;
          costCodeRows.push({
            costCode: parentCode,
            costCodeName: parentNamesByCode[parentCode] || '',
            parentGroup: getTopLevelGroup(parentCode),
            budget,
            actual,
            variance,
          });
        });

        // Sort by cost code numerically
        costCodeRows.sort((a, b) => {
          const numA = parseFloat(a.costCode) || 0;
          const numB = parseFloat(b.costCode) || 0;
          return numA - numB;
        });

        console.log(`📊 Job Costs PDF: Generated ${costCodeRows.length} parent cost code rows`);

        // Group by parent_group
        const groupedObj: Record<string, any[]> = {};
        costCodeRows.forEach(row => {
          const group = row.parentGroup || 'Uncategorized';
          if (!groupedObj[group]) {
            groupedObj[group] = [];
          }
          groupedObj[group].push(row);
        });

        // Calculate totals
        const totalBudget = costCodeRows.reduce((sum, row) => sum + row.budget, 0);
        const totalActual = costCodeRows.reduce((sum, row) => sum + row.actual, 0);
        const totalVariance = totalBudget - totalActual;

        const blob = await pdf(
          <JobCostsPdfDocument
            projectAddress={projectData.address}
            asOfDate={asOfDateStr}
            groupedCostCodes={groupedObj}
            totalBudget={totalBudget}
            totalActual={totalActual}
            totalVariance={totalVariance}
          />
        ).toBlob();

        const arrayBuffer = await blob.arrayBuffer();
        generatedPdfs.jobCosts = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      const { data, error } = await supabase.functions.invoke('send-accounting-reports', {
        body: {
          recipientEmail: email,
          projectId,
          delivery,
          reports: {
            ...reports,
            bankStatementIds: selectedBankStatements,
          },
          asOfDate: asOfDateStr,
          generatedPdfs,
          customMessage: customMessage.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reports sent to ${email}`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending reports:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reports",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Email Reports</DialogTitle>
          <DialogDescription>
            Select reports to email and choose delivery format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">As of Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !asOfDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {asOfDate ? format(asOfDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={asOfDate}
                  onSelect={(date) => date && setAsOfDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to include in the email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Delivery Format</Label>
            <RadioGroup value={delivery} onValueChange={(v) => setDelivery(v as "combined" | "individual")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="combined" />
                <Label htmlFor="combined" className="font-normal cursor-pointer">
                  Combined (ZIP file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="font-normal cursor-pointer">
                  Individual PDF attachments
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Select Reports</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance-sheet"
                  checked={reports.balanceSheet}
                  onCheckedChange={(checked) =>
                    setReports({ ...reports, balanceSheet: checked as boolean })
                  }
                />
                <Label htmlFor="balance-sheet" className="font-normal cursor-pointer">
                  Balance Sheet
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="income-statement"
                  checked={reports.incomeStatement}
                  onCheckedChange={(checked) =>
                    setReports({ ...reports, incomeStatement: checked as boolean })
                  }
                />
                <Label htmlFor="income-statement" className="font-normal cursor-pointer">
                  Income Statement
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="job-costs"
                  checked={reports.jobCosts}
                  onCheckedChange={(checked) =>
                    setReports({ ...reports, jobCosts: checked as boolean })
                  }
                />
                <Label htmlFor="job-costs" className="font-normal cursor-pointer">
                  Job Costs Report
                </Label>
              </div>

              <div className="space-y-2">
                {bankStatements && bankStatements.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-statements"
                        checked={selectedBankStatements.length === bankStatements.length && bankStatements.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBankStatements(bankStatements.map(s => s.id));
                          } else {
                            setSelectedBankStatements([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all-statements" className="font-normal cursor-pointer">
                        Bank Statements
                      </Label>
                    </div>
                    <div className="space-y-2 pl-8 max-h-32 overflow-y-auto">
                      {bankStatements.map((statement) => {
                        const displayName = statement.original_filename.replace("Bank Statements/", "");
                        return (
                          <div key={statement.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`bank-statement-${statement.id}`}
                              checked={selectedBankStatements.includes(statement.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBankStatements((prev) => [...prev, statement.id]);
                                } else {
                                  setSelectedBankStatements((prev) => prev.filter((id) => id !== statement.id));
                                }
                              }}
                              className="mt-0.5"
                            />
                            <Label 
                              htmlFor={`bank-statement-${statement.id}`} 
                              className="cursor-pointer text-sm font-normal leading-tight flex-1"
                            >
                              {displayName}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label className="font-normal text-muted-foreground">
                      Bank Statements (None available)
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
