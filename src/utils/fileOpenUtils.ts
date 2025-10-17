import { toast } from "@/hooks/use-toast";

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
