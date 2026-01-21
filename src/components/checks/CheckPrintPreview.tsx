import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, Settings, FileText, Loader2 } from 'lucide-react';
import { CheckPrintDocument, CheckPrintTestDocument, CheckData, CompanyInfo, BankInfo } from './CheckPrintDocument';
import { CheckPrintSettings } from '@/hooks/useCheckPrintSettings';

interface CheckPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checks: CheckData[];
  settings?: Partial<CheckPrintSettings>;
  companyInfo: CompanyInfo;
  bankInfo: BankInfo;
  onOpenSettings?: () => void;
}

export function CheckPrintPreview({
  open,
  onOpenChange,
  checks,
  settings,
  companyInfo,
  bankInfo,
  onOpenSettings,
}: CheckPrintPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generatePdf = async (isTest: boolean = false) => {
    setIsGenerating(true);
    try {
      const doc = isTest 
        ? <CheckPrintTestDocument settings={settings} />
        : <CheckPrintDocument checks={checks} settings={settings} companyInfo={companyInfo} bankInfo={bankInfo} />;
      
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return { blob, url };
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const result = await generatePdf(false);
    if (result) {
      const printWindow = window.open(result.url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handlePrintTest = async () => {
    const result = await generatePdf(true);
    if (result) {
      const printWindow = window.open(result.url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleDownload = async () => {
    const result = await generatePdf(false);
    if (result) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = `check-${checks[0]?.check_number || 'print'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = async () => {
    await generatePdf(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Check{checks.length > 1 ? 's' : ''} ({checks.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {/* Check Details Summary */}
          <div className="space-y-2 mb-4">
            {checks.map((check, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <span className="font-medium">Check #{check.check_number}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span>{check.pay_to}</span>
                </div>
                <span className="font-mono font-bold">
                  ${check.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* PDF Preview */}
          {pdfUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe 
                src={pdfUrl} 
                className="w-full h-[500px]"
                title="Check Preview"
              />
            </div>
          )}

          {!pdfUrl && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Click "Preview" to generate the check PDF</p>
              <p className="text-sm mt-1">You can then print or download it</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <div className="flex gap-2 mr-auto">
            {onOpenSettings && (
              <Button variant="outline" onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
            <Button variant="outline" onClick={handlePrintTest} disabled={isGenerating}>
              Print Test Page
            </Button>
          </div>

          <Button variant="outline" onClick={handlePreview} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>

          <Button variant="outline" onClick={handleDownload} disabled={isGenerating || !pdfUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <Button onClick={handlePrint} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
