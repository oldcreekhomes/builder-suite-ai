import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, FileText, FolderOpen, FolderPlus, Archive } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { NewFolderModal } from "@/components/files/NewFolderModal";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProject } from "@/hooks/useProject";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface DashboardHeaderProps {
  title?: string;
  projectId?: string;
  onUploadSuccess?: () => void;
  currentPath?: string;
}

export function DashboardHeader({ title, projectId, onUploadSuccess, currentPath = '' }: DashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [processingZip, setProcessingZip] = useState(false);
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Get company name - handle both home builders and employees
  const getCompanyName = () => {
    if (profile && 'company_name' in profile && profile.company_name) {
      // User is a home builder
      return profile.company_name;
    } else if (profile && 'home_builder_id' in profile && profile.home_builder_id) {
      // User is an employee - we'd need to fetch the home builder's company name
      // For now, use a generic fallback
      return "Company Dashboard";
    }
    return "Company";
  };
  
  const companyName = getCompanyName();
  
  // Use provided title or fallback to company name
  const displayTitle = title || companyName;

  // File upload handlers (only needed for Project Files)
  const isValidFile = (file: File) => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db'];
    const hiddenFiles = fileName.startsWith('.');

    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }

    if (systemFiles.includes(fileName) || hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep') {
      return false;
    }

    if (file.size === 0) {
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File, relativePath: string = '') => {
    if (!user || !projectId) return false;
    const fileId = crypto.randomUUID();
    const fileName = `${user.id}/${projectId}/${fileId}_${relativePath || file.name}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const originalFilename = currentPath ? `${currentPath}/${relativePath || file.name}` : relativePath || file.name;

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: originalFilename,
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
      toast({
        title: "Upload Error",
        description: `Failed to upload ${relativePath || file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(isValidFile);
    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload",
      });
      return;
    }

    for (const file of validFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      await uploadFile(file, relativePath);
    }

    toast({
      title: "Upload Complete",
      description: `Successfully uploaded ${validFiles.length} file(s)`,
    });

    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    event.target.value = '';
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    event.target.value = '';
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const zipFile = files[0];
    if (!zipFile || !zipFile.name.endsWith('.zip')) {
      toast({
        title: "Invalid File",
        description: "Please select a valid .zip file",
        variant: "destructive",
      });
      return;
    }
    await processZipFile(zipFile);
    event.target.value = '';
  };

  const processZipFile = async (zipFile: File) => {
    if (!user || !projectId) return;
    setProcessingZip(true);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      const extractedFiles: File[] = [];

      for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
        if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('.DS_Store')) {
          continue;
        }
        
        try {
          const blob = await zipEntry.async('blob');
          const file = new File([blob], relativePath.split('/').pop() || relativePath, {
            type: blob.type || 'application/octet-stream'
          });

          Object.defineProperty(file, 'webkitRelativePath', {
            value: relativePath,
            writable: false
          });
          
          extractedFiles.push(file);
        } catch (error) {
          console.error(`Error extracting file ${relativePath}:`, error);
        }
      }

      if (extractedFiles.length === 0) {
        toast({
          title: "No Files Found",
          description: "No valid files found in the zip archive",
          variant: "destructive",
        });
        return;
      }

      await processFiles(extractedFiles);
    } catch (error) {
      console.error('Zip processing error:', error);
      toast({
        title: "Zip Processing Error",
        description: "Failed to process the zip file",
        variant: "destructive",
      });
    } finally {
      setProcessingZip(false);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user || !projectId) return;

    try {
      const keeperFileName = `${user.id}/${projectId}/${crypto.randomUUID()}_${folderName}/.folderkeeper`;
      const emptyFile = new Blob([''], { type: 'text/plain' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(keeperFileName, emptyFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: keeperFileName,
          original_filename: currentPath ? `${currentPath}/${folderName}/.folderkeeper` : `${folderName}/.folderkeeper`,
          file_size: 0,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          storage_path: uploadData.path,
          uploaded_by: user.id,
          description: 'Folder placeholder'
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `Folder "${folderName}" created successfully`,
      });

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Folder creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  // If this is a project page, show project-specific header
  if (projectId) {
    return (
      <>
        <header className="bg-white border-b border-gray-200 px-6 py-4">
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
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
                {project?.address && (
                  <p className="text-sm text-gray-600">{project.address}</p>
                )}
              </div>
            </div>
            
            {/* Show upload buttons only for Project Files */}
            {title === "Project Files" && (
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Choose Folder
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => zipInputRef.current?.click()} 
                  disabled={processingZip}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {processingZip ? "Processing..." : "Choose Zip File"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNewFolderModal(true)}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Hidden file inputs for Project Files */}
        {title === "Project Files" && (
          <>
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <input 
              ref={folderInputRef} 
              type="file" 
              {...{ webkitdirectory: "" } as any} 
              multiple 
              onChange={handleFolderUpload} 
              className="hidden" 
            />
            <input 
              ref={zipInputRef} 
              type="file" 
              accept=".zip" 
              onChange={handleZipUpload} 
              className="hidden" 
            />
            <NewFolderModal
              isOpen={showNewFolderModal}
              onClose={() => setShowNewFolderModal(false)}
              onCreateFolder={handleCreateFolder}
              parentPath={currentPath}
            />
          </>
        )}
      </>
    );
  }

  // Default dashboard header
  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black" />
            <div>
              <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-black hover:bg-gray-800 text-white"
              onClick={() => setIsNewProjectOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <NewProjectDialog 
        open={isNewProjectOpen} 
        onOpenChange={setIsNewProjectOpen} 
      />
    </>
  );
}
