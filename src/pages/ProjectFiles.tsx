
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Grid, List, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileUploadDropzone } from "@/components/files/FileUploadDropzone";
import { FileList } from "@/components/files/FileList";
import { FileGrid } from "@/components/files/FileGrid";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { FileShareModal } from "@/components/files/components/FileShareModal";
import { FolderShareModal } from "@/components/files/components/FolderShareModal";

export default function ProjectFiles() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFileShareModal, setShowFileShareModal] = useState(false);
  const [showFolderShareModal, setShowFolderShareModal] = useState(false);
  const [shareFile, setShareFile] = useState<any>(null);
  const [shareFolder, setShareFolder] = useState<{ folderPath: string; files: any[] } | null>(null);

  const { data: files = [], isLoading, refetch } = useProjectFiles(projectId || '');

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || file.file_type === fileTypeFilter;
    return matchesSearch && matchesType && !file.is_deleted;
  });

  const fileTypes = [...new Set(files.map(file => file.file_type))];

  const handleFileSelect = async (file: any) => {
    try {
      // Get a signed URL and open directly in new tab
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) throw error;

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  };

  const handleUploadSuccess = () => {
    refetch();
    toast({
      title: "Success",
      description: "File uploaded successfully",
    });
  };

  const handleFileShare = (file: any) => {
    setShareFile(file);
    setShowFileShareModal(true);
  };

  const handleFolderShare = (folderPath: string, files: any[]) => {
    setShareFolder({ folderPath, files });
    setShowFolderShareModal(true);
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid project ID</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="text-gray-600 hover:text-black" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-black">Project Files</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {fileTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            <FileUploadDropzone
              projectId={projectId}
              onUploadSuccess={handleUploadSuccess}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <>
                {viewMode === 'list' ? (
                  <FileList
                    files={filteredFiles}
                    onFileSelect={handleFileSelect}
                    onRefresh={refetch}
                    onUploadToFolder={(folderName, files) => {
                      // Handle folder upload
                      console.log('Upload to folder:', folderName, files);
                    }}
                    onShare={handleFileShare}
                    onShareFolder={handleFolderShare}
                  />
                ) : (
                  <FileGrid
                    files={filteredFiles}
                    onFileSelect={handleFileSelect}
                    onRefresh={refetch}
                    onUploadToFolder={(folderName, files) => {
                      // Handle folder upload
                      console.log('Upload to folder:', folderName, files);
                    }}
                    onShare={handleFileShare}
                    onShareFolder={handleFolderShare}
                  />
                )}
              </>
            )}
          </div>
        </main>

        <FileShareModal
          isOpen={showFileShareModal}
          onClose={() => {
            setShowFileShareModal(false);
            setShareFile(null);
          }}
          file={shareFile}
        />

        <FolderShareModal
          isOpen={showFolderShareModal}
          onClose={() => {
            setShowFolderShareModal(false);
            setShareFolder(null);
          }}
          folderPath={shareFolder?.folderPath || ''}
          files={shareFolder?.files || []}
          projectId={projectId || ''}
        />
      </div>
    </SidebarProvider>
  );
}
