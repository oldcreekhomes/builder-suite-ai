
import { Card } from "@/components/ui/card";
import { Folder, ChevronRight, ChevronDown, Download, Share2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileGridFolderProps {
  folderPath: string;
  folderFiles: any[];
  isExpanded: boolean;
  isDragOver: boolean;
  onToggleFolder: (folderPath: string) => void;
  onDragOver: (e: React.DragEvent, folderName: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderName: string) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
}

export function FileGridFolder({
  folderPath,
  folderFiles,
  isExpanded,
  isDragOver,
  onToggleFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onShareFolder,
}: FileGridFolderProps) {
  
  const handleDownloadFolder = () => {
    // TODO: Implement folder download
    console.log('Download folder:', folderPath);
  };

  const handleShareFolder = () => {
    onShareFolder(folderPath, folderFiles);
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card 
          className={`p-3 cursor-pointer transition-colors ${
            isDragOver 
              ? 'bg-blue-100 border-blue-300' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={(e) => onDragOver(e, folderPath)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, folderPath)}
        >
      <div 
        className="flex items-center space-x-3"
        onClick={() => onToggleFolder(folderPath)}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
        <Folder className="h-6 w-6 text-blue-500" />
        <div>
          <h3 className="font-semibold text-gray-700">
            {folderPath === 'Root' ? 'Root Files' : folderPath}
          </h3>
          <p className="text-sm text-gray-500">
            {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}
            {isDragOver && (
              <span className="text-blue-600 ml-2">
                • Drop files here to upload to this folder
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleDownloadFolder}>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </ContextMenuItem>
        <ContextMenuItem onClick={handleShareFolder}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
