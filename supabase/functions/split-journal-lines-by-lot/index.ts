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

    const { projectId, lot1Id, lot2Id } = await req.json();

    if (!projectId || !lot1Id || !lot2Id) {
      throw new Error('Missing required parameters: projectId, lot1Id, lot2Id');
    }

    console.log(`Splitting journal entry lines for project ${projectId} between lots ${lot1Id} and ${lot2Id}`);

    // Get journal entry lines for bills in this project that have cost_code_id (WIP entries)
    // These are the ones that need lot assignment for Job Cost report
    const { data: jeLines, error: fetchError } = await supabase
      .from('journal_entry_lines')
      .select(`
        id, 
        journal_entry_id, 
        account_id,
        cost_code_id, 
        debit, 
        credit, 
        memo, 
        owner_id, 
        line_number,
        project_id,
        lot_id,
        journal_entries!inner(source_id, source_type)
      `)
      .eq('project_id', projectId)
      .is('lot_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch journal entry lines: ${fetchError.message}`);
    }

    console.log(`Found ${jeLines?.length || 0} journal entry lines to split`);

    const results = {
      updated: 0,
      inserted: 0,
      errors: [] as string[]
    };

    // Process each journal entry line
    for (const line of jeLines || []) {
      const originalDebit = parseFloat(line.debit) || 0;
      const originalCredit = parseFloat(line.credit) || 0;
      
      // Calculate 50/50 split using remainder approach to guarantee exact sum
      const lot1Debit = Math.round(originalDebit * 100 / 2) / 100;
      const lot2Debit = Math.round((originalDebit - lot1Debit) * 100) / 100;
      const lot1Credit = Math.round(originalCredit * 100 / 2) / 100;
      const lot2Credit = Math.round((originalCredit - lot1Credit) * 100) / 100;

      console.log(`JE Line ${line.id}: Debit $${originalDebit} -> Lot1: $${lot1Debit}, Lot2: $${lot2Debit}`);

      // Update existing line for Lot 1
      const { error: updateError } = await supabase
        .from('journal_entry_lines')
        .update({
          lot_id: lot1Id,
          debit: lot1Debit,
          credit: lot1Credit
        })
        .eq('id', line.id);

      if (updateError) {
        results.errors.push(`Failed to update JE line ${line.id}: ${updateError.message}`);
        continue;
      }
      results.updated++;

      // Get max line number for this journal entry
      const { data: maxLineData } = await supabase
        .from('journal_entry_lines')
        .select('line_number')
        .eq('journal_entry_id', line.journal_entry_id)
        .order('line_number', { ascending: false })
        .limit(1);

      const nextLineNumber = (maxLineData?.[0]?.line_number || 0) + 1;

      // Insert new line for Lot 2
      const { error: insertError } = await supabase
        .from('journal_entry_lines')
        .insert({
          journal_entry_id: line.journal_entry_id,
          account_id: line.account_id,
          cost_code_id: line.cost_code_id,
          lot_id: lot2Id,
          debit: lot2Debit,
          credit: lot2Credit,
          memo: line.memo,
          owner_id: line.owner_id,
          line_number: nextLineNumber,
          project_id: line.project_id
        });

      if (insertError) {
        results.errors.push(`Failed to insert Lot 2 JE line for entry ${line.journal_entry_id}: ${insertError.message}`);
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
