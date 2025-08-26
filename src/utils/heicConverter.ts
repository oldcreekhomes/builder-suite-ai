import heic2any from "heic2any";

export interface ConversionResult {
  file: File;
  wasConverted: boolean;
  strategy?: 'heic2any' | 'canvas' | 'upload-original';
  error?: string;
}

/**
 * Converts HEIC/HEIF files to JPEG format using multiple strategies
 * @param file - The file to potentially convert
 * @param quality - JPEG quality (0-1), defaults to 0.8
 * @returns Promise<ConversionResult> - Result with file and conversion status
 */
export const convertHeicToJpeg = async (file: File, quality: number = 0.8): Promise<ConversionResult> => {
  const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif') || 
                 file.type === 'image/heic' || 
                 file.type === 'image/heif';
  
  if (!isHeic) {
    return { file, wasConverted: false };
  }

  console.log('Converting HEIC/HEIF file to JPEG:', file.name);

  // Strategy 1: Try heic2any library
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality
    }) as Blob;

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('HEIC conversion successful with heic2any:', convertedFile.name);
    return { file: convertedFile, wasConverted: true, strategy: 'heic2any' };
  } catch (error) {
    console.warn('heic2any conversion failed, trying browser decode:', error);
  }

  // Strategy 2: Try browser's native image decoding with canvas
  try {
    const imageBitmap = await createImageBitmap(file);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);
    
    const convertedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      }, 'image/jpeg', quality);
    });

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('HEIC conversion successful with canvas:', convertedFile.name);
    return { file: convertedFile, wasConverted: true, strategy: 'canvas' };
  } catch (error) {
    console.warn('Browser decode conversion failed:', error);
  }

  // Strategy 3: Upload original HEIC file (fallback)
  console.log('All conversion strategies failed, uploading original HEIC file');
  return { 
    file, 
    wasConverted: false, 
    strategy: 'upload-original',
    error: 'Conversion failed, uploaded original HEIC file'
  };
};

/**
 * Updates a file path to reflect HEIC to JPEG conversion
 * @param originalPath - The original file path
 * @returns string - The updated path with .jpg extension if it was HEIC
 */
export const updateHeicPath = (originalPath: string): string => {
  return originalPath.replace(/\.(heic|heif)$/i, '.jpg');
};