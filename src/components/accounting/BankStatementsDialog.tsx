import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Eye, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UniversalFilePreviewProvider, useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

interface BankStatementsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BankStatementsDialogContent({ projectId, onOpenChange }: Omit<BankStatementsDialogProps, 'open'>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openProjectFile } = useUniversalFilePreviewContext();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch bank statements
  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, original_filename, storage_path, uploaded_at, mime_type, file_size')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Statements/%')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-metrics', projectId] });
      toast({
        title: "Statement deleted",
        description: "Bank statement has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete statement: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a PDF file`,
            variant: "destructive",
          });
          continue;
        }

        const originalFilename = `Bank Statements/${file.name}`;
        const fileId = crypto.randomUUID();
        const storageName = `${projectId}/${fileId}_${originalFilename}`;

        // Upload to storage
        const { data: uploadUrl, error: urlError } = await supabase.storage
          .from('project-files')
          .createSignedUploadUrl(storageName);

        if (urlError) throw urlError;

        const uploadResponse = await fetch(uploadUrl.signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');

        // Insert record
        const { error: insertError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId,
            filename: storageName,
            original_filename: originalFilename,
            file_size: file.size,
            file_type: 'pdf',
            mime_type: file.type,
            storage_path: storageName,
            uploaded_by: user.id,
            is_deleted: false,
          });

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-metrics', projectId] });
      
      toast({
        title: "Success",
        description: `${files.length} statement(s) uploaded successfully`,
      });
      
      // Reset input
      e.target.value = '';
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('Bank Statements/', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
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
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Bank Statements</DialogTitle>
        <DialogDescription>
          Upload and manage bank statement PDFs for this project
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-end mb-4">
        <Button asChild disabled={isUploading}>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload PDF'}
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : statements && statements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement) => (
                <TableRow key={statement.id}>
                  <TableCell className="font-medium">
                    {statement.original_filename?.replace('Bank Statements/', '') || 'Untitled'}
                  </TableCell>
                  <TableCell>
                    {statement.uploaded_at ? format(new Date(statement.uploaded_at), 'PP') : '-'}
                  </TableCell>
                  <TableCell>
                    {statement.file_size ? formatFileSize(statement.file_size) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openProjectFile(
                          statement.storage_path,
                          statement.original_filename?.replace('Bank Statements/', '') || 'Statement'
                        )}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(
                          statement.storage_path,
                          statement.original_filename || 'statement.pdf'
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(statement.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No bank statements yet.</p>
            <p className="text-sm mt-2">Upload a PDF to get started.</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export function BankStatementsDialog(props: BankStatementsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <UniversalFilePreviewProvider>
        <BankStatementsDialogContent 
          projectId={props.projectId} 
          onOpenChange={props.onOpenChange}
        />
      </UniversalFilePreviewProvider>
    </Dialog>
  );
}
