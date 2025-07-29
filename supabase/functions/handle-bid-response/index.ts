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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bidPackageId = url.searchParams.get("bid_package_id");
    const companyId = url.searchParams.get("company_id");
    const response = url.searchParams.get("response");

    console.log('Received bid response:', { bidPackageId, companyId, response });

    if (!bidPackageId || !companyId || !response) {
      return new Response(
        generateErrorHTML("Missing required parameters"),
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    if (response !== "will_bid" && response !== "will_not_bid") {
      return new Response(
        generateErrorHTML("Invalid response value"),
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Get company and bid package information for display
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      return new Response(
        generateErrorHTML("Company not found"),
        {
          status: 404,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    const { data: bidPackageData, error: bidPackageError } = await supabase
      .from('project_bid_packages')
      .select(`
        name,
        cost_codes (code, name),
        projects (name, address)
      `)
      .eq('id', bidPackageId)
      .single();

    if (bidPackageError) {
      console.error('Error fetching bid package:', bidPackageError);
      return new Response(
        generateErrorHTML("Bid package not found"),
        {
          status: 404,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
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
      return new Response(
        generateErrorHTML("Failed to update bid status"),
        {
          status: 500,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    console.log('Successfully updated bid status for company:', companyData.company_name);

    // Redirect to React confirmation page
    const redirectUrl = new URL(`https://buildersuiteai.com/bid-response-confirmation`);
    redirectUrl.searchParams.set('response', response);
    redirectUrl.searchParams.set('company', companyData.company_name);
    redirectUrl.searchParams.set('project', bidPackageData.projects?.name || '');
    redirectUrl.searchParams.set('address', bidPackageData.projects?.address || '');
    redirectUrl.searchParams.set('bidPackage', bidPackageData.name);
    redirectUrl.searchParams.set('costCode', `${bidPackageData.cost_codes?.code || ''} - ${bidPackageData.cost_codes?.name || ''}`);
    redirectUrl.searchParams.set('status', 'success');

    return new Response(null, {
      status: 302,
      headers: { 
        "Location": redirectUrl.toString()
      },
    });

  } catch (error) {
    console.error("Error in handle-bid-response function:", error);
    return new Response(
      generateErrorHTML("An unexpected error occurred"),
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
};

function generateSuccessHTML(
  response: string,
  companyName: string,
  bidPackageName: string,
  costCode: any,
  project: any
): string {
  const willBid = response === "will_bid";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bid ${willBid ? 'Confirmed' : 'Declined'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      background-color: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      padding: 32px;
      max-width: 448px;
      width: 100%;
      text-align: center;
    }
    .icon {
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      width: 48px;
      border-radius: 50%;
      margin-bottom: 16px;
    }
    .success-icon {
      color: #059669;
    }
    .decline-icon {
      color: #dc2626;
    }
    h1 {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 16px;
      margin-top: 0;
    }
    p {
      color: #6b7280;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    button {
      background-color: #111827;
      color: white;
      font-weight: 500;
      padding: 8px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 16px;
    }
    button:hover {
      background-color: #1f2937;
    }
    .website {
      font-size: 14px;
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      ${willBid 
        ? '<svg class="success-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>'
        : '<svg class="decline-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
      }
    </div>
    <h1>Bid ${willBid ? 'Confirmed' : 'Declined'}</h1>
    <p>
      ${willBid 
        ? 'Thank you for confirming you will bid on this project.'
        : 'We have recorded that you declined this bid. The project manager will be notified.'
      }
    </p>
    <button onclick="window.close()">Close Window</button>
    <div>
      <span class="website">www.buildersuiteai.com</span>
    </div>
  </div>
</body>
</html>`;
}

function generateErrorHTML(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      background-color: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      padding: 32px;
      max-width: 448px;
      width: 100%;
      text-align: center;
    }
    .icon {
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      width: 48px;
      border-radius: 50%;
      margin-bottom: 16px;
    }
    .error-icon {
      color: #dc2626;
    }
    h1 {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 16px;
      margin-top: 0;
    }
    p {
      color: #6b7280;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    button {
      background-color: #111827;
      color: white;
      font-weight: 500;
      padding: 8px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 16px;
    }
    button:hover {
      background-color: #1f2937;
    }
    .website {
      font-size: 14px;
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg class="error-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/>
        <path d="m9 9 6 6"/>
      </svg>
    </div>
    <h1>Error</h1>
    <p>There was an error processing your bid response. Please try again or contact support.</p>
    <button onclick="window.close()">Close Window</button>
    <div>
      <span class="website">www.buildersuiteai.com</span>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);