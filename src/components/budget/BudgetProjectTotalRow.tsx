import { TableRow, TableCell } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetProjectTotalRowProps {
  totalBudget: number;
  totalHistorical: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
}

export function BudgetProjectTotalRow({ 
  totalBudget, 
  totalHistorical,
  showVarianceAsPercentage = false,
  visibleColumns
}: BudgetProjectTotalRowProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateVariance = () => {
    // Only show no variance if BOTH are 0 or null
    if ((totalHistorical === undefined || totalHistorical === null || totalHistorical === 0) && totalBudget === 0) return null;
    
    // Treat null/undefined historical as 0 for calculation
    const historical = totalHistorical || 0;
    
    if (showVarianceAsPercentage && totalBudget !== 0) {
      return ((historical - totalBudget) / totalBudget) * 100;
    }
    return historical - totalBudget;
  };

  const variance = calculateVariance();

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return '';
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return '';
  };

  const formatVariance = (variance: number | null) => {
    if (variance === null) return '-';
    const prefix = variance > 0 ? '+' : '';
    if (showVarianceAsPercentage) {
      return `${prefix}${variance.toFixed(1)}%`;
    }
    return prefix + formatCurrency(variance);
  };

  return (
    <TableRow className="bg-gray-50 h-8 border-b border-gray-200">
      <TableCell className="px-1 py-0 w-12">
        {/* Empty checkbox cell */}
      </TableCell>
      <TableCell className="px-1 py-0 w-20" style={{ paddingLeft: '50px' }}>
        {/* Empty code cell */}
      </TableCell>
      <TableCell className="px-1 py-0 w-40">
        <div className="text-xs font-medium">
          Total Project Costs
        </div>
      </TableCell>
      {visibleColumns.cost && (
        <TableCell className="px-3 py-0 w-32">
          {/* Empty price cell */}
        </TableCell>
      )}
      {visibleColumns.unit && (
        <TableCell className="px-3 py-0 w-20">
          {/* Empty unit cell */}
        </TableCell>
      )}
      {visibleColumns.quantity && (
        <TableCell className="px-3 py-0 w-24">
          {/* Empty quantity cell */}
        </TableCell>
      )}
      {visibleColumns.totalBudget && (
        <TableCell className="px-3 py-0 w-32">
          <div className="text-xs font-medium">
            {formatCurrency(totalBudget)}
          </div>
        </TableCell>
      )}
      {visibleColumns.historicalCosts && (
        <TableCell className="px-3 py-0 w-48">
          <div className="text-xs -ml-3">
            {formatCurrency(totalHistorical)}
          </div>
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="px-3 py-0 w-32">
          <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
            {formatVariance(variance)}
          </div>
        </TableCell>
      )}
      <TableCell className="px-1 py-0 w-20">
        {/* Empty actions cell */}
      </TableCell>
    </TableRow>
  );
}
