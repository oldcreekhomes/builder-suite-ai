import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Universal file opener - works for all buckets and file types
 * Uses same-tab navigation to avoid any popup issues
 */
export function openFileViaRedirect(bucket: string, path: string, fileName?: string) {
  console.log('openFileViaRedirect called:', { bucket, path, fileName });
  
  const params = new URLSearchParams({
    bucket,
    path,
    ...(fileName && { fileName })
  });
  
  const redirectUrl = `/file-redirect?${params.toString()}`;
  console.log('Redirecting to:', redirectUrl);
  
  // Use same-tab navigation - no popup blockers, no new tabs
  window.location.assign(redirectUrl);
}

/**
 * Helper functions for different file types - all use openFileViaRedirect internally
 */
export function openProjectFile(filePath: string, fileName?: string) {
  openFileViaRedirect('project-files', filePath, fileName);
}

export function openIssueFile(filePath: string, fileName?: string) {
  // Use redirect approach for issue-files bucket (same as other file types)
  openFileViaRedirectNewTab('issue-files', filePath, fileName);
}

export function openProposalFile(fileName: string) {
  console.log('openProposalFile called with:', fileName);
  // Use redirect approach for project-files bucket (same as project files)
  openFileViaRedirectNewTab('project-files', `proposals/${fileName}`, fileName);
}

export function openSpecificationFile(filePath: string, fileName?: string) {
  console.log('openSpecificationFile called with:', { filePath, fileName });
  
  // Normalize the path - remove any "project-files/" prefix and ensure exactly one "specifications/" prefix
  let normalizedPath = filePath;
  if (normalizedPath.startsWith('project-files/specifications/')) {
    normalizedPath = normalizedPath.replace('project-files/specifications/', 'specifications/');
  } else if (normalizedPath.startsWith('project-files/')) {
    normalizedPath = normalizedPath.replace('project-files/', '');
  }
  if (!normalizedPath.startsWith('specifications/')) {
    normalizedPath = `specifications/${normalizedPath}`;
  }
  
  console.log('Normalized specification path:', normalizedPath);
  // Use redirect approach for project-files bucket (same as project files)
  openFileViaRedirectNewTab('project-files', normalizedPath, fileName);
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

/**
 * Open file via redirect page in new tab (avoids popup blockers)
 */
export function openFileViaRedirectNewTab(bucket: string, path: string, fileName?: string): void {
  const params = new URLSearchParams({
    bucket,
    path,
    ...(fileName && { fileName })
  });
  
  const redirectUrl = `/file-redirect?${params.toString()}`;
  console.log('Opening file via redirect:', redirectUrl);
  
  const newTab = window.open(redirectUrl, '_blank');
  if (!newTab) {
    // Fallback to same tab if new tab blocked
    console.log('New tab blocked, opening in same tab');
    window.location.href = redirectUrl;
  }
}

/**
 * Open project file directly in new tab using redirect approach
 */
export function openProjectFileDirectly(filePath: string, fileName?: string) {
  console.log('openProjectFileDirectly called with:', { filePath, fileName });
  openFileViaRedirectNewTab('project-files', filePath, fileName);
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