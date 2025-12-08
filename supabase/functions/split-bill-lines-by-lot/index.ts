import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { projectId, lot1Id, lot2Id, billLineIds } = await req.json();

    if (!lot1Id || !lot2Id || !billLineIds || !billLineIds.length) {
      throw new Error('Missing required parameters: lot1Id, lot2Id, billLineIds');
    }

    console.log(`Splitting ${billLineIds.length} bill lines between lots ${lot1Id} and ${lot2Id}`);

    // Get all specified bill lines
    const { data: billLines, error: fetchError } = await supabase
      .from('bill_lines')
      .select('id, bill_id, amount, unit_cost, quantity, cost_code_id, memo, line_type, owner_id, line_number, project_id')
      .in('id', billLineIds);

    if (fetchError) {
      throw new Error(`Failed to fetch bill lines: ${fetchError.message}`);
    }

    console.log(`Found ${billLines?.length || 0} bill lines to split`);

    const results = {
      updated: 0,
      inserted: 0,
      errors: [] as string[]
    };

    // Process each bill line
    for (const line of billLines || []) {
      const originalAmount = parseFloat(line.amount);
      const originalUnitCost = parseFloat(line.unit_cost);
      
      // Calculate 50/50 split (Lot 1 gets ceiling, Lot 2 gets floor for odd pennies)
      const lot1Amount = Math.ceil(originalAmount * 100 / 2) / 100;
      const lot2Amount = Math.floor(originalAmount * 100 / 2) / 100;
      const lot1UnitCost = Math.ceil(originalUnitCost * 100 / 2) / 100;
      const lot2UnitCost = Math.floor(originalUnitCost * 100 / 2) / 100;

      console.log(`Line ${line.id}: $${originalAmount} -> Lot1: $${lot1Amount}, Lot2: $${lot2Amount}`);

      // Update existing line for Lot 1
      const { error: updateError } = await supabase
        .from('bill_lines')
        .update({
          lot_id: lot1Id,
          amount: lot1Amount,
          unit_cost: lot1UnitCost
        })
        .eq('id', line.id);

      if (updateError) {
        results.errors.push(`Failed to update line ${line.id}: ${updateError.message}`);
        continue;
      }
      results.updated++;

      // Get max line number for this bill to determine next line number
      const { data: maxLineData } = await supabase
        .from('bill_lines')
        .select('line_number')
        .eq('bill_id', line.bill_id)
        .order('line_number', { ascending: false })
        .limit(1);

      const nextLineNumber = (maxLineData?.[0]?.line_number || 0) + 1;

      // Insert new line for Lot 2
      const { error: insertError } = await supabase
        .from('bill_lines')
        .insert({
          bill_id: line.bill_id,
          lot_id: lot2Id,
          amount: lot2Amount,
          unit_cost: lot2UnitCost,
          quantity: line.quantity,
          cost_code_id: line.cost_code_id,
          memo: line.memo,
          line_type: line.line_type,
          owner_id: line.owner_id,
          line_number: nextLineNumber,
          project_id: line.project_id
        });

      if (insertError) {
        results.errors.push(`Failed to insert Lot 2 line for bill ${line.bill_id}: ${insertError.message}`);
        continue;
      }
      results.inserted++;
    }

    console.log(`Split complete: ${results.updated} updated, ${results.inserted} inserted, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
