
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BudgetCreationModal } from './BudgetCreationModal';
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
import { useMultipleHistoricalCosts } from '@/hooks/useMultipleHistoricalCosts';
import { useAllBudgetSubcategories } from '@/hooks/useAllBudgetSubcategories';
import { useAutoAddMissingCostCodes } from '@/hooks/useAutoAddMissingCostCodes';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';
import { BulkActionBar } from '@/components/files/components/BulkActionBar';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useBudgetSubcategories } from '@/hooks/useBudgetSubcategories';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetTableProps {
  projectId: string;
  projectAddress?: string;
}

export function BudgetTable({ projectId, projectAddress }: BudgetTableProps) {
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [selectedHistoricalProject, setSelectedHistoricalProject] = useState('none');
  const [showVarianceAsPercentage, setShowVarianceAsPercentage] = useState(false);
  const visibleColumns: VisibleColumns = {
    historicalCosts: true,
    variance: true,
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  
  const { budgetItems, groupedBudgetItems, existingCostCodeIds } = useBudgetData(projectId);
  const { data: historicalData } = useHistoricalActualCosts(selectedHistoricalProject || null);
  
  const historicalActualCosts = historicalData?.mapByCode || {};
  const historicalTotal = historicalData?.total || 0;
  const historicalCostCodes = historicalData?.costCodes || [];
  
  // Collect all unique historical project IDs from budget items
  const historicalProjectIds = useMemo(() => {
    const ids = new Set<string>();
    budgetItems.forEach(item => {
      if (item.budget_source === 'historical' && item.historical_project_id) {
        ids.add(item.historical_project_id);
      }
    });
    return Array.from(ids);
  }, [budgetItems]);
  
  // Fetch historical costs for all historical projects used in budget items
  const { data: historicalCostsMap = {} } = useMultipleHistoricalCosts(historicalProjectIds);
  
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
    removeGroupFromExpanded,
    expandAllGroups,
    collapseAllGroups
  } = useBudgetGroups(groupedBudgetItems);
  
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
      const printDate = new Date().toLocaleString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Project Budget</title>
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
            .print-header { page-break-after: avoid; }
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
              @page {
                margin-top: 20px;
                margin-bottom: 70px;
                /* Override browser's default headers/footers */
                @top-left { content: ""; }
                @top-center { content: ""; }
                @top-right { content: ""; }
                @bottom-left { content: ""; }
                @bottom-center { content: ""; }
                @bottom-right { content: ""; }
              }
              
              .print-header {
                display: block;
                page-break-after: avoid;
              }
              
              table thead {
                display: table-row-group;
              }
              
              body::before {
                content: "${printDate}";
                position: fixed;
                bottom: 10px;
                left: 15px;
                font-size: 10px;
                color: #000;
              }
              
              body::after {
                content: "Page " counter(page);
                position: fixed;
                bottom: 10px;
                right: 15px;
                font-size: 10px;
                color: #000;
              }
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

  // Fetch all subcategory totals for items with subcategories
  const { data: subcategoryTotalsMap = {} } = useAllBudgetSubcategories(budgetItems, projectId);

  // Calculate total budget by summing the visible group totals
  const totalBudget = useMemo(() => {
    return Object.values(groupedBudgetItems).reduce((sum, items) => {
      return sum + calculateGroupTotal(items, subcategoryTotalsMap, historicalCostsMap);
    }, 0);
  }, [groupedBudgetItems, calculateGroupTotal, subcategoryTotalsMap, historicalCostsMap]);

  const allGroupsExpanded = expandedGroups.size === Object.keys(groupedBudgetItems).length;
  
  const handleToggleExpandCollapse = () => {
    if (allGroupsExpanded) {
      collapseAllGroups();
    } else {
      expandAllGroups();
    }
  };

  return (
    <div className="space-y-4">
      <BudgetPrintToolbar 
        onPrint={handlePrint} 
        onAddBudget={() => setShowAddBudgetModal(true)}
        onToggleExpandCollapse={handleToggleExpandCollapse}
        allExpanded={allGroupsExpanded}
      />

      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedFolderCount={0}
          onBulkDelete={onBulkDelete}
          isDeleting={isDeletingSelected}
        />
      )}

      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        <Table className="table-fixed">
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '320px' }} />
            <col style={{ width: '192px' }} />
            <col style={{ width: '208px' }} />
            {visibleColumns.historicalCosts && <col style={{ width: '208px' }} />}
            {visibleColumns.variance && <col style={{ width: '192px' }} />}
          </colgroup>
          <BudgetTableHeader 
            headerRef={headerRef}
            showVarianceAsPercentage={showVarianceAsPercentage}
            onToggleVarianceMode={() => setShowVarianceAsPercentage(!showVarianceAsPercentage)}
            visibleColumns={visibleColumns}
            selectedHistoricalProject={selectedHistoricalProject}
            onHistoricalProjectChange={setSelectedHistoricalProject}
          />

          {budgetItems.length === 0 ? (
            <tbody>
              <TableRow>
                <TableCell 
                  colSpan={5 + (visibleColumns.historicalCosts ? 1 : 0) + (visibleColumns.variance ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  No budget items added yet.
                </TableCell>
              </TableRow>
            </tbody>
          ) : (
            <>
              {Object.entries(groupedBudgetItems).map(([group, items]) => (
                <tbody key={group}>
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
                    groupTotal={calculateGroupTotal(items, subcategoryTotalsMap, historicalCostsMap)}
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
                          projectId={projectId}
                        />
                      ))}
                      <BudgetGroupTotalRow
                        group={group}
                        groupTotal={calculateGroupTotal(items, subcategoryTotalsMap, historicalCostsMap)}
                        historicalTotal={items.reduce((sum, item) => {
                          const costCode = item.cost_codes?.code;
                          return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
                        }, 0)}
                        showVarianceAsPercentage={showVarianceAsPercentage}
                        visibleColumns={visibleColumns}
                        groupItems={items}
                        subcategoryTotals={subcategoryTotalsMap}
                      />
                    </>
                  )}
                </tbody>
              ))}

              <tbody>
                <BudgetProjectTotalRow
                  totalBudget={totalBudget}
                  totalHistorical={historicalTotal}
                  showVarianceAsPercentage={showVarianceAsPercentage}
                  visibleColumns={visibleColumns}
                  budgetItems={budgetItems}
                  groupedBudgetItems={groupedBudgetItems}
                  subcategoryTotals={subcategoryTotalsMap}
                />
              </tbody>
            </>
          )}
        </Table>
      </div>

      <BudgetPrintView
        budgetItems={budgetItems}
        groupedBudgetItems={groupedBudgetItems}
        projectAddress={projectAddress}
        subcategoryTotals={subcategoryTotalsMap}
        historicalCostsMap={historicalCostsMap}
        visibleColumns={visibleColumns}
        selectedHistoricalProject={selectedHistoricalProject}
        showVarianceAsPercentage={showVarianceAsPercentage}
        historicalActualCosts={historicalActualCosts}
      />

      {showAddBudgetModal && (
        <BudgetCreationModal
          projectId={projectId}
          open={showAddBudgetModal}
          onOpenChange={setShowAddBudgetModal}
          existingCostCodeIds={existingCostCodeIds}
        />
      )}
    </div>
  );
}
