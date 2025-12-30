// Edge function: reset-reconciliation
// Purpose: Reset an in-progress reconciliation by unreconciling all transactions
// tied to a specific reconciliation_id and deleting the reconciliation record.
// This allows users to start fresh without needing to run SQL manually.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== reset-reconciliation started ===');

    // 1. Validate user authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing authorization header' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 401 }
      );
    }

    // Create anon client to verify user
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid authorization' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user's owner_id (either they are owner or their home_builder_id)
    const { data: userData, error: userDataError } = await anonClient
      .from('users')
      .select('id, role, home_builder_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('User data error:', userDataError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Could not fetch user data' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 403 }
      );
    }

    const ownerId = userData.role === 'owner' ? userData.id : userData.home_builder_id;
    if (!ownerId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Could not determine owner scope' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 403 }
      );
    }

    console.log('Owner ID:', ownerId);

    // Parse request body for reconciliationId
    let reconciliationId: string | null = null;

    try {
      const body = await req.json();
      reconciliationId = body.reconciliationId || null;
      console.log('Reconciliation ID to reset:', reconciliationId);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid request body' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      );
    }

    if (!reconciliationId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'reconciliationId is required' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      );
    }

    // Create service role client for updates (bypasses RLS)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the reconciliation exists and belongs to this owner
    const { data: reconciliation, error: recError } = await serviceClient
      .from('bank_reconciliations')
      .select('id, owner_id, status, statement_date')
      .eq('id', reconciliationId)
      .single();

    if (recError || !reconciliation) {
      console.error('Reconciliation not found:', recError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Reconciliation not found' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 404 }
      );
    }

    if (reconciliation.owner_id !== ownerId) {
      console.error('Unauthorized: reconciliation belongs to different owner');
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized: reconciliation belongs to different owner' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 403 }
      );
    }

    console.log('Found reconciliation:', reconciliation);

    const results: Record<string, number> = {};

    // 1) Unreconcile checks tied to this reconciliation
    console.log('Unreconciling checks...');
    const { data: checksData, error: checksErr } = await serviceClient
      .from('checks')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');

    if (checksErr) {
      console.error('Error updating checks:', checksErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'unreconcile_checks', error: checksErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.checks = checksData?.length || 0;
    console.log(`Unreconciled ${results.checks} checks`);

    // 2) Unreconcile deposits tied to this reconciliation
    console.log('Unreconciling deposits...');
    const { data: depositsData, error: depositsErr } = await serviceClient
      .from('deposits')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');

    if (depositsErr) {
      console.error('Error updating deposits:', depositsErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'unreconcile_deposits', error: depositsErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.deposits = depositsData?.length || 0;
    console.log(`Unreconciled ${results.deposits} deposits`);

    // 3) Unreconcile bills tied to this reconciliation
    console.log('Unreconciling bills...');
    const { data: billsData, error: billsErr } = await serviceClient
      .from('bills')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');

    if (billsErr) {
      console.error('Error updating bills:', billsErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'unreconcile_bills', error: billsErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.bills = billsData?.length || 0;
    console.log(`Unreconciled ${results.bills} bills`);

    // 4) Unreconcile journal entry lines tied to this reconciliation
    console.log('Unreconciling journal entry lines...');
    const { data: jelData, error: jelErr } = await serviceClient
      .from('journal_entry_lines')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');

    if (jelErr) {
      console.error('Error updating journal entry lines:', jelErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'unreconcile_journal_entry_lines', error: jelErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    results.journal_entry_lines = jelData?.length || 0;
    console.log(`Unreconciled ${results.journal_entry_lines} journal entry lines`);

    // 5) Delete the reconciliation record
    console.log('Deleting reconciliation record...');
    const { error: deleteErr } = await serviceClient
      .from('bank_reconciliations')
      .delete()
      .eq('id', reconciliationId);

    if (deleteErr) {
      console.error('Error deleting reconciliation:', deleteErr);
      return new Response(
        JSON.stringify({ ok: false, step: 'delete_reconciliation', error: deleteErr.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }
    console.log('Deleted reconciliation record');

    const totalUnreconciled = results.checks + results.deposits + results.bills + results.journal_entry_lines;
    console.log('=== reset-reconciliation completed ===');
    console.log('Total unreconciled:', totalUnreconciled);
    console.log('Results:', results);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        totalUnreconciled,
        unreconciled: results,
        deletedReconciliationId: reconciliationId
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    console.error('Unexpected error in reset-reconciliation:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'unexpected', details: String(e) }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    );
  }
});
