import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

console.log('🔧 Edge function starting...');
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('🔑 RESEND_API_KEY available:', !!resendApiKey);

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY is not set');
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BidPackageEmailRequest {
  bidPackage: {
    costCode: {
      code: string;
      name: string;
    };
    dueDate?: string;
    reminderDate?: string;
    specifications?: string;
    files: string[];
  };
  companies: Array<{
    name: string;
    address?: string;
    phone?: string;
    representatives: Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone_number?: string;
      title?: string;
    }>;
  }>;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const generateEmailHTML = (data: BidPackageEmailRequest) => {
  const { bidPackage, companies } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bid Package - ${bidPackage.costCode.code}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e9ecef; border-radius: 8px; }
        .section-title { font-size: 18px; font-weight: bold; color: #495057; margin-bottom: 10px; border-bottom: 2px solid #dee2e6; padding-bottom: 5px; }
        .cost-code { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .date-info { display: flex; gap: 20px; margin-bottom: 15px; }
        .date-item { background-color: #e7f3ff; padding: 10px; border-radius: 4px; flex: 1; }
        .date-label { font-weight: bold; color: #0056b3; }
        .specifications { background-color: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap; }
        .files-list { list-style: none; padding: 0; }
        .file-item { background-color: #e9ecef; margin: 5px 0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-right: 10px; }
        .company { border-left: 4px solid #007bff; padding-left: 15px; margin-bottom: 15px; }
        .company-name { font-size: 18px; font-weight: bold; color: #007bff; }
        .company-address { color: #6c757d; margin-bottom: 10px; }
        .representative { background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .rep-name { font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bid Package Request</h1>
        <p>You have received a new bid package request. Please review the details below.</p>
      </div>

      <div class="section">
        <div class="section-title">Project Details</div>
        <div class="cost-code">${bidPackage.costCode.code} - ${bidPackage.costCode.name}</div>
        
        <div class="date-info">
          <div class="date-item">
            <div class="date-label">Due Date:</div>
            <div>${formatDate(bidPackage.dueDate)}</div>
          </div>
          <div class="date-item">
            <div class="date-label">Reminder Date:</div>
            <div>${formatDate(bidPackage.reminderDate)}</div>
          </div>
        </div>
      </div>

      ${bidPackage.specifications ? `
        <div class="section">
          <div class="section-title">Specifications</div>
          <div class="specifications">${bidPackage.specifications}</div>
        </div>
      ` : ''}

      ${bidPackage.files.length > 0 ? `
        <div class="section">
          <div class="section-title">Attached Files</div>
          <ul class="files-list">
            ${bidPackage.files.map(file => `<li class="file-item">📄 ${file}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Next Steps</div>
        <p>Please review the specifications and requirements above. If you have any questions or need clarification, please don't hesitate to contact us.</p>
        <p><strong>Important:</strong> Please confirm your intent to bid and submit your proposal by the due date specified above.</p>
      </div>

      <div class="footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>If you have questions, please contact the project manager.</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: BidPackageEmailRequest = await req.json();
    console.log('📧 Received bid package email request:', JSON.stringify(requestData, null, 2));

    const { bidPackage, companies } = requestData;

    // Collect all recipient emails
    const recipients: string[] = [];
    companies.forEach(company => {
      console.log(`🏢 Processing company: ${company.name}`);
      company.representatives.forEach(rep => {
        console.log(`👤 Processing representative: ${rep.first_name} ${rep.last_name}, email: ${rep.email}`);
        if (rep.email) {
          recipients.push(rep.email);
        }
      });
    });

    console.log(`📮 Total recipients: ${recipients.length}`);
    console.log(`📮 Recipients list: ${JSON.stringify(recipients)}`);

    if (recipients.length === 0) {
      console.log('❌ No recipients found with valid email addresses');
      return new Response(
        JSON.stringify({ error: "No recipients found with valid email addresses" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailHTML = generateEmailHTML(requestData);
    const subject = `Bid Package Request - ${bidPackage.costCode.code}: ${bidPackage.costCode.name}`;

    // For testing purposes, send to the account owner's email if domain not verified
    // In production, you should verify your domain at resend.com/domains
    const testEmail = "mgray@oldcreekhomes.com";
    const finalRecipients = [testEmail]; // Use your email for testing

    console.log('📬 About to send email via Resend...');
    console.log('🎯 Sending test email to:', testEmail);
    // Send email to all recipients
    const emailResponse = await resend.emails.send({
      from: "Bid Packages <onboarding@resend.dev>",
      to: finalRecipients,
      subject: subject,
      html: emailHTML
    });

    console.log("📧 Resend API response:", JSON.stringify(emailResponse, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        recipientsCount: recipients.length,
        recipients: recipients
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bid-package-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);