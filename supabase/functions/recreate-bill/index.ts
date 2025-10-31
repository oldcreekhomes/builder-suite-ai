import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { 
      ownerId,
      vendorId,
      projectId,
      billDate,
      dueDate,
      referenceNumber,
      totalAmount,
      costCodeId,
      memo
    } = await req.json();

    // Create the bill
    const { data: bill, error: billError } = await supabaseClient
      .from('bills')
      .insert({
        owner_id: ownerId,
        vendor_id: vendorId,
        project_id: projectId,
        bill_date: billDate,
        due_date: dueDate,
        reference_number: referenceNumber,
        total_amount: totalAmount,
        amount_paid: 0,
        status: 'posted',
        created_by: ownerId
      })
      .select()
      .single();

    if (billError) {
      throw billError;
    }

    // Create the bill line
    const { error: lineError } = await supabaseClient
      .from('bill_lines')
      .insert({
        bill_id: bill.id,
        owner_id: ownerId,
        line_number: 1,
        line_type: 'job_cost',
        cost_code_id: costCodeId,
        project_id: projectId,
        amount: totalAmount,
        quantity: 1,
        unit_cost: totalAmount,
        memo: memo
      });

    if (lineError) {
      throw lineError;
    }

    return new Response(
      JSON.stringify({ success: true, billId: bill.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
