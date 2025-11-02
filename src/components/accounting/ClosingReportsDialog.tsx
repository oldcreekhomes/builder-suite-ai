import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, Eye, Pencil, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/ui/delete-button";
import { UniversalFilePreviewProvider, useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

interface ClosingReportsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClosingReportsDialog({ projectId, open, onOpenChange }: ClosingReportsDialogProps) {
  return (
    <UniversalFilePreviewProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Closing Reports</DialogTitle>
            <DialogDescription>
              View and manage closing reports for this project
            </DialogDescription>
          </DialogHeader>
          <ClosingReportsDialogContent projectId={projectId} />
        </DialogContent>
      </Dialog>
    </UniversalFilePreviewProvider>
  );
}

function ClosingReportsDialogContent({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { openProjectFile } = useUniversalFilePreviewContext();

  const { data: closingReports, isLoading } = useQuery({
    queryKey: ['closing-reports', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Closing Reports/%')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closing-reports', projectId] });
      queryClient.invalidateQueries({ queryKey: ['closing-reports-metrics', projectId] });
      toast({
        title: "Success",
        description: "Closing report deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete closing report: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateFilenameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ original_filename: `Closing Reports/${newName}` })
        .eq('id', fileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closing-reports', projectId] });
      setEditingId(null);
      setEditingName("");
      toast({
        title: "Success",
        description: "Filename updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update filename: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (fileId: string, currentName: string) => {
    setEditingId(fileId);
    setEditingName(currentName.replace('Closing Reports/', ''));
  };

  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Filename cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      updateFilenameMutation.mutate({ fileId: editingId, newName: editingName.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${projectId}/closing-reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: `Closing Reports/${file.name}`,
          file_size: file.size,
          file_type: 'pdf',
          mime_type: file.type,
          storage_path: filePath,
          uploaded_by: user.id,
          is_deleted: false,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['closing-reports', projectId] });
      queryClient.invalidateQueries({ queryKey: ['closing-reports-metrics', projectId] });

      toast({
        title: "Success",
        description: "Closing report uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to upload closing report: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to download closing report: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {closingReports?.length || 0} closing report(s)
        </div>
        <div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="closing-report-upload"
            disabled={isUploading}
          />
          <label htmlFor="closing-report-upload">
            <Button asChild disabled={isUploading}>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : closingReports && closingReports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closingReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {editingId === report.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          disabled={updateFilenameMutation.isPending}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={updateFilenameMutation.isPending}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      report.original_filename.replace('Closing Reports/', '')
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(report.file_size)}</TableCell>
                  <TableCell>
                    {format(new Date(report.uploaded_at), 'PP')}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === report.id ? null : (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openProjectFile(report.storage_path, report.original_filename)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(report.storage_path, report.original_filename)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(report.id, report.original_filename)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteButton
                          onDelete={() => deleteMutation.mutate(report.id)}
                          title="Delete Closing Report"
                          description="Are you sure you want to delete this closing report? This action cannot be undone."
                          size="sm"
                          variant="ghost"
                          isLoading={deleteMutation.isPending}
                          showIcon={true}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No closing reports yet. Upload a PDF to get started.
          </div>
        )}
      </div>
    </div>
  );
}
