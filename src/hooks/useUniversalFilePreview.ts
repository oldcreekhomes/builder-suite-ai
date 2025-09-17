import { useState } from "react";
import { UniversalFile } from "@/components/files/FilePreviewModal";
import { 
  openProjectFile as openProjectFileDirectly, 
  openIssueFile as openIssueFileDirectly, 
  openProposalFile as openProposalFileDirectly, 
  openSpecificationFile as openSpecificationFileDirectly 
} from '@/utils/universalFileOpen';

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

  // Convenience functions that bypass the modal and open directly in browser
  const openProjectFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    // For now, use direct opening - can be toggled back to modal if needed
    openProjectFileDirectly(filePath, fileName);
  };

  const openIssueFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openIssueFileDirectly(filePath, fileName);
  };

  const openProposalFile = (fileName: string, additionalData?: Partial<UniversalFile>) => {
    openProposalFileDirectly(fileName);
  };

  const openSpecificationFile = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openSpecificationFileDirectly(filePath, fileName);
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