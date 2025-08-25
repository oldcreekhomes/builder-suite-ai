import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with service role key for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  console.log('Processing PO response request...');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const purchaseOrderId = url.searchParams.get("purchase_order_id");
    const companyId = url.searchParams.get("company_id");
    const response = url.searchParams.get("response");

    console.log('PO response params:', { purchaseOrderId, companyId, response });

    if (!purchaseOrderId || !companyId || !response) {
      console.error('Missing required parameters');
      const errorUrl = new URL('https://buildersuiteai.com/po-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    if (response !== "approved" && response !== "rejected") {
      console.error('Invalid response value');
      const errorUrl = new URL('https://buildersuiteai.com/po-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    // Update the PO status in the database
    const { error: updateError } = await supabase
      .from('project_purchase_orders')
      .update({ 
        status: response,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseOrderId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating PO status:', updateError);
      const errorUrl = new URL('https://buildersuiteai.com/po-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    console.log('PO status updated successfully');

    // Redirect to confirmation page
    const confirmationUrl = new URL('https://buildersuiteai.com/po-response-confirmation');
    confirmationUrl.searchParams.set('response', response);
    confirmationUrl.searchParams.set('status', 'success');

    console.log('Redirecting to:', confirmationUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': confirmationUrl.toString(),
      },
    });

  } catch (error) {
    console.error("Error in handle-po-response function:", error);
    const errorUrl = new URL('https://buildersuiteai.com/po-response-confirmation');
    errorUrl.searchParams.set('status', 'error');
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': errorUrl.toString() },
    });
  }
};

serve(handler);