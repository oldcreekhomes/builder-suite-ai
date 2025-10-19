import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
      return new Response(JSON.stringify({ error: 'sheet_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch sheet details
    const { data: sheet, error: sheetError } = await supabase
      .from('takeoff_sheets')
      .select('*')
      .eq('id', sheet_id)
      .single();

    if (sheetError || !sheet) {
      console.error('Sheet fetch error:', sheetError);
      return new Response(JSON.stringify({ error: 'Sheet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all estimate cost codes for this owner (excluding parent cost codes with subcategories)
    const { data: costCodes, error: costCodesError } = await supabase
      .from('cost_codes')
      .select('*')
      .eq('owner_id', sheet.owner_id)
      .eq('estimate', true)
      .neq('has_subcategories', true)
      .order('code');

    if (costCodesError || !costCodes || costCodes.length === 0) {
      console.error('Cost codes fetch error:', costCodesError);
      return new Response(JSON.stringify({ error: 'No estimate cost codes found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter cost codes for Elevation sheets to only window-related codes
    const isElevation = /elevations?/i.test(sheet.name || '');
    const targetCodes = isElevation 
      ? costCodes.filter(cc => /window/i.test(cc.name))
      : costCodes;

    if (targetCodes.length === 0) {
      return new Response(JSON.stringify({ error: 'No relevant cost codes found for this sheet type' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL for the sheet file
    const { data: fileData } = supabase.storage
      .from('project-files')
      .getPublicUrl(sheet.file_path);

    if (!fileData?.publicUrl) {
      return new Response(JSON.stringify({ error: 'Failed to get file URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the file
    const fileResponse = await fetch(fileData.publicUrl);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(`Downloaded file: ${fileBuffer.byteLength} bytes`);
    
    // Convert large buffer to base64 in chunks to avoid stack overflow
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192; // Process 8KB at a time
      let binary = '';
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      return btoa(binary);
    }
    
    const base64Image = arrayBufferToBase64(fileBuffer);
    console.log('Base64 conversion complete');

    // Build cost code instructions
    const costCodeInstructions = targetCodes.map(code => {
      const name = code.name.toLowerCase();
      let instructions = '';
      
      if (name.includes('window')) {
        if (name.includes('single')) {
          instructions = 'Count SINGLE WINDOW UNITS - one individual window opening (not about sashes). Do NOT count patio door lites or garage door windows.';
        } else if (name.includes('double')) {
          instructions = 'Count DOUBLE WINDOW UNITS - two window units mulled/paired side-by-side as one assembly. Do NOT count patio door lites or garage door windows.';
        } else if (name.includes('triple')) {
          instructions = 'Count TRIPLE WINDOW UNITS - three window units grouped/mulled together as one assembly. Do NOT count patio door lites or garage door windows.';
        } else {
          instructions = 'Generic window category. If specific subtypes (Single/Double/Triple) exist, allocate quantities to those subtypes and set this generic category to 0.';
        }
      } else if (name.includes('door')) {
        if (name.includes('entry') || name.includes('front')) {
          instructions = 'Count entry/front doors. Typically larger, decorative doors at main entrance.';
        } else if (name.includes('garage')) {
          instructions = 'Count garage door units (single or double wide).';
        } else {
          instructions = 'Count all doors visible.';
        }
      } else {
        instructions = `Count visible instances of ${code.name}.`;
      }

      return `- ${code.name} (Code: ${code.code})
  - Unit: ${code.unit_of_measure || 'each'}
  - What to count: ${instructions}
  - Cost Code ID: ${code.id}`;
    }).join('\n\n');

    // Build AI prompt
    const systemPrompt = `You are an expert construction estimator analyzing architectural house drawings.

Context:
- Drawing Type: ${sheet.name}
- Scale: ${sheet.drawing_scale || 'Not specified'}

Task: Analyze this construction drawing and count/measure the following items. Only count items you can clearly identify.

Cost Codes to Estimate:
${costCodeInstructions}

Guidelines:
1. Count only visible, clearly identifiable items
2. For windows: Single = 1 unit, Double = 2 units mulled together, Triple = 3 units mulled together
3. CRITICAL: If window subtypes (Single/Double/Triple) are listed, you MUST allocate quantities across them and set the generic "Windows" category to quantity 0
4. CRITICAL: Always return one item for EVERY cost code listed, even if quantity is 0 (use low confidence when uncertain)
5. If any windows are present, always provide a breakdown across Single/Double/Triple subtypes - do NOT put all units only in the generic "Windows" category
6. Add notes explaining your counts (e.g., "2 on front facade, 1 on side")
7. Exclude patio door lites and garage door windows from window counts
8. Be precise and conservative - better to undercount than overcount

Return counts using the structured format provided.`;

    // Call Lovable AI with function calling
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Please analyze this construction drawing and extract quantities for all the specified cost codes.' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_quantities',
            description: 'Extract item quantities from construction drawing',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      cost_code_id: { 
                        type: 'string',
                        description: 'The UUID of the cost code'
                      },
                      quantity: { 
                        type: 'number',
                        description: 'The counted/measured quantity'
                      },
                      confidence: { 
                        type: 'string', 
                        enum: ['high', 'medium', 'low'],
                        description: 'Confidence level in this count'
                      },
                      notes: { 
                        type: 'string',
                        description: 'Explanation of the count and location details'
                      }
                    },
                    required: ['cost_code_id', 'quantity', 'confidence', 'notes']
                  }
                }
              },
              required: ['items']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_quantities' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI extraction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));

    // Extract function call results
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_quantities') {
      return new Response(JSON.stringify({ error: 'AI did not return structured data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extractedItems = JSON.parse(toolCall.function.arguments).items;

    // Enrich with cost code details
    const enrichedItems = extractedItems.map((item: any) => {
      const costCode = targetCodes.find(cc => cc.id === item.cost_code_id);
      return {
        ...item,
        cost_code_name: costCode?.name || 'Unknown',
        unit_of_measure: costCode?.unit_of_measure || 'each',
        unit_price: costCode?.price || 0,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      items: enrichedItems,
      sheet_name: sheet.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Extract takeoff error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
