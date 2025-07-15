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
    name: string;
    costCode: {
      code: string;
      name: string;
    };
    due_date?: string;
    reminder_date?: string;
    specifications?: string;
    files: string[];
  };
  project?: {
    address: string;
    manager?: string;
  };
  senderCompany?: {
    company_name: string;
    address?: string;
  };
  companies: Array<{
    company_name: string;
    address?: string;
    phone_number?: string;
    representatives: Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone_number?: string;
      title?: string;
      is_primary?: boolean;
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

const formatSpecifications = (specifications: string | undefined) => {
  if (!specifications) return 'See attached specifications';
  
  // Split by line breaks and process bullet points and numbered lists
  const lines = specifications.split(/\r?\n/);
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Check if line starts with bullet point markers
    if (trimmed.match(/^[•·-]\s*/) || trimmed.match(/^\d+\.\s*/)) {
      return `<p style="line-height: 20px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; margin: 5px 0 5px 20px;">${trimmed}</p>`;
    }
    
    return `<p style="line-height: 20px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; margin: 5px 0;">${trimmed}</p>`;
  });
  
  return formattedLines.filter(line => line).join('');
};

const generateFileDownloadLinks = (files: string[], baseUrl: string = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files') => {
  if (!files || files.length === 0) return 'No files attached';
  
  return files.map(file => {
    // Check if the file already includes a path or if it's just a filename
    const filePath = file.includes('/') ? file : `specifications/${file}`;
    const downloadUrl = `${baseUrl}/${filePath}`;
    const fileName = file.split('/').pop() || file;
    return `<p style="margin: 5px 0;"><a href="${downloadUrl}" style="color: #059669; text-decoration: underline;" target="_blank" download>📎 ${fileName}</a></p>`;
  }).join('');
};

const generateEmailHTML = (data: BidPackageEmailRequest) => {
  const { bidPackage, companies, project, senderCompany } = data;

  // Get project manager name (using first company's primary representative as fallback)
  const managerName = project?.manager || 
    companies.find(c => c.representatives?.some(r => r.is_primary))?.representatives?.find(r => r.is_primary)?.first_name + ' ' + 
    companies.find(c => c.representatives?.some(r => r.is_primary))?.representatives?.find(r => r.is_primary)?.last_name || 
    'Project Manager';

  // Use sender company name if provided, otherwise fallback to first company
  const companyName = senderCompany?.company_name || companies[0]?.company_name || 'Your Company';

  // Format specifications with bullet points and numbered lists
  const formattedSpecifications = formatSpecifications(bidPackage.specifications);

  // Generate downloadable file links
  const attachmentsHtml = generateFileDownloadLinks(bidPackage.files);

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="-ms-text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; height: 100% !important; width: 100% !important; margin: 0; padding: 0;">
<head>
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Bid Invitation - ${companyName}</title>
  <style type="text/css">
    body {
      -ms-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      height: 100% !important;
      margin: 0;
      padding: 0;
      width: 100% !important;
    }
  </style>
</head>
<body style="background-color: #F6F6F6; -ms-text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; height: 100% !important; width: 100% !important; margin: 0; padding: 0;" bgcolor="#F6F6F6">
  <table class="body-wrap" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
    <tbody>
      <tr>
        <td></td>
        <td width="600" align="center">
          <table class="main-table" style="border-collapse: collapse; border-spacing: 0; min-width: 300px; width: 100%; max-width: 600px;" cellpadding="0" cellspacing="0">
            <tbody>
              <tr>
                <td>
                  <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                    <tbody>
                      <tr>
                        <td>
                          <table class="email-div" style="height: 100%; max-width: 600px; min-width: 300px; border-collapse: collapse; border-spacing: 0; width: 100%;" cellpadding="0" cellspacing="0">
                            <tbody>
                              <tr>
                                <td style="width: 10px;"></td>
                                <td>
                                  <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                    <tbody>
                                      <tr>
                                        <td style="height: 15px;"></td>
                                      </tr>
                                      <!-- Logo Section -->
                                      <tr>
                                        <td>
                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                            <tbody>
                                              <tr class="header">
                                                <td align="center">
                                                  <h4 style="color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 24px; line-height: 30px; margin: 0; text-align: center;">
                                                    <b>${companyName}</b>
                                                  </h4>
                                                </td>
                                              </tr>
                                              <tr>
                                                <td height="10"></td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <!-- Main Content Card -->
                                      <tr>
                                        <td>
                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                            <tbody>
                                              <tr>
                                                <td>
                                                  <table class="email-div" bgcolor="#FFFFFF" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%; border: 1px solid #E0E0E0;" cellpadding="0" cellspacing="0">
                                                    <tbody>
                                                      <tr>
                                                        <td>
                                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                            <tbody>
                                                              <tr>
                                                                <td style="width: 15px;"></td>
                                                                <td>
                                                                  <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                    <tbody>
                                                                      <tr>
                                                                        <td style="height: 15px;"></td>
                                                                      </tr>
                                                                      <tr>
                                                                        <td>
                                                                          <h4 style="color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 24px; line-height: 30px; margin: 0;">
                                                                            <b>Bid Invitation</b>
                                                                          </h4>
                                                                        </td>
                                                                      </tr>
                                                                      <tr>
                                                                        <td style="height: 15px;"></td>
                                                                      </tr>
                                                                    </tbody>
                                                                  </table>
                                                                </td>
                                                                <td style="width: 15px;"></td>
                                                              </tr>
                                                            </tbody>
                                                          </table>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="height: 15px;"></td>
                                      </tr>
                                      <!-- Project Details Section -->
                                      <tr>
                                        <td>
                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                            <tbody>
                                              <tr>
                                                <td>
                                                  <table class="email-div" bgcolor="#FFFFFF" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%; border: 1px solid #E0E0E0;" cellpadding="0" cellspacing="0">
                                                    <tbody>
                                                      <tr>
                                                        <td>
                                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                            <tbody>
                                                              <tr>
                                                                <td>
                                                                  <table class="email-div" style="border-bottom-width: 1px; border-bottom-color: #E0E0E0; border-bottom-style: solid; border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                    <tbody>
                                                                      <tr>
                                                                        <td style="width: 15px;"></td>
                                                                        <td>
                                                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                            <tbody>
                                                                              <tr>
                                                                                <td style="height: 15px;"></td>
                                                                              </tr>
                                                                              <tr>
                                                                                <td>
                                                                                  <h5 style="color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 16px; line-height: 21px; margin: 0;">
                                                                                    Project Details
                                                                                  </h5>
                                                                                </td>
                                                                              </tr>
                                                                              <tr>
                                                                                <td style="height: 15px;"></td>
                                                                              </tr>
                                                                            </tbody>
                                                                          </table>
                                                                        </td>
                                                                        <td style="width: 15px;"></td>
                                                                      </tr>
                                                                    </tbody>
                                                                  </table>
                                                                </td>
                                                              </tr>
                                                              <tr>
                                                                <td>
                                                                  <table class="email-div" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                    <tbody>
                                                                      <tr>
                                                                        <td style="width: 15px;"></td>
                                                                        <td>
                                                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                            <tbody>
                                                                              <tr>
                                                                                <td style="height: 15px;"></td>
                                                                              </tr>
                                                                              <tr>
                                                                                <td>
                                                                                  <table class="project-details" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                                    <tbody>
                                                                                      <tr>
                                                                                        <td>
                                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                            <b>Project Address: </b>${project?.address || 'Not specified'}
                                                                                          </p>
                                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                            <b>Contact: </b>${managerName}
                                                                                          </p>
                                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                            <b>Due Date: </b>${formatDate(bidPackage.due_date)}
                                                                                          </p>
                                                                                           <div style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                             <b>Scope of Work: </b>${bidPackage.costCode?.name || 'Not specified'}
                                                                                           </div>
                                                                                           <div style="margin: 10px 0;">
                                                                                             ${formattedSpecifications}
                                                                                           </div>
                                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; margin: 0;">
                                                                                            <b>Project Files:</b><br>
                                                                                            ${attachmentsHtml}
                                                                                          </p>
                                                                                        </td>
                                                                                      </tr>
                                                                                    </tbody>
                                                                                  </table>
                                                                                </td>
                                                                              </tr>
                                                                              <tr>
                                                                                <td style="height: 15px;"></td>
                                                                              </tr>
                                                                            </tbody>
                                                                          </table>
                                                                        </td>
                                                                        <td style="width: 15px;"></td>
                                                                      </tr>
                                                                    </tbody>
                                                                  </table>
                                                                </td>
                                                              </tr>
                                                            </tbody>
                                                          </table>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="height: 15px;"></td>
                                      </tr>
                                      <!-- Instructions Section -->
                                      <tr>
                                        <td>
                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                            <tbody>
                                              <tr>
                                                <td>
                                                  <table class="email-div" bgcolor="#FFFFFF" style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%; border: 1px solid #E0E0E0;" cellpadding="0" cellspacing="0">
                                                    <tbody>
                                                      <tr>
                                                        <td>
                                                          <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                            <tbody>
                                                              <tr>
                                                                <td style="width: 15px;"></td>
                                                                <td>
                                                                  <table style="border-collapse: collapse; border-spacing: 0; min-width: 100%; width: 100%;" cellpadding="0" cellspacing="0">
                                                                    <tbody>
                                                                      <tr>
                                                                        <td style="height: 15px;"></td>
                                                                      </tr>
                                                                      <tr>
                                                                        <td>
                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                            Please review the project details and specifications above. If you have any questions or need clarification, please contact ${managerName}.
                                                                          </p>
                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                            Thank you for your interest in this project.
                                                                          </p>
                                                                        </td>
                                                                      </tr>
                                                                      <tr>
                                                                        <td style="height: 15px;"></td>
                                                                      </tr>
                                                                    </tbody>
                                                                  </table>
                                                                </td>
                                                                <td style="width: 15px;"></td>
                                                              </tr>
                                                            </tbody>
                                                          </table>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td height="10"></td>
                                      </tr>
                                      <!-- Footer -->
                                      <tr>
                                        <td>
                                          <div class="footer">
                                            <p style="color: #4A4A4A; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: 300; word-break: break-word; word-wrap: break-word; font-size: 12px; line-height: 20px; text-align: center; margin: 0;" align="center">
                                              © 2025 ${companyName}
                                            </p>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                                <td style="width: 10px;"></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td></td>
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
    const requestData: BidPackageEmailRequest = await req.json();
    console.log('📧 Received bid package email request:', JSON.stringify(requestData, null, 2));

    const { bidPackage, companies } = requestData;

    // Collect all recipient emails
    const recipients: string[] = [];
    companies.forEach(company => {
      console.log(`🏢 Processing company: ${company.company_name}`);
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

    console.log('📬 About to send email via Resend...');
    // Send email to all recipients
    const emailResponse = await resend.emails.send({
      from: "Bid Packages <noreply@transactional.buildersuiteai.com>",
      to: recipients,
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