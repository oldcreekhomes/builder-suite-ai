import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Main file opening function - now routes through a Supabase Edge Function that streams the file
export function openFileViaRedirect(bucket: string, path: string, fileName?: string) {
  console.log('openFileViaRedirect called:', { bucket, path, fileName });

  const base = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/file-proxy';
  const safeName = fileName || (path.split('/').pop() || 'download');
  const params = new URLSearchParams({
    bucket,
    path,
    filename: safeName,
    disposition: 'inline',
  });

  const proxyUrl = `${base}?${params.toString()}`;
  console.log('Opening proxy URL:', proxyUrl);
  
  // Open in new tab (avoid popup blockers with direct user gesture)
  window.open(proxyUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Direct public URL opening for project-files bucket (fast and reliable)
 */
export function openProjectFilePublic(filePath: string, fileName?: string) {
  console.log('openProjectFilePublic called with:', { filePath, fileName });
  
  // Build direct public URL
  const publicUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/${encodeURI(filePath)}`;
  
  console.log('Opening public URL:', publicUrl);
  window.open(publicUrl, '_blank');
}

/**
 * Programmatic download function - avoids popup blocking
 */
export async function downloadFile(fileUrl: string, fileName: string) {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Download started",
      description: `${fileName} is being downloaded`,
    });
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback to window.open
    window.open(fileUrl, '_blank');
  }
}

// Convenience functions for different file types
export const openProjectFile = (filePath: string, fileName?: string) => {
  openFileViaRedirect('project-files', filePath, fileName);
};

export const openIssueFile = (filePath: string, fileName?: string) => {
  openFileViaRedirect('issue-files', filePath, fileName);
};

export const openProposalFile = (fileName: string) => {
  openFileViaRedirect('project-files', `proposals/${fileName}`, fileName);
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
  openFileViaRedirect('project-files', finalPath, fileName || normalizedPath.split('/').pop());
};

// Helper to get project file storage path for specification files
export function getProjectFileStoragePath(fileRef: string): string {
  console.log('🔧 getProjectFileStoragePath input:', fileRef);
  
  // If it already has a folder prefix (like specifications/, bidding/, etc.), use as-is
  if (fileRef.includes('/')) {
    console.log('🔧 File already has path, using as-is:', fileRef);
    return fileRef;
  }
  
  // If it's just a filename without path, add specifications prefix (manual uploads)
  const storagePath = `specifications/${fileRef}`;
  console.log('🔧 Generated storage path for manual upload:', storagePath);
  
  return storagePath;
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use openFileViaRedirect instead
 */
export async function openInNewTabSafely(getUrlFn: () => Promise<string>) {
  // Open blank tab immediately to avoid popup blocker
  const newTab = window.open("", "_blank", "noopener,noreferrer");
  
  if (!newTab) {
    toast({
      title: "Error",
      description: "Popup blocked. Please allow popups for this site to open files.",
      variant: "destructive",
    });
    return;
  }

  try {
    // Get the file URL
    const url = await getUrlFn();
    
    // Set the new tab's location to the file URL
    newTab.location.href = url;
  } catch (error) {
    console.error('Error opening file:', error);
    
    // Close the blank tab on error
    newTab.close();
    
    toast({
      title: "Error",
      description: "Failed to open file",
      variant: "destructive",
    });
  }
}

/**
 * Get signed URL for issue files
 */
export async function getIssueFileUrl(filePath: string): Promise<string> {
  console.log('getIssueFileUrl called with filePath:', filePath);
  
  try {
    const { data, error } = await supabase.storage
      .from('issue-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Returning signed URL:', data.signedUrl);
    return data.signedUrl;
  } catch (err) {
    console.error('Error in getIssueFileUrl:', err);
    throw err;
  }
}

/**
 * Get URL for proposal files (tries signed URL first, falls back to public)
 */
export async function getProposalFileUrl(fileName: string): Promise<string> {
  // Try signed URL first
  const { data: signedData, error: signedError } = await supabase.storage
    .from('project-files')
    .createSignedUrl(`proposals/${fileName}`, 3600);
  
  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }
  
  // Fallback to public URL
  const { data } = supabase.storage
    .from('project-files')
    .getPublicUrl(`proposals/${fileName}`);
  
  if (!data?.publicUrl) {
    throw new Error('Failed to get file URL');
  }
  
  return data.publicUrl;
}

/**
 * Open proposal file directly using signed URL (like live version)
 */
export async function openProposalFileDirectly(fileName: string) {
  console.log('openProposalFileDirectly called with:', fileName);
  
  await openInNewTabSafely(async () => {
    // Get signed URL directly
    const { data: signedData, error: signedError } = await supabase.storage
      .from('project-files')
      .createSignedUrl(`proposals/${fileName}`, 3600);
    
    if (!signedError && signedData?.signedUrl) {
      console.log('Opening signed URL directly:', signedData.signedUrl);
      return signedData.signedUrl;
    }
    
    // Fallback to public URL
    const { data } = supabase.storage
      .from('project-files')
      .getPublicUrl(`proposals/${fileName}`);
    
    if (data?.publicUrl) {
      console.log('Opening public URL directly:', data.publicUrl);
      return data.publicUrl;
    }
    
    throw new Error('Failed to get file URL');
  });
}

/**
 * Open issue file directly using signed URL (like live version)
 */
export async function openIssueFileDirectly(filePath: string, fileName?: string) {
  console.log('openIssueFileDirectly called with:', { filePath, fileName });
  
  await openInNewTabSafely(async () => {
    // Get signed URL directly
    const { data: signedData, error: signedError } = await supabase.storage
      .from('issue-files')
      .createSignedUrl(filePath, 3600);
    
    if (!signedError && signedData?.signedUrl) {
      console.log('Opening signed URL directly:', signedData.signedUrl);
      return signedData.signedUrl;
    }
    
    // Fallback to public URL
    const { data } = supabase.storage
      .from('issue-files')
      .getPublicUrl(filePath);
    
    if (data?.publicUrl) {
      console.log('Opening public URL directly:', data.publicUrl);
      return data.publicUrl;
    }
    
    throw new Error('Failed to get file URL');
  });
}

/**
 * Open specification file directly using signed URL (like live version)
 */
export async function openSpecificationFileDirectly(filePath: string, fileName?: string) {
  console.log('openSpecificationFileDirectly called with:', { filePath, fileName });
  
  await openInNewTabSafely(async () => {
    // Get signed URL directly
    const { data: signedData, error: signedError } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 3600);
    
    if (!signedError && signedData?.signedUrl) {
      console.log('Opening signed URL directly:', signedData.signedUrl);
      return signedData.signedUrl;
    }
    
    // Fallback to public URL
    const { data } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);
    
    if (data?.publicUrl) {
      console.log('Opening public URL directly:', data.publicUrl);
      return data.publicUrl;
    }
    
    throw new Error('Failed to get file URL');
  });
}

/**
 * Get URL for project files (tries signed URL first, falls back to public)
 */
export async function getProjectFileUrl(filePath: string): Promise<string> {
  // Try signed URL first
  const { data: signedData, error: signedError } = await supabase.storage
    .from('project-files')
    .createSignedUrl(filePath, 3600);
  
  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }
  
  // Fallback to public URL
  const { data } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath);
  
  if (!data?.publicUrl) {
    throw new Error('Failed to get file URL');
  }
  
  return data.publicUrl;
}

// Legacy functions - kept for backward compatibility but now unused
// Most functions above are deprecated legacy code that should be cleaned up

/**
 * Open project file directly in new tab using redirect approach
 */
export function openProjectFileDirectly(filePath: string, fileName?: string) {
  console.log('openProjectFileDirectly called with:', { filePath, fileName });
  openFileViaRedirect('project-files', filePath, fileName);
}

/**
 * Get public URL for specification files
 */
export async function getSpecificationFileUrl(fileName: string): Promise<string> {
  // Handle both with and without 'specifications/' prefix
  const filePath = fileName.startsWith('specifications/') ? fileName : `specifications/${fileName}`;
  
  const { data } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath);
  
  if (!data?.publicUrl) {
    throw new Error('Failed to get file URL');
  }
  
  return data.publicUrl;
}