import { useState } from "react";
import { UniversalFile } from "@/components/files/FilePreviewModal";

export function useUniversalFilePreview() {
  const [previewFile, setPreviewFile] = useState<UniversalFile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openFile = (file: {
    id?: string;
    name: string;
    size?: number;
    mimeType?: string;
    bucket: string;
    path: string;
    url?: string;
    uploadedAt?: string;
    uploadedBy?: string;
    description?: string;
  }) => {
    setPreviewFile(file);
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
    setPreviewFile(null);
  };

  // Convenience functions for different file types
  const openProjectFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'project-files',
      path: filePath,
      ...additionalData
    });
  };

  const openIssueFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'issue-files',
      path: filePath,
      ...additionalData
    });
  };

  const openProposalFile = (fileName: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName,
      bucket: 'project-files',
      path: `proposals/${fileName}`,
      ...additionalData
    });
  };

  const openSpecificationFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    // Normalize the path - remove any prefixes and ensure proper specifications path
    let normalizedPath = filePath;
    if (normalizedPath.startsWith('project-files/specifications/')) {
      normalizedPath = normalizedPath.replace('project-files/specifications/', '');
    } else if (normalizedPath.startsWith('project-files/')) {
      normalizedPath = normalizedPath.replace('project-files/', '');
    } else if (normalizedPath.startsWith('specifications/')) {
      normalizedPath = normalizedPath.replace('specifications/', '');
    }
    
    const finalPath = `specifications/${normalizedPath}`;
    
    openFile({
      name: fileName || normalizedPath.split('/').pop() || normalizedPath,
      bucket: 'project-files',
      path: finalPath,
      ...additionalData
    });
  };

  return {
    previewFile,
    isOpen,
    openFile,
    closePreview,
    openProjectFile,
    openIssueFile,
    openProposalFile,
    openSpecificationFile
  };
}