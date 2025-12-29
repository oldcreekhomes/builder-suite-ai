// Edge function: fix-orphaned-reconciliations
// Purpose: One-time fix to clear transactions that reference a deleted reconciliation
// This clears the reconciled flag and reconciliation_id for orphaned transactions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// The orphaned reconciliation ID that was deleted but transactions still reference
const ORPHANED_RECONCILIATION_ID = 'c8e03b01-dce9-426c-bef1-b37d076ecae5';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== fix-orphaned-reconciliations started ===');
    console.log('Clearing reconciliation references for:', ORPHANED_RECONCILIATION_ID);

    const results: Record<string, any> = {};

    // 1) Fix orphaned checks
    console.log('Fixing orphaned checks...');
    const { data: checksData, error: checksErr } = await supabase
      .from('checks')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', ORPHANED_RECONCILIATION_ID)
      .select('id');

    if (checksErr) {
      console.error('Error updating checks:', checksErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'fix_checks', error: checksErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.checks = checksData?.length || 0;
    console.log(`Fixed ${results.checks} checks`);

    // 2) Fix orphaned deposits
    console.log('Fixing orphaned deposits...');
    const { data: depositsData, error: depositsErr } = await supabase
      .from('deposits')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', ORPHANED_RECONCILIATION_ID)
      .select('id');

    if (depositsErr) {
      console.error('Error updating deposits:', depositsErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'fix_deposits', error: depositsErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.deposits = depositsData?.length || 0;
    console.log(`Fixed ${results.deposits} deposits`);

    // 3) Fix orphaned bills
    console.log('Fixing orphaned bills...');
    const { data: billsData, error: billsErr } = await supabase
      .from('bills')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', ORPHANED_RECONCILIATION_ID)
      .select('id');

    if (billsErr) {
      console.error('Error updating bills:', billsErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'fix_bills', error: billsErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.bills = billsData?.length || 0;
    console.log(`Fixed ${results.bills} bills`);

    // 4) Fix orphaned journal entry lines
    console.log('Fixing orphaned journal entry lines...');
    const { data: jelData, error: jelErr } = await supabase
      .from('journal_entry_lines')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', ORPHANED_RECONCILIATION_ID)
      .select('id');

    if (jelErr) {
      console.error('Error updating journal entry lines:', jelErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'fix_journal_entry_lines', error: jelErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.journal_entry_lines = jelData?.length || 0;
    console.log(`Fixed ${results.journal_entry_lines} journal entry lines`);

    console.log('=== fix-orphaned-reconciliations completed ===');
    console.log('Results:', results);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        orphaned_reconciliation_id: ORPHANED_RECONCILIATION_ID,
        fixed: results 
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    console.error('Unexpected error in fix-orphaned-reconciliations:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'unexpected', details: String(e) }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    );
  }
});
