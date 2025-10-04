import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const addJobCostLine = () => {
    const newLine: LineItem = {
      line_number: lines.length + 1,
      line_type: 'job_cost',
      amount: 0,
      quantity: 1,
      unit_cost: 0,
    };
    onLinesChange([...lines, newLine]);
  };

  const addExpenseLine = () => {
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

  const jobCostLines = lines.filter(line => line.line_type === 'job_cost');
  const expenseLines = lines.filter(line => line.line_type === 'expense');

  const jobCostTotal = jobCostLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const expenseTotal = expenseLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="job-cost" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
        </TabsList>
        
        <TabsContent value="job-cost" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={addJobCostLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
              <div className="col-span-2">Cost Code</div>
              <div className="col-span-2">Project</div>
              <div className="col-span-4">Memo</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-1">Cost</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {jobCostLines.map((line, index) => {
              const globalIndex = lines.indexOf(line);
              return (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 border-t">
                  <div className="col-span-2">
                    <CostCodeSearchInput 
                      value={line.cost_code_name || ''}
                      onChange={(value) => updateLine(globalIndex, 'cost_code_name', value)}
                      onCostCodeSelect={(costCode) => {
                        updateLine(globalIndex, 'cost_code_id', costCode.id);
                        updateLine(globalIndex, 'cost_code_name', `${costCode.code} - ${costCode.name}`);
                      }}
                      placeholder="Cost Code"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <JobSearchInput 
                      value={line.project_id || ""}
                      onChange={(projectId) => updateLine(globalIndex, 'project_id', projectId)}
                      placeholder="Select project"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input 
                      placeholder="Job cost memo"
                      value={line.memo || line.description || ''}
                      onChange={(e) => updateLine(globalIndex, 'memo', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="1"
                      value={line.quantity || ''}
                      onChange={(e) => updateLine(globalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.unit_cost || ''}
                        onChange={(e) => updateLine(globalIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-sm font-medium">
                      ${((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center items-center">
                    <Button
                      onClick={() => removeLine(globalIndex)}
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-muted border-t">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8 font-medium">Total:</div>
                <div className="col-span-1 font-medium">
                  ${jobCostTotal.toFixed(2)}
                </div>
                <div className="col-span-3"></div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="expense" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={addExpenseLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
              <div className="col-span-2">Account</div>
              <div className="col-span-2">Project</div>
              <div className="col-span-4">Memo</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-1">Cost</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {expenseLines.map((line, index) => {
              const globalIndex = lines.indexOf(line);
              return (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 border-t">
                  <div className="col-span-2">
                    <AccountSearchInput
                      value={line.account_id || ""}
                      onChange={(accountId) => updateLine(globalIndex, 'account_id', accountId)}
                      placeholder="Select account"
                      accountType="expense"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <JobSearchInput 
                      value={line.project_id || ""}
                      onChange={(projectId) => updateLine(globalIndex, 'project_id', projectId)}
                      placeholder="Select project"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input 
                      placeholder="Expense memo"
                      value={line.memo || line.description || ''}
                      onChange={(e) => updateLine(globalIndex, 'memo', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="1"
                      value={line.quantity || ''}
                      onChange={(e) => updateLine(globalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.unit_cost || ''}
                        onChange={(e) => updateLine(globalIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-sm font-medium">
                      ${((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center items-center">
                    <Button
                      onClick={() => removeLine(globalIndex)}
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-muted border-t">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8 font-medium">Total:</div>
                <div className="col-span-1 font-medium">
                  ${expenseTotal.toFixed(2)}
                </div>
                <div className="col-span-3"></div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
