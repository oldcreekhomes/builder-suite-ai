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
    // Strip accidental bucket prefix
    let normalizedPath = filePath;
    if (normalizedPath.startsWith('project-files/')) {
      normalizedPath = normalizedPath.replace('project-files/', '');
    }

    // Known top-level folders inside the project-files bucket
    const topLevelFolders = ['specifications/', 'bidding/', 'proposals/', 'purchase-orders/', 'journal-entries/', 'checks/', 'deposits/', 'credit-cards/'];
    const alreadyHasFolder = topLevelFolders.some(folder => normalizedPath.startsWith(folder));

    // Only wrap bare filenames (no '/') in 'specifications/'.
    // If path already contains a top-level folder OR any subfolder, use as-is.
    const finalPath = alreadyHasFolder || normalizedPath.includes('/')
      ? normalizedPath
      : `specifications/${normalizedPath}`;

    openFile({
      name: fileName || finalPath.split('/').pop() || finalPath,
      bucket: 'project-files',
      path: finalPath,
      ...additionalData
    });
  };

  const openBillAttachment = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'bill-attachments',
      path: filePath,
      ...additionalData
    });
  };

  const openJournalEntryAttachment = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'project-files',
      path: filePath,
      ...additionalData
    });
  };

  const openCheckAttachment = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'project-files',
      path: filePath,
      ...additionalData
    });
  };

  const openDepositAttachment = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'project-files',
      path: filePath,
      ...additionalData
    });
  };

  const openCreditCardAttachment = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'project-files',
      path: filePath,
      ...additionalData
    });
  };

  const openInsuranceCertificate = (filePath: string, fileName?: string, additionalData?: Partial<UniversalFile>) => {
    openFile({
      name: fileName || filePath.split('/').pop() || filePath,
      bucket: 'insurance-certificates',
      path: filePath,
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
    openSpecificationFile,
    openBillAttachment,
    openJournalEntryAttachment,
    openCheckAttachment,
    openDepositAttachment,
    openCreditCardAttachment,
    openInsuranceCertificate
  };
}