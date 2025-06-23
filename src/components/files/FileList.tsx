
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Eye, Trash2, Folder, ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FileListProps {
  files: any[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onUploadToFolder?: (folderName: string, files: File[]) => void;
}

export function FileList({ files, onFileSelect, onRefresh, onUploadToFolder }: FileListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDisplayName = (filename: string) => {
    if (filename.includes('/')) {
      const parts = filename.split('/');
      const fileName = parts[parts.length - 1];
      const topLevelFolder = parts[0];
      // Get everything after the top-level folder for display within the folder
      const pathWithinFolder = parts.slice(1).join('/');
      return {
        fileName: fileName,
        topLevelFolder: topLevelFolder,
        pathWithinFolder: pathWithinFolder,
        isInFolder: true,
        fullPath: filename
      };
    }
    return {
      fileName: filename,
      topLevelFolder: '',
      pathWithinFolder: '',
      isInFolder: false,
      fullPath: filename
    };
  };

  const getFileTypeColor = (fileType: string) => {
    const colors: { [key: string]: string } = {
      pdf: "bg-red-100 text-red-800",
      doc: "bg-blue-100 text-blue-800",
      docx: "bg-blue-100 text-blue-800",
      xls: "bg-green-100 text-green-800",
      xlsx: "bg-green-100 text-green-800",
      ppt: "bg-orange-100 text-orange-800",
      pptx: "bg-orange-100 text-orange-800",
      txt: "bg-gray-100 text-gray-800",
      jpg: "bg-purple-100 text-purple-800",
      jpeg: "bg-purple-100 text-purple-800",
      png: "bg-purple-100 text-purple-800",
      gif: "bg-purple-100 text-purple-800",
    };
    return colors[fileType] || "bg-gray-100 text-gray-800";
  };

  // Group files by top-level folder only
  const groupedFiles = files.reduce((acc, file) => {
    const displayInfo = getDisplayName(file.original_filename);
    const folderKey = displayInfo.isInFolder ? displayInfo.topLevelFolder : 'Root';
    
    if (!acc[folderKey]) {
      acc[folderKey] = [];
    }
    acc[folderKey].push(file);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort folders - Root first, then alphabetically
  const sortedFolders = Object.keys(groupedFiles).sort((a, b) => {
    if (a === 'Root') return -1;
    if (b === 'Root') return 1;
    return a.localeCompare(b);
  });

  const uploadFileToFolder = async (file: File, folderName: string) => {
    if (!user) return false;

    const fileId = crypto.randomUUID();
    const relativePath = folderName === 'Root' ? file.name : `${folderName}/${file.name}`;
    const fileName = `${user.id}/${window.location.pathname.split('/')[2]}/${fileId}_${relativePath}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: window.location.pathname.split('/')[2],
          filename: fileName,
          original_filename: relativePath,
          file_size: file.size,
          file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          mime_type: file.type,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const handleFolderDragOver = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderName);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    toast({
      title: "Uploading files",
      description: `Uploading ${droppedFiles.length} file(s) to ${folderName}...`,
    });

    const uploadPromises = droppedFiles.map(file => uploadFileToFolder(file, folderName));
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} file(s) to ${folderName}`,
      });
      onRefresh();
    } else {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(file => file.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedFiles));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedFiles.size} file(s) deleted successfully`,
      });
      setSelectedFiles(new Set());
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete selected files",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: any) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  if (files.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No files found</h3>
        <p className="text-gray-600">Upload files to get started</p>
      </Card>
    );
  }

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  return (
    <div className="space-y-4">
      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedFiles.size} file(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (checkbox) {
                        checkbox.indeterminate = someSelected;
                      }
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFolders.map((folderPath) => {
              const folderFiles = groupedFiles[folderPath];
              const isExpanded = expandedFolders.has(folderPath);
              const isDragOver = dragOverFolder === folderPath;
              
              return (
                <React.Fragment key={folderPath}>
                  {/* Folder Header Row */}
                  <TableRow 
                    className={`border-b-2 cursor-pointer transition-colors ${
                      isDragOver 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onDragOver={(e) => handleFolderDragOver(e, folderPath)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folderPath)}
                  >
                    <TableCell colSpan={7}>
                      <div 
                        className="flex items-center space-x-2 py-1"
                        onClick={() => toggleFolder(folderPath)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <Folder className="h-5 w-5 text-yellow-500" />
                        <span className="font-semibold text-gray-700">
                          {folderPath === 'Root' ? 'Root Files' : folderPath}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''})
                        </span>
                        {isDragOver && (
                          <span className="text-sm text-blue-600 ml-2">
                            Drop files here to upload to this folder
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Files in Folder */}
                  {isExpanded && folderFiles.map((file) => {
                    const displayInfo = getDisplayName(file.original_filename);
                    
                    return (
                      <TableRow key={file.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3 pl-8">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <div className="font-medium" title={displayInfo.fullPath}>
                                {displayInfo.pathWithinFolder || displayInfo.fileName}
                              </div>
                              {file.description && (
                                <div className="text-sm text-gray-500">{file.description}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getFileTypeColor(file.file_type)}>
                            {file.file_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>{file.uploaded_by_profile?.email || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(file.uploaded_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onFileSelect(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
