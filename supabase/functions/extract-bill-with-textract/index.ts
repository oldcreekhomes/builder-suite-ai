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
    const { pendingUploadId } = await req.json();

    if (!pendingUploadId) {
      throw new Error('Missing pendingUploadId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the pending upload record
    const { data: upload, error: uploadError } = await supabase
      .from('pending_bill_uploads')
      .select('*')
      .eq('id', pendingUploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error('Upload not found');
    }

    // Update status to processing
    await supabase
      .from('pending_bill_uploads')
      .update({ status: 'processing' })
      .eq('id', pendingUploadId);

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bill-attachments')
      .download(upload.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file from storage');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Document = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    console.log('Calling AWS Textract...');

    // Call AWS Textract
    const textractResponse = await callTextract(
      base64Document,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion
    );

    console.log('Textract response received');

    // Parse Textract results
    const extractedData = parseTextractResponse(textractResponse);

    console.log('Extracted data:', extractedData);

    // Update the pending upload with extracted data
    const { error: updateError } = await supabase
      .from('pending_bill_uploads')
      .update({
        status: 'extracted',
        extracted_data: extractedData,
      })
      .eq('id', pendingUploadId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-bill-with-textract:', error);

    // Try to update status to error
    try {
      const { pendingUploadId } = await req.json();
      if (pendingUploadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('pending_bill_uploads')
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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function callTextract(
  base64Document: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
) {
  const endpoint = `https://textract.${region}.amazonaws.com/`;
  const service = 'textract';
  const method = 'POST';
  const target = 'Textract_20180601.AnalyzeExpense';

  const payload = JSON.stringify({
    Document: {
      Bytes: base64Document,
    },
  });

  const headers = await signRequest(
    method,
    endpoint,
    service,
    region,
    payload,
    accessKeyId,
    secretAccessKey,
    target
  );

  const response = await fetch(endpoint, {
    method,
    headers,
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Textract API error:', errorText);
    throw new Error(`Textract API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function signRequest(
  method: string,
  endpoint: string,
  service: string,
  region: string,
  payload: string,
  accessKeyId: string,
  secretAccessKey: string,
  target: string
) {
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // Create canonical request
  const payloadHash = await sha256(payload);
  const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:textract.${region}.amazonaws.com\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = `${method}\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);

  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    'Authorization': authorizationHeader,
  };
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const msgBuffer = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode(`AWS4${key}`), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  return kSigning;
}

async function hmacSha256Raw(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

function parseTextractResponse(textractData: any): any {
  const extractedData: any = {
    vendor: null,
    billDate: null,
    dueDate: null,
    totalAmount: null,
    referenceNumber: null,
    lineItems: [],
  };

  if (!textractData.ExpenseDocuments || textractData.ExpenseDocuments.length === 0) {
    return extractedData;
  }

  const expenseDoc = textractData.ExpenseDocuments[0];

  // Extract summary fields
  if (expenseDoc.SummaryFields) {
    for (const field of expenseDoc.SummaryFields) {
      const type = field.Type?.Text?.toLowerCase();
      const value = field.ValueDetection?.Text;

      if (!value) continue;

      switch (type) {
        case 'vendor_name':
        case 'vendor':
          extractedData.vendor = value;
          break;
        case 'invoice_receipt_date':
        case 'date':
          extractedData.billDate = value;
          break;
        case 'due_date':
          extractedData.dueDate = value;
          break;
        case 'total':
        case 'amount_paid':
          extractedData.totalAmount = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
          break;
        case 'invoice_receipt_id':
        case 'invoice_number':
          extractedData.referenceNumber = value;
          break;
      }
    }
  }

  // Extract line items
  if (expenseDoc.LineItemGroups) {
    for (const lineItemGroup of expenseDoc.LineItemGroups) {
      if (lineItemGroup.LineItems) {
        for (const lineItem of lineItemGroup.LineItems) {
          const item: any = {
            description: null,
            quantity: null,
            unitPrice: null,
            amount: null,
          };

          if (lineItem.LineItemExpenseFields) {
            for (const field of lineItem.LineItemExpenseFields) {
              const type = field.Type?.Text?.toLowerCase();
              const value = field.ValueDetection?.Text;

              if (!value) continue;

              switch (type) {
                case 'item':
                case 'description':
                  item.description = value;
                  break;
                case 'quantity':
                  item.quantity = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
                  break;
                case 'unit_price':
                case 'price':
                  item.unitPrice = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
                  break;
                case 'expense_row':
                case 'amount':
                  item.amount = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
                  break;
              }
            }
          }

          if (item.description || item.amount) {
            extractedData.lineItems.push(item);
          }
        }
      }
    }
  }

  return extractedData;
}
