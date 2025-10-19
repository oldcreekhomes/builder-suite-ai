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
import { Upload } from "lucide-react";
import { getDocument } from "pdfjs-dist";

interface UploadSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  takeoffId: string;
  onSuccess: () => void;
}

export function UploadSheetDialog({ open, onOpenChange, takeoffId, onSuccess }: UploadSheetDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Upload file to storage once
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const filePath = `takeoffs/${takeoffId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL for PDF page counting
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      let pageCount = 1;
      const isPDF = fileExt === 'pdf';

      // If PDF, count the pages
      if (isPDF) {
        try {
          const loadingTask = getDocument(urlData.publicUrl);
          const pdf = await loadingTask.promise;
          pageCount = pdf.numPages;
        } catch (error) {
          console.error('Error reading PDF:', error);
          toast.error('Could not read PDF pages, treating as single page');
        }
      }

      // Create sheet records - one per page
      const baseSheetName = name || file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
      const sheetsToInsert = [];

      for (let i = 1; i <= pageCount; i++) {
        const sheetName = pageCount > 1 
          ? `${baseSheetName} - Page ${i}`
          : baseSheetName;

        sheetsToInsert.push({
          takeoff_project_id: takeoffId,
          owner_id: user.id,
          name: sheetName,
          file_path: filePath,
          file_name: file.name,
          page_number: i,
        });
      }

      const { error: insertError } = await supabase
        .from('takeoff_sheets')
        .insert(sheetsToInsert);

      if (insertError) throw insertError;

      const successMessage = pageCount > 1 
        ? `Successfully uploaded ${pageCount} pages`
        : 'Sheet uploaded successfully';
      
      toast.success(successMessage);
      setName("");
      setFile(null);
      onSuccess();
    } catch (error) {
      console.error('Error uploading sheet:', error);
      toast.error('Failed to upload sheet');
    } finally {
      setIsUploading(false);
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
