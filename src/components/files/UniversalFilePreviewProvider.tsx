import React, { createContext, useContext } from "react";
import { FilePreviewModal, UniversalFile } from "./FilePreviewModal";
import { useUniversalFilePreview } from "@/hooks/useUniversalFilePreview";

interface UniversalFilePreviewContextType {
  openFile: (file: UniversalFile) => void;
  openProjectFile: (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => void;
  openIssueFile: (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => void;
  openProposalFile: (fileName: string, additionalData?: Partial<UniversalFile>) => void;
  openSpecificationFile: (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => void;
}

const UniversalFilePreviewContext = createContext<UniversalFilePreviewContextType | null>(null);

export function useUniversalFilePreviewContext() {
  const context = useContext(UniversalFilePreviewContext);
  if (!context) {
    throw new Error('useUniversalFilePreviewContext must be used within a UniversalFilePreviewProvider');
  }
  return context;
}

interface UniversalFilePreviewProviderProps {
  children: React.ReactNode;
  onFileDeleted?: () => void;
}

export function UniversalFilePreviewProvider({ children, onFileDeleted }: UniversalFilePreviewProviderProps) {
  const {
    previewFile,
    isOpen,
    closePreview,
    openFile,
    openProjectFile,
    openIssueFile,
    openProposalFile,
    openSpecificationFile
  } = useUniversalFilePreview();

  const contextValue: UniversalFilePreviewContextType = {
    openFile,
    openProjectFile,
    openIssueFile,
    openProposalFile,
    openSpecificationFile
  };

  return (
    <UniversalFilePreviewContext.Provider value={contextValue}>
      {children}
      <FilePreviewModal
        file={previewFile}
        isOpen={isOpen}
        onClose={closePreview}
        onFileDeleted={onFileDeleted}
      />
    </UniversalFilePreviewContext.Provider>
  );
}