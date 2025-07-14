import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, FolderOpen, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FileOperationsContextMenu } from "@/components/files/FileOperationsContextMenu";
import { NewFolderModal } from "@/components/files/NewFolderModal";

interface PhotoUploadDropzoneProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export function PhotoUploadDropzone({ projectId, onUploadSuccess }: PhotoUploadDropzoneProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    uploading: boolean;
  }>>([]);

  const uploadPhoto = async (file: File, relativePath: string = '') => {
    if (!user) return;

    const fileId = crypto.randomUUID();
    const fileName = `${user.id}/${projectId}/photos/${fileId}_${relativePath || file.name}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName);

      // Save photo metadata to database
      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          project_id: projectId,
          url: publicUrl,
          description: relativePath || file.name,
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Photos dropped:', acceptedFiles);
    
    // Check if any files have webkitRelativePath (indicating folder drop)
    const hasRelativePaths = acceptedFiles.some(file => file.webkitRelativePath);
    console.log('Has relative paths (folder drop):', hasRelativePaths);
    
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      uploading: true,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      // For folder drops, use the full relative path. For individual files, just use filename
      let relativePath: string;
      if (hasRelativePaths && file.webkitRelativePath) {
        relativePath = file.webkitRelativePath;
        console.log('Using webkitRelativePath:', relativePath);
      } else {
        relativePath = file.name;
        console.log('Using filename:', relativePath);
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map((upload, index) => 
            upload.file === file 
              ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
              : upload
          )
        );
      }, 200);

      const success = await uploadPhoto(file, relativePath);
      
      clearInterval(progressInterval);
      
      setUploadingFiles(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, progress: 100, uploading: false }
            : upload
        )
      );

      if (success) {
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
          onUploadSuccess();
        }, 1000);
      }
    }
  }, [projectId, user, onUploadSuccess, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.HEIC']
    }
  });

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(file => 
      file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')
    );
    console.log('Photo folder files selected:', files);
    console.log('Files with webkitRelativePath:', files.map(f => ({ name: f.name, path: f.webkitRelativePath })));
    
    if (files.length > 0) {
      await onDrop(files);
    }
    
    event.target.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await onDrop(files);
    }
    event.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleChoosePhotos = () => {
    fileInputRef.current?.click();
  };

  const handleChoosePhotoFolder = () => {
    folderInputRef.current?.click();
  };

  const handleCreateFolder = async (folderName: string) => {
    // Simply show success message without creating any placeholder files
    console.log('Folder ready:', folderName);
    toast({
      title: "Folder Ready",
      description: `Folder "${folderName}" is ready. Upload photos to it to create the folder structure.`,
    });
    onUploadSuccess();
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <FileOperationsContextMenu
          onNewFolder={handleNewFolder}
          onFileUpload={handleChoosePhotos}
          onFolderUpload={handleChoosePhotoFolder}
        >
          <div
            {...getRootProps()}
            className={`p-8 text-center cursor-pointer ${
              isDragActive ? 'bg-blue-50 border-blue-400' : ''
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop photos here' : 'Upload photos or photo folders'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop photos or folders here, or click to select. Right-click for more options.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports: PNG, JPG, JPEG, GIF, BMP, WebP, SVG, HEIC (iPhone photos)
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button type="button" variant="outline" onClick={handleNewFolder} className="mt-4">
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
            </div>
          </div>
        </FileOperationsContextMenu>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.HEIC"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "" } as any)}
        multiple
        accept="image/*,.heic,.HEIC"
        onChange={handleFolderUpload}
        className="hidden"
      />

      {uploadingFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Uploading Photos</h4>
          <div className="space-y-3">
            {uploadingFiles.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Image className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {upload.file.webkitRelativePath || upload.file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.file)}
                      disabled={upload.uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress value={upload.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}
