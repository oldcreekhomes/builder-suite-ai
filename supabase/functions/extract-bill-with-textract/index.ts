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

  let pendingUploadId: string;
  
  try {
    const body = await req.json();
    pendingUploadId = body.pendingUploadId;

    if (!pendingUploadId) {
      throw new Error('Missing pendingUploadId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    const awsSessionToken = Deno.env.get('AWS_SESSION_TOKEN'); // Optional for temporary credentials
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    console.log('AWS Configuration:', {
      region: awsRegion,
      hasSessionToken: !!awsSessionToken,
      accessKeyIdPrefix: awsAccessKeyId.substring(0, 4) // Log first 4 chars for diagnostics
    });

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
      awsRegion,
      awsSessionToken
    );

    console.log('Textract response received');

    // Parse Textract results
    const extractedData = parseTextractResponse(textractResponse);

    console.log('Raw extracted data:', extractedData);

    // Validate amount - if > $1M, likely a parsing error
    if (extractedData.total || extractedData.totalAmount) {
      const amount = extractedData.total || extractedData.totalAmount;
      if (amount && amount > 1000000) {
        console.warn('⚠️ Suspicious amount detected:', amount, '- setting to null');
        extractedData.total = null;
        extractedData.totalAmount = null;
      }
    }

    // Clean vendor name (fix newlines and extra whitespace)
    if (extractedData.vendor) {
      extractedData.vendor = extractedData.vendor.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('Cleaned vendor name:', extractedData.vendor);
    }

    // Determine effectiveOwnerId (use home_builder_id if uploader is employee)
    const { data: uploaderUser } = await supabase
      .from('users')
      .select('role, home_builder_id')
      .eq('id', upload.owner_id)
      .single();
    
    const effectiveOwnerId = (uploaderUser?.role === 'employee' && uploaderUser?.home_builder_id) 
      ? uploaderUser.home_builder_id 
      : upload.owner_id;
    
    console.log('Effective owner for vendor matching:', effectiveOwnerId);

    // Fetch learning examples for this company
    const { data: learningExamples } = await supabase
      .from('bill_categorization_examples')
      .select('*')
      .eq('owner_id', effectiveOwnerId)
      .order('created_at', { ascending: false })
      .limit(100);

    console.log(`📚 Loaded ${learningExamples?.length || 0} learning examples for categorization`);

    // Robust vendor matching using aliases, acronyms, and similarity
    let vendorId: string | null = null;
    if (extractedData.vendor) {
      const normalized = normalizeVendorName(extractedData.vendor);
      
      // STEP 1: Check vendor aliases first (fastest, most accurate)
      console.log(`Checking vendor aliases for "${extractedData.vendor}" (normalized: "${normalized}")`);
      const { data: aliasMatch } = await supabase
        .from('vendor_aliases')
        .select('company_id, companies(company_name, terms)')
        .eq('owner_id', effectiveOwnerId)
        .eq('normalized_alias', normalized)
        .limit(1)
        .single();
      
      if (aliasMatch?.company_id) {
        const companyName = aliasMatch.companies?.company_name || 'matched company';
        const companyTerms = aliasMatch.companies?.terms;
        vendorId = aliasMatch.company_id;
        console.log(`✓ Alias match: "${extractedData.vendor}" → "${companyName}" (via learned alias)`);
        
        // Replace vendor name with matched company name
        extractedData.vendor = companyName;
        
        // Auto-fill terms if available and not already extracted
        if (companyTerms && !extractedData.terms) {
          extractedData.terms = companyTerms;
          console.log(`  Auto-filled terms from vendor: "${companyTerms}"`);
        }
      } else {
        // STEP 2: Check for acronym matching (e.g., "JZSC" → "JZ Structural Consulting")
        const isAcronym = (str: string) => {
          const norm = str.replace(/[\s\.]/g, '').toUpperCase();
          return norm.length >= 3 && norm.length <= 8 && /^[A-Z]+$/.test(norm);
        };
        
        const getCompanyInitials = (companyName: string): string => {
          // Strip common legal suffixes before processing
          const suffixes = /\b(Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company|LP|LLP|PLLC|PC)\b\.?$/i;
          const nameWithoutSuffix = companyName.replace(suffixes, '').trim();

          return nameWithoutSuffix
            .split(/[\s\-]+/)
            .filter(Boolean)
            .map(word => {
              const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
              if (!cleaned) return '';
              // Preserve multi-letter acronyms (2-4 uppercase letters)
              if (cleaned.length >= 2 && cleaned.length <= 4 && cleaned === cleaned.toUpperCase()) {
                return cleaned;
              }
              return cleaned[0].toUpperCase();
            })
            .filter(Boolean)
            .join('');
        };
        
        if (isAcronym(extractedData.vendor)) {
          const acronym = extractedData.vendor.replace(/[\s\.]/g, '').toUpperCase();
          console.log(`Checking acronym match for "${acronym}"`);
          
          const { data: companies } = await supabase
            .from('companies')
            .select('id, company_name, terms')
            .eq('home_builder_id', effectiveOwnerId);
          
          for (const company of companies || []) {
            const initials = getCompanyInitials(company.company_name);
            if (initials === acronym) {
              vendorId = company.id;
              console.log(`✓ Acronym match: "${extractedData.vendor}" → "${company.company_name}" (${acronym})`);
              
              // Replace vendor name with matched company name
              extractedData.vendor = company.company_name;
              
              // Auto-fill terms if available and not already extracted
              if (company.terms && !extractedData.terms) {
                extractedData.terms = company.terms;
                console.log(`  Auto-filled terms from vendor: "${company.terms}"`);
              }
              break;
            }
          }
        }
        
        // STEP 3: Fuzzy matching (existing fallback)
        if (!vendorId) {
          console.log(`Trying fuzzy match for "${extractedData.vendor}"`);
          const { data: companies } = await supabase
            .from('companies')
            .select('id, company_name, terms')
            .eq('home_builder_id', effectiveOwnerId);
          
          if (companies && companies.length > 0) {
            let bestMatch: { id: string; score: number; name: string; terms?: string | null } | null = null;
            
            for (const company of companies) {
              const similarity = calculateVendorSimilarity(extractedData.vendor, company.company_name);
              
              if (similarity > 0.8 && (!bestMatch || similarity > bestMatch.score)) {
                bestMatch = { 
                  id: company.id, 
                  score: similarity, 
                  name: company.company_name,
                  terms: company.terms 
                };
              }
            }
            
            if (bestMatch) {
              vendorId = bestMatch.id;
              console.log(`✓ Fuzzy match: "${extractedData.vendor}" → "${bestMatch.name}" (${(bestMatch.score * 100).toFixed(1)}% confidence)`);
              
              // Replace vendor name with matched company name from database
              extractedData.vendor = bestMatch.name;
              
              // Auto-fill terms from vendor if available and not already extracted
              if (bestMatch.terms && !extractedData.terms) {
                extractedData.terms = bestMatch.terms;
                console.log(`  Auto-filled terms from vendor: "${bestMatch.terms}"`);
              }
            } else {
              console.log(`✗ No vendor match found for "${extractedData.vendor}" (best similarity < 80%)`);
            }
          }
        }
      }
    }

    // Normalize terms to match system format (e.g., "Net 30" -> "net-30")
    if (extractedData.terms) {
      const originalTerms = extractedData.terms;
      extractedData.terms = normalizeTerms(extractedData.terms);
      if (originalTerms !== extractedData.terms) {
        console.log(`  Normalized terms: "${originalTerms}" -> "${extractedData.terms}"`);
      }
    }

    // Infer terms from date difference (smart date-based inference)
    const inferredTerms = inferTermsFromDates(extractedData.billDate, extractedData.dueDate);
    if (inferredTerms) {
      if (!extractedData.terms) {
        extractedData.terms = inferredTerms;
        console.log(`✅ Using date-based inference: "${inferredTerms}" (no terms extracted)`);
      } else if (extractedData.terms !== inferredTerms) {
        console.log(`ℹ️ Date inference (${inferredTerms}) differs from extracted (${extractedData.terms})`);
        extractedData.terms = inferredTerms;
        console.log(`✅ Overriding with date-based inference: "${inferredTerms}"`);
      } else {
        console.log(`✅ Date inference confirms extracted terms: "${inferredTerms}"`);
      }
    }

    // Add vendor_id to extracted data if matched
    if (vendorId) {
      extractedData.vendor_id = vendorId;
    }

    // Get the matched vendor name for learning
    let matchedVendorName: string | null = null;
    if (vendorId) {
      const { data: matchedVendor } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', vendorId)
        .single();
      matchedVendorName = matchedVendor?.company_name || null;
    }

    // Auto-assign cost code if vendor has exactly one
    if (vendorId && extractedData.lineItems && Array.isArray(extractedData.lineItems)) {
      console.log('Checking for single cost code auto-assignment...');
      extractedData.lineItems = await autoAssignSingleCostCode(
        vendorId,
        extractedData.lineItems,
        supabase
      );
    }

/**
 * Auto-assign cost code if vendor has exactly one associated cost code
 */
async function autoAssignSingleCostCode(
  vendorId: string,
  lineItems: any[],
  supabase: any
): Promise<any[]> {
  try {
    // Check if vendor has exactly one cost code
    const { data: costCodes, error } = await supabase
      .from('company_cost_codes')
      .select(`
        cost_code_id,
        cost_codes (
          id,
          code,
          name
        )
      `)
      .eq('company_id', vendorId);
    
    if (error) {
      console.error('Error fetching vendor cost codes:', error);
      return lineItems;
    }
    
    if (!costCodes || costCodes.length !== 1) {
      // Vendor has 0 or multiple cost codes - no auto-assignment
      if (costCodes && costCodes.length > 1) {
        console.log(`  Vendor has ${costCodes.length} cost codes - no auto-assignment`);
      }
      return lineItems;
    }
    
    const costCode = costCodes[0].cost_codes;
    if (!costCode) {
      console.log('  Cost code data missing');
      return lineItems;
    }
    
    console.log(`✅ Vendor has exactly 1 cost code: ${costCode.code}: ${costCode.name}`);
    
    // Auto-assign to all lines without a cost code
    let assignedCount = 0;
    const updatedItems = lineItems.map((item: any) => {
      if (!item.costCodeName || item.costCodeName === '') {
        assignedCount++;
        console.log(`  → Auto-assigning to line: "${item.description}"`);
        return {
          ...item,
          costCodeName: `${costCode.code}: ${costCode.name}`
        };
      }
      return item;
    });
    
    if (assignedCount > 0) {
      console.log(`✅ Auto-assigned cost code to ${assignedCount} line item(s)`);
    }
    
    return updatedItems;
  } catch (e) {
    console.error('Error in autoAssignSingleCostCode:', e);
    return lineItems;
  }
}

    // Apply learning examples to categorize line items
    if (learningExamples && learningExamples.length > 0 && extractedData.lineItems && extractedData.lineItems.length > 0) {
      console.log('🎯 Applying learning examples to line items...');
      for (const lineItem of extractedData.lineItems) {
        if (lineItem.description) {
          const bestMatch = findBestLearningMatch(
            lineItem.description,
            learningExamples,
            matchedVendorName
          );
          
          if (bestMatch && bestMatch.similarity > 0.6) {
            console.log(`  ✓ Matched "${lineItem.description.substring(0, 50)}..." to past example (${(bestMatch.similarity * 100).toFixed(0)}% similar)`);
            console.log(`    → Account: ${bestMatch.example.account_name || 'none'}, Cost Code: ${bestMatch.example.cost_code_name || 'none'}`);
            
            lineItem.account_id = bestMatch.example.account_id;
            lineItem.account_name = bestMatch.example.account_name;
            lineItem.cost_code_id = bestMatch.example.cost_code_id;
            lineItem.cost_code_name = bestMatch.example.cost_code_name;
          }
        }
      }
    }

    // Calculate due date from terms if bill date exists and due date is not set
    if (extractedData.billDate && !extractedData.dueDate && extractedData.terms) {
      const billDate = new Date(extractedData.billDate);
      const termsLower = extractedData.terms.toLowerCase();
      
      if (termsLower.includes('due-on-receipt') || termsLower.includes('due on receipt') || termsLower.includes('receipt')) {
        // Due on receipt = same as bill date
        extractedData.dueDate = extractedData.billDate;
        console.log(`  Calculated due date from "due-on-receipt": ${extractedData.dueDate}`);
      } else if (termsLower.includes('net')) {
        // Extract number from "Net 30", "Net 15", etc.
        const match = termsLower.match(/net\s*(\d+)/);
        if (match) {
          const days = parseInt(match[1]);
          const dueDate = new Date(billDate);
          dueDate.setDate(dueDate.getDate() + days);
          extractedData.dueDate = dueDate.toISOString().split('T')[0];
          console.log(`  Calculated due date from "Net ${days}": ${extractedData.dueDate}`);
        }
      }
    }

    console.log('Final extracted data with vendor match:', extractedData);

    // Update the pending upload with extracted data and keep status='extracted'
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
    
    // Determine if this is an AWS auth error
    const isAuthError = error.message && (
      error.message.includes('UnrecognizedClientException') ||
      error.message.includes('InvalidClientTokenId') ||
      error.message.includes('SignatureDoesNotMatch') ||
      error.message.includes('security token')
    );
    
    const errorMessage = isAuthError 
      ? 'AWS credentials invalid or expired. Please check your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN (if using temporary credentials).'
      : error.message;
    
    // Try to update status to error
    if (pendingUploadId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('pending_bill_uploads')
          .update({
            status: 'error',
            error_message: errorMessage,
          })
          .eq('id', pendingUploadId);
      } catch (e) {
        console.error('Failed to update error status:', e);
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
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
  region: string,
  sessionToken?: string
) {
  const endpoint = `https://textract.${region}.amazonaws.com/`;
  const service = 'textract';
  const method = 'POST';
  const target = 'Textract.AnalyzeExpense';

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
    target,
    sessionToken
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
  target: string,
  sessionToken?: string
) {
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // Create canonical request with proper header ordering
  const payloadHash = await sha256(payload);
  const host = `textract.${region}.amazonaws.com`;
  
  // Build canonical headers in sorted order (lowercase)
  let canonicalHeaders = `content-type:application/x-amz-json-1.1\n`;
  canonicalHeaders += `host:${host}\n`;
  canonicalHeaders += `x-amz-content-sha256:${payloadHash}\n`;
  canonicalHeaders += `x-amz-date:${amzDate}\n`;
  if (sessionToken) {
    canonicalHeaders += `x-amz-security-token:${sessionToken}\n`;
  }
  canonicalHeaders += `x-amz-target:${target}\n`;

  // Build signed headers list (must match canonical headers order)
  let signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  if (sessionToken) {
    signedHeaders += ';x-amz-security-token';
  }
  signedHeaders += ';x-amz-target';

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

  // Return headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    'Host': host,
    'X-Amz-Content-Sha256': payloadHash,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    'Authorization': authorizationHeader,
  };

  if (sessionToken) {
    headers['X-Amz-Security-Token'] = sessionToken;
  }

  return headers;
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
    terms: null,
    totalAmount: null,
    referenceNumber: null,
    lineItems: [],
  };

  if (!textractData.ExpenseDocuments || textractData.ExpenseDocuments.length === 0) {
    return extractedData;
  }

  const expenseDoc = textractData.ExpenseDocuments[0];

  // Track all total-related fields to prioritize grand_total
  const totalFields: { type: string; value: number }[] = [];

  // Extract summary fields
  if (expenseDoc.SummaryFields) {
    console.log('📋 Textract Summary Fields:');
    for (const field of expenseDoc.SummaryFields) {
      const type = field.Type?.Text?.toLowerCase();
      const value = field.ValueDetection?.Text;

      // Log all field types for debugging
      if (type && value) {
        console.log(`  - ${type}: ${value}`);
      }

      if (!value) continue;

      switch (type) {
        case 'vendor_name':
        case 'vendor':
          extractedData.vendor = value;
          break;
        case 'invoice_receipt_date':
        case 'invoice_date':
        case 'order_date':
        case 'date':
          extractedData.billDate = value;
          break;
        case 'due_date':
          extractedData.dueDate = value;
          break;
        case 'terms':
        case 'payment_terms':
        case 'payment_due':
          extractedData.terms = value;
          break;
        case 'grand_total':
        case 'total':
        case 'amount_paid':
        case 'amount_due':
        case 'invoice_total':
          // Store all total fields with priority (grand_total has highest priority)
          const parsedAmount = parseFloat(value.replace(/[^0-9.]/g, ''));
          if (parsedAmount) {
            totalFields.push({ type, value: parsedAmount });
          }
          break;
        case 'invoice_receipt_id':
        case 'invoice_number':
          extractedData.referenceNumber = value;
          break;
      }
    }

    // Prioritize grand_total for total amount (especially important for Amazon invoices)
    if (totalFields.length > 0) {
      const grandTotal = totalFields.find(f => f.type === 'grand_total');
      if (grandTotal) {
        extractedData.totalAmount = grandTotal.value;
        console.log(`  ✓ Using grand_total: $${grandTotal.value}`);
      } else {
        // Use the first total found if no grand_total
        extractedData.totalAmount = totalFields[0].value;
        console.log(`  ✓ Using ${totalFields[0].type}: $${totalFields[0].value}`);
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

// Normalize payment terms to standard values
function normalizeTerms(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  
  const normalized = terms.toLowerCase().trim();
  
  // Net 15 variations
  if (normalized.match(/\b(net\s*15|n\s*15|15\s*days?|within\s*15\s*days?)\b/i)) {
    return 'net-15';
  }
  
  // Net 30 variations
  if (normalized.match(/\b(net\s*30|n\s*30|30\s*days?|within\s*30\s*days?|pay\s*within\s*30\s*days?|please\s*pay\s*within\s*30\s*days?)\b/i)) {
    return 'net-30';
  }
  
  // Net 60 variations
  if (normalized.match(/\b(net\s*60|n\s*60|60\s*days?|within\s*60\s*days?)\b/i)) {
    return 'net-60';
  }
  
  // Due on receipt variations
  if (normalized.match(/\b(due\s*on\s*receipt|upon\s*receipt|receipt|cod|cash\s*on\s*delivery|immediate|net\s*0)\b/i)) {
    return 'due-on-receipt';
  }
  
  // Default to net-30
  console.log(`Warning: Could not normalize payment terms "${terms}", defaulting to net-30`);
  return 'net-30';
}

// Infer payment terms from date difference (smart date-based inference)
function inferTermsFromDates(billDate: string | null, dueDate: string | null): string | null {
  if (!billDate || !dueDate) return null;
  
  try {
    const bill = new Date(billDate);
    const due = new Date(dueDate);
    
    // Calculate difference in days
    const diffTime = Math.abs(due.getTime() - bill.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Date difference: ${diffDays} days (${billDate} to ${dueDate})`);
    
    // Map to standard terms with ranges
    if (diffDays <= 2) {
      console.log('  → Inferred: due-on-receipt');
      return 'due-on-receipt';
    }
    if (diffDays >= 13 && diffDays <= 17) {
      console.log('  → Inferred: net-15');
      return 'net-15';
    }
    if (diffDays >= 28 && diffDays <= 32) {
      console.log('  → Inferred: net-30');
      return 'net-30';
    }
    if (diffDays >= 58 && diffDays <= 62) {
      console.log('  → Inferred: net-60');
      return 'net-60';
    }
    
    // Wider ranges for edge cases
    if (diffDays >= 25 && diffDays <= 35) {
      console.log('  → Inferred: net-30 (wider range)');
      return 'net-30';
    }
    if (diffDays >= 55 && diffDays <= 65) {
      console.log('  → Inferred: net-60 (wider range)');
      return 'net-60';
    }
    if (diffDays >= 10 && diffDays <= 20) {
      console.log('  → Inferred: net-15 (wider range)');
      return 'net-15';
    }
    
    console.log(`  ℹ️ Could not map ${diffDays} days to a standard term`);
    return null;
  } catch (e) {
    console.error('Error calculating date difference:', e);
    return null;
  }
}

// Normalize vendor name for comparison (same logic as in extract-bill-data)
function normalizeVendorName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  // Remove common domain prefixes (www., http://, https://)
  normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Remove common domain extensions anywhere in the string (not just at the end)
  // This handles cases like "amazon.com" -> "amazon"
  normalized = normalized.replace(/\.(com|net|org|co|biz|info|us|edu|gov)(\b|$)/gi, '');
  
  // Remove all non-alphanumeric except spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove common business suffixes
  normalized = normalized.replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '');
  
  return normalized.trim();
}

// Calculate similarity between two vendor names (Levenshtein distance)
function calculateVendorSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeVendorName(str1);
  const norm2 = normalizeVendorName(str2);
  
  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0.0;
  
  const matrix: number[][] = [];
  const len1 = norm1.length;
  const len2 = norm2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}

/**
 * Find the best matching learning example for a given description
 * Prioritizes: exact matches > vendor-specific matches > general matches
 */
function findBestLearningMatch(
  description: string,
  examples: any[],
  vendorName?: string | null
): { example: any; similarity: number } | null {
  if (!description || !examples || examples.length === 0) return null;

  const normalizedDescription = description.toLowerCase().trim();
  let bestMatch: { example: any; similarity: number } | null = null;

  for (const example of examples) {
    if (!example.description) continue;

    const normalizedExample = example.description.toLowerCase().trim();
    
    // Calculate base similarity using Levenshtein distance
    let similarity = calculateTextSimilarity(normalizedDescription, normalizedExample);

    // Boost score for vendor-specific examples
    if (vendorName && example.vendor_name) {
      const normalizedVendor = normalizeVendorName(vendorName);
      const normalizedExampleVendor = normalizeVendorName(example.vendor_name);
      if (normalizedVendor === normalizedExampleVendor) {
        similarity *= 1.2; // 20% boost for same vendor
      }
    }

    // Boost score for exact matches
    if (normalizedDescription === normalizedExample) {
      similarity = 1.0;
    }

    // Check for keyword matches (additional boost)
    const descWords = normalizedDescription.split(/\s+/).filter(w => w.length > 3);
    const exampleWords = normalizedExample.split(/\s+/).filter(w => w.length > 3);
    const commonWords = descWords.filter(word => exampleWords.includes(word));
    if (commonWords.length > 0) {
      similarity += commonWords.length * 0.05; // Small boost per matching keyword
    }

    // Cap similarity at 1.0
    similarity = Math.min(similarity, 1.0);

    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { example, similarity };
    }
  }

  return bestMatch;
}

/**
 * Calculate text similarity between two strings using Levenshtein distance
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1.0;
  
  const matrix: number[][] = [];
  const len1 = text1.length;
  const len2 = text2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}
