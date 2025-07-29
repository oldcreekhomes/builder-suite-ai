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
  projectManagerName?: string;
  projectManagerPhone?: string;
  projectManagerEmail?: string;
}) => {
  const { 
    companyName, 
    projectAddress, 
    proposals = [], 
    senderCompany = 'BuilderSuite AI',
    projectManagerName = 'Project Manager',
    projectManagerPhone = 'N/A',
    projectManagerEmail = 'contact@buildersuiteai.com'
  } = data;

  // Generate downloadable proposal links with new styling
  const attachmentsHtml = proposals && proposals.length > 0 
    ? proposals.map(file => {
        const filePath = file.includes('/') ? file : `proposals/${file}`;
        const downloadUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/${filePath}`;
        const fileName = file.split('/').pop() || file;
        return `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: separate; border-radius: 3px; background-color: #f8f8f8; padding: 15px; width: 100%; margin-bottom: 10px;">
            <tr>
              <td style="margin: 0; padding: 0;">
                <a href="${downloadUrl}" style="color: #000000 !important; text-decoration: none !important; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: block;" target="_blank" download>📎 ${fileName}</a>
                <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${fileName}</p>
              </td>
            </tr>
          </table>
        `;
      }).join('')
    : `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: separate; border-radius: 3px; background-color: #f8f8f8; padding: 15px; width: 100%;">
        <tr>
          <td style="margin: 0; padding: 0;">
            <p style="color: #666666; font-size: 14px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">No proposals attached</p>
          </td>
        </tr>
      </table>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Purchase Order Notification</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Wrapper Table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Purchase Order Issued</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <!-- Greeting Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #f8f8f8; padding: 25px; margin: 0;">
                                        <h2 style="color: #000000; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${companyName} Team,</h2>
                                        <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">We are pleased to inform you that a Purchase Order (PO) has been issued for your services on the following project.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Project Information Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <!-- Project Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Project Information
                                    </td>
                                </tr>
                                <!-- Project Content -->
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Project Address:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Status:</span>
                                                                <span style="color: #22c55e; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Contract Awarded</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Proposals Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <!-- Proposals Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Your Submitted Proposals
                                    </td>
                                </tr>
                                <!-- Proposals Content -->
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    ${attachmentsHtml}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            
                            <!-- Contact Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <!-- Contact Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Project Manager
                                    </td>
                                </tr>
                                <!-- Contact Content -->
                                <tr>
                                    <td style="padding: 20px; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 8px 0;">
                                                    <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Name:</span>
                                                    <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 8px 0;">
                                                    <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Phone:</span>
                                                    <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerPhone}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0;">
                                                    <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Email:</span>
                                                    <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerEmail}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="text-align: center; padding: 25px 30px; border-top: 1px solid #e5e5e5; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                <a href="https://www.buildersuiteai.com" style="color: #000000 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">www.buildersuiteai.com</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
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