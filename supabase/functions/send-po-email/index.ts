import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('🔧 PO Email Edge function starting...');
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('🔑 RESEND_API_KEY available:', !!resendApiKey);

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY is not set');
}

const resend = new Resend(resendApiKey);

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface POEmailRequest {
  biddingCompanyId: string;
  projectAddress: string;
  companyName: string;
  proposals?: string[];
  senderCompanyName?: string;
}

const generatePOEmailHTML = (data: { 
  companyName: string; 
  projectAddress: string; 
  proposals?: string[];
  senderCompany?: string;
}) => {
  const { companyName, projectAddress, proposals = [], senderCompany = 'BuilderSuite AI' } = data;

  // Generate downloadable proposal links
  const attachmentsHtml = proposals && proposals.length > 0 
    ? proposals.map(file => {
        const filePath = file.includes('/') ? file : `proposals/${file}`;
        const downloadUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/${filePath}`;
        const fileName = file.split('/').pop() || file;
        return `<p style="margin: 5px 0;"><a href="${downloadUrl}" style="color: #059669; text-decoration: underline;" target="_blank" download>📎 ${fileName}</a></p>`;
      }).join('')
    : '<p style="margin: 5px 0; color: #666;">No proposals attached</p>';

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="-ms-text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; height: 100% !important; width: 100% !important; margin: 0; padding: 0;">
<head>
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Purchase Order Notification - ${senderCompany}</title>
</head>
<body style="background-color: #F6F6F6; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; margin: 0; padding: 0;">
  <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
    <tbody>
      <tr>
        <td style="padding: 20px 0;" align="center">
          <table style="border-collapse: collapse; border-spacing: 0; max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E0E0E0;" cellpadding="0" cellspacing="0">
            <tbody>
              <!-- Header -->
              <tr>
                <td style="padding: 30px; text-align: center; border-bottom: 1px solid #E0E0E0;">
                  <h1 style="color: #059669; font-size: 28px; margin: 0; font-weight: bold;">${senderCompany}</h1>
                  <h2 style="color: #4D4D4D; font-size: 20px; margin: 10px 0 0 0; font-weight: normal;">Purchase Order Notification</h2>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    Dear ${companyName} Team,
                  </p>
                  
                  <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    We are pleased to inform you that a <strong>Purchase Order (PO)</strong> has been issued for your services on the following project:
                  </p>
                  
                  <!-- Project Details Box -->
                  <div style="background-color: #F8F9FA; padding: 20px; border-left: 4px solid #059669; margin: 20px 0;">
                    <h3 style="color: #059669; font-size: 18px; margin: 0 0 10px 0;">Project Information</h3>
                    <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 0;">
                      <strong>Project Address:</strong> ${projectAddress}
                    </p>
                  </div>
                  
                  <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 20px 0;">
                    This notification confirms that your proposal has been accepted and you have been awarded the contract for this project.
                  </p>
                  
                  <!-- Proposals Section -->
                  <div style="margin: 25px 0;">
                    <h3 style="color: #4D4D4D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">Your Submitted Proposals:</h3>
                    <div style="background-color: #F8F9FA; padding: 15px; border-radius: 5px;">
                      ${attachmentsHtml}
                    </div>
                  </div>
                  
                  <!-- Next Steps -->
                  <div style="background-color: #E8F5E8; padding: 20px; border-radius: 5px; margin: 25px 0;">
                    <h3 style="color: #059669; font-size: 16px; margin: 0 0 10px 0;">Next Steps</h3>
                    <p style="color: #4D4D4D; font-size: 14px; line-height: 20px; margin: 0;">
                      • You will receive the formal Purchase Order documentation separately<br>
                      • Please prepare to begin work as scheduled<br>
                      • Contact us if you have any questions about the project scope or timeline
                    </p>
                  </div>
                  
                  <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 20px 0 0 0;">
                    Thank you for your partnership. We look forward to working with you on this project.
                  </p>
                  
                  <p style="color: #4D4D4D; font-size: 16px; line-height: 24px; margin: 20px 0 0 0;">
                    Best regards,<br>
                    <strong>The ${senderCompany} Team</strong>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; background-color: #F8F9FA; border-top: 1px solid #E0E0E0; text-align: center;">
                   <a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #666; font-size: 12px; margin: 0; text-decoration: none;">www.buildersuiteai.com</a>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
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
    console.log('📧 Processing PO email request...');
    const { biddingCompanyId, projectAddress, companyName, proposals, senderCompanyName }: POEmailRequest = await req.json();

    console.log('📝 Request data:', { biddingCompanyId, projectAddress, companyName, proposalsCount: proposals?.length || 0, senderCompanyName });

    // Get the bidding company details to find the company ID
    const { data: biddingCompany, error: biddingError } = await supabase
      .from('project_bid_package_companies')
      .select(`
        company_id,
        companies!inner(
          company_name,
          company_representatives(
            id,
            first_name,
            last_name,
            email,
            receive_po_notifications
          )
        )
      `)
      .eq('id', biddingCompanyId)
      .single();

    if (biddingError) {
      console.error('❌ Error fetching bidding company:', biddingError);
      throw new Error(`Failed to fetch bidding company: ${biddingError.message}`);
    }

    if (!biddingCompany) {
      throw new Error('Bidding company not found');
    }

    console.log('🏢 Found company:', biddingCompany.companies.company_name);

    // Filter representatives who want to receive PO notifications
    const notificationRecipients = biddingCompany.companies.company_representatives.filter(
      (rep: any) => rep.receive_po_notifications === true && rep.email
    );

    console.log('📬 Notification recipients:', notificationRecipients.length);

    if (notificationRecipients.length === 0) {
      console.log('⚠️ No recipients have PO notifications enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No representatives have PO notifications enabled',
          emailsSent: 0 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate that we have a sender company name
    if (!senderCompanyName) {
      console.error('❌ No sender company name provided');
      return new Response(
        JSON.stringify({ error: 'Sender company name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('🏢 Using sender company name:', senderCompanyName);

    // Generate email HTML
    const emailHTML = generatePOEmailHTML({
      companyName: biddingCompany.companies.company_name,
      projectAddress,
      proposals,
      senderCompany: senderCompanyName,
    });

    // Send emails to all recipients
    const emailPromises = notificationRecipients.map(async (rep: any) => {
      console.log(`📤 Sending PO email to: ${rep.email}`);
      
      return await resend.emails.send({
        from: `${senderCompanyName} <noreply@transactional.buildersuiteai.com>`,
        to: [rep.email],
        subject: `Purchase Order Issued - ${projectAddress}`,
        html: emailHTML,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Count successful emails
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected');

    if (failedEmails.length > 0) {
      console.error('❌ Some emails failed to send:', failedEmails);
    }

    console.log(`✅ Successfully sent ${successfulEmails} PO notification emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successfulEmails,
        totalRecipients: notificationRecipients.length,
        message: `PO notification sent to ${successfulEmails} recipients`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in send-po-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);