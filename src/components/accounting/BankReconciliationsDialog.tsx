import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useUniversalFilePreview } from "@/hooks/useUniversalFilePreview";


interface BankReconciliationsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankReconciliationsDialog({ projectId, open, onOpenChange }: BankReconciliationsDialogProps) {
  return (
    <UniversalFilePreviewProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bank Reconciliations</DialogTitle>
          </DialogHeader>
          <BankReconciliationsDialogContent projectId={projectId} />
        </DialogContent>
      </Dialog>
    </UniversalFilePreviewProvider>
  );
}

function BankReconciliationsDialogContent({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openProjectFile } = useUniversalFilePreview();

  // Fetch bank reconciliations
  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['bank-reconciliations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Reconciliations/%')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations-metrics', projectId] });
      toast({
        title: "Success",
        description: "Bank reconciliation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${projectId}/Bank Reconciliations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: userData } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: `Bank Reconciliations/${fileName}`,
          storage_path: filePath,
          mime_type: 'application/pdf',
          file_type: 'application/pdf',
          file_size: file.size,
          uploaded_by: userData?.user?.id || '',
          is_deleted: false,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations-metrics', projectId] });

      toast({
        title: "Success",
        description: "Bank reconciliation uploaded successfully",
      });

      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(filePath);

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
        description: error.message,
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {reconciliations?.length || 0} reconciliation(s)
        </p>
        <div>
          <input
            type="file"
            id="reconciliation-upload"
            className="hidden"
            accept=".pdf"
            onChange={handleFileUpload}
          />
          <Button asChild size="sm">
            <label htmlFor="reconciliation-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </label>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : reconciliations && reconciliations.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Size</th>
                <th className="text-left p-3 font-medium">Uploaded</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((reconciliation) => (
                <tr key={reconciliation.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{reconciliation.filename}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {formatFileSize(reconciliation.file_size || 0)}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {format(new Date(reconciliation.uploaded_at), 'MMM d, yyyy')}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openProjectFile(reconciliation.storage_path, reconciliation.filename)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(reconciliation.storage_path, reconciliation.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(reconciliation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No bank reconciliations uploaded yet
        </div>
      )}
    </div>
  );
}
