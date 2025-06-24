
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export const useFolderDownload = () => {
  const { toast } = useToast();

  const downloadFolder = async (folderPath: string, photos: ProjectPhoto[]) => {
    const zip = new JSZip();
    const folderName = folderPath === 'Root' ? 'Root Photos' : folderPath;
    
    toast({
      title: "Preparing Download",
      description: `Creating zip file for ${folderName}...`,
    });

    try {
      // Add all photos to the zip
      for (const photo of photos) {
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          
          // Extract file extension from URL or use a default
          const urlParts = photo.url.split('.');
          const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
          
          // Create a filename, using description if available
          let fileName = photo.description || `photo-${photo.id}`;
          
          // If description contains folder path, extract just the filename
          if (fileName.includes('/')) {
            fileName = fileName.split('/').pop() || fileName;
          }
          
          // Ensure the filename has an extension
          if (!fileName.includes('.')) {
            fileName += `.${extension}`;
          }
          
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to add ${photo.description || photo.id} to zip:`, error);
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `${folderName}.zip has been downloaded`,
      });
    } catch (error) {
      console.error('Zip creation error:', error);
      toast({
        title: "Download Error",
        description: "Failed to create zip file",
        variant: "destructive",
      });
    }
  };

  return { downloadFolder };
};
