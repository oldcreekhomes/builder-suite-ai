
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDisplayName = (filename: string) => {
  if (filename.includes('/')) {
    const parts = filename.split('/');
    const fileName = parts[parts.length - 1];
    const topLevelFolder = parts[0];
    const pathWithinFolder = parts.slice(1).join('/');
    return {
      fileName: fileName,
      topLevelFolder: topLevelFolder,
      pathWithinFolder: pathWithinFolder,
      isInFolder: true,
      fullPath: filename
    };
  }
  return {
    fileName: filename,
    topLevelFolder: '',
    pathWithinFolder: '',
    isInFolder: false,
    fullPath: filename
  };
};

export const getFileTypeColor = (fileType: string) => {
  const colors: { [key: string]: string } = {
    pdf: "bg-red-100 text-red-800",
    doc: "bg-blue-100 text-blue-800",
    docx: "bg-blue-100 text-blue-800",
    xls: "bg-green-100 text-green-800",
    xlsx: "bg-green-100 text-green-800",
    ppt: "bg-orange-100 text-orange-800",
    pptx: "bg-orange-100 text-orange-800",
    txt: "bg-gray-100 text-gray-800",
    jpg: "bg-purple-100 text-purple-800",
    jpeg: "bg-purple-100 text-purple-800",
    png: "bg-purple-100 text-purple-800",
    gif: "bg-purple-100 text-purple-800",
  };
  return colors[fileType] || "bg-gray-100 text-gray-800";
};
