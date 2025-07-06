import { FileSpreadsheet, FileType, File, FileText } from 'lucide-react';

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