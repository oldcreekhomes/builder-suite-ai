
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Trash2, Image } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileGridProps {
  files: any[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
}

export function FileGrid({ files, onFileSelect, onRefresh }: FileGridProps) {
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return <Image className="h-8 w-8 text-purple-500" />;
    }
    return <FileText className="h-8 w-8 text-blue-500" />;
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => (
        <Card key={file.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              {getFileIcon(file.file_type)}
              <Badge className={getFileTypeColor(file.file_type)}>
                {file.file_type.toUpperCase()}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-sm mb-2 line-clamp-2" title={file.original_filename}>
              {file.original_filename}
            </h3>
            
            {file.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {file.description}
              </p>
            )}
            
            <div className="flex-1" />
            
            <div className="space-y-2 text-xs text-gray-500">
              <div>{formatFileSize(file.file_size)}</div>
              <div>By {file.uploaded_by_profile?.email || 'Unknown'}</div>
              <div>{format(new Date(file.uploaded_at), 'MMM dd, yyyy')}</div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
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
          </div>
        </Card>
      ))}
    </div>
  );
}
