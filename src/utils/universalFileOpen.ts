import { supabase } from "@/integrations/supabase/client";

// MIME type mapping for common file extensions
const getMimeType = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

/**
 * Universal file opener - works in ALL browsers using Claude.ai's blob strategy
 * Downloads file as blob, creates blob URL, opens in browser's native viewer
 */
export const openFileDirectly = async (bucket: string, path: string, fileName?: string) => {
  try {
    console.log('Opening file directly:', { bucket, path, fileName });
    
    // Download file as blob from Supabase
    const { data: blobData, error: blobError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (blobError || !blobData) {
      console.error('Failed to download file as blob:', blobError);
      // Fallback to public URL if blob download fails
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (publicData?.publicUrl) {
        const opened = window.open(publicData.publicUrl, '_blank');
        if (!opened) {
          console.warn('Popup blocked, triggering download instead');
          downloadFileFallback(publicData.publicUrl, fileName || path.split('/').pop() || 'file');
        }
      }
      return;
    }

    // Create blob URL with correct MIME type
    const mimeType = getMimeType(fileName || path);
    const blob = new Blob([blobData], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('Created blob URL:', blobUrl, 'with MIME type:', mimeType);
    
    // Open in new tab - works in ALL browsers
    const newWindow = window.open(blobUrl, '_blank');
    
    // Cleanup after delay (2 seconds should be enough for browser to load)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 2000);
    
    // Fallback if popup blocked
    if (!newWindow) {
      console.warn('Popup blocked, triggering download instead');
      downloadFileFallback(blobUrl, fileName || path.split('/').pop() || 'file');
      // Still cleanup the blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    }
    
  } catch (error) {
    console.error('Universal file open failed:', error);
    
    // Final fallback - try public URL
    try {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (publicData?.publicUrl) {
        window.open(publicData.publicUrl, '_blank');
      }
    } catch (fallbackError) {
      console.error('All file open methods failed:', fallbackError);
    }
  }
};

// Fallback download function for when popup is blocked
const downloadFileFallback = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Convenience functions for different file types
export const openProjectFile = (filePath: string, fileName?: string) => {
  openFileDirectly('project-files', filePath, fileName);
};

export const openIssueFile = (filePath: string, fileName?: string) => {
  openFileDirectly('issue-files', filePath, fileName);
};

export const openProposalFile = (fileName: string) => {
  openFileDirectly('project-files', `proposals/${fileName}`, fileName);
};

export const openSpecificationFile = (filePath: string, fileName?: string) => {
  // Normalize the path - remove any prefixes and ensure proper specifications path
  let normalizedPath = filePath;
  if (normalizedPath.startsWith('project-files/specifications/')) {
    normalizedPath = normalizedPath.replace('project-files/specifications/', '');
  } else if (normalizedPath.startsWith('project-files/')) {
    normalizedPath = normalizedPath.replace('project-files/', '');
  } else if (normalizedPath.startsWith('specifications/')) {
    normalizedPath = normalizedPath.replace('specifications/', '');
  }
  
  const finalPath = `specifications/${normalizedPath}`;
  openFileDirectly('project-files', finalPath, fileName || normalizedPath.split('/').pop());
};