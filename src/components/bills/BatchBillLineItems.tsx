import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";

interface LineItem {
  line_number: number;
  line_type: string;
  account_id?: string;
  account_name?: string;
  cost_code_id?: string;
  cost_code_name?: string;
  project_id?: string;
  project_name?: string;
  quantity?: number;
  unit_cost?: number;
  amount: number;
  memo?: string;
  description?: string;
}

interface BatchBillLineItemsProps {
  lines: LineItem[];
  onLinesChange: (lines: LineItem[]) => void;
}

export function BatchBillLineItems({ lines, onLinesChange }: BatchBillLineItemsProps) {
  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate amount if quantity or unit_cost changes
    if (field === 'quantity' || field === 'unit_cost') {
      const qty = field === 'quantity' ? value : updated[index].quantity || 0;
      const cost = field === 'unit_cost' ? value : updated[index].unit_cost || 0;
      updated[index].amount = Number(qty) * Number(cost);
    }
    
    onLinesChange(updated);
  };

  const addLine = () => {
    const newLine: LineItem = {
      line_number: lines.length + 1,
      line_type: 'expense',
      amount: 0,
      quantity: 1,
      unit_cost: 0,
    };
    onLinesChange([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    // Renumber lines
    updated.forEach((line, i) => {
      line.line_number = i + 1;
    });
    onLinesChange(updated);
  };

  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Account/Cost Code</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[80px]">Qty</TableHead>
              <TableHead className="w-[100px]">Unit Cost</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={line.line_type}
                    onValueChange={(value) => updateLine(index, 'line_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="job_cost">Job Cost</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {line.line_type === 'expense' ? (
                    <AccountSearchInput
                      value={line.account_id || ''}
                      onChange={(accountId) => {
                        updateLine(index, 'account_id', accountId);
                      }}
                      placeholder="Select account"
                    />
                  ) : (
                    <CostCodeSearchInput
                      value={line.cost_code_name || ''}
                      onChange={(value) => {
                        updateLine(index, 'cost_code_name', value);
                      }}
                      onCostCodeSelect={(costCode) => {
                        updateLine(index, 'cost_code_id', costCode.id);
                        updateLine(index, 'cost_code_name', `${costCode.code} - ${costCode.name}`);
                      }}
                      placeholder="Select cost code"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <JobSearchInput
                    value={line.project_id || ''}
                    onChange={(projectId) => {
                      updateLine(index, 'project_id', projectId);
                    }}
                    placeholder="Select project"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={line.unit_cost || ''}
                    onChange={(e) => updateLine(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={line.amount || ''}
                    onChange={(e) => updateLine(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={line.memo || line.description || ''}
                    onChange={(e) => updateLine(index, 'memo', e.target.value)}
                    placeholder="Memo"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <Button onClick={addLine} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>
        <div className="text-right">
          <div className="text-sm font-medium">
            Total: ${total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
