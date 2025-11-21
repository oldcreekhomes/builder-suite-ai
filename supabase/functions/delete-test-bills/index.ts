import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const billIds = [
      'd35c45c8-9b86-4d65-8b9e-d3d9ac00441a',
      'c1e5de6a-566e-4f27-a634-54dd72d77ee2',
      '9a6c06da-debe-4003-9ad3-b55b1e9d7bcb',
      '16fde4d3-4747-4ab0-8614-8014966b1a1f',
      '7aa17c1c-fe3c-4521-a312-01e208c398fc',
      'ff519832-cb7d-47e2-929f-c7855fbd819c',
      'f499e1be-3611-483d-82a2-82340837782b'
    ];

    const results = [];

    for (const billId of billIds) {
      // Use the existing RPC function to delete bill with all related data
      const { data, error } = await supabase.rpc('delete_bill_with_journal_entries', {
        p_bill_id: billId
      });

      if (error) {
        console.error(`Error deleting bill ${billId}:`, error);
        results.push({ billId, success: false, error: error.message });
      } else {
        console.log(`Successfully deleted bill ${billId}`);
        results.push({ billId, success: true });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Bill deletion completed',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in delete-test-bills function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
