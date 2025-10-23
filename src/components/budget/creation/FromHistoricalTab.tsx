import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';
import { useHistoricalBudgetImport } from '@/hooks/useHistoricalBudgetImport';

interface FromHistoricalTabProps {
  projectId: string;
  onImportComplete: () => void;
}

export function FromHistoricalTab({ projectId, onImportComplete }: FromHistoricalTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<string>('0');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: historicalProjects = [] } = useHistoricalProjects();
  const { historicalBudgetItems, isLoading, importItems, isImporting } = useHistoricalBudgetImport(
    projectId,
    selectedProjectId
  );

  const handleToggleItem = (itemId: string, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(historicalBudgetItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleImport = () => {
    if (selectedItems.size === 0) return;
    
    importItems(
      { 
        selectedItemIds: Array.from(selectedItems), 
        adjustmentPercentage: parseFloat(adjustmentPercentage) || 0 
      },
      {
        onSuccess: () => {
          onImportComplete();
        }
      }
    );
  };

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  const calculatePreviewTotal = () => {
    const adjustment = parseFloat(adjustmentPercentage) || 0;
    return historicalBudgetItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => {
        const actualAmount = item.actual_amount || 0;
        const adjustedAmount = actualAmount * (1 + adjustment / 100);
        return sum + adjustedAmount;
      }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Historical Project</Label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a project..." />
          </SelectTrigger>
          <SelectContent>
            {historicalProjects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <>
          <div className="space-y-2">
            <Label>Adjustment Percentage (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={adjustmentPercentage}
                onChange={(e) => setAdjustmentPercentage(e.target.value)}
                placeholder="0"
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a positive or negative percentage to adjust all imported costs
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading historical budget items...
            </div>
          ) : historicalBudgetItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget items with actual costs found in this project.
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-12">
                        <Checkbox
                          checked={selectedItems.size === historicalBudgetItems.length}
                          onCheckedChange={handleToggleAll}
                        />
                      </th>
                      <th className="p-2 text-left text-sm font-medium">Cost Code</th>
                      <th className="p-2 text-left text-sm font-medium">Description</th>
                      <th className="p-2 text-right text-sm font-medium">Actual Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalBudgetItems.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-muted/50">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-2 text-sm">{item.cost_codes?.code}</td>
                        <td className="p-2 text-sm">{item.cost_codes?.name}</td>
                        <td className="p-2 text-sm text-right font-medium">
                          {formatCurrency(item.actual_amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedItems.size} items selected
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Budget</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(calculatePreviewTotal())}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
