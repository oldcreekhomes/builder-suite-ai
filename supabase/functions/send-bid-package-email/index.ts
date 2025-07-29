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
    id: string;
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
    managerEmail?: string;
  };
  senderCompany?: {
    company_name: string;
    address?: string;
  };
  companies: Array<{
    id: string;
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

const generateEmailHTML = (data: BidPackageEmailRequest, companyId?: string) => {
  const { bidPackage, companies, project, senderCompany } = data;

  // Get project manager information from the project data
  const managerName = project?.manager || 'Project Manager';
  const managerEmail = project?.managerEmail;

  // Use sender company name if provided, otherwise fallback to first company
  const companyName = senderCompany?.company_name || companies[0]?.company_name || 'Your Company';

  // Format specifications with bullet points and numbered lists
  const formattedSpecifications = formatSpecifications(bidPackage.specifications);

  // Generate downloadable file links
  const attachmentsHtml = generateFileDownloadLinks(bidPackage.files);

  // Generate Yes/No button URLs
  const baseUrl = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-bid-response';
  const yesUrl = `${baseUrl}?bid_package_id=${bidPackage.id}&company_id=${companyId}&response=will_bid`;
  const noUrl = `${baseUrl}?bid_package_id=${bidPackage.id}&company_id=${companyId}&response=will_not_bid`;

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
                                                                                             <b>Contact: </b>${managerName}${managerEmail ? ` - ${managerEmail}` : ''}
                                                                                           </p>
                                                                                          <p style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                            <b>Due Date: </b>${formatDate(bidPackage.due_date)}
                                                                                          </p>
                                                                                            <div style="line-height: 28px; color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 14px; margin: 0;">
                                                                                              <b>Scope of Work: </b>${bidPackage.name}
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
                                       <tr>
                                         <td style="height: 15px;"></td>
                                       </tr>
                                       <!-- Will you bid section -->
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
                                                                         <td style="height: 25px;"></td>
                                                                       </tr>
                                                                       <tr>
                                                                         <td align="center">
                                                                           <h4 style="color: #4D4D4D; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; word-break: break-word; word-wrap: break-word; font-size: 18px; line-height: 22px; margin: 0 0 20px 0; text-align: center;">
                                                                             Will you bid on this project?
                                                                           </h4>
                                                                         </td>
                                                                       </tr>
                                                                       <tr>
                                                                         <td align="center">
                                                                           <table style="border-collapse: collapse; border-spacing: 0; margin: 0 auto;" cellpadding="0" cellspacing="0">
                                                                             <tbody>
                                                                               <tr>
                                                                                  <td style="padding-right: 10px;">
                                                                                    <a href="${yesUrl}" target="_blank" style="background-color: #10B981; border: 2px solid #10B981; border-radius: 6px; color: #FFFFFF; display: inline-block; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">
                                                                                      Yes
                                                                                    </a>
                                                                                  </td>
                                                                                  <td style="padding-left: 10px;">
                                                                                    <a href="${noUrl}" target="_blank" style="background-color: #DC2626; border: 2px solid #DC2626; border-radius: 6px; color: #FFFFFF; display: inline-block; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;">
                                                                                      No
                                                                                    </a>
                                                                                  </td>
                                                                               </tr>
                                                                             </tbody>
                                                                           </table>
                                                                         </td>
                                                                       </tr>
                                                                       <tr>
                                                                         <td style="height: 25px;"></td>
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
                                             <a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #4A4A4A; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: 300; font-size: 12px; line-height: 20px; text-align: center; margin: 0; text-decoration: none;" align="center">www.buildersuiteai.com</a>
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

    // Use sender company name for the from field
    const senderName = requestData.senderCompany?.company_name || 'Bid Packages';
    
    console.log('🏢 Sender company data:', JSON.stringify(requestData.senderCompany, null, 2));
    console.log('📧 Using sender name:', senderName);

    console.log('📬 About to send emails via Resend...');
    
    // Send emails to each company individually with their specific company ID
    const emailPromises = companies.map(async (company) => {
      const emailHTML = generateEmailHTML(requestData, company.id);
      const subject = `Bid Package Request - ${bidPackage.costCode.code}: ${bidPackage.costCode.name}`;
      
      // Get recipients for this specific company
      const companyRecipients = company.representatives
        .filter(rep => rep.email)
        .map(rep => rep.email);

      if (companyRecipients.length === 0) {
        console.log(`⚠️ No recipients for company ${company.company_name}`);
        return null;
      }

      console.log(`📧 Sending email to ${company.company_name} (${companyRecipients.length} recipients)`);

      return await resend.emails.send({
        from: `${senderName} <noreply@transactional.buildersuiteai.com>`,
        to: companyRecipients,
        subject: subject,
        html: emailHTML
      });
    });

    // Wait for all emails to be sent
    const emailResponses = await Promise.allSettled(emailPromises.filter(p => p !== null));

    console.log("📧 Resend API responses:", JSON.stringify(emailResponses, null, 2));

    const successfulEmails = emailResponses.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResponses.filter(result => result.status === 'rejected').length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        companiesCount: companies.length,
        successfulEmails,
        failedEmails,
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