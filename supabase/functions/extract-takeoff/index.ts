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

    // Fetch all estimate cost codes for this owner
    const { data: costCodes, error: costCodesError } = await supabase
      .from('cost_codes')
      .select('*')
      .eq('owner_id', sheet.owner_id)
      .eq('estimate', true)
      .order('code');

    if (costCodesError || !costCodes || costCodes.length === 0) {
      console.error('Cost codes fetch error:', costCodesError);
      return new Response(JSON.stringify({ error: 'No estimate cost codes found' }), {
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
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Build cost code instructions
    const costCodeInstructions = costCodes.map(code => {
      const name = code.name.toLowerCase();
      let instructions = '';
      
      if (name.includes('window')) {
        if (name.includes('single')) {
          instructions = 'Count single-hung windows (1 sash moves). Look for windows with one movable section.';
        } else if (name.includes('double')) {
          instructions = 'Count double-hung windows (both sashes move). Look for windows with two movable sections.';
        } else if (name.includes('triple')) {
          instructions = 'Count triple windows (3 window units grouped together).';
        } else {
          instructions = 'Count all visible windows matching this type.';
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
2. For windows/doors: Count individual units (not pairs unless specified)
3. If uncertain, set quantity to 0 and note why in comments
4. Add notes explaining your counts (e.g., "2 on front facade, 1 on side")
5. Distinguish between similar items (single vs double windows, etc.)
6. Be precise and conservative - better to undercount than overcount

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
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Please analyze this construction drawing and extract quantities for all the specified cost codes.' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/jpeg;base64,${base64Image}` 
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
      const costCode = costCodes.find(cc => cc.id === item.cost_code_id);
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
