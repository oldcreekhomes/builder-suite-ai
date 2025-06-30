import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddBudgetModal } from './AddBudgetModal';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type ProjectBudget = Tables<'project_budgets'>;

interface BudgetTableProps {
  projectId: string;
}

export function BudgetTable({ projectId }: BudgetTableProps) {
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, { quantity: string; unit_price: string }>>({});
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as CostCode[];
    },
  });

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

  // Create budget item mutation
  const createBudgetItem = useMutation({
    mutationFn: async (costCodeId: string) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          cost_code_id: costCodeId,
          quantity: 0,
          unit_price: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: "Budget item added successfully",
      });
    },
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

  const handleAddCostCode = (costCodeId: string) => {
    createBudgetItem.mutate(costCodeId);
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
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Cost Code</TableHead>
              <TableHead className="font-bold">Name</TableHead>
              <TableHead className="font-bold">Quantity</TableHead>
              <TableHead className="font-bold">Unit</TableHead>
              <TableHead className="font-bold">Price</TableHead>
              <TableHead className="font-bold">Total</TableHead>
              <TableHead className="font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              budgetItems.map((item) => {
                const costCode = item.cost_codes as CostCode;
                const isEditing = editingRows.has(item.id);
                const editValue = editValues[item.id];
                const total = (item.quantity || 0) * (item.unit_price || 0);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{costCode?.code}</TableCell>
                    <TableCell>{costCode?.name}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue?.quantity || ''}
                          onChange={(e) => handleInputChange(item.id, 'quantity', e.target.value)}
                          className="w-20"
                        />
                      ) : (
                        item.quantity || 0
                      )}
                    </TableCell>
                    <TableCell>{formatUnitOfMeasure(costCode?.unit_of_measure)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue?.unit_price || ''}
                          onChange={(e) => handleInputChange(item.id, 'unit_price', e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        `$${(item.unit_price || 0).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(item.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item.id, item.quantity || 0, item.unit_price || 0)}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {budgetItems.length > 0 && (
        <div className="flex justify-end">
          <div className="text-lg font-semibold">
            Total Budget: ${budgetItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0).toFixed(2)}
          </div>
        </div>
      )}

      <AddBudgetModal
        projectId={projectId}
        open={showAddBudgetModal}
        onOpenChange={setShowAddBudgetModal}
        existingCostCodeIds={existingCostCodeIds}
      />
    </div>
  );
}
