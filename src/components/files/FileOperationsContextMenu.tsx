
import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FolderPlus, FileText, FolderOpen } from "lucide-react";

interface FileOperationsContextMenuProps {
  children: React.ReactNode;
  onNewFolder: () => void;
  onFileUpload: () => void;
  onFolderUpload: () => void;
}

export function FileOperationsContextMenu({
  children,
  onNewFolder,
  onFileUpload,
  onFolderUpload,
}: FileOperationsContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-white shadow-lg">
        <ContextMenuItem 
          onClick={onNewFolder}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <FolderPlus className="h-4 w-4" />
          <span>New folder</span>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={onFileUpload}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          <span>File upload</span>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={onFolderUpload}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Folder upload</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
