import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { convertHeicToJpeg, updateHeicPath, ConversionResult } from "@/utils/heicConverter";

interface PhotoUploadDropzoneProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export interface PhotoUploadDropzoneHandle {
  dropFiles: (files: File[]) => void;
}

export const PhotoUploadDropzone = forwardRef<PhotoUploadDropzoneHandle, PhotoUploadDropzoneProps>(
  ({ projectId, onUploadSuccess }, ref) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [uploadingFiles, setUploadingFiles] = useState<Array<{
      file: File;
      progress: number;
      uploading: boolean;
    }>>([]);

    const uploadPhoto = async (file: File, relativePath: string = '') => {
      if (!user) return false;

      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "ERROR",
          description: "File over 50 MB's. Please reduce file size.",
          variant: "destructive",
        });
        return false;
      }

      try {
        const conversionResult: ConversionResult = await convertHeicToJpeg(file);
        
        if (!conversionResult.wasConverted && conversionResult.error) {
          throw new Error(conversionResult.error);
        }
        
        const fileId = crypto.randomUUID();
        const processedRelativePath = relativePath === file.name ? conversionResult.file.name : 
          (conversionResult.wasConverted ? updateHeicPath(relativePath) : relativePath);
        const fileName = `${user.id}/${projectId}/photos/${fileId}_${processedRelativePath}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, conversionResult.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('project_photos')
          .insert({
            project_id: projectId,
            url: publicUrl,
            description: processedRelativePath,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        if (conversionResult.wasConverted) {
          toast({
            title: "HEIC Converted",
            description: `Successfully converted ${file.name} to JPEG using ${conversionResult.strategy}`,
          });
        }

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
        
        let relativePath: string;
        if (hasRelativePaths && file.webkitRelativePath) {
          relativePath = file.webkitRelativePath;
        } else {
          relativePath = file.name;
        }
        
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map((upload) => 
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

    useImperativeHandle(ref, () => ({
      dropFiles: (files: File[]) => onDrop(files),
    }), [onDrop]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: true,
      noClick: true,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.HEIC']
      }
    });

    const removeUpload = (file: File) => {
      setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
    };

    return (
      <div className="space-y-4">
        <Card>
          <div
            {...getRootProps()}
            className={`p-8 text-center cursor-pointer ${
              isDragActive ? 'bg-blue-50 border-blue-400' : ''
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop photos here' : 'Upload photos by dragging and dropping here'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop photos or folders here, or use the buttons in the header to select files.
            </p>
            <p className="text-sm text-gray-500">
              Supports: PNG, JPG, JPEG, GIF, BMP, WebP, SVG, HEIC (iPhone photos)
            </p>
          </div>
        </Card>

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
      </div>
    );
  }
);

PhotoUploadDropzone.displayName = "PhotoUploadDropzone";
