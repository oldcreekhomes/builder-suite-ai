
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
  const [selectedHistoricalProject, setSelectedHistoricalProject] = useState('');
  const [showVarianceAsPercentage, setShowVarianceAsPercentage] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    historicalCosts: true,
    variance: true,
  });
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(40);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  
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

  // Build a map of subcategory totals for all items
  // Note: This is initialized as empty and will be populated by child components
  // We keep it stable to prevent unnecessary re-renders
  const subcategoryTotalsMap = useMemo(() => ({}), []);

  // Calculate total budget by summing the visible group totals
  const totalBudget = useMemo(() => {
    return Object.values(groupedBudgetItems).reduce((sum, items) => {
      return sum + calculateGroupTotal(items, subcategoryTotalsMap);
    }, 0);
  }, [groupedBudgetItems, calculateGroupTotal, subcategoryTotalsMap]);

  // Measure header height
  useEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        const firstRow = headerRef.current.querySelector('tr');
        if (firstRow) {
          setHeaderHeight(firstRow.getBoundingClientRect().height);
        }
      }
    };
    
    measureHeader();
    window.addEventListener('resize', measureHeader);
    return () => window.removeEventListener('resize', measureHeader);
  }, [visibleColumns]);

  // Determine active group on scroll
  useEffect(() => {
    let rafId: number;
    
    const updateActiveGroup = () => {
      if (!headerRef.current) return;
      
      const headerRow = headerRef.current.querySelector('tr');
      if (!headerRow) return;
      
      const headerBottom = headerRow.getBoundingClientRect().bottom;
      const groups = Object.keys(groupedBudgetItems);
      
      let newActiveGroup: string | null = null;
      
      for (const group of groups) {
        const tbody = groupRefs.current[group];
        if (!tbody) continue;
        
        const rect = tbody.getBoundingClientRect();
        
        // If this group's bottom is above the header, skip it
        if (rect.bottom <= headerBottom) continue;
        
        // If this group's top is at or above the header bottom, it's the active one
        if (rect.top <= headerBottom) {
          newActiveGroup = group;
          break;
        }
      }
      
      setActiveGroup(newActiveGroup);
    };
    
    const handleScroll = () => {
      rafId = requestAnimationFrame(updateActiveGroup);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveGroup(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [groupedBudgetItems]);

  return (
    <div className="space-y-4">
      <BudgetPrintToolbar 
        onPrint={handlePrint} 
        onAddBudget={() => setShowAddBudgetModal(true)}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onExpandAll={expandAllGroups}
        onCollapseAll={collapseAllGroups}
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
          <BudgetTableHeader 
            ref={headerRef}
            showVarianceAsPercentage={showVarianceAsPercentage}
            onToggleVarianceMode={() => setShowVarianceAsPercentage(!showVarianceAsPercentage)}
            visibleColumns={visibleColumns}
            selectedHistoricalProject={selectedHistoricalProject}
            onHistoricalProjectChange={setSelectedHistoricalProject}
          />

          {activeGroup && groupedBudgetItems[activeGroup] && (
            <tbody className="sticky z-10" style={{ top: `${headerHeight}px` }}>
              <BudgetGroupHeader
                group={activeGroup}
                isExpanded={expandedGroups.has(activeGroup)}
                onToggle={handleGroupToggle}
                isSelected={isGroupSelected(groupedBudgetItems[activeGroup])}
                isPartiallySelected={isGroupPartiallySelected(groupedBudgetItems[activeGroup])}
                onCheckboxChange={onGroupCheckboxChange}
                onEditGroup={() => {}}
                onDeleteGroup={onDeleteGroup}
                isDeleting={deletingGroups.has(activeGroup)}
                groupTotal={calculateGroupTotal(groupedBudgetItems[activeGroup], subcategoryTotalsMap)}
                visibleColumns={visibleColumns}
              />
            </tbody>
          )}

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
                <tbody key={group} ref={(el) => groupRefs.current[group] = el} className="relative">
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
                    groupTotal={calculateGroupTotal(items, subcategoryTotalsMap)}
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

      <BudgetTableFooter budgetItems={budgetItems} />

      <BudgetPrintView 
        budgetItems={budgetItems}
        groupedBudgetItems={groupedBudgetItems}
        projectAddress={projectAddress}
        subcategoryTotals={subcategoryTotalsMap}
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
