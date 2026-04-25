import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { getFileIcon, getFileIconColor, getCleanFileName } from '../bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePOMutations } from '@/hooks/usePOMutations';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useBiddingCompanyMutations } from '@/hooks/useBiddingCompanyMutations';
import { CostCodeSearchInput } from '@/components/CostCodeSearchInput';
import type { LineItemInput } from '@/hooks/usePurchaseOrderLines';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | 'submitted' | null;
  price: number | null;
  proposals: string[] | null;
  companies: Company;
}

interface ConfirmPODialogProps {
  isOpen: boolean;
  onClose: () => void;
  biddingCompany: BiddingCompany | null;
  onConfirm: () => void;
  bidPackageId: string;
  projectAddress: string;
  projectId: string;
  costCodeId: string;
  mode?: 'send' | 'resend';
  /** Pre-extracted line items from the AI. When provided, dialog skips its own extraction. */
  initialLineItems?: LineItemInput[];
}

const emptyLine = (): LineItemInput => ({
  cost_code_id: null,
  cost_code_display: '',
  description: '',
  quantity: 1,
  unit_cost: 0,
  amount: 0,
  extra: false,
});

export function ConfirmPODialog({
  isOpen,
  onClose,
  biddingCompany,
  onConfirm,
  bidPackageId,
  projectAddress,
  projectId,
  costCodeId,
  mode = 'send',
  initialLineItems,
}: ConfirmPODialogProps) {
  const { createPOSendEmailAndUpdateStatus, resendPOEmail, isLoading } = usePOMutations(projectId);
  const { profile } = useUserProfile();
  const { openFile } = useUniversalFilePreviewContext();
  const { deleteIndividualProposal } = useBiddingCompanyMutations(projectId);

  const [customMessage, setCustomMessage] = useState('');
  const [costCodeData, setCostCodeData] = useState<{ code: string; name: string } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [managerName, setManagerName] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    initialLineItems && initialLineItems.length > 0 ? initialLineItems : [emptyLine()]
  );

  // When dialog re-opens with new initialLineItems, seed state from them
  useEffect(() => {
    if (isOpen && initialLineItems && initialLineItems.length > 0) {
      setLineItems(initialLineItems.map((l) => ({ ...l })));
    }
  }, [isOpen, initialLineItems]);

  // Fetch cost code data and PM name
  useEffect(() => {
    if (!isOpen) return;

    if (costCodeId) {
      supabase
        .from('cost_codes')
        .select('code, name')
        .eq('id', costCodeId)
        .single()
        .then(({ data }) => {
          if (data) setCostCodeData(data);
        });
    }

    if (projectId) {
      supabase
        .from('projects')
        .select('construction_manager')
        .eq('id', projectId)
        .single()
        .then(({ data: project }) => {
          if (project?.construction_manager) {
            supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', project.construction_manager)
              .single()
              .then(({ data: user }) => {
                if (user) {
                  setManagerName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
                }
              });
          }
        });
    }
  }, [isOpen, costCodeId, projectId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCustomMessage('');
      setLineItems([emptyLine()]);
    }
  }, [isOpen]);

  const updateLine = (idx: number, updates: Partial<LineItemInput>) => {
    setLineItems((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...updates };
        const qty = Number(next.quantity) || 0;
        const unit = Number(next.unit_cost) || 0;
        next.amount = Math.round(qty * unit * 100) / 100;
        return next;
      })
    );
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const subtotal = Math.round(lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0) * 100) / 100;

  const handleConfirm = async () => {
    if (!biddingCompany) return;

    const validLines = lineItems.filter((l) => l.cost_code_id || l.amount > 0);

    try {
      if (mode === 'resend') {
        await resendPOEmail.mutateAsync({
          companyId: biddingCompany.company_id,
          costCodeId,
          totalAmount: biddingCompany.price || 0,
          biddingCompany,
          bidPackageId,
          customMessage: customMessage.trim() || undefined,
        });
      } else {
        await createPOSendEmailAndUpdateStatus.mutateAsync({
          companyId: biddingCompany.company_id,
          costCodeId,
          totalAmount: subtotal || biddingCompany.price || 0,
          biddingCompany,
          bidPackageId,
          customMessage: customMessage.trim() || undefined,
          lineItems: validLines.length > 0 ? validLines : undefined,
        });
      }

      onConfirm();
      onClose();
    } catch (error) {
      console.error(`Error ${mode === 'resend' ? 'resending' : 'creating'} PO:`, error);
    }
  };

  const handleFilePreview = (fileName: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    openFile({
      name: fileName,
      bucket: 'project-files',
      path: `proposals/${fileName}`,
      stampInfo: managerName ? { managerName, date: today } : undefined,
    });
  };

  if (!biddingCompany) return null;

  const proposals = biddingCompany.proposals || [];
  const firstProposal = proposals[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'resend' ? 'Resend PO' : 'Confirm PO'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company</Label>
              <p className="text-sm font-semibold mt-1">{biddingCompany.companies.company_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Bid Package Cost Code</Label>
              <p className="text-sm font-semibold mt-1">
                {costCodeData ? `${costCodeData.code}: ${costCodeData.name}` : 'Loading...'}
              </p>
            </div>
          </div>

          {mode === 'send' && (
            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[40px] text-right">Qty</TableHead>
                      <TableHead className="w-[110px] text-right">Unit Cost</TableHead>
                      <TableHead className="w-[70px] text-center">Proposal</TableHead>
                      <TableHead className="w-[110px] text-right">Amount</TableHead>
                      <TableHead className="w-[60px] text-center">Extra</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="p-1">
                          <CostCodeSearchInput
                            value={line.cost_code_display || ''}
                            onChange={(v) => {
                              if (!v) updateLine(idx, { cost_code_id: null, cost_code_display: '' });
                            }}
                            onCostCodeSelect={(cc) =>
                              updateLine(idx, {
                                cost_code_id: cc.id,
                                cost_code_display: `${cc.code} - ${cc.name}`,
                              })
                            }
                            placeholder="Cost code"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(idx, { description: e.target.value })}
                            placeholder="Description"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            value={line.quantity || ''}
                            onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm text-right px-1"
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_cost || ''}
                            onChange={(e) => updateLine(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm text-right"
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="p-1 text-center">
                          {idx === 0 && firstProposal ? (
                            <div className="relative inline-flex">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleFilePreview(firstProposal)}
                                    className="flex items-center justify-center p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                                  >
                                    {(() => {
                                      const Icon = getFileIcon(firstProposal);
                                      return <Icon className={`h-5 w-5 ${getFileIconColor(firstProposal)}`} />;
                                    })()}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getCleanFileName(firstProposal)}</p>
                                </TooltipContent>
                              </Tooltip>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToDelete(firstProposal);
                                }}
                                className="absolute -top-0.5 -right-0.5 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
                                title="Delete file"
                              >
                                <span className="text-[9px] font-bold leading-none">×</span>
                              </button>
                            </div>
                          ) : null}
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
                        <TableCell className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => removeLine(idx)}
                            disabled={lineItems.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="text-right font-medium text-sm pr-3">
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
            </div>
          )}

          {mode === 'resend' && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
              <p className="text-sm font-semibold mt-1">
                {biddingCompany.price ? `$${Number(biddingCompany.price).toLocaleString()}` : 'N/A'}
              </p>
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="custom-message" className="text-sm font-medium text-muted-foreground">
                Custom Message (Optional)
              </Label>
              <Textarea
                id="custom-message"
                placeholder="Add a custom message to include in the email..."
                className="w-full mt-1 resize-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black"
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>
            {mode === 'send' && (
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1 shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Sending...' : mode === 'resend' ? 'Resend PO' : 'Send PO'}
          </Button>
        </div>

        <DeleteConfirmationDialog
          open={!!fileToDelete}
          onOpenChange={(open) => !open && setFileToDelete(null)}
          title="Delete Proposal File"
          description={`Are you sure you want to delete "${fileToDelete ? getCleanFileName(fileToDelete) : ''}"? This action cannot be undone.`}
          onConfirm={() => {
            if (fileToDelete && biddingCompany) {
              deleteIndividualProposal('', biddingCompany.id, fileToDelete);
              setFileToDelete(null);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
