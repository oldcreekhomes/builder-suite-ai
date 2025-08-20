import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Safely opens a file in a new tab without being blocked by popup blockers.
 * Opens a blank tab immediately, then updates its URL once the file URL is ready.
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
  const { data, error } = await supabase.storage
    .from('issue-files')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
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