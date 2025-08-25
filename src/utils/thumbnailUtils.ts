/**
 * Get thumbnail URL for a photo with specified width
 * Currently returns the original URL, but ready for Supabase image transformations
 */
export const getThumbnailUrl = (url: string, width: number = 512): string => {
  // For now, return original URL
  // Future: Add Supabase image transformation
  // return url.replace('/object/public/', `/render/image/public/`).concat(`?width=${width}&quality=80`);
  return url;
};