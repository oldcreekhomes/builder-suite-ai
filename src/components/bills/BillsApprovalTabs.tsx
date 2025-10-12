import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillsApprovalTable } from "./BillsApprovalTable";
import { PayBillsTable } from "./PayBillsTable";
import { ManualBillEntry } from "./ManualBillEntry";
import SimplifiedAIBillExtraction from "./SimplifiedAIBillExtraction";
import { BatchBillReviewTable } from "./BatchBillReviewTable";
import { useBillCounts } from "@/hooks/useBillCounts";
import { usePendingBills } from "@/hooks/usePendingBills";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { normalizeToYMD } from "@/utils/dateOnly";

interface BillsApprovalTabsProps {
  projectId?: string;
  projectIds?: string[];
  reviewOnly?: boolean;
}

export function BillsApprovalTabs({ projectId, projectIds, reviewOnly = false }: BillsApprovalTabsProps) {
  const { projectId: paramsProjectId } = useParams();
  const effectiveProjectId = projectId || paramsProjectId;
  
  const [activeTab, setActiveTab] = useState(reviewOnly ? "pending" : "enter-manually");
  const { data: counts, isLoading } = useBillCounts(effectiveProjectId, projectIds);
  
  const { pendingBills, isLoading: loadingPendingBills, batchApproveBills, deletePendingUpload } = usePendingBills();
  const [batchBills, setBatchBills] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingUploads, setProcessingUploads] = useState<any[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  
  // Processing gate refs and state to control banner visibility
  const processingIdsRef = useRef<Set<string>>(new Set());
  const awaitingAppearanceRef = useRef<Set<string>>(new Set());
  const [isBuildingBatch, setIsBuildingBatch] = useState(false);
  const [showProcessingBanner, setShowProcessingBanner] = useState(false);
  const [bannerFileNames, setBannerFileNames] = useState<string[]>([]);

  // Helper to recompute banner visibility
  const recomputeBanner = (uploads?: any[]) => {
    const hasProcessing = (uploads ?? processingUploads).length > 0;
    const awaiting = awaitingAppearanceRef.current.size > 0;
    const show = hasProcessing || awaiting || isBuildingBatch || loadingPendingBills;
    setShowProcessingBanner(show);
  };

  // Update batch bills when pending bills change
  useEffect(() => {
    const fetchBillsWithLines = async () => {
      if (!pendingBills) return;

      setIsBuildingBatch(true);
      try {
        // Don't eagerly clear to avoid flicker during refetch
        // if (pendingBills.length === 0) { setBatchBills([]); return; }

      // Include all bills that have data to show, including processing ones
      const completedBills = pendingBills.filter(b => 
        b.status === 'extracted' || b.status === 'completed' || b.status === 'reviewing' || b.status === 'error' || b.status === 'processing'
      );
      
      const billsWithLines = await Promise.all(
        completedBills.map(async (bill) => {
          const extractedData = bill.extracted_data || {};
          
          const { data: lines } = await supabase
            .from('pending_bill_lines')
            .select('*')
            .eq('pending_upload_id', bill.id)
            .order('line_number');
          
          let finalLines = lines || [];
          if ((!lines || lines.length === 0) && extractedData.lineItems && Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0) {
            const { data: userData } = await supabase.auth.getUser();
            const ownerId = userData.user?.id;

            const { data: accounts } = await supabase
              .from('accounts')
              .select('id, name')
              .eq('owner_id', ownerId);

            const { data: costCodes } = await supabase
              .from('cost_codes')
              .select('id, name')
              .eq('owner_id', ownerId);

            const extractedTotal = Number(extractedData.totalAmount || extractedData.total_amount) || 0;
            const isSingleLine = extractedData.lineItems.length === 1;

            const linesToInsert = extractedData.lineItems.map((item: any, index: number) => {
              const accountId = item.account_name 
                ? accounts?.find((a: any) => a.name === item.account_name)?.id 
                : null;
              const costCodeId = item.cost_code_name 
                ? costCodes?.find((c: any) => c.name === item.cost_code_name)?.id 
                : null;
              
              const lineType = costCodeId ? 'job_cost' : 'expense';
              
              const qty = Number(item.quantity) || 1;
              const unitPrice = Number(item.unit_price || item.unitPrice) || 0;
              
              let parsedAmount = typeof item.amount === 'string'
                ? Number(item.amount.replace(/[^0-9.-]/g, ''))
                : Number(item.amount) || 0;
              
              if (isSingleLine && extractedTotal > 0 && Math.abs(parsedAmount - extractedTotal) > 0.01) {
                parsedAmount = extractedTotal;
              }
              
              if (parsedAmount > 1000000 && unitPrice > 0) {
                parsedAmount = qty * unitPrice;
              }
              
              const finalAmount = unitPrice > 0 ? Math.round(qty * unitPrice * 100) / 100 : parsedAmount;
              const unitCost = finalAmount > 0 && qty > 0 ? finalAmount / qty : 0;
              
              return {
                pending_upload_id: bill.id,
                owner_id: ownerId,
                line_number: index + 1,
                line_type: lineType,
                description: item.description || '',
                account_id: accountId,
                cost_code_id: costCodeId,
                account_name: item.account_name || null,
                cost_code_name: item.cost_code_name || null,
                project_name: item.project_name || null,
                quantity: qty,
                unit_cost: unitCost,
                amount: finalAmount,
                memo: item.memo || item.description || '',
              };
            });

            const { data: insertedLines } = await supabase
              .from('pending_bill_lines')
              .insert(linesToInsert)
              .select();

            finalLines = insertedLines || [];
          }

          try {
            const vendorId = extractedData.vendor_id || extractedData.vendorId || null;
            if (vendorId) {
              const { data: cc } = await supabase
                .from('company_cost_codes')
                .select('cost_code_id')
                .eq('company_id', vendorId);
              if (cc && cc.length === 1) {
                const defaultId = cc[0].cost_code_id as string;
                const { data: ccInfo } = await supabase
                  .from('cost_codes')
                  .select('code, name')
                  .eq('id', defaultId)
                  .maybeSingle();
                const costCodeName = ccInfo ? `${ccInfo.code}: ${ccInfo.name}` : null;

                const updatePromises: Promise<any>[] = [];
                finalLines = (finalLines || []).map((line: any) => {
                  if (line.line_type === 'job_cost' && !line.cost_code_id) {
                    line.cost_code_id = defaultId;
                    line.cost_code_name = costCodeName;
                    updatePromises.push(
                      (async () => {
                        await supabase.from('pending_bill_lines')
                          .update({ cost_code_id: defaultId, cost_code_name: costCodeName })
                          .eq('id', line.id);
                      })()
                    );
                  } else if (line.line_type === 'expense' && !line.account_id && !line.cost_code_id) {
                    line.line_type = 'job_cost';
                    line.cost_code_id = defaultId;
                    line.cost_code_name = costCodeName;
                    updatePromises.push(
                      (async () => {
                        await supabase.from('pending_bill_lines')
                          .update({ line_type: 'job_cost', cost_code_id: defaultId, cost_code_name: costCodeName })
                          .eq('id', line.id);
                      })()
                    );
                  }
                  return line;
                });
                if (updatePromises.length) {
                  await Promise.all(updatePromises);
                }
              }
            }
          } catch (e) {
            console.warn('Default cost code application skipped:', e);
          }
          
          return {
            id: bill.id,
            file_name: bill.file_name,
            file_path: bill.file_path,
            status: bill.status,
            vendor_id: extractedData.vendor_id || extractedData.vendorId || null,
            vendor_name: extractedData.vendor_name || extractedData.vendor || '',
            bill_date: normalizeToYMD(extractedData.bill_date || extractedData.billDate || extractedData.date || ''),
            due_date: normalizeToYMD(extractedData.due_date || extractedData.dueDate || ''),
            reference_number: extractedData.referenceNumber || extractedData.reference_number || '',
            terms: extractedData.terms || 'net-30',
            notes: extractedData.notes || '',
            total_amount: extractedData.totalAmount || extractedData.total_amount || 0,
            lines: finalLines
          };
        })
      );
      
      // Any IDs now present in billsWithLines are no longer "awaiting appearance"
      billsWithLines.forEach(b => awaitingAppearanceRef.current.delete(b.id));
      
      setBatchBills(billsWithLines);
      } finally {
        setIsBuildingBatch(false);
        recomputeBanner();
      }
    };

    fetchBillsWithLines();
  }, [pendingBills]);

  const handleBillUpdate = async (billId: string, updates: any) => {
    // Update local state immediately for responsive UI
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, ...(updates || {}) } : bill
    ));
    
    // If vendor info is being updated, persist to database
    if (updates && (updates.vendor_id !== undefined || updates.vendor_name !== undefined)) {
      try {
        // Get the current extracted_data
        const { data: currentBill } = await supabase
          .from('pending_bill_uploads')
          .select('extracted_data')
          .eq('id', billId)
          .single();
        
        const currentData = (currentBill?.extracted_data as Record<string, any>) || {};
        
        // Merge the updates into extracted_data
        const updatedData: Record<string, any> = {
          ...currentData,
        };
        
        if (updates.vendor_id !== undefined) {
          updatedData.vendor_id = updates.vendor_id;
          updatedData.vendorId = updates.vendor_id;
        }
        
        if (updates.vendor_name !== undefined) {
          updatedData.vendor_name = updates.vendor_name;
          updatedData.vendor = updates.vendor_name;
        }
        
        // Save to database
        const { error } = await supabase
          .from('pending_bill_uploads')
          .update({ 
            extracted_data: updatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', billId);
        
        if (error) {
          console.error('Failed to persist vendor update:', error);
          toast({
            title: "Warning",
            description: "Vendor was added but may need to be reselected",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Error persisting vendor update:', err);
      }
    }
  };

  const handleBillDelete = async (billId: string) => {
    try {
      await deletePendingUpload.mutateAsync(billId);
      // Update local state to remove the deleted bill
      setBatchBills(prev => prev.filter(bill => bill.id !== billId));
      // Remove from selection if it was selected
      setSelectedBillIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    } catch (error) {
      // Error handling is already done by the mutation
      console.error('Delete failed:', error);
    }
  };

  const handleLinesUpdate = async (billId: string, lines: any[]) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, lines } : bill
    ));

    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;

    await supabase
      .from('pending_bill_lines')
      .delete()
      .eq('pending_upload_id', billId);

    const linesToInsert = lines.map(line => ({
      pending_upload_id: billId,
      owner_id: ownerId,
      ...line,
    }));

    await supabase
      .from('pending_bill_lines')
      .insert(linesToInsert);
  };

  const handleBillSelect = (billId: string) => {
    setSelectedBillIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedBillIds(new Set(batchBills.map(bill => bill.id)));
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const validateBillForSubmission = (bill: any) => {
    const issues: string[] = [];
    
    if (!bill.vendor_id) {
      if (!bill.vendor_name) {
        issues.push("Vendor required");
      } else {
        issues.push("Vendor not in database");
      }
    }
    
    if (!bill.bill_date) issues.push("Bill date required");
    
    if (!bill.lines || bill.lines.length === 0) {
      issues.push("At least one line item required");
    } else {
      bill.lines.forEach((line: any, idx: number) => {
        if (line.line_type === 'expense' && !line.account_id) {
          issues.push(`Line ${idx + 1}: Account required`);
        }
        if (line.line_type === 'job_cost' && !line.cost_code_id) {
          issues.push(`Line ${idx + 1}: Cost code required`);
        }
      });
    }
    
    return issues;
  };

  const handleSubmitAllBills = async () => {
    if (loadingPendingBills) {
      toast({
        title: "Please Wait",
        description: "Bills are still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    if (selectedBillIds.size === 0) {
      toast({
        title: "No Bills Selected",
        description: "Please select at least one bill to submit",
        variant: "destructive",
      });
      return;
    }

    if (!effectiveProjectId) {
      toast({
        title: "Project Required",
        description: "Bills must be associated with a project. Please navigate to a specific project to enter bills.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const billsWithIssues: Array<{ bill: any; issues: string[] }> = [];
    
    selectedBillIds.forEach(billId => {
      const bill = batchBills.find(b => b.id === billId);
      if (bill) {
        const issues = validateBillForSubmission(bill);
        if (issues.length > 0) {
          billsWithIssues.push({ bill, issues });
        }
      }
    });
    
    if (billsWithIssues.length > 0) {
      const issueCount = billsWithIssues.length;
      const firstBillIssues = billsWithIssues[0].issues.join(', ');
      
      toast({
        title: "Cannot Submit Bills",
        description: `${issueCount} selected bill${issueCount > 1 ? 's have' : ' has'} missing information. ${issueCount === 1 ? firstBillIssues : 'Please check the Issues column and fix all errors before submitting.'}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    const billsToSubmit = batchBills
      .filter(bill => selectedBillIds.has(bill.id))
      .map(bill => ({
        pendingUploadId: bill.id,
        vendorId: bill.vendor_id,
        projectId: effectiveProjectId!,
        billDate: bill.bill_date,
        dueDate: bill.due_date,
        referenceNumber: bill.reference_number,
        terms: bill.terms,
      }));

    try {
      const results = await batchApproveBills.mutateAsync(billsToSubmit);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      const successIds = results.filter(r => r.success).map(r => r.pendingUploadId);
      if (successIds.length > 0) {
        setBatchBills(prev => prev.filter(b => !successIds.includes(b.id)));
        setSelectedBillIds(prev => {
          const next = new Set(prev);
          successIds.forEach(id => next.delete(id));
          return next;
        });
      }

      if (successful > 0) {
        toast({
          title: "Success",
          description: `${successful} bill${successful > 1 ? 's' : ''} created successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }

      if (failed > 0) {
        const errorSummaries = results
          .filter(r => !r.success)
          .map((r) => (r as any).error?.message || JSON.stringify((r as any).error));
        toast({
          title: successful > 0 ? "Some bills failed" : "No bills submitted",
          description: errorSummaries[0] || "Please review the bills and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : "Failed to submit bills";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabLabel = (status: string, count: number | undefined) => {
    if (isLoading) {
      switch (status) {
        case 'enter-manually':
          return "Enter Manually";
        case 'enter-ai':
          return "Enter with AI";
        case 'pending':
          return "Pending";
        case 'rejected':
          return "Rejected";
        case 'approved':
          return "Approved";
        case 'pay-bills':
          return "Pay Bills";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'enter-manually':
        return "Enter Manually";
      case 'enter-ai':
        return `Enter with AI${displayCount > 0 ? ` (${displayCount})` : ''}`;
      case 'pending':
        return `Pending (${displayCount})`;
      case 'rejected':
        return `Rejected (${displayCount})`;
      case 'approved':
        return `Approved (${displayCount})`;
      case 'pay-bills':
        return `Pay Bills (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${reviewOnly ? 'grid-cols-3' : 'grid-cols-6'}`}>
        {!reviewOnly && (
          <>
            <TabsTrigger value="enter-manually">
              {getTabLabel('enter-manually', undefined)}
            </TabsTrigger>
            <TabsTrigger value="enter-ai">
              {getTabLabel('enter-ai', counts?.aiExtractCount)}
            </TabsTrigger>
          </>
        )}
        <TabsTrigger value="pending">
          {getTabLabel('pending', counts?.pendingCount)}
        </TabsTrigger>
        <TabsTrigger value="rejected">
          {getTabLabel('rejected', counts?.rejectedCount)}
        </TabsTrigger>
        <TabsTrigger value="approved">
          {getTabLabel('approved', counts?.approvedCount)}
        </TabsTrigger>
        {!reviewOnly && (
          <TabsTrigger value="pay-bills">
            {getTabLabel('pay-bills', counts?.payBillsCount)}
          </TabsTrigger>
        )}
      </TabsList>
      
      {!reviewOnly && (
        <TabsContent value="enter-manually" className="mt-6">
          <ManualBillEntry />
        </TabsContent>
      )}
      
      {!reviewOnly && (
        <TabsContent value="enter-ai" className="mt-6 space-y-6">
          <SimplifiedAIBillExtraction 
            onDataExtracted={() => {}}
            onSwitchToManual={() => setActiveTab("enter-manually")}
            onProcessingChange={(uploads) => {
              const newIds = new Set(uploads.map(u => u.id));
              const prevIds = processingIdsRef.current;
              
              // IDs that just completed extraction
              const completedIds: string[] = Array.from(prevIds).filter(id => !newIds.has(id));
              completedIds.forEach(id => awaitingAppearanceRef.current.add(id));
              
              processingIdsRef.current = newIds;
              setProcessingUploads(uploads);
              setBannerFileNames(uploads.map(u => u.file_name));
              recomputeBanner(uploads);
            }}
          />

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Extracted Bills</CardTitle>
                  <CardDescription>
                    {batchBills.length > 0 
                      ? `Review and edit ${batchBills.length} bill${batchBills.length > 1 ? 's' : ''} before submitting`
                      : 'Upload PDF files above to extract bill data automatically'
                    }
                  </CardDescription>
                </div>
                {batchBills.length > 0 && (
                  <Button
                    onClick={handleSubmitAllBills}
                    disabled={isSubmitting || selectedBillIds.size === 0}
                    size="lg"
                  >
                    {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <BatchBillReviewTable
                bills={batchBills}
                processingUploads={processingUploads}
                showProcessingBanner={showProcessingBanner}
                bannerFilenames={bannerFileNames}
                onBillUpdate={handleBillUpdate}
                onBillDelete={handleBillDelete}
                onLinesUpdate={handleLinesUpdate}
                selectedBillIds={selectedBillIds}
                onBillSelect={handleBillSelect}
                onSelectAll={handleSelectAll}
              />
            </CardContent>
          </Card>
        </TabsContent>
      )}
      
      <TabsContent value="pending" className="mt-6">
        <BillsApprovalTable status="draft" projectId={effectiveProjectId} projectIds={projectIds} />
      </TabsContent>
      
      <TabsContent value="rejected" className="mt-6">
        <BillsApprovalTable status="void" projectId={effectiveProjectId} projectIds={projectIds} />
      </TabsContent>
      
      <TabsContent value="approved" className="mt-6">
        <BillsApprovalTable status={['posted', 'paid']} projectId={effectiveProjectId} projectIds={projectIds} />
      </TabsContent>
      
      {!reviewOnly && (
        <TabsContent value="pay-bills" className="mt-6">
          <PayBillsTable projectId={effectiveProjectId} projectIds={projectIds} />
        </TabsContent>
      )}
    </Tabs>
  );
}