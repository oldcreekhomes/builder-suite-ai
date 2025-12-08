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
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, XCircle, Sparkles, AlertCircle } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { autoExtractAndSave } from "@/utils/autoExtractTakeoff";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMMON_SCALES = [
  "1/16\" = 1'-0\"",
  "3/32\" = 1'-0\"",
  "1/8\" = 1'-0\"",
  "3/16\" = 1'-0\"",
  "1/4\" = 1'-0\"",
  "3/8\" = 1'-0\"",
  "1/2\" = 1'-0\"",
  "3/4\" = 1'-0\"",
  "1\" = 1'-0\"",
  "1-1/2\" = 1'-0\"",
  "3\" = 1'-0\"",
  "AS NOTED",
  "NTS",
];

interface UploadSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  takeoffId: string;
  onSuccess: (sheetIds: string[], itemIds: string[]) => void;
}

interface SheetDetection {
  pageNum: number;
  sheetId: string | null; // null until saved to database
  filePath: string;
  fileName: string;
  aiSuggestion: {
    sheet_number: string | null;
    sheet_title: string | null;
    scale: string | null;
    confidence: 'high' | 'medium' | 'low';
  };
  userValues: {
    sheet_number: string;
    sheet_title: string;
    scale: string;
  };
  status: 'pending' | 'analyzing' | 'ready' | 'extracting' | 'complete' | 'failed';
  itemCount?: number;
  error?: string;
}

type Phase = 'upload' | 'uploading' | 'analyzing' | 'review' | 'extracting';

export function UploadSheetDialog({ open, onOpenChange, takeoffId, onSuccess }: UploadSheetDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [detections, setDetections] = useState<SheetDetection[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUploadAndAnalyze = async () => {
    if (!file || !user) return;

    setPhase('uploading');
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isPDF = fileExt === 'pdf';
    const baseSheetName = file.name.replace(/\.[^/.]+$/, '');

    try {
      const sheetsToProcess: SheetDetection[] = [];

      if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setUploadProgress({ current: 0, total: pdf.numPages });

        // Process each page - upload to storage only, NO database insert
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          // Render to canvas at 2x scale for quality
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          
          if (!context) throw new Error('Could not get canvas context');

          // Fill with white background first (prevents black images on complex vector pages)
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Small delay to ensure canvas content is fully committed before blob conversion
          await new Promise(resolve => setTimeout(resolve, 50));

          // Convert canvas to PNG blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to convert canvas to blob'));
            }, 'image/png', 0.95);
          });

          // Upload PNG to storage only - no database insert yet
          const fileName = `${file.name.replace('.pdf', '')}_page_${pageNum}.png`;
          const filePath = `takeoffs/${takeoffId}/${crypto.randomUUID()}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, blob, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Store in local state only - sheetId is null until saved
          sheetsToProcess.push({
            pageNum,
            sheetId: null,
            filePath,
            fileName,
            aiSuggestion: { sheet_number: null, sheet_title: null, scale: null, confidence: 'low' },
            userValues: { sheet_number: '', sheet_title: '', scale: '' },
            status: 'pending',
          });

          setUploadProgress({ current: pageNum, total: pdf.numPages });
        }
      } else {
        // Handle single image files - upload to storage only
        setUploadProgress({ current: 0, total: 1 });
        
        const filePath = `takeoffs/${takeoffId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store in local state only - sheetId is null until saved
        sheetsToProcess.push({
          pageNum: 1,
          sheetId: null,
          filePath,
          fileName: file.name,
          aiSuggestion: { sheet_number: null, sheet_title: null, scale: null, confidence: 'low' },
          userValues: { sheet_number: '', sheet_title: '', scale: '' },
          status: 'pending',
        });

        setUploadProgress({ current: 1, total: 1 });
      }

      setDetections(sheetsToProcess);
      setPhase('analyzing');

      // Analyze each sheet for title block info using file path (no sheetId yet)
      for (let i = 0; i < sheetsToProcess.length; i++) {
        const sheet = sheetsToProcess[i];
        
        setDetections(prev => prev.map((d, idx) => 
          idx === i ? { ...d, status: 'analyzing' } : d
        ));

        try {
          // Pass file_path instead of sheet_id since we haven't saved to DB yet
          const { data, error } = await supabase.functions.invoke('detect-sheet-info', {
            body: { file_path: sheet.filePath }
          });

          if (error) throw error;

          setDetections(prev => prev.map((d, idx) => 
            idx === i ? {
              ...d,
              status: 'ready',
              aiSuggestion: {
                sheet_number: data.sheet_number,
                sheet_title: data.sheet_title,
                scale: data.scale,
                confidence: data.confidence || 'low',
              },
              userValues: {
                sheet_number: data.sheet_number || '',
                sheet_title: data.sheet_title || '',
                scale: COMMON_SCALES.includes(data.scale) ? data.scale : '',
              }
            } : d
          ));
        } catch (err) {
          console.error('Error analyzing sheet:', err);
          setDetections(prev => prev.map((d, idx) => 
            idx === i ? { ...d, status: 'ready' } : d
          ));
        }
      }

      setPhase('review');

    } catch (error) {
      console.error('Error uploading sheets:', error);
      toast({ title: "Error", description: "Failed to upload sheets", variant: "destructive" });
      setPhase('upload');
    }
  };

  const handleAcceptAll = () => {
    setDetections(prev => prev.map(d => ({
      ...d,
      userValues: {
        sheet_number: d.userValues.sheet_number || d.aiSuggestion.sheet_number || '',
        sheet_title: d.userValues.sheet_title || d.aiSuggestion.sheet_title || '',
        scale: d.userValues.scale || d.aiSuggestion.scale || '',
      }
    })));
  };

  const handleFieldChange = (index: number, field: keyof SheetDetection['userValues'], value: string) => {
    setDetections(prev => prev.map((d, idx) => 
      idx === index ? { ...d, userValues: { ...d.userValues, [field]: value } } : d
    ));
  };

  const handleSaveAndExtract = async () => {
    if (!user) return;
    
    setPhase('extracting');
    const allSheetIds: string[] = [];
    const allItemIds: string[] = [];
    const baseSheetName = file?.name.replace(/\.[^/.]+$/, '') || 'Sheet';

    try {
      // NOW insert sheet records and run extraction
      for (let i = 0; i < detections.length; i++) {
        const detection = detections[i];

        // Build the display name
        const displayName = detection.userValues.sheet_number && detection.userValues.sheet_title
          ? `${detection.userValues.sheet_number} - ${detection.userValues.sheet_title}`
          : detection.userValues.sheet_number || detection.userValues.sheet_title || `${baseSheetName} - Page ${detection.pageNum}`;

        // Insert sheet record to database (first time)
        const { data: insertedSheet, error: insertError } = await supabase
          .from('takeoff_sheets')
          .insert({
            takeoff_project_id: takeoffId,
            owner_id: user.id,
            name: displayName,
            file_path: detection.filePath,
            file_name: detection.fileName,
            page_number: detection.pageNum,
            sheet_number: detection.userValues.sheet_number || null,
            sheet_title: detection.userValues.sheet_title || null,
            drawing_scale: detection.userValues.scale || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        const sheetId = insertedSheet.id;
        allSheetIds.push(sheetId);

        // Update local state with sheetId
        setDetections(prev => prev.map((d, idx) => 
          idx === i ? { ...d, sheetId, status: 'extracting' } : d
        ));

        // Run Roboflow extraction
        const extractResult = await autoExtractAndSave(sheetId);

        if (extractResult.success) {
          allItemIds.push(...extractResult.itemIds);
          setDetections(prev => prev.map((d, idx) => 
            idx === i ? { ...d, status: 'complete', itemCount: extractResult.itemCount } : d
          ));
        } else {
          setDetections(prev => prev.map((d, idx) => 
            idx === i ? { ...d, status: 'failed', error: extractResult.error } : d
          ));
        }
      }

      const successCount = detections.filter(d => d.status === 'complete' || d.status === 'extracting').length;
      const totalItems = detections.reduce((sum, d) => sum + (d.itemCount || 0), 0);
      
      toast({ 
        title: "Success", 
        description: `✓ ${successCount} sheet${successCount !== 1 ? 's' : ''} processed, ${totalItems} items extracted` 
      });

      // Wait to show complete status, then close
      setTimeout(() => {
        resetDialog();
        onSuccess(allSheetIds, allItemIds);
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error during extraction:', error);
      toast({ title: "Error", description: "Failed to complete extraction", variant: "destructive" });
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPhase('upload');
    setDetections([]);
    setUploadProgress({ current: 0, total: 0 });
  };

  const handleClose = async () => {
    // Clean up any uploaded files from storage if user cancels
    if (detections.length > 0) {
      try {
        const filePaths = detections.map(d => d.filePath);
        await supabase.storage.from('project-files').remove(filePaths);
      } catch (err) {
        console.error('Error cleaning up files:', err);
      }
    }
    resetDialog();
    onOpenChange(false);
  };

  const getConfidenceIcon = (value: string | null | undefined, confidence: 'high' | 'medium' | 'low') => {
    // If the field is empty, always show "please verify" regardless of AI confidence
    if (!value || value.trim() === '') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (confidence === 'high') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    // Medium or low confidence shows warning
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={phase === 'review' || phase === 'extracting' ? "max-w-4xl" : ""}>
        <DialogHeader>
          <DialogTitle>Upload Drawing Sheet</DialogTitle>
          <DialogDescription>
            {phase === 'upload' && "Upload a PDF or image of your construction drawing"}
            {phase === 'uploading' && null}
            {phase === 'analyzing' && null}
            {phase === 'review' && "Review and edit AI-detected sheet information"}
            {phase === 'extracting' && "Extracting takeoff items..."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Phase: Upload */}
          {phase === 'upload' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    required
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, PNG, JPG
                </p>
              </div>
            </>
          )}

          {/* Phase: Uploading */}
          {phase === 'uploading' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Uploading pages...</span>
                <span className="text-muted-foreground">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Phase: Analyzing */}
          {phase === 'analyzing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span>AI analyzing title blocks...</span>
              </div>
              <div className="space-y-2">
                {detections.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {d.status === 'analyzing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : d.status === 'ready' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    <span>Page {d.pageNum}</span>
                    {d.status === 'ready' && d.aiSuggestion.sheet_number && (
                      <span className="text-muted-foreground">
                        → {d.aiSuggestion.sheet_number}
                        {d.aiSuggestion.sheet_title && ` - ${d.aiSuggestion.sheet_title}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase: Review */}
          {phase === 'review' && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Page</TableHead>
                      <TableHead className="w-32">Sheet #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-40">Scale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detections.map((d, idx) => (
                      <TableRow key={idx} className="h-10">
                        <TableCell className="font-medium py-1">{d.pageNum}</TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            <Input
                              value={d.userValues.sheet_number}
                              onChange={(e) => handleFieldChange(idx, 'sheet_number', e.target.value)}
                              placeholder={d.aiSuggestion.sheet_number || 'e.g., A-1'}
                              className="h-7"
                            />
                            {getConfidenceIcon(d.userValues.sheet_number, d.aiSuggestion.confidence)}
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            <Input
                              value={d.userValues.sheet_title}
                              onChange={(e) => handleFieldChange(idx, 'sheet_title', e.target.value)}
                              placeholder={d.aiSuggestion.sheet_title || 'e.g., FRONT ELEVATION'}
                              className="h-7"
                            />
                            {getConfidenceIcon(d.userValues.sheet_title, d.aiSuggestion.confidence)}
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            <Select
                              value={d.userValues.scale || ''}
                              onValueChange={(value) => handleFieldChange(idx, 'scale', value)}
                            >
                              <SelectTrigger className="h-7">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border z-50">
                                {COMMON_SCALES.map(scale => (
                                  <SelectItem key={scale} value={scale}>
                                    {scale}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {getConfidenceIcon(d.userValues.scale, d.aiSuggestion.confidence)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>High confidence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span>Please verify</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Extracting */}
          {phase === 'extracting' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Extracting takeoff items...</span>
                <span className="text-muted-foreground">
                  {detections.filter(d => d.status === 'complete').length} / {detections.length}
                </span>
              </div>
              
              <div className="space-y-2">
                {detections.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {d.status === 'extracting' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {d.status === 'complete' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {d.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {d.status !== 'extracting' && d.status !== 'complete' && d.status !== 'failed' && (
                      <div className="h-4 w-4" />
                    )}
                    
                    <span className="flex-1 truncate">
                      {d.userValues.sheet_number && d.userValues.sheet_title
                        ? `${d.userValues.sheet_number} - ${d.userValues.sheet_title}`
                        : d.userValues.sheet_number || d.userValues.sheet_title || `Page ${d.pageNum}`}
                    </span>
                    
                    {d.status === 'complete' && d.itemCount !== undefined && (
                      <span className="text-xs text-green-600">
                        {d.itemCount} item{d.itemCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {d.status === 'failed' && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                  </div>
                ))}
              </div>
              
              <Progress 
                value={(detections.filter(d => d.status === 'complete').length / detections.length) * 100} 
                className="h-2"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {phase === 'upload' && (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUploadAndAnalyze} disabled={!file}>
                Upload & Analyze
              </Button>
            </>
          )}
          
          {phase === 'review' && (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveAndExtract}>
                Save & Extract Items
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
