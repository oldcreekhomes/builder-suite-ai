import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BudgetDetailsPurchaseOrderTabProps {
  projectId: string;
  costCodeId: string;
}

export function BudgetDetailsPurchaseOrderTab({ projectId, costCodeId }: BudgetDetailsPurchaseOrderTabProps) {
  const navigate = useNavigate();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['budget-purchase-orders', projectId, costCodeId],
    queryFn: async () => {
      // Fetch purchase orders
      const { data: pos, error: posError } = await supabase
        .from('project_purchase_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (posError) throw posError;
      if (!pos || pos.length === 0) return [];

      // Get unique company and cost code IDs
      const companyIds = [...new Set(pos.map(po => po.company_id))];
      const costCodeIds = [...new Set(pos.map(po => po.cost_code_id))];

      // Fetch companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      // Fetch cost codes
      const { data: costCodes } = await supabase
        .from('cost_codes')
        .select('id, code, name, parent_group, category')
        .in('id', costCodeIds);

      // Create lookup maps
      const companyMap = new Map(companies?.map(c => [c.id, c]) || []);
      const costCodeMap = new Map(costCodes?.map(cc => [cc.id, cc]) || []);

      // Merge data and return as PurchaseOrder objects
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
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
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
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading purchase orders...</p>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            No approved purchase orders found for this cost code.
          </p>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm font-medium">Total Amount:</span>
          <span className="text-lg font-semibold">$0</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">PO Number</th>
              <th className="text-left p-3 text-sm font-medium">Vendor</th>
              <th className="text-center p-3 text-sm font-medium">Status</th>
              <th className="text-right p-3 text-sm font-medium">Amount</th>
              <th className="text-center p-3 text-sm font-medium">Date</th>
              <th className="text-center p-3 text-sm font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr 
                key={po.id} 
                className="border-t hover:bg-muted/50 cursor-pointer"
                onClick={() => handleViewPO(po.id)}
              >
                <td className="p-3 text-sm font-medium">
                  {po.po_number || `PO-${po.id.slice(0, 8)}`}
                </td>
                <td className="p-3 text-sm">
                  {po.companies?.company_name || 'Unknown Vendor'}
                </td>
                <td className="p-3 text-sm text-center">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(po.status)}`}
                  >
                    {po.status}
                  </Badge>
                </td>
                <td className="p-3 text-sm text-right font-medium">
                  {formatCurrency(po.total_amount)}
                </td>
                <td className="p-3 text-sm text-center">
                  {format(new Date(po.created_at), 'MM/dd/yyyy')}
                </td>
                <td className="p-3 text-center">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-sm font-medium">Total Amount:</span>
        <span className="text-lg font-semibold">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
