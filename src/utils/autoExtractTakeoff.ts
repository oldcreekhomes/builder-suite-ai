import { supabase } from "@/integrations/supabase/client";

export interface ExtractResult {
  success: boolean;
  sheetId: string;
  itemCount: number;
  annotationCount: number;
  itemIds: string[];
  error?: string;
}

/**
 * Automatically extract and save takeoff items from a sheet using AI
 * This bypasses the review dialog and saves items directly
 */
export async function autoExtractAndSave(sheetId: string): Promise<ExtractResult> {
  try {
    console.log('🤖 Auto-extracting takeoff for sheet:', sheetId);
    
    // Call the extract-takeoff edge function
    const { data, error } = await supabase.functions.invoke('extract-takeoff', {
      body: { sheet_id: sheetId }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    // Handle auth/permission errors from edge function
    if (data && !data.success && data.error_code) {
      return {
        success: false,
        sheetId,
        itemCount: 0,
        annotationCount: 0,
        itemIds: [],
        error: data.error || "Authentication or permission issue"
      };
    }

    // No items found
    if (!data?.success || !data?.items || data.items.length === 0) {
      console.log('No items found for sheet:', sheetId);
      return {
        success: true,
        sheetId,
        itemCount: 0,
        annotationCount: 0,
        itemIds: [],
      };
    }

    console.log('✅ Extraction successful:', data.items.length, 'items found');

    // Items are already saved by the edge function, just fetch their IDs
    const result = await (supabase as any)
      .from('takeoff_items')
      .select('id')
      .eq('takeoff_sheet_id', sheetId)
      .eq('source', 'ai');

    if (result.error) {
      console.error('Error fetching saved items:', result.error);
    }

    const itemIds: string[] = (result.data || []).map((item: any) => item.id);

    return {
      success: true,
      sheetId,
      itemCount: data.items.length,
      annotationCount: (data.annotations_created as number) || 0,
      itemIds,
    };

  } catch (error) {
    console.error('Auto-extract error:', error);
    return {
      success: false,
      sheetId,
      itemCount: 0,
      annotationCount: 0,
      itemIds: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
