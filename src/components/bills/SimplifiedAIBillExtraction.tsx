import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as pdfjsLib from 'pdfjs-dist';

// Use a working CDN URL for the worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.js`;

interface PendingUpload {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  content_type?: string;
  status: 'pending' | 'processing' | 'extracted' | 'error';
  extracted_data: any;
  error_message?: string;
}

interface SimplifiedAIBillExtractionProps {
  onDataExtracted: (data: any) => void;
  onSwitchToManual: () => void;
}

export default function SimplifiedAIBillExtraction({ onDataExtracted, onSwitchToManual }: SimplifiedAIBillExtractionProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [processingStats, setProcessingStats] = useState({ processing: 0, total: 0 });

  const loadPendingUploads = async () => {
    const { data, error } = await supabase
      .from('pending_bill_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending uploads:', error);
      return;
    }

    setPendingUploads((data || []) as PendingUpload[]);
  };

  useEffect(() => {
    loadPendingUploads();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const files = inputEl.files;
    if (!files || files.length === 0) {
      // Reset value so selecting the same file again will re-trigger onChange
      inputEl.value = "";
      return;
    }

    setUploading(true);
    const fileCount = files.length;
    setProcessingStats({ processing: 0, total: fileCount });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log('[Upload] Starting upload for', files.length, 'file(s), user:', user.id);
      const uploadedIds: string[] = [];

      for (const file of Array.from(files)) {
        // Generate path with user ID to match RLS policies
        const filePath = `pending/${user.id}/${crypto.randomUUID()}-${file.name}`;
        console.log('[Upload] Uploading file to path:', filePath);

        // Add optimistic UI entry
        const optimisticId = crypto.randomUUID();
        setPendingUploads(prev => [...prev, {
          id: optimisticId,
          file_name: file.name,
          file_size: file.size,
          file_path: filePath,
          status: 'pending',
          extracted_data: null
        }]);

        const { error: uploadError } = await supabase.storage
          .from('bill-attachments')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || 'application/pdf'
          });

        if (uploadError) {
          console.error('[Upload] Storage upload failed:', uploadError);
          setPendingUploads(prev => prev.filter(u => u.id !== optimisticId));
          toast({
            title: "Storage upload failed",
            description: `${uploadError.message} (Code: ${uploadError.name || 'unknown'})`,
            variant: "destructive"
          });
          throw uploadError;
        }

        console.log('[Upload] File uploaded to storage, inserting DB record...');
        const { data: uploadData, error: insertError } = await supabase
          .from('pending_bill_uploads')
          .insert({
            owner_id: user.id,
            uploaded_by: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || 'application/pdf',
            status: 'pending'
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Upload] DB insert failed:', insertError);
          // Remove optimistic entry
          setPendingUploads(prev => prev.filter(u => u.id !== optimisticId));
          // Clean up storage
          await supabase.storage.from('bill-attachments').remove([filePath]);
          toast({
            title: "Database insert failed",
            description: insertError.message || 'RLS policy may be blocking this insert',
            variant: "destructive"
          });
          throw insertError;
        }

        // Replace optimistic entry with real one
        setPendingUploads(prev => prev.map(u => u.id === optimisticId ? (uploadData as PendingUpload) : u));
        
        console.log('[Upload] DB record created:', uploadData.id);
        if (uploadData) uploadedIds.push(uploadData.id);
      }

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded. Starting extraction...`
      });

      await loadPendingUploads();

      // Auto-trigger extraction for each uploaded file
      for (const uploadId of uploadedIds) {
        const upload = await supabase
          .from('pending_bill_uploads')
          .select('*')
          .eq('id', uploadId)
          .single();
        
        if (upload.data) {
          handleExtract(upload.data as PendingUpload);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Allow selecting the same file(s) again to retrigger onChange
      inputEl.value = "";
    }
  };

  const extractPdfText = async (filePath: string): Promise<string | null> => {
    try {
      const { data: fileData, error } = await supabase.storage
        .from('bill-attachments')
        .download(filePath);
      
      if (error || !fileData) {
        console.error('Failed to download PDF for text extraction:', error);
        return null;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      const pageLimit = Math.min(pdf.numPages, 5);
      let fullText = '';
      
      for (let i = 1; i <= pageLimit; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += `\n\n--- Page ${i} ---\n${pageText}`;
      }
      
      const MAX_CHARS = 50000;
      return fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) : fullText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return null;
    }
  };

  const handleExtract = async (upload: PendingUpload) => {
    try {
      setProcessingStats(prev => ({ ...prev, processing: prev.processing + 1 }));
      
      setPendingUploads(prev => 
        prev.map(u => u.id === upload.id ? { ...u, status: 'processing' as const } : u)
      );

      // Extract PDF text on client side if it's a PDF
      let pdfText: string | null = null;
      const isPdf = upload.content_type?.includes('pdf') || upload.file_path.endsWith('.pdf');
      if (isPdf) {
        console.log('Extracting PDF text on client side...');
        pdfText = await extractPdfText(upload.file_path);
        if (pdfText) {
          console.log('PDF text extracted successfully, length:', pdfText.length);
        } else {
          const msg = 'Could not read PDF in the browser. Please re-save the PDF or upload a clearer copy (or an image).';
          await supabase
            .from('pending_bill_uploads')
            .update({ status: 'error', error_message: msg })
            .eq('id', upload.id);
          setPendingUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error' as const, error_message: msg } : u));
          setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
          toast({ title: 'Extraction failed', description: msg, variant: 'destructive' });
          return;
        }
      }

      const { error } = await supabase.functions.invoke('extract-bill-data', {
        body: { 
          pendingUploadId: upload.id,
          pdfText: pdfText || undefined
        }
      });

      if (error) throw error;

      const pollInterval = setInterval(async () => {
        const { data, error } = await supabase
          .from('pending_bill_uploads')
          .select('*')
          .eq('id', upload.id)
          .single();

        if (error || !data) {
          clearInterval(pollInterval);
          setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
          return;
        }

        if (data.status === 'extracted') {
          clearInterval(pollInterval);
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? (data as PendingUpload) : u)
          );
          setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
          toast({
            title: "Extraction complete",
            description: "Click 'Use This Data' to populate the bill form"
          });
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? (data as PendingUpload) : u)
          );
          setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
          toast({
            title: "Extraction failed",
            description: data.error_message || "Unknown error",
            variant: "destructive"
          });
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
      }, 60000);

    } catch (error) {
      console.error('Extract error:', error);
      setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
      
      // Extract more detailed error message
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for specific error types
      if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota') || errorMessage.includes('429')) {
        errorMessage = "OpenAI API quota exceeded. Add credits at platform.openai.com/settings/organization/billing";
      } else if (errorMessage.includes('API key') || errorMessage.includes('OPENAI_API_KEY')) {
        errorMessage = "OpenAI API key is not configured or invalid";
      }
      
      // Update the database with the error
      await supabase
        .from('pending_bill_uploads')
        .update({ 
          status: 'error',
          error_message: errorMessage
        })
        .eq('id', upload.id);
      
      setPendingUploads(prev => 
        prev.map(u => u.id === upload.id ? { ...u, status: 'error' as const, error_message: errorMessage } : u)
      );
      
      toast({
        title: "Extraction failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleUseData = (upload: PendingUpload) => {
    if (upload.extracted_data) {
      onDataExtracted(upload.extracted_data);
      onSwitchToManual();
      toast({
        title: "Data loaded",
        description: "Bill data has been populated. Review and edit as needed."
      });
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    const upload = pendingUploads.find(u => u.id === uploadId);
    if (!upload) return;

    try {
      await supabase.storage
        .from('bill-attachments')
        .remove([upload.file_path]);

      await supabase
        .from('pending_bill_uploads')
        .delete()
        .eq('id', uploadId);

      setPendingUploads(prev => prev.filter(u => u.id !== uploadId));

      toast({
        title: "Upload deleted",
        description: "The pending upload has been removed"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Uploading" },
      processing: { variant: "default" as const, label: "Processing", showSpinner: true },
      extracted: { variant: "default" as const, label: "Extracted" },
      error: { variant: "destructive" as const, label: "Error" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <Badge variant={config.variant}>
        {'showSpinner' in config && config.showSpinner && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">AI Bill Extraction</h3>
              {processingStats.processing > 0 && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing {processingStats.processing} of {processingStats.total}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Upload bill PDFs and let AI extract the data automatically
            </p>
          </div>
          <div>
            <input
              type="file"
              id="pdf-upload"
              className="hidden"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label htmlFor="pdf-upload">
              <Button disabled={uploading} asChild>
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload PDFs
                </span>
              </Button>
            </label>
          </div>
        </div>

        {pendingUploads.length > 0 ? (
          <div className="space-y-2">
            {pendingUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{upload.file_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(upload.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  {getStatusBadge(upload.status)}
                </div>
                <div className="flex items-center gap-2">
                  {upload.status === 'extracted' && (
                    <Button
                      size="sm"
                      onClick={() => handleUseData(upload)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Use This Data
                    </Button>
                  )}
                  {upload.status === 'error' && upload.error_message && (
                    <span className="text-sm text-destructive mr-2">{upload.error_message}</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteUpload(upload.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No bills uploaded yet</p>
            <p className="text-sm">Upload PDF bills to extract data automatically with AI</p>
          </div>
        )}
      </Card>
    </div>
  );
}
