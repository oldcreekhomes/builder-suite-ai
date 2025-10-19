import { useState } from 'react';

export function useTakeoffItemSelection() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleItemCheckboxChange = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectAll = (itemIds: string[]) => {
    setSelectedItems(new Set(itemIds));
  };

  return {
    selectedItems,
    handleItemCheckboxChange,
    clearSelection,
    selectAll,
  };
}
