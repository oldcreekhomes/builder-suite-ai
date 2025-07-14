export const groupFilesByFolder = (files: any[]) => {
  const grouped: { [key: string]: any[] } = {};
  
  files.forEach(file => {
    // Skip folder placeholder files from being displayed
    if (file.file_type === 'folderkeeper') {
      return;
    }
    
    // Use original_filename which contains the full path
    const filePath = file.original_filename || file.filename || '';
    
    // Check if this is a loose file (dragged directly without folder)
    if (filePath.startsWith('__LOOSE_FILE__')) {
      // Add to special loose files group
      if (!grouped['__LOOSE_FILES__']) {
        grouped['__LOOSE_FILES__'] = [];
      }
      grouped['__LOOSE_FILES__'].push(file);
      return;
    }
    
    // Extract the folder path from the file path
    const pathParts = filePath.split('/');
    
    if (pathParts.length === 1) {
      // Root level file (legacy or files uploaded to specific folders) - treat as loose files
      if (!grouped['__LOOSE_FILES__']) {
        grouped['__LOOSE_FILES__'] = [];
      }
      grouped['__LOOSE_FILES__'].push(file);
    } else {
      // File is in a folder - use the complete folder path except the filename
      const folderPath = pathParts.slice(0, -1).join('/');
      
      if (!grouped[folderPath]) {
        grouped[folderPath] = [];
      }
      grouped[folderPath].push(file);
    }
  });
  
  // Add empty folders by checking for folderkeeper files
  files.forEach(file => {
    if (file.file_type === 'folderkeeper') {
      const filePath = file.original_filename || file.filename || '';
      const pathParts = filePath.split('/');
      
      if (pathParts.length > 1) {
        // Remove the .folderkeeper filename to get the folder path
        const folderPath = pathParts.slice(0, -1).join('/');
        
        if (!grouped[folderPath]) {
          grouped[folderPath] = [];
        }
      }
    }
  });
  
  return grouped;
};

export const sortFolders = (folderPaths: string[]) => {
  return folderPaths.sort((a, b) => {
    // Loose files always come last (like Google Drive)
    if (a === '__LOOSE_FILES__') return 1;
    if (b === '__LOOSE_FILES__') return -1;
    
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

export const getDisplayName = (originalFilename: string) => {
  if (!originalFilename) {
    return { fileName: 'Unknown', pathWithinFolder: null };
  }
  
  // Handle loose files
  if (originalFilename.startsWith('__LOOSE_FILE__')) {
    const fileName = originalFilename.replace('__LOOSE_FILE__', '');
    return { fileName, pathWithinFolder: null };
  }
  
  const pathParts = originalFilename.split('/');
  const fileName = pathParts[pathParts.length - 1];
  
  if (pathParts.length === 1) {
    // Root level file
    return { fileName, pathWithinFolder: null };
  } else {
    // File in folder - show relative path within folder
    const pathWithinFolder = pathParts.slice(1).join('/');
    return { fileName, pathWithinFolder };
  }
};

export const getFileTypeColor = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return 'bg-red-100 text-red-800';
    case 'doc':
    case 'docx':
      return 'bg-blue-100 text-blue-800';
    case 'xls':
    case 'xlsx':
      return 'bg-green-100 text-green-800';
    case 'ppt':
    case 'pptx':
      return 'bg-orange-100 text-orange-800';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return 'bg-purple-100 text-purple-800';
    case 'txt':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
