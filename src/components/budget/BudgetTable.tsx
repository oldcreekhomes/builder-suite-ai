
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { BudgetPdfDocument } from './pdf/BudgetPdfDocument';
import { HistoricalOnlyRow } from './HistoricalOnlyRow';
import { BudgetExportPdfDialog, ExportPdfOptions } from './BudgetExportPdfDialog';
import { pdf } from '@react-pdf/renderer';
import { fetchHistoricalActualCosts } from '@/utils/fetchHistoricalActualCosts';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { useHistoricalActualCosts } from '@/hooks/useHistoricalActualCosts';
import { useMultipleHistoricalCosts } from '@/hooks/useMultipleHistoricalCosts';
import { useAllBudgetSubcategories } from '@/hooks/useAllBudgetSubcategories';
import { useBudgetLockStatus } from '@/hooks/useBudgetLockStatus';
import { useLotManagement } from '@/hooks/useLotManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const { selectedLotId, selectLot } = useLotManagement(projectId);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [selectedHistoricalProject, setSelectedHistoricalProject] = useState('');
  const [showVarianceAsPercentage, setShowVarianceAsPercentage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockAction, setLockAction] = useState<'lock' | 'unlock'>('lock');
  
  const visibleColumns: VisibleColumns = {
    historicalCosts: true,
    variance: true,
  };
  
  const { 
    isLocked, 
    canLockBudgets, 
    lockBudget, 
    unlockBudget,
  } = useBudgetLockStatus(projectId);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  
  const { budgetItems, groupedBudgetItems, existingCostCodeIds, parentCodeNames } = useBudgetData(projectId, selectedLotId);
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
  
  // Find cost codes from historical project that are NOT in current budget
  // Group them by parent_group so we can display them in the correct section
  const missingHistoricalByGroup = useMemo(() => {
    if (!selectedHistoricalProject || historicalCostCodes.length === 0) {
      return {} as Record<string, Array<{ costCode: typeof historicalCostCodes[0]; amount: number }>>;
    }
    
    // Get set of cost code IDs already in budget
    const existingCostCodeIdSet = new Set(existingCostCodeIds);
    
    // Find historical cost codes not in current budget
    const missing: Record<string, Array<{ costCode: typeof historicalCostCodes[0]; amount: number }>> = {};
    
    historicalCostCodes.forEach(costCode => {
      if (!existingCostCodeIdSet.has(costCode.id)) {
        const parentGroup = costCode.parent_group || 'Other';
        if (!missing[parentGroup]) {
          missing[parentGroup] = [];
        }
        missing[parentGroup].push({
          costCode,
          amount: historicalActualCosts[costCode.code] || 0
        });
      }
    });
    
    // Sort each group by code
    Object.keys(missing).forEach(group => {
      missing[group].sort((a, b) => a.costCode.code.localeCompare(b.costCode.code, undefined, { numeric: true }));
    });
    
    return missing;
  }, [selectedHistoricalProject, historicalCostCodes, existingCostCodeIds, historicalActualCosts]);
  
  
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
  
  const { deletingGroups, deletingItems, handleUpdateItem, handleUpdateUnit, handleUpdateActual, handleDeleteItem, handleDeleteGroup } = useBudgetMutations(projectId);

  const handleLockToggle = () => {
    if (isLocked) {
      setLockAction('unlock');
    } else {
      setLockAction('lock');
    }
    setShowLockDialog(true);
  };

  const handleConfirmLock = () => {
    if (lockAction === 'lock') {
      lockBudget(undefined);
    } else {
      unlockBudget(undefined);
    }
    setShowLockDialog(false);
  };

  const onDeleteGroup = (group: string) => {
    if (isLocked) {
      toast({
        title: "Budget Locked",
        description: "Cannot delete items from a locked budget",
        variant: "destructive",
      });
      return;
    }
    
    const groupItems = groupedBudgetItems[group] || [];
    handleDeleteGroup(group, groupItems);
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onDeleteItem = (itemId: string) => {
    if (isLocked) {
      toast({
        title: "Budget Locked",
        description: "Cannot delete items from a locked budget",
        variant: "destructive",
      });
      return;
    }
    
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
            body { font-family: 'Montserrat', sans-serif; margin: 15px; font-size: 11px; }
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
              
              table {
                border: none !important;
              }
              
              thead td {
                border-left: none !important;
                border-right: none !important;
                border-top: none !important;
                border-bottom: none !important;
              }
              
              thead h1, thead div {
                margin: 0 0 4px 0 !important;
              }
              
              thead tr:first-child td {
                padding-top: 0 !important;
              }
              
              .print-page-counter {
                position: fixed;
                bottom: 0.5in;
                right: 0.5in;
                z-index: 9999;
                font-size: 11px;
                font-weight: 400;
                pointer-events: none;
              }
              
              .print-page-counter::before {
                content: counter(page);
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

  const handleExportPdf = async (options: ExportPdfOptions) => {
    setIsExportingPdf(true);
    setShowExportDialog(false);
    
    try {
      console.log('Starting PDF export with options:', options);
      
      const pdfVisibleColumns = {
        historical: options.includeHistorical,
        variance: options.includeVariance,
      };

      // Fetch historical data directly for the selected project
      let pdfHistoricalData = null;
      if (options.includeHistorical && options.historicalProjectId) {
        console.log('Fetching historical data for project:', options.historicalProjectId);
        pdfHistoricalData = await fetchHistoricalActualCosts(options.historicalProjectId);
        console.log('Historical data fetched:', pdfHistoricalData);
      }

      console.log('Generating PDF document...');
      
      const blob = await pdf(
        <BudgetPdfDocument
          projectAddress={projectAddress}
          groupedBudgetItems={groupedBudgetItems}
          visibleColumns={pdfVisibleColumns}
          historicalProjectAddress={options.historicalProjectAddress}
          showVarianceAsPercentage={options.varianceAsPercentage}
          historicalActualCosts={pdfHistoricalData}
          subcategoryTotals={subcategoryTotalsMap}
        />
      ).toBlob();

      console.log('PDF blob created, downloading...');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Project_Budget-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF exported successfully",
        description: "Your budget PDF has been downloaded",
      });
      
      console.log('PDF export complete');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF export failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the PDF",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
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

  // Calculate total actual by summing actual_amount across all groups
  const totalActual = useMemo(() => {
    return Object.entries(groupedBudgetItems).reduce((sum, [group, items]) => {
      return sum + items.reduce((itemSum, item) => itemSum + (item.actual_amount || 0), 0);
    }, 0);
  }, [groupedBudgetItems]);

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
        projectId={projectId}
        selectedLotId={selectedLotId}
        onSelectLot={selectLot}
        onPrint={handlePrint}
        onExportPdf={() => setShowExportDialog(true)}
        onAddBudget={() => !isLocked && setShowAddBudgetModal(true)}
        onToggleExpandCollapse={handleToggleExpandCollapse}
        allExpanded={allGroupsExpanded}
        isExportingPdf={isExportingPdf}
        isLocked={isLocked}
        canLockBudgets={canLockBudgets}
        onLockToggle={handleLockToggle}
      />

      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lockAction === 'lock' ? 'Lock Budget' : 'Unlock Budget'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lockAction === 'lock' 
                ? 'Are you sure you want to lock this budget? This will prevent any edits until it is unlocked.'
                : 'Are you sure you want to unlock this budget? This will allow edits to be made.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLock}>
              {lockAction === 'lock' ? 'Lock' : 'Unlock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <col style={{ width: '48px' }} />
            {visibleColumns.historicalCosts && <col style={{ width: '208px' }} />}
            {visibleColumns.variance && <col style={{ width: '192px' }} />}
            <col style={{ width: '208px' }} />
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
                    groupName={parentCodeNames[group] || ''}
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
                    isLocked={isLocked}
                  />

                  {expandedGroups.has(group) && (
                    <>
                      {/* Merge budget items with historical-only items and sort by cost code */}
                      {(() => {
                        const budgetRows = items.map(item => ({ 
                          type: 'budget' as const, 
                          item, 
                          sortKey: item.cost_codes?.code || '' 
                        }));
                        
                        const historicalRows = (missingHistoricalByGroup[group] || []).map(({ costCode, amount }) => ({ 
                          type: 'historical' as const, 
                          costCode, 
                          amount, 
                          sortKey: costCode.code 
                        }));
                        
                        const allRows = [...budgetRows, ...historicalRows].sort((a, b) => 
                          a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true })
                        );
                        
                        return allRows.map((row) => 
                          row.type === 'budget' ? (
                            <BudgetTableRow
                              key={row.item.id}
                              item={row.item}
                              itemTotal={itemTotalsMap[row.item.id]}
                              onUpdate={handleUpdateItem}
                              onUpdateUnit={handleUpdateUnit}
                              onUpdateActual={handleUpdateActual}
                              onDelete={onDeleteItem}
                              formatUnitOfMeasure={formatUnitOfMeasure}
                              isSelected={selectedItems.has(row.item.id)}
                              onCheckboxChange={handleItemCheckboxChange}
                              isDeleting={deletingItems.has(row.item.id)}
                              historicalActualCosts={historicalActualCosts}
                              showVarianceAsPercentage={showVarianceAsPercentage}
                              visibleColumns={visibleColumns}
                              projectId={projectId}
                              isLocked={isLocked}
                            />
                          ) : (
                            <HistoricalOnlyRow
                              key={`historical-${row.costCode.id}`}
                              costCode={row.costCode}
                              historicalAmount={row.amount}
                              showVarianceAsPercentage={showVarianceAsPercentage}
                              visibleColumns={visibleColumns}
                            />
                          )
                        );
                      })()}
                      <BudgetGroupTotalRow
                        group={group}
                        groupTotal={calculateGroupTotal(items, itemTotalsMap)}
                        actualTotal={items.reduce((sum, item) => sum + (item.actual_amount || 0), 0)}
                        historicalTotal={
                          items.reduce((sum, item) => {
                            const costCode = item.cost_codes?.code;
                            return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
                          }, 0) + 
                          (missingHistoricalByGroup[group]?.reduce((sum, item) => sum + item.amount, 0) || 0)
                        }
                        showVarianceAsPercentage={showVarianceAsPercentage}
                        visibleColumns={visibleColumns}
                      />
                    </>
                  )}
                </tbody>
              ))}
              
              {/* Show groups that only exist in historical data */}
              {Object.entries(missingHistoricalByGroup)
                .filter(([group]) => !groupedBudgetItems[group])
                .map(([group, items]) => (
                  <tbody key={`historical-group-${group}`}>
                    <BudgetGroupHeader
                      group={group}
                      groupName={parentCodeNames[group] || items[0]?.costCode?.name || ''}
                      isExpanded={expandedGroups.has(group)}
                      onToggle={handleGroupToggle}
                      isSelected={false}
                      isPartiallySelected={false}
                      onCheckboxChange={() => {}}
                      onEditGroup={() => {}}
                      onDeleteGroup={() => {}}
                      isDeleting={false}
                      groupTotal={0}
                      visibleColumns={visibleColumns}
                      isLocked={true}
                    />
                    {expandedGroups.has(group) && (
                      <>
                        {items.map(({ costCode, amount }) => (
                          <HistoricalOnlyRow
                            key={`historical-${costCode.id}`}
                            costCode={costCode}
                            historicalAmount={amount}
                            showVarianceAsPercentage={showVarianceAsPercentage}
                            visibleColumns={visibleColumns}
                          />
                        ))}
                        <BudgetGroupTotalRow
                          group={group}
                          groupTotal={0}
                          actualTotal={0}
                          historicalTotal={items.reduce((sum, item) => sum + item.amount, 0)}
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
                  totalActual={totalActual}
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

      <BudgetExportPdfDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExportPdf}
        isExporting={isExportingPdf}
      />

      {showAddBudgetModal && (
        <BudgetCreationModal
          projectId={projectId}
          open={showAddBudgetModal}
          onOpenChange={setShowAddBudgetModal}
          existingCostCodeIds={existingCostCodeIds}
          selectedLotId={selectedLotId}
        />
      )}
    </div>
  );
}
