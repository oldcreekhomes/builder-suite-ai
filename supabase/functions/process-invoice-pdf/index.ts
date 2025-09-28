import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedInvoiceData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  confidence?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { fileName, fileData, mimeType } = await req.json();

    console.log(`Processing invoice: ${fileName}`);

    // Create the prompt for invoice data extraction
    const systemPrompt = `You are an expert invoice data extraction AI. Analyze the provided invoice PDF and extract key information with high accuracy. 

Extract the following information in JSON format:
{
  "vendorName": "Company/vendor name that issued the invoice",
  "invoiceNumber": "Invoice number or reference",
  "invoiceDate": "Invoice date in YYYY-MM-DD format",
  "dueDate": "Due date in YYYY-MM-DD format (if available)",
  "totalAmount": "Total amount as a number (no currency symbols)",
  "lineItems": [
    {
      "description": "Line item description",
      "quantity": "Quantity as number (if available)",
      "unitPrice": "Unit price as number (if available)",
      "amount": "Line item total as number"
    }
  ],
  "confidence": "Your confidence in the extraction accuracy (0.0 to 1.0)"
}

Important guidelines:
- Extract exact text as it appears, no modifications
- For dates, convert to YYYY-MM-DD format
- For amounts, extract only numbers (remove currency symbols, commas)
- If information is unclear or missing, use null
- Be conservative with confidence scores - only use 0.9+ if you're very certain
- Focus on the most prominent line items (max 5)
- For construction/contractor invoices, pay attention to job/project details in descriptions`;

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract the invoice data from this PDF file: ${fileName}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${fileData}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1 // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const aiResponse = await response.json();
    const extractedText = aiResponse.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No response from AI model');
    }

    console.log('AI Response:', extractedText);

    // Parse the JSON response
    let extractedData: ExtractedInvoiceData;
    try {
      // Try to extract JSON from the response (sometimes AI adds markdown formatting)
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : extractedText;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: create basic structure with extracted text
      extractedData = {
        vendorName: extractVendorFromText(extractedText),
        confidence: 0.3 // Low confidence for fallback
      };
    }

    // Validate and clean extracted data
    if (extractedData.totalAmount && typeof extractedData.totalAmount === 'string') {
      extractedData.totalAmount = parseFloat(extractedData.totalAmount.replace(/[^0-9.-]/g, ''));
    }

    // Ensure confidence is within bounds
    if (extractedData.confidence) {
      extractedData.confidence = Math.min(1.0, Math.max(0.0, extractedData.confidence));
    } else {
      extractedData.confidence = 0.5; // Default confidence
    }

    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        extractedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing invoice:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        extractedData: {
          confidence: 0.0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to avoid UI errors, but include error in response
      }
    );
  }
});

// Helper function to extract vendor name from unstructured text (fallback)
function extractVendorFromText(text: string): string | undefined {
  // Simple heuristics to find vendor name
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for common vendor indicators
  for (const line of lines) {
    if (line.toLowerCase().includes('from:') || 
        line.toLowerCase().includes('vendor:') ||
        line.toLowerCase().includes('company:')) {
      const parts = line.split(/from:|vendor:|company:/i);
      if (parts.length > 1) {
        return parts[1].trim();
      }
    }
  }
  
  // Fallback: return first meaningful line that might be a company name
  for (const line of lines) {
    if (line.length > 5 && line.length < 100 && 
        /^[A-Z]/.test(line) && 
        !line.toLowerCase().includes('invoice') &&
        !line.toLowerCase().includes('bill')) {
      return line;
    }
  }
  
  return undefined;
}