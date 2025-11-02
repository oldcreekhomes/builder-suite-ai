import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting one-time fix for missing deposit...');

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const depositId = '2bfe1ae4-d193-4c90-b237-8ee80895cd00';
    const reconciliationId = 'ec8f1313-e2c2-4327-aac7-eeb40e633142';
    const reconciliationDate = '2025-09-30';

    // First, fetch the current state of the deposit
    console.log('📋 Fetching current deposit state...');
    const { data: depositBefore, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching deposit:', fetchError);
      throw new Error(`Failed to fetch deposit: ${fetchError.message}`);
    }

    if (!depositBefore) {
      console.error('❌ Deposit not found');
      throw new Error('Deposit not found');
    }

    console.log('✅ Found deposit:', {
      id: depositBefore.id,
      amount: depositBefore.amount,
      deposit_date: depositBefore.deposit_date,
      reconciled: depositBefore.reconciled,
      reconciliation_id: depositBefore.reconciliation_id,
    });

    // Verify the reconciliation exists
    console.log('📋 Verifying reconciliation exists...');
    const { data: reconciliation, error: reconError } = await supabase
      .from('bank_reconciliations')
      .select('id, statement_date')
      .eq('id', reconciliationId)
      .single();

    if (reconError) {
      console.error('❌ Error fetching reconciliation:', reconError);
      throw new Error(`Failed to fetch reconciliation: ${reconError.message}`);
    }

    console.log('✅ Found reconciliation:', {
      id: reconciliation.id,
      statement_date: reconciliation.statement_date,
    });

    // Update the deposit
    console.log('🔄 Updating deposit to mark as reconciled...');
    const { data: depositAfter, error: updateError } = await supabase
      .from('deposits')
      .update({
        reconciled: true,
        reconciliation_id: reconciliationId,
        reconciliation_date: reconciliationDate,
      })
      .eq('id', depositId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating deposit:', updateError);
      throw new Error(`Failed to update deposit: ${updateError.message}`);
    }

    console.log('✅ Successfully updated deposit!');
    console.log('After state:', {
      id: depositAfter.id,
      amount: depositAfter.amount,
      deposit_date: depositAfter.deposit_date,
      reconciled: depositAfter.reconciled,
      reconciliation_id: depositAfter.reconciliation_id,
      reconciliation_date: depositAfter.reconciliation_date,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deposit successfully marked as reconciled',
        before: {
          reconciled: depositBefore.reconciled,
          reconciliation_id: depositBefore.reconciliation_id,
          reconciliation_date: depositBefore.reconciliation_date,
        },
        after: {
          reconciled: depositAfter.reconciled,
          reconciliation_id: depositAfter.reconciliation_id,
          reconciliation_date: depositAfter.reconciliation_date,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in fix-missing-deposit function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
