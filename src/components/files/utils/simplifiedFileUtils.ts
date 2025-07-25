import { ProjectFile } from "@/hooks/useProjectFiles";
import { ProjectFolder } from "@/hooks/useProjectFolders";

export interface FileTreeNode {
  type: 'file' | 'folder';
  name: string;
  path: string;
  parentPath?: string;
  children?: FileTreeNode[];
  file?: ProjectFile;
  folder?: ProjectFolder;
}

// Extract folder structure from existing files (backward compatibility)
const extractFoldersFromFiles = (files: ProjectFile[]): ProjectFolder[] => {
  const folderSet = new Set<string>();
  const folders: ProjectFolder[] = [];

  files.forEach(file => {
    // Skip folderkeeper files
    if (file.file_type === 'folderkeeper') return;
    
    const filePath = getFilePath(file.original_filename);
    const pathParts = filePath.split('/');
    
    // Build all folder paths for this file
    for (let i = 1; i < pathParts.length; i++) {
      const folderPath = pathParts.slice(0, i).join('/');
      if (!folderSet.has(folderPath)) {
        folderSet.add(folderPath);
        
        const parentPath = i > 1 ? pathParts.slice(0, i - 1).join('/') : null;
        const folderName = pathParts[i - 1];
        
        folders.push({
          id: `legacy-${folderPath}`,
          project_id: file.project_id,
          folder_path: folderPath,
          parent_path: parentPath,
          folder_name: folderName,
          created_by: file.uploaded_by,
          created_at: file.uploaded_at,
          updated_at: file.updated_at,
        });
      }
    }
  });

  return folders;
};

export const buildFileTree = (files: ProjectFile[], folders: ProjectFolder[]): FileTreeNode[] => {
  const tree: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  // If no explicit folders, extract from files for backward compatibility
  const allFolders = folders.length > 0 ? folders : extractFoldersFromFiles(files);

  // Create folder nodes
  allFolders.forEach(folder => {
    const node: FileTreeNode = {
      type: 'folder',
      name: folder.folder_name,
      path: folder.folder_path,
      parentPath: folder.parent_path || undefined,
      children: [],
      folder,
    };
    nodeMap.set(folder.folder_path, node);
  });

  // Create file nodes (skip folderkeeper files)
  files.filter(file => file.file_type !== 'folderkeeper').forEach(file => {
    const filePath = getFilePath(file.original_filename);
    const parentPath = getParentPath(filePath);
    
    const node: FileTreeNode = {
      type: 'file',
      name: getFileName(file.original_filename),
      path: filePath,
      parentPath,
      file,
    };
    
    if (parentPath) {
      nodeMap.set(filePath, node);
    } else {
      // Root level file
      tree.push(node);
    }
  });

  // Build tree structure
  nodeMap.forEach(node => {
    if (node.parentPath) {
      const parent = nodeMap.get(node.parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    } else if (node.type === 'folder') {
      tree.push(node);
    }
  });

  // Sort each level
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Alphabetical within same type
      return a.name.localeCompare(b.name);
    });
    
    // Recursively sort children
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(tree);
  return tree;
};

export const getFilePath = (originalFilename: string): string => {
  // Remove any leading slashes and normalize
  return originalFilename.replace(/^\/+/, '');
};

export const getFileName = (originalFilename: string): string => {
  const path = getFilePath(originalFilename);
  const parts = path.split('/');
  return parts[parts.length - 1];
};

export const getParentPath = (filePath: string): string | null => {
  const parts = filePath.split('/');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
};

export const getFolderDepth = (folderPath: string): number => {
  return folderPath.split('/').length;
};

export const isSubfolder = (folderPath: string, parentPath: string): boolean => {
  return folderPath.startsWith(parentPath + '/');
};

// File utility functions (keep existing ones that are still needed)
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType: string): string => {
  const type = fileType.toLowerCase();
  if (type.includes('image')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('video')) return '🎥';
  if (type.includes('audio')) return '🎵';
  if (type.includes('text') || type.includes('document')) return '📝';
  if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
  if (type.includes('archive') || type.includes('zip')) return '📦';
  return '📁';
};

export const getFileTypeColor = (fileType: string): string => {
  const type = fileType.toLowerCase();
  if (type.includes('image')) return 'text-blue-600';
  if (type.includes('pdf')) return 'text-red-600';
  if (type.includes('video')) return 'text-purple-600';
  if (type.includes('audio')) return 'text-green-600';
  if (type.includes('text') || type.includes('document')) return 'text-gray-600';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'text-emerald-600';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'text-orange-600';
  if (type.includes('archive') || type.includes('zip')) return 'text-yellow-600';
  return 'text-gray-500';
};
