import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Keyword patterns to marketplace category mapping
const CATEGORY_PATTERNS: [RegExp, string][] = [
  // Specific patterns first (more specific matches)
  [/garage\s*door/i, "Garage Door Installer"],
  [/spray\s*foam/i, "Spray Foam Contractor"],
  [/fire\s*(sprinkler|protection|alarm)/i, "Fire Sprinkler Contractor"],
  [/air\s*condition|hvac|heating\s*(and|&)\s*(air|cool)|a\/c\s*install/i, "HVAC Contractor"],
  [/hardwood\s*floor/i, "Hardwood Flooring Installer"],
  [/sheet\s*metal/i, "Steel Fabricator"],
  [/low\s*voltage/i, "Low Voltage Contractor"],
  [/smart\s*home|home\s*automation/i, "Home Automation Contractor"],
  [/water\s*treat|culligan|kinetico/i, "Water Treatment Contractor"],
  [/geotechnical|soil\s*test|materials?\s*test/i, "Materials Testing Lab"],
  [/blueprint|repro(graphic)?|imaging|print\s*shop/i, "Print/Reprographics Service"],
  [/abatement|asbestos|lead\s*removal/i, "Abatement Contractor"],
  [/environment(al)?\s*(consult|service)/i, "Environmental Consultant"],
  [/land\s*survey|survey(or|ing)/i, "Land Surveyor"],
  [/house\s*plan|home\s*design|design\s*basic/i, "Home Designer"],
  
  // Standard patterns
  [/plumb/i, "Plumbing Contractor"],
  [/electric(?!.*fixture)/i, "Electrical Contractor"],
  [/roof/i, "Roofing Contractor"],
  [/fram(e|ing)/i, "Framing Contractor"],
  [/paint/i, "Painter"],
  [/floor/i, "Flooring Contractor"],
  [/tile|ceramic/i, "Tile Contractor"],
  [/cabinet/i, "Cabinet Installer"],
  [/mason(?!.*supply)/i, "Masonry Contractor"],
  [/concrete/i, "Concrete Contractor"],
  [/excavat/i, "Excavation Contractor"],
  [/landscape|lawn/i, "Landscaping Contractor"],
  [/architect/i, "Architect"],
  [/insulation/i, "Insulation Contractor"],
  [/drywall/i, "Drywall Contractor"],
  [/lumber|84\s*lumber/i, "Lumber Yard"],
  [/window(?!\s*clean)/i, "Window Installer"],
  [/door(?!\s*garage)/i, "Door Installer"],
  [/fence/i, "Fence Contractor"],
  [/pool|spa(?!.*beauty)/i, "Pool/Spa Contractor"],
  [/gutter/i, "Gutter Contractor"],
  [/siding/i, "Siding Contractor"],
  [/deck(?!\s*patio)/i, "Deck Contractor"],
  [/pav(e|ing)|asphalt/i, "Paving Contractor"],
  [/elevator|lift/i, "Elevator Installer"],
  [/septic/i, "Septic System Installer"],
  [/counter\s*top|granite|marble|quartz|stone\s*(fab|install)/i, "Countertop Installer"],
  [/appliance/i, "Appliance Supplier"],
  [/trim|millwork|moulding/i, "Interior Trim Contractor"],
  [/fireplace|hearth/i, "Fireplace Installer"],
  [/glass|mirror/i, "Glass/Mirror Contractor"],
  [/stucco/i, "Stucco Contractor"],
  [/waterproof/i, "Waterproofing Contractor"],
  [/iron|railing|metal\s*work/i, "Metal Railing Contractor"],
  [/solar|renewable/i, "Solar/Renewable Energy Contractor"],
  [/security|alarm\s*system/i, "Security System Installer"],
  [/generator/i, "Generator Installer"],
  [/audio|video|theater|av\s*install/i, "Audio/Video Installer"],
  [/closet/i, "Closet System Installer"],
  [/stair/i, "Stair Contractor"],
  [/demolition|demo\s*co/i, "Demolition Contractor"],
  [/tree\s*service|arborist/i, "Tree Service"],
  [/patio|hardscape|outdoor\s*living/i, "Patio Contractor"],
  [/carpet/i, "Carpet Installer"],
  [/structural\s*engineer/i, "Structural Engineer"],
  [/civil\s*engineer/i, "Civil Engineer"],
  [/interior\s*design/i, "Interior Designer"],
  [/clean(ing)?\s*service/i, "Pressure Washing Service"],
  [/grading/i, "Grading Contractor"],
  [/foundation/i, "Foundation Contractor"],
  [/truss/i, "Truss Manufacturer"],
  [/steel/i, "Steel Fabricator"],
  [/brick/i, "Brick Mason"],
  [/chimney/i, "Chimney Contractor"],
  [/shower\s*door/i, "Shower Door Installer"],
  [/wallpaper/i, "Wallpaper Installer"],
  [/irrigation|sprinkler\s*system/i, "Irrigation Contractor"],
  [/erosion/i, "Erosion Control Contractor"],
  [/utility\s*contract/i, "Utility Contractor"],
];

// Companies to exclude (non-construction generic vendors)
const EXCLUDED_PATTERNS: RegExp[] = [
  /^amazon/i,
  /^aldi/i,
  /^costco/i,
  /^home\s*depot/i,
  /^lowe'?s/i,
  /^walmart/i,
  /^target/i,
  /^1-800-flowers/i,
  /^cava$/i,
  /^fedex/i,
  /^ups(?:\s|$)/i,
  /^staples$/i,
  /^office\s*depot/i,
  /^best\s*buy/i,
  /^wegmans/i,
  /^giant\s*food/i,
  /^safeway/i,
  /^cvs/i,
  /^walgreens/i,
  /^chipotle/i,
  /^starbucks/i,
  /^dunkin/i,
  /^mcdonald/i,
  /^chick-fil-a/i,
  /^panera/i,
  /^subway/i,
  /^sprint/i,
  /^verizon/i,
  /^at&t/i,
  /^t-mobile/i,
  /^comcast/i,
  /^xfinity/i,
];

function categorizeCompany(companyName: string): string | null {
  const name = companyName.toLowerCase();
  
  // Check exclusion patterns first
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(companyName)) {
      return null;
    }
  }
  
  // Try to match category patterns
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(companyName)) {
      return category;
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Old Creek Homes' home_builder_id
    const OLD_CREEK_HOME_BUILDER_ID = '2653aba8-d154-4301-99bf-77d559492e19';

    console.log('Starting import of builder companies to marketplace...');

    // Fetch all active companies from Old Creek Homes
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, company_name, company_type, phone_number, website, address_line_1, address_line_2, city, state, zip_code')
      .eq('home_builder_id', OLD_CREEK_HOME_BUILDER_ID)
      .is('archived_at', null);

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    console.log(`Found ${companies?.length || 0} companies from Old Creek Homes`);

    // Fetch existing marketplace companies to check for duplicates
    const { data: existingCompanies, error: existingError } = await supabase
      .from('marketplace_companies')
      .select('company_name');

    if (existingError) {
      throw new Error(`Failed to fetch existing marketplace companies: ${existingError.message}`);
    }

    const existingNames = new Set(
      (existingCompanies || []).map(c => c.company_name.toLowerCase().trim())
    );

    console.log(`Found ${existingNames.size} existing marketplace companies`);

    const results = {
      added: [] as { name: string; category: string }[],
      skipped_duplicate: [] as string[],
      skipped_excluded: [] as string[],
      skipped_uncategorizable: [] as string[],
      skipped_no_contact: [] as string[],
      errors: [] as { name: string; error: string }[],
    };

    for (const company of companies || []) {
      const name = company.company_name?.trim();
      if (!name) continue;

      // Check if excluded vendor
      let isExcluded = false;
      for (const pattern of EXCLUDED_PATTERNS) {
        if (pattern.test(name)) {
          isExcluded = true;
          results.skipped_excluded.push(name);
          break;
        }
      }
      if (isExcluded) continue;

      // Check for duplicate
      if (existingNames.has(name.toLowerCase())) {
        results.skipped_duplicate.push(name);
        continue;
      }

      // Categorize the company
      const category = categorizeCompany(name);
      if (!category) {
        results.skipped_uncategorizable.push(name);
        continue;
      }

      // Check if has any contact info
      const hasContact = company.phone_number || company.website || 
                        company.address_line_1 || company.city;
      if (!hasContact) {
        results.skipped_no_contact.push(name);
        continue;
      }

      // Build address
      let address = '';
      if (company.address_line_1) {
        address = company.address_line_1;
        if (company.address_line_2) {
          address += ', ' + company.address_line_2;
        }
        if (company.city) {
          address += ', ' + company.city;
        }
        if (company.state) {
          address += ', ' + company.state;
        }
        if (company.zip_code) {
          address += ' ' + company.zip_code;
        }
      }

      // Insert into marketplace_companies
      const { error: insertError } = await supabase
        .from('marketplace_companies')
        .insert({
          company_name: name,
          company_type: category,
          phone_number: company.phone_number || null,
          website: company.website || null,
          address: address || null,
          source: 'builder_import',
          rating: null,
          review_count: null,
        });

      if (insertError) {
        results.errors.push({ name, error: insertError.message });
      } else {
        results.added.push({ name, category });
        // Add to existing set to prevent duplicates within this run
        existingNames.add(name.toLowerCase());
      }
    }

    console.log('Import complete:', {
      added: results.added.length,
      skipped_duplicate: results.skipped_duplicate.length,
      skipped_excluded: results.skipped_excluded.length,
      skipped_uncategorizable: results.skipped_uncategorizable.length,
      skipped_no_contact: results.skipped_no_contact.length,
      errors: results.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_processed: companies?.length || 0,
          added: results.added.length,
          skipped_duplicate: results.skipped_duplicate.length,
          skipped_excluded: results.skipped_excluded.length,
          skipped_uncategorizable: results.skipped_uncategorizable.length,
          skipped_no_contact: results.skipped_no_contact.length,
          errors: results.errors.length,
        },
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error importing builder companies:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
