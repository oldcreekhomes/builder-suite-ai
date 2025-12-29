// Edge function: fix-orphaned-reconciliations
// Purpose: Clear transactions that reference a non-existent (orphaned) reconciliation
// This clears the reconciled flag and reconciliation_id for orphaned transactions

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
    console.log('=== fix-orphaned-reconciliations started ===');

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

    console.log('Owner ID for cleanup:', ownerId);

    // Parse request body for optional filters
    let bankAccountId: string | null = null;
    let projectId: string | null = null;

    try {
      const body = await req.json();
      bankAccountId = body.bankAccountId || null;
      projectId = body.projectId || null;
      console.log('Filters - bankAccountId:', bankAccountId, 'projectId:', projectId);
    } catch {
      // No body or invalid JSON - proceed without filters
      console.log('No body provided, cleaning all orphaned reconciliations for owner');
    }

    // Create service role client for updates (bypasses RLS)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: Record<string, any> = {};

    // First, get all valid reconciliation IDs for this owner
    const { data: validReconciliations, error: recError } = await serviceClient
      .from('bank_reconciliations')
      .select('id')
      .eq('owner_id', ownerId);

    if (recError) {
      console.error('Error fetching reconciliations:', recError);
      return new Response(
        JSON.stringify({ ok: false, error: recError.message }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
      );
    }

    const validRecIds = new Set((validReconciliations || []).map(r => r.id));
    console.log('Valid reconciliation IDs count:', validRecIds.size);

    // Helper function to build base query with owner filter
    const buildBaseFilter = (table: string) => {
      let query = serviceClient
        .from(table)
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('owner_id', ownerId)
        .not('reconciliation_id', 'is', null);  // Only where reconciliation_id is set
      
      return query;
    };

    // 1) Fix orphaned checks
    console.log('Finding orphaned checks...');
    // First find orphaned checks
    let checksSelectQuery = serviceClient
      .from('checks')
      .select('id, reconciliation_id')
      .eq('owner_id', ownerId)
      .not('reconciliation_id', 'is', null);
    
    if (bankAccountId) {
      checksSelectQuery = checksSelectQuery.eq('bank_account_id', bankAccountId);
    }
    if (projectId) {
      checksSelectQuery = checksSelectQuery.eq('project_id', projectId);
    }
    
    const { data: checksWithRecId } = await checksSelectQuery;
    const orphanedCheckIds = (checksWithRecId || [])
      .filter(c => !validRecIds.has(c.reconciliation_id))
      .map(c => c.id);
    
    console.log('Orphaned check IDs:', orphanedCheckIds.length);
    
    if (orphanedCheckIds.length > 0) {
      const { data: checksData, error: checksErr } = await serviceClient
        .from('checks')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .in('id', orphanedCheckIds)
        .select('id');

      if (checksErr) {
        console.error('Error updating checks:', checksErr);
        return new Response(
          JSON.stringify({ ok: false, step: 'fix_checks', error: checksErr.message }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        );
      }
      results.checks = checksData?.length || 0;
    } else {
      results.checks = 0;
    }
    console.log(`Fixed ${results.checks} checks`);

    // 2) Fix orphaned deposits
    console.log('Finding orphaned deposits...');
    let depositsSelectQuery = serviceClient
      .from('deposits')
      .select('id, reconciliation_id')
      .eq('owner_id', ownerId)
      .not('reconciliation_id', 'is', null);
    
    if (bankAccountId) {
      depositsSelectQuery = depositsSelectQuery.eq('bank_account_id', bankAccountId);
    }
    if (projectId) {
      depositsSelectQuery = depositsSelectQuery.eq('project_id', projectId);
    }
    
    const { data: depositsWithRecId } = await depositsSelectQuery;
    const orphanedDepositIds = (depositsWithRecId || [])
      .filter(d => !validRecIds.has(d.reconciliation_id))
      .map(d => d.id);
    
    console.log('Orphaned deposit IDs:', orphanedDepositIds.length);
    
    if (orphanedDepositIds.length > 0) {
      const { data: depositsData, error: depositsErr } = await serviceClient
        .from('deposits')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .in('id', orphanedDepositIds)
        .select('id');

      if (depositsErr) {
        console.error('Error updating deposits:', depositsErr);
        return new Response(
          JSON.stringify({ ok: false, step: 'fix_deposits', error: depositsErr.message }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        );
      }
      results.deposits = depositsData?.length || 0;
    } else {
      results.deposits = 0;
    }
    console.log(`Fixed ${results.deposits} deposits`);

    // 3) Fix orphaned bills
    console.log('Finding orphaned bills...');
    let billsSelectQuery = serviceClient
      .from('bills')
      .select('id, reconciliation_id')
      .eq('owner_id', ownerId)
      .not('reconciliation_id', 'is', null);
    
    if (projectId) {
      billsSelectQuery = billsSelectQuery.eq('project_id', projectId);
    }
    
    const { data: billsWithRecId } = await billsSelectQuery;
    const orphanedBillIds = (billsWithRecId || [])
      .filter(b => !validRecIds.has(b.reconciliation_id))
      .map(b => b.id);
    
    console.log('Orphaned bill IDs:', orphanedBillIds.length);
    
    if (orphanedBillIds.length > 0) {
      const { data: billsData, error: billsErr } = await serviceClient
        .from('bills')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .in('id', orphanedBillIds)
        .select('id');

      if (billsErr) {
        console.error('Error updating bills:', billsErr);
        return new Response(
          JSON.stringify({ ok: false, step: 'fix_bills', error: billsErr.message }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        );
      }
      results.bills = billsData?.length || 0;
    } else {
      results.bills = 0;
    }
    console.log(`Fixed ${results.bills} bills`);

    // 4) Fix orphaned journal entry lines
    console.log('Finding orphaned journal entry lines...');
    let jelSelectQuery = serviceClient
      .from('journal_entry_lines')
      .select('id, reconciliation_id')
      .eq('owner_id', ownerId)
      .not('reconciliation_id', 'is', null);
    
    if (projectId) {
      jelSelectQuery = jelSelectQuery.eq('project_id', projectId);
    }
    
    const { data: jelWithRecId } = await jelSelectQuery;
    const orphanedJelIds = (jelWithRecId || [])
      .filter(j => !validRecIds.has(j.reconciliation_id))
      .map(j => j.id);
    
    console.log('Orphaned journal entry line IDs:', orphanedJelIds.length);
    
    if (orphanedJelIds.length > 0) {
      const { data: jelData, error: jelErr } = await serviceClient
        .from('journal_entry_lines')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .in('id', orphanedJelIds)
        .select('id');

      if (jelErr) {
        console.error('Error updating journal entry lines:', jelErr);
        return new Response(
          JSON.stringify({ ok: false, step: 'fix_journal_entry_lines', error: jelErr.message }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
        );
      }
      results.journal_entry_lines = jelData?.length || 0;
    } else {
      results.journal_entry_lines = 0;
    }
    console.log(`Fixed ${results.journal_entry_lines} journal entry lines`);

    const totalFixed = results.checks + results.deposits + results.bills + results.journal_entry_lines;
    console.log('=== fix-orphaned-reconciliations completed ===');
    console.log('Total fixed:', totalFixed);
    console.log('Results:', results);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        totalFixed,
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
