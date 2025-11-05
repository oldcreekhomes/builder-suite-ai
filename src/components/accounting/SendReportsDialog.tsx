import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
        const { data: accounts } = await supabase
          .from('accounts')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .order('code');

        const { data: journalLines } = await supabase
          .from('journal_entry_lines')
          .select('*, journal_entries!inner(*), accounts(*)')
          .eq('owner_id', user.id)
          .or(`project_id.eq.${projectId},project_id.is.null`, { foreignTable: 'journal_entries' })
          .lte('journal_entries.entry_date', asOfDateStr);

        const accountBalances = new Map<string, number>();
        journalLines?.forEach((line) => {
          const accountId = line.account_id;
          const current = accountBalances.get(accountId) || 0;
          accountBalances.set(accountId, current + (line.debit || 0) - (line.credit || 0));
        });

        const categorize = (type: string) => 
          accounts?.filter(a => a.type === type).map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            balance: accountBalances.get(a.id) || 0,
          })) || [];

        const currentAssets = categorize('asset').filter(a => a.code.startsWith('1') && parseInt(a.code) < 1500);
        const fixedAssets = categorize('asset').filter(a => a.code.startsWith('1') && parseInt(a.code) >= 1500);
        const currentLiabilities = categorize('liability').filter(a => a.code.startsWith('2') && parseInt(a.code) < 2500);
        const longTermLiabilities = categorize('liability').filter(a => a.code.startsWith('2') && parseInt(a.code) >= 2500);
        const equity = categorize('equity');

        const totalAssets = [...currentAssets, ...fixedAssets].reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = [...currentLiabilities, ...longTermLiabilities].reduce((sum, a) => sum + a.balance, 0);
        const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

        const blob = await pdf(
          <BalanceSheetPdfDocument
            projectAddress={projectData.address}
            asOfDate={asOfDateStr}
            assets={{
              current: currentAssets,
              fixed: fixedAssets,
            }}
            liabilities={{
              current: currentLiabilities,
              longTerm: longTermLiabilities,
            }}
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
        const { data: accounts } = await supabase
          .from('accounts')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .order('code');

        const { data: journalLines } = await supabase
          .from('journal_entry_lines')
          .select('*, journal_entries!inner(*)')
          .eq('owner_id', user.id)
          .or(`project_id.eq.${projectId},project_id.is.null`, { foreignTable: 'journal_entries' })
          .lte('journal_entries.entry_date', asOfDateStr);

        const accountBalances = new Map<string, number>();
        journalLines?.forEach((line) => {
          const accountId = line.account_id;
          const current = accountBalances.get(accountId) || 0;
          accountBalances.set(accountId, current + (line.debit || 0) - (line.credit || 0));
        });

        const revenue = accounts?.filter(a => a.type === 'revenue').map(a => ({
          id: a.id,
          code: a.code,
          name: a.name,
          balance: -(accountBalances.get(a.id) || 0),
        })) || [];

        const expenses = accounts?.filter(a => a.type === 'expense').map(a => ({
          id: a.id,
          code: a.code,
          name: a.name,
          balance: accountBalances.get(a.id) || 0,
        })) || [];

        const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
        const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
        const netIncome = totalRevenue - totalExpenses;

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
      if (reports.jobCosts) {
        const { data: budgetItems } = await supabase
          .from('project_budgets')
          .select('*, cost_codes(code, name, parent_group)')
          .eq('project_id', projectId)
          .order('cost_codes(code)');

        const { data: allCostCodes } = await supabase
          .from('cost_codes')
          .select('code, parent_group')
          .eq('owner_id', user.id);

        const topLevelGroups = new Set(
          allCostCodes?.filter(cc => !allCostCodes.some(c => c.code === cc.parent_group)).map(cc => cc.code) || []
        );

        const grouped = budgetItems?.reduce((acc: Record<string, any[]>, item: any) => {
          const group = item.cost_codes?.parent_group || 'Uncategorized';
          if (!acc[group]) acc[group] = [];
          acc[group].push({
            costCode: item.cost_codes?.code || '',
            costCodeName: item.cost_codes?.name || '',
            budget: item.quantity * item.unit_price || 0,
            actual: item.actual_amount || 0,
            variance: (item.quantity * item.unit_price || 0) - (item.actual_amount || 0),
          });
          return acc;
        }, {});

        const groupedObj: Record<string, any[]> = {};
        Object.entries(grouped || {}).filter(([group]) => topLevelGroups.has(group)).forEach(([key, val]) => {
          groupedObj[key] = val;
        });
        const totalBudget = budgetItems?.reduce((sum, item) => sum + (item.quantity * item.unit_price || 0), 0) || 0;
        const totalActual = budgetItems?.reduce((sum, item) => sum + (item.actual_amount || 0), 0) || 0;
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
