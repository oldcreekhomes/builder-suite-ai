import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface BudgetDetailsPurchaseOrderTabProps {
  projectId: string;
  costCodeId: string;
}

export function BudgetDetailsPurchaseOrderTab({ projectId, costCodeId }: BudgetDetailsPurchaseOrderTabProps) {
  const navigate = useNavigate();

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

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

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
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="text-center w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow 
                key={po.id} 
                className="cursor-pointer"
                onClick={() => handleViewPO(po.id)}
              >
                <TableCell className="text-sm font-medium">
                  {po.po_number || `PO-${po.id.slice(0, 8)}`}
                </TableCell>
                <TableCell className="text-sm">
                  {po.companies?.company_name || 'Unknown Vendor'}
                </TableCell>
                <TableCell className="text-sm text-center">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(po.status)}`}
                  >
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-right font-medium">
                  {formatCurrency(po.total_amount)}
                </TableCell>
                <TableCell className="text-sm text-center">
                  {format(new Date(po.created_at), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell className="text-center">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-sm font-medium">Total Budget:</span>
        <span className="text-sm font-semibold">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
