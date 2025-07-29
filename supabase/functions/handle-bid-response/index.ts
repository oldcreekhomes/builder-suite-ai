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
  console.log('Processing bid response request...');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
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
    const { error: updateError } = await supabase
      .from('project_bid_package_companies')
      .update({ 
        bid_status: response,
        updated_at: new Date().toISOString()
      })
      .eq('bid_package_id', bidPackageId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating bid status:', updateError);
      const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
      errorUrl.searchParams.set('status', 'error');
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': errorUrl.toString() },
      });
    }

    console.log('Bid status updated successfully');

    // If they will bid, send the submission email
    if (response === 'will_bid') {
      try {
        // Get company representative email for the bid submission email
        const { data: companyRep, error: repError } = await supabase
          .from('company_representatives')
          .select('email, first_name, last_name')
          .eq('company_id', companyId)
          .eq('is_primary', true)
          .single();

        if (companyRep?.email) {
          console.log('Sending bid submission email to:', companyRep.email);
          
          const { error: emailError } = await supabase.functions.invoke('send-bid-submission-email', {
            body: {
              bidPackageId,
              companyId,
              recipientEmail: companyRep.email,
              recipientName: `${companyRep.first_name} ${companyRep.last_name}`
            }
          });

          if (emailError) {
            console.error('Error sending bid submission email:', emailError);
            // Don't fail the whole process if email fails
          } else {
            console.log('Bid submission email sent successfully');
          }
        } else {
          console.log('No primary company representative email found for company:', companyId);
        }
      } catch (emailError) {
        console.error('Error in email sending process:', emailError);
        // Continue with redirect even if email fails
      }
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
    console.error("Error in handle-bid-response function:", error);
    const errorUrl = new URL('https://buildersuiteai.com/bid-response-confirmation');
    errorUrl.searchParams.set('status', 'error');
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': errorUrl.toString() },
    });
  }
};



serve(handler);