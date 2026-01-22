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
  console.log('=== BID RESPONSE FUNCTION CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  console.log('Processing bid response request...');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bidPackageId = url.searchParams.get("bid_package_id");
    const companyId = url.searchParams.get("company_id");
    const response = url.searchParams.get("response");

    console.log('Bid response params:', { bidPackageId, companyId, response });

    if (!bidPackageId || !companyId || !response) {
      console.error('Missing required parameters');
      const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    if (response !== "will_bid" && response !== "will_not_bid") {
      console.error('Invalid response value');
      const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    // Update the bid status in the database
    console.log('Attempting to update bid status:', { bidPackageId, companyId, response });
    
    // Build update data - when will_bid, also set will_bid_at and reset acknowledgment
    const updatePayload: { 
      bid_status: string; 
      updated_at: string; 
      will_bid_at?: string; 
      will_bid_acknowledged_by?: null;
    } = { 
      bid_status: response,
      updated_at: new Date().toISOString()
    };
    
    if (response === 'will_bid') {
      updatePayload.will_bid_at = new Date().toISOString();
      updatePayload.will_bid_acknowledged_by = null; // Reset so PM sees this notification
    }
    
    const { data: updateData, error: updateError, count } = await supabase
      .from('project_bids')
      .update(updatePayload)
      .eq('bid_package_id', bidPackageId)
      .eq('company_id', companyId)
      .select();

    if (updateError) {
      console.error('Error updating bid status:', updateError);
      
      // Check if the row exists for debugging
      const { data: existingBid } = await supabase
        .from('project_bids')
        .select('id, bid_status')
        .eq('bid_package_id', bidPackageId)
        .eq('company_id', companyId)
        .single();
      
      console.log('Existing bid record:', existingBid);
      
      const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    if (!updateData || updateData.length === 0) {
      console.error('No rows were updated. Checking if bid record exists...');
      
      // Check if the row exists for debugging
      const { data: existingBid } = await supabase
        .from('project_bids')
        .select('id, bid_status')
        .eq('bid_package_id', bidPackageId)
        .eq('company_id', companyId);
      
      console.log('Found bid records:', existingBid);
      
      const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    console.log('Bid status updated successfully:', updateData);

    // Get bid package due date for confirmation page
    const { data: bidPackageData, error: bidPackageError } = await supabase
      .from('project_bid_packages')
      .select('due_date')
      .eq('id', bidPackageId)
      .single();

    const dueDate = bidPackageData?.due_date;
    console.log('Bid package due date:', dueDate);

    // Redirect to confirmation page
    const confirmationUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
    confirmationUrl.searchParams.set('response', response);
    confirmationUrl.searchParams.set('status', 'success');
    if (dueDate) {
      confirmationUrl.searchParams.set('due_date', dueDate);
    }

    console.log('Redirecting to:', confirmationUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': confirmationUrl.toString(),
      },
    });

  } catch (error) {
    console.error("❌ CRITICAL ERROR in handle-bid-response function:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
    errorUrl.searchParams.set('status', 'error');
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': errorUrl.toString() },
    });
  }
};



serve(handler);