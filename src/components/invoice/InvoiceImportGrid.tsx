import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Edit2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProcessedInvoice {
  id: string;
  fileName: string;
  extractedData: {
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    totalAmount?: number;
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      amount: number;
    }>;
    confidence?: number;
  };
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface InvoiceRowData {
  id: string;
  fileName: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  memo?: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  confidence: number;
  isEdited: boolean;
}

interface InvoiceImportGridProps {
  invoices: ProcessedInvoice[];
  onImportComplete: () => void;
}

export function InvoiceImportGrid({ invoices, onImportComplete }: InvoiceImportGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRowData[]>(() => {
    return invoices.map(invoice => ({
      id: invoice.id,
      fileName: invoice.fileName,
      vendorName: invoice.extractedData.vendorName || '',
      invoiceNumber: invoice.extractedData.invoiceNumber || '',
      invoiceDate: invoice.extractedData.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: invoice.extractedData.dueDate || '',
      memo: invoice.extractedData.lineItems?.[0]?.description || '',
      quantity: invoice.extractedData.lineItems?.[0]?.quantity || 1,
      unitCost: invoice.extractedData.lineItems?.[0]?.unitPrice || invoice.extractedData.totalAmount || 0,
      totalAmount: invoice.extractedData.totalAmount || 0,
      confidence: invoice.extractedData.confidence || 0,
      isEdited: false,
    }));
  });

  // Import bills mutation - simplified version for now
  const importBillsMutation = useMutation({
    mutationFn: async (bills: InvoiceRowData[]) => {
      const results = [];
      
      for (const bill of bills) {
        // For now, we'll create a basic bill without vendor lookup
        // This can be enhanced later with proper vendor matching
        
        try {
          // First, we need to get the current user's ID for created_by
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Create a simple bill entry
          const { data: billData, error: billError } = await supabase
            .from('bills')
            .insert({
              vendor_id: '00000000-0000-0000-0000-000000000000', // Placeholder - will need vendor selection
              reference_number: bill.invoiceNumber,
              bill_date: bill.invoiceDate,
              due_date: bill.dueDate || null,
              total_amount: bill.totalAmount,
              status: 'draft' as const,
              notes: `AI Imported from ${bill.fileName} - Vendor: ${bill.vendorName}`,
              created_by: user.id,
            } as any)
            .select()
            .single();

          if (billError) {
            console.error('Bill creation error:', billError);
            throw new Error(`Failed to create bill: ${billError.message}`);
          }

          // Create bill line
          const { error: lineError } = await supabase
            .from('bill_lines')
            .insert({
              bill_id: billData.id,
              line_number: 1,
              memo: bill.memo,
              quantity: bill.quantity,
              unit_cost: bill.unitCost,
              amount: bill.totalAmount,
              line_type: 'expense' as const,
            } as any);

          if (lineError) {
            console.error('Bill line creation error:', lineError);
            throw new Error(`Failed to create bill line: ${lineError.message}`);
          }

          results.push(billData);
        } catch (error) {
          console.error('Error creating bill:', error);
          throw error;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: "Import Successful",
        description: `${results.length} bills imported successfully. Please update vendor information manually.`,
      });
      onImportComplete();
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import bills",
        variant: "destructive",
      });
    },
  });

  const toggleEdit = (rowId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const updateRow = (rowId: string, field: keyof InvoiceRowData, value: any) => {
    setInvoiceRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, [field]: value, isEdited: true }
        : row
    ));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Review & Import Invoice Data</span>
          <div className="flex gap-2">
            <Button
              onClick={() => importBillsMutation.mutate(invoiceRows)}
              disabled={importBillsMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Import {invoiceRows.length} Bills
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              <strong>Note:</strong> This is a basic import that will create bills with placeholder vendor information. 
              You'll need to manually update the vendor details after import.
            </span>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">File / Vendor</TableHead>
                <TableHead className="w-[120px]">Invoice #</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Due Date</TableHead>
                <TableHead className="w-[200px]">Memo</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[100px]">Unit Cost</TableHead>
                <TableHead className="w-[100px]">Total</TableHead>
                <TableHead className="w-[80px]">Confidence</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceRows.map((row) => (
                <TableRow key={row.id} className={row.isEdited ? "bg-blue-50" : ""}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground font-mono">
                        {row.fileName}
                      </div>
                      {editingRows.has(row.id) ? (
                        <Input
                          value={row.vendorName}
                          onChange={(e) => updateRow(row.id, 'vendorName', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Vendor name..."
                        />
                      ) : (
                        <div className="font-medium">
                          {row.vendorName || 'Unknown Vendor'}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        value={row.invoiceNumber}
                        onChange={(e) => updateRow(row.id, 'invoiceNumber', e.target.value)}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <span className="text-sm">{row.invoiceNumber}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        type="date"
                        value={row.invoiceDate}
                        onChange={(e) => updateRow(row.id, 'invoiceDate', e.target.value)}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <span className="text-sm">{row.invoiceDate}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updateRow(row.id, 'dueDate', e.target.value)}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <span className="text-sm">{row.dueDate || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        value={row.memo}
                        onChange={(e) => updateRow(row.id, 'memo', e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Memo..."
                      />
                    ) : (
                      <span className="text-sm">{row.memo}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs w-16"
                      />
                    ) : (
                      <span className="text-sm">{row.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRows.has(row.id) ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={row.unitCost}
                        onChange={(e) => updateRow(row.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs w-20"
                      />
                    ) : (
                      <span className="text-sm">${row.unitCost.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">${row.totalAmount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getConfidenceColor(row.confidence)}>
                      {Math.round(row.confidence * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEdit(row.id)}
                      className="h-8 w-8 p-0"
                    >
                      {editingRows.has(row.id) ? (
                        <Save className="h-3 w-3" />
                      ) : (
                        <Edit2 className="h-3 w-3" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}