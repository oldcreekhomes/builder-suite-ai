import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Generate success confirmation page
    const successHTML = generateSuccessHTML(
      response,
      companyData.company_name,
      bidPackageData.name,
      bidPackageData.cost_codes,
      bidPackageData.projects
    );

    return new Response(successHTML, {
      status: 200,
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        ...corsHeaders 
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
  const statusText = willBid ? "Yes, we will bid" : "No, we will not bid";
  const statusColor = willBid ? "#10B981" : "#EF4444";
  const iconEmoji = willBid ? "✅" : "❌";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bid Response Confirmed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f8fafc;
      color: #334155;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: ${statusColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .project-details {
      background-color: #f1f5f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: 600;
      min-width: 120px;
      color: #475569;
    }
    .detail-value {
      color: #334155;
    }
    .close-button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    .close-button:hover {
      background: #5a67d8;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background-color: #f8fafc;
      color: #64748b;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bid Response Confirmed</h1>
      <p>Thank you for your response!</p>
    </div>
    
    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">
          <span style="font-size: 20px;">${iconEmoji}</span>
          ${statusText}
        </div>
      </div>
      
      <p><strong>${companyName}</strong>, your bid response has been successfully recorded.</p>
      
      <div class="project-details">
        <h3 style="margin-top: 0; color: #1e293b;">Project Details</h3>
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${project?.name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">${project?.address || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bid Package:</span>
          <span class="detail-value">${bidPackageName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cost Code:</span>
          <span class="detail-value">${costCode?.code || 'N/A'} - ${costCode?.name || 'N/A'}</span>
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">
        Your response has been recorded and the project team will be notified. 
        ${willBid ? 'Please watch for further communications regarding this project.' : 'Thank you for letting us know.'}
      </p>
      
      <div style="text-align: center;">
        <button class="close-button" onclick="window.close()">Close Window</button>
      </div>
    </div>
    
    <div class="footer">
      <p>This response was recorded on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
  </div>
  
  <script>
    // Auto-close after 30 seconds if not manually closed
    setTimeout(function() {
      if (confirm('Close this window?')) {
        window.close();
      }
    }, 30000);
  </script>
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
      padding: 20px;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .error-container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-width: 500px;
    }
    .error-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      color: #dc2626;
      margin-bottom: 10px;
    }
    p {
      color: #64748b;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">❌</div>
    <h1>Error</h1>
    <p>${errorMessage}</p>
    <button onclick="window.close()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
      Close
    </button>
  </div>
</body>
</html>`;
}

serve(handler);