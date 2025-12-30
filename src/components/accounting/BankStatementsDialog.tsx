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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Download, Pencil, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DeleteButton } from "@/components/ui/delete-button";
import { UniversalFilePreviewProvider, useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDate, setEditingDate] = useState<Date | undefined>(undefined);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatementDate, setUploadStatementDate] = useState<Date | undefined>(undefined);

  const cleanName = (raw?: string) => (raw ? raw.replace(/^\d{13}_/, "") : "");

  // Fetch bank statements - sorted by statement_date ASC, nulls last
  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, original_filename, storage_path, uploaded_at, mime_type, file_size, statement_date')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Statements/%')
        .order('statement_date', { ascending: true, nullsFirst: false });

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

  // Update mutation (filename and statement_date)
  const updateMutation = useMutation({
    mutationFn: async ({ fileId, newName, statementDate }: { fileId: string; newName: string; statementDate: Date | null }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ 
          original_filename: `Bank Statements/${newName}`,
          statement_date: statementDate ? format(statementDate, 'yyyy-MM-dd') : null
        })
        .eq('id', fileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      setEditingId(null);
      setEditingName("");
      setEditingDate(undefined);
      toast({
        title: "Success",
        description: "Bank statement updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (fileId: string, currentName: string, currentDate: string | null) => {
    setEditingId(fileId);
    setEditingName(cleanName(currentName.replace('Bank Statements/', '')));
    if (currentDate) {
      const [year, month, day] = currentDate.split('-').map(Number);
      setEditingDate(new Date(year, month - 1, day));
    } else {
      setEditingDate(undefined);
    }
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
      updateMutation.mutate({ 
        fileId: editingId, 
        newName: editingName.trim(),
        statementDate: editingDate || null
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
    }
    if (pdfFiles.length > 0) {
      setSelectedFiles(pdfFiles);
      setUploadDialogOpen(true);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!uploadStatementDate) {
      toast({
        title: "Statement End Date Required",
        description: "Please select the statement end date before uploading",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of selectedFiles) {
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

        // Insert record with statement_date
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
            statement_date: format(uploadStatementDate, 'yyyy-MM-dd'),
          });

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-metrics', projectId] });
      
      toast({
        title: "Success",
        description: `${selectedFiles.length} statement(s) uploaded successfully`,
      });
      
      // Reset state
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadStatementDate(undefined);
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

  const formatStatementDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  };

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
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
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : statements && statements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Statement End Date</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement) => (
                  <TableRow 
                    key={statement.id}
                    onClick={() => {
                      openProjectFile(
                        statement.storage_path,
                        cleanName(statement.original_filename?.replace('Bank Statements/', '') || 'Statement')
                      );
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                  <TableCell className="font-medium">
                    {cleanName(statement.original_filename?.replace('Bank Statements/', '') || 'Untitled')}
                  </TableCell>
                  <TableCell>
                    {formatStatementDate(statement.statement_date)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(
                            statement.storage_path,
                            cleanName(statement.original_filename?.replace('Bank Statements/', '') || 'statement.pdf')
                          );
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(statement.id, statement.original_filename || '', statement.statement_date);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteButton
                          onDelete={() => deleteMutation.mutate(statement.id)}
                          title="Delete Bank Statement"
                          description="Are you sure you want to delete this bank statement? This action cannot be undone."
                          size="sm"
                          variant="ghost"
                          isLoading={deleteMutation.isPending}
                          showIcon={true}
                        />
                      </div>
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

      {/* Upload Dialog with Statement End Date */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setUploadDialogOpen(false);
          setSelectedFiles([]);
          setUploadStatementDate(undefined);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Bank Statement</DialogTitle>
            <DialogDescription>
              Select the statement end date for {selectedFiles.length} file(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selected Files</Label>
              <div className="text-sm text-muted-foreground">
                {selectedFiles.map(f => f.name).join(', ')}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statement End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !uploadStatementDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {uploadStatementDate ? format(uploadStatementDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={uploadStatementDate}
                    onSelect={(date) => { if (date) setUploadStatementDate(date); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFiles([]);
                setUploadStatementDate(undefined);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadStatementDate}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog with Statement End Date */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Statement</DialogTitle>
            <DialogDescription>
              Update the file name and statement end date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                }}
                placeholder="Enter filename"
              />
            </div>
            <div className="space-y-2">
              <Label>Statement End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingDate ? format(editingDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editingDate}
                    onSelect={(date) => { if (date) setEditingDate(date); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingId(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
