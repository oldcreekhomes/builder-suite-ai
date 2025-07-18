
import { useState, useEffect } from 'react';

export function useBudgetGroups(groupedBiddingItems?: Record<string, any[]>) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  const calculateGroupTotal = (groupItems: any[]) => {
    return groupItems.reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
      0
    );
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

  // Auto-expand all groups when bidding data is available
  useEffect(() => {
    if (groupedBiddingItems && Object.keys(groupedBiddingItems).length > 0) {
      setExpandedGroups(new Set(Object.keys(groupedBiddingItems)));
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
    removeGroupFromExpanded
  };
}
