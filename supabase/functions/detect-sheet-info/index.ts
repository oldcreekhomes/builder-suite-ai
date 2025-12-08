import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheet_id } = await req.json();

    if (!sheet_id) {
      return new Response(
        JSON.stringify({ error: 'sheet_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the sheet details
    const { data: sheet, error: sheetError } = await supabase
      .from('takeoff_sheets')
      .select('id, file_path, name')
      .eq('id', sheet_id)
      .single();

    if (sheetError || !sheet) {
      console.error('Sheet not found:', sheetError);
      return new Response(
        JSON.stringify({ error: 'Sheet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('project-files')
      .download(sheet.file_path);

    if (downloadError || !imageData) {
      console.error('Failed to download image:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64 - for large images, we need to be memory-efficient
    const arrayBuffer = await imageData.arrayBuffer();
    const imageSizeBytes = arrayBuffer.byteLength;
    const imageSizeMB = (imageSizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`Image size for sheet ${sheet_id}: ${imageSizeMB} MB (${imageSizeBytes} bytes)`);
    
    // If image is too large (>3MB), we can't process it safely in edge function memory
    // The AI only needs to read text from title blocks, so we'll use a lower quality for very large images
    // NOTE: Original images in storage remain COMPLETELY UNTOUCHED for Roboflow takeoffs
    const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB limit for safe processing
    
    let dataUrl: string;
    const mimeType = sheet.file_path.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    if (imageSizeBytes > MAX_SIZE_BYTES) {
      console.log(`Image too large (${imageSizeMB} MB), skipping base64 encoding to avoid memory issues`);
      // For very large images, we'll try to use the public URL directly if possible
      // Gemini can fetch URLs directly in some cases
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/project-files/${sheet.file_path}`;
      console.log(`Using public URL for large image: ${publicUrl}`);
      dataUrl = publicUrl;
    } else {
      const base64Image = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      dataUrl = `data:${mimeType};base64,${base64Image}`;
    }

    console.log(`Analyzing sheet ${sheet_id} for title block info...`);

    // Call Lovable AI (Gemini vision) to analyze the title block
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing an architectural/construction drawing to extract sheet information from the title block.

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. TITLE BLOCK LOCATION:
   - The title block is ALWAYS in the RIGHT SIDE or BOTTOM RIGHT CORNER of the drawing
   - This is where you'll find the sheet number, title, and other project info

2. SHEET NUMBER - Can be ANY format:
   - Letters only: CS, COVER, T, INDEX, G, DEMO
   - Numbers only: 1, 2, 3, 1.0, 2.0, 01, 02
   - Single letter + number: A-1, S-1, M-1, E-1, A1, S1
   - Letter + number with sub-number: A-2.1, A-2.2, A2.1
   - Multiple letters + number: AR-1, ST-1, CS-1
   - The sheet number is typically prominently displayed in the title block

3. SHEET TITLE:
   - The descriptive name of the drawing: COVER SHEET, FRONT ELEVATION, FLOOR PLAN, SITE PLAN, ELECTRICAL PLAN, etc.
   - Usually displayed near or below the sheet number in the title block

4. SCALE - Look in TWO places:
   - BELOW each individual drawing/view on the sheet (e.g., "SCALE: 1/4" = 1'-0"")
   - In the title block area
   - Common formats:
     * 1/4" = 1'-0"
     * 1/8" = 1'-0"
     * 3/8" = 1'-0"
     * 1/2" = 1'-0"
     * 1" = 1'-0"
     * 3/4" = 1'-0"
     * AS NOTED or AS SHOWN (if multiple scales on sheet)
     * NTS or NOT TO SCALE
     * 1:100, 1:50, 1:20 (metric)
   - Look for text starting with "SCALE:" or just the scale notation itself

Return ONLY valid JSON (no markdown, no code blocks):
{"sheet_number": "exact value found or null", "sheet_title": "exact value found or null", "scale": "exact value found or null", "confidence": "high/medium/low"}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  // If it's a public URL (not base64), Gemini will fetch it directly
                  ...(dataUrl.startsWith('http') ? { detail: 'auto' } : {})
                }
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI analysis failed',
          sheet_number: null,
          sheet_title: null,
          scale: null,
          confidence: 'low'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the JSON response from AI
    let result = {
      sheet_number: null as string | null,
      sheet_title: null as string | null,
      scale: null as string | null,
      confidence: 'low' as 'high' | 'medium' | 'low'
    };

    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanedContent);
      result = {
        sheet_number: parsed.sheet_number || null,
        sheet_title: parsed.sheet_title || null,
        scale: parsed.scale || null,
        confidence: parsed.confidence || 'low'
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default result with low confidence
    }

    console.log('Detected sheet info:', result);

    return new Response(
      JSON.stringify({
        success: true,
        sheet_id,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-sheet-info:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        sheet_number: null,
        sheet_title: null,
        scale: null,
        confidence: 'low'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
