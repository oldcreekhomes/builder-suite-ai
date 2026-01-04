import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  reconciliationId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with service role for the actual operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with anon key + user's JWT for auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[discard-reconciliation] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[discard-reconciliation] User authenticated:', user.id);

    const { reconciliationId } = await req.json() as RequestBody;
    
    if (!reconciliationId) {
      return new Response(
        JSON.stringify({ error: 'reconciliationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[discard-reconciliation] Processing reconciliation:', reconciliationId);

    // 1. Fetch the reconciliation details
    const { data: reconciliation, error: fetchError } = await supabaseAdmin
      .from('bank_reconciliations')
      .select('id, bank_account_id, project_id, status, statement_date')
      .eq('id', reconciliationId)
      .single();
    
    if (fetchError || !reconciliation) {
      console.error('[discard-reconciliation] Reconciliation not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Reconciliation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[discard-reconciliation] Found reconciliation:', {
      id: reconciliation.id,
      status: reconciliation.status,
      statement_date: reconciliation.statement_date,
      bank_account_id: reconciliation.bank_account_id,
      project_id: reconciliation.project_id
    });

    // 2. Unreconcile all transactions linked to this reconciliation

    // Update checks
    const { data: checksUpdated, error: checksError } = await supabaseAdmin
      .from('checks')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');
    
    if (checksError) {
      console.error('[discard-reconciliation] Error updating checks:', checksError);
      throw checksError;
    }
    console.log('[discard-reconciliation] Updated checks:', checksUpdated?.length || 0);

    // Update deposits
    const { data: depositsUpdated, error: depositsError } = await supabaseAdmin
      .from('deposits')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');
    
    if (depositsError) {
      console.error('[discard-reconciliation] Error updating deposits:', depositsError);
      throw depositsError;
    }
    console.log('[discard-reconciliation] Updated deposits:', depositsUpdated?.length || 0);

    // Update bills
    const { data: billsUpdated, error: billsError } = await supabaseAdmin
      .from('bills')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');
    
    if (billsError) {
      console.error('[discard-reconciliation] Error updating bills:', billsError);
      throw billsError;
    }
    console.log('[discard-reconciliation] Updated bills:', billsUpdated?.length || 0);

    // Update journal_entry_lines
    const { data: jelUpdated, error: jelError } = await supabaseAdmin
      .from('journal_entry_lines')
      .update({ 
        reconciled: false, 
        reconciliation_id: null, 
        reconciliation_date: null 
      })
      .eq('reconciliation_id', reconciliationId)
      .select('id');
    
    if (jelError) {
      console.error('[discard-reconciliation] Error updating journal_entry_lines:', jelError);
      throw jelError;
    }
    console.log('[discard-reconciliation] Updated journal_entry_lines:', jelUpdated?.length || 0);

    // 3. Delete the reconciliation record
    const { error: deleteError } = await supabaseAdmin
      .from('bank_reconciliations')
      .delete()
      .eq('id', reconciliationId);
    
    if (deleteError) {
      console.error('[discard-reconciliation] Error deleting reconciliation:', deleteError);
      throw deleteError;
    }
    console.log('[discard-reconciliation] Deleted reconciliation record');

    const result = {
      success: true,
      discarded: {
        reconciliationId,
        statement_date: reconciliation.statement_date,
        checks: checksUpdated?.length || 0,
        deposits: depositsUpdated?.length || 0,
        bills: billsUpdated?.length || 0,
        journal_entry_lines: jelUpdated?.length || 0
      }
    };

    console.log('[discard-reconciliation] Complete:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[discard-reconciliation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
