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

    // Get bid package due date for confirmation page
    const { data: bidPackageData, error: bidPackageError } = await supabase
      .from('project_bid_packages')
      .select('due_date')
      .eq('id', bidPackageId)
      .single();

    const dueDate = bidPackageData?.due_date;
    console.log('Bid package due date:', dueDate);

    // If they will bid, notify the home builder about the bid confirmation
    if (response === 'will_bid') {
      // Notify the home builder about the bid confirmation
      console.log('📬 Now sending notification to home builder about bid confirmation...');
      try {
        // Get bid package and project info to find the home builder
        const { data: bidPackageData, error: bidPackageError } = await supabase
          .from('project_bid_packages')
          .select(`
            id,
            name,
            project_id,
            cost_code_id,
            projects!inner(
              address,
              owner_id,
              construction_manager,
              accounting_manager
            ),
            cost_codes!inner(
              code,
              name
            )
          `)
          .eq('id', bidPackageId)
          .single();

        if (bidPackageError) {
          console.error('❌ Error fetching bid package for home builder notification:', bidPackageError);
        } else {
          console.log('📊 Bid package data for notification:', bidPackageData);
          
          // Get company info
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('company_name')
            .eq('id', companyId)
            .single();

          if (companyError) {
            console.error('❌ Error fetching company data:', companyError);
          } else {
            console.log('🏢 Company data:', companyData);
            
            // Get home builder contact info (use construction_manager if available, otherwise owner)
            const homeBuilderContactId = bidPackageData.projects?.[0]?.construction_manager || bidPackageData.projects?.[0]?.owner_id;
            
            const { data: homeBuilderData, error: homeBuilderError } = await supabase
              .from('users')
              .select('email, first_name, last_name')
              .eq('id', homeBuilderContactId)
              .single();

            if (homeBuilderError) {
              console.error('❌ Error fetching home builder contact:', homeBuilderError);
            } else {
              console.log('🏠 Home builder contact:', homeBuilderData);
              
              // Send notification email to home builder
              console.log('📧 Sending bid confirmation notification to home builder:', homeBuilderData.email);
              
              const { data: notificationEmailData, error: notificationEmailError } = await supabase.functions.invoke('send-bid-submission-email', {
                body: {
                  bidPackageId,
                  companyId,
                  recipientEmail: homeBuilderData.email,
                  recipientName: `${homeBuilderData.first_name} ${homeBuilderData.last_name}`,
                  isHomeBuilderNotification: true, // Flag to distinguish this from company confirmation
                  projectAddress: bidPackageData.projects?.[0]?.address,
                  costCodeName: `${bidPackageData.cost_codes?.[0]?.code}: ${bidPackageData.cost_codes?.[0]?.name}`,
                  companyName: companyData.company_name
                }
              });

              if (notificationEmailError) {
                console.error('❌ Error sending home builder notification email:', notificationEmailError);
              } else {
                console.log('✅ Home builder notification email sent successfully:', notificationEmailData);
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('❌ Error in home builder notification process:', notificationError);
        // Continue with redirect even if notification fails
      }
    } else {
      console.log('🚫 User responded "will_not_bid", no submission email needed');
    }

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