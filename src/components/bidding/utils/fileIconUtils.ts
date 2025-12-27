import { FileSpreadsheet, FileType, File, FileText } from 'lucide-react';

/**
 * Extracts the clean, human-readable filename from a storage path.
 * Removes common prefixes like proposal_UUID_TIMESTAMP_ and TIMESTAMP_
 */
export const getCleanFileName = (fileName: string): string => {
  // First, get just the filename if there's a path
  let cleanName = fileName.split('/').pop() || fileName;
  
  // Pattern 1: proposal_UUID_TIMESTAMP_originalname.ext
  // UUID format: 8-4-4-4-12 hex chars
  const proposalPattern = /^proposal_[a-f0-9-]{36}_\d+_(.+)$/i;
  const proposalMatch = cleanName.match(proposalPattern);
  if (proposalMatch) {
    return proposalMatch[1];
  }
  
  // Pattern 2: TIMESTAMP_originalname.ext (13-digit timestamp)
  const timestampPattern = /^\d{13}_(.+)$/;
  const timestampMatch = cleanName.match(timestampPattern);
  if (timestampMatch) {
    return timestampMatch[1];
  }
  
  // Return as-is if no patterns match
  return cleanName;
};

export const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'xlsx':
    case 'xls':
      return FileSpreadsheet;
    case 'docx':
    case 'doc':
      return FileType;
    case 'pdf':
      return File;
    default:
      return FileText;
  }
};

export const getFileIconColor = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'text-red-600 hover:text-red-800';
    case 'xlsx':
    case 'xls':
      return 'text-green-600 hover:text-green-800';
    case 'docx':
    case 'doc':
      return 'text-blue-600 hover:text-blue-800';
    default:
      return 'text-gray-600 hover:text-gray-800';
  }
};