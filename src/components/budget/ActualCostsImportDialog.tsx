import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ImportResult {
  matched: number;
  unmatched: string[];
  errors: string[];
}

interface ActualCostsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetItems: any[];
  onUpdateActual: (itemId: string, actualAmount: number) => void;
}

export function ActualCostsImportDialog({
  open,
  onOpenChange,
  budgetItems,
  onUpdateActual,
}: ActualCostsImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      { 'Cost Code': '4010', 'Actual Amount': 1500.00 },
      { 'Cost Code': '4020', 'Actual Amount': 2300.00 },
      { 'Cost Code': '4030', 'Actual Amount': 800.00 },
      ...budgetItems.slice(0, 10).map(item => ({
        'Cost Code': item.cost_codes?.code || '',
        'Actual Amount': 0
      }))
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Actual Costs');
    
    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.writeFile(workbook, 'actual_costs_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded to help you format your data.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const result = await processImportData(jsonData);
      setImportResult(result);

      if (result.matched > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.matched} actual costs.`,
        });
      }

      if (result.unmatched.length > 0) {
        toast({
          title: "Some Items Not Matched",
          description: `${result.unmatched.length} cost codes could not be matched.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to process the Excel file. Please check the format.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
    
    // Clear the input
    event.target.value = '';
  };

  const processImportData = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = {
      matched: 0,
      unmatched: [],
      errors: []
    };

    for (const row of data) {
      try {
        // Get cost code and actual amount from row
        const costCode = row['Cost Code'] || row['Code'] || row['cost_code'] || row['code'];
        const actualAmount = row['Actual Amount'] || row['Total'] || row['Amount'] || row['actual_amount'] || row['total'] || row['amount'];

        if (!costCode || actualAmount === undefined || actualAmount === null) {
          continue; // Skip rows without required data
        }

        // Normalize cost code for matching
        const normalizedCode = String(costCode).trim();
        const amount = parseFloat(String(actualAmount));

        if (isNaN(amount)) {
          result.errors.push(`Invalid amount for cost code ${costCode}: ${actualAmount}`);
          continue;
        }

        // Find matching budget item
        const budgetItem = budgetItems.find(item => {
          const itemCode = item.cost_codes?.code?.trim();
          return itemCode === normalizedCode || 
                 // Try matching with leading zeros removed
                 itemCode === normalizedCode.replace(/^0+/, '') ||
                 normalizedCode === itemCode?.replace(/^0+/, '') ||
                 // Try matching with decimal formatting
                 parseFloat(itemCode || '0') === parseFloat(normalizedCode);
        });

        if (budgetItem) {
          onUpdateActual(budgetItem.id, amount);
          result.matched++;
        } else {
          result.unmatched.push(normalizedCode);
        }

      } catch (error) {
        result.errors.push(`Error processing row: ${JSON.stringify(row)}`);
      }
    }

    return result;
  };

  const handleClose = () => {
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Actual Costs</DialogTitle>
          <DialogDescription>
            Upload an Excel file with cost codes and actual amounts to update your budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Required Excel format:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Cost Code</strong>: Must match existing budget cost codes</li>
              <li><strong>Actual Amount</strong>: Total amount spent for that cost code</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium">
                  Choose Excel file to upload
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .xlsx and .xls files
              </p>
            </div>
          </div>

          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Processing file...</p>
            </div>
          )}

          {importResult && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {importResult.matched} items imported successfully
                </span>
              </div>
              
              {importResult.unmatched.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">
                      {importResult.unmatched.length} unmatched cost codes:
                    </span>
                    <div className="text-xs text-muted-foreground mt-1 max-h-20 overflow-y-auto">
                      {importResult.unmatched.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">
                      {importResult.errors.length} errors occurred
                    </span>
                    <div className="text-xs text-muted-foreground mt-1 max-h-20 overflow-y-auto">
                      {importResult.errors.slice(0, 3).join('; ')}
                      {importResult.errors.length > 3 && '...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}