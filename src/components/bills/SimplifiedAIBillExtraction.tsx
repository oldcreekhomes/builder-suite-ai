import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Document as PdfDocument, Page as PdfPage, pdfjs as ReactPdfjs } from 'react-pdf';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local worker to avoid CDN/CORS issues for both pdfjs-dist and react-pdf
GlobalWorkerOptions.workerSrc = workerSrc;
ReactPdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PendingUpload {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  content_type?: string;
  status: 'pending' | 'processing' | 'completed' | 'extracted' | 'error';
  extracted_data: any;
  error_message?: string;
}

interface SimplifiedAIBillExtractionProps {
  onDataExtracted: (data: any) => void;
  onSwitchToManual: () => void;
  onProcessingChange?: (uploads: PendingUpload[]) => void;
}

export default function SimplifiedAIBillExtraction({ onDataExtracted, onSwitchToManual, onProcessingChange }: SimplifiedAIBillExtractionProps) {
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

    const uploads = (data || []) as PendingUpload[];
    setPendingUploads(uploads);
    onProcessingChange?.(uploads);
  };

  useEffect(() => {
    loadPendingUploads();
  }, []);

  // Notify parent whenever pendingUploads changes
  useEffect(() => {
    onProcessingChange?.(pendingUploads);
  }, [pendingUploads, onProcessingChange]);

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

  // Extract text from PDF client-side
  const extractPdfText = async (filePath: string): Promise<string> => {
    try {
      const { data: fileData, error } = await supabase.storage
        .from('bill-attachments')
        .download(filePath);
      
      if (error || !fileData) {
        console.error('Failed to download PDF for text extraction:', error);
        return '';
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const pageLimit = Math.min(pdf.numPages, 5);
      let fullText = '';
      
      for (let i = 1; i <= pageLimit; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return '';
    }
  };

  // Render PDF pages to images as fallback for scanned PDFs
  const renderPdfPagesToImages = async (filePath: string, maxPages = 2): Promise<string[]> => {
    try {
      const { data: fileData, error } = await supabase.storage
        .from('bill-attachments')
        .download(filePath);

      if (error || !fileData) {
        console.error('Failed to download PDF for image rendering:', error);
        return [];
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const pageCount = Math.min(pdf.numPages, maxPages);
      const images: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            console.error(`Failed to get canvas context for page ${i}`);
            continue;
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          images.push(canvas.toDataURL('image/png'));
        } catch (pageError) {
          console.error(`Failed to render page ${i}:`, pageError);
          console.error('Page error details:', {
            message: pageError instanceof Error ? pageError.message : String(pageError),
            stack: pageError instanceof Error ? pageError.stack : undefined
          });
          // Continue to next page instead of failing completely
        }
      }

      return images;
  } catch (error) {
    console.error('Error rendering PDF to images:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
  };

  // Offscreen react-pdf fallback to render first N pages into PNGs
  type OffscreenProps = {
    blobUrl: string;
    maxPages: number;
    onDone: (images: string[]) => void;
    onError: (error: any) => void;
  };

  function OffscreenPdfRenderer({ blobUrl, maxPages, onDone, onError }: OffscreenProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const imagesRef = useRef<string[]>([]);
    const expectedRef = useRef<number>(0);
    const containerRefs = useRef<Array<HTMLDivElement | null>>([]);

    const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
      expectedRef.current = Math.min(numPages, maxPages);
      setNumPages(numPages);
    };

    const handlePageRendered = (index: number) => {
      const wrapper = containerRefs.current[index];
      const canvas = wrapper?.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        try {
          imagesRef.current[index] = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('toDataURL failed for page', index + 1, e);
        }
      } else {
        console.warn('No canvas found for page', index + 1);
      }
      const ready = imagesRef.current.filter(Boolean).length;
      if (expectedRef.current > 0 && ready >= expectedRef.current) {
        onDone(imagesRef.current.filter(Boolean));
      }
    };

    return (
      <div style={{ position: 'fixed', left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }}>
        <PdfDocument file={blobUrl} onLoadSuccess={handleLoadSuccess} onLoadError={onError}>
          {Array.from({ length: Math.min(numPages, maxPages) }, (_, i) => (
            <div key={i} ref={(el) => (containerRefs.current[i] = el)}>
              <PdfPage pageNumber={i + 1} scale={1.5} renderMode="canvas" onRenderSuccess={() => handlePageRendered(i)} />
            </div>
          ))}
        </PdfDocument>
      </div>
    );
  }

  const renderPdfPagesToImagesReact = async (filePath: string, maxPages = 2): Promise<string[]> => {
    try {
      const { data: fileData, error } = await supabase.storage
        .from('bill-attachments')
        .download(filePath);

      if (error || !fileData) {
        console.error('[react-pdf] Failed to download PDF for offscreen rendering:', error);
        return [];
      }

      const blobUrl = URL.createObjectURL(fileData);

      return await new Promise<string[]>((resolve) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        let done = false;
        const cleanup = (images: string[]) => {
          if (done) return;
          done = true;
          try { root.unmount(); } catch {}
          try { document.body.removeChild(container); } catch {}
          try { URL.revokeObjectURL(blobUrl); } catch {}
          resolve(images);
        };

        const onDone = (images: string[]) => {
          console.log(`[react-pdf] Rendered ${images.length} page image(s)`);
          cleanup(images);
        };
        const onError = (e: any) => {
          console.error('[react-pdf] Offscreen renderer error:', e);
          cleanup([]);
        };

        root.render(
          <OffscreenPdfRenderer
            blobUrl={blobUrl}
            maxPages={maxPages}
            onDone={onDone}
            onError={onError}
          />
        );

        // Safety timeout in case rendering stalls
        setTimeout(() => {
          if (!done) {
            console.warn('[react-pdf] Offscreen rendering timed out');
            cleanup([]);
          }
        }, 15000);
      });
    } catch (e) {
      console.error('[react-pdf] Unexpected error while rendering pages:', e);
      return [];
    }
  };

  const handleExtract = async (upload: PendingUpload) => {
    if (upload.status === 'processing') {
      toast({
        title: "Already processing",
        description: "This bill is currently being extracted.",
      });
      return;
    }

    try {
      setProcessingStats(prev => ({ ...prev, processing: prev.processing + 1 }));
      setPendingUploads(prev => 
        prev.map(u => u.id === upload.id ? { ...u, status: 'processing' as const } : u)
      );

      console.log('Starting extraction with AWS Textract...');
      
      // Try AWS Textract first
      const { error: textractError } = await supabase.functions.invoke('extract-bill-with-textract', {
        body: { 
          pendingUploadId: upload.id
        }
      });

      if (textractError) {
        console.warn('AWS Textract failed, falling back to AI extraction:', textractError);
        
        // Check if this is an AWS credentials error
        const isAwsAuthError = textractError.message && (
          textractError.message.includes('AWS credentials') ||
          textractError.message.includes('invalid or expired')
        );
        
        if (isAwsAuthError) {
          // Don't fall back - show the AWS error directly
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? { 
              ...u, 
              status: 'error' as const,
              error_message: textractError.message 
            } : u)
          );
          setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
          
          toast({
            title: 'AWS Textract Configuration Error',
            description: 'Please check your AWS credentials in the edge function settings.',
            variant: 'destructive'
          });
          return;
        }
        
        // For other Textract errors, fall back to AI extraction with PDF text/images
        const isPdf = upload.content_type?.includes('pdf') || upload.file_path.endsWith('.pdf');
        let pdfText = '';
        let pageImages: string[] = [];
        
        if (isPdf) {
          console.log('Extracting PDF text on client side...');
          pdfText = await extractPdfText(upload.file_path);
          
          // If text extraction returns empty, try image fallbacks
          if (!pdfText || pdfText.trim().length === 0) {
            console.log('PDF text extraction empty, trying react-pdf image fallback...');
            pageImages = await renderPdfPagesToImagesReact(upload.file_path, 2);

            if (pageImages.length === 0) {
              console.log('react-pdf fallback returned 0 images, trying pdfjs-dist fallback...');
              pageImages = await renderPdfPagesToImages(upload.file_path, 2);
            }
            
            if (pageImages.length === 0) {
              const errorMessage = 'This PDF appears to be scanned and could not be processed. Try re-saving as PDF/A or upload a photo/screenshot.';
              
              await supabase
                .from('pending_bill_uploads')
                .update({ 
                  status: 'error',
                  error_message: errorMessage
                })
                .eq('id', upload.id);

              setPendingUploads(prev => 
                prev.map(u => u.id === upload.id ? { 
                  ...u, 
                  status: 'error' as const,
                  error_message: errorMessage 
                } : u)
              );
              setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
              
              toast({
                title: 'Extraction failed',
                description: errorMessage,
                variant: 'destructive'
              });
              return;
            }
            
            console.log(`Rendered ${pageImages.length} PDF page image(s)`);
          } else {
            console.log('PDF text extracted successfully, length:', pdfText.length);
          }
        }

        // Call AI edge function with either text or images
        const { error: aiError } = await supabase.functions.invoke('extract-bill-data', {
          body: { 
            pendingUploadId: upload.id,
            pdfText: pdfText || undefined,
            pageImages: pageImages.length > 0 ? pageImages : undefined
          }
        });

        if (aiError) {
          throw aiError;
        }
      }

      toast({
        title: "Extraction started",
        description: "Processing your bill...",
      });

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
          
          // Keep status as 'processing' while enrichment happens
          await supabase
            .from('pending_bill_uploads')
            .update({ status: 'processing' })
            .eq('id', upload.id);
          
          setPendingUploads(prev => 
            prev.map(u => u.id === upload.id ? { ...data as PendingUpload, status: 'processing' } : u)
          );
          
          // Enrich with contact details after successful extraction
          (async () => {
            try {
              console.log('Starting contact enrichment for:', upload.id);
              const isPdf = upload.content_type?.includes('pdf') || upload.file_path.endsWith('.pdf');
              let pdfText = '';
              let pageImages: string[] = [];
              
              if (isPdf) {
                pdfText = await extractPdfText(upload.file_path);
                if (!pdfText || pdfText.trim().length === 0) {
                  pageImages = await renderPdfPagesToImagesReact(upload.file_path, 1);
                  if (pageImages.length === 0) {
                    pageImages = await renderPdfPagesToImages(upload.file_path, 1);
                  }
                }
              }
              
              await supabase.functions.invoke('extract-bill-data', {
                body: { 
                  pendingUploadId: upload.id,
                  pdfText: pdfText || undefined,
                  pageImages: pageImages.length > 0 ? pageImages : undefined,
                  enrichContactOnly: true
                }
              });
              
              // Update status to 'extracted' now that enrichment is complete
              await supabase
                .from('pending_bill_uploads')
                .update({ status: 'extracted' })
                .eq('id', upload.id);
              
              // Refresh the upload data
              const { data: refreshed } = await supabase
                .from('pending_bill_uploads')
                .select('*')
                .eq('id', upload.id)
                .single();
              
              if (refreshed) {
                setPendingUploads(prev => 
                  prev.map(u => u.id === upload.id ? (refreshed as PendingUpload) : u)
                );
                console.log('Contact enrichment completed');
              }
              
              // Stop spinner after enrichment completes
              setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
            } catch (enrichError) {
              console.warn('Contact enrichment failed (non-critical):', enrichError);
              
              // Update to 'extracted' even if enrichment fails
              await supabase
                .from('pending_bill_uploads')
                .update({ status: 'extracted' })
                .eq('id', upload.id);
              
              // Refresh data
              const { data: refreshed } = await supabase
                .from('pending_bill_uploads')
                .select('*')
                .eq('id', upload.id)
                .single();
              
              if (refreshed) {
                setPendingUploads(prev => 
                  prev.map(u => u.id === upload.id ? (refreshed as PendingUpload) : u)
                );
              }
              
              // Stop spinner even if enrichment fails
              setProcessingStats(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
            }
          })();
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

  const saveExtractedLinesToDatabase = async (pendingUploadId: string, extractedData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const jobCostLines = extractedData.jobCostRows || [];
      const expenseLines = extractedData.expenseRows || [];
      
      const lines = [
        ...jobCostLines.map((row: any, index: number) => ({
          pending_upload_id: pendingUploadId,
          line_number: index + 1,
          line_type: 'job_cost',
          description: row.memo || '',
          cost_code_name: row.costCode || '',
          project_name: row.project || '',
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.unitCost) || 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || '',
          owner_id: user.id,
        })),
        ...expenseLines.map((row: any, index: number) => ({
          pending_upload_id: pendingUploadId,
          line_number: jobCostLines.length + index + 1,
          line_type: 'expense',
          description: row.memo || '',
          account_name: row.account || '',
          project_name: row.project || '',
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || '',
          owner_id: user.id,
        }))
      ];

      if (lines.length > 0) {
        const { error } = await supabase
          .from('pending_bill_lines')
          .insert(lines);

        if (error) {
          console.error('Error saving bill lines:', error);
        }
      }
    } catch (error) {
      console.error('Error in saveExtractedLinesToDatabase:', error);
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


  return (
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
  );
}
