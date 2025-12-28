import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InsuranceCertificateUploadProps {
  companyId?: string | null;
  homeBuilder: string;
  onExtractionComplete: (data: ExtractedInsuranceData, pendingUploadIdOrFilePath: string) => void;
}

export interface ExtractedCoverage {
  type: "commercial_general_liability" | "automobile_liability" | "umbrella_liability" | "workers_compensation";
  insurer_name: string | null;
  insurer_letter: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_limit: number | null;
}

export interface ExtractedInsuranceData {
  certificate_date: string | null;
  producer: {
    name: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  insured: {
    name: string | null;
    address: string | null;
  } | null;
  coverages: ExtractedCoverage[];
}

export function InsuranceCertificateUpload({ 
  companyId, 
  homeBuilder, 
  onExtractionComplete 
}: InsuranceCertificateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setIsUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate file path - use 'temp' folder if no companyId
      const fileExt = file.name.split('.').pop();
      const folderPath = companyId || 'temp';
      const timestamp = Date.now();
      const fileName = `${folderPath}/${timestamp}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('insurance-certificates')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setIsUploading(false);
      setIsExtracting(true);

      // Different flow for new company (no companyId) vs existing company
      if (companyId) {
        // Existing company: create pending upload record and use original flow
        const { data: pendingUpload, error: insertError } = await supabase
          .from('pending_insurance_uploads')
          .insert({
            company_id: companyId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            content_type: file.type,
            status: 'pending',
            owner_id: homeBuilder || user.id,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Call the extraction edge function with pendingUploadId
        const { data: extractionResult, error: extractionError } = await supabase.functions
          .invoke('extract-insurance-certificate', {
            body: { pendingUploadId: pendingUpload.id },
          });

        if (extractionError) throw extractionError;

        if (!extractionResult?.success) {
          throw new Error(extractionResult?.error || 'Extraction failed');
        }

        toast({
          title: "Certificate processed",
          description: "Insurance data has been extracted. Please review and confirm.",
        });

        onExtractionComplete(extractionResult.data, pendingUpload.id);
      } else {
        // New company: use direct extraction without creating pending record
        const { data: extractionResult, error: extractionError } = await supabase.functions
          .invoke('extract-insurance-certificate-direct', {
            body: { filePath: fileName },
          });

        if (extractionError) throw extractionError;

        if (!extractionResult?.success) {
          throw new Error(extractionResult?.error || 'Extraction failed');
        }

        toast({
          title: "Certificate processed",
          description: "Insurance data extracted. It will be saved when the company is created.",
        });

        // Pass the file path instead of pending upload ID for new companies
        onExtractionComplete(extractionResult.data, fileName);
      }

    } catch (err: any) {
      console.error('Upload/extraction error:', err);
      const friendlyError = getFriendlyErrorMessage(err.message);
      setError(friendlyError);
      toast({
        title: "Error",
        description: friendlyError,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  }, [companyId, homeBuilder, onExtractionComplete, toast]);

// Helper to convert database errors to user-friendly messages
function getFriendlyErrorMessage(message: string): string {
  if (message?.includes('violates row-level security') || message?.includes('NOT NULL')) {
    return 'Failed to process certificate. Please try again.';
  }
  if (message?.includes('Rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (message?.includes('Payment required')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  return message || 'Failed to process certificate';
}

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isUploading || isExtracting,
  });

  if (isUploading || isExtracting) {
    return (
      <div className="border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
        <p className="font-medium">
            Using AI to extract insurance data...
          </p>
          {uploadedFile && (
            <p className="text-sm text-muted-foreground mt-1">{uploadedFile.name}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}
          ${error ? 'border-destructive' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">
            {isDragActive ? 'Drop the certificate here' : 'Upload Certificate of Insurance'}
          </p>
          <Button variant="outline" size="sm" type="button">
            <FileText className="h-4 w-4 mr-2" />
            Select PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
