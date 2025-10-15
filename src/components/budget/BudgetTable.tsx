
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AddBudgetModal } from './AddBudgetModal';
import { BudgetTableHeader } from './BudgetTableHeader';
import { BudgetGroupHeader } from './BudgetGroupHeader';
import { BudgetTableRow } from './BudgetTableRow';
import { BudgetGroupTotalRow } from './BudgetGroupTotalRow';
import { BudgetProjectTotalRow } from './BudgetProjectTotalRow';
import { BudgetTableFooter } from './BudgetTableFooter';
import { BudgetPrintToolbar } from './BudgetPrintToolbar';
import { BudgetPrintView } from './BudgetPrintView';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { useHistoricalActualCosts } from '@/hooks/useHistoricalActualCosts';
import { useAutoAddMissingCostCodes } from '@/hooks/useAutoAddMissingCostCodes';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';
import { BulkActionBar } from '@/components/files/components/BulkActionBar';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useBudgetSubcategories } from '@/hooks/useBudgetSubcategories';

interface BudgetTableProps {
  projectId: string;
  projectAddress?: string;
}

export function BudgetTable({ projectId, projectAddress }: BudgetTableProps) {
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [selectedHistoricalProject, setSelectedHistoricalProject] = useState('');
  const [showVarianceAsPercentage, setShowVarianceAsPercentage] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    cost: true,
    unit: true,
    quantity: true,
    totalBudget: true,
    historicalCosts: true,
    variance: true,
  });
  
  const { budgetItems, groupedBudgetItems, existingCostCodeIds } = useBudgetData(projectId);
  const { data: historicalData } = useHistoricalActualCosts(selectedHistoricalProject || null);
  
  const historicalActualCosts = historicalData?.mapByCode || {};
  const historicalTotal = historicalData?.total || 0;
  const historicalCostCodes = historicalData?.costCodes || [];
  
  // Auto-add missing cost codes from historical project
  useAutoAddMissingCostCodes(projectId, historicalCostCodes, budgetItems);
  
  const {
    expandedGroups,
    selectedItems,
    handleGroupToggle,
    handleGroupCheckboxChange,
    handleItemCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    calculateGroupTotal,
    removeDeletedItemsFromSelection,
    removeGroupFromExpanded
  } = useBudgetGroups();
  
  const { deletingGroups, deletingItems, handleUpdateItem, handleUpdateUnit, handleDeleteItem, handleDeleteGroup } = useBudgetMutations(projectId);

  const onDeleteGroup = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleDeleteGroup(group, groupItems);
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onDeleteItem = (itemId: string) => {
    handleDeleteItem(itemId);
    
    // Clean up UI state after deletion
    const newSelectedItems = new Set(selectedItems);
    newSelectedItems.delete(itemId);
  };

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const onBulkDelete = () => {
    // Get all selected items from the budget data
    const selectedBudgetItems = budgetItems.filter(item => selectedItems.has(item.id));
    
    // Delete each selected item
    selectedBudgetItems.forEach(item => {
      handleDeleteItem(item.id);
    });
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(selectedBudgetItems);
  };

  const handlePrint = () => {
    // Show the print content
    const printContent = document.querySelector('.print-content');
    if (printContent) {
      printContent.classList.remove('hidden');
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Project Budget - ${projectAddress || 'Budget'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
            th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bg-gray-100 { background-color: #f5f5f5; }
            .bg-gray-50 { background-color: #f9f9f9; }
            .border-t-2 { border-top: 2px solid #ccc; }
            .print-footer { margin-top: 20px; padding-top: 15px; }
            .text-sm { font-size: 11px; }
            .text-lg { font-size: 14px; }
            .text-xl { font-size: 16px; }
            .text-2xl { font-size: 18px; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .p-1 { padding: 4px; }
            .p-2 { padding: 8px; }
            .pt-4 { padding-top: 16px; }
            @media print {
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${printContent?.innerHTML || ''}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    // Hide the print content again
    if (printContent) {
      printContent.classList.add('hidden');
    }
  };

  const selectedCount = selectedItems.size;
  const isDeletingSelected = Array.from(selectedItems).some(id => deletingItems.has(id));

  const handleToggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Helper component to calculate item total (same logic as BudgetTableRow)
  const BudgetItemTotal = ({ item }: { item: any }) => {
    const costCode = item.cost_codes;
    const hasSubcategories = costCode?.has_subcategories || false;
    const { calculatedTotal: subcategoryTotal } = useBudgetSubcategories(
      item.id,
      costCode?.id,
      item.project_id,
      hasSubcategories
    );
    
    return hasSubcategories 
      ? subcategoryTotal 
      : (item.quantity || 0) * (item.unit_price || 0);
  };

  // Calculate total budget by summing the visible group totals
  const totalBudget = useMemo(() => {
    return Object.values(groupedBudgetItems).reduce((sum, items) => {
      return sum + calculateGroupTotal(items);
    }, 0);
  }, [groupedBudgetItems, calculateGroupTotal]);

  return (
    <div className="space-y-4">
      <BudgetPrintToolbar 
        onPrint={handlePrint} 
        onAddBudget={() => setShowAddBudgetModal(true)}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
      />

      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedFolderCount={0}
          onBulkDelete={onBulkDelete}
          isDeleting={isDeletingSelected}
        />
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table className="table-fixed">
          <BudgetTableHeader 
            showVarianceAsPercentage={showVarianceAsPercentage}
            onToggleVarianceMode={() => setShowVarianceAsPercentage(!showVarianceAsPercentage)}
            visibleColumns={visibleColumns}
            selectedHistoricalProject={selectedHistoricalProject}
            onHistoricalProjectChange={setSelectedHistoricalProject}
          />
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBudgetItems).map(([group, items]) => (
                  <React.Fragment key={group}>
                    <BudgetGroupHeader
                      group={group}
                      isExpanded={expandedGroups.has(group)}
                      onToggle={handleGroupToggle}
                      isSelected={isGroupSelected(items)}
                      isPartiallySelected={isGroupPartiallySelected(items)}
                      onCheckboxChange={onGroupCheckboxChange}
                      onEditGroup={() => {}}
                      onDeleteGroup={onDeleteGroup}
                      isDeleting={deletingGroups.has(group)}
                      groupTotal={calculateGroupTotal(items)}
                      visibleColumns={visibleColumns}
                    />
                    
                    {expandedGroups.has(group) && (
                      <>
                        {items.map((item) => (
                          <BudgetTableRow
                            key={item.id}
                            item={item}
                            onUpdate={handleUpdateItem}
                            onUpdateUnit={handleUpdateUnit}
                            onDelete={onDeleteItem}
                            formatUnitOfMeasure={formatUnitOfMeasure}
                            isSelected={selectedItems.has(item.id)}
                            onCheckboxChange={handleItemCheckboxChange}
                            isDeleting={deletingItems.has(item.id)}
                            historicalActualCosts={historicalActualCosts}
                            showVarianceAsPercentage={showVarianceAsPercentage}
                            visibleColumns={visibleColumns}
                          />
                        ))}
                        <BudgetGroupTotalRow
                          group={group}
                          groupTotal={calculateGroupTotal(items)}
                          historicalTotal={(() => {
                            // Sum unique codes to avoid double-counting
                            const uniqueCodes = new Set(
                              items.map(i => i.cost_codes?.code).filter(Boolean)
                            );
                            return Array.from(uniqueCodes).reduce(
                              (sum, code) => sum + (historicalActualCosts[code] || 0),
                              0
                            );
                          })()}
                          showVarianceAsPercentage={showVarianceAsPercentage}
                          visibleColumns={visibleColumns}
                          groupItems={items}
                        />
                      </>
                    )}
                  </React.Fragment>
                ))}
                <BudgetProjectTotalRow
                  totalBudget={totalBudget}
                  totalHistorical={historicalTotal}
                  showVarianceAsPercentage={showVarianceAsPercentage}
                  visibleColumns={visibleColumns}
                  budgetItems={budgetItems}
                  groupedBudgetItems={groupedBudgetItems}
                />
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <BudgetTableFooter budgetItems={budgetItems} />

      <BudgetPrintView 
        budgetItems={budgetItems}
        groupedBudgetItems={groupedBudgetItems}
        projectAddress={projectAddress}
      />

      {showAddBudgetModal && (
        <AddBudgetModal
          projectId={projectId}
          open={showAddBudgetModal}
          onOpenChange={setShowAddBudgetModal}
          existingCostCodeIds={existingCostCodeIds}
        />
      )}
    </div>
  );
}
