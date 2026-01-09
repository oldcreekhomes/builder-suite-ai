import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';
import { FileDown, Loader2 } from 'lucide-react';

export interface ExportPdfOptions {
  includeHistorical: boolean;
  historicalProjectId: string | null;
  includeVariance: boolean;
  varianceAsPercentage: boolean;
}

interface BudgetExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportPdfOptions) => void;
  isExporting: boolean;
}

export function BudgetExportPdfDialog({
  open,
  onOpenChange,
  onExport,
  isExporting,
}: BudgetExportPdfDialogProps) {
  const { data: historicalProjects = [], isLoading: loadingProjects } = useHistoricalProjects();
  
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const [historicalProjectId, setHistoricalProjectId] = useState<string>('');
  const [includeVariance, setIncludeVariance] = useState(false);
  const [varianceAsPercentage, setVarianceAsPercentage] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIncludeHistorical(false);
      setHistoricalProjectId('');
      setIncludeVariance(false);
      setVarianceAsPercentage(false);
    }
  }, [open]);

  // If historical is unchecked, also uncheck variance
  useEffect(() => {
    if (!includeHistorical) {
      setIncludeVariance(false);
      setHistoricalProjectId('');
    }
  }, [includeHistorical]);

  const handleExport = () => {
    onExport({
      includeHistorical,
      historicalProjectId: includeHistorical && historicalProjectId ? historicalProjectId : null,
      includeVariance,
      varianceAsPercentage,
    });
  };

  const canExport = !includeHistorical || (includeHistorical && historicalProjectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Budget PDF</DialogTitle>
          <DialogDescription>
            Choose which columns to include in your PDF export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Include Historical Costs */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-historical"
                checked={includeHistorical}
                onCheckedChange={(checked) => setIncludeHistorical(checked === true)}
              />
              <Label htmlFor="include-historical" className="font-medium cursor-pointer">
                Include Historical Costs
              </Label>
            </div>

            {includeHistorical && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Select Historical Project
                </Label>
                <Select
                  value={historicalProjectId}
                  onValueChange={setHistoricalProjectId}
                  disabled={loadingProjects}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {historicalProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Include Variance */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-variance"
                checked={includeVariance}
                onCheckedChange={(checked) => setIncludeVariance(checked === true)}
                disabled={!includeHistorical}
              />
              <Label 
                htmlFor="include-variance" 
                className={`font-medium cursor-pointer ${!includeHistorical ? 'text-muted-foreground' : ''}`}
              >
                Include Variance
              </Label>
              {!includeHistorical && (
                <span className="text-xs text-muted-foreground">(requires Historical)</span>
              )}
            </div>

            {includeVariance && includeHistorical && (
              <div className="ml-6">
                <RadioGroup
                  value={varianceAsPercentage ? 'percentage' : 'dollar'}
                  onValueChange={(value) => setVarianceAsPercentage(value === 'percentage')}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dollar" id="variance-dollar" />
                    <Label htmlFor="variance-dollar" className="cursor-pointer">
                      Dollar ($)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="variance-percentage" />
                    <Label htmlFor="variance-percentage" className="cursor-pointer">
                      Percentage (%)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !canExport}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
