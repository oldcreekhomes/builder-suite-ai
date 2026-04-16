import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { FilesCell } from '@/components/purchaseOrders/components/FilesCell';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface BudgetDetailsPurchaseOrderTabProps {
  projectId: string;
  costCodeId: string;
  lotCount?: number;
  isLocked?: boolean;
  budgetItemUnitPrice?: number;
  onAllocationChange?: (mode: 'full' | 'per-lot', amount: number) => void;
}

export function BudgetDetailsPurchaseOrderTab({ 
  projectId, 
  costCodeId, 
  lotCount = 1,
  isLocked = false,
  budgetItemUnitPrice,
  onAllocationChange,
}: BudgetDetailsPurchaseOrderTabProps) {
  const navigate = useNavigate();
  const [allocationMode, setAllocationMode] = useState<'full' | 'per-lot'>('full');

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['budget-purchase-orders', projectId, costCodeId],
    queryFn: async () => {
      const { data: pos, error: posError } = await supabase
        .from('project_purchase_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (posError) throw posError;
      if (!pos || pos.length === 0) return [];

      const companyIds = [...new Set(pos.map(po => po.company_id))];
      const costCodeIds = [...new Set(pos.map(po => po.cost_code_id))];

      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      const { data: costCodes } = await supabase
        .from('cost_codes')
        .select('id, code, name, parent_group, category')
        .in('id', costCodeIds);

      const companyMap = new Map(companies?.map(c => [c.id, c]) || []);
      const costCodeMap = new Map(costCodes?.map(cc => [cc.id, cc]) || []);

      const enrichedPOs: PurchaseOrder[] = pos.map(po => ({
        ...po,
        companies: companyMap.get(po.company_id),
        cost_codes: costCodeMap.get(po.cost_code_id)
      }));

      return enrichedPOs;
    },
    enabled: !!projectId && !!costCodeId,
  });

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const hasMultipleLots = lotCount > 1;
  const perLotAmount = hasMultipleLots && totalAmount > 0
    ? Math.floor((totalAmount / lotCount) * 100) / 100
    : totalAmount;
  const displayAmount = hasMultipleLots && allocationMode === 'per-lot' ? perLotAmount : totalAmount;

  // Infer allocation mode from saved data
  useEffect(() => {
    if (hasMultipleLots && budgetItemUnitPrice && budgetItemUnitPrice > 0 && totalAmount > 0) {
      const isNear = (a: number, b: number, epsilon = 0.02) => Math.abs(a - b) < epsilon;
      const basePerLot = Math.floor((totalAmount / lotCount) * 100) / 100;
      const remainderPerLot = Number((totalAmount - basePerLot * (lotCount - 1)).toFixed(2));

      if (isNear(budgetItemUnitPrice, basePerLot) || isNear(budgetItemUnitPrice, remainderPerLot)) {
        setAllocationMode('per-lot');
      } else {
        setAllocationMode('full');
      }
    }
  }, [hasMultipleLots, budgetItemUnitPrice, totalAmount, lotCount]);

  // Notify parent of allocation changes
  useEffect(() => {
    if (onAllocationChange && totalAmount > 0) {
      onAllocationChange(allocationMode, displayAmount);
    }
  }, [allocationMode, displayAmount, totalAmount]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0.00';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewPO = (poId: string) => {
    navigate(`/project/${projectId}/purchase-orders`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-sm text-muted-foreground">Loading purchase orders...</p>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            No approved purchase orders found for this cost code.
          </p>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Total Budget:</span>
          <span className="text-sm font-semibold">$0.00</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-left">Status</TableHead>
              <TableHead className="text-left">Amount</TableHead>
              <TableHead className="text-left">Files</TableHead>
              <TableHead className="text-center w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="text-sm font-medium">
                  {po.po_number || `PO-${po.id.slice(0, 8)}`}
                </TableCell>
                <TableCell className="text-sm">
                  {po.companies?.company_name || 'Unknown Vendor'}
                </TableCell>
                <TableCell className="text-sm text-left">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(po.status)}`}
                  >
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-left font-medium">
                  {formatCurrency(po.total_amount)}
                </TableCell>
                <TableCell className="text-sm text-left">
                  <FilesCell files={po.files} projectId={projectId} />
                </TableCell>
                <TableCell className="text-center">
                  <TableRowActions actions={[{ label: "View PO", onClick: () => handleViewPO(po.id) }]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMultipleLots && purchaseOrders.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Allocation Mode</Label>
          <RadioGroup
            value={allocationMode}
            onValueChange={(val) => setAllocationMode(val as 'full' | 'per-lot')}
            className="grid grid-cols-2 gap-3"
            disabled={isLocked}
          >
            <Label
              htmlFor="po-alloc-full"
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                allocationMode === 'full' ? 'border-primary bg-primary/5' : 'border-border'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="full" id="po-alloc-full" />
              <div>
                <span className="text-sm font-medium">Full Amount</span>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalAmount)}</p>
              </div>
            </Label>
            <Label
              htmlFor="po-alloc-per-lot"
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                allocationMode === 'per-lot' ? 'border-primary bg-primary/5' : 'border-border'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="per-lot" id="po-alloc-per-lot" />
              <div>
                <span className="text-sm font-medium">Divide by {lotCount} lots</span>
                <p className="text-xs text-muted-foreground">{formatCurrency(perLotAmount)} per lot</p>
              </div>
            </Label>
          </RadioGroup>
        </div>
      )}
      
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-sm font-medium">
          Total Budget{hasMultipleLots && allocationMode === 'per-lot' ? ' (per lot)' : ''}:
        </span>
        <span className="text-sm font-semibold">
          {formatCurrency(displayAmount)}
        </span>
      </div>
    </div>
  );
}
