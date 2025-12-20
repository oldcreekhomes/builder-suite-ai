/**
 * Get thumbnail URL for a photo with specified width
 * Uses Supabase image transformations for on-the-fly thumbnail generation
 */
export const getThumbnailUrl = (url: string, width: number = 512): string => {
  // Use Supabase's image transformation API for thumbnails
  if (url.includes('/object/public/')) {
    return url.replace('/object/public/', '/render/image/public/') + `?width=${width}&quality=80`;
  }
  return url;
};
