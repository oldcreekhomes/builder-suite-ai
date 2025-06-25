
export const groupFilesByFolder = (files: any[]) => {
  const grouped: { [key: string]: any[] } = {};
  
  files.forEach(file => {
    // Use original_filename which contains the full path
    const filePath = file.original_filename || file.filename || '';
    
    // Extract the folder path from the file path
    const pathParts = filePath.split('/');
    
    if (pathParts.length === 1) {
      // Root level file
      if (!grouped['Root']) {
        grouped['Root'] = [];
      }
      grouped['Root'].push(file);
    } else {
      // File is in a folder - use the complete folder path except the filename
      const folderPath = pathParts.slice(0, -1).join('/');
      
      if (!grouped[folderPath]) {
        grouped[folderPath] = [];
      }
      grouped[folderPath].push(file);
    }
  });
  
  return grouped;
};

export const sortFolders = (folderPaths: string[]) => {
  return folderPaths.sort((a, b) => {
    // Root folder always comes first
    if (a === 'Root') return -1;
    if (b === 'Root') return 1;
    
    // Sort by folder depth first (shallower folders first)
    const aDepth = a.split('/').length;
    const bDepth = b.split('/').length;
    
    if (aDepth !== bDepth) {
      return aDepth - bDepth;
    }
    
    // If same depth, sort alphabetically
    return a.localeCompare(b);
  });
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📽️';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return '🖼️';
    case 'txt':
      return '📃';
    default:
      return '📁';
  }
};
