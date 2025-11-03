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
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  
  const [reports, setReports] = useState({
    balanceSheet: true,
    incomeStatement: true,
    jobCosts: true,
    bankStatements: true,
  });

  // Fetch bank statements count
  const { data: bankStatementsCount } = useQuery({
    queryKey: ['bank-statements-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Statements/%');
      
      if (error) throw error;
      return data?.length || 0;
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
    if (selectedReports.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one report to send",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-accounting-reports', {
        body: {
          recipientEmail: email,
          projectId,
          delivery,
          reports,
          dateRange: {
            from: format(dateFrom, 'yyyy-MM-dd'),
            to: format(dateTo, 'yyyy-MM-dd'),
          },
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

          <div className="space-y-3">
            <Label>Date Range</Label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">to</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bank-statements"
                  checked={reports.bankStatements}
                  onCheckedChange={(checked) =>
                    setReports({ ...reports, bankStatements: checked as boolean })
                  }
                />
                <Label htmlFor="bank-statements" className="font-normal cursor-pointer">
                  Bank Statements {bankStatementsCount ? `(${bankStatementsCount})` : ''}
                </Label>
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
