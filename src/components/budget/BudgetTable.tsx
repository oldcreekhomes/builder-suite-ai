import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AddBudgetModal } from './AddBudgetModal';
import { BudgetTableHeader } from './BudgetTableHeader';
import { BudgetGroupHeader } from './BudgetGroupHeader';
import { BudgetTableRow } from './BudgetTableRow';
import { BudgetTableFooter } from './BudgetTableFooter';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BudgetTableProps {
  projectId: string;
}

export function BudgetTable({ projectId }: BudgetTableProps) {
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, { quantity: string; unit_price: string }>>({});
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing budget items for this project
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes (*)
        `)
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Update budget item mutation
  const updateBudgetItem = useMutation({
    mutationFn: async ({ id, quantity, unit_price }: { id: string; quantity: number; unit_price: number }) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .update({ quantity, unit_price })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: "Budget item updated successfully",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (group: string) => {
      const groupItems = groupedBudgetItems[group] || [];
      const itemIds = groupItems.map(item => item.id);
      
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .in('id', itemIds);
      
      if (error) throw error;
      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      
      // Remove deleted items from selected items
      const groupItems = groupedBudgetItems[group] || [];
      const newSelected = new Set(selectedItems);
      groupItems.forEach(item => newSelected.delete(item.id));
      setSelectedItems(newSelected);
      
      // Remove group from expanded groups
      const newExpanded = new Set(expandedGroups);
      newExpanded.delete(group);
      setExpandedGroups(newExpanded);
      
      setDeletingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(group);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: `All items in "${group}" group have been deleted`,
      });
    },
    onError: (error, group) => {
      console.error('Error deleting group:', error);
      setDeletingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(group);
        return newSet;
      });
      toast({
        title: "Error",
        description: `Failed to delete "${group}" group`,
        variant: "destructive",
      });
    },
  });

  // Format unit of measure
  const formatUnitOfMeasure = (unit: string | null) => {
    if (!unit) return "-";
    
    const unitMap: Record<string, string> = {
      "each": "EA",
      "square-feet": "SF", 
      "linear-feet": "LF",
      "square-yard": "SY",
      "cubic-yard": "CY"
    };
    
    return unitMap[unit] || unit.toUpperCase();
  };

  // Get existing cost code IDs for the modal
  const existingCostCodeIds = budgetItems.map(item => item.cost_code_id);

  // Group budget items by parent group
  const groupedBudgetItems = budgetItems.reduce((acc, item) => {
    const costCode = item.cost_codes as CostCode;
    const group = costCode?.parent_group || 'Uncategorized';
    
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof budgetItems>);

  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBudgetItems[group] || [];
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

  const isGroupSelected = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    return groupItems.length > 0 && groupItems.every(item => selectedItems.has(item.id));
  };

  const isGroupPartiallySelected = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    const selectedInGroup = groupItems.filter(item => selectedItems.has(item.id));
    return selectedInGroup.length > 0 && selectedInGroup.length < groupItems.length;
  };

  const handleEdit = (budgetId: string, currentQuantity: number, currentPrice: number) => {
    setEditingRows(prev => new Set([...prev, budgetId]));
    setEditValues(prev => ({
      ...prev,
      [budgetId]: {
        quantity: currentQuantity.toString(),
        unit_price: currentPrice.toString(),
      }
    }));
  };

  const handleSave = (budgetId: string) => {
    const values = editValues[budgetId];
    if (values) {
      updateBudgetItem.mutate({
        id: budgetId,
        quantity: parseFloat(values.quantity) || 0,
        unit_price: parseFloat(values.unit_price) || 0,
      });
      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(budgetId);
        return newSet;
      });
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[budgetId];
        return newValues;
      });
    }
  };

  const handleCancel = (budgetId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(budgetId);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[budgetId];
      return newValues;
    });
  };

  const handleInputChange = (budgetId: string, field: 'quantity' | 'unit_price', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [budgetId]: {
        ...prev[budgetId],
        [field]: value,
      }
    }));
  };

  const handleEditGroup = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    const newEditingRows = new Set(editingRows);
    const newEditValues = { ...editValues };
    
    // Add all items in the group to editing mode
    groupItems.forEach(item => {
      newEditingRows.add(item.id);
      newEditValues[item.id] = {
        quantity: (item.quantity || 0).toString(),
        unit_price: (item.unit_price || 0).toString(),
      };
    });
    
    setEditingRows(newEditingRows);
    setEditValues(newEditValues);
    
    // Expand the group if it's not already expanded
    if (!expandedGroups.has(group)) {
      setExpandedGroups(prev => new Set([...prev, group]));
    }
    
    toast({
      title: "Edit Mode",
      description: `All items in "${group}" group are now in edit mode`,
    });
  };

  const handleDeleteGroup = (group: string) => {
    setDeletingGroups(prev => new Set([...prev, group]));
    deleteGroupMutation.mutate(group);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Budget</h3>
        <Button onClick={() => setShowAddBudgetModal(true)}>
          Add Budget
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <BudgetTableHeader />
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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
                      isSelected={isGroupSelected(group)}
                      isPartiallySelected={isGroupPartiallySelected(group)}
                      onCheckboxChange={handleGroupCheckboxChange}
                      onEditGroup={handleEditGroup}
                      onDeleteGroup={handleDeleteGroup}
                      isDeleting={deletingGroups.has(group)}
                    />
                    
                    {expandedGroups.has(group) && items.map((item) => (
                      <BudgetTableRow
                        key={item.id}
                        item={item}
                        isEditing={editingRows.has(item.id)}
                        editValue={editValues[item.id]}
                        onEdit={handleEdit}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onInputChange={handleInputChange}
                        formatUnitOfMeasure={formatUnitOfMeasure}
                        isSelected={selectedItems.has(item.id)}
                        onCheckboxChange={handleItemCheckboxChange}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <BudgetTableFooter budgetItems={budgetItems} />

      <AddBudgetModal
        projectId={projectId}
        open={showAddBudgetModal}
        onOpenChange={setShowAddBudgetModal}
        existingCostCodeIds={existingCostCodeIds}
      />
    </div>
  );
}
