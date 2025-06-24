
import { Folder, ChevronRight, ChevronDown } from "lucide-react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface FolderHeaderProps {
  folderPath: string;
  photos: ProjectPhoto[];
  isExpanded: boolean;
  isDragActive: boolean;
  onToggleFolder: (folderPath: string) => void;
  getRootProps: () => any;
  getInputProps: () => any;
}

export function FolderHeader({
  folderPath,
  photos,
  isExpanded,
  isDragActive,
  onToggleFolder,
  getRootProps,
  getInputProps
}: FolderHeaderProps) {
  return (
    <div 
      {...getRootProps()}
      className={`flex items-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 transition-colors ${
        isDragActive ? 'bg-blue-50 border-blue-400' : ''
      }`}
    >
      <input {...getInputProps()} />
      <div 
        className="flex items-center space-x-2 flex-1"
        onClick={() => onToggleFolder(folderPath)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        <Folder className="h-5 w-5 text-blue-500" />
        <span className="font-semibold text-gray-700">
          {folderPath === 'Root' ? 'Root Photos' : folderPath}
        </span>
        <span className="text-sm text-gray-500">
          ({photos.length} photo{photos.length !== 1 ? 's' : ''})
        </span>
        {isDragActive && (
          <span className="text-sm text-blue-600 ml-auto">
            Drop photos here
          </span>
        )}
      </div>
    </div>
  );
}
