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

    const { pendingUploadIds, projectId } = await req.json();

    if (!pendingUploadIds || !pendingUploadIds.length || !projectId) {
      throw new Error('Missing required parameters: pendingUploadIds, projectId');
    }

    console.log(`Splitting pending bill lines for ${pendingUploadIds.length} uploads in project ${projectId}`);

    // Step 1: Fetch all project lots
    const { data: lots, error: lotsError } = await supabase
      .from('project_lots')
      .select('id, lot_number, lot_name')
      .eq('project_id', projectId)
      .order('lot_number');

    if (lotsError) {
      throw new Error(`Failed to fetch lots: ${lotsError.message}`);
    }

    if (!lots || lots.length < 2) {
      // No splitting needed if less than 2 lots
      return new Response(
        JSON.stringify({ success: true, message: 'No splitting needed', linesUpdated: 0, linesCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${lots.length} lots for project`);

    // Step 2: Fetch all pending_bill_lines without lot_id for the given uploads
    const { data: lines, error: linesError } = await supabase
      .from('pending_bill_lines')
      .select('*')
      .in('pending_upload_id', pendingUploadIds)
      .is('lot_id', null);

    if (linesError) {
      throw new Error(`Failed to fetch pending bill lines: ${linesError.message}`);
    }

    if (!lines || lines.length === 0) {
      console.log('No lines need splitting');
      return new Response(
        JSON.stringify({ success: true, message: 'No lines need splitting', linesUpdated: 0, linesCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${lines.length} lines to split across ${lots.length} lots`);

    // Step 3: Get max line numbers per upload (single query)
    const { data: maxLines, error: maxError } = await supabase
      .from('pending_bill_lines')
      .select('pending_upload_id, line_number')
      .in('pending_upload_id', pendingUploadIds)
      .order('line_number', { ascending: false });

    if (maxError) {
      throw new Error(`Failed to fetch max line numbers: ${maxError.message}`);
    }

    // Build max line number map per upload
    const maxLineMap: Record<string, number> = {};
    for (const row of maxLines || []) {
      if (!maxLineMap[row.pending_upload_id]) {
        maxLineMap[row.pending_upload_id] = row.line_number;
      }
    }

    // Step 4: Calculate splits and prepare batch operations
    const updates: { id: string; lot_id: string; amount: number; unit_cost: number }[] = [];
    const inserts: any[] = [];
    const lineNumberOffsets: Record<string, number> = {};

    for (const line of lines) {
      const originalAmount = parseFloat(line.amount) || 0;
      const lotCount = lots.length;
      
      // Calculate even split (pennies)
      const evenAmountCents = Math.floor((originalAmount * 100) / lotCount);
      const remainderCents = Math.round(originalAmount * 100) - (evenAmountCents * lotCount);
      
      for (let i = 0; i < lots.length; i++) {
        const lot = lots[i];
        const isFirst = i === 0;
        const isLast = i === lots.length - 1;
        
        // Last lot gets the remainder to handle rounding
        const lotAmountCents = isLast ? evenAmountCents + remainderCents : evenAmountCents;
        const lotAmount = lotAmountCents / 100;
        
        if (isFirst) {
          // Update original line with first lot
          updates.push({
            id: line.id,
            lot_id: lot.id,
            amount: lotAmount,
            unit_cost: lotAmount,
          });
        } else {
          // Create new line for this lot
          const uploadId = line.pending_upload_id;
          if (!lineNumberOffsets[uploadId]) {
            lineNumberOffsets[uploadId] = 0;
          }
          lineNumberOffsets[uploadId]++;
          
          const baseMaxLine = maxLineMap[uploadId] || 0;
          const nextLineNumber = baseMaxLine + lineNumberOffsets[uploadId];
          
          inserts.push({
            pending_upload_id: line.pending_upload_id,
            owner_id: line.owner_id,
            line_number: nextLineNumber,
            line_type: line.line_type,
            cost_code_id: line.cost_code_id,
            account_id: line.account_id,
            project_id: line.project_id,
            lot_id: lot.id,
            quantity: line.quantity,
            unit_cost: lotAmount,
            amount: lotAmount,
            memo: line.memo,
            description: line.description,
          });
        }
      }
    }

    console.log(`Prepared ${updates.length} updates and ${inserts.length} inserts`);

    // Step 5: Execute batch update (one per line)
    let updatedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('pending_bill_lines')
        .update({
          lot_id: update.lot_id,
          amount: update.amount,
          unit_cost: update.unit_cost,
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`Failed to update line ${update.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    // Step 6: Batch insert new lines (in chunks to avoid payload limits)
    let insertedCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('pending_bill_lines')
        .insert(chunk);
      
      if (insertError) {
        console.error(`Failed to insert chunk starting at ${i}:`, insertError);
      } else {
        insertedCount += chunk.length;
      }
    }

    console.log(`Split complete: ${updatedCount} lines updated, ${insertedCount} lines created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        linesUpdated: updatedCount, 
        linesCreated: insertedCount,
        lotCount: lots.length,
      }),
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
