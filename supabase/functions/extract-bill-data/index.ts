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

// Normalize vendor name for comparison
function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove all non-alphanumeric except spaces (including +)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '') // Remove common suffixes
    .trim();
}

// Calculate similarity between two strings (Levenshtein distance-based)
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeVendorName(str1);
  const norm2 = normalizeVendorName(str2);
  
  if (norm1 === norm2) return 1.0; // Perfect match
  if (norm1.length === 0 || norm2.length === 0) return 0.0;
  
  // Calculate Levenshtein distance
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
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}

// Helper function to normalize payment terms to standard values
function normalizePaymentTerms(terms: string | null | undefined): string | null {
  if (!terms) return null;
  
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
  
  // Default to net-30 if we can't parse it
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
    
    // Map to standard terms with ranges (allowing for month length variations)
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
    
    // Wider ranges for edge cases (allow ±3 days)
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

// Extract company initials/acronym (e.g., "JZ Structural Engineering" -> "JZSE")
// Handles multi-letter acronyms like "JZ" correctly and ignores legal suffixes
function getCompanyInitials(companyName: string): string {
  // Common legal suffixes to ignore
  const suffixes = /\b(Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company|LP|LLP|PLLC|PC)\b\.?$/i;
  
  // Remove suffixes first
  const nameWithoutSuffix = companyName.replace(suffixes, '').trim();
  
  return nameWithoutSuffix
    .split(/[\s\-]+/)
    .filter(word => word.length > 0)
    .map(word => {
      // Remove punctuation from word
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned.length === 0) return '';
      
      // If word is already a 2-4 letter acronym (all uppercase), use all letters
      if (cleaned.length >= 2 && cleaned.length <= 4 && cleaned === cleaned.toUpperCase()) {
        return cleaned;
      }
      
      // Otherwise, take just the first letter
      return cleaned[0].toUpperCase();
    })
    .filter(part => part.length > 0)
    .join('');
}

// Check if string looks like an acronym (3-8 uppercase letters, maybe with spaces/periods)
function isAcronymLike(str: string): boolean {
  const normalized = str.replace(/[\s\.]/g, '').toUpperCase();
  return normalized.length >= 3 && normalized.length <= 8 && /^[A-Z]+$/.test(normalized);
}

// Find matching vendor in database - now with alias and acronym support
async function findMatchingVendor(vendorName: string, supabase: any, ownerId: string): Promise<string | null> {
  if (!vendorName) return null;
  
  const normalized = normalizeVendorName(vendorName);
  
  // STEP 1: Check vendor aliases first (fastest, most accurate)
  console.log(`Checking vendor aliases for "${vendorName}" (normalized: "${normalized}")`);
  const { data: aliasMatch } = await supabase
    .from('vendor_aliases')
    .select('company_id, companies(company_name)')
    .eq('owner_id', ownerId)
    .eq('normalized_alias', normalized)
    .limit(1)
    .single();
  
  if (aliasMatch?.company_id) {
    const companyName = aliasMatch.companies?.company_name || 'matched company';
    console.log(`✓ Alias match: "${vendorName}" → "${companyName}" (via learned alias)`);
    return aliasMatch.company_id;
  }
  
  // STEP 2: Check for acronym matching (e.g., "JZSC" → "JZ Structural Consulting")
  if (isAcronymLike(vendorName)) {
    const acronym = vendorName.replace(/[\s\.]/g, '').toUpperCase();
    console.log(`Checking acronym match for "${acronym}"`);
    
    const { data: companies } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('home_builder_id', ownerId);
    
    for (const company of companies || []) {
      const initials = getCompanyInitials(company.company_name);
      if (initials === acronym) {
        console.log(`✓ Acronym match: "${vendorName}" → "${company.company_name}" (${acronym})`);
        return company.id;
      }
    }
  }
  
  // STEP 3: Fuzzy matching (existing fallback)
  console.log(`Trying fuzzy match for "${vendorName}"`);
  const { data: companies } = await supabase
    .from('companies')
    .select('id, company_name')
    .eq('home_builder_id', ownerId);
  
  if (!companies || companies.length === 0) return null;
  
  let bestMatch: { id: string; score: number; name: string } | null = null;
  
  for (const company of companies) {
    const similarity = calculateSimilarity(vendorName, company.company_name);
    
    if (similarity > 0.8 && (!bestMatch || similarity > bestMatch.score)) {
      bestMatch = { id: company.id, score: similarity, name: company.company_name };
    }
  }
  
  if (bestMatch) {
    console.log(`✓ Fuzzy match: "${vendorName}" → "${bestMatch.name}" (${(bestMatch.score * 100).toFixed(1)}% confidence)`);
    return bestMatch.id;
  }
  
  console.log(`✗ No match found for "${vendorName}"`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: any;
  try {
    requestBody = await req.json();
    const { pendingUploadId, pdfText, pageImages, enrichContactOnly } = requestBody;

    if (!pendingUploadId) {
      throw new Error('pendingUploadId is required');
    }

    console.log('Processing bill extraction for upload:', pendingUploadId, enrichContactOnly ? '(contact enrichment mode)' : '');

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

    // Determine effectiveOwnerId (use home_builder_id if uploader is employee)
    const { data: uploaderUser } = await supabase
      .from('users')
      .select('role, home_builder_id')
      .eq('id', pendingUpload.owner_id)
      .single();
    
    const effectiveOwnerId = (uploaderUser?.role === 'employee' && uploaderUser?.home_builder_id) 
      ? uploaderUser.home_builder_id 
      : pendingUpload.owner_id;
    
    console.log('Effective owner for data queries:', effectiveOwnerId, '(uploader role:', uploaderUser?.role, ')');

    // Fetch user's accounts and cost codes for categorization (using effectiveOwnerId)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code, name, type')
      .eq('owner_id', effectiveOwnerId)
      .eq('is_active', true)
      .order('code');

    const { data: costCodes } = await supabase
      .from('cost_codes')
      .select('id, code, name, category')
      .eq('owner_id', effectiveOwnerId)
      .order('code');

    // Fetch companies with their associated cost codes (using effectiveOwnerId)
    const { data: companiesWithCostCodes } = await supabase
      .from('companies')
      .select(`
        id,
        company_name,
        company_cost_codes (
          cost_code_id,
          cost_codes (
            id,
            code,
            name,
            category
          )
        )
      `)
      .eq('home_builder_id', effectiveOwnerId);

    // Fetch recent categorization examples for AI learning (using effectiveOwnerId)
    const { data: learningExamples } = await supabase
      .from('bill_categorization_examples')
      .select('vendor_name, description, account_name, cost_code_name')
      .eq('owner_id', effectiveOwnerId)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`Found ${accounts?.length || 0} accounts, ${costCodes?.length || 0} cost codes, and ${learningExamples?.length || 0} past categorizations for AI learning`);

    // Update status to processing
    await supabase
      .from('pending_bill_uploads')
      .update({ status: 'processing' })
      .eq('id', pendingUploadId);

    // Only download file if we need to process it as an image (no text/pageImages provided)
    let base64 = '';
    if (!pdfText && !pageImages) {
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

    // Build company-cost code context for smart assignment
    const companyContext = companiesWithCostCodes && companiesWithCostCodes.length > 0
      ? `\n\nCOMPANY-SPECIFIC COST CODES:\n${companiesWithCostCodes.map(company => {
          const costCodes = company.company_cost_codes
            .map((cc: any) => cc.cost_codes)
            .filter(Boolean);
          
          if (costCodes.length === 0) return null;
          
          return `- ${company.company_name}:\n${costCodes.map((cc: any) => 
            `  * ${cc.code}: ${cc.name}${cc.category ? ` (${cc.category})` : ''}`
          ).join('\n')}`;
        }).filter(Boolean).join('\n')}`
      : '';

    // Build learning examples context (few-shot learning)
    const learningContext = learningExamples && learningExamples.length > 0
      ? `\n\nPAST CATEGORIZATION EXAMPLES (learn from these patterns):\n${learningExamples.map((ex, idx) => 
          `${idx + 1}. Vendor: ${ex.vendor_name}\n   Description: "${ex.description}"\n   → Account: ${ex.account_name || 'none'}, Cost Code: ${ex.cost_code_name || 'none'}`
        ).join('\n')}\n\nUse these examples to learn categorization patterns. When you see similar descriptions, apply the same categorization logic.`
      : '';

    // Use different prompt based on enrichContactOnly flag
    const systemPrompt = enrichContactOnly 
      ? `You are an AI that extracts ONLY vendor contact information from bills/invoices.

⚠️ CRITICAL: FIELD NAMING REQUIREMENT ⚠️
ALL field names MUST use snake_case (e.g., vendor_name, vendor_address).
DO NOT use camelCase (e.g., vendorName, vendorAddress) - the system will REJECT camelCase.

Extract ONLY the following vendor contact information and return as valid JSON:
{
  "vendor_name": "string - company name from invoice",
  "vendor_address": "string - COMPLETE address from letterhead/header/footer, or null",
  "vendor_phone": "string - phone number from letterhead/header/footer, or null",
  "vendor_website": "string - website from letterhead/header/footer, or null"
}

VENDOR CONTACT EXTRACTION RULES:
- Look in letterhead (top), header, footer, contact section, return address area
- vendor_address: Extract COMPLETE address with street, suite, city, state, ZIP
  * Example: "123 Business Park Dr, Suite 200, Austin, TX 78701"
  * Combine multi-line addresses into single string with commas
- vendor_phone: Extract exactly as shown (any format)
- vendor_website: Extract exactly as shown (www.example.com, example.com, https://...)
- If contact info NOT visible, set to null
- DO NOT fabricate or guess

Return ONLY the JSON object with these 4 fields, no additional text.`
      : `You are an AI that extracts and categorizes structured data from construction company bills/invoices.${accountsContext}${costCodesContext}${companyContext}${learningContext}

⚠️ CRITICAL: FIELD NAMING REQUIREMENT ⚠️
ALL field names MUST use snake_case (e.g., vendor_name, bill_date).
DO NOT use camelCase (e.g., vendorName, billDate) - the system will REJECT camelCase.

EXAMPLE OUTPUT (note the exact field names):
{
  "vendor_name": "ELG CONSULTING",
  "vendor_address": "123 Business Park Dr, Suite 200, Austin, TX 78701",
  "vendor_phone": "(512) 555-1234",
  "vendor_website": "www.elgconsulting.com",
  "bill_date": "2025-07-01",
  "due_date": "2025-07-16",
  "reference_number": "223",
  "terms": "Net 15",
  "line_items": [
    {
      "description": "Project Management - June",
      "quantity": 1,
      "unit_cost": 225,
      "amount": 225,
      "memo": null,
      "account_name": "Job Costs",
      "cost_code_name": "Project Management"
    }
  ],
  "total_amount": 225
}

Extract the following information and return as valid JSON:
{
  "vendor_name": "string - REQUIRED, company name from invoice",
  "vendor_address": "string - EXTRACT when visible on invoice (letterhead/header/footer), or null",
  "vendor_phone": "string - EXTRACT when visible on invoice (letterhead/header/footer), or null",
  "vendor_website": "string - EXTRACT when visible on invoice (letterhead/header/footer), or null",
  "bill_date": "YYYY-MM-DD - REQUIRED",
  "due_date": "YYYY-MM-DD or null",
  "reference_number": "string or null",
  "terms": "string - Payment terms EXACTLY as shown (e.g., 'Net 15', 'Net 30'), or null",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_cost": number,
      "amount": number,
      "memo": "string or null",
      "account_name": "string - exact match from available accounts, or null",
      "cost_code_name": "string - exact match from available cost codes, or null"
    }
  ],
  "total_amount": number
}

VENDOR CONTACT INFORMATION - CRITICAL EXTRACTION RULES:
⚠️ ALWAYS extract vendor contact information when visible on the invoice
- Look in MULTIPLE locations: letterhead (top), header section, footer, contact section, return address area
- vendor_address: Extract COMPLETE address including street, suite/unit, city, state, ZIP code
  * Example: "123 Business Park Dr, Suite 200, Austin, TX 78701"
  * May span multiple lines - combine into single string with commas
- vendor_phone: Extract phone number in any format
  * Common formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1-123-456-7890
  * Return exactly as shown, including formatting
- vendor_website: Extract website/URL
  * May include: www.example.com, example.com, https://example.com
  * Return exactly as shown
- If contact information is NOT visible on the invoice, set to null
- DO NOT fabricate or guess contact information

CRITICAL DATE EXTRACTION RULES:
- Extract dates EXACTLY as they appear on the document
- Look for fields labeled: "Invoice Date:", "Date:", "Bill Date:", "Dated:", etc.
- Look for due date fields labeled: "Due Date:", "Payment Due:", "Due:", etc.
- DO NOT perform any timezone conversions or date calculations
- DO NOT adjust dates by adding or subtracting days
- Common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- If the invoice shows "07/01/2025", return "2025-07-01" (NOT "2025-06-30")
- If ambiguous (e.g., "01/07/2025" could be Jan 7 or Jul 1), use US format (MM/DD/YYYY) unless clearly indicated otherwise

IMPORTANT PAYMENT TERMS:
- Look carefully for payment terms on the document (often labeled as "Terms:", "Payment Terms:", "Net:", etc.)
- Extract the EXACT text shown (e.g., if it says "Net 15", return "Net 15", NOT "Net 30")
- Common formats include: Net 15, Net 30, Net 45, Net 60, Due on receipt, COD, 2/10 Net 30
- If no payment terms are visible, return null

IMPORTANT CATEGORIZATION: For each line item, analyze the description and match it to the most appropriate account and cost code from the lists above. 
- For "account_name", return the exact account name from the available accounts list
- For "cost_code_name", return the exact cost code name from the available cost codes list
- If you cannot confidently match a line item, leave account_name and/or cost_code_name as null
- Common patterns: "Job Costs" account is typically for project-related expenses like materials, labor, subcontractors, project management, etc.

SMART COST CODE ASSIGNMENT RULES:
1. First, identify the vendor company name from the invoice
2. Check if this vendor is listed in the COMPANY-SPECIFIC COST CODES section above
3. If the company has ONLY ONE cost code associated:
   - Automatically assign that cost code to ALL line items
   - Set cost_code_name for every line item to that code's name
4. If the company has MULTIPLE cost codes:
   - Review each line item description carefully
   - Match the line item to the MOST APPROPRIATE cost code from that company's specific list
   - Only use cost codes from that specific company's list
5. If the vendor is NOT in the company list:
   - Try to match against the general Available Cost Codes list
   - Leave cost_code_name as null if uncertain

IMPORTANT: Prioritize using company-specific cost codes over general cost codes when the vendor is found in the company list.

🔍 FINAL VALIDATION CHECKLIST (before returning JSON):
✓ All field names use snake_case (vendor_name, bill_date, NOT vendorName, billDate)
✓ vendor_name is populated
✓ vendor_address, vendor_phone, vendor_website are populated when visible on invoice
✓ Dates are in YYYY-MM-DD format
✓ terms field contains exact text from invoice (or null if not found)
✓ line_items array contains all invoice line items
✓ account_name and cost_code_name match exact names from available lists (or null)
✓ All amounts are numeric (not strings)

Return ONLY the JSON object, no additional text.`;

    let messages: any[] = [];

    if (pdfText) {
      // Client provided PDF text extraction
      console.log('Using client-provided PDF text, length:', pdfText.length);
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract bill data from the following text extracted from a PDF invoice:\n${pdfText}` }
      ];
    } else if (pageImages && pageImages.length > 0) {
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

    // Validate amount - if > $1M, likely a parsing error
    if (extractedData.total || extractedData.total_amount || extractedData.totalAmount) {
      const amount = extractedData.total || extractedData.total_amount || extractedData.totalAmount;
      if (amount && amount > 1000000) {
        console.warn('⚠️ Suspicious amount detected:', amount, '- setting to null');
        extractedData.total = null;
        extractedData.total_amount = null;
        extractedData.totalAmount = null;
      }
    }

    // Clean vendor name (remove newlines/extra whitespace)
    if (extractedData.vendor_name) {
      extractedData.vendor_name = extractedData.vendor_name.replace(/\s+/g, ' ').trim();
    }

    // Normalize payment terms to standard values
    if (extractedData.terms) {
      const normalizedTerms = normalizePaymentTerms(extractedData.terms);
      extractedData.terms = normalizedTerms;
      console.log(`Normalized payment terms from "${extractedData.terms}" to "${normalizedTerms}"`);
    }

    // Infer terms from date difference (smart date-based inference)
    const inferredTerms = inferTermsFromDates(extractedData.bill_date, extractedData.due_date);
    if (inferredTerms) {
      if (!extractedData.terms) {
        // No terms were extracted, use date-based inference
        extractedData.terms = inferredTerms;
        console.log(`✅ Using date-based inference: "${inferredTerms}" (no terms extracted)`);
      } else if (extractedData.terms !== inferredTerms) {
        // Date-based inference differs from extracted terms
        console.log(`ℹ️ Date inference (${inferredTerms}) differs from extracted (${extractedData.terms})`);
        // Trust date math over potentially unclear text
        extractedData.terms = inferredTerms;
        console.log(`✅ Overriding with date-based inference: "${inferredTerms}"`);
      } else {
        console.log(`✅ Date inference confirms extracted terms: "${inferredTerms}"`);
      }
    }

    // Try to match vendor to existing company (use effectiveOwnerId)
    if (extractedData.vendor_name) {
      const matchedVendorId = await findMatchingVendor(
        extractedData.vendor_name,
        supabase,
        effectiveOwnerId
      );
      
      if (matchedVendorId) {
        extractedData.vendor_id = matchedVendorId;
        console.log('Automatically matched vendor to existing company');
      }
    }

    // Perform contact enrichment inline (no separate mode)
    if (!enrichContactOnly && extractedData.vendor_name) {
      console.log('Starting inline contact enrichment...');
      
      try {
        const enrichmentPrompt = `You are an AI that extracts ONLY vendor contact information from bills/invoices.

⚠️ CRITICAL: FIELD NAMING REQUIREMENT ⚠️
ALL field names MUST use snake_case (e.g., vendor_name, vendor_address).

Extract ONLY the following vendor contact information:
{
  "vendor_name": "string - company name from invoice",
  "vendor_address": "string - COMPLETE address from letterhead/header/footer, or null",
  "vendor_phone": "string - phone number from letterhead/header/footer, or null",
  "vendor_website": "string - website from letterhead/header/footer, or null"
}

Look in letterhead (top), header, footer, contact section. Extract COMPLETE addresses. If not visible, set to null.

Return ONLY the JSON object, no additional text.`;

        const enrichResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: messages.map(msg => {
              if (msg.role === 'system') {
                return { role: 'system', content: enrichmentPrompt };
              }
              return msg;
            }),
          }),
        });

        if (enrichResponse.ok) {
          const enrichData = await enrichResponse.json();
          const enrichedText = enrichData.choices[0]?.message?.content;
          
          if (enrichedText) {
            try {
              const cleanedEnrichText = stripMarkdownCodeBlocks(enrichedText);
              const contactData = JSON.parse(cleanedEnrichText);
              
              // Merge contact data into extractedData
              extractedData.vendor_address = contactData.vendor_address || extractedData.vendor_address;
              extractedData.vendor_phone = contactData.vendor_phone || extractedData.vendor_phone;
              extractedData.vendor_website = contactData.vendor_website || extractedData.vendor_website;
              
              console.log('Contact enrichment successful:', {
                vendor_address: extractedData.vendor_address,
                vendor_phone: extractedData.vendor_phone,
                vendor_website: extractedData.vendor_website
              });
            } catch (parseErr) {
              console.warn('Failed to parse contact enrichment response, continuing without it');
            }
          }
        } else {
          console.warn('Contact enrichment request failed, continuing without it');
        }
      } catch (enrichError) {
        console.warn('Contact enrichment error (non-critical):', enrichError);
      }
    }

    // Update to 'extracted' only after everything is complete
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
