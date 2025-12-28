import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Extracted Insurance Data
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Certificate Info */}
            {editedData.insured && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Insured Company</span>
                </div>
                <p className="text-sm">{editedData.insured.name || 'Not detected'}</p>
                {editedData.insured.address && (
                  <p className="text-xs text-muted-foreground mt-1">{editedData.insured.address}</p>
                )}
              </div>
            )}

            {/* Coverages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Insurance Coverages</h3>
                <Badge variant="secondary">{coverageCount} found</Badge>
              </div>

              {editedData.coverages.map((coverage, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">
                        {COVERAGE_LABELS[coverage.type] || coverage.type}
                      </span>
                    </div>
                    {coverage.insurer_name && (
                      <span className="text-xs text-muted-foreground">
                        Insurer: {coverage.insurer_name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Policy Number</Label>
                      <Input
                        value={coverage.policy_number || ''}
                        onChange={(e) => handleCoverageChange(index, 'policy_number', e.target.value)}
                        placeholder="Enter policy number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Carrier Name</Label>
                      <Input
                        value={coverage.insurer_name || ''}
                        onChange={(e) => handleCoverageChange(index, 'insurer_name', e.target.value)}
                        placeholder="Enter carrier name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Effective Date</Label>
                      <Input
                        type="date"
                        value={coverage.effective_date || ''}
                        onChange={(e) => handleCoverageChange(index, 'effective_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expiration Date</Label>
                      <Input
                        type="date"
                        value={coverage.expiration_date || ''}
                        onChange={(e) => handleCoverageChange(index, 'expiration_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {coverageCount === 0 && (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No coverages were detected in the certificate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

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
