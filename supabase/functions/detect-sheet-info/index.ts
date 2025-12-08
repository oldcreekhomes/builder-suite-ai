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
    const { sheet_id, file_path } = await req.json();

    // Accept either sheet_id (for existing sheets) or file_path (for preview before saving)
    if (!sheet_id && !file_path) {
      return new Response(
        JSON.stringify({ error: 'sheet_id or file_path is required' }),
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

    let actualFilePath: string;

    if (sheet_id) {
      // Get the sheet details from database
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
      actualFilePath = sheet.file_path;
    } else {
      // Use the provided file_path directly
      actualFilePath = file_path;
    }

    // Download the image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('project-files')
      .download(actualFilePath);

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
    const identifier = sheet_id || file_path;
    console.log(`Image size for ${identifier}: ${imageSizeMB} MB (${imageSizeBytes} bytes)`);
    
    // If image is too large (>3MB), we can't process it safely in edge function memory
    // The AI only needs to read text from title blocks, so we'll use a lower quality for very large images
    // NOTE: Original images in storage remain COMPLETELY UNTOUCHED for Roboflow takeoffs
    const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB limit for safe processing
    
    let dataUrl: string;
    const mimeType = actualFilePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    if (imageSizeBytes > MAX_SIZE_BYTES) {
      console.log(`Image too large (${imageSizeMB} MB), skipping base64 encoding to avoid memory issues`);
      // For very large images, we'll try to use the public URL directly if possible
      // Gemini can fetch URLs directly in some cases
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/project-files/${actualFilePath}`;
      console.log(`Using public URL for large image: ${publicUrl}`);
      dataUrl = publicUrl;
    } else {
      const base64Image = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      dataUrl = `data:${mimeType};base64,${base64Image}`;
    }

    console.log(`Analyzing ${identifier} for title block info...`);

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
                text: `You are analyzing an architectural/construction drawing to extract sheet information.

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. TITLE BLOCK LOCATION:
   - The title block is ALWAYS in the RIGHT SIDE or BOTTOM RIGHT CORNER of the drawing
   - This is where you'll find the sheet number, title, and other project info
   - Look carefully even if text appears small or faint

2. SHEET NUMBER - Can be ANY format:
   - Letters only: CS, COVER, T, INDEX, G, DEMO, A, S, M, E
   - Numbers only: 1, 2, 3, 1.0, 2.0, 01, 02
   - Single letter + number: A-1, S-1, M-1, E-1, A1, S1
   - Letter + number with sub-number: A-2.1, A-2.2, A2.1
   - Multiple letters + number: AR-1, ST-1, CS-1
   - The sheet number is typically prominently displayed in the title block
   - IMPORTANT: Even a single letter like "CS" or "A" is a valid sheet number

3. SHEET TITLE:
   - The descriptive name of the drawing: COVER SHEET, FRONT ELEVATION, FLOOR PLAN, SITE PLAN, ELECTRICAL PLAN, EXTERIOR ELEVATIONS, etc.
   - Usually displayed near or below the sheet number in the title block

4. SCALE - WHERE TO FIND IT (VERY IMPORTANT):
   - The scale is printed DIRECTLY BELOW each drawing's view LABEL/TITLE
   - Example: A drawing labeled "RIGHT ELEVATION" will have scale text like "1/4" = 1'-0"" printed immediately beneath that label
   - Example: "FRONT ELEVATION" label → scale value directly below it
   - Look for scale text immediately under drawing titles like:
     * FRONT ELEVATION, REAR ELEVATION, LEFT ELEVATION, RIGHT ELEVATION
     * FLOOR PLAN, BASEMENT PLAN, ROOF PLAN, SITE PLAN
     * Any drawing label will have its scale printed directly below
   - Also check the title block in the right/bottom-right corner
   - Common scale formats:
     * 1/4" = 1'-0" (most common for elevations)
     * 1/8" = 1'-0"
     * 3/8" = 1'-0"
     * 1/2" = 1'-0"
     * 1" = 1'-0"
     * AS NOTED or AS SHOWN (if multiple scales)
     * NTS or NOT TO SCALE
   - If you see ANY scale notation on the drawing, report it

5. IF YOU CANNOT CLEARLY IDENTIFY ANY FIELD:
   - Look harder in the bottom-right corner title block area
   - Check for any boxed or bordered area containing text
   - Even if text is small or partially visible, make your best attempt
   - Only return null if truly nothing is visible for that field

6. CRITICAL RULE - NEVER RETURN ALL NULLS:
   - You MUST make your best attempt to identify at least ONE field
   - For cover sheets, the sheet number is often just "CS" or "COVER" - this is valid!
   - If you see ANY text that could be a sheet identifier, title, or scale, report it
   - Returning all null values is almost never correct for a valid drawing page

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

    // RETRY LOGIC: If all fields are null, retry with a more aggressive prompt
    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (
      result.sheet_number === null && 
      result.sheet_title === null && 
      result.scale === null && 
      retryCount < MAX_RETRIES
    ) {
      retryCount++;
      console.log(`All fields null, retrying (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const retryPrompt = `RETRY ATTEMPT ${retryCount}: You returned NO INFORMATION on the previous attempt. This is a valid construction drawing - there MUST be identifiable text.

CRITICAL - LOOK VERY CAREFULLY AT THE ENTIRE IMAGE:

1. SEARCH EVERYWHERE FOR THE TITLE BLOCK:
   - Bottom right corner (MOST COMMON location)
   - Top right corner
   - Bottom left corner
   - Right edge (vertical title block)
   - Top of page (especially for cover sheets)
   - ANY bordered/boxed area with text

2. FOR COVER SHEETS / FIRST PAGES:
   - Sheet number is often just "CS", "COVER", "T", "INDEX", "TITLE", or "1"
   - Title might be "COVER SHEET", "TITLE SHEET", "PROJECT INDEX", etc.
   - Look for project name and address - these pages always have text

3. FOR ELECTRICAL / SPECIALTY SHEETS:
   - Sheet numbers like "E-1", "E-2", "6.0", "7.0", "E1", "ELEC"
   - Titles like "ELECTRICAL PLAN", "LIGHTING PLAN", "POWER PLAN"

4. FOR SCALE - LOOK UNDER DRAWING LABELS:
   - Find labels like "FLOOR PLAN", "ELEVATION", "SECTION"
   - Scale is printed DIRECTLY BELOW these labels
   - Common formats: 1/4" = 1'-0", 1/8" = 1'-0", NTS

5. EVEN IF TEXT IS SMALL, BLURRY, OR ROTATED:
   - Report your best guess
   - Any visible text that could be a sheet identifier counts
   - Do NOT return all null values again

Return ONLY valid JSON: {"sheet_number": "...", "sheet_title": "...", "scale": "...", "confidence": "high/medium/low"}`;

      try {
        const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                  { type: 'text', text: retryPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl,
                      ...(dataUrl.startsWith('http') ? { detail: 'auto' } : {})
                    }
                  }
                ]
              }
            ]
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content || '';
          console.log(`Retry ${retryCount} response:`, retryContent);

          // Parse retry response
          let cleanedRetryContent = retryContent.trim();
          if (cleanedRetryContent.startsWith('```json')) {
            cleanedRetryContent = cleanedRetryContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedRetryContent.startsWith('```')) {
            cleanedRetryContent = cleanedRetryContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const retryParsed = JSON.parse(cleanedRetryContent);
          
          // If we got at least one non-null value, use this result
          if (retryParsed.sheet_number || retryParsed.sheet_title || retryParsed.scale) {
            result = {
              sheet_number: retryParsed.sheet_number || null,
              sheet_title: retryParsed.sheet_title || null,
              scale: retryParsed.scale || null,
              confidence: retryParsed.confidence || 'medium'
            };
            console.log(`Retry ${retryCount} succeeded with result:`, result);
            break; // Exit retry loop on success
          } else {
            console.log(`Retry ${retryCount} still returned all nulls, continuing...`);
          }
        } else {
          console.error(`Retry ${retryCount} API error:`, retryResponse.status);
        }
      } catch (retryError) {
        console.error(`Retry ${retryCount} failed:`, retryError);
      }
    }

    if (retryCount > 0 && result.sheet_number === null && result.sheet_title === null && result.scale === null) {
      console.log(`All ${MAX_RETRIES + 1} attempts failed to find any information`);
    }

    // Normalize scale format to consistent "X" = Y'-Z"" format
    const normalizeScale = (scale: string | null): string | null => {
      if (!scale) return null;
      
      let normalized = scale.trim();
      
      // Replace dash/en-dash/em-dash used as equals with actual equals
      // Pattern: 1/4"-1'-0" should become 1/4" = 1'-0"
      normalized = normalized.replace(/(\d+\/\d+")\s*[-–—]\s*(\d+'-\d+")/, '$1 = $2');
      
      // Ensure space around equals sign
      // Pattern: 1/4"=1'-0" should become 1/4" = 1'-0"
      normalized = normalized.replace(/(\d+\/\d+")\s*=\s*(\d+'-\d+")/, '$1 = $2');
      
      // Also handle patterns without fraction: 1"=1'-0" -> 1" = 1'-0"
      normalized = normalized.replace(/(\d+")\s*=\s*(\d+'-\d+")/, '$1 = $2');
      
      // Clean up any double spaces
      normalized = normalized.replace(/\s{2,}/g, ' ');
      
      return normalized;
    };

    // Apply scale normalization
    result.scale = normalizeScale(result.scale);

    console.log('Final detected sheet info:', result);

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
