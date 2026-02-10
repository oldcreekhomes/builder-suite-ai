import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CalendarIcon, FileDown, ChevronDown, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LotSelector } from "@/components/budget/LotSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { AccountsPayablePdfDocument, APAgingBill } from "./pdf/AccountsPayablePdfDocument";
import { useToast } from "@/hooks/use-toast";

interface AccountsPayableContentProps {
  projectId?: string;
}

interface BillWithVendor {
  id: string;
  bill_date: string;
  reference_number: string | null;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  vendor: { company_name: string } | null;
  bill_lines: { lot_id: string | null }[];
}

export function AccountsPayableContent({ projectId }: AccountsPayableContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set(['1-30', '31-60', '61-90', '>90']));
  const { toast } = useToast();

  // Fetch project address for PDF export
  const { data: projectData } = useQuery({
    queryKey: ['project-address', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('address')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch lot name for PDF
  const { data: lotData } = useQuery({
    queryKey: ['lot-name', selectedLotId],
    queryFn: async () => {
      if (!selectedLotId) return null;
      const { data, error } = await supabase
        .from('project_lots')
        .select('lot_name, lot_number')
        .eq('id', selectedLotId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLotId,
  });

  // Fetch outstanding bills
  const { data: billsData, isLoading, error } = useQuery({
    queryKey: ['ap-aging', projectId, selectedLotId, asOfDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<BillWithVendor[]> => {
      if (!projectId) {
        throw new Error("Project ID is required for A/P Aging report");
      }

      const asOfDateStr = asOfDate.toISOString().split('T')[0];

      // Step 1: Fetch ALL non-reversed bills (posted or paid) with bill_date <= asOfDate
      const { data, error } = await supabase
        .from('bills')
        .select(`
          id,
          bill_date,
          reference_number,
          due_date,
          total_amount,
          amount_paid,
          vendor:companies!vendor_id(company_name),
          bill_lines(lot_id)
        `)
        .eq('project_id', projectId)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_by_id', null)
        .lte('bill_date', asOfDateStr);

      if (error) throw error;

      const bills = data || [];
      if (bills.length === 0) return [];

      // Step 2: Query journal entries for bill payments made on or before the as-of date
      const billIds = bills.map(b => b.id);
      const { data: paymentEntries, error: payError } = await supabase
        .from('journal_entries')
        .select('source_id, journal_entry_lines!inner(debit)')
        .eq('source_type', 'bill_payment')
        .in('source_id', billIds)
        .lte('entry_date', asOfDateStr)
        .is('reversed_at', null)
        .gt('journal_entry_lines.debit', 0);

      if (payError) throw payError;

      // Step 3: Sum payments per bill as of the report date
      const paidAsOfDate: Record<string, number> = {};
      (paymentEntries || []).forEach((entry: any) => {
        const billId = entry.source_id;
        const debit = entry.journal_entry_lines?.[0]?.debit || 0;
        paidAsOfDate[billId] = (paidAsOfDate[billId] || 0) + debit;
      });

      // Step 4: Calculate open balance and filter
      let filteredBills = bills.map(bill => ({
        ...bill,
        amount_paid: paidAsOfDate[bill.id] || 0,
      })).filter(bill => {
        const openBalance = bill.total_amount - bill.amount_paid;
        return openBalance > 0.01;
      });

      // Filter by lot if selected
      if (selectedLotId) {
        filteredBills = filteredBills.filter(bill => {
          const lotIds = bill.bill_lines?.map(line => line.lot_id) || [];
          return lotIds.includes(selectedLotId) || lotIds.every(id => id === null);
        });
      }

      return filteredBills as BillWithVendor[];
    },
    enabled: !!user && !!session && !authLoading && !!projectId && !!selectedLotId,
  });

  // Calculate aging and group into buckets
  const agingBuckets = useMemo(() => {
    const buckets: {
      '1-30': APAgingBill[];
      '31-60': APAgingBill[];
      '61-90': APAgingBill[];
      '>90': APAgingBill[];
    } = {
      '1-30': [],
      '31-60': [],
      '61-90': [],
      '>90': [],
    };

    if (!billsData) return buckets;

    const asOfTime = asOfDate.getTime();

    billsData.forEach(bill => {
      const billDate = new Date(bill.bill_date + 'T00:00:00');
      const diffTime = asOfTime - billDate.getTime();
      const aging = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const openBalance = bill.total_amount - bill.amount_paid;

      const agingBill: APAgingBill = {
        id: bill.id,
        billDate: bill.bill_date,
        referenceNumber: bill.reference_number,
        vendorName: bill.vendor?.company_name || 'Unknown Vendor',
        dueDate: bill.due_date,
        aging,
        openBalance,
      };

      if (aging >= 1 && aging <= 30) {
        buckets['1-30'].push(agingBill);
      } else if (aging >= 31 && aging <= 60) {
        buckets['31-60'].push(agingBill);
      } else if (aging >= 61 && aging <= 90) {
        buckets['61-90'].push(agingBill);
      } else if (aging > 90) {
        buckets['>90'].push(agingBill);
      }
      // Bills with aging < 1 (future dated or same day) are excluded
    });

    // Sort each bucket by bill date
    Object.values(buckets).forEach(bucket => {
      bucket.sort((a, b) => a.billDate.localeCompare(b.billDate));
    });

    return buckets;
  }, [billsData, asOfDate]);

  const grandTotal = useMemo(() => {
    return Object.values(agingBuckets).flat().reduce((sum, bill) => sum + bill.openBalance, 0);
  }, [agingBuckets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  const handleBucketToggle = (bucket: string) => {
    setExpandedBuckets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bucket)) {
        newSet.delete(bucket);
      } else {
        newSet.add(bucket);
      }
      return newSet;
    });
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    
    try {
      const lotName = lotData ? (lotData.lot_name || `Lot ${lotData.lot_number}`) : undefined;

      const blob = await pdf(
        <AccountsPayablePdfDocument
          projectAddress={projectData?.address}
          lotName={lotName}
          asOfDate={format(asOfDate, 'yyyy-MM-dd')}
          agingBuckets={agingBuckets}
          grandTotal={grandTotal}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AP_Aging_Report-${asOfDate.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF exported successfully",
        description: "Your A/P aging report has been downloaded",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF export failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the PDF",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!projectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Accounts Payable</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please select a project to view A/P aging report.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Accounts Payable</h2>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Accounts Payable</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading A/P aging data.</p>
            <p className="text-sm text-muted-foreground mt-2">
              {(error as Error)?.message || 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bucketLabels: Record<string, string> = {
    '1-30': '1 - 30 Days',
    '31-60': '31 - 60 Days',
    '61-90': '61 - 90 Days',
    '>90': 'Over 90 Days',
  };

  const totalBillCount = Object.values(agingBuckets).flat().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Accounts Payable</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              As of {format(asOfDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>A/P Aging Detail</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleExportPdf} 
                variant="outline" 
                disabled={isExportingPdf || totalBillCount === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isExportingPdf ? 'Exporting...' : 'Export PDF'}
              </Button>
              <LotSelector
                projectId={projectId}
                selectedLotId={selectedLotId}
                onSelectLot={setSelectedLotId}
              />
            </div>
          </CardHeader>
          <CardContent>
            {totalBillCount === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No outstanding bills found for the selected criteria.
              </p>
            ) : (
              <div className="space-y-4">
                {(Object.entries(agingBuckets) as [keyof typeof agingBuckets, APAgingBill[]][]).map(([bucketKey, bills]) => {
                  if (bills.length === 0) return null;
                  const bucketTotal = bills.reduce((sum, bill) => sum + bill.openBalance, 0);
                  const isExpanded = expandedBuckets.has(bucketKey);

                  return (
                    <Collapsible
                      key={bucketKey}
                      open={isExpanded}
                      onOpenChange={() => handleBucketToggle(bucketKey)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{bucketLabels[bucketKey]}</span>
                              <span className="text-muted-foreground text-sm">
                                ({bills.length} bill{bills.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <span className="font-semibold">{formatCurrency(bucketTotal)}</span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[14%]">Date</TableHead>
                                  <TableHead className="w-[12%]">Num</TableHead>
                                  <TableHead className="w-[28%]">Name</TableHead>
                                  <TableHead className="w-[14%]">Due Date</TableHead>
                                  <TableHead className="w-[10%] text-right">Aging</TableHead>
                                  <TableHead className="w-[22%] text-right">Open Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bills.map((bill) => (
                                  <TableRow key={bill.id}>
                                    <TableCell>{formatDate(bill.billDate)}</TableCell>
                                    <TableCell>{bill.referenceNumber || '-'}</TableCell>
                                    <TableCell className="font-medium">{bill.vendorName}</TableCell>
                                    <TableCell>{formatDate(bill.dueDate)}</TableCell>
                                    <TableCell className="text-right">{bill.aging}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(bill.openBalance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}

                {/* Grand Total */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border-2 border-primary/20">
                  <span className="font-bold text-lg">Total Outstanding</span>
                  <span className="font-bold text-lg">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
