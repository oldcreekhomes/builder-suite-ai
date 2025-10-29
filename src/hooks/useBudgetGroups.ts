
import { useState, useEffect, useRef } from 'react';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';

export function useBudgetGroups(groupedBiddingItems?: Record<string, any[]>) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean, groupItems: any[]) => {
    const newSelected = new Set(selectedItems);
    
    if (checked) {
      // Select all items in this group
      groupItems.forEach(item => newSelected.add(item.id));
    } else {
      // Deselect all items in this group
      groupItems.forEach(item => newSelected.delete(item.id));
    }
    
    setSelectedItems(newSelected);
  };

  const handleItemCheckboxChange = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    
    setSelectedItems(newSelected);
  };

  const isGroupSelected = (groupItems: any[]) => {
    return groupItems.length > 0 && groupItems.every(item => selectedItems.has(item.id));
  };

  const isGroupPartiallySelected = (groupItems: any[]) => {
    const selectedInGroup = groupItems.filter(item => selectedItems.has(item.id));
    return selectedInGroup.length > 0 && selectedInGroup.length < groupItems.length;
  };

  const calculateGroupTotal = (
    groupItems: any[], 
    subcategoryTotals: Record<string, number> = {},
    historicalCostsMap: Record<string, Record<string, number>> = {}
  ) => {
    return groupItems.reduce((sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const costCode = item.cost_codes as any;
      
      // Get historical cost if this item uses historical source
      let historicalCostForItem: number | undefined = undefined;
      if (item.budget_source === 'historical' && item.historical_project_id && costCode?.code) {
        const projectHistoricalCosts = historicalCostsMap[item.historical_project_id];
        historicalCostForItem = projectHistoricalCosts?.[costCode.code] || 0;
      }
      
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCostForItem);
    }, 0);
  };

  const removeDeletedItemsFromSelection = (groupItems: any[]) => {
    const newSelected = new Set(selectedItems);
    groupItems.forEach(item => newSelected.delete(item.id));
    setSelectedItems(newSelected);
  };

  const removeGroupFromExpanded = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    newExpanded.delete(group);
    setExpandedGroups(newExpanded);
  };

  const expandAllGroups = () => {
    if (groupedBiddingItems) {
      setExpandedGroups(new Set(Object.keys(groupedBiddingItems)));
    }
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  // Initialize groups as expanded only on first load
  useEffect(() => {
    if (groupedBiddingItems && Object.keys(groupedBiddingItems).length > 0 && !initializedRef.current) {
      setExpandedGroups(new Set(Object.keys(groupedBiddingItems)));
      initializedRef.current = true;
    }
  }, [groupedBiddingItems]);

  return {
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
  };
}
