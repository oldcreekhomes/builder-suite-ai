import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Universal file opener - works for all buckets and file types
 * Uses redirect approach to avoid popup blockers completely
 */
export function openFileViaRedirect(bucket: string, path: string, fileName?: string) {
  console.log('openFileViaRedirect called:', { bucket, path, fileName });
  
  const params = new URLSearchParams({
    bucket,
    path,
    ...(fileName && { fileName })
  });
  
  const redirectUrl = `/file-redirect?${params.toString()}`;
  
  // Create temporary anchor element and click it (no popup blocker issues)
  const link = document.createElement('a');
  link.href = redirectUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper functions for different file types - all use openFileViaRedirect internally
 */
export function openProjectFile(filePath: string, fileName?: string) {
  openFileViaRedirect('project-files', filePath, fileName);
}

export function openIssueFile(filePath: string, fileName?: string) {
  openFileViaRedirect('issue-files', filePath, fileName);
}

export function openProposalFile(fileName: string) {
  openFileViaRedirect('project-files', `proposals/${fileName}`, fileName);
}

export function openSpecificationFile(filePath: string, fileName?: string) {
  const fullPath = filePath.startsWith('specifications/') ? filePath : `specifications/${filePath}`;
  openFileViaRedirect('project-files', fullPath, fileName);
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