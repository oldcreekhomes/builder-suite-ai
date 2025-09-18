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
    
    const { data: updateData, error: updateError, count } = await supabase
      .from('project_bids')
      .update({ 
        bid_status: response,
        updated_at: new Date().toISOString()
      })
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

    // If they will bid, send the submission email
    if (response === 'will_bid') {
      console.log('🎯 User responded "will_bid", attempting to send submission email...');
      try {
        // Get all company representatives who want bid notifications
        console.log('📋 Fetching company representatives for company:', companyId);
        const { data: companyReps, error: repError } = await supabase
          .from('company_representatives')
          .select('email, first_name, last_name')
          .eq('company_id', companyId)
          .eq('receive_bid_notifications', true);

        if (repError) {
          console.error('❌ Error fetching company representatives:', repError);
        } else if (companyReps && companyReps.length > 0) {
          console.log(`📧 Sending bid submission emails to ${companyReps.length} recipients`);
          console.log('Recipients:', companyReps.map(r => ({ email: r.email, name: `${r.first_name} ${r.last_name}` })));
          
          // Send emails to all representatives who want bid notifications
          const emailPromises = companyReps.map(async (rep) => {
            if (rep.email) {
              console.log('📩 Sending bid submission email to:', rep.email);
              
              const { data: emailData, error: emailError } = await supabase.functions.invoke('send-bid-submission-email', {
                body: {
                  bidPackageId,
                  companyId,
                  recipientEmail: rep.email,
                  recipientName: `${rep.first_name} ${rep.last_name}`
                }
              });

              if (emailError) {
                console.error(`❌ Error sending bid submission email to ${rep.email}:`, emailError);
                return { success: false, email: rep.email, error: emailError };
              } else {
                console.log(`✅ Bid submission email sent successfully to ${rep.email}:`, emailData);
                return { success: true, email: rep.email, data: emailData };
              }
            }
            console.log('⚠️ No email address for rep:', rep);
            return { success: false, email: rep.email, error: 'No email address' };
          });

          // Wait for all emails to complete
          const emailResults = await Promise.allSettled(emailPromises);
          const successCount = emailResults.filter(result => 
            result.status === 'fulfilled' && result.value.success
          ).length;
          
          console.log(`📊 Bid submission emails: ${successCount}/${companyReps.length} sent successfully`);
          console.log('Email results:', emailResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
        } else {
          console.log('⚠️ No company representatives with bid notifications enabled found for company:', companyId);
        }
      } catch (emailError) {
        console.error('❌ Error in email sending process:', emailError);
        // Continue with redirect even if email fails
      }
    } else {
      console.log('🚫 User responded "will_not_bid", no submission email needed');
    }

    // Redirect to confirmation page
    const confirmationUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
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