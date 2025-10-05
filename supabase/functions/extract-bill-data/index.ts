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
  const CHUNK_SIZE = 8192; // 8KB chunks to avoid stack overflow
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

  let requestBody: any;
  try {
    requestBody = await req.json();
    const { pendingUploadId, pageImages } = requestBody;

    if (!pendingUploadId) {
      throw new Error('pendingUploadId is required');
    }

    console.log('Processing bill extraction for upload:', pendingUploadId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    // Fetch user's accounts and cost codes for categorization
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code, name, type')
      .eq('owner_id', pendingUpload.owner_id)
      .eq('is_active', true)
      .order('code');

    const { data: costCodes } = await supabase
      .from('cost_codes')
      .select('id, code, name, category')
      .eq('owner_id', pendingUpload.owner_id)
      .order('code');

    console.log(`Found ${accounts?.length || 0} accounts and ${costCodes?.length || 0} cost codes for categorization`);

    // Update status to processing
    await supabase
      .from('pending_bill_uploads')
      .update({ status: 'processing' })
      .eq('id', pendingUploadId);

    // Only download file if we need to process it as an image (no pageImages provided)
    let base64 = '';
    if (!pageImages) {
      const downloadStartTime = Date.now();
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('bill-attachments')
        .download(pendingUpload.file_path);

      if (downloadError || !fileData) {
        console.error('Download error:', downloadError);
        throw new Error(`Couldn't download file from storage: ${downloadError?.message || 'Unknown error'}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const fileSizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
      console.log(`Downloaded file: ${fileSizeKB}KB, took ${Date.now() - downloadStartTime}ms`);
      
      const conversionStartTime = Date.now();
      base64 = arrayBufferToBase64(arrayBuffer);
      console.log(`Base64 conversion took ${Date.now() - conversionStartTime}ms`);
    }

    // Prepare AI extraction request with retry logic
    const extractionStartTime = Date.now();
    let response;
    let retryCount = 0;
    const maxRetries = 2;

    // Build categorization context
    const accountsContext = accounts && accounts.length > 0
      ? `\n\nAvailable Accounts:\n${accounts.map(a => `- ${a.code}: ${a.name} (${a.type})`).join('\n')}`
      : '';
    
    const costCodesContext = costCodes && costCodes.length > 0
      ? `\n\nAvailable Cost Codes:\n${costCodes.map(c => `- ${c.code}: ${c.name}${c.category ? ` (${c.category})` : ''}`).join('\n')}`
      : '';

    const systemPrompt = `You are an AI that extracts and categorizes structured data from construction company bills/invoices.${accountsContext}${costCodesContext}

Extract ONLY the following fields and return valid JSON (no markdown):
{
  "vendor_name": "string",
  "bill_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD (or null)",
  "reference_number": "string (or null)",
  "terms": "string (Net 15/30/45/etc., 'Due on receipt', or null)",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_cost": number,
      "amount": number,
      "memo": "string (or null)",
      "account_name": "string (exact match from 'Available Accounts' if confident, else null)",
      "cost_code_name": "string (exact match from 'Available Cost Codes' if confident, else null)"
    }
  ],
  "total_amount": number
}

Rules:
- Parse numbers as numbers (strip $ and commas).
- bill_date and due_date must be ISO dates (YYYY-MM-DD); convert from MM/DD/YY if needed.
- reference_number can be an invoice number, bill number, account number, or parcel/id printed on the document.
- If there is a clearly labeled "Total Amount Due", "Amount Due", or "Total", set total_amount to that value.
- PAYMENT TERMS: Look for a field labeled Terms/Payment Terms/Net; return the exact text; if none, return null.

Special handling for government/tax bills (e.g., Treasurer, County/City Tax, Property Tax):
- vendor_name: use the agency header, e.g., "Arlington County Treasurer".
- reference_number: prefer Bill Number or Account/Parcel Number if present.
- due_date: use the labeled Due Date; if multiple installments, choose the nearest upcoming due date visible on the first pages.
- line_items: if the bill shows components like Base Tax, Penalty, Interest, Discounts, create separate line items for each; otherwise create a single line item (e.g., "Property Tax") equal to total_amount.
- terms: usually null for tax bills unless explicitly shown (e.g., "Due on receipt").

Categorization guidance:
- For each line item, attempt to map to an account and/or cost code from the provided lists. If not confident, leave as null.
- Typical mapping: job/project-related costs -> Job Costs; administrative fees -> G&A/Overhead; taxes -> Taxes/License fees if available.

Return ONLY the JSON object.`;

    let messages: any[] = [];

    if (pageImages && pageImages.length > 0) {
      // Client provided rendered PDF pages as images (fallback for scanned PDFs)
      console.log('Using client-provided page images, count:', pageImages.length);
      const imageContent = pageImages.map((url: string) => ({
        type: 'image_url',
        image_url: { url }
      }));
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract bill data from these scanned invoice pages.' },
            ...imageContent
          ]
        }
      ];
    } else {
      // Single image file
      const mimeType = pendingUpload.content_type || 'image/jpeg';
      console.log('Processing as single image with MIME type:', mimeType);
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract bill data from this image.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
          ]
        }
      ];
    }

    while (retryCount <= maxRetries) {
      try {
        console.log(`Calling Lovable AI Gateway (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Lovable AI Gateway error:', response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('Rate limits exceeded, please try again later.');
          }
          
          if (response.status === 402) {
            throw new Error('Payment required, please add funds to your Lovable AI workspace.');
          }
          
          // Retry on server errors
          if (response.status >= 500 && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
          
          throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error;
        }
        retryCount++;
      }
    }

    console.log(`AI extraction took ${Date.now() - extractionStartTime}ms`);

    const aiData = await response.json();
    const extractedText = aiData.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No response from AI');
    }

    // Helper function to strip markdown code blocks
    function stripMarkdownCodeBlocks(text: string): string {
      return text
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
    }

    // Parse the JSON response
    let extractedData;
    try {
      const cleanedText = stripMarkdownCodeBlocks(extractedText);
      console.log('Cleaned text for parsing:', cleanedText.substring(0, 200) + '...');
      extractedData = JSON.parse(cleanedText);
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
    if (error instanceof Error && requestBody?.pendingUploadId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('pending_bill_uploads')
        .update({ 
          status: 'error',
          error_message: error.message 
        })
        .eq('id', requestBody.pendingUploadId);
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
