import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

interface BidSubmissionEmailRequest {
  bidPackageId: string;
  companyId: string;
  recipientEmail: string;
  recipientName?: string;
  isHomeBuilderNotification?: boolean;
  projectAddress?: string;
  costCodeName?: string;
  companyName?: string;
}

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing bid submission email request...');
    
    const { 
      bidPackageId, 
      companyId, 
      recipientEmail, 
      recipientName,
      isHomeBuilderNotification = false,
      projectAddress,
      costCodeName,
      companyName 
    }: BidSubmissionEmailRequest = await req.json();

    console.log('Email params:', {
      bidPackageId,
      companyId,
      recipientEmail,
      recipientName,
      isHomeBuilderNotification,
      projectAddress,
      costCodeName,
      companyName
    });

    if (!bidPackageId || !companyId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch bid package details with project and cost code info
    const { data: bidPackage, error: bidError } = await supabase
      .from('project_bid_packages')
      .select('id, due_date, project_id, cost_code_id, files, specifications')
      .eq('id', bidPackageId)
      .single();

    if (bidError || !bidPackage) {
      console.error('Error fetching bid package:', bidError);
      throw new Error('Bid package not found');
    }

    // Get project details if not provided
    let projectInfo = null;
    let managerInfo = null;
    if (!projectAddress) {
      const { data: project } = await supabase
        .from('projects')
        .select('address, owner_id, construction_manager')
        .eq('id', bidPackage.project_id)
        .single();
      projectInfo = project;
      
      // Get manager details
      if (project?.construction_manager) {
        const { data: manager } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone_number')
          .eq('id', project.construction_manager)
          .single();
        managerInfo = manager;
      }
    }

    // Get cost code details if not provided  
    let costCodeInfo = null;
    if (!costCodeName) {
      const { data: costCode } = await supabase
        .from('cost_codes')
        .select('name, code')
        .eq('id', bidPackage.cost_code_id)
        .single();
      costCodeInfo = costCode;
    }

    // Fetch the sender company information (use provided or get from project owner)
    let senderCompanyName = 'BuilderSuite AI';
    if (projectInfo?.owner_id) {
      const { data: senderUser } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', projectInfo.owner_id)
        .single();
      
      if (senderUser?.company_name) {
        senderCompanyName = senderUser.company_name;
      }
    }

    // Create the bid submission URL
    const bidSubmissionUrl = `https://buildersuiteai.com/submit-bid?bid_package_id=${bidPackageId}&company_id=${companyId}`;

    // Format due date
    const dueDateFormatted = bidPackage.due_date 
      ? new Date(bidPackage.due_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'TBD';

    // Create different email content based on recipient type
    let htmlContent: string;
    let subject: string;

    if (isHomeBuilderNotification) {
      // HOME BUILDER NOTIFICATION EMAIL
      const displayAddress = projectAddress || projectInfo?.address || '';
      subject = `Bid Confirmation Received - ${displayAddress}`;
      
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Bid Confirmation Received - ${projectAddress || projectInfo?.address || ''}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #10B981; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Bid Confirmation Received</h1>
                            <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress || projectInfo?.address || ''}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <!-- Notification Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Company Response
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    <p style="color: #000000; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        <strong>${companyName || 'A company'}</strong> has confirmed they will participate in the bidding process for:
                                                    </p>
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Project:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress || projectInfo?.address || ''}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Cost Code:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${costCodeName || costCodeInfo?.name || ''}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Company:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${companyName || 'Company name not available'}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Due Date:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${dueDateFormatted}</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <p style="color: #666666; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        You will receive their bid submission once it's completed.
                                                    </p>
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
      
    } else {
      // COMPANY BID SUBMISSION EMAIL (existing functionality)
      const displayAddress = projectAddress || projectInfo?.address || '';
      subject = `Submit Your Bid - ${displayAddress}`;
      
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Submit Your Bid - ${projectAddress || projectInfo?.address || ''}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segue UI', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Submit Your Bid</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress || projectInfo?.address || ''}</p>
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
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress || projectInfo?.address || ''}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Cost Code:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${costCodeInfo?.code} - ${costCodeInfo?.name}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Contact:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top; line-height: 1.4;">${managerInfo ? `${managerInfo.first_name} ${managerInfo.last_name}${managerInfo.phone_number ? `<br>${managerInfo.phone_number}` : ''}${managerInfo.email ? `<br>${managerInfo.email}` : ''}` : 'Project Manager'}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Due Date:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${dueDateFormatted}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                                    <tr>
                                                                        <td style="color: #666666; font-weight: 500; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top; padding: 0;">Scope of Work:</td>
                                                                        <td style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top; padding: 0;">${formatSpecifications(bidPackage.specifications)}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Project Files:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${generateFileDownloadLinks(bidPackage.files || [])}</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Bid Submission Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Submit Your Bid
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 30px 20px; text-align: center; margin: 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; border-collapse: collapse;">
                                                        <tr>
                                                            <td>
                                                                <a href="${bidSubmissionUrl}" style="background-color: #10B981; border: 2px solid #10B981; color: #ffffff; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; line-height: 1; padding: 15px 30px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;" target="_blank">
                                                                    Submit Your Bid
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
    }

    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${senderCompanyName} <noreply@transactional.buildersuiteai.com>`,
      to: [recipientEmail],
      subject,
      html: htmlContent
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Bid submission email sent successfully to:', recipientEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Bid submission email sent successfully',
        emailId: emailData?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-bid-submission-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);