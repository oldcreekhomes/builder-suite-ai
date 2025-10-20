import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheet_id } = await req.json();
    
    if (!sheet_id) {
      throw new Error('sheet_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching sheet:', sheet_id);
    
    // Fetch the sheet details
    const { data: sheet, error: sheetError } = await supabase
      .from('takeoff_sheets')
      .select('*')
      .eq('id', sheet_id)
      .single();

    if (sheetError || !sheet) {
      throw new Error(`Failed to fetch sheet: ${sheetError?.message}`);
    }

    console.log('Sheet found:', sheet.name);

    // Get the image URL - checking both storage_path and file_path
    const imagePath = sheet.storage_path || sheet.file_path;
    
    if (!imagePath) {
      throw new Error('No image path found for sheet');
    }

    console.log('Image path:', imagePath);

    // Get public URL for the image
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(imagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get image URL');
    }

    console.log('Fetching image from:', urlData.publicUrl);

    // Download the image
    const imageResponse = await fetch(urlData.publicUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    console.log('Image downloaded, size:', imageBuffer.byteLength);

    // Call Lovable AI Gateway for scale detection
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
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
                text: `You are analyzing a construction drawing to find the scale notation.

IMPORTANT: Look for scale text that is typically:
- Near elevation labels like "REAR ELEVATION", "FRONT ELEVATION", "SIDE ELEVATION", "FLOOR PLAN", etc.
- In common architectural format like: "1/4\" = 1'-0\"", "SCALE: 1/8\" = 1'-0\"", "3/8\" = 1'-0\""
- Usually appears directly below or next to the elevation label
- May be in title blocks at the bottom of the drawing

Return ONLY valid JSON in this exact format:
{
  "scale": "exact scale text found or null",
  "confidence": "high or medium or low",
  "location": "brief description of where found"
}

If no scale is found, return: {"scale": null, "confidence": "low", "location": "not found"}

Do not include any other text, explanations, or formatting - ONLY the JSON object.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { scale: null, confidence: 'low', location: 'parsing failed' };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = { scale: null, confidence: 'low', location: 'parsing error' };
    }

    console.log('Parsed result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in detect-drawing-scale:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        scale: null,
        confidence: 'low',
        location: 'error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
