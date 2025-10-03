import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pendingUploadId } = await req.json();

    if (!pendingUploadId) {
      throw new Error('pendingUploadId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the pending upload record
    const { data: pendingUpload, error: fetchError } = await supabase
      .from('pending_bill_uploads')
      .select('*')
      .eq('id', pendingUploadId)
      .single();

    if (fetchError || !pendingUpload) {
      throw new Error('Pending upload not found');
    }

    // Update status to processing
    await supabase
      .from('pending_bill_uploads')
      .update({ status: 'processing' })
      .eq('id', pendingUploadId);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('bill-attachments')
      .download(pendingUpload.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download PDF');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI that extracts structured data from construction company bills/invoices. 
Extract the following information and return as valid JSON:
{
  "vendor_name": "string",
  "bill_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD (or null)",
  "reference_number": "string (or null)",
  "terms": "string (e.g., 'Net 30', or null)",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_cost": number,
      "amount": number,
      "memo": "string (or null)"
    }
  ],
  "total_amount": number
}

Return ONLY the JSON object, no additional text.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract bill data from this PDF.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const extractedText = aiData.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(extractedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', extractedText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Update the pending upload with extracted data
    const { error: updateError } = await supabase
      .from('pending_bill_uploads')
      .update({
        status: 'extracted',
        extracted_data: extractedData
      })
      .eq('id', pendingUploadId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-bill-data function:', error);

    // Update status to error if we have the ID
    if (error instanceof Error) {
      const { pendingUploadId } = await req.json().catch(() => ({}));
      if (pendingUploadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('pending_bill_uploads')
          .update({ 
            status: 'error',
            error_message: error.message 
          })
          .eq('id', pendingUploadId);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
