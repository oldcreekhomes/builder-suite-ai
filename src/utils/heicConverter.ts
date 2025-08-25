import heic2any from "heic2any";

/**
 * Converts HEIC/HEIF files to JPEG format for better browser compatibility
 * @param file - The file to potentially convert
 * @param quality - JPEG quality (0-1), defaults to 0.8
 * @returns Promise<File> - The original file if not HEIC, or converted JPEG file
 */
export const convertHeicToJpeg = async (file: File, quality: number = 0.8): Promise<File> => {
  const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif') || 
                 file.type === 'image/heic' || 
                 file.type === 'image/heif';
  
  if (!isHeic) {
    return file;
  }

  try {
    console.log('Converting HEIC/HEIF file to JPEG:', file.name);
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality
    }) as Blob;

    // Create a new file with .jpg extension
    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('HEIC/HEIF conversion successful:', convertedFile.name);
    return convertedFile;
  } catch (error) {
    console.error('HEIC/HEIF conversion failed:', error);
    throw new Error(`Failed to convert ${file.name}. Please try a different format.`);
  }
};

/**
 * Updates a file path to reflect HEIC to JPEG conversion
 * @param originalPath - The original file path
 * @returns string - The updated path with .jpg extension if it was HEIC
 */
export const updateHeicPath = (originalPath: string): string => {
  return originalPath.replace(/\.(heic|heif)$/i, '.jpg');
};