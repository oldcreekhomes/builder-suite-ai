// Edge function: fix-deposit-reversal
// Purpose: One-time fix to undo a mistaken reversal for a specific deposit
// - Deletes the reversing deposit and the corrected deposit (with their journal entries)
// - Restores the original deposit to status 'posted'
// NOTE: This function is intentionally scoped to specific hardcoded IDs and is public to allow one-off invocation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Hardcoded IDs for this one-time fix
const ORIGINAL_ID = '68e2156b-ac78-436c-aa18-c237b2a0db49';
const REVERSAL_ID = 'c50f23af-c2e1-4cde-be1f-ca1d0c5c2831';
const CORRECTED_ID = 'fcf0c435-6af0-447c-aeae-c11c7947c177';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== fix-deposit-reversal started ===');

    // Optional: validate current state of the three deposits
    const { data: deposits, error: fetchErr } = await supabase
      .from('deposits')
      .select('id, status, is_reversal, reverses_id, reversed_by_id, reconciled, reconciliation_id, reconciliation_date')
      .in('id', [ORIGINAL_ID, REVERSAL_ID, CORRECTED_ID]);

    if (fetchErr) {
      console.error('Failed to fetch deposits for validation', fetchErr);
    } else {
      console.log('Fetched deposits for validation:', deposits);
    }

    // 1) Delete the reversing deposit and its journal entries
    console.log('Deleting reversing deposit via RPC:', REVERSAL_ID);
    const { data: delRevData, error: delRevErr } = await supabase.rpc(
      'delete_deposit_with_journal_entries',
      { deposit_id_param: REVERSAL_ID }
    );
    if (delRevErr) {
      console.error('Error deleting reversing deposit:', delRevErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'delete_reversal', error: delRevErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }

    // 2) Delete the corrected deposit and its journal entries
    console.log('Deleting corrected deposit via RPC:', CORRECTED_ID);
    const { data: delCorrData, error: delCorrErr } = await supabase.rpc(
      'delete_deposit_with_journal_entries',
      { deposit_id_param: CORRECTED_ID }
    );
    if (delCorrErr) {
      console.error('Error deleting corrected deposit:', delCorrErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'delete_corrected', error: delCorrErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }

    // 3) Un-reverse the original deposit: set status to 'posted', clear reversed fields
    console.log('Updating original deposit to posted:', ORIGINAL_ID);
    const { data: updData, error: updErr } = await supabase
      .from('deposits')
      .update({ status: 'posted', reversed_by_id: null, reversed_at: null })
      .eq('id', ORIGINAL_ID)
      .select('id, status, reversed_by_id, reversed_at')
      .single();

    if (updErr) {
      console.error('Error updating original deposit:', updErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'update_original', error: updErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }

    console.log('Fix completed successfully');
    return new Response(
      JSON.stringify({ ok: true, deleted: { reversal: REVERSAL_ID, corrected: CORRECTED_ID }, updated: updData }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    console.error('Unexpected error in fix-deposit-reversal:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'unexpected', details: String(e) }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    );
  }
});