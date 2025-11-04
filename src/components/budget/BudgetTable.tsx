
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

import { useBudgetItemTotals } from '@/hooks/useBudgetItemTotals';
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
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Project Budget</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">
          <style>
            body { font-family: 'Montserrat', sans-serif; margin: 15px; font-size: 11px; counter-reset: page; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; font-family: 'Montserrat', sans-serif; }
            th { background-color: #fff; font-weight: 600; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .border-t-2 { border-top: 2px solid #000; }
            .print-footer { margin-top: 20px; padding-top: 15px; }
            .print-header { page-break-after: avoid; margin-bottom: 20px; }
            .text-sm { font-size: 11px; }
            .text-lg { font-size: 14px; }
            .text-xl { font-size: 16px; }
            .text-2xl { font-size: 24px; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-normal { font-weight: 400; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .p-1 { padding: 4px; }
            .p-2 { padding: 8px; }
            .pt-4 { padding-top: 16px; }
            @media print {
              body { 
                margin: 0.5in;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              thead { 
                display: table-header-group;
              }
              
              thead tr {
                border: none !important;
              }
              
              thead td {
                border-left: none !important;
                border-right: none !important;
                border-top: none !important;
              }
              
              tfoot {
                display: table-row-group !important;
              }
              
              tfoot tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              
              tbody tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              
              @page {
                margin: 0;
                size: auto;
              }
            }
          </style>
          <script>
            window.onload = function() {
              // Wait for print dialog to calculate pages
              setTimeout(function() {
                var pageNumbers = document.querySelectorAll('.page-number');
                var totalPages = document.querySelectorAll('.total-pages');
                
                // Calculate approximate number of pages based on content height
                var contentHeight = document.body.scrollHeight;
                var pageHeight = 1056; // Approximate page height in pixels (11 inches at 96 DPI)
                var numPages = Math.ceil(contentHeight / pageHeight);
                
                // Set total pages
                totalPages.forEach(function(el) {
                  el.textContent = numPages;
                });
                
                // For page numbers, we'll set them sequentially
                var currentPage = 1;
                pageNumbers.forEach(function(el) {
                  el.textContent = currentPage;
                  currentPage++;
                  if (currentPage > numPages) currentPage = 1;
                });
              }, 100);
            };
          </script>
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

  // Calculate all item totals once using the centralized hook
  const itemTotalsMap = useBudgetItemTotals(budgetItems, subcategoryTotalsMap);

  // Calculate total budget by summing GROUP SUBTOTALS only (not individual items)
  const totalBudget = useMemo(() => {
    return Object.entries(groupedBudgetItems).reduce((sum, [group, items]) => {
      return sum + calculateGroupTotal(items, itemTotalsMap);
    }, 0);
  }, [groupedBudgetItems, itemTotalsMap, calculateGroupTotal]);

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
            <col style={{ width: '48px' }} />
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
                  colSpan={6 + (visibleColumns.historicalCosts ? 1 : 0) + (visibleColumns.variance ? 1 : 0)}
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
                    groupTotal={calculateGroupTotal(items, itemTotalsMap)}
                    visibleColumns={visibleColumns}
                  />

                  {expandedGroups.has(group) && (
                    <>
                      {items.map((item) => (
                        <BudgetTableRow
                          key={item.id}
                          item={item}
                          itemTotal={itemTotalsMap[item.id]}
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
                        groupTotal={calculateGroupTotal(items, itemTotalsMap)}
                        historicalTotal={items.reduce((sum, item) => {
                          const costCode = item.cost_codes?.code;
                          return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
                        }, 0)}
                        showVarianceAsPercentage={showVarianceAsPercentage}
                        visibleColumns={visibleColumns}
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
