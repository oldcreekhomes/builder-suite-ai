import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceImportGrid } from "@/components/invoice/InvoiceImportGrid";

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

export default function ImportBills() {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024, // 20MB limit
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: "File Upload Error",
          description: "Some files were rejected. Please ensure files are PDFs under 20MB.",
          variant: "destructive",
        });
      }
      
      setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processInvoices = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload PDF invoices first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    const newProcessedInvoices: ProcessedInvoice[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const invoiceId = `inv-${Date.now()}-${i}`;
      
      // Add invoice to processing list
      const processingInvoice: ProcessedInvoice = {
        id: invoiceId,
        fileName: file.name,
        extractedData: {},
        status: 'processing'
      };
      
      newProcessedInvoices.push(processingInvoice);
      setProcessedInvoices([...newProcessedInvoices]);

      try {
        // Convert PDF to base64
        const base64Data = await fileToBase64(file);
        
        // Call AI processing edge function
        const { data, error } = await supabase.functions.invoke('process-invoice-pdf', {
          body: {
            fileName: file.name,
            fileData: base64Data,
            mimeType: file.type
          }
        });

        if (error) throw error;

        // Update processed invoice with extracted data
        processingInvoice.extractedData = data.extractedData || {};
        processingInvoice.status = 'completed';
        
      } catch (error) {
        console.error('Error processing invoice:', error);
        processingInvoice.status = 'error';
        processingInvoice.error = error instanceof Error ? error.message : 'Processing failed';
      }

      // Update progress
      setProcessingProgress(((i + 1) / uploadedFiles.length) * 100);
      setProcessedInvoices([...newProcessedInvoices]);
    }

    setIsProcessing(false);
    
    const completedCount = newProcessedInvoices.filter(inv => inv.status === 'completed').length;
    const errorCount = newProcessedInvoices.filter(inv => inv.status === 'error').length;
    
    toast({
      title: "Processing Complete",
      description: `${completedCount} invoices processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Bills</h1>
          <p className="text-muted-foreground">
            Upload PDF invoices and let AI extract the data automatically
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF Invoices
          </CardTitle>
          <CardDescription>
            Drag and drop PDF files or click to browse. Maximum file size: 20MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Upload PDF invoices'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF files up to 20MB each
            </p>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">Uploaded Files ({uploadedFiles.length})</h3>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isProcessing}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={processInvoices}
              disabled={uploadedFiles.length === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Process Invoices
                </>
              )}
            </Button>
            
            {uploadedFiles.length > 0 && !isProcessing && (
              <Button
                variant="outline"
                onClick={() => setUploadedFiles([])}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Processing invoices...</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {processedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Review and edit the extracted invoice data before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {processedInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                  {invoice.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {invoice.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {invoice.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <span className="text-sm">{invoice.fileName}</span>
                  {invoice.status === 'error' && (
                    <span className="text-xs text-red-600">- {invoice.error}</span>
                  )}
                </div>
              ))}
            </div>

            {processedInvoices.some(inv => inv.status === 'error') && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some invoices failed to process. You can try uploading them again or process them manually.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Data Grid */}
      {processedInvoices.filter(inv => inv.status === 'completed').length > 0 && (
        <InvoiceImportGrid 
          invoices={processedInvoices.filter(inv => inv.status === 'completed')}
          onImportComplete={() => {
            setProcessedInvoices([]);
            setUploadedFiles([]);
            toast({
              title: "Import Complete",
              description: "Invoices have been successfully imported as bills.",
            });
          }}
        />
      )}
    </div>
  );
}