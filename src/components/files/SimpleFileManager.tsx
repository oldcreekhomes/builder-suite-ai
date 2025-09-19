import React, { useState, useRef } from 'react';
import { FolderPlus, FileText, FolderOpen, Archive, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useProjectFolders } from '@/hooks/useProjectFolders';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UniversalFilePreviewProvider } from '@/components/files/UniversalFilePreviewProvider';
import { SimpleFileList } from './SimpleFileList';
import { SimpleBreadcrumb } from './SimpleBreadcrumb';
import { NewFolderModal } from './NewFolderModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface SimpleFileManagerProps {
  projectId: string;
  refreshKey?: number;
  onUploadSuccess?: () => void;
}

export const SimpleFileManager: React.FC<SimpleFileManagerProps> = ({ 
  projectId, 
  refreshKey,
  onUploadSuccess
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [processingZip, setProcessingZip] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    id: string;
    file: File;
    progress: number;
    uploading: boolean;
    relativePath: string;
    xhr?: XMLHttpRequest;
  }>>([]);
  const { user } = useAuth();
  const { toast: useToastHook } = useToast();
  const { data: allFiles = [], refetch } = useProjectFiles(projectId);
  const { data: folderRows = [], refetch: refetchFolders } = useProjectFolders(projectId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Trigger refetch when refreshKey changes
  React.useEffect(() => {
    if (refreshKey) {
      refetch();
      refetchFolders();
    }
  }, [refreshKey, refetch, refetchFolders]);

  // Get files and folders for current path (filter out folderkeeper files)
  const getCurrentItems = () => {
    // Helper to normalize any path variations (slashes, spaces, duplicates)
    const normalizePath = (p?: string) => {
      if (!p) return '';
      return p
        .replace(/\\/g, '/') // windows to unix
        .replace(/\s+\/\s+/g, '/') // trim spaces around slashes
        .replace(/\/+/g, '/') // collapse multiple slashes
        .replace(/^\//, '') // remove leading slash
        .replace(/\/$/, '') // remove trailing slash
        .trim();
    };

    const normalizedCurrentPath = normalizePath(currentPath);

    const folders = new Set<string>();
    const files: any[] = [];

    // Debug snapshot
    console.groupCollapsed('[FileManager] getCurrentItems');
    console.log('currentPath (raw):', currentPath);
    console.log('currentPath (normalized):', normalizedCurrentPath);
    console.log('total files loaded:', allFiles.length);

    allFiles.forEach(file => {
      // Prefer original_filename for virtual pathing
      let filePath = normalizePath(file.original_filename);

      if (!filePath) return; // safety

      if (normalizedCurrentPath) {
        // We're in a subfolder
        if (!(filePath + '/').startsWith(normalizedCurrentPath + '/')) return;

        const remainingPath = filePath.substring(normalizedCurrentPath.length + 1);
        const nextSlash = remainingPath.indexOf('/');

        if (nextSlash === -1) {
          // It's a file in current folder (skip folderkeeper files)
          if (file.file_type !== 'folderkeeper') {
            files.push({
              ...file,
              displayName: remainingPath,
              original_filename: file.original_filename
            });
          }
        } else {
          // It's a direct child folder
          const folderName = remainingPath.substring(0, nextSlash);
          if (folderName) folders.add(folderName);
        }
      } else {
        // We're at root
        const firstSlash = filePath.indexOf('/');

        if (firstSlash === -1) {
          // Root level file (skip folderkeeper files)
          if (file.file_type !== 'folderkeeper') {
            files.push({
              ...file,
              displayName: filePath,
              original_filename: file.original_filename
            });
          }
        } else {
          // Root level folder
          const folderName = filePath.substring(0, firstSlash);
          if (folderName) folders.add(folderName);
        }
      }
    });

    // Include folders from project_folders (authoritative)
    if (folderRows && folderRows.length > 0) {
      folderRows.forEach((fr: any) => {
        const frParent = normalizePath(fr.parent_path || '');
        if (!normalizedCurrentPath) {
          if (!fr.parent_path || frParent === '') {
            if (fr.folder_name) folders.add(fr.folder_name);
          }
        } else {
          if (frParent === normalizedCurrentPath) {
            if (fr.folder_name) folders.add(fr.folder_name);
          }
        }
      });
    }

    // Sort folders alphabetically (case-insensitive)
    const sortedFolders = Array.from(folders)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(name => ({
        name,
        path: normalizedCurrentPath ? `${normalizedCurrentPath}/${name}` : name
      }));

    // Sort files alphabetically by display name (case-insensitive)
    const sortedFiles = files.sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );

    console.log('folders found:', sortedFolders.map(f => f.path));
    console.log('files found:', sortedFiles.map(f => f.displayName).slice(0, 25));
    console.groupEnd();

    return {
      folders: sortedFolders,
      files: sortedFiles
    };
  };

  const { folders, files } = getCurrentItems();

  const handleFolderClick = (folderPath: string) => {
    console.info('[FileManager] navigate ->', folderPath);
    setCurrentPath(folderPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    console.info('[FileManager] breadcrumb ->', path || '(root)');
    setCurrentPath(path);
  };

  const handleUploadSuccess = () => {
    refetch();
    refetchFolders();
    if (onUploadSuccess) {
      onUploadSuccess();
    }
    toast.success('File uploaded successfully');
  };

  // File upload helpers
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

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

    // Check file size limit
    if (file.size > MAX_FILE_SIZE) {
      useToastHook({
        title: "ERROR",
        description: "File over 50 MB's. Please reduce file size.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const uploadFile = async (file: File, relativePath: string = '', uploadId?: string) => {
    if (!user) return false;
    const fileId = crypto.randomUUID();
    const fileName = `${projectId}/${fileId}_${relativePath || file.name}`;
    
    try {
      // Get signed upload URL
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('project-files')
        .createSignedUploadUrl(fileName);
      
      if (signedUrlError) throw signedUrlError;

      return new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        
        // Update the upload item with xhr reference
        if (uploadId) {
          setUploadingFiles(prev => 
            prev.map(item => 
              item.id === uploadId ? { ...item, xhr, uploading: true } : item
            )
          );
        }

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && uploadId) {
            const progress = Math.round((event.loaded / event.total) * 80); // Use 80% for upload progress
            setUploadingFiles(prev => 
              prev.map(item => 
                item.id === uploadId ? { ...item, progress } : item
              )
            );
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              // Update progress for database save
              if (uploadId) {
                setUploadingFiles(prev => 
                  prev.map(item => 
                    item.id === uploadId ? { ...item, progress: 90 } : item
                  )
                );
              }

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
                  storage_path: fileName,
                  uploaded_by: user.id,
                });
              
              if (dbError) throw dbError;

              // Update progress to complete
              if (uploadId) {
                setUploadingFiles(prev => 
                  prev.map(item => 
                    item.id === uploadId ? { ...item, progress: 100, uploading: false, xhr: undefined } : item
                  )
                );
                
                // Remove from list after a short delay
                setTimeout(() => {
                  setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
                }, 2000);
              }

              resolve(true);
            } catch (error) {
              console.error('Database error:', error);
              
              if (uploadId) {
                setUploadingFiles(prev => 
                  prev.map(item => 
                    item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
                  )
                );
              }
              
              useToastHook({
                title: "Upload Error",
                description: `Failed to save ${relativePath || file.name} to database`,
                variant: "destructive",
              });
              resolve(false);
            }
          } else {
            // Upload failed
            if (uploadId) {
              setUploadingFiles(prev => 
                prev.map(item => 
                  item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
                )
              );
            }
            
            useToastHook({
              title: "Upload Error",
              description: `Failed to upload ${relativePath || file.name}`,
              variant: "destructive",
            });
            resolve(false);
          }
        });

        xhr.addEventListener('error', () => {
          if (uploadId) {
            setUploadingFiles(prev => 
              prev.map(item => 
                item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
              )
            );
          }
          
          useToastHook({
            title: "Upload Error",
            description: `Network error uploading ${relativePath || file.name}`,
            variant: "destructive",
          });
          resolve(false);
        });

        xhr.addEventListener('abort', () => {
          if (uploadId) {
            setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
          }
          resolve(false);
        });

        xhr.open('PUT', signedUrl);
        xhr.send(file);
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      if (uploadId) {
        setUploadingFiles(prev => 
          prev.map(item => 
            item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
          )
        );
      }
      
      useToastHook({
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
      // Don't show generic "No Valid Files" message if files were rejected due to size
      const hasOversizedFiles = files.some(f => f.size > MAX_FILE_SIZE);
      if (!hasOversizedFiles) {
        useToastHook({
          title: "No Valid Files",
          description: "No valid files found to upload",
        });
      }
      return;
    }

    // Check if any files are too large (already handled in isValidFile, but double-check)
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0 && validFiles.length === 0) {
      // All files were oversized
      return;
    }

    // Add files to upload queue with initial progress
    const uploadItems = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      uploading: true,
      relativePath: file.webkitRelativePath || file.name,
      xhr: undefined
    }));

    setUploadingFiles(prev => [...prev, ...uploadItems]);
    
    useToastHook({
      title: "Upload Started",
      description: `Starting upload of ${validFiles.length} file(s)`,
    });

    // Upload files one by one
    let successCount = 0;
    for (const uploadItem of uploadItems) {
      const success = await uploadFile(uploadItem.file, uploadItem.relativePath, uploadItem.id);
      if (success) successCount++;
    }

    if (successCount > 0) {
      useToastHook({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} of ${validFiles.length} file(s)`,
      });
      handleUploadSuccess();
    }
  };

  const cancelUpload = (uploadId: string) => {
    setUploadingFiles(prev => {
      const upload = prev.find(item => item.id === uploadId);
      if (upload?.xhr) {
        upload.xhr.abort();
      }
      return prev.filter(item => item.id !== uploadId);
    });
  };

  const removeUpload = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
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
      useToastHook({
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
    if (!user) return;
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
        useToastHook({
          title: "No Files Found",
          description: "No valid files found in the zip archive",
          variant: "destructive",
        });
        return;
      }

      await processFiles(extractedFiles);
    } catch (error) {
      console.error('Zip processing error:', error);
      useToastHook({
        title: "Zip Processing Error",
        description: "Failed to process the zip file",
        variant: "destructive",
      });
    } finally {
      setProcessingZip(false);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;

    try {
      // Trim and validate folder name
      const trimmedFolderName = folderName.trim();
      if (!trimmedFolderName) {
        toast.error('Folder name cannot be empty');
        return;
      }
      
      if (trimmedFolderName.includes('/') || trimmedFolderName.includes('\\')) {
        toast.error('Folder name cannot contain slashes');
        return;
      }

      const folderPath = currentPath ? `${currentPath}/${trimmedFolderName}` : trimmedFolderName;
      const fileName = `${folderPath}/.folderkeeper`;
      const storageFileName = `${projectId}/${fileName}`;
      
      console.log(`🔍 Creating folder "${trimmedFolderName}" at path: "${folderPath}"`);
      
      // Step 1: Check if folder already exists in database
      const { data: existingDBFiles } = await supabase
        .from('project_files')
        .select('id, original_filename, file_type')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .eq('original_filename', fileName);

      // Step 2: Check if storage file exists
      const { data: storageFile, error: storageError } = await supabase.storage
        .from('project-files')
        .download(storageFileName);
      
      const storageExists = storageFile && !storageError;
      console.log(`📁 Storage check: ${storageExists ? 'EXISTS' : 'NOT FOUND'}`);
      console.log(`🗄️ Database check: ${existingDBFiles?.length ? 'EXISTS' : 'NOT FOUND'}`);

      // Step 3: Handle different scenarios
      if (existingDBFiles && existingDBFiles.length > 0) {
        // Folder exists in database - show error
        console.log('❌ Folder already exists in database');
        toast.error('A folder with this name already exists');
        return;
      }

      if (storageExists) {
        // Storage file exists but no DB record - auto-heal by creating DB record
        console.log('🔧 Auto-healing: Storage exists but no DB record, creating DB entry...');
        
        const { error: healError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId,
            filename: storageFileName,
            original_filename: fileName,
            file_type: 'folderkeeper',
            mime_type: 'text/plain',
            file_size: 0,
            storage_path: storageFileName.replace(`${projectId}/`, ''),
            uploaded_by: user.id,
          });

        if (healError) {
          console.error('❌ Auto-heal failed:', healError);
          toast.error(`Failed to create folder: ${healError.message}`);
          return;
        }

        console.log('✅ Auto-heal successful');
        refetch();
        refetchFolders();
        toast.success('Folder created successfully');
        setShowNewFolderModal(false);
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        return;
      }

      // Step 4: Check if there are any files in this folder path (existing folder without folderkeeper)
      const { data: folderFiles } = await supabase
        .from('project_files')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', `${folderPath}/%`)
        .limit(1);

      if (folderFiles && folderFiles.length > 0) {
        console.log('❌ Folder path already has files');
        toast.error('A folder with this name already exists');
        return;
      }

      // Step 5: Create new folder (both storage and database)
      console.log('📝 Creating new folder...');
      
      // Create folderkeeper file
      const folderKeeperContent = new Blob([''], { type: 'text/plain' });
      const folderKeeperFile = new File([folderKeeperContent], '.folderkeeper', { type: 'text/plain' });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storageFileName, folderKeeperFile, {
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        
        // Handle the case where storage upload fails due to existing file
        if (uploadError.message?.includes('already exists') || uploadError.message?.includes('duplicate')) {
          console.log('🔄 Storage file already exists, attempting auto-heal...');
          
          // Try to create just the DB record since storage already exists
          const { error: dbError } = await supabase
            .from('project_files')
            .insert({
              project_id: projectId,
              filename: storageFileName,
              original_filename: fileName,
              file_type: 'folderkeeper',
              mime_type: 'text/plain',
              file_size: 0,
              storage_path: storageFileName.replace(`${projectId}/`, ''),
              uploaded_by: user.id,
            });

          if (dbError) {
            console.error('❌ DB record creation failed:', dbError);
            toast.error(`Failed to create folder: ${dbError.message}`);
            return;
          }

           console.log('✅ Auto-heal successful after storage conflict');
           refetch();
           refetchFolders();
           toast.success('Folder created successfully');
          setShowNewFolderModal(false);
          
          if (onUploadSuccess) {
            onUploadSuccess();
          }
          return;
        } else {
          toast.error(`Failed to create folder: ${uploadError.message}`);
          return;
        }
      }

      // Step 6: Create database record
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: storageFileName,
          original_filename: fileName,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          file_size: 0,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        // Try to clean up the storage file if DB insert failed
        await supabase.storage.from('project-files').remove([storageFileName]);
        toast.error(`Failed to create folder: ${dbError.message}`);
        return;
      }

      console.log('✅ Folder created successfully');
      refetch();
      refetchFolders();
      toast.success('Folder created successfully');
      setShowNewFolderModal(false);
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      toast.error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <UniversalFilePreviewProvider onFileDeleted={() => refetch()}>
      <div className="flex flex-col h-full">
      {/* Breadcrumb Navigation with Upload Buttons */}
      <div className="flex flex-col gap-2 p-4 border-b">
        <div className="flex items-center justify-between gap-4">
          <SimpleBreadcrumb 
            currentPath={currentPath} 
            onPathClick={handleBreadcrumbClick} 
          />
          
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
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum file size: 50MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="border-b bg-background">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">Uploading Files</h3>
            <div className="space-y-2 max-h-32 overflow-auto">
              {uploadingFiles.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={upload.progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground min-w-0">
                        {upload.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {upload.uploading ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelUpload(upload.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        title="Cancel upload"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(upload.id)}
                        className="h-6 w-6 p-0"
                        title="Remove from list"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 50MB
            </p>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
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

      {/* File List */}
      <div className="flex-1 overflow-auto">
        <SimpleFileList
          folders={folders}
          files={files}
          onFolderClick={handleFolderClick}
          onRefresh={refetch}
          projectId={projectId}
          currentPath={currentPath}
          onCreateFolder={handleCreateFolder}
        />
      </div>

      {/* Modals */}
      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
        parentPath={currentPath}
      />
      </div>
    </UniversalFilePreviewProvider>
  );
};
