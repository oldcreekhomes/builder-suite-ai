import heic2any from "heic2any";

export interface ConversionResult {
  file: File;
  wasConverted: boolean;
  uploadedOriginal?: boolean;
  strategy?: 'heic2any' | 'canvas' | 'upload-original';
  error?: string;
}

/**
 * Converts HEIC/HEIF files to JPEG format using multiple strategies
 * @param file - The file to potentially convert
 * @param quality - JPEG quality (0-1), defaults to 0.8
 * @returns Promise<ConversionResult> - Result with file and conversion status
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const convertHeicToJpeg = async (file: File, quality: number = 0.8): Promise<ConversionResult> => {
  const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif') || 
                 file.type === 'image/heic' || 
                 file.type === 'image/heif';
  
  if (!isHeic) {
    return { file, wasConverted: false };
  }

  console.log('🔄 Converting HEIC/HEIF file to JPEG:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  // Strategy 1: Try heic2any library with timeout
  try {
    console.log('📝 Trying heic2any library...');
    
    const convertedBlob = await withTimeout(
      heic2any({
        blob: file,
        toType: "image/jpeg",
        quality
      }) as Promise<Blob>,
      30000 // 30 second timeout
    );

    if (!convertedBlob || convertedBlob.size === 0) {
      throw new Error('heic2any returned empty blob');
    }

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('✅ HEIC conversion successful with heic2any:', convertedFile.name, `(${(convertedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    return { file: convertedFile, wasConverted: true, strategy: 'heic2any' };
  } catch (error) {
    console.warn('❌ heic2any conversion failed:', error);
  }

  // Strategy 2: Try browser's native image decoding with canvas
  try {
    console.log('🖼️ Trying browser native decode with canvas...');
    
    const imageBitmap = await withTimeout(
      createImageBitmap(file),
      15000 // 15 second timeout
    );
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);
    
    const convertedBlob = await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        }, 'image/jpeg', quality);
      }),
      10000 // 10 second timeout
    );

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('✅ HEIC conversion successful with canvas:', convertedFile.name, `(${(convertedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    return { file: convertedFile, wasConverted: true, strategy: 'canvas' };
  } catch (error) {
    console.warn('❌ Browser decode conversion failed:', error);
  }

  // Strategy 3: Try FileReader + heic2any as blob URL (alternative approach)
  try {
    console.log('🔄 Trying FileReader + blob URL approach...');
    
    const arrayBuffer = await withTimeout(
      file.arrayBuffer(),
      10000
    );
    
    const blob = new Blob([arrayBuffer], { type: file.type });
    const convertedBlob = await withTimeout(
      heic2any({
        blob,
        toType: "image/jpeg",
        quality
      }) as Promise<Blob>,
      30000
    );

    if (!convertedBlob || convertedBlob.size === 0) {
      throw new Error('heic2any (blob URL) returned empty blob');
    }

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });

    console.log('✅ HEIC conversion successful with blob URL approach:', convertedFile.name);
    return { file: convertedFile, wasConverted: true, strategy: 'heic2any' };
  } catch (error) {
    console.warn('❌ Blob URL conversion failed:', error);
  }

  // Strategy 4: Upload original HEIC file (fallback)
  console.log('⚠️ All conversion strategies failed, uploading original HEIC file');
  return { 
    file, 
    wasConverted: false,
    uploadedOriginal: true,
    strategy: 'upload-original',
    error: 'Client-side conversion failed - uploading original for server processing'
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