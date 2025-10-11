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

    // Extract vendor name from extracted_data
    const vendorName = upload.extracted_data?.vendor_name || upload.extracted_data?.vendor;
    
    if (!vendorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'No vendor name found in extracted data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Re-matching vendor:', vendorName);

    // Determine effectiveOwnerId (use home_builder_id if uploader is employee)
    const { data: uploaderUser } = await supabase
      .from('users')
      .select('role, home_builder_id')
      .eq('id', upload.owner_id)
      .single();
    
    const effectiveOwnerId = (uploaderUser?.role === 'employee' && uploaderUser?.home_builder_id) 
      ? uploaderUser.home_builder_id 
      : upload.owner_id;

    // Run the matching pipeline
    let vendorId: string | null = null;
    let matchedCompanyName: string | null = null;

    const normalized = normalizeVendorName(vendorName);
    
    // STEP 1: Check vendor aliases
    console.log(`Checking vendor aliases for "${vendorName}" (normalized: "${normalized}")`);
    const { data: aliasMatch } = await supabase
      .from('vendor_aliases')
      .select('company_id, companies(company_name)')
      .eq('owner_id', effectiveOwnerId)
      .eq('normalized_alias', normalized)
      .limit(1)
      .single();
    
    if (aliasMatch?.company_id) {
      vendorId = aliasMatch.company_id;
      matchedCompanyName = aliasMatch.companies?.company_name || null;
      console.log(`✓ Alias match: "${vendorName}" → "${matchedCompanyName}"`);
    } else {
      // STEP 2: Check for acronym matching
      const isAcronym = (str: string) => {
        const norm = str.replace(/[\s\.]/g, '').toUpperCase();
        return norm.length >= 3 && norm.length <= 8 && /^[A-Z]+$/.test(norm);
      };
      
      const getCompanyInitials = (companyName: string): string => {
        const suffixes = /\b(Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company|LP|LLP|PLLC|PC)\b\.?$/i;
        const nameWithoutSuffix = companyName.replace(suffixes, '').trim();

        return nameWithoutSuffix
          .split(/[\s\-]+/)
          .filter(Boolean)
          .map(word => {
            const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
            if (!cleaned) return '';
            if (cleaned.length >= 2 && cleaned.length <= 4 && cleaned === cleaned.toUpperCase()) {
              return cleaned;
            }
            return cleaned[0].toUpperCase();
          })
          .filter(Boolean)
          .join('');
      };
      
      if (isAcronym(vendorName)) {
        const acronym = vendorName.replace(/[\s\.]/g, '').toUpperCase();
        console.log(`Checking acronym match for "${acronym}"`);
        
        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('home_builder_id', effectiveOwnerId);
        
        for (const company of companies || []) {
          const initials = getCompanyInitials(company.company_name);
          if (initials === acronym) {
            vendorId = company.id;
            matchedCompanyName = company.company_name;
            console.log(`✓ Acronym match: "${vendorName}" → "${matchedCompanyName}" (${acronym})`);
            break;
          }
        }
      }
      
      // STEP 3: Fuzzy matching
      if (!vendorId) {
        console.log(`Trying fuzzy match for "${vendorName}"`);
        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('home_builder_id', effectiveOwnerId);
        
        if (companies && companies.length > 0) {
          let bestMatch: { id: string; score: number; name: string } | null = null;
          
          for (const company of companies) {
            const similarity = calculateVendorSimilarity(vendorName, company.company_name);
            
            if (similarity > 0.8 && (!bestMatch || similarity > bestMatch.score)) {
              bestMatch = { 
                id: company.id, 
                score: similarity, 
                name: company.company_name
              };
            }
          }
          
          if (bestMatch) {
            vendorId = bestMatch.id;
            matchedCompanyName = bestMatch.name;
            console.log(`✓ Fuzzy match: "${vendorName}" → "${matchedCompanyName}" (${(bestMatch.score * 100).toFixed(1)}% confidence)`);
          } else {
            console.log(`✗ No vendor match found for "${vendorName}"`);
          }
        }
      }
    }

    // Update the pending upload if we found a match
    if (vendorId && matchedCompanyName) {
      const updatedData = {
        ...upload.extracted_data,
        vendor_id: vendorId,
        vendor: matchedCompanyName
      };

      const { error: updateError } = await supabase
        .from('pending_bill_uploads')
        .update({
          extracted_data: updatedData,
        })
        .eq('id', pendingUploadId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          vendor_id: vendorId, 
          company_name: matchedCompanyName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'No matching vendor found' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rematch-pending-bill:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '')
    .trim();
}

function calculateVendorSimilarity(str1: string, str2: string): number {
  const s1 = normalizeVendorName(str1);
  const s2 = normalizeVendorName(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  const distance = levenshteinDistance(s1, s2);
  return 1.0 - distance / Math.max(s1.length, s2.length);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
