import React, { useState } from 'react';
import { ProjectFile } from '@/hooks/useProjectFiles';
import { ProjectFolder, useCreateFolder, useDeleteFolder } from '@/hooks/useProjectFolders';
import { FileTreeNode, buildFileTree, formatFileSize, getFileIcon, getFileTypeColor } from './utils/simplifiedFileUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, Plus, Trash2, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimplifiedFileListProps {
  files: ProjectFile[];
  folders: ProjectFolder[];
  projectId: string;
  onFileSelect: (file: ProjectFile) => void;
  onRefresh: () => void;
  onShare: (file: ProjectFile) => void;
  onShareFolder: (folderPath: string, files: ProjectFile[]) => void;
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect: (file: ProjectFile) => void;
  onCreateFolder: (parentPath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onShare: (file: ProjectFile) => void;
  onShareFolder: (folderPath: string, files: ProjectFile[]) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  onFileSelect,
  onCreateFolder,
  onDeleteFolder,
  onShare,
  onShareFolder,
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const isExpanded = expandedFolders.has(node.path);
  const paddingLeft = depth * 20;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(`${node.path}/${newFolderName.trim()}`);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  const getFolderFiles = (folderPath: string, nodes: FileTreeNode[]): ProjectFile[] => {
    const files: ProjectFile[] = [];
    
    const collectFiles = (currentNodes: FileTreeNode[]) => {
      currentNodes.forEach(currentNode => {
        if (currentNode.type === 'file' && currentNode.file) {
          files.push(currentNode.file);
        } else if (currentNode.children) {
          collectFiles(currentNode.children);
        }
      });
    };

    const targetNode = findNodeByPath(nodes, folderPath);
    if (targetNode?.children) {
      collectFiles(targetNode.children);
    }

    return files;
  };

  const findNodeByPath = (nodes: FileTreeNode[], path: string): FileTreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer group"
          style={{ paddingLeft }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto"
            onClick={() => onToggleFolder(node.path)}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
          
          <div className="flex items-center gap-2 flex-1">
            {isExpanded ? <FolderOpen size={16} className="text-blue-500" /> : <Folder size={16} className="text-blue-500" />}
            <span className="font-medium">{node.name}</span>
            <span className="text-sm text-muted-foreground">
              ({node.children?.length || 0} items)
            </span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreatingFolder(true);
              }}
            >
              <Plus size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShareFolder(node.path, getFolderFiles(node.path, [node]));
              }}
            >
              <Share size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(node.path);
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {isCreatingFolder && (
          <div style={{ paddingLeft: paddingLeft + 20 }} className="p-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newFolderName.trim()) {
                  setIsCreatingFolder(false);
                }
              }}
              autoFocus
            />
          </div>
        )}

        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onFileSelect={onFileSelect}
                onCreateFolder={onCreateFolder}
                onDeleteFolder={onDeleteFolder}
                onShare={onShare}
                onShareFolder={onShareFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer group"
      style={{ paddingLeft }}
      onClick={() => node.file && onFileSelect(node.file)}
    >
      <div className="w-4" /> {/* Spacer for alignment */}
      <File size={16} className={cn("shrink-0", getFileTypeColor(node.file?.file_type || ''))} />
      <span className="flex-1 truncate">{node.name}</span>
      <span className="text-sm text-muted-foreground">
        {node.file && formatFileSize(node.file.file_size)}
      </span>
      <div className="opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            node.file && onShare(node.file);
          }}
        >
          <Share size={14} />
        </Button>
      </div>
    </div>
  );
};

export const SimplifiedFileList: React.FC<SimplifiedFileListProps> = ({
  files,
  folders,
  projectId,
  onFileSelect,
  onRefresh,
  onShare,
  onShareFolder,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false);
  const [newRootFolderName, setNewRootFolderName] = useState('');

  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();

  const fileTree = buildFileTree(files, folders);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async (folderPath: string) => {
    const parts = folderPath.split('/');
    const folderName = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;

    await createFolderMutation.mutateAsync({
      projectId,
      folderName,
      parentPath,
    });

    onRefresh();
  };

  const handleDeleteFolder = async (folderPath: string) => {
    await deleteFolderMutation.mutateAsync({
      projectId,
      folderPath,
    });

    onRefresh();
  };

  const handleCreateRootFolder = () => {
    if (newRootFolderName.trim()) {
      handleCreateFolder(newRootFolderName.trim());
      setNewRootFolderName('');
      setIsCreatingRootFolder(false);
    }
  };

  const handleRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateRootFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingRootFolder(false);
      setNewRootFolderName('');
    }
  };

  if (fileTree.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="text-muted-foreground">
            <Folder size={48} className="mx-auto mb-4 opacity-50" />
            <p>No files or folders yet</p>
            <p className="text-sm">Upload files or create folders to get started</p>
          </div>
          <Button
            onClick={() => setIsCreatingRootFolder(true)}
            variant="outline"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            Create Folder
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Files & Folders</h3>
        <Button
          onClick={() => setIsCreatingRootFolder(true)}
          variant="outline"
          size="sm"
        >
          <Plus size={16} className="mr-2" />
          Create Folder
        </Button>
      </div>

      <div className="p-2">
        {isCreatingRootFolder && (
          <div className="p-2 border-b">
            <Input
              value={newRootFolderName}
              onChange={(e) => setNewRootFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={handleRootKeyDown}
              onBlur={() => {
                if (!newRootFolderName.trim()) {
                  setIsCreatingRootFolder(false);
                }
              }}
              autoFocus
            />
          </div>
        )}

        {fileTree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onFileSelect={onFileSelect}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onShare={onShare}
            onShareFolder={onShareFolder}
          />
        ))}
      </div>
    </Card>
  );
};