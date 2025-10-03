import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PendingUpload {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
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

  useState(() => {
    loadPendingUploads();
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of Array.from(files)) {
        const filePath = `pending/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('bill-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('pending_bill_uploads')
          .insert({
            owner_id: user.id,
            uploaded_by: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
            status: 'pending'
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`
      });

      loadPendingUploads();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async (upload: PendingUpload) => {
    try {
      setPendingUploads(prev => 
        prev.map(u => u.id === upload.id ? { ...u, status: 'processing' as const } : u)
      );

      const { error } = await supabase.functions.invoke('extract-bill-data', {
        body: { pendingUploadId: upload.id }
      });

      if (error) throw error;

      toast({
        title: "Extraction started",
        description: "AI is extracting data from your bill..."
      });

      const pollInterval = setInterval(async () => {
        const { data, error } = await supabase
          .from('pending_bill_uploads')
          .select('*')
          .eq('id', upload.id)
          .single();

        if (error || !data) {
          clearInterval(pollInterval);
          return;
        }

        if (data.status === 'extracted') {
          clearInterval(pollInterval);
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? (data as PendingUpload) : u)
          );
          toast({
            title: "Extraction complete",
            description: "Click 'Use This Data' to populate the bill form"
          });
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? (data as PendingUpload) : u)
          );
          toast({
            title: "Extraction failed",
            description: data.error_message || "Unknown error",
            variant: "destructive"
          });
        }
      }, 2000);

      setTimeout(() => clearInterval(pollInterval), 60000);

    } catch (error) {
      console.error('Extract error:', error);
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Unknown error",
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
    const variants: Record<string, any> = {
      pending: "secondary",
      processing: "default",
      extracted: "default",
      error: "destructive"
    };
    return (
      <Badge variant={variants[status]}>
        {status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">AI Bill Extraction</h3>
            <p className="text-sm text-muted-foreground">
              Upload bill PDFs and let AI extract the data automatically
            </p>
          </div>
          <div>
            <input
              type="file"
              id="pdf-upload"
              className="hidden"
              accept="application/pdf"
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
                  {upload.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleExtract(upload)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Data
                    </Button>
                  )}
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
