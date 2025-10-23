import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { autoExtractAndSave } from "@/utils/autoExtractTakeoff";
import { Progress } from "@/components/ui/progress";

interface UploadSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  takeoffId: string;
  onSuccess: (sheetIds: string[], itemIds: string[]) => void;
}

interface SheetProgress {
  sheetId: string;
  name: string;
  status: 'uploading' | 'extracting' | 'complete' | 'failed';
  itemCount?: number;
  error?: string;
}

export function UploadSheetDialog({ open, onOpenChange, takeoffId, onSuccess }: UploadSheetDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sheetProgress, setSheetProgress] = useState<SheetProgress[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);
    setShowProgress(true);
    const allSheetIds: string[] = [];
    const allItemIds: string[] = [];
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isPDF = fileExt === 'pdf';
      const baseSheetName = name || file.name.replace(/\.[^/.]+$/, '');

      if (isPDF) {
        // Convert PDF to PNG images
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const sheetsToInsert = [];
        const progressEntries: SheetProgress[] = [];

        // Initialize progress for all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const sheetName = pdf.numPages > 1 
            ? `${baseSheetName} - Page ${pageNum}`
            : baseSheetName;
          
          progressEntries.push({
            sheetId: `temp-${pageNum}`,
            name: sheetName,
            status: 'uploading',
          });
        }
        setSheetProgress(progressEntries);

        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          // Render to canvas at 2x scale for quality
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          
          if (!context) throw new Error('Could not get canvas context');

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to PNG blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to convert canvas to blob'));
            }, 'image/png', 0.95);
          });

          // Upload PNG to storage
          const fileName = `${file.name.replace('.pdf', '')}_page_${pageNum}.png`;
          const filePath = `takeoffs/${takeoffId}/${crypto.randomUUID()}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, blob, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const sheetName = pdf.numPages > 1 
            ? `${baseSheetName} - Page ${pageNum}`
            : baseSheetName;

          // Insert sheet and get its ID
          const { data: insertedSheet, error: insertError } = await supabase
            .from('takeoff_sheets')
            .insert({
              takeoff_project_id: takeoffId,
              owner_id: user.id,
              name: sheetName,
              file_path: filePath,
              file_name: fileName,
              page_number: pageNum,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          
          const sheetId = insertedSheet.id;
          allSheetIds.push(sheetId);

          // Update progress - extraction starting
          setSheetProgress(prev => prev.map((p, idx) => 
            idx === pageNum - 1 ? { ...p, sheetId, status: 'extracting' } : p
          ));

          // Auto-extract AI items
          const extractResult = await autoExtractAndSave(sheetId);
          
          if (extractResult.success) {
            allItemIds.push(...extractResult.itemIds);
            setSheetProgress(prev => prev.map(p => 
              p.sheetId === sheetId 
                ? { ...p, status: 'complete', itemCount: extractResult.itemCount } 
                : p
            ));
          } else {
            setSheetProgress(prev => prev.map(p => 
              p.sheetId === sheetId 
                ? { ...p, status: 'failed', error: extractResult.error } 
                : p
            ));
          }
        }

        const successCount = sheetProgress.filter(p => p.status === 'complete').length;
        const totalItems = sheetProgress.reduce((sum, p) => sum + (p.itemCount || 0), 0);
        
        toast.success(`✓ ${successCount} sheet${successCount !== 1 ? 's' : ''} uploaded, ${totalItems} items extracted`);
        
      } else {
        // Handle single image files (PNG, JPG, JPEG)
        setSheetProgress([{
          sheetId: 'temp-1',
          name: baseSheetName,
          status: 'uploading',
        }]);

        const filePath = `takeoffs/${takeoffId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: insertedSheet, error: insertError } = await supabase
          .from('takeoff_sheets')
          .insert({
            takeoff_project_id: takeoffId,
            owner_id: user.id,
            name: baseSheetName,
            file_path: filePath,
            file_name: file.name,
            page_number: 1,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        const sheetId = insertedSheet.id;
        allSheetIds.push(sheetId);

        // Update progress - extraction starting
        setSheetProgress([{
          sheetId,
          name: baseSheetName,
          status: 'extracting',
        }]);

        // Auto-extract AI items
        const extractResult = await autoExtractAndSave(sheetId);
        
        if (extractResult.success) {
          allItemIds.push(...extractResult.itemIds);
          setSheetProgress([{
            sheetId,
            name: baseSheetName,
            status: 'complete',
            itemCount: extractResult.itemCount,
          }]);
          toast.success(`✓ Sheet uploaded, ${extractResult.itemCount} items extracted`);
        } else {
          setSheetProgress([{
            sheetId,
            name: baseSheetName,
            status: 'failed',
            error: extractResult.error,
          }]);
          toast.success('Sheet uploaded (extraction failed - use Re-extract)');
        }
      }
      
      // Wait 1.5 seconds to show complete status, then close
      setTimeout(() => {
        setName("");
        setFile(null);
        setShowProgress(false);
        setSheetProgress([]);
        onSuccess(allSheetIds, allItemIds);
        onOpenChange(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading sheet:', error);
      toast.error('Failed to upload sheet');
      setIsUploading(false);
      setShowProgress(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Drawing Sheet</DialogTitle>
            <DialogDescription>
              Upload a PDF or image of your construction drawing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!showProgress ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file">File *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, PNG, JPG
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Sheet Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Front Elevation, Floor Plan"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use filename
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing sheets...</span>
                  <span className="text-muted-foreground">
                    {sheetProgress.filter(s => s.status === 'complete').length} / {sheetProgress.length}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {sheetProgress.map((sheet, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        {sheet.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {sheet.status === 'extracting' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {sheet.status === 'complete' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {sheet.status === 'failed' && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        
                        <span className="flex-1 truncate">{sheet.name}</span>
                        
                        {sheet.status === 'uploading' && (
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        )}
                        {sheet.status === 'extracting' && (
                          <span className="text-xs text-muted-foreground">Extracting...</span>
                        )}
                        {sheet.status === 'complete' && sheet.itemCount !== undefined && (
                          <span className="text-xs text-green-600">
                            {sheet.itemCount} item{sheet.itemCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {sheet.status === 'failed' && (
                          <span className="text-xs text-destructive">Failed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Progress 
                  value={(sheetProgress.filter(s => s.status === 'complete').length / sheetProgress.length) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            {!showProgress && (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading || !file}>
                  {isUploading ? 'Processing...' : 'Upload & Extract'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
