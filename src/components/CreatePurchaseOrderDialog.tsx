import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Plus, Trash2, Sparkles } from "lucide-react";
import { getFileIcon, getFileIconColor, getCleanFileName } from "./bidding/utils/fileIconUtils";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CompanySearchInput } from "./CompanySearchInput";
import { CostCodeSearchInput } from "./CostCodeSearchInput";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchaseOrderLines, type LineItemInput } from "@/hooks/usePurchaseOrderLines";
import { usePOMutations } from "@/hooks/usePOMutations";
import { useUserProfile } from "@/hooks/useUserProfile";

const titleCase = (str: string): string =>
  str
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');



interface BiddingCompanyShape {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | 'submitted' | null;
  price: number | null;
  proposals: string[] | null;
  companies: {
    id: string;
    company_name: string;
    company_type: string;
  };
}

export interface BidContext {
  biddingCompany: BiddingCompanyShape;
  bidPackageId: string;
  costCodeId: string;
  initialLineItems?: LineItemInput[];
  isExtracting?: boolean;
  mode?: 'send' | 'resend';
  onConfirm?: () => void;
}

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
  editOrder?: any;
  bidContext?: BidContext;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
}

const emptyLine = (): LineItemInput => ({
  cost_code_id: null,
  cost_code_display: "",
  description: "",
  quantity: 1,
  unit_cost: 0,
  amount: 0,
  extra: false,
});

export const CreatePurchaseOrderDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  editOrder,
  bidContext,
}: CreatePurchaseOrderDialogProps) => {
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLine()]);
  // Snapshot of original lines (taken when dialog initializes) — used to detect
  // vendor-visible changes and to know which rows are "original" (locked) vs newly added.
  const [originalLinesSnapshot, setOriginalLinesSnapshot] = useState<LineItemInput[]>([]);

  // A PO is locked once it has been sent to the vendor.
  // When locked: Qty, Unit Cost, Company, Add Line, and removing existing lines are disabled.
  // Cost code, description, notes, attachments, and the Extra checkbox remain editable.
  const isLocked = !!editOrder?.sent_at;
  const originalLineCount = originalLinesSnapshot.length;
  const isOriginalLine = (idx: number) => isLocked && idx < originalLineCount;

  const isBidFlow = !!bidContext;
  const bidMode = bidContext?.mode ?? 'send';
  const isExtracting = !!bidContext?.isExtracting;

  const { lines: existingLines } = usePurchaseOrderLines(editOrder?.id);
  const { createPOSendEmailAndUpdateStatus, resendPOEmail, isLoading: isBidPOLoading } = usePOMutations(projectId);
  const { profile } = useUserProfile();

  // Guards: only seed once per dialog open, don't clobber user edits on parent re-renders
  const hasInitializedRef = useRef(false);
  const prevIsExtractingRef = useRef(false);

  // Reset init guard when dialog closes
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      prevIsExtractingRef.current = false;
    }
  }, [open]);

  // Pre-populate form when editing or bid context — ONLY on first open
  useEffect(() => {
    if (!open) return;
    if (hasInitializedRef.current) return;

    if (bidContext) {
      setSelectedCompany({
        id: bidContext.biddingCompany.companies.id,
        name: bidContext.biddingCompany.companies.company_name,
      });
      setNotes("");
      const proposals = bidContext.biddingCompany.proposals ?? [];
      setUploadedFiles(
        proposals.map((fileName) => ({
          id: `bid-${fileName}`,
          name: fileName,
          size: 0,
          url: `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/proposals/${fileName}`,
        }))
      );
      setCustomMessage("");
      setLineItems(
        bidContext.initialLineItems && bidContext.initialLineItems.length > 0
          ? bidContext.initialLineItems.map((l) => ({ ...l, description: titleCase(l.description || '') }))
          : [emptyLine()]
      );
      // Only mark initialized once extraction is done; otherwise the extraction-finish effect will seed
      if (!bidContext.isExtracting) {
        hasInitializedRef.current = true;
      }
    } else if (editOrder) {
      setSelectedCompany({
        id: editOrder.companies?.id,
        name: editOrder.companies?.company_name,
      });
      setNotes(editOrder.notes || "");
      setUploadedFiles(editOrder.files || []);
      setCustomMessage("");
      // Lines load via the existingLines effect below; mark initialized there
    } else {
      setSelectedCompany(null);
      setNotes("");
      setUploadedFiles([]);
      setCustomMessage("");
      setLineItems([emptyLine()]);
      hasInitializedRef.current = true;
    }
  }, [editOrder, open, bidContext]);

  // Re-seed lines when AI extraction transitions from in-progress -> done
  useEffect(() => {
    if (!open) return;
    const wasExtracting = prevIsExtractingRef.current;
    prevIsExtractingRef.current = isExtracting;

    if (wasExtracting && !isExtracting && bidContext?.initialLineItems && bidContext.initialLineItems.length > 0) {
      setLineItems(bidContext.initialLineItems.map((l) => ({ ...l, description: titleCase(l.description || '') })));
      hasInitializedRef.current = true;
    }
  }, [open, isExtracting, bidContext?.initialLineItems]);

  // Load existing lines when editing — only once
  useEffect(() => {
    if (!open) return;
    if (hasInitializedRef.current) return;
    if (editOrder && existingLines.length > 0) {
      const seeded = existingLines.map(l => ({
        cost_code_id: l.cost_code_id,
        cost_code_display: l.cost_codes ? `${l.cost_codes.code} - ${l.cost_codes.name}` : "",
        description: titleCase(l.description || ''),
        quantity: l.quantity,
        unit_cost: l.unit_cost,
        amount: l.amount,
        extra: l.extra,
      }));
      setLineItems(seeded);
      setOriginalLinesSnapshot(seeded);
      hasInitializedRef.current = true;
    }
  }, [open, existingLines, editOrder]);

  // Reset snapshot when dialog closes
  useEffect(() => {
    if (!open) setOriginalLinesSnapshot([]);
  }, [open]);

  // Recipients for the "Sending To" column
  const recipientCompanyId = isBidFlow
    ? bidContext!.biddingCompany.company_id
    : selectedCompany?.id ?? null;

  const { data: recipients = [] } = useQuery({
    queryKey: ['po-recipients', recipientCompanyId],
    enabled: open && !!recipientCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email, receive_po_notifications')
        .eq('company_id', recipientCompanyId as string);
      if (error) throw error;
      return (data || []).filter((r: any) => r.receive_po_notifications && r.email);
    },
  });


  const updateLine = (index: number, updates: Partial<LineItemInput>) => {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      if ('quantity' in updates || 'unit_cost' in updates) {
        const qty = updates.quantity ?? next[index].quantity;
        const uc = updates.unit_cost ?? next[index].unit_cost;
        next[index].amount = Math.round(qty * uc * 100) / 100;
      }
      return next;
    });
  };

  const addLine = () => setLineItems(prev => [...prev, emptyLine()]);

  const removeLine = (index: number) => {
    setLineItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, l) => sum + (l.amount || 0), 0);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB.`, variant: "destructive" });
          continue;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `purchase-orders/${projectId}/${fileName}`;
        const { error } = await supabase.storage.from('project-files').upload(filePath, file);
        if (error) { toast({ title: "Error", description: `Failed to upload ${file.name}`, variant: "destructive" }); continue; }
        const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(filePath);
        setUploadedFiles(prev => [...prev, { id: fileName, name: file.name, size: file.size, url: publicUrl }]);
      }
    } finally { setIsUploading(false); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/plain': ['.txt'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    disabled: isUploading,
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = async (fileToRemove: UploadedFile) => {
    try {
      const filePath = `purchase-orders/${projectId}/${fileToRemove.id}`;
      await supabase.storage.from('project-files').remove([filePath]);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileToRemove.id));
    } catch { toast({ title: "Error", description: "Failed to remove file", variant: "destructive" }); }
  };

  // === Submit handler: bid flow vs standard flow ===
  const handleSubmit = async () => {
    if (isBidFlow && bidContext) {
      const validLines = lineItems.filter((l) => l.cost_code_id || l.amount > 0);
      try {
        if (bidMode === 'resend') {
          await resendPOEmail.mutateAsync({
            companyId: bidContext.biddingCompany.company_id,
            costCodeId: bidContext.costCodeId,
            totalAmount: bidContext.biddingCompany.price || 0,
            biddingCompany: bidContext.biddingCompany,
            bidPackageId: bidContext.bidPackageId,
            customMessage: customMessage.trim() || undefined,
          });
        } else {
          await createPOSendEmailAndUpdateStatus.mutateAsync({
            companyId: bidContext.biddingCompany.company_id,
            costCodeId: bidContext.costCodeId,
            totalAmount: subtotal || bidContext.biddingCompany.price || 0,
            biddingCompany: bidContext.biddingCompany,
            bidPackageId: bidContext.bidPackageId,
            customMessage: customMessage.trim() || undefined,
            lineItems: validLines.length > 0 ? validLines : undefined,
            files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          });
        }
        bidContext.onConfirm?.();
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        console.error(`Error ${bidMode === 'resend' ? 'resending' : 'creating'} PO:`, error);
      }
      return;
    }

    if (!selectedCompany) {
      toast({ title: "Validation Error", description: "Please select a company", variant: "destructive" });
      return;
    }
    const validLines = lineItems.filter(l => l.cost_code_id);
    if (validLines.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one line item with a cost code", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = validLines.reduce((sum, l) => sum + l.amount, 0);
      const primaryCostCodeId = validLines[0].cost_code_id;

      if (editOrder) {
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .update({
            company_id: selectedCompany.id,
            cost_code_id: primaryCostCodeId,
            extra: validLines.some(l => l.extra),
            total_amount: totalAmount,
            notes: notes.trim() || null,
            files: JSON.parse(JSON.stringify(uploadedFiles)),
          })
          .eq('id', editOrder.id)
          .select('*, po_number')
          .single();

        if (error) throw error;
        await savePOLines(editOrder.id, validLines);
        await sendPOEmail(data, selectedCompany, totalAmount, validLines, true);
      } else {
        const { data: purchaseOrder, error } = await supabase
          .from('project_purchase_orders')
          .insert([{
            project_id: projectId,
            company_id: selectedCompany.id,
            cost_code_id: primaryCostCodeId,
            extra: validLines.some(l => l.extra),
            total_amount: totalAmount,
            notes: notes.trim() || null,
            files: JSON.parse(JSON.stringify(uploadedFiles)),
            status: 'approved',
          }])
          .select('*, po_number')
          .single();

        if (error) throw error;
        await savePOLines(purchaseOrder.id, validLines);
        await sendPOEmail(purchaseOrder, selectedCompany, totalAmount, validLines, false);
      }

      setSelectedCompany(null);
      setNotes("");
      setUploadedFiles([]);
      setCustomMessage("");
      setLineItems([emptyLine()]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({ title: "Error", description: "Failed to save purchase order", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePOLines = async (poId: string, lines: LineItemInput[]) => {
    await supabase.from('purchase_order_lines').delete().eq('purchase_order_id', poId);
    if (lines.length === 0) return;
    const rows = lines.map((line, idx) => ({
      purchase_order_id: poId,
      cost_code_id: line.cost_code_id,
      description: line.description || null,
      quantity: line.quantity,
      unit_cost: line.unit_cost,
      amount: line.amount,
      line_number: idx + 1,
      extra: line.extra,
    }));
    const { error } = await supabase.from('purchase_order_lines').insert(rows);
    if (error) throw error;
  };

  const sendPOEmail = async (
    poData: any,
    company: { id: string; name: string },
    totalAmount: number,
    lines: LineItemInput[],
    isUpdate: boolean
  ) => {
    try {
      const [projectData, senderData] = await Promise.all([
        supabase.from('projects').select('address').eq('id', projectId).single(),
        supabase.auth.getUser().then(async (u) => {
          if (u.data.user) {
            const { data } = await supabase.from('users').select('company_name').eq('id', u.data.user.id).single();
            return data;
          }
          return null;
        }),
      ]);

      const costCodeIds = [...new Set(lines.map(l => l.cost_code_id).filter(Boolean))];
      let costCodeMap = new Map<string, { code: string; name: string }>();
      if (costCodeIds.length > 0) {
        const { data: codes } = await supabase.from('cost_codes').select('id, code, name').in('id', costCodeIds as string[]);
        costCodeMap = new Map(codes?.map(c => [c.id, c]) || []);
      }

      const lineItemsForEmail = lines.map(l => ({
        description: l.description || '',
        costCode: l.cost_code_id ? costCodeMap.get(l.cost_code_id) : null,
        quantity: l.quantity,
        unitCost: l.unit_cost,
        amount: l.amount,
      }));

      const firstCC = lines[0]?.cost_code_id ? costCodeMap.get(lines[0].cost_code_id) : null;

      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-po-email', {
        body: {
          purchaseOrderId: poData.id,
          companyId: company.id,
          poNumber: poData.po_number,
          projectAddress: projectData.data?.address || 'N/A',
          companyName: company.name,
          customMessage: customMessage.trim() || undefined,
          totalAmount,
          costCode: firstCC ? { code: firstCC.code, name: firstCC.name } : undefined,
          senderCompanyName: senderData?.company_name || 'BuilderSuite ML',
          isUpdate,
          lineItems: lineItemsForEmail,
        },
      });

      if (emailError) {
        toast({ title: "Warning", description: `PO ${isUpdate ? 'updated' : 'created'} but email failed to send`, variant: "destructive" });
      } else {
        await supabase
          .from('project_purchase_orders')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', poData.id);
        toast({ title: "Success", description: `Purchase order ${isUpdate ? 'updated' : 'created'} and email sent to ${emailData.emailsSent} recipients` });
      }
    } catch (e) {
      console.error('Email error:', e);
      toast({ title: "Warning", description: `PO saved but email failed`, variant: "destructive" });
    }
  };



  // ============ AI extraction loader (bid flow only) ============
  if (isBidFlow && bidMode === 'send' && isExtracting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Creating PO from machine learning</DialogTitle>
          </DialogHeader>
          <style>{`
            @keyframes po-ai-float {
              0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.85; }
              50% { transform: translateY(-6px) scale(1.1) rotate(8deg); opacity: 1; }
            }
            @keyframes po-ai-dots {
              0%, 20% { content: ''; }
              40% { content: '.'; }
              60% { content: '..'; }
              80%, 100% { content: '...'; }
            }
            .po-ai-icon { animation: po-ai-float 1.8s ease-in-out infinite; }
            .po-ai-text::after {
              display: inline-block;
              width: 1.25em;
              text-align: left;
              content: '';
              animation: po-ai-dots 1.6s steps(1, end) infinite;
            }
          `}</style>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Sparkles className="po-ai-icon h-12 w-12 text-primary" />
            <p className="po-ai-text text-sm font-medium text-muted-foreground">
              Creating PO from machine learning
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const dialogTitle = editOrder ? 'Edit Purchase Order' : 'Create Purchase Order';

  const submitLabel = isBidFlow
    ? (isBidPOLoading
        ? 'Creating...'
        : 'Create Purchase Order')
    : (isSubmitting
        ? (editOrder ? 'Updating...' : 'Creating...')
        : (editOrder ? 'Update Purchase Order' : 'Create Purchase Order'));

  const isSubmitDisabled = isBidFlow
    ? (isBidPOLoading || isExtracting)
    : (isSubmitting || !selectedCompany);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header row — Company + Notes (identical layout for both flows) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company *</Label>
              {isBidFlow ? (
                <Input
                  value={selectedCompany?.name || bidContext!.biddingCompany.companies.company_name}
                  disabled
                  className="w-full"
                />
              ) : (
                <CompanySearchInput
                  value={selectedCompany?.name || ""}
                  onChange={() => {}}
                  onCompanySelect={(c) => setSelectedCompany(c)}
                  placeholder="Search for a company..."
                  className="w-full"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>

          {/* Line Items Table — identical for both flows */}
          <div className="space-y-2">
            <Label>Line Items</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Cost Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px] text-right">Qty</TableHead>
                    <TableHead className="w-[110px] text-right">Unit Cost</TableHead>
                    <TableHead className="w-[110px] text-right">Amount</TableHead>
                    <TableHead className="w-[60px] text-center">Extra</TableHead>
                    <TableHead className="w-[60px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                <TooltipProvider delayDuration={300}>
                  {lineItems.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-1">
                        {line.cost_code_display ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <CostCodeSearchInput
                                  value={line.cost_code_display || ""}
                                  onChange={(v) => { if (!v) updateLine(idx, { cost_code_id: null, cost_code_display: "" }); }}
                                  onCostCodeSelect={(cc) => updateLine(idx, { cost_code_id: cc.id, cost_code_display: `${cc.code} - ${cc.name}` })}
                                  placeholder="Cost code"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">{line.cost_code_display}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <CostCodeSearchInput
                            value={line.cost_code_display || ""}
                            onChange={(v) => { if (!v) updateLine(idx, { cost_code_id: null, cost_code_display: "" }); }}
                            onCostCodeSelect={(cc) => updateLine(idx, { cost_code_id: cc.id, cost_code_display: `${cc.code} - ${cc.name}` })}
                            placeholder="Cost code"
                            className="h-8 text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        {line.description ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                value={line.description}
                                onChange={(e) => updateLine(idx, { description: e.target.value })}
                                placeholder="Description"
                                className="h-8 text-sm"
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">{line.description}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(idx, { description: e.target.value })}
                            placeholder="Description"
                            className="h-8 text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          value={line.quantity || ""}
                          onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm text-right no-spinner"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_cost || ""}
                          onChange={(e) => updateLine(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm text-right no-spinner"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="p-1 text-right text-sm font-medium pr-3">
                        ${line.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Checkbox
                          checked={line.extra}
                          onCheckedChange={(checked) => updateLine(idx, { extra: checked as boolean })}
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-destructive/10"
                          onClick={() => removeLine(idx)}
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TooltipProvider>
                  {/* Subtotal row */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="text-right font-medium text-sm pr-3">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm pr-3">
                      ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>

          {/* Custom Message + Attachments + Sending To */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Custom Message (Optional)</Label>
              <Textarea
                placeholder="Add a custom message to include in the email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="resize-none h-[80px] min-h-[80px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              {uploadedFiles.length === 0 ? (
                <div
                  {...getRootProps()}
                  className={`border rounded-md p-3 transition-colors cursor-pointer h-[80px] flex items-center justify-center ${
                    isDragActive ? 'border-primary/50 bg-primary/5' : 'border-input hover:border-muted-foreground/50'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <div className="text-center">
                    <Upload className={`mx-auto h-5 w-5 mb-0.5 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs text-muted-foreground">
                      {isUploading ? "Uploading..." : isDragActive ? "Drop files here..." : "Click or drag to upload"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-[80px] flex flex-wrap items-start content-start gap-2 overflow-auto pt-1">
                  {uploadedFiles.map((file) => {
                    const Icon = getFileIcon(file.name);
                    const iconColor = getFileIconColor(file.name);
                    return (
                      <div key={file.id} className="relative">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${iconColor} transition-colors p-1 inline-flex`}
                          title={getCleanFileName(file.name)}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(file); }}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                          title="Remove file"
                        >
                          <span className="text-[10px] font-bold leading-none">×</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Sending To</Label>
              <div className="border rounded-md p-3 h-[80px] overflow-auto text-sm">
                {!recipientCompanyId ? (
                  <p className="text-xs text-muted-foreground italic">Select a company to see recipients</p>
                ) : recipients.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No representatives with PO notifications enabled</p>
                ) : (
                  <div className="space-y-1">
                    {recipients.map((r: any) => {
                      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || '(No name)';
                      return (
                        <div key={r.id} className="truncate text-xs">
                          <span className="font-semibold">{name}</span>
                          <span className="text-muted-foreground"> · {r.email}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBidFlow ? isBidPOLoading : isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
