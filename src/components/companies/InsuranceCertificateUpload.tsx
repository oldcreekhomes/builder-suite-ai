import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InsuranceCertificateUploadProps {
  companyId: string;
  homeBuilder: string;
  onExtractionComplete: (data: ExtractedInsuranceData, pendingUploadId: string) => void;
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

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('insurance-certificates')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create pending upload record
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

      setIsUploading(false);
      setIsExtracting(true);

      // Call the extraction edge function
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

    } catch (err: any) {
      console.error('Upload/extraction error:', err);
      setError(err.message || 'Failed to process certificate');
      toast({
        title: "Error",
        description: err.message || 'Failed to process certificate',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  }, [companyId, homeBuilder, onExtractionComplete, toast]);

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
          <div>
            <p className="font-medium">
              {isDragActive ? 'Drop the certificate here' : 'Upload Certificate of Insurance'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF format only
            </p>
          </div>
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
