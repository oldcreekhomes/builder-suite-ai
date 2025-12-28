import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert ArrayBuffer to base64 in chunks
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192;
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pendingUploadId } = await req.json();

    if (!pendingUploadId) {
      throw new Error('pendingUploadId is required');
    }

    console.log('Processing insurance certificate extraction for upload:', pendingUploadId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the pending upload record
    const { data: pendingUpload, error: fetchError } = await supabase
      .from('pending_insurance_uploads')
      .select('*')
      .eq('id', pendingUploadId)
      .single();

    if (fetchError || !pendingUpload) {
      throw new Error('Pending upload not found');
    }

    // Update status to processing
    await supabase
      .from('pending_insurance_uploads')
      .update({ status: 'processing' })
      .eq('id', pendingUploadId);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('insurance-certificates')
      .download(pendingUpload.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Pdf = arrayBufferToBase64(arrayBuffer);

    console.log('PDF downloaded, size:', arrayBuffer.byteLength, 'bytes');

    // Create the extraction prompt
    const extractionPrompt = `You are an expert at extracting data from ACORD 25 Certificate of Liability Insurance forms.

Analyze this insurance certificate PDF and extract all relevant information.

IMPORTANT: This is a standard ACORD 25 form used throughout the United States. Extract the following:

1. **Certificate Information**:
   - Certificate Date (DATE field at top right)
   - Producer (insurance agency/broker info)
   
2. **Insured Company Information**:
   - Company name
   - Address

3. **Insurance Coverages** - Extract ALL that apply:
   - **Commercial General Liability**: Policy number, effective date, expiration date, limits
   - **Automobile Liability**: Policy number, effective date, expiration date, limits
   - **Umbrella/Excess Liability**: Policy number, effective date, expiration date, limits
   - **Workers Compensation**: Policy number, effective date, expiration date, limits

For each coverage type, extract:
- The insurer name (from the INSURERS AFFORDING COVERAGE section, match by letter A, B, C, D, E)
- Policy number
- Policy effective date (format: YYYY-MM-DD)
- Policy expiration date (format: YYYY-MM-DD)
- Coverage limits (as a number, the general aggregate or per occurrence limit)

Return a JSON object with this exact structure:
{
  "certificate_date": "YYYY-MM-DD",
  "producer": {
    "name": "string",
    "address": "string",
    "phone": "string"
  },
  "insured": {
    "name": "string",
    "address": "string"
  },
  "coverages": [
    {
      "type": "commercial_general_liability",
      "insurer_name": "string",
      "insurer_letter": "A",
      "policy_number": "string",
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD",
      "coverage_limit": 1000000
    },
    {
      "type": "automobile_liability",
      "insurer_name": "string",
      "insurer_letter": "A",
      "policy_number": "string",
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD",
      "coverage_limit": 1000000
    },
    {
      "type": "umbrella_liability",
      "insurer_name": "string",
      "insurer_letter": "B",
      "policy_number": "string",
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD",
      "coverage_limit": 2000000
    },
    {
      "type": "workers_compensation",
      "insurer_name": "string",
      "insurer_letter": "C",
      "policy_number": "string",
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD",
      "coverage_limit": null
    }
  ]
}

CRITICAL RULES:
- Only include coverages that are actually present and checked/marked on the certificate
- Use null for any field you cannot find
- Dates must be in YYYY-MM-DD format
- Coverage limits should be numbers only (no dollar signs or commas)
- For Workers Compensation, coverage_limit can be null as it's typically statutory
- The "type" field must be one of: commercial_general_liability, automobile_liability, umbrella_liability, workers_compensation

Return ONLY the JSON object, no additional text or markdown.`;

    // Call Lovable AI with the PDF
    console.log('Calling Lovable AI for extraction...');
    
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
                text: extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No extraction result from AI');
    }

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    let extractedData;
    try {
      // Remove any markdown code blocks if present
      const cleanedText = extractedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', extractedText);
      throw new Error('Failed to parse extracted data');
    }

    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));

    // Update the pending upload with extracted data
    const { error: updateError } = await supabase
      .from('pending_insurance_uploads')
      .update({
        status: 'extracted',
        extracted_data: extractedData,
      })
      .eq('id', pendingUploadId);

    if (updateError) {
      console.error('Failed to update pending upload:', updateError);
      throw new Error('Failed to save extracted data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in extract-insurance-certificate:', error);

    // Try to update the pending upload with error status
    try {
      const { pendingUploadId } = await req.clone().json();
      if (pendingUploadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('pending_insurance_uploads')
          .update({
            status: 'error',
            error_message: error.message,
          })
          .eq('id', pendingUploadId);
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
