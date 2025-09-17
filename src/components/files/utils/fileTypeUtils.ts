export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  TEXT = 'text',
  OFFICE = 'office',
  ARCHIVE = 'archive',
  UNKNOWN = 'unknown'
}

export function getFileType(fileName: string, mimeType?: string): FileType {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Check mime type first if available
  if (mimeType) {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType === 'application/pdf') return FileType.PDF;
    if (mimeType.startsWith('text/') || mimeType === 'application/json') return FileType.TEXT;
    if (
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) return FileType.OFFICE;
    if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('compressed')
    ) return FileType.ARCHIVE;
  }

  // Fallback to extension-based detection
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
    return FileType.IMAGE;
  }
  
  if (extension === 'pdf') {
    return FileType.PDF;
  }
  
  if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'yml', 'yaml'].includes(extension)) {
    return FileType.TEXT;
  }
  
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(extension)) {
    return FileType.OFFICE;
  }
  
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return FileType.ARCHIVE;
  }
  
  return FileType.UNKNOWN;
}

export function isPreviewable(fileType: FileType): boolean {
  return fileType === FileType.IMAGE || fileType === FileType.PDF || fileType === FileType.TEXT;
}