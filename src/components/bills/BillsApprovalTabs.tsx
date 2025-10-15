import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BillsApprovalTable } from "./BillsApprovalTable";
import { PayBillsTable } from "./PayBillsTable";
import SimplifiedAIBillExtraction from "./SimplifiedAIBillExtraction";
import { BatchBillReviewTable } from "./BatchBillReviewTable";
import { ManualBillEntry } from "./ManualBillEntry";
import { usePendingBills, type PendingBill, type PendingBillLine } from "@/hooks/usePendingBills";
import { useBillCounts } from "@/hooks/useBillCounts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface BillsApprovalTabsProps {
  projectId?: string;
  projectIds?: string[];
  reviewOnly?: boolean;
}

interface BatchBill extends PendingBill {
  vendor_name?: string;
  bill_date?: string;
  due_date?: string;
  reference_number?: string;
  lines: PendingBillLine[];
}

export function BillsApprovalTabs({ projectId, projectIds, reviewOnly = false }: BillsApprovalTabsProps) {
  const [activeTab, setActiveTab] = useState(reviewOnly ? "review" : "upload");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const effectiveProjectId = projectId || (projectIds && projectIds.length === 1 ? projectIds[0] : undefined);
  
  const { data: counts, isLoading: countsLoading } = useBillCounts(effectiveProjectId, projectIds);
  
  const {
    pendingBills,
    isLoading: pendingLoading,
    refetch: refetchPendingBills,
    deletePendingUpload,
  } = usePendingBills();

  const [batchBills, setBatchBills] = useState<BatchBill[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingCount, setExtractingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  // Sync pending bills to batch bills
  useEffect(() => {
    if (pendingBills && pendingBills.length > 0) {
      const newBatchBills = pendingBills.map(bill => ({
        ...bill,
        lines: [],
      }));
      setBatchBills(newBatchBills);
      setSelectedBillIds(new Set(newBatchBills.map(b => b.id)));
    } else {
      setBatchBills([]);
      setSelectedBillIds(new Set());
    }
  }, [pendingBills]);

  const handleExtractionStart = useCallback(() => {
    setIsExtracting(true);
  }, []);

  const handleExtractionComplete = useCallback(async () => {
    setIsExtracting(false);
    setExtractingCount(0);
    // Refetch pending bills after extraction completes
    await refetchPendingBills();
  }, [refetchPendingBills]);

  const handleExtractionProgress = (remaining: number) => {
    // Only update the counter - NO data refetch
    setExtractingCount(remaining);
  };

  const handleBillUpdate = useCallback((billId: string, updates: Partial<BatchBill>) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, ...updates } : bill
    ));
  }, []);

  const handleBillDelete = useCallback(async (billId: string) => {
    try {
      // Delete from DB (also cleans up related lines via RPC)
      await deletePendingUpload.mutateAsync(billId);

      // Optimistically update local UI
      setBatchBills(prev => prev.filter(bill => bill.id !== billId));
      setSelectedBillIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });

      // Ensure counters and lists are in sync immediately
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      await refetchPendingBills();
    } catch (err) {
      console.error("Failed to delete pending upload:", err);
      toast({
        title: "Error",
        description: "Failed to delete the uploaded bill. Please try again.",
        variant: "destructive",
      });
    }
  }, [deletePendingUpload, queryClient, refetchPendingBills, toast]);

  const handleLinesUpdate = useCallback((billId: string, lines: PendingBillLine[]) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, lines } : bill
    ));
  }, []);

  const handleBillSelect = useCallback((billId: string) => {
    setSelectedBillIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedBillIds(new Set(batchBills.map(b => b.id)));
    } else {
      setSelectedBillIds(new Set());
    }
  }, [batchBills]);

  const handleSubmitAllBills = useCallback(async () => {
    if (selectedBillIds.size === 0) return;
    
    setIsSubmitting(true);
    try {
      const selectedBills = batchBills.filter(bill => selectedBillIds.has(bill.id));
      
      for (const bill of selectedBills) {
        // Get data from extracted_data or bill properties
        const vendorId = bill.extracted_data?.vendor_id;
        const vendorName = bill.extracted_data?.vendorName || bill.extracted_data?.vendor_name || bill.vendor_name;
        const billDate = bill.extracted_data?.billDate || bill.extracted_data?.bill_date || bill.bill_date;
        const dueDate = bill.extracted_data?.dueDate || bill.extracted_data?.due_date || bill.due_date;
        const referenceNumber = bill.extracted_data?.referenceNumber || bill.extracted_data?.reference_number || bill.reference_number;
        const totalAmount = bill.extracted_data?.totalAmount || bill.extracted_data?.total_amount;
        
        if (!vendorId) {
          console.error("No vendor_id found for bill:", bill.id);
          continue;
        }

        const { data: insertedBill, error: billError } = await supabase
          .from('bills')
          .insert({
            vendor_id: vendorId,
            bill_date: billDate,
            due_date: dueDate,
            reference_number: referenceNumber,
            total_amount: totalAmount,
            project_id: effectiveProjectId,
            status: 'draft',
            created_by: bill.owner_id,
            owner_id: bill.owner_id,
          })
          .select()
          .single();

        if (billError) throw billError;

        // Skip line items for now - will be handled by separate bill line entry process
        // if (bill.lines.length > 0) {
        //   const { error: linesError } = await supabase
        //     .from('bill_line_items')
        //     .insert(
        //       bill.lines.map(line => ({
        //         bill_id: insertedBill.id,
        //         account_id: line.account_id,
        //         cost_code_id: line.cost_code_id,
        //         description: line.description,
        //         amount: line.amount,
        //         line_type: line.line_type,
        //       }))
        //     );
        //
        //   if (linesError) throw linesError;
        // }

        // Delete the pending bill
        const { error: deleteError } = await supabase
          .from('pending_bill_uploads')
          .delete()
          .eq('id', bill.id);

        if (deleteError) throw deleteError;
      }

      // Invalidate queries to update all tab counts immediately
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });

      toast({
        title: "Success",
        description: `${selectedBills.length} bill${selectedBills.length > 1 ? 's' : ''} submitted successfully`,
      });

      setBatchBills([]);
      setSelectedBillIds(new Set());
      await refetchPendingBills();
    } catch (error) {
      console.error("Error submitting bills:", error);
      
      // Invalidate queries even on error in case of partial success
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      
      toast({
        title: "Error",
        description: "Failed to submit bills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [batchBills, selectedBillIds, effectiveProjectId, toast, refetchPendingBills]);

  const getTabLabel = (status: string, count: number | undefined) => {
    if (countsLoading) {
      switch (status) {
        case 'manual':
          return "Enter Manually";
        case 'upload':
          return "Enter with AI";
        case 'review':
          return "Review";
        case 'approve':
          return "Approved";
        case 'pay':
          return "Paid";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'manual':
        return "Enter Manually";
      case 'upload':
        return `Enter with AI (${displayCount})`;
      case 'review':
        return `Review (${displayCount})`;
      case 'approve':
        return `Approved (${displayCount})`;
      case 'pay':
        return `Paid (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  const tabs = reviewOnly
    ? [
        { value: "review", label: getTabLabel('review', counts?.pendingCount) },
        { value: "approve", label: getTabLabel('approve', counts?.approvedCount) },
        { value: "pay", label: getTabLabel('pay', counts?.payBillsCount) },
      ]
    : [
        { value: "manual", label: getTabLabel('manual', undefined) },
        { value: "upload", label: getTabLabel('upload', counts?.aiExtractCount) },
        { value: "review", label: getTabLabel('review', counts?.pendingCount) },
        { value: "approve", label: getTabLabel('approve', counts?.approvedCount) },
        { value: "pay", label: getTabLabel('pay', counts?.payBillsCount) },
      ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${reviewOnly ? 'grid-cols-3' : 'grid-cols-5'}`}>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {!reviewOnly && (
        <>
          <TabsContent value="manual" className="mt-6">
            <ManualBillEntry />
          </TabsContent>

          <TabsContent value="upload" className="mt-6 space-y-6">
            <SimplifiedAIBillExtraction 
              onDataExtracted={() => {}}
              onSwitchToManual={() => setActiveTab("manual")}
              suppressIndividualToasts={true}
              onExtractionStart={(total) => handleExtractionStart()}
              onExtractionComplete={handleExtractionComplete}
              onExtractionProgress={handleExtractionProgress}
            />

          {isExtracting ? (
            <div className="h-64 flex items-center justify-center rounded-md border bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  Processing {extractingCount} PDF{extractingCount !== 1 ? "s" : ""}...
                </span>
              </div>
            </div>
          ) : batchBills.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Bills</CardTitle>
                <CardDescription>Upload PDF files above to extract bill data automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>No bills uploaded yet</p>
                  <p className="text-sm">Upload PDF files above to extract bill data automatically</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Extracted Bills</CardTitle>
                    <CardDescription>
                      Review and edit {batchBills.length} bill{batchBills.length > 1 ? "s" : ""} before submitting
                    </CardDescription>
                  </div>
                  <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="lg">
                    {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BatchBillReviewTable
                  bills={batchBills}
                  onBillUpdate={handleBillUpdate}
                  onBillDelete={handleBillDelete}
                  onLinesUpdate={handleLinesUpdate}
                  selectedBillIds={selectedBillIds}
                  onBillSelect={handleBillSelect}
                  onSelectAll={handleSelectAll}
                  showProjectColumn={!effectiveProjectId}
                />
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </>
      )}

      <TabsContent value="review" className="mt-6">
        {batchBills.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Bills</CardTitle>
              <CardDescription>No bills pending review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No bills uploaded yet</p>
                <p className="text-sm">Upload PDF files in the "Enter with AI" tab to extract bill data</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Extracted Bills</CardTitle>
                  <CardDescription>
                    Review and edit {batchBills.length} bill{batchBills.length > 1 ? "s" : ""} before submitting
                  </CardDescription>
                </div>
                <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="lg">
                  {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <BatchBillReviewTable
                bills={batchBills}
                onBillUpdate={handleBillUpdate}
                onBillDelete={handleBillDelete}
                onLinesUpdate={handleLinesUpdate}
                selectedBillIds={selectedBillIds}
                onBillSelect={handleBillSelect}
                onSelectAll={handleSelectAll}
                showProjectColumn={!effectiveProjectId}
              />
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="approve" className="mt-6">
        <BillsApprovalTable 
          status="draft"
          projectId={effectiveProjectId} 
          projectIds={projectIds} 
        />
      </TabsContent>

      <TabsContent value="pay" className="mt-6">
        <PayBillsTable projectId={effectiveProjectId} projectIds={projectIds} />
      </TabsContent>
    </Tabs>
  );
}
