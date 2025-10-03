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
    const { pendingUploadId } = requestBody;

    if (!pendingUploadId) {
      throw new Error('pendingUploadId is required');
    }

    console.log('Processing bill extraction for upload:', pendingUploadId);

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
    const downloadStartTime = Date.now();
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('bill-attachments')
      .download(pendingUpload.file_path);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download PDF');
    }

    // Convert to base64 using chunked approach to handle large files
    const arrayBuffer = await fileData.arrayBuffer();
    const fileSizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
    console.log(`Downloaded PDF: ${fileSizeKB}KB, took ${Date.now() - downloadStartTime}ms`);
    
    const conversionStartTime = Date.now();
    const base64 = arrayBufferToBase64(arrayBuffer);
    console.log(`Base64 conversion took ${Date.now() - conversionStartTime}ms`);

    // Prepare AI extraction request with retry logic (supports PDF via text extraction)
    const extractionStartTime = Date.now();
    let response;
    let retryCount = 0;
    const maxRetries = 2;

    // Build messages depending on file type
    const systemPrompt = `You are an AI that extracts structured data from construction company bills/invoices. 
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

Return ONLY the JSON object, no additional text.`;

    let messages: any[] = [];
    const isPdf = (pendingUpload.content_type?.toLowerCase().includes('pdf')) || pendingUpload.file_path?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      console.log('Using PDF text extraction path...');
      try {
        const pdfjs: any = await import('https://esm.sh/pdfjs-dist@5.4.149/legacy/build/pdf.mjs');
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), disableWorker: true });
        const pdf = await loadingTask.promise;
        const pageLimit = Math.min(pdf.numPages, 5);
        let fullText = '';
        for (let i = 1; i <= pageLimit; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = (content.items as any[]).map((it: any) => it.str).join(' ');
          fullText += `\n\n--- Page ${i} ---\n${pageText}`;
        }
        const MAX_CHARS = 50000;
        if (fullText.length > MAX_CHARS) fullText = fullText.slice(0, MAX_CHARS);
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract bill data from the following text extracted from a PDF invoice:\n${fullText}` }
        ];
      } catch (e) {
        console.error('PDF text extraction failed:', e);
        // Fallback: try as image route (will error for PDFs, but logs will reflect root cause)
        messages = [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract bill data from this image.' },
              { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } }
            ]
          }
        ];
      }
    } else {
      // Non-PDF: treat as image
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract bill data from this image.' },
            { type: 'image_url', image_url: { url: `data:application/octet-stream;base64,${base64}` } }
          ]
        }
      ];
    }

    while (retryCount <= maxRetries) {
      try {
        console.log(`Calling OpenAI API (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', response.status, errorText);
          
          // Retry on rate limit or server errors
          if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
          
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error;
        }
        retryCount++;
      }
    }
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
          
          // Retry on rate limit or server errors
          if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
          
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error;
        }
        retryCount++;
      }
    }

    console.log(`OpenAI extraction took ${Date.now() - extractionStartTime}ms`);

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
