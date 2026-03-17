import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

// Known sub-code mappings (Excel sub-codes → system cost codes)
const KNOWN_MAPPINGS: Record<string, string> = {
  '4010.1': '4010',
  '4010.2': '4040',
  '4010.3': '4015',
  '4010.4': '4020',
  '4010.5': '4025',
  '4010.6': '4030',
};

// Group header codes to skip
const GROUP_HEADERS = new Set(['1000', '2000', '3000', '4000']);

const GROUP_LABELS: Record<string, string> = {
  '1000': 'Land Acquisition Costs',
  '2000': 'Soft Costs',
  '3000': 'Site Development Costs',
  '4000': 'Homebuilding Costs',
};

const getParentGroup = (code: string): string => {
  const base = parseInt(code);
  return String(Math.floor(base / 1000) * 1000);
};

interface ParsedItem {
  excelCode: string;
  description: string;
  amount: number;
  matchedCostCodeId: string | null;
  matchedCostCodeLabel: string;
  matchStatus: 'matched' | 'mapped' | 'unmatched';
  included: boolean;
}

interface CostCodeOption {
  id: string;
  code: string;
  name: string;
}

interface BudgetExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedLotId: string | null;
  existingCostCodeIds: string[];
}

export function BudgetExcelImportDialog({
  open,
  onOpenChange,
  projectId,
  selectedLotId,
  existingCostCodeIds,
}: BudgetExcelImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch user's cost codes
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost_codes_for_import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, parent_group')
        .order('code');
      if (error) throw error;
      return data as CostCodeOption[];
    },
    enabled: open,
  });

  const costCodesByCode = useMemo(() => {
    const map: Record<string, CostCodeOption> = {};
    costCodes.forEach(cc => { map[cc.code] = cc; });
    return map;
  }, [costCodes]);

  const existingSet = useMemo(() => new Set(existingCostCodeIds), [existingCostCodeIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleParse = async () => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Try header-based detection first
      let codeCol = -1;
      let descCol = -1;
      let amountCol = -1;
      let headerRowIdx = -1;

      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim().toLowerCase();
          if (cell === 'code' || cell === 'cost code') codeCol = j;
          if (cell === 'description' || cell === 'name' || cell === 'cost code description') descCol = j;
          if (cell.includes('act') && cell.includes('cost')) amountCol = j;
          if (cell === 'budget' && amountCol === -1) amountCol = j;
        }
        if (codeCol >= 0 && amountCol >= 0) {
          headerRowIdx = i;
          break;
        }
      }

      const items: ParsedItem[] = [];
      const codePattern = /^(\d+(?:\.\d+)?)\s+(.+)$/;
      const useHeaderMode = codeCol >= 0 && amountCol >= 0;

      for (let i = (useHeaderMode && headerRowIdx >= 0 ? headerRowIdx + 1 : 0); i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        let rawCode = '';
        let desc = '';
        let amount = 0;

        if (useHeaderMode) {
          // Standard header-based parsing
          if (!row[codeCol]) continue;
          rawCode = String(row[codeCol]).trim();
          if (!/^\d+(\.\d+)?$/.test(rawCode)) continue;
          desc = String(row[descCol >= 0 ? descCol : codeCol + 1] || '').trim();
          amount = parseFloat(String(row[amountCol] || '0').replace(/[$,]/g, '')) || 0;
        } else {
          // Indented layout: scan columns for "CODE Description" pattern
          let matched = false;
          for (let j = 0; j < row.length; j++) {
            const cellVal = row[j];
            if (cellVal == null) continue;
            const cellStr = String(cellVal).trim();
            const m = cellStr.match(codePattern);
            if (m) {
              rawCode = m[1];
              desc = m[2];
              // Find amount: rightmost numeric value in the row after this column
              for (let k = row.length - 1; k > j; k--) {
                if (row[k] != null && typeof row[k] === 'number') {
                  amount = row[k];
                  break;
                }
                if (row[k] != null) {
                  const parsed = parseFloat(String(row[k]).replace(/[$,]/g, ''));
                  if (!isNaN(parsed)) {
                    amount = parsed;
                    break;
                  }
                }
              }
              matched = true;
              break;
            }
          }
          if (!matched) continue;
        }

        // Skip group headers
        if (GROUP_HEADERS.has(rawCode)) continue;
        // Skip total/summary rows
        if (desc.toLowerCase().includes('total') || desc.toLowerCase().includes('grand total')) continue;

        // Try matching
        let matchedId: string | null = null;
        let matchedLabel = '';
        let status: ParsedItem['matchStatus'] = 'unmatched';

        // Check known mappings first
        const mappedCode = KNOWN_MAPPINGS[rawCode];
        if (mappedCode && costCodesByCode[mappedCode]) {
          const cc = costCodesByCode[mappedCode];
          matchedId = cc.id;
          matchedLabel = `${cc.code} - ${cc.name}`;
          status = 'mapped';
        } else if (costCodesByCode[rawCode]) {
          const cc = costCodesByCode[rawCode];
          matchedId = cc.id;
          matchedLabel = `${cc.code} - ${cc.name}`;
          status = 'matched';
        }

        items.push({
          excelCode: rawCode,
          description: desc,
          amount,
          matchedCostCodeId: matchedId,
          matchedCostCodeLabel: matchedLabel,
          matchStatus: status,
          included: matchedId !== null,
        });
      }

      setParsedItems(items);
      setStep('review');
    } catch (err) {
      console.error('Parse error:', err);
      toast({ title: 'Error', description: 'Failed to parse Excel file.', variant: 'destructive' });
    }
  };

  const handleMapChange = (index: number, costCodeId: string) => {
    setParsedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const cc = costCodes.find(c => c.id === costCodeId);
      return {
        ...item,
        matchedCostCodeId: costCodeId,
        matchedCostCodeLabel: cc ? `${cc.code} - ${cc.name}` : '',
        matchStatus: cc ? 'mapped' : 'unmatched',
        included: !!cc,
      };
    }));
  };

  const handleToggleInclude = (index: number) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, included: !item.included } : item
    ));
  };

  const importableItems = useMemo(() =>
    parsedItems.filter(item =>
      item.included && item.matchedCostCodeId && !existingSet.has(item.matchedCostCodeId)
    ), [parsedItems, existingSet]);

  const duplicateItems = useMemo(() =>
    parsedItems.filter(item =>
      item.included && item.matchedCostCodeId && existingSet.has(item.matchedCostCodeId)
    ), [parsedItems, existingSet]);

  const handleImport = async () => {
    if (importableItems.length === 0) return;
    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine owner_id (handle employee scenario)
      const { data: userData } = await supabase
        .from('users')
        .select('id, role, home_builder_id')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'employee' ? userData.home_builder_id : user.id;

      const inserts = importableItems.map(item => ({
        project_id: projectId,
        cost_code_id: item.matchedCostCodeId!,
        quantity: 1,
        unit_price: item.amount,
        budget_source: 'manual',
        ...(selectedLotId ? { lot_id: selectedLotId } : {}),
      }));

      const { error } = await supabase.from('project_budgets').insert(inserts);
      if (error) throw error;

      toast({
        title: 'Import successful',
        description: `Imported ${inserts.length} budget items.`,
      });

      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      handleClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParsedItems([]);
    setSearchFilter('');
    onOpenChange(false);
  };

  const directMatchCount = parsedItems.filter(i => i.matchStatus === 'matched').length;
  const mappedCount = parsedItems.filter(i => i.matchStatus === 'mapped').length;
  const unmatchedCount = parsedItems.filter(i => i.matchStatus === 'unmatched').length;

  const filteredItems = useMemo(() => {
    if (!searchFilter) return parsedItems;
    const q = searchFilter.toLowerCase();
    return parsedItems.filter(i =>
      i.excelCode.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.matchedCostCodeLabel.toLowerCase().includes(q)
    );
  }, [parsedItems, searchFilter]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import Budget from Excel' : 'Review & Map Cost Codes'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget-excel-file">Excel File</Label>
              <Input
                id="budget-excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Upload an Excel budget report with cost code numbers and amounts. The file should have columns for Code, Description, and Actual Cost.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!file}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Parse & Match
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && (
          <>
            {/* Summary bar */}
            <div className="flex flex-col gap-1 border-b pb-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {directMatchCount} matched
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <CheckCircle2 className="h-4 w-4" /> {mappedCount} needs review
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> {unmatchedCount} unmatched
                </span>
                <span className="text-muted-foreground">
                  {importableItems.length} to import
                </span>
                {duplicateItems.length > 0 && (
                  <span className="text-orange-500 text-xs">
                    {duplicateItems.length} already in budget (skipped)
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <Input
              placeholder="Search by code or description..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="mb-2"
            />

            {/* Table */}
              <Table containerClassName="flex-1 overflow-auto rounded-md border">
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Excel Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Mapped Cost Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const groups: { group: string; items: typeof filteredItems }[] = [];
                    filteredItems.forEach(item => {
                      const group = getParentGroup(item.excelCode);
                      const existing = groups.find(g => g.group === group);
                      if (existing) existing.items.push(item);
                      else groups.push({ group, items: [item] });
                    });

                    const rows: React.ReactNode[] = [];
                    let grandTotal = 0;

                    groups.forEach(({ group, items }) => {
                      const groupTotal = items.reduce((sum, i) => sum + i.amount, 0);
                      grandTotal += groupTotal;

                      items.forEach(item => {
                        const realIdx = parsedItems.indexOf(item);
                        const isDuplicate = item.matchedCostCodeId && existingSet.has(item.matchedCostCodeId);
                        rows.push(
                          <TableRow key={realIdx} className={isDuplicate ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  className="h-4 w-4"
                                  checked={item.included && !isDuplicate}
                                  disabled={!!isDuplicate || !item.matchedCostCodeId}
                                  onCheckedChange={() => handleToggleInclude(realIdx)}
                                />
                              </div>
                            </TableCell>
                            <TableCell>{item.excelCode}</TableCell>
                            <TableCell className="truncate" title={item.description}>
                              {item.description}
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {isDuplicate ? (
                                <span className="text-orange-500 font-medium">In Budget</span>
                              ) : item.matchStatus === 'matched' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              ) : item.matchStatus === 'mapped' ? (
                                <CheckCircle2 className="h-4 w-4 text-amber-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive mx-auto" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.matchedCostCodeId || ''}
                                onValueChange={(val) => handleMapChange(realIdx, val)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select cost code..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {costCodes.map(cc => (
                                    <SelectItem key={cc.id} value={cc.id}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      });

                      rows.push(
                        <TableRow key={`subtotal-${group}`} className="bg-muted/50 font-semibold">
                          <TableCell colSpan={3}>
                            Subtotal: {GROUP_LABELS[group] || `Group ${group}`}
                          </TableCell>
                          <TableCell className="text-right">
                            ${groupTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      );
                    });

                    rows.push(
                      <TableRow key="grand-total" className="bg-muted font-bold border-t-2">
                        <TableCell colSpan={3}>Grand Total</TableCell>
                        <TableCell className="text-right">
                          ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    );

                    return rows;
                  })()}
                </TableBody>
              </Table>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => { setStep('upload'); setParsedItems([]); }}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importableItems.length === 0 || isImporting}>
                {isImporting ? 'Importing...' : `Import ${importableItems.length} Items`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
