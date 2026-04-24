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

    // Step 3: Get max line number per upload from EXISTING (non-split / already-assigned) lines
    // so we can place grouped-by-lot split rows after them.
    const { data: allLines, error: maxError } = await supabase
      .from('pending_bill_lines')
      .select('pending_upload_id, line_number, lot_id')
      .in('pending_upload_id', pendingUploadIds);

    if (maxError) {
      throw new Error(`Failed to fetch line numbers: ${maxError.message}`);
    }

    // Max line number among lines that ALREADY have a lot_id (not being split now)
    const baseMaxMap: Record<string, number> = {};
    for (const row of allLines || []) {
      if (row.lot_id) {
        const cur = baseMaxMap[row.pending_upload_id] || 0;
        if (row.line_number > cur) baseMaxMap[row.pending_upload_id] = row.line_number;
      }
    }

    // Group splittable lines by upload, preserving original line_number order
    const linesByUpload: Record<string, any[]> = {};
    for (const line of lines) {
      (linesByUpload[line.pending_upload_id] ||= []).push(line);
    }
    for (const uploadId of Object.keys(linesByUpload)) {
      linesByUpload[uploadId].sort((a, b) => a.line_number - b.line_number);
    }

    // Step 4: Calculate splits and prepare batch operations.
    // Layout per upload: [base existing lines] then
    //   Lot 1: original A, B, C, ...
    //   Lot 2: original A, B, C, ...
    //   ...
    const updates: { id: string; lot_id: string; amount: number; unit_cost: number; quantity: number; line_number: number }[] = [];
    const inserts: any[] = [];

    for (const uploadId of Object.keys(linesByUpload)) {
      const uploadLines = linesByUpload[uploadId];
      const base = baseMaxMap[uploadId] || 0;
      const lotCount = lots.length;

      // Pre-compute per-lot AMOUNT splits (cents-precise) AND per-lot QUANTITY splits.
      // We preserve the original unit_cost (rate) and divide the QUANTITY across lots,
      // so each row reads correctly: perLotQty * unit_cost ≈ perLotAmount.
      // The persisted `amount` remains cent-precise (last lot absorbs rounder remainder).
      const splitsByLineId: Record<string, { amount: number; quantity: number }[]> = {};
      for (const line of uploadLines) {
        const originalAmount = parseFloat(line.amount) || 0;
        const originalQty = parseFloat(line.quantity) || 0;
        const evenCents = Math.floor((originalAmount * 100) / lotCount);
        const remainderCents = Math.round(originalAmount * 100) - (evenCents * lotCount);
        // Use 6 decimal places of precision on the per-lot quantity so the
        // displayed math (qty × rate) is visually accurate per row.
        const evenQty = Math.floor((originalQty * 1e6) / lotCount) / 1e6;
        const qtyRemainder = Math.round((originalQty - evenQty * lotCount) * 1e6) / 1e6;
        const arr: { amount: number; quantity: number }[] = [];
        for (let i = 0; i < lotCount; i++) {
          const isLast = i === lotCount - 1;
          const cents = isLast ? evenCents + remainderCents : evenCents;
          const qty = isLast ? Math.round((evenQty + qtyRemainder) * 1e6) / 1e6 : evenQty;
          arr.push({ amount: cents / 100, quantity: qty });
        }
        splitsByLineId[line.id] = arr;
      }

      // Build interleaved output: for each original line, emit one row per lot
      for (let originalIdx = 0; originalIdx < uploadLines.length; originalIdx++) {
        const line = uploadLines[originalIdx];
        const originalUnitCost = parseFloat(line.unit_cost) || 0;
        for (let lotIdx = 0; lotIdx < lotCount; lotIdx++) {
          const lot = lots[lotIdx];
          const { amount: lotAmount, quantity: lotQuantity } = splitsByLineId[line.id][lotIdx];
          const newLineNumber = base + originalIdx * lotCount + lotIdx + 1;

          if (lotIdx === 0) {
            // Reuse original row for the first lot, but renumber it
            updates.push({
              id: line.id,
              lot_id: lot.id,
              amount: lotAmount,
              unit_cost: originalUnitCost,
              quantity: lotQuantity,
              line_number: newLineNumber,
            });
          } else {
            inserts.push({
              pending_upload_id: line.pending_upload_id,
              owner_id: line.owner_id,
              line_number: newLineNumber,
              line_type: line.line_type,
              cost_code_id: line.cost_code_id,
              account_id: line.account_id,
              project_id: line.project_id,
              lot_id: lot.id,
              quantity: lotQuantity,
              unit_cost: originalUnitCost,
              amount: lotAmount,
              memo: line.memo,
              description: line.description,
              cost_code_name: line.cost_code_name,
              account_name: line.account_name,
              project_name: line.project_name,
            });
          }
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
          quantity: update.quantity,
          line_number: update.line_number,
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
