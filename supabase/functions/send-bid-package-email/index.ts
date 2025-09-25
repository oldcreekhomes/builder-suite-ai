import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
    managerPhone?: string;
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
  const formattedLines = lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Use consistent margin for all lines, remove top margin from first line to align properly
    const marginTop = index === 0 ? '0' : '5px';
    return `<div style="line-height: 20px; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: ${marginTop} 0 5px 0;">${trimmed}</div>`;
  });
  
  return formattedLines.filter(line => line).join('');
};

const generateFileDownloadLinks = (files: string[]) => {
  if (!files || files.length === 0) return 'No files attached';
  
  const fileLinks = files.map((file, index) => {
    // Extract original filename to get file extension
    let originalFileName = file.split('/').pop() || file;
    
    // If filename contains UUID and timestamp pattern, extract the original filename
    // Pattern: bidding_[uuid]_[timestamp]_[originalfilename]
    const parts = originalFileName.split('_');
    if (parts.length >= 4 && parts[0] === 'bidding') {
      // Take everything after the third underscore
      const originalFilenameParts = parts.slice(3);
      originalFileName = originalFilenameParts.join('_');
    }
    
    // Also handle timestamp-hyphen prefix pattern: [timestamp]-[originalfilename]
    // Pattern: 1751840477323-new.xlsx
    const timestampMatch = originalFileName.match(/^\d{13}-(.+)$/);
    if (timestampMatch) {
      originalFileName = timestampMatch[1];
    }
    
    // Extract file extension from original filename
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const fileExtension = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex) : '.pdf';
    
    // Create numbered filename like PO emails: File 1.pdf, File 2.pdf, etc.
    const displayFileName = `File ${index + 1}${fileExtension}`;
    
    // Normalize path: remove any prefixes and ensure proper specifications path
    let normalizedPath = file;
    if (normalizedPath.startsWith('project-files/specifications/')) {
      normalizedPath = normalizedPath.replace('project-files/specifications/', '');
    } else if (normalizedPath.startsWith('project-files/')) {
      normalizedPath = normalizedPath.replace('project-files/', '');
    } else if (normalizedPath.startsWith('specifications/')) {
      normalizedPath = normalizedPath.replace('specifications/', '');
    }
    
    // Build proper public URL with correct encoding
    const downloadUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/specifications/${encodeURI(normalizedPath)}`;
    
    console.log('🔗 Generating file link:', { originalFile: file, normalizedPath, fileName: displayFileName, downloadUrl });
    
    return `<div style="line-height: 20px; margin: 2px 0;"><a href="${downloadUrl}" style="color: #000000; text-decoration: underline;" target="_blank" download>📎 ${displayFileName}</a></div>`;
  }).join('');
  
  // Return vertical list container
  return `<div style="display: inline-block; vertical-align: top;">${fileLinks}</div>`;
};

const generateEmailHTML = async (data: BidPackageEmailRequest, companyId?: string) => {
  const projectAddress = data.project?.address || 'Project Address Not Available';
  const costCodeName = data.bidPackage.costCode?.name || data.bidPackage.name;
  const managerName = data.project?.manager || 'Project Manager';
  const managerEmail = data.project?.managerEmail || '';
  const managerPhone = data.project?.managerPhone || '';
  const dueDate = formatDate(data.bidPackage.due_date);
  const specifications = formatSpecifications(data.bidPackage.specifications);
  const fileLinks = generateFileDownloadLinks(data.bidPackage.files);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Bid Package Request - ${projectAddress}: ${costCodeName}</title>
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
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Bid Invitation</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            
                            <!-- Project Information Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <!-- Project Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        You have been invited to bid on the following project:
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
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Contact:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top; line-height: 1.4;">${managerName}${managerPhone ? `<br>${managerPhone}` : ''}${managerEmail ? `<br>${managerEmail}` : ''}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Due Date:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${dueDate}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                                    <tr>
                                                                        <td style="color: #666666; font-weight: 500; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top; padding: 0;">Scope of Work:</td>
                                                                        <td style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top; padding: 0;">${specifications}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Project Files:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${fileLinks}</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            

                            <!-- Bid Response Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <!-- Response Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Bid Response
                                    </td>
                                </tr>
                                <!-- Response Content -->
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 30px 20px; text-align: center; margin: 0;">
                                                    <h3 style="color: #000000; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Will you bid on this project?</h3>
                                                    
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding-right: 15px;">
                                                                <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-bid-response?bid_package_id=${data.bidPackage.id}&company_id=${companyId}&response=will_bid" style="background-color: #10B981; border: 2px solid #10B981; color: #ffffff; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;" target="_blank">
                                                                     Yes, I will bid
                                                                 </a>
                                                             </td>
                                                             <td style="padding-left: 15px;">
                                                                 <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-bid-response?bid_package_id=${data.bidPackage.id}&company_id=${companyId}&response=will_not_bid" style="background-color: #DC2626; border: 2px solid #DC2626; color: #ffffff; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;" target="_blank">
                                                                     No, I will not bid
                                                                 </a>
                                                            </td>
                                                        </tr>
                                                    </table>
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
</html>`;
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
      const emailHTML = await generateEmailHTML(requestData, company.id);
      const subject = `Bid Invitation - ${requestData.project?.address || 'Project Address'}`;
      
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