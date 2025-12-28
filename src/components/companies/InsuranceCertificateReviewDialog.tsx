import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, FileText, Building2 } from "lucide-react";
import { ExtractedInsuranceData, ExtractedCoverage } from "./InsuranceCertificateUpload";

interface InsuranceCertificateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedInsuranceData | null;
  onConfirm: (data: ExtractedInsuranceData) => void;
}

const COVERAGE_LABELS: Record<string, string> = {
  commercial_general_liability: "Commercial General Liability",
  automobile_liability: "Automobile Liability",
  umbrella_liability: "Umbrella Liability",
  workers_compensation: "Workers Compensation",
};

export function InsuranceCertificateReviewDialog({
  open,
  onOpenChange,
  extractedData,
  onConfirm,
}: InsuranceCertificateReviewDialogProps) {
  const [editedData, setEditedData] = useState<ExtractedInsuranceData | null>(null);

  useEffect(() => {
    if (extractedData) {
      setEditedData(JSON.parse(JSON.stringify(extractedData)));
    }
  }, [extractedData]);

  if (!editedData) return null;

  const handleCoverageChange = (
    index: number,
    field: keyof ExtractedCoverage,
    value: string | number | null
  ) => {
    setEditedData(prev => {
      if (!prev) return prev;
      const newCoverages = [...prev.coverages];
      newCoverages[index] = {
        ...newCoverages[index],
        [field]: value,
      };
      return { ...prev, coverages: newCoverages };
    });
  };

  const handleConfirm = () => {
    if (editedData) {
      onConfirm(editedData);
      onOpenChange(false);
    }
  };

  const coverageCount = editedData.coverages?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Extracted Insurance Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Certificate Info - Compact */}
          {editedData.insured && (
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md border">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{editedData.insured.name || 'Not detected'}</span>
                {editedData.insured.address && (
                  <span className="text-xs text-muted-foreground">• {editedData.insured.address}</span>
                )}
              </div>
              <Badge variant="secondary" className="ml-auto">{coverageCount} coverages</Badge>
            </div>
          )}

          {/* Coverages Table */}
          {coverageCount > 0 ? (
            <div className="border rounded-md overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Coverage Type</span>
                <span>Policy Number</span>
                <span>Carrier Name</span>
                <span>Effective</span>
                <span>Expiration</span>
              </div>
              {/* Data rows */}
              <div>
                {editedData.coverages.map((coverage, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <span className="truncate font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {COVERAGE_LABELS[coverage.type] || coverage.type}
                    </span>
                    <Input
                      value={coverage.policy_number || ''}
                      onChange={(e) => handleCoverageChange(index, 'policy_number', e.target.value)}
                      placeholder="Policy #"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={coverage.insurer_name || ''}
                      onChange={(e) => handleCoverageChange(index, 'insurer_name', e.target.value)}
                      placeholder="Carrier"
                      className="h-7 text-xs"
                    />
                    <Input
                      type="date"
                      value={coverage.effective_date || ''}
                      onChange={(e) => handleCoverageChange(index, 'effective_date', e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="date"
                      value={coverage.expiration_date || ''}
                      onChange={(e) => handleCoverageChange(index, 'expiration_date', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No coverages were detected in the certificate.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={coverageCount === 0}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm & Save Insurance Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
